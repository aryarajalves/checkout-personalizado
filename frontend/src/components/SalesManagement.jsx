import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  ListOrdered,
  Target,
  X,
  CreditCard,
  QrCode,
  Share2,
  Tag,
  Users,
} from 'lucide-react';
import {
  fetchSalesMetricsApi,
  fetchOrdersReportApi,
  fetchUtmBiAnalyticsApi,
  fetchOrderDetailsApi,
  downloadOrdersCsvApi,
} from './sales/salesApi';
import SalesOverviewTab from './sales/SalesOverviewTab';
import OrdersReportTab from './sales/OrdersReportTab';
import UtmAnalyticsTab from './sales/UtmAnalyticsTab';
import { useToast } from '../context/ToastContext';
import '../styles/sales.css';

export default function SalesManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'utm_bi'
  const [metrics, setMetrics] = useState({});
  const [orders, setOrders] = useState([]);
  const [utmBi, setUtmBi] = useState({});

  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingUtm, setLoadingUtm] = useState(false);

  // Filters for orders report
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Order Details Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { addToast } = useToast();

  const loadMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const data = await fetchSalesMetricsApi();
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const data = await fetchOrdersReportApi({
        search: searchTerm,
        status: statusFilter,
        paymentMethod: methodFilter,
      });
      setOrders(data || []);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar pedidos.', 'error');
    } finally {
      setLoadingOrders(false);
    }
  }, [searchTerm, statusFilter, methodFilter, addToast]);

  const loadUtmBi = useCallback(async () => {
    try {
      setLoadingUtm(true);
      const data = await fetchUtmBiAnalyticsApi();
      setUtmBi(data);
    } catch (err) {
      console.error('Erro ao carregar BI de UTMs:', err);
    } finally {
      setLoadingUtm(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadMetrics();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'utm_bi') {
      loadUtmBi();
    }
  }, [activeTab, loadMetrics, loadOrders, loadUtmBi]);

  const handleExportCsv = async () => {
    try {
      await downloadOrdersCsvApi({
        search: searchTerm,
        status: statusFilter,
        paymentMethod: methodFilter,
      });
      addToast('Relatório de pedidos exportado com sucesso.', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao exportar CSV.', 'error');
    }
  };

  const handleOpenDetails = async (orderId) => {
    try {
      setLoadingDetails(true);
      const details = await fetchOrderDetailsApi(orderId);
      setSelectedOrderDetails(details);
    } catch (err) {
      addToast(err.message || 'Falha ao buscar detalhes do pedido.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="sales-container" data-testid="sales-management-screen">
      {/* Header */}
      <div className="sales-header">
        <div>
          <h1 className="sales-title">Painel de Vendas & BI</h1>
          <p className="sales-subtitle">
            Métricas de faturamento, relatório detalhado de pedidos e inteligência de tráfego UTM
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sales-tabs-bar">
        <button
          type="button"
          className={`sales-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          data-testid="tab-sales-overview"
        >
          <BarChart3 size={16} />
          Visão Geral & KPIs
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          data-testid="tab-orders-report"
        >
          <ListOrdered size={16} />
          Relatório de Pedidos
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeTab === 'utm_bi' ? 'active' : ''}`}
          onClick={() => setActiveTab('utm_bi')}
          data-testid="tab-utm-bi"
        >
          <Target size={16} />
          BI de Tráfego & UTMs
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'overview' && (
        <SalesOverviewTab metrics={metrics} loading={loadingMetrics} />
      )}

      {activeTab === 'orders' && (
        <OrdersReportTab
          orders={orders}
          loading={loadingOrders}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          methodFilter={methodFilter}
          onMethodFilterChange={setMethodFilter}
          onExportCsv={handleExportCsv}
          onViewDetails={handleOpenDetails}
        />
      )}

      {activeTab === 'utm_bi' && (
        <UtmAnalyticsTab utmBi={utmBi} loading={loadingUtm} />
      )}

      {/* Modal de Detalhes do Pedido */}
      {selectedOrderDetails && (
        <div className="sales-modal-backdrop" data-testid="order-details-modal">
          <div className="sales-modal-panel">
            <div className="sales-modal-header">
              <h2 className="sales-modal-title">Pedido {selectedOrderDetails.order_code}</h2>
              <button
                type="button"
                className="sales-modal-close-btn"
                onClick={() => setSelectedOrderDetails(null)}
                data-testid="close-order-details-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="sales-modal-body">
              {/* Detalhes Gerais */}
              <div className="sales-detail-grid">
                <div className="sales-detail-item">
                  <span className="sales-detail-label">Cliente</span>
                  <span className="sales-detail-val">{selectedOrderDetails.customer_name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedOrderDetails.customer_email} • +{selectedOrderDetails.customer_phone_ddi} {selectedOrderDetails.customer_phone}
                  </span>
                </div>

                <div className="sales-detail-item">
                  <span className="sales-detail-label">Status & Método</span>
                  <span className="sales-detail-val" style={{ textTransform: 'capitalize' }}>
                    {selectedOrderDetails.status} ({selectedOrderDetails.payment_method})
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Gateway: {selectedOrderDetails.gateway_name}
                  </span>
                </div>

                <div className="sales-detail-item">
                  <span className="sales-detail-label">Produto & Oferta</span>
                  <span className="sales-detail-val">{selectedOrderDetails.product_name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedOrderDetails.offer_name || 'Oferta Padrão'}
                  </span>
                </div>

                <div className="sales-detail-item">
                  <span className="sales-detail-label">Valor Total</span>
                  <span className="sales-detail-val" style={{ color: '#059669', fontSize: '16px' }}>
                    R$ {selectedOrderDetails.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {selectedOrderDetails.discount_amount_brl > 0 && (
                    <span style={{ fontSize: '12px', color: '#dc2626' }}>
                      Desconto cupom ({selectedOrderDetails.coupon_code}): - R$ {selectedOrderDetails.discount_amount_brl?.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Rastreamento de Tráfego / UTMs */}
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                Origem do Tráfego & UTMs
              </h3>
              <div className="sales-detail-grid" style={{ marginBottom: '20px' }}>
                <div className="sales-detail-item">
                  <span className="sales-detail-label">UTM Source</span>
                  <span className="sales-detail-val">{selectedOrderDetails.utm_source || '— (direto)'}</span>
                </div>
                <div className="sales-detail-item">
                  <span className="sales-detail-label">UTM Campaign</span>
                  <span className="sales-detail-val">{selectedOrderDetails.utm_campaign || '—'}</span>
                </div>
                <div className="sales-detail-item">
                  <span className="sales-detail-label">UTM Medium</span>
                  <span className="sales-detail-val">{selectedOrderDetails.utm_medium || '—'}</span>
                </div>
                <div className="sales-detail-item">
                  <span className="sales-detail-label">Parâmetro SRC</span>
                  <span className="sales-detail-val">{selectedOrderDetails.src || '—'}</span>
                </div>
              </div>

              {/* Divisão de Pagamento / Splits */}
              {selectedOrderDetails.splits && selectedOrderDetails.splits.length > 0 && (
                <>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                    Split de Pagamento Entre Sócios
                  </h3>
                  <div className="sales-table-wrapper" style={{ marginBottom: '0' }}>
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Sócio / Recebedor</th>
                          <th>Percentual</th>
                          <th>Valor Repassado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrderDetails.splits.map((s, idx) => (
                          <tr key={idx}>
                            <td><strong>{s.recipient_name}</strong></td>
                            <td>{s.percentage}%</td>
                            <td>R$ {s.amount_brl?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="sales-modal-footer">
              <button
                type="button"
                className="sales-btn-close"
                onClick={() => setSelectedOrderDetails(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
