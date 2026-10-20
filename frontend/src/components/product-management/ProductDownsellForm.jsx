import React from 'react';
import { ArrowDownRight, ExternalLink } from 'lucide-react';
import ImageUploadInput from '../common/ImageUploadInput';

export default function ProductDownsellForm({
  formData,
  setFormData,
  catalogProducts,
  availableDownsellOffers,
  loadingDownsellOffers,
  onDownsellProductChange,
}) {
  return (
    <div data-testid="product-downsell-form-tab">
      {/* Toggle de Ativação do Downsell */}
      <div style={{ padding: '14px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(formData.enable_downsell)}
            onChange={(e) => setFormData((prev) => ({ ...prev, enable_downsell: e.target.checked }))}
            data-testid="toggle-enable-downsell"
            style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
          />
          <div>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownRight size={18} />
              Habilitar Downsell caso o comprador recuse o UpSell
            </span>
            <span style={{ fontSize: '12px', color: '#15803d', display: 'block', marginTop: '2px' }}>
              Se o cliente clicar em "Não, obrigado" no UpSell, exibirá uma segunda oferta imperdível antes da página de obrigado.
            </span>
          </div>
        </label>
      </div>

      {formData.enable_downsell && (
        <div style={{ padding: '14px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '14px' }}>
          {/* Vínculo com Produto do Catálogo para o Downsell */}
          <div style={{ marginBottom: '14px', padding: '10px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
              Produto do Catálogo para o Downsell (Opcional)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <select
                  className="form-control-modern"
                  value={formData.downsell_product_id || ''}
                  onChange={(e) => onDownsellProductChange(e.target.value)}
                  data-testid="select-downsell-catalog-product"
                  style={{ width: '100%', fontSize: '12px' }}
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
                  value={formData.downsell_offer_id || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, downsell_offer_id: e.target.value }))}
                  disabled={loadingDownsellOffers || !formData.downsell_product_id || availableDownsellOffers.length === 0}
                  data-testid="select-downsell-catalog-offer"
                  style={{ width: '100%', fontSize: '12px' }}
                >
                  <option value="">
                    {loadingDownsellOffers
                      ? 'Carregando ofertas...'
                      : availableDownsellOffers.length === 0
                      ? 'Preço padrão do produto'
                      : 'Escolha uma oferta...'}
                  </option>
                  {availableDownsellOffers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name} (R$ {Number(off.price_brl).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Título / Headline do Downsell
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={formData.downsell_title || ''}
              onChange={(e) => setFormData((p) => ({ ...p, downsell_title: e.target.value }))}
              placeholder="Ex: Espere! Leve pelo menos esta versão com desconto imperdível"
              data-testid="input-downsell-title"
              style={{ width: '100%', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Subtítulo do Downsell
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={formData.downsell_subtitle || ''}
              onChange={(e) => setFormData((p) => ({ ...p, downsell_subtitle: e.target.value }))}
              placeholder="Ex: Uma oportunidade acessível para você não sair de mãos vazias"
              data-testid="input-downsell-subtitle"
              style={{ width: '100%', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Preço Especial do Downsell (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-control-modern"
              value={formData.downsell_price_brl || ''}
              onChange={(e) => setFormData((p) => ({ ...p, downsell_price_brl: e.target.value }))}
              placeholder="47.00"
              data-testid="input-downsell-price"
              style={{ width: '100%', maxWidth: '240px', fontSize: '12.5px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Vídeo Explicativo do Downsell (Opcional)
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={formData.downsell_video_url || ''}
              onChange={(e) => setFormData((p) => ({ ...p, downsell_video_url: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
              data-testid="input-downsell-video"
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>

          <ImageUploadInput
            label="Imagem do Downsell (Opcional)"
            value={formData.downsell_image_url || ''}
            onChange={(val) => setFormData((p) => ({ ...p, downsell_image_url: val }))}
            placeholder="https://exemplo.com/downsell.jpg"
            helperText="Exibida no card do Downsell caso não utilize vídeo."
            testId="input-downsell-image"
          />

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Descrição da Oferta de Downsell
            </label>
            <textarea
              className="form-control-modern"
              rows={2}
              value={formData.downsell_description || ''}
              onChange={(e) => setFormData((p) => ({ ...p, downsell_description: e.target.value }))}
              placeholder="Resumo persuasivo do Downsell..."
              data-testid="input-downsell-description"
              style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
