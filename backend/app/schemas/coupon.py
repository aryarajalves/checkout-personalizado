from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime

class CouponBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Código do cupom (ex: 'PROMO10')")
    discount_percent: float = Field(..., gt=0.0, le=100.0, description="Porcentagem de desconto (ex: 10 para 10%)")
    product_id: Optional[int] = Field(None, description="ID do produto (nulo para cupom global)")
    never_expires: bool = Field(True, description="Se o cupom é vitalício / nunca expira")
    expires_at: Optional[datetime] = Field(None, description="Data/hora de expiração do cupom")
    max_uses: Optional[int] = Field(None, ge=1, description="Limite máximo de usos (nulo para ilimitado)")
    is_active: bool = Field(True, description="Status de ativação do cupom")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("O código do cupom não pode ser vazio.")
        return clean

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    discount_percent: Optional[float] = Field(None, gt=0.0, le=100.0)
    product_id: Optional[int] = None
    never_expires: Optional[bool] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().upper()
            if not clean:
                raise ValueError("O código do cupom não pode ser vazio.")
            return clean
        return v

class CouponResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    discount_percent: float
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    never_expires: bool
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    current_uses: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ValidateCouponRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Código do cupom digitado pelo comprador")
    slug: str = Field(..., description="Slug do produto ou oferta no checkout")
    bump_ids: Optional[List[int]] = Field(None, description="IDs dos order bumps selecionados")

class ValidateCouponResponse(BaseModel):
    valid: bool
    code: str
    discount_percent: float
    discount_amount_brl: float
    discount_amount_usd: Optional[float] = None
    final_amount_brl: float
    final_amount_usd: Optional[float] = None
    message: str
