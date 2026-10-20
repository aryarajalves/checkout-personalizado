import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)
from app.models.user import User, Invite, PasswordResetToken, RegistrationVerification
from app.models.gateway import SplitRecipient
from app.models.affiliate import Affiliate
from app.services.email import send_verification_email
from app.schemas.user import (
    UserLogin,
    Token,
    UserResponse,
    UserUpdate,
    BulkDeleteRequest,
    InviteCreate,
    InviteResponse,
    InviteValidateResponse,
    RegisterWithInvite,
    RegisterInitiateResponse,
    VerifyCodeRequest,
    ResendCodeRequest,
    PasswordResetRequestResponse,
    PasswordResetConfirm,
    PasswordResetValidateResponse,
    UserProfileUpdate,
    UserFinancialProfileUpdate,
    UserFinancialProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth & Users"])

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido ou inválido",
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário inativo ou não encontrado",
        )
    return user

def require_admin_or_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para este perfil",
        )
    return current_user

def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Administradores podem acessar este recurso",
        )
    return current_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo",
        )
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    user_dict = UserResponse.model_validate(current_user)
    user_dict.has_financial_profile = bool(current_user.pix_key or current_user.document)
    return user_dict

@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza o perfil do usuário logado (nome e/ou troca de senha)."""
    if profile_data.name and profile_data.name.strip():
        current_user.name = profile_data.name.strip()
        
    if profile_data.new_password:
        if not profile_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe a sua senha atual para definir uma nova senha."
            )
        if not verify_password(profile_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha atual informada está incorreta."
            )
        current_user.hashed_password = get_password_hash(profile_data.new_password)
        
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    
    # Sincroniza nome em split_recipients e affiliates se existirem
    split_rec = db.query(SplitRecipient).filter(SplitRecipient.user_id == current_user.id).first()
    if split_rec:
        split_rec.name = current_user.name
    aff = db.query(Affiliate).filter(Affiliate.user_id == current_user.id).first()
    if aff:
        aff.name = current_user.name
    db.commit()
    
    res = UserResponse.model_validate(current_user)
    res.has_financial_profile = bool(current_user.pix_key or current_user.document)
    return res

@router.get("/me/financial", response_model=UserFinancialProfileResponse)
def get_my_financial_profile(current_user: User = Depends(get_current_user)):
    """Retorna os dados financeiros e de repasse (Pix/Cripto) do usuário logado."""
    has_profile = bool(current_user.pix_key or current_user.document)
    return UserFinancialProfileResponse(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        document=current_user.document,
        document_type=current_user.document_type or "cpf",
        phone=current_user.phone,
        pix_key=current_user.pix_key,
        pix_key_type=current_user.pix_key_type or "cpf",
        crypto_wallet=current_user.crypto_wallet,
        crypto_network=current_user.crypto_network or "polygon",
        external_recipient_id=current_user.external_recipient_id,
        has_financial_profile=has_profile,
        updated_at=current_user.updated_at
    )

@router.put("/me/financial", response_model=UserFinancialProfileResponse)
def update_my_financial_profile(
    fin_data: UserFinancialProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza os dados de repasse financeiro do usuário e sincroniza com Coprodução e Afiliação."""
    if fin_data.document is not None:
        current_user.document = fin_data.document.strip() if fin_data.document else None
    if fin_data.document_type is not None:
        current_user.document_type = fin_data.document_type
    if fin_data.phone is not None:
        current_user.phone = fin_data.phone.strip() if fin_data.phone else None
    if fin_data.pix_key is not None:
        current_user.pix_key = fin_data.pix_key.strip() if fin_data.pix_key else None
    if fin_data.pix_key_type is not None:
        current_user.pix_key_type = fin_data.pix_key_type
    if fin_data.crypto_wallet is not None:
        current_user.crypto_wallet = fin_data.crypto_wallet.strip() if fin_data.crypto_wallet else None
    if fin_data.crypto_network is not None:
        current_user.crypto_network = fin_data.crypto_network
    if fin_data.external_recipient_id is not None:
        current_user.external_recipient_id = fin_data.external_recipient_id.strip() if fin_data.external_recipient_id else None
        
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    # Sincroniza com SplitRecipient
    split_rec = db.query(SplitRecipient).filter(
        (SplitRecipient.user_id == current_user.id) | (SplitRecipient.email == current_user.email)
    ).first()
    if split_rec:
        split_rec.user_id = current_user.id
        split_rec.name = current_user.name
        split_rec.document = current_user.document
        split_rec.pix_key = current_user.pix_key
        split_rec.pix_key_type = current_user.pix_key_type or "cpf"
        split_rec.crypto_wallet = current_user.crypto_wallet
        split_rec.crypto_network = current_user.crypto_network or "polygon"
        split_rec.external_recipient_id = current_user.external_recipient_id
    else:
        new_rec = SplitRecipient(
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            document=current_user.document,
            pix_key=current_user.pix_key,
            pix_key_type=current_user.pix_key_type or "cpf",
            crypto_wallet=current_user.crypto_wallet,
            crypto_network=current_user.crypto_network or "polygon",
            external_recipient_id=current_user.external_recipient_id,
            default_percentage=0.0,
            is_active=True
        )
        db.add(new_rec)

    # Sincroniza com Affiliate caso exista vínculo
    aff = db.query(Affiliate).filter(
        (Affiliate.user_id == current_user.id) | (Affiliate.email == current_user.email)
    ).first()
    if aff:
        aff.user_id = current_user.id
        aff.name = current_user.name
        aff.document = current_user.document
        aff.pix_key = current_user.pix_key
        aff.pix_key_type = current_user.pix_key_type or "cpf"
        aff.crypto_wallet = current_user.crypto_wallet
        if current_user.phone:
            aff.phone = current_user.phone
            
    db.commit()

    has_profile = bool(current_user.pix_key or current_user.document)
    return UserFinancialProfileResponse(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        document=current_user.document,
        document_type=current_user.document_type or "cpf",
        phone=current_user.phone,
        pix_key=current_user.pix_key,
        pix_key_type=current_user.pix_key_type or "cpf",
        crypto_wallet=current_user.crypto_wallet,
        crypto_network=current_user.crypto_network or "polygon",
        external_recipient_id=current_user.external_recipient_id,
        has_financial_profile=has_profile,
        updated_at=current_user.updated_at
    )

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_superadmin)
):
    return db.query(User).order_by(User.id.asc()).all()

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Regra: Não pode editar o superadmin
    if target_user.role == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Não é permitido editar as informações do Super Admin."
        )

    # Apenas admin ou user podem ser atribuídos
    if user_update.role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Perfil inválido.")

    target_user.role = user_update.role
    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if target_user.role == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Não é permitido excluir o Super Admin."
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Não é permitido excluir seu próprio usuário atual."
        )

    db.delete(target_user)
    db.commit()
    return {"message": "Usuário excluído com sucesso."}

@router.post("/users/bulk-delete")
def bulk_delete_users(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum usuário selecionado.")

    users_to_delete = db.query(User).filter(User.id.in_(data.ids)).all()
    deleted_count = 0
    for u in users_to_delete:
        if u.role == "superadmin":
            continue # Ignora superadmin por segurança
        if u.id == current_user.id:
            continue # Ignora o próprio usuário logado
        db.delete(u)
        deleted_count += 1

    db.commit()
    return {"message": f"{deleted_count} usuário(s) excluído(s) com sucesso.", "deleted_count": deleted_count}

@router.post("/users/{user_id}/reset-password-request", response_model=PasswordResetRequestResponse)
def request_password_reset(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Regra: Não pode redefinir senha do Super Admin por esse fluxo
    if target_user.role == "superadmin":
        raise HTTPException(
            status_code=403,
            detail="Não é permitido redefinir a senha do Super Admin."
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=24)
    token = secrets.token_urlsafe(32)

    reset_token = PasswordResetToken(
        user_id=target_user.id,
        token=token,
        expires_at=expires_at,
        is_used=False
    )
    db.add(reset_token)
    db.commit()

    return PasswordResetRequestResponse(
        reset_url=f"/reset-password?token={token}",
        token=token,
        expires_at=expires_at,
        user_email=target_user.email,
        user_name=target_user.name
    )

@router.get("/reset-password/validate", response_model=PasswordResetValidateResponse)
def validate_reset_password_token(token: str, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not record:
        return PasswordResetValidateResponse(valid=False, detail="Link de redefinição não encontrado.")
    if record.is_used:
        return PasswordResetValidateResponse(valid=False, detail="Este link de redefinição já foi utilizado.")
    
    now = datetime.now(timezone.utc)
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        return PasswordResetValidateResponse(valid=False, detail="Este link de redefinição expirou.")

    target_user = db.query(User).filter(User.id == record.user_id).first()
    if not target_user:
        return PasswordResetValidateResponse(valid=False, detail="Usuário associado não encontrado.")

    return PasswordResetValidateResponse(
        valid=True,
        email=target_user.email,
        name=target_user.name
    )

@router.post("/reset-password/confirm")
def confirm_password_reset(
    data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token == data.token).first()
    if not record:
        raise HTTPException(status_code=400, detail="Link de redefinição não encontrado.")
    if record.is_used:
        raise HTTPException(status_code=400, detail="Este link de redefinição já foi utilizado.")

    now = datetime.now(timezone.utc)
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        raise HTTPException(status_code=400, detail="Este link de redefinição expirou.")

    if data.password_confirm is not None and data.password != data.password_confirm:
        raise HTTPException(status_code=400, detail="As senhas digitadas não coincidem.")

    target_user = db.query(User).filter(User.id == record.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if target_user.role == "superadmin":
        raise HTTPException(status_code=403, detail="Não é permitido redefinir senha do Super Admin.")

    target_user.hashed_password = get_password_hash(data.password)
    record.is_used = True
    db.commit()

    return {"message": "Senha redefinida com sucesso."}

@router.post("/invites", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def create_invite(
    invite_in: InviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    if invite_in.role not in ["admin", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de usuário inválido para convite. Apenas 'admin' ou 'user' são permitidos.",
        )

    duration = max(1, invite_in.duration_hours)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=duration)
    token = secrets.token_urlsafe(32)

    invite = Invite(
        token=token,
        role=invite_in.role,
        expires_at=expires_at,
        is_used=False
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    
    invite_res = InviteResponse.model_validate(invite)
    invite_res.invite_url = f"/register?token={token}"
    invite_res.is_expired = False
    invite_res.time_remaining = f"{duration}h"
    return invite_res

def format_time_remaining(expires_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    diff = expires_at - now
    if diff.total_seconds() <= 0:
        return "Expirado"
    days = diff.days
    hours = diff.seconds // 3600
    minutes = (diff.seconds % 3600) // 60
    if days > 0:
        return f"{days}d {hours}h restantes"
    if hours > 0:
        return f"{hours}h {minutes}m restantes"
    return f"{minutes}m restantes"

@router.get("/invites", response_model=List[InviteResponse])
def list_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    invites = db.query(Invite).order_by(Invite.id.desc()).all()
    results = []
    now = datetime.now(timezone.utc)
    for inv in invites:
        exp = inv.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        is_expired = now > exp
        time_rem = format_time_remaining(inv.expires_at)
        
        inv_dto = InviteResponse.model_validate(inv)
        inv_dto.invite_url = f"/register?token={inv.token}"
        inv_dto.is_expired = is_expired
        inv_dto.time_remaining = time_rem
        results.append(inv_dto)
    return results

@router.delete("/invites/{invite_id}")
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    target_invite = db.query(Invite).filter(Invite.id == invite_id).first()
    if not target_invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")

    db.delete(target_invite)
    db.commit()
    return {"message": "Convite excluído com sucesso."}

@router.post("/invites/bulk-delete")
def bulk_delete_invites(
    data: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    if not data.ids:
        raise HTTPException(status_code=400, detail="Nenhum convite selecionado.")

    invites_to_delete = db.query(Invite).filter(Invite.id.in_(data.ids)).all()
    deleted_count = len(invites_to_delete)
    for inv in invites_to_delete:
        db.delete(inv)

    db.commit()
    return {"message": f"{deleted_count} convite(s) excluído(s) com sucesso.", "deleted_count": deleted_count}

@router.get("/invites/validate", response_model=InviteValidateResponse)
def validate_invite(token: str, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        return InviteValidateResponse(valid=False, detail="Convite não encontrado.")
    if invite.is_used:
        return InviteValidateResponse(valid=False, detail="Este convite já foi utilizado.")
    
    now = datetime.now(timezone.utc)
    expires_at = invite.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if now > expires_at:
        return InviteValidateResponse(valid=False, detail="Este convite expirou.")

    return InviteValidateResponse(valid=True, role=invite.role)

@router.post("/register", response_model=RegisterInitiateResponse, status_code=status.HTTP_200_OK)
async def register_user(
    data: RegisterWithInvite,
    db: Session = Depends(get_db)
):
    invite = db.query(Invite).filter(Invite.token == data.token).first()
    if not invite:
        raise HTTPException(status_code=400, detail="Convite não encontrado.")
    if invite.is_used:
        raise HTTPException(status_code=400, detail="Este convite já foi utilizado.")
    
    now = datetime.now(timezone.utc)
    expires_at = invite.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise HTTPException(status_code=400, detail="Este convite expirou.")

    if data.password_confirm is not None and data.password != data.password_confirm:
        raise HTTPException(
            status_code=400,
            detail="As senhas digitadas não coincidem."
        )

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Já existe um usuário cadastrado com este e-mail."
        )

    # Gera código OTP de 6 dígitos
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    code_expires_at = now + timedelta(minutes=15)
    hashed_pw = get_password_hash(data.password)

    # Invalida tentativas anteriores para esse e-mail
    db.query(RegistrationVerification).filter(
        RegistrationVerification.email == data.email,
        RegistrationVerification.is_used == False
    ).update({"is_used": True})

    verification = RegistrationVerification(
        email=data.email,
        name=data.name,
        hashed_password=hashed_pw,
        role=invite.role,
        invite_token=data.token,
        code=otp_code,
        expires_at=code_expires_at,
        is_used=False
    )
    db.add(verification)
    db.commit()

    # Dispara e-mail via Brevo
    await send_verification_email(
        to_email=data.email,
        to_name=data.name,
        code=otp_code
    )

    return RegisterInitiateResponse(
        message="Código de verificação enviado para o seu e-mail.",
        email=data.email,
        requires_verification=True
    )

@router.post("/register/verify", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def verify_registration(
    data: VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    verification = (
        db.query(RegistrationVerification)
        .filter(
            RegistrationVerification.email == data.email,
            RegistrationVerification.is_used == False
        )
        .order_by(RegistrationVerification.id.desc())
        .first()
    )

    if not verification:
        raise HTTPException(status_code=400, detail="Solicitação de verificação não encontrada.")

    exp = verification.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        raise HTTPException(status_code=400, detail="O código de verificação expirou. Solicite um novo.")

    if verification.code != data.code.strip():
        raise HTTPException(status_code=400, detail="Código de verificação inválido.")

    # Valida convite novamente
    invite = db.query(Invite).filter(Invite.token == verification.invite_token).first()
    if not invite or invite.is_used:
        raise HTTPException(status_code=400, detail="O convite associado já foi utilizado ou é inválido.")

    # Verifica se usuário já foi cadastrado
    existing = db.query(User).filter(User.email == verification.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já cadastrado.")

    # Cria o novo usuário
    new_user = User(
        email=verification.email,
        name=verification.name,
        hashed_password=verification.hashed_password,
        role=verification.role,
        is_active=True
    )
    db.add(new_user)
    verification.is_used = True
    invite.is_used = True
    invite.used_by_email = verification.email
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post("/register/resend-code")
async def resend_registration_code(
    data: ResendCodeRequest,
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    last_verif = (
        db.query(RegistrationVerification)
        .filter(
            RegistrationVerification.email == data.email,
            RegistrationVerification.invite_token == data.invite_token,
            RegistrationVerification.is_used == False
        )
        .order_by(RegistrationVerification.id.desc())
        .first()
    )

    if not last_verif:
        raise HTTPException(status_code=400, detail="Nenhum cadastro pendente encontrado para este e-mail.")

    # Gera novo código
    new_code = f"{secrets.randbelow(900000) + 100000}"
    last_verif.code = new_code
    last_verif.expires_at = now + timedelta(minutes=15)
    db.commit()

    # Dispara e-mail
    await send_verification_email(
        to_email=last_verif.email,
        to_name=last_verif.name,
        code=new_code
    )

    return {"message": "Novo código de verificação enviado com sucesso."}
