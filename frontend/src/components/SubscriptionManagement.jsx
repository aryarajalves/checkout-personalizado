import React, { useState, useEffect, useCallback } from 'react';
import {
  Repeat,
  TrendingUp,
  Users,
  AlertTriangle,
  XCircle,
  CheckCircle,
  X,
  Loader2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import {
  fetchSubscriptionStatsApi,
  fetchSubscriptionsApi,
  fetchInvoicesApi,
  pauseSubscriptionApi,
  resumeSubscriptionApi,
  cancelSubscriptionApi,
} from './subscriptions/subscriptionApi';
import SubscriptionListTab from './subscriptions/SubscriptionListTab';
import SubscriptionInvoicesTab from './subscriptions/SubscriptionInvoicesTab';
import { useToast } from '../context/ToastContext';
import '../styles/subscriptions.css';

export default function SubscriptionManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' | 'invoices'
  const [stats, setStats] = useState({
    mrr_brl: 0.0,
    active_subscriptions: 0,
    past_due_subscriptions: 0,
    canceled_subscriptions: 0,
    total_subscriptions: 0,
    total_invoices_paid_brl: 0.0,
  });

  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Filters
  const [subsSearch, setSubsSearch] = useState('');
  const [subsStatus, setSubsStatus] = useState('');
  const [invoicesStatus, setInvoicesStatus] = useState('');

  // Modals
  const [detailsModalSub, setDetailsModalSub] = useState(null);
  const [cancelModalSub, setCancelModalSub] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchSubscriptionStatsApi();
      setStats(data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const data = await fetchSubscriptionsApi({
        search: subsSearch,
        status: subsStatus,
      });
      setSubscriptions(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar assinaturas.', 'error');
    } finally {
      setLoadingSubs(false);
    }
  }, [subsSearch, subsStatus, addToast]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const data = await fetchInvoicesApi({
        status: invoicesStatus,
      });
      setInvoices(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar faturas.', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoicesStatus, addToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions();
    } else {
      loadInvoices();
    }
  }, [activeTab, loadSubscriptions, loadInvoices]);

  // Actions
  const handleTogglePause = async (sub) => {
    try {
      setActionLoading(true);
      if (sub.status === 'active') {
        await pauseSubscriptionApi(sub.id);
        addToast(`Assinatura ${sub.subscription_code} pausada com sucesso.`, 'success');
      } else {
        await resumeSubscriptionApi(sub.id);
        addToast(`Assinatura ${sub.subscription_code} reativada com sucesso.`, 'success');
      }
      loadSubscriptions();
      loadStats();
    } catch (err) {
      addToast(err.message || 'Falha ao alterar status da assinatura.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSub) return;
    try {
      setActionLoading(true);
      await cancelSubscriptionApi(cancelModalSub.id, cancelReason);
      addToast(`Assinatura ${cancelModalSub.subscription_code} cancelada com sucesso.`, 'success');
      setCancelModalSub(null);
      setCancelReason('');
      loadSubscriptions();
      loadStats();
    } catch (err) {
      addToast(err.message || 'Falha ao cancelar assinatura.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="subs-container" data-testid="subscription-management-screen">
      {/* Header */}
      <div className="subs-header">
        <h1 className="subs-title">Assinaturas & MRR</h1>
        <p className="subs-subtitle">
          Gestão de planos recorrentes, receita mensal previsível e faturas por ciclo
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="subs-stats-grid" data-testid="subs-stats-grid">
        <div className="subs-stat-card">
          <div className="subs-stat-top">
            <span className="subs-stat-label">MRR Estimado</span>
            <div className="subs-stat-icon subs-icon-mrr">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="subs-stat-value" data-testid="stat-mrr">
            R$ {stats.mrr_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="subs-stat-hint">Receita mensal recorrente</span>
        </div>

        <div className="subs-stat-card">
          <div className="subs-stat-top">
            <span className="subs-stat-label">Assinaturas Ativas</span>
            <div className="subs-stat-icon subs-icon-active">
              <Users size={18} />
            </div>
          </div>
          <div className="subs-stat-value" data-testid="stat-active-subs">
            {stats.active_subscriptions}
          </div>
          <span className="subs-stat-hint">Clientes com cobrança regular</span>
        </div>

        <div className="subs-stat-card">
          <div className="subs-stat-top">
            <span className="subs-stat-label">Em Atraso (Past Due)</span>
            <div className="subs-stat-icon subs-icon-warning">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="subs-stat-value" data-testid="stat-pastdue-subs">
            {stats.past_due_subscriptions}
          </div>
          <span className="subs-stat-hint">Necessitam retentativa de cobrança</span>
        </div>

        <div className="subs-stat-card">
          <div className="subs-stat-top">
            <span className="subs-stat-label">Canceladas</span>
            <div className="subs-stat-icon subs-icon-danger">
              <XCircle size={18} />
            </div>
          </div>
          <div className="subs-stat-value" data-testid="stat-canceled-subs">
            {stats.canceled_subscriptions}
          </div>
          <span className="subs-stat-hint">Churn acumulado</span>
        </div>

        <div className="subs-stat-card">
          <div className="subs-stat-top">
            <span className="subs-stat-label">Faturas Pagas</span>
            <div className="subs-stat-icon subs-icon-invoices">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="subs-stat-value" data-testid="stat-invoices-paid">
            R$ {stats.total_invoices_paid_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="subs-stat-hint">{stats.total_invoices_count || 0} faturas liquidadas</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="subs-tabs-bar">
        <button
          type="button"
          className={`subs-tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
          data-testid="tab-btn-subscriptions"
        >
          <Repeat size={16} />
          Assinaturas
        </button>
        <button
          type="button"
          className={`subs-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
          data-testid="tab-btn-invoices"
        >
          <Calendar size={16} />
          Faturas Recorrentes
        </button>
      </div>

      {/* Content */}
      {activeTab === 'subscriptions' ? (
        <SubscriptionListTab
          subscriptions={subscriptions}
          loading={loadingSubs}
          searchTerm={subsSearch}
          onSearchChange={setSubsSearch}
          statusFilter={subsStatus}
          onStatusFilterChange={setSubsStatus}
          onViewDetails={(sub) => setDetailsModalSub(sub)}
          onTogglePause={handleTogglePause}
          onOpenCancel={(sub) => {
            setCancelModalSub(sub);
            setCancelReason('');
          }}
        />
      ) : (
        <SubscriptionInvoicesTab
          invoices={invoices}
          loading={loadingInvoices}
          statusFilter={invoicesStatus}
          onStatusFilterChange={setInvoicesStatus}
        />
      )}

      {/* Modal de Detalhes da Assinatura */}
      {detailsModalSub && (
        <div className="subs-modal-backdrop" data-testid="sub-details-modal">
          <div className="subs-modal-panel" style={{ maxWidth: '700px' }}>
            <div className="subs-modal-header">
              <h2 className="subs-modal-title">Detalhes da Assinatura {detailsModalSub.subscription_code}</h2>
              <button
                type="button"
                className="subs-modal-close-btn"
                onClick={() => setDetailsModalSub(null)}
                data-testid="close-details-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="subs-modal-body">
              <div className="subs-detail-grid">
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Cliente</span>
                  <span className="subs-detail-val">{detailsModalSub.customer_name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{detailsModalSub.customer_email}</span>
                </div>
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Status Atual</span>
                  <span className="subs-detail-val">{detailsModalSub.status}</span>
                </div>
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Produto & Oferta</span>
                  <span className="subs-detail-val">{detailsModalSub.product_name || `Produto #${detailsModalSub.product_id}`}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{detailsModalSub.offer_name || 'Oferta Padrão'}</span>
                </div>
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Ciclo e Valor</span>
                  <span className="subs-detail-val">
                    R$ {detailsModalSub.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {detailsModalSub.billing_cycle}
                  </span>
                </div>
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Forma de Pagamento</span>
                  <span className="subs-detail-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={14} /> Cartão final {detailsModalSub.card_last_four || '4242'} ({detailsModalSub.card_brand || 'Visa'})
                  </span>
                </div>
                <div className="subs-detail-item">
                  <span className="subs-detail-label">Ciclo Atual</span>
                  <span className="subs-detail-val">Ciclo #{detailsModalSub.current_cycle || 1}</span>
                </div>
              </div>

              {/* Faturas desta Assinatura */}
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                Faturas do Assinante ({detailsModalSub.invoices?.length || 0})
              </h3>
              <div className="subs-table-wrapper">
                <table className="subs-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Ciclo</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!detailsModalSub.invoices || detailsModalSub.invoices.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="subs-empty">Nenhuma fatura registrada.</td>
                      </tr>
                    ) : (
                      detailsModalSub.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td><strong>{inv.invoice_code}</strong></td>
                          <td>Ciclo {inv.cycle_number}</td>
                          <td>R$ {inv.amount_brl?.toFixed(2)}</td>
                          <td><span className="subs-badge subs-badge-paid">{inv.status}</span></td>
                          <td>{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="subs-modal-footer">
              <button
                type="button"
                className="subs-btn-secondary"
                onClick={() => setDetailsModalSub(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Cancelamento (Design Premium Light) */}
      {cancelModalSub && (
        <div className="subs-modal-backdrop" data-testid="cancel-subscription-modal">
          <div className="subs-modal-panel" style={{ maxWidth: '480px' }}>
            <div className="subs-modal-header">
              <h2 className="subs-modal-title">Cancelar Assinatura</h2>
              <button
                type="button"
                className="subs-modal-close-btn"
                onClick={() => setCancelModalSub(null)}
                data-testid="close-cancel-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="subs-modal-body">
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 16px 0' }}>
                Tem certeza que deseja cancelar a assinatura <strong>{cancelModalSub.subscription_code}</strong> do cliente <strong>{cancelModalSub.customer_name}</strong>?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                  Motivo do Cancelamento
                </label>
                <input
                  type="text"
                  className="subs-search-input"
                  style={{ padding: '8px 12px' }}
                  placeholder="Ex: Solicitado pelo cliente, churn voluntário..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  data-testid="cancel-reason-input"
                />
              </div>
            </div>

            <div className="subs-modal-footer">
              <button
                type="button"
                className="subs-btn-secondary"
                onClick={() => setCancelModalSub(null)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="subs-btn-danger-confirm"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                data-testid="confirm-cancel-subscription-btn"
              >
                {actionLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
