import React, { useState, useEffect } from 'react';
import {
  Calculator,
  X,
  CreditCard,
  Zap,
  Coins,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle,
  Clock,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { fetchInstallmentSimulationApi } from './installmentApi';

export default function ProductSplitSimulatorModal({
  isOpen,
  product,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simulationData, setSimulationData] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !product) {
      setSimulationData(null);
      setError('');
      return;
    }

    const defaultOffer = product.offers && product.offers.find((o) => o.is_default);
    const initialOfferId = defaultOffer ? defaultOffer.id : (product.offers && product.offers[0] ? product.offers[0].id : '');
    setSelectedOfferId(initialOfferId);

    loadSimulation(product.id, initialOfferId);
  }, [isOpen, product]);

  const loadSimulation = async (productId, offerId) => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchInstallmentSimulationApi(productId, offerId || null);
      setSimulationData(data);
      setSelectedInstallmentIndex(0);
    } catch (err) {
      setError(err.message || 'Erro ao carregar simulação de split.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferChange = (e) => {
    const newOfferId = e.target.value;
    setSelectedOfferId(newOfferId);
    if (product) {
      loadSimulation(product.id, newOfferId);
    }
  };

  if (!isOpen || !product) return null;

  const formatBrl = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const offers = product.offers || [];

  return (
    <div
      className="modal-backdrop-custom modal-overlay"
      data-testid="product-split-simulator-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="product-modal-dialog"
        data-testid="product-split-simulator-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabeçalho */}
        <div className="product-modal-header">
          <div className="product-modal-title-group">
            <div className="product-modal-icon-badge blue" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <Calculator size={22} />
            </div>
            <div>
              <h3 className="product-modal-title">
                Simulador de Split e Taxas: {product.name}
              </h3>
              <span className="product-modal-subtitle">
                Lucro líquido exato de cada sócio e do produtor por forma de pagamento
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="product-modal-close-btn"
            title="Fechar simulador"
            data-testid="close-split-simulator-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Oferta (se houver mais de uma) */}
        {offers.length > 1 && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Oferta:</label>
            <select
              className="form-control-modern"
              value={selectedOfferId}
              onChange={handleOfferChange}
              data-testid="select-simulator-offer"
              style={{ maxWidth: '300px', fontSize: '13px' }}
            >
              {offers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({formatBrl(off.price_brl)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Alerta de Erro */}
        {error && (
          <div className="form-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div className="spinner-border" style={{ marginBottom: '10px' }} />
            <p>Calculando projeção financeira e taxas de split...</p>
          </div>
        ) : simulationData ? (
          <div>
            {/* Card de Regras Ativas do Produto */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                marginBottom: '18px',
                fontSize: '12.5px',
              }}
              data-testid="simulator-summary-bar"
            >
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Preço Base</span>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                  {formatBrl(simulationData.base_price_brl)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Parcelamento Máx.</span>
                <strong style={{ color: '#0f172a' }}>Até {simulationData.max_installments}x</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Sem Juros ao Cliente</span>
                <strong style={{ color: '#0284c7' }}>
                  {simulationData.free_installments_count === 1
                    ? 'Apenas 1x à vista'
                    : `Até ${simulationData.free_installments_count}x sem juros`}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Taxa de Parcelamento</span>
                <strong style={{ color: '#0f172a' }}>
                  {simulationData.interest_rate_percent}% a.m. (
                  {simulationData.interest_payer === 'buyer' ? 'Comprador' : 'Produtor'})
                </strong>
              </div>
            </div>

            {/* Tabela de Cenários Comparativos */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="#059669" />
                <span>Comparativo de Lucro Líquido por Método</span>
              </h4>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }} data-testid="table-simulator-scenarios">
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                      <th style={{ padding: '10px 12px' }}>Cenário / Método</th>
                      <th style={{ padding: '10px 12px' }}>Valor Bruto</th>
                      <th style={{ padding: '10px 12px' }}>Taxa Gateway</th>
                      <th style={{ padding: '10px 12px', color: '#059669' }}>Líquido Total</th>
                      <th style={{ padding: '10px 12px', color: '#0284c7' }}>
                        Sua Conta ({simulationData.scenarios[0]?.producer_percentage || 100}%)
                      </th>
                      <th style={{ padding: '10px 12px' }}>Sócios do Split</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationData.scenarios.map((scen, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderTop: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                        data-testid={`row-scenario-${scen.payment_method}-${scen.installments}`}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {scen.payment_method === 'pix' && <Zap size={14} color="#059669" />}
                            {scen.payment_method === 'credit_card' && <CreditCard size={14} color="#0284c7" />}
                            {scen.payment_method === 'crypto' && <Coins size={14} color="#f59e0b" />}
                            <span>{scen.scenario_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {formatBrl(scen.gross_amount_brl)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#dc2626' }}>
                          -{formatBrl(scen.gateway_fee_brl)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>
                          {formatBrl(scen.net_amount_brl)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284c7' }}>
                          {formatBrl(scen.producer_amount_brl)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {scen.partners_distribution.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sem sócios cadastrados</span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {scen.partners_distribution.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    borderRadius: '6px',
                                    backgroundColor: p.is_expired ? '#fee2e2' : '#f3e8ff',
                                    color: p.is_expired ? '#b91c1c' : '#7e22ce',
                                    fontWeight: 600,
                                  }}
                                  title={p.is_expired ? 'Contrato expirado' : `${p.percentage}% do líquido`}
                                >
                                  {p.recipient_name}: {formatBrl(p.amount_brl)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulador Interativo de Parcelas do Cartão */}
            <div
              style={{
                padding: '14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 8px', fontSize: '13.5px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="#0284c7" />
                <span>Simulador Detalhado de Parcelas (1x a {simulationData.max_installments}x)</span>
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
                Selecione uma opção de parcelamento para inspecionar exatamente o que o comprador verá no checkout:
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <select
                  className="form-control-modern"
                  value={selectedInstallmentIndex}
                  onChange={(e) => setSelectedInstallmentIndex(parseInt(e.target.value, 10))}
                  data-testid="select-simulator-installments-preview"
                  style={{ maxWidth: '340px', fontSize: '13px' }}
                >
                  {simulationData.installment_options.map((opt, i) => (
                    <option key={opt.installments} value={i}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {simulationData.installment_options[selectedInstallmentIndex] && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                  }}
                  data-testid="simulator-installment-detail-card"
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Parcelas</span>
                    <strong>{simulationData.installment_options[selectedInstallmentIndex].installments}x</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Valor por Parcela</span>
                    <strong style={{ color: '#0284c7' }}>
                      {formatBrl(simulationData.installment_options[selectedInstallmentIndex].installment_value)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Total Cobrado do Cliente</span>
                    <strong style={{ color: '#0f172a' }}>
                      {formatBrl(simulationData.installment_options[selectedInstallmentIndex].total_amount)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Condição</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: simulationData.installment_options[selectedInstallmentIndex].has_interest ? '#fff7ed' : '#ecfdf5',
                        color: simulationData.installment_options[selectedInstallmentIndex].has_interest ? '#c2410c' : '#047857',
                      }}
                    >
                      {simulationData.installment_options[selectedInstallmentIndex].has_interest
                        ? `${simulationData.installment_options[selectedInstallmentIndex].interest_rate}% a.m. (Com juros)`
                        : 'Sem juros'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Rodapé com botão de fechar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={onClose}
            data-testid="btn-close-simulator"
          >
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
}
