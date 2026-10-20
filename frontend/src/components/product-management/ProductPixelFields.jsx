import React from 'react';
import { Target, HelpCircle } from 'lucide-react';

export default function ProductPixelFields({ formData, setFormData }) {
  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
      }}
      data-testid="multi-pixel-config-section"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Target size={18} color="#0284c7" />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          Pixels de Rastreamento & Anúncios (Multi-Pixel)
        </h4>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
        Configure os identificadores das plataformas de tráfego. O checkout dispara automaticamente os eventos de
        <strong> PageView</strong>, <strong>InitiateCheckout</strong> (início de finalização) e <strong>Purchase</strong> (compra aprovada).
      </p>

      {/* 1. Meta / Facebook Pixel */}
      <div className="form-group" style={{ marginBottom: '14px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          <span>🔵 Meta / Facebook Pixel ID</span>
        </label>
        <input
          type="text"
          className="form-control-modern"
          placeholder="Ex: 1234567890123456"
          value={formData.meta_pixel_id || ''}
          onChange={(e) => setFormData((p) => ({ ...p, meta_pixel_id: e.target.value }))}
          data-testid="input-product-meta-pixel-id"
          style={{ marginTop: '4px', fontSize: '13px' }}
        />
        <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
          Identificador numérico do Pixel no Gerenciador de Eventos da Meta.
        </span>
      </div>

      {/* 2. Google Ads */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <span>🔴 Google Ads ID</span>
          </label>
          <input
            type="text"
            className="form-control-modern"
            placeholder="Ex: AW-123456789 ou G-XXXXX"
            value={formData.google_ads_id || ''}
            onChange={(e) => setFormData((p) => ({ ...p, google_ads_id: e.target.value }))}
            data-testid="input-product-google-ads-id"
            style={{ marginTop: '4px', fontSize: '13px' }}
          />
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            ID de acompanhamento da tag global (gtag.js).
          </span>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <span>Rótulo de Conversão (Purchase)</span>
          </label>
          <input
            type="text"
            className="form-control-modern"
            placeholder="Ex: AbCdEfGhIjKlMnOpQrS"
            value={formData.google_ads_conversion_label || ''}
            onChange={(e) => setFormData((p) => ({ ...p, google_ads_conversion_label: e.target.value }))}
            data-testid="input-product-google-ads-conversion-label"
            style={{ marginTop: '4px', fontSize: '13px' }}
          />
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            Conversion Label do evento de compra gerado no Google Ads.
          </span>
        </div>
      </div>

      {/* 3. TikTok Ads */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          <span>⚫ TikTok Ads Pixel ID</span>
        </label>
        <input
          type="text"
          className="form-control-modern"
          placeholder="Ex: C1234567890ABCDEFGH"
          value={formData.tiktok_pixel_id || ''}
          onChange={(e) => setFormData((p) => ({ ...p, tiktok_pixel_id: e.target.value }))}
          data-testid="input-product-tiktok-pixel-id"
          style={{ marginTop: '4px', fontSize: '13px' }}
        />
        <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
          Identificador do Pixel no TikTok Ads Manager (dispara CompletePayment).
        </span>
      </div>
    </div>
  );
}
