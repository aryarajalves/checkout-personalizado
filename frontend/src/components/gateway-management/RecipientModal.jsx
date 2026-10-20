import React, { useState, useEffect } from 'react';
import { UserCheck, Percent, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function RecipientModal({
  isOpen,
  onClose,
  onSave,
  recipient,
  loading,
}) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    document: '',
    pix_key_type: 'cpf',
    pix_key: '',
    crypto_wallet: '',
    crypto_network: 'polygon',
    external_recipient_id: '',
    default_percentage: 0,
    is_active: true,
  });

  const [formError, setFormError] = useState('');

  // Carrega lista de usuários do sistema para vinculação direta
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
    if (recipient) {
      setFormData({
        user_id: recipient.user_id || '',
        name: recipient.name || '',
        email: recipient.email || '',
        document: recipient.document || '',
        pix_key_type: recipient.pix_key_type || 'cpf',
        pix_key: recipient.pix_key || '',
        crypto_wallet: recipient.crypto_wallet || '',
        crypto_network: recipient.crypto_network || 'polygon',
        external_recipient_id: recipient.external_recipient_id || '',
        default_percentage: recipient.default_percentage ?? 0,
        is_active: recipient.is_active ?? true,
      });
      if (recipient.user_id && users.length > 0) {
        const u = users.find((x) => x.id === recipient.user_id);
        setSelectedUser(u || null);
      }
    } else {
      setSelectedUser(null);
      setFormData({
        user_id: '',
        name: '',
        email: '',
        document: '',
        pix_key_type: 'cpf',
        pix_key: '',
        crypto_wallet: '',
        crypto_network: 'polygon',
        external_recipient_id: '',
        default_percentage: 0,
        is_active: true,
      });
    }
    setFormError('');
  }, [recipient, isOpen, users]);

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
        document: '',
        pix_key: '',
        pix_key_type: 'cpf',
        crypto_wallet: '',
      }));
      return;
    }

    const u = users.find((x) => String(x.id) === String(userId));
    if (u) {
      setSelectedUser(u);
      setFormData((prev) => ({
        ...prev,
        user_id: u.id,
        name: u.name,
        email: u.email,
        document: u.document || '',
        pix_key: u.pix_key || '',
        pix_key_type: u.pix_key_type || 'cpf',
        crypto_wallet: u.crypto_wallet || '',
        crypto_network: u.crypto_network || 'polygon',
      }));
      setFormError('');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Selecione um usuário cadastrado para vincular ao Split.');
      return;
    }
    const pct = parseFloat(formData.default_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFormError('A porcentagem de split deve ser um número entre 0% e 100%.');
      return;
    }
    onSave({
      ...formData,
      default_percentage: pct,
    });
  };

  const isEditing = Boolean(recipient);

  return (
    <div
      className="modal-overlay"
      data-testid="recipient-modal-overlay"
      onClick={(e) => {
        // Regra obrigatória: NÃO fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="modal-content recipient-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <UserCheck size={20} className="modal-title-icon" />
            <h3>{isEditing ? 'Editar Recebedor de Split' : 'Novo Recebedor de Split'}</h3>
          </div>
        </div>

        {formError && (
          <div className="form-error-banner" data-testid="recipient-form-error" style={{ margin: '12px 0 4px 0' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="recipient-form">
          {/* Seletor de Usuário do Sistema */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="rec-user-select" style={{ fontWeight: 600, color: '#0f172a' }}>
              Selecionar Usuário da Plataforma (Coprodutor / Sócio) *
            </label>
            <select
              id="rec-user-select"
              name="user_id"
              className="form-input"
              value={formData.user_id}
              onChange={handleUserSelect}
              required
              data-testid="select-recipient-user"
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

          {/* Card Resumo dos Dados Sincronizados da Conta do Usuário */}
          {selectedUser ? (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '16px',
              }}
              data-testid="recipient-user-preview"
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
                <div><strong>Documento (CPF/CNPJ):</strong> {selectedUser.document || 'Não informado no perfil'}</div>
                <div>
                  <strong>Chave Pix:</strong>{' '}
                  {selectedUser.pix_key ? (
                    <code>{selectedUser.pix_key} ({selectedUser.pix_key_type?.toUpperCase()})</code>
                  ) : (
                    <span style={{ color: '#d97706' }}>O usuário pode preencher em Meu Perfil / Configurações</span>
                  )}
                </div>
                {selectedUser.crypto_wallet && (
                  <div><strong>Carteira Cripto:</strong> <code>{selectedUser.crypto_wallet}</code></div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '12.5px',
                color: '#166534',
              }}
            >
              💡 Selecione o usuário acima. Todos os dados pessoais, bancários e Chave Pix são obtidos automaticamente do perfil cadastrado por ele.
            </div>
          )}

          {/* Configurações específicas de Split e Gateway */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="rec-pct">
                Split Padrão (%) <Percent size={12} style={{ display: 'inline' }} />
              </label>
              <input
                id="rec-pct"
                name="default_percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="form-input"
                placeholder="Ex: 10"
                value={formData.default_percentage}
                onChange={handleChange}
                data-testid="input-recipient-percentage"
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="rec-ext-id">ID do Recebedor no Gateway (Opcional - Ex: re_...)</label>
              <input
                id="rec-ext-id"
                name="external_recipient_id"
                type="text"
                className="form-input"
                placeholder="re_..."
                value={formData.external_recipient_id}
                onChange={handleChange}
                data-testid="input-recipient-external-id"
              />
            </div>
          </div>

          <div className="form-group checkbox-group" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="rec-active"
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              data-testid="input-recipient-active"
            />
            <label htmlFor="rec-active" style={{ fontSize: '13.5px', cursor: 'pointer', userSelect: 'none' }}>
              Recebedor ativo para divisões de pagamento
            </label>
          </div>

          {/* Rodapé: exatamente 1 botão de fechar/cancelar e 1 botão de ação principal */}
          <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-recipient-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="confirm-btn"
              disabled={loading}
              data-testid="save-recipient-btn"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Recebedor' : 'Cadastrar Recebedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
