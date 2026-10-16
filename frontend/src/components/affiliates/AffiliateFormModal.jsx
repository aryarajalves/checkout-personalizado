import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, User, Mail, Phone, DollarSign, Key } from 'lucide-react';

export default function AffiliateFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (initialData) {
      setFormData({
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
    } else {
      setFormData({
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
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      default_commission_percent: parseFloat(formData.default_commission_percent) || 0,
    });
  };

  return (
    <div className="affiliate-modal-overlay" data-testid="affiliate-form-modal">
      <div className="affiliate-modal-card">
        <div className="affiliate-modal-header">
          <h3>{isEditing ? 'Editar Parceiro Afiliado' : 'Novo Parceiro Afiliado'}</h3>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={onClose}
            aria-label="Fechar modal"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="affiliate-modal-body">
            <div className="affiliate-form-group">
              <label>Nome Completo *</label>
              <input
                type="text"
                required
                className="affiliate-form-input"
                placeholder="Ex: Carlos Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="affiliate-form-row">
              <div className="affiliate-form-group">
                <label>E-mail *</label>
                <input
                  type="email"
                  required
                  className="affiliate-form-input"
                  placeholder="carlos@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="affiliate-form-group">
                <label>WhatsApp / Telefone *</label>
                <input
                  type="tel"
                  required
                  className="affiliate-form-input"
                  placeholder="(11) 98888-7777"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            <div className="affiliate-form-row">
              <div className="affiliate-form-group">
                <label>Tipo de Chave Pix</label>
                <select
                  className="affiliate-form-select"
                  value={formData.pix_key_type}
                  onChange={(e) => setFormData({ ...formData, pix_key_type: e.target.value })}
                >
                  <option value="cpf">CPF / CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </div>

              <div className="affiliate-form-group">
                <label>Chave Pix para Repasse</label>
                <input
                  type="text"
                  className="affiliate-form-input"
                  placeholder="Chave Pix do parceiro"
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                />
              </div>
            </div>

            <div className="affiliate-form-group">
              <label>Carteira Cripto (USDT / EVM / Sol - opcional)</label>
              <input
                type="text"
                className="affiliate-form-input"
                placeholder="0x... ou chave de carteira"
                value={formData.crypto_wallet}
                onChange={(e) => setFormData({ ...formData, crypto_wallet: e.target.value })}
              />
            </div>

            <div className="affiliate-form-group">
              <label>Status do Afiliado</label>
              <select
                className="affiliate-form-select"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              >
                <option value="true">Ativo (recebe comissões e links válidos)</option>
                <option value="false">Inativo / Pausado</option>
              </select>
            </div>
          </div>

          <div className="affiliate-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
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
