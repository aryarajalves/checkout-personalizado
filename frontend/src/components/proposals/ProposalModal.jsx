import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

export default function ProposalModal({ isOpen, onClose, onSave, products }) {
  const [formData, setFormData] = useState({
    product_id: products && products.length > 0 ? products[0].id : '',
    title: '',
    description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_cpf: '',
    amount_brl: '',
    payment_method_allowed: 'all',
    custom_pix_amount_brl: '',
    custom_card_amount_brl: '',
    max_installments: 12,
    expires_hours: 24,
    closer_name: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.product_id) {
      setErrorMsg('Selecione o produto da proposta.');
      return;
    }

    if (!formData.title.trim()) {
      setErrorMsg('Informe o título da proposta comercial.');
      return;
    }

    if (!formData.customer_name.trim() || !formData.customer_email.trim() || !formData.customer_phone.trim()) {
      setErrorMsg('Preencha os dados de contato do cliente (Nome, E-mail e Telefone).');
      return;
    }

    const amount = parseFloat(formData.amount_brl);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Informe um valor negociado válido maior que zero.');
      return;
    }

    if (formData.payment_method_allowed === 'hybrid_pix_card') {
      const pix = parseFloat(formData.custom_pix_amount_brl || 0);
      const card = parseFloat(formData.custom_card_amount_brl || 0);
      if (pix + card !== amount) {
        setErrorMsg(`A soma da entrada Pix (R$ ${pix.toFixed(2)}) e do Cartão (R$ ${card.toFixed(2)}) deve ser exatamente igual ao total (R$ ${amount.toFixed(2)}).`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        product_id: parseInt(formData.product_id, 10),
        amount_brl: amount,
        custom_pix_amount_brl: formData.custom_pix_amount_brl ? parseFloat(formData.custom_pix_amount_brl) : null,
        custom_card_amount_brl: formData.custom_card_amount_brl ? parseFloat(formData.custom_card_amount_brl) : null,
        max_installments: parseInt(formData.max_installments, 10),
        expires_hours: parseInt(formData.expires_hours, 10),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Erro ao gerar proposta personalizada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '1.75rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} color="#0284c7" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Nova Proposta Personalizada (High-Ticket)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Produto Base *
            </label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            >
              {products && products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Padrão: R$ {p.price_brl ? p.price_brl.toFixed(2) : '0,00'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Título da Proposta Comercial *
            </label>
            <input
              type="text"
              name="title"
              placeholder="Ex: Mentoria VIP Individual - Oferta Exclusiva WhatsApp"
              value={formData.title}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Nome do Cliente *
              </label>
              <input
                type="text"
                name="customer_name"
                placeholder="Nome completo do lead"
                value={formData.customer_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                E-mail do Cliente *
              </label>
              <input
                type="email"
                name="customer_email"
                placeholder="cliente@email.com"
                value={formData.customer_email}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                WhatsApp / Celular *
              </label>
              <input
                type="text"
                name="customer_phone"
                placeholder="(11) 99999-9999"
                value={formData.customer_phone}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                CPF do Cliente (Opcional)
              </label>
              <input
                type="text"
                name="customer_cpf"
                placeholder="000.000.000-00"
                value={formData.customer_cpf}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Valor Negociado (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                name="amount_brl"
                placeholder="3500.00"
                value={formData.amount_brl}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Validade do Link *
              </label>
              <select
                name="expires_hours"
                value={formData.expires_hours}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value={12}>12 Horas (Urgência Imediata)</option>
                <option value={24}>24 Horas (Padrão)</option>
                <option value={48}>48 Horas (2 Dias)</option>
                <option value={72}>72 Horas (3 Dias)</option>
                <option value={168}>7 Dias (1 Semana)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Forma de Pagamento Permitida
              </label>
              <select
                name="payment_method_allowed"
                value={formData.payment_method_allowed}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="all">Todos os Métodos Disponíveis</option>
                <option value="pix">Apenas Pix à Vista</option>
                <option value="credit_card">Apenas Cartão de Crédito</option>
                <option value="hybrid_pix_card">Híbrido: Entrada Pix + Saldo Cartão</option>
                <option value="hybrid_two_cards">Híbrido: 2 Cartões de Crédito</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Nome do Closer / Consultor
              </label>
              <input
                type="text"
                name="closer_name"
                placeholder="Ex: Bruno (Comercial)"
                value={formData.closer_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {formData.payment_method_allowed === 'hybrid_pix_card' && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Entrada no Pix (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="custom_pix_amount_brl"
                  placeholder="Ex: 1000.00"
                  value={formData.custom_pix_amount_brl}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  Saldo no Cartão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="custom_card_amount_brl"
                  placeholder="Ex: 2500.00"
                  value={formData.custom_card_amount_brl}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Observações Internas (Opcional)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Anotações para a equipe comercial..."
              value={formData.notes}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-new-proposal"
              style={{ padding: '0.65rem 1.5rem' }}
            >
              {saving ? 'Gerando Link...' : 'Gerar Link da Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
