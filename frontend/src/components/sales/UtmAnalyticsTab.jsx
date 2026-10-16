import React, { useState } from 'react';
import { Target, Layers, Radio, Share2 } from 'lucide-react';

export default function UtmAnalyticsTab({ utmBi = {}, loading = false }) {
  const [activeDimension, setActiveDimension] = useState('source'); // 'source' | 'campaign' | 'medium' | 'src'

  const getDimensionList = () => {
    switch (activeDimension) {
      case 'campaign':
        return utmBi.by_campaign || [];
      case 'medium':
        return utmBi.by_medium || [];
      case 'src':
        return utmBi.by_src || [];
      case 'source':
      default:
        return utmBi.by_source || [];
    }
  };

  const getDimensionLabel = () => {
    switch (activeDimension) {
      case 'campaign':
        return 'Campanha (utm_campaign)';
      case 'medium':
        return 'Mídia / Formato (utm_medium)';
      case 'src':
        return 'Parâmetro SRC (src)';
      case 'source':
      default:
        return 'Origem do Tráfego (utm_source)';
    }
  };

  const items = getDimensionList();

  return (
    <div>
      {/* Dimension Selector Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`sales-tab-btn ${activeDimension === 'source' ? 'active' : ''}`}
          onClick={() => setActiveDimension('source')}
          data-testid="dimension-source-btn"
        >
          <Target size={15} />
          Origem (Source)
        </button>
        <button
          type="button"
          className={`sales-tab-btn ${activeDimension === 'campaign' ? 'active' : ''}`}
          onClick={() => setActiveDimension('campaign')}
          data-testid="dimension-campaign-btn"
        >
          <Layers size={15} />
          Campanhas
        </button>
        <button
          type="button"
          className={`sales-tab-btn ${activeDimension === 'medium' ? 'active' : ''}`}
          onClick={() => setActiveDimension('medium')}
          data-testid="dimension-medium-btn"
        >
          <Radio size={15} />
          Mídias (Medium)
        </button>
        <button
          type="button"
          className={`sales-tab-btn ${activeDimension === 'src' ? 'active' : ''}`}
          onClick={() => setActiveDimension('src')}
          data-testid="dimension-src-btn"
        >
          <Share2 size={15} />
          Parâmetro SRC
        </button>
      </div>

      {/* Analytics Table */}
      <div className="sales-table-wrapper">
        <table className="sales-table" data-testid="utm-bi-table">
          <thead>
            <tr>
              <th>{getDimensionLabel()}</th>
              <th>Total de Pedidos</th>
              <th>Vendas Pagas</th>
              <th>Faturamento Líquido</th>
              <th>Taxa de Conversão</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="sales-empty">Carregando análise de tráfego...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="5" className="sales-empty" data-testid="utm-bi-empty-message">
                  Nenhum dado de rastreamento registrado para este critério.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} data-testid={`utm-row-${idx}`}>
                  <td>
                    <strong style={{ color: item.name === '(direto / orgânico)' ? '#64748b' : '#0f172a' }}>
                      {item.name}
                    </strong>
                  </td>
                  <td>{item.total_orders}</td>
                  <td>
                    <span className="sales-badge sales-badge-paid">{item.paid_orders}</span>
                  </td>
                  <td style={{ color: '#059669', fontWeight: 700 }}>
                    R$ {item.revenue_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <strong>{item.conversion_rate}%</strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
