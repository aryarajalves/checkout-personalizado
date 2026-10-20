import React, { useState, useEffect } from 'react';
import {
  GitFork,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Loader2,
  TrendingUp,
  Award,
  Users,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import {
  fetchProductABTestApi,
  createProductABTestApi,
  updateABTestApi,
  deleteABTestApi,
} from './abTestApi';

function formatBRL(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

export default function ProductABTestModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Formulário para criação de novo teste
  const [name, setName] = useState('Teste A/B de Ofertas');
  const [offerAId, setOfferAId] = useState('');
  const [offerBId, setOfferBId] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);

  const offers = product?.offers || [];
  const hasEnoughOffers = offers.length >= 2;

  useEffect(() => {
    if (isOpen && product) {
      loadABTest();
      setName(`Teste A/B - ${product.name}`);
      if (offers.length >= 2) {
        setOfferAId(offers[0].id);
        setOfferBId(offers[1].id);
      }
    } else {
      setTestData(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, product]);

  const loadABTest = async () => {
    try {
      setLoading(true);
      const data = await fetchProductABTestApi(product.id);
      setTestData(data);
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao carregar teste A/B do produto.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!offerAId || !offerBId) {
      if (showFeedback) showFeedback('error', 'Selecione ambas as ofertas A e B.');
      return;
    }
    if (Number(offerAId) === Number(offerBId)) {
      if (showFeedback) showFeedback('error', 'A Oferta A e a Oferta B devem ser diferentes.');
      return;
    }

    try {
      setSaving(true);
      const created = await createProductABTestApi(product.id, {
        name: name.trim() || 'Teste A/B de Ofertas',
        offer_a_id: Number(offerAId),
        offer_b_id: Number(offerBId),
        split_ratio: Number(splitRatio) || 50,
      });
      setTestData(created);
      if (showFeedback) showFeedback('success', 'Teste A/B iniciado com sucesso!');
    } catch (err) {
      if (showFeedback) showFeedback('error', err.message || 'Erro ao criar teste A/B.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!testData) return;
    try {
      setSaving(true);
      const updated = await updateABTestApi(testData.id, {
        is_active: !testData.is_active,
      });
      setTestData(updated);
      if (showFeedback) {
        showFeedback('success', updated.is_active ? 'Teste A/B reativado!' : 'Teste A/B pausado com sucesso.');
      }
    } catch (err) {
      if (showFeedback) showFeedback('error', err.message || 'Erro ao alterar status do teste.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!testData) return;
    try {
      setSaving(true);
      await deleteABTestApi(testData.id);
      setTestData(null);
      setShowDeleteConfirm(false);
      if (showFeedback) showFeedback('success', 'Teste A/B encerrado e excluído com sucesso.');
    } catch (err) {
      if (showFeedback) showFeedback('error', err.message || 'Erro ao excluir teste A/B.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-abtest-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-abtest-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95%' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-modal-title">
            <GitFork size={20} color="#ec4899" />
            <div>
              <h3>Teste A/B de Checkout • Divisão 50/50</h3>
              <p>
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            disabled={saving}
            data-testid="btn-close-abtest-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '20px', maxHeight: '78vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '10px' }}>
              <Loader2 size={32} className="spinning-icon" color="#ec4899" />
              <span style={{ fontSize: '13px', color: '#64748b' }}>Carregando dados do teste A/B...</span>
            </div>
          ) : !testData ? (
            /* Formulário de Criação */
            <div>
              {!hasEnoughOffers ? (
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: 600 }}>Pelo menos 2 ofertas são necessárias</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#b91c1c' }}>
                      Este produto possui apenas {offers.length} oferta cadastrada. Para iniciar um teste A/B dividindo o tráfego 50/50, crie pelo menos uma segunda oferta (ex: com outro preço ou garantia) na aba "Ofertas".
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', fontSize: '13px', color: '#9d174d' }}>
                    💡 <strong>Como funciona o Split 50/50:</strong> Metade dos visitantes que acessarem <code>/pay/{product.slug}</code> verão a Oferta A e a outra metade verá a Oferta B. A escolha é fixada no navegador do visitante.
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Nome do Experimento
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Teste Preço Cheio vs Desconto"
                      data-testid="input-abtest-name"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0369a1', marginBottom: '6px' }}>
                        Variante A (50% do Tráfego)
                      </label>
                      <select
                        value={offerAId}
                        onChange={(e) => setOfferAId(e.target.value)}
                        data-testid="select-offer-a"
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '13px', backgroundColor: '#f0f9ff' }}
                        required
                      >
                        {offers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({formatBRL(off.price_brl)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#be185d', marginBottom: '6px' }}>
                        Variante B (50% do Tráfego)
                      </label>
                      <select
                        value={offerBId}
                        onChange={(e) => setOfferBId(e.target.value)}
                        data-testid="select-offer-b"
                        style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #fbcfe8', fontSize: '13px', backgroundColor: '#fdf2f8' }}
                        required
                      >
                        {offers.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({formatBRL(off.price_brl)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    data-testid="btn-create-abtest"
                    style={{
                      marginTop: '8px',
                      padding: '11px',
                      borderRadius: '8px',
                      backgroundColor: '#ec4899',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {saving ? <Loader2 size={16} className="spinning-icon" /> : <GitFork size={16} />}
                    <span>Iniciar Experimento A/B</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Painel do Teste Existente com Métricas do Funil */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{testData.name}</h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Distribuição: 50% / 50%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      backgroundColor: testData.is_active ? '#dcfce7' : '#f1f5f9',
                      color: testData.is_active ? '#15803d' : '#64748b',
                    }}
                    data-testid="abtest-status-badge"
                  >
                    {testData.is_active ? '● Ativo em Produção' : '⏸ Pausado'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={saving}
                    data-testid="btn-toggle-abtest-status"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {testData.is_active ? <Pause size={13} /> : <Play size={13} />}
                    <span>{testData.is_active ? 'Pausar' : 'Reativar'}</span>
                  </button>
                </div>
              </div>

              {/* Grid Comparativo Variante A vs Variante B */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Card Variante A */}
                <div
                  data-testid="abtest-card-a"
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: testData.winning_variant === 'A' ? '#f0fdf4' : '#f8fafc',
                    border: testData.winning_variant === 'A' ? '2px solid #22c55e' : '1px solid #e2e8f0',
                    position: 'relative',
                  }}
                >
                  {testData.winning_variant === 'A' && (
                    <div style={{ position: 'absolute', top: '-10px', right: '12px', backgroundColor: '#22c55e', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={12} /> Vencedora
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>Variante A (50%)</div>
                  <h5 style={{ margin: '4px 0 2px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{testData.offer_a_name}</h5>
                  <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700, marginBottom: '14px' }}>
                    {formatBRL(testData.offer_a_price_brl)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Visitas:</span>
                      <strong data-testid="metric-visitors-a">{testData.visitors_a}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Checkouts:</span>
                      <strong data-testid="metric-initiates-a">{testData.initiates_a}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Pedidos Pagos:</span>
                      <strong data-testid="metric-conversions-a" style={{ color: '#16a34a' }}>{testData.conversions_a}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Faturamento:</span>
                      <strong data-testid="metric-revenue-a">{formatBRL(testData.revenue_a_brl)}</strong>
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Conversão:</span>
                      <span data-testid="metric-rate-a" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {testData.conversion_rate_a.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Variante B */}
                <div
                  data-testid="abtest-card-b"
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: testData.winning_variant === 'B' ? '#f0fdf4' : '#f8fafc',
                    border: testData.winning_variant === 'B' ? '2px solid #22c55e' : '1px solid #e2e8f0',
                    position: 'relative',
                  }}
                >
                  {testData.winning_variant === 'B' && (
                    <div style={{ position: 'absolute', top: '-10px', right: '12px', backgroundColor: '#22c55e', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={12} /> Vencedora
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#be185d', textTransform: 'uppercase' }}>Variante B (50%)</div>
                  <h5 style={{ margin: '4px 0 2px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{testData.offer_b_name}</h5>
                  <div style={{ fontSize: '13px', color: '#ec4899', fontWeight: 700, marginBottom: '14px' }}>
                    {formatBRL(testData.offer_b_price_brl)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Visitas:</span>
                      <strong data-testid="metric-visitors-b">{testData.visitors_b}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Checkouts:</span>
                      <strong data-testid="metric-initiates-b">{testData.initiates_b}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Pedidos Pagos:</span>
                      <strong data-testid="metric-conversions-b" style={{ color: '#16a34a' }}>{testData.conversions_b}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Faturamento:</span>
                      <strong data-testid="metric-revenue-b">{formatBRL(testData.revenue_b_brl)}</strong>
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Conversão:</span>
                      <span data-testid="metric-rate-b" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {testData.conversion_rate_b.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Exclusão */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '6px' }}>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="btn-delete-abtest-prompt"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Excluir Experimento A/B</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12.5px', color: '#b91c1c' }}>Tem certeza que deseja excluir este teste?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        data-testid="btn-cancel-delete-abtest"
                        style={{ padding: '4px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        data-testid="btn-confirm-delete-abtest"
                        style={{ padding: '4px 10px', fontSize: '12px', border: 'none', borderRadius: '4px', background: '#ef4444', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
