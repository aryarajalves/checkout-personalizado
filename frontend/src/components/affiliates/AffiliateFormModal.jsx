import React, { useState, useEffect } from 'react';
import { Loader2, Save, UserCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AffiliateFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) {
  const isEditing = Boolean(initialData?.id);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    phone: '',
    document: '',
    affiliate_code: '',
    pix_key: '',
    pix_key_type: 'cpf',
    crypto_wallet: '',
    default_commission_percent: 20.0,
    is_active: true,
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Carrega lista de usuários do sistema para vinculação de afiliados
  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/v1/auth/users', { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => setUsers([]));
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        user_id: initialData.user_id || '',
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        document: initialData.document || '',
        affiliate_code: initialData.affiliate_code || '',
        pix_key: initialData.pix_key || '',
        pix_key_type: initialData.pix_key_type || 'cpf',
        crypto_wallet: initialData.crypto_wallet || '',
        default_commission_percent: initialData.default_commission_percent ?? 20.0,
        is_active: initialData.is_active ?? true,
        notes: initialData.notes || '',
      });
      if (initialData.user_id && users.length > 0) {
        const u = users.find((x) => x.id === initialData.user_id);
        setSelectedUser(u || null);
      }
    } else {
      setSelectedUser(null);
      setFormData({
        user_id: '',
        name: '',
        email: '',
        phone: '',
        document: '',
        affiliate_code: '',
        pix_key: '',
        pix_key_type: 'cpf',
        crypto_wallet: '',
        default_commission_percent: 20.0,
        is_active: true,
        notes: '',
      });
    }
    setErrorMsg('');
  }, [initialData, isOpen, users]);

  if (!isOpen) return null;

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    if (!userId) {
      setSelectedUser(null);
      setFormData((prev) => ({
        ...prev,
        user_id: '',
        name: '',
        email: '',
        phone: '',
        document: '',
        pix_key: '',
        affiliate_code: '',
      }));
      return;
    }

    const u = users.find((x) => String(x.id) === String(userId));
    if (u) {
      setSelectedUser(u);
      const cleanFirstWord = (u.name || '').trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      const suggestedCode = cleanFirstWord ? `${cleanFirstWord}10` : '';

      setFormData((prev) => ({
        ...prev,
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        document: u.document || '',
        pix_key: u.pix_key || '',
        pix_key_type: u.pix_key_type || 'cpf',
        crypto_wallet: u.crypto_wallet || '',
        affiliate_code: prev.affiliate_code || suggestedCode,
      }));
      setErrorMsg('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Selecione um usuário cadastrado para vincular a este parceiro afiliado.');
      return;
    }

    onSubmit({
      ...formData,
      default_commission_percent: parseFloat(formData.default_commission_percent) || 0,
    });
  };

  return (
    <div
      className="affiliate-modal-overlay"
      data-testid="affiliate-form-modal"
      onClick={(e) => {
        // Regra: NÃO fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="affiliate-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        <div className="affiliate-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>
              {isEditing ? 'Editar Parceiro Afiliado' : 'Novo Parceiro Afiliado'}
            </h3>
          </div>
        </div>

        {errorMsg && (
          <div style={{ margin: '12px 24px 0 24px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="affiliate-modal-body">
            {/* Seletor de Usuário */}
            <div className="affiliate-form-group">
              <label style={{ fontWeight: 600, color: '#0f172a' }}>
                Selecionar Usuário da Plataforma (Afiliado) *
              </label>
              <select
                className="affiliate-form-select"
                value={formData.user_id}
                onChange={handleUserSelect}
                required
                data-testid="select-affiliate-user"
                style={{ fontSize: '14px', padding: '10px 12px' }}
              >
                <option value="">Selecione um usuário cadastrado...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) {u.pix_key ? '— ✓ Pix OK' : '— ⚠️ Sem Pix'}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview dos dados sincronizados da conta do usuário */}
            {selectedUser ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                }}
                data-testid="affiliate-user-preview"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedUser.name}
                  </span>
                  {selectedUser.pix_key ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>
                      <CheckCircle2 size={14} /> Pix Configurado
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#d97706' }}>
                      <AlertTriangle size={14} /> Pix Pendente
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div><strong>E-mail:</strong> {selectedUser.email}</div>
                  <div><strong>WhatsApp / Telefone:</strong> {selectedUser.phone || 'Não informado no perfil'}</div>
                  <div>
                    <strong>Chave Pix:</strong>{' '}
                    {selectedUser.pix_key ? (
                      <code>{selectedUser.pix_key} ({selectedUser.pix_key_type?.toUpperCase()})</code>
                    ) : (
                      <span style={{ color: '#d97706' }}>O afiliado pode preencher na tela de Meu Perfil</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  fontSize: '12.5px',
                  color: '#166534',
                }}
              >
                💡 Selecione o usuário cadastrado acima. Nome, e-mail, WhatsApp e Chave Pix são obtidos automaticamente do perfil dele.
              </div>
            )}

            {/* Configurações específicas de Afiliação */}
            <div className="affiliate-form-row">
              <div className="affiliate-form-group">
                <label>Código de Indicação (Ref Code)</label>
                <input
                  type="text"
                  className="affiliate-form-input"
                  placeholder="Ex: CARLOS10 (deixe vazio p/ auto)"
                  value={formData.affiliate_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      affiliate_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                    })
                  }
                  data-testid="input-affiliate-code"
                />
              </div>

              <div className="affiliate-form-group">
                <label>Comissão Padrão (%) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  className="affiliate-form-input"
                  placeholder="20.0"
                  value={formData.default_commission_percent}
                  onChange={(e) => setFormData({ ...formData, default_commission_percent: e.target.value })}
                  data-testid="input-affiliate-commission"
                />
              </div>
            </div>

            <div className="affiliate-form-group">
              <label>Status do Afiliado</label>
              <select
                className="affiliate-form-select"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                data-testid="select-affiliate-status"
              >
                <option value="true">Ativo (recebe comissões e links válidos)</option>
                <option value="false">Inativo / Pausado</option>
              </select>
            </div>
          </div>

          {/* Rodapé: exatamente 1 botão de cancelar e 1 botão de ação principal */}
          <div className="affiliate-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-affiliate-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-affiliate"
              disabled={loading}
              data-testid="btn-submit-affiliate"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Atualizar Afiliado' : 'Cadastrar Afiliado'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
