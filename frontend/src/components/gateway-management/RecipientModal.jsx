import React, { useState, useEffect } from 'react';
import { X, UserCheck, Percent } from 'lucide-react';

export default function RecipientModal({
  isOpen,
  onClose,
  onSave,
  recipient,
  loading,
}) {
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (recipient) {
      setFormData({
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
    } else {
      setFormData({
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
  }, [recipient, isOpen]);

  if (!isOpen) return null;

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
      setFormError('O nome do recebedor é obrigatório.');
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
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="modal-content recipient-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <UserCheck size={20} className="modal-title-icon" />
            <h3>{isEditing ? 'Editar Recebedor de Split' : 'Novo Recebedor de Split'}</h3>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Fechar"
            data-testid="close-recipient-modal"
          >
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div className="form-error-banner" data-testid="recipient-form-error">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="recipient-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="rec-name">Nome do Parceiro / Sócio *</label>
              <input
                id="rec-name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Ex: João da Silva"
                value={formData.name}
                onChange={handleChange}
                required
                data-testid="input-recipient-name"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="rec-doc">CPF ou CNPJ</label>
              <input
                id="rec-doc"
                name="document"
                type="text"
                className="form-input"
                placeholder="000.000.000-00"
                value={formData.document}
                onChange={handleChange}
                data-testid="input-recipient-doc"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="rec-email">E-mail de Contato</label>
              <input
                id="rec-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="socio@email.com"
                value={formData.email}
                onChange={handleChange}
                data-testid="input-recipient-email"
              />
            </div>
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
                value={formData.default_percentage}
                onChange={handleChange}
                data-testid="input-recipient-percentage"
              />
            </div>
          </div>

          <div className="form-divider" style={{ margin: '14px 0', borderTop: '1px solid #e2e8f0' }}></div>

          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            Dados Bancários (Pix)
          </h4>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="rec-pix-type">Tipo de Chave Pix</label>
              <select
                id="rec-pix-type"
                name="pix_key_type"
                className="form-input"
                value={formData.pix_key_type}
                onChange={handleChange}
                data-testid="select-pix-type"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave Aleatória</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="rec-pix">Chave Pix</label>
              <input
                id="rec-pix"
                name="pix_key"
                type="text"
                className="form-input"
                placeholder="Insira a chave Pix do recebedor"
                value={formData.pix_key}
                onChange={handleChange}
                data-testid="input-recipient-pix"
              />
            </div>
          </div>

          <div className="form-divider" style={{ margin: '14px 0', borderTop: '1px solid #e2e8f0' }}></div>

          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
            Dados Cripto (MetaMask / Web3) & Gateway
          </h4>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="rec-wallet">Endereço da Carteira Cripto</label>
              <input
                id="rec-wallet"
                name="crypto_wallet"
                type="text"
                className="form-input"
                placeholder="0x..."
                value={formData.crypto_wallet}
                onChange={handleChange}
                data-testid="input-recipient-wallet"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="rec-network">Rede Cripto</label>
              <select
                id="rec-network"
                name="crypto_network"
                className="form-input"
                value={formData.crypto_network}
                onChange={handleChange}
                data-testid="select-crypto-network"
              >
                <option value="polygon">Polygon (Recomendada)</option>
                <option value="bsc">BNB Chain (BSC)</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="ethereum">Ethereum (L1)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rec-ext-id">ID do Recebedor no Gateway (Opcional - Ex: re_... Pagar.me)</label>
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

          <div className="form-group checkbox-group" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="rec-active"
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              data-testid="input-recipient-active"
            />
            <label htmlFor="rec-active" style={{ fontSize: '13.5px', cursor: 'pointer' }}>
              Recebedor ativo para divisões de pagamento
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
