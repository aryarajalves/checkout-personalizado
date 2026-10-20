import React from 'react';
import { Check, DollarSign } from 'lucide-react';

export function ProductOrderBumpForm({
  editingBumpId,
  formData,
  setFormData,
  catalogProducts,
  availableOffers,
  loadingOffers,
  actionLoading,
  onProductChange,
  onOfferChange,
  onSave,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSave}
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
        {editingBumpId ? 'Editar Order Bump' : 'Adicionar Novo Order Bump'}
      </h4>

      {/* Seletor de Produto do Catálogo */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Produto do Catálogo (Base do Order Bump)
        </label>
        <select
          className="form-control-modern"
          value={formData.bump_product_id}
          onChange={(e) => onProductChange(e.target.value)}
          data-testid="select-bump-product"
          style={{ width: '100%', fontSize: '13px' }}
        >
          <option value="">Selecione um produto cadastrado...</option>
          {catalogProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (R$ {Number(p.price_brl).toFixed(2).replace('.', ',')})
            </option>
          ))}
        </select>
        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
          O bump vincula-se a um produto existente para permitir venda separada e gestão unificada.
        </span>
      </div>

      {/* Seletor de Preço / Oferta se houver produto selecionado */}
      {formData.bump_product_id && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Preço de Cobrança do Bump
          </label>
          {availableOffers.length > 1 ? (
            <select
              className="form-control-modern"
              value={formData.bump_offer_id}
              onChange={(e) => onOfferChange(e.target.value)}
              data-testid="select-bump-offer"
              style={{ width: '100%', fontSize: '13px' }}
              disabled={loadingOffers}
            >
              {availableOffers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} — R$ {Number(off.price_brl).toFixed(2).replace('.', ',')}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <DollarSign size={15} color="#059669" />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#065f46' }}>
                Preço Base Selecionado: R$ {Number(formData.price_brl || 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Título da Chamada */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
            Título da Chamada no Checkout *
          </label>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            (Personalizável)
          </span>
        </div>
        <input
          type="text"
          className="form-control-modern"
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          placeholder="Ex: Leve também o Checklist Exclusivo"
          data-testid="input-bump-title"
          style={{ width: '100%', fontSize: '13px' }}
        />
      </div>

      {/* Preço e Ativo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Preço Adicional em R$ (BRL) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control-modern"
            value={formData.price_brl}
            onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
            placeholder="27.00"
            data-testid="input-bump-price"
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              data-testid="toggle-bump-active"
              style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
            />
            <span>Ativo no Checkout</span>
          </label>
        </div>
      </div>

      {/* Descrição */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Descrição Curta e Persuasiva
        </label>
        <textarea
          className="form-control-modern"
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          placeholder="Explique o benefício imediato em poucas palavras..."
          data-testid="input-bump-description"
          style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          className="webhooks-btn-secondary"
          onClick={onCancel}
          disabled={actionLoading}
          style={{ padding: '5px 12px', fontSize: '12px' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="webhooks-btn-primary"
          style={{ backgroundColor: '#059669', borderColor: '#047857', padding: '5px 14px', fontSize: '12px' }}
          disabled={actionLoading}
          data-testid="btn-save-order-bump"
        >
          <Check size={13} />
          <span>{actionLoading ? 'Salvando...' : 'Salvar Bump'}</span>
        </button>
      </div>
    </form>
  );
}

export default ProductOrderBumpForm;
