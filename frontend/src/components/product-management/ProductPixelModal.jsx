import React, { useState, useEffect } from 'react';
import { Target, X, Check, Activity, ShieldCheck } from 'lucide-react';
import { fetchProductPixelConfigApi, updateProductPixelConfigApi } from './productApi';

export function ProductPixelModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pixelId, setPixelId] = useState('');
  const [googleAdsId, setGoogleAdsId] = useState('');
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [purchaseActive, setPurchaseActive] = useState(true);
  const [initiateActive, setInitiateActive] = useState(true);
  const [pageviewActive, setPageviewActive] = useState(true);

  useEffect(() => {
    if (!isOpen || !product) return;

    async function loadConfig() {
      try {
        setLoading(true);
        const data = await fetchProductPixelConfigApi(product.id);
        setPixelId(data.meta_pixel_id || '');
        setGoogleAdsId(data.google_ads_id || '');
        setGoogleAdsConversionLabel(data.google_ads_conversion_label || '');
        setTiktokPixelId(data.tiktok_pixel_id || '');
        setPurchaseActive(data.pixel_purchase_active !== undefined ? data.pixel_purchase_active : true);
        setInitiateActive(data.pixel_initiate_active !== undefined ? data.pixel_initiate_active : true);
        setPageviewActive(data.pixel_pageview_active !== undefined ? data.pixel_pageview_active : true);
      } catch (err) {
        showFeedback('error', err.message || 'Erro ao carregar configurações de pixel.');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [isOpen, product, showFeedback]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProductPixelConfigApi(product.id, {
        meta_pixel_id: pixelId.trim() || null,
        google_ads_id: googleAdsId.trim() || null,
        google_ads_conversion_label: googleAdsConversionLabel.trim() || null,
        tiktok_pixel_id: tiktokPixelId.trim() || null,
        pixel_purchase_active: purchaseActive,
        pixel_initiate_active: initiateActive,
        pixel_pageview_active: pageviewActive,
      });
      showFeedback('success', 'Configurações de Pixels e Rastreamento salvas com sucesso!');
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar configurações do Pixel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-pixel-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-pixel-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Target size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Multi-Pixels de Rastreamento</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            disabled={saving}
            data-testid="close-pixel-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', borderRadius: '50%' }} />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Carregando dados dos pixels...</p>
            </div>
          ) : (
            <>
              {/* Meta Pixel */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  Meta / Facebook Pixel ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control-modern"
                    placeholder="Ex: 1234567890123456"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    data-testid="input-meta-pixel-id"
                    style={{ width: '100%', paddingLeft: '38px', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <Activity size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  ID numérico obtido no Gerenciador de Eventos da Meta.
                </span>
              </div>

              {/* Google Ads */}
              <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Google Ads ID
                  </label>
                  <input
                    type="text"
                    className="form-control-modern"
                    placeholder="Ex: AW-123456789"
                    value={googleAdsId}
                    onChange={(e) => setGoogleAdsId(e.target.value)}
                    data-testid="input-google-ads-id"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Rótulo de Conversão
                  </label>
                  <input
                    type="text"
                    className="form-control-modern"
                    placeholder="Ex: AbCdEfGhIjKlMnOpQrS"
                    value={googleAdsConversionLabel}
                    onChange={(e) => setGoogleAdsConversionLabel(e.target.value)}
                    data-testid="input-google-ads-label"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* TikTok Pixel */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  TikTok Ads Pixel ID
                </label>
                <input
                  type="text"
                  className="form-control-modern"
                  placeholder="Ex: C1234567890ABCDEF"
                  value={tiktokPixelId}
                  onChange={(e) => setTiktokPixelId(e.target.value)}
                  data-testid="input-tiktok-pixel-id"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                />
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Código alfanumérico obtido no Gerenciador de Anúncios do TikTok.
                </span>
              </div>

              {/* Bloco de Ativação de Eventos */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#faf5ff', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#6b21a8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Disparo dos Eventos do Funil
                </h4>

                {/* 1. Evento Purchase */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={purchaseActive}
                    onChange={(e) => setPurchaseActive(e.target.checked)}
                    data-testid="toggle-pixel-purchase"
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                      Ativar quando o usuário comprar o produto (Purchase / Compra Aprovada)
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                      Dispara automaticamente no momento da aprovação do Pix, Cartão ou Cripto enviando o valor em R$ (BRL).
                    </span>
                  </div>
                </label>

                {/* 2. Evento InitiateCheckout */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={initiateActive}
                    onChange={(e) => setInitiateActive(e.target.checked)}
                    data-testid="toggle-pixel-initiate"
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                      Disparar no início do checkout (InitiateCheckout)
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                      Disparado quando o comprador interage com o formulário ou seleciona o método de pagamento.
                    </span>
                  </div>
                </label>

                {/* 3. Evento PageView */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pageviewActive}
                    onChange={(e) => setPageviewActive(e.target.checked)}
                    data-testid="toggle-pixel-pageview"
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                      Disparar na visualização da página (PageView)
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                      Disparado assim que a página pública do checkout é aberta no navegador.
                    </span>
                  </div>
                </label>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="webhooks-btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                  data-testid="cancel-pixel-modal-btn"
                >
                  <X size={15} />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  className="webhooks-btn-primary"
                  style={{ backgroundColor: '#7c3aed', borderColor: '#6d28d9' }}
                  disabled={saving}
                  data-testid="save-pixel-modal-btn"
                >
                  <Check size={15} />
                  <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
