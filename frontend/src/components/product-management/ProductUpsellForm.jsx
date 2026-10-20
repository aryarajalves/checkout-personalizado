import React from 'react';
import { ExternalLink } from 'lucide-react';
import ImageUploadInput from '../common/ImageUploadInput';

export default function ProductUpsellForm({
  formData,
  setFormData,
  catalogProducts,
  availableOffers,
  loadingOffers,
  onProductChange,
}) {
  return (
    <div data-testid="product-upsell-form-tab">
      {/* Vínculo com Produto do Catálogo */}
      <div style={{ marginBottom: '14px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
          Vincular Produto do Catálogo para o UpSell
        </label>
        <p style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '8px' }}>
          Selecione um produto existente para dar baixa no estoque, calcular splits e permitir venda independente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <select
              className="form-control-modern"
              value={formData.upsell_product_id || ''}
              onChange={(e) => onProductChange(e.target.value)}
              data-testid="select-upsell-catalog-product"
              style={{ width: '100%', fontSize: '12.5px' }}
            >
              <option value="">(Opcional) Escolha um produto...</option>
              {catalogProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (R$ {Number(p.price_brl).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-control-modern"
              value={formData.upsell_offer_id || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, upsell_offer_id: e.target.value }))}
              disabled={loadingOffers || !formData.upsell_product_id || availableOffers.length === 0}
              data-testid="select-upsell-catalog-offer"
              style={{ width: '100%', fontSize: '12.5px' }}
            >
              <option value="">
                {loadingOffers
                  ? 'Carregando ofertas...'
                  : availableOffers.length === 0
                  ? 'Preço padrão do produto'
                  : 'Escolha uma oferta de preço...'}
              </option>
              {availableOffers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} (R$ {Number(off.price_brl).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Headline / Título de Impacto *
        </label>
        <input
          type="text"
          className="form-control-modern"
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          placeholder="Ex: Espere! Seu pedido foi confirmado, mas veja isso..."
          data-testid="input-upsell-title"
          style={{ width: '100%', fontSize: '13px' }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Subtítulo / Proposta de Valor
        </label>
        <input
          type="text"
          className="form-control-modern"
          value={formData.subtitle}
          onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
          placeholder="Ex: Adicione a Formação Avançada com 70% de desconto nesta página"
          data-testid="input-upsell-subtitle"
          style={{ width: '100%', fontSize: '13px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Preço Especial do UpSell (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-control-modern"
            value={formData.price_brl}
            onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
            placeholder="97.00"
            data-testid="input-upsell-price"
            style={{ width: '100%', fontSize: '13px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              data-testid="toggle-upsell-active"
              style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
            />
            <span>Ativar UpSell Pós-Compra</span>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Link de Vídeo Explicativo (YouTube, Vimeo ou MP4)
        </label>
        <input
          type="text"
          className="form-control-modern"
          value={formData.video_url}
          onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
          placeholder="https://www.youtube.com/watch?v=..."
          data-testid="input-upsell-video"
          style={{ width: '100%', fontSize: '12.5px' }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Link da Página de Vendas Externa do UpSell (Opcional)
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="url"
            className="form-control-modern"
            value={formData.external_url}
            onChange={(e) => setFormData((p) => ({ ...p, external_url: e.target.value }))}
            placeholder="https://seusite.com/oferta-upsell"
            data-testid="input-upsell-external-url"
            style={{ width: '100%', fontSize: '12.5px', paddingLeft: '34px' }}
          />
          <ExternalLink
            size={15}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      <ImageUploadInput
        label="Imagem do Produto no UpSell (Opcional)"
        value={formData.image_url}
        onChange={(val) => setFormData((p) => ({ ...p, image_url: val }))}
        placeholder="https://exemplo.com/imagem-upsell.jpg"
        helperText="Exibida no card de UpSell caso não utilize vídeo."
        testId="input-upsell-image"
      />

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          Descrição Completa da Oferta
        </label>
        <textarea
          className="form-control-modern"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          placeholder="Explique detalhadamente o que o cliente receberá no UpSell..."
          data-testid="input-upsell-description"
          style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
