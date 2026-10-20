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
  RotateCcw,
  Handshake,
} from 'lucide-react';
import {
  fetchSalesMetricsApi,
  fetchOrdersReportApi,
  fetchUtmBiAnalyticsApi,
  fetchOrderDetailsApi,
  downloadOrdersCsvApi,
  deleteOrderApi,
  bulkDeleteOrdersApi,
} from './sales/salesApi';
import SalesOverviewTab from './sales/SalesOverviewTab';
import OrdersReportTab from './sales/OrdersReportTab';
import UtmAnalyticsTab from './sales/UtmAnalyticsTab';
import OrderDetailsModal from './sales/OrderDetailsModal';
import RefundModal from './sales/RefundModal';
import RecoveryManagement from './RecoveryManagement';
import ProposalManagement from './ProposalManagement';
import { useToast } from '../context/ToastContext';
import '../styles/sales.css';

export default function SalesManagement({ currentUser, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview'); // 'overview' | 'orders' | 'utm_bi' | 'recovery' | 'proposals'

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [metrics, setMetrics] = useState({});
  const [orders, setOrders] = useState([]);
  const [utmBi, setUtmBi] = useState({});

  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingUtm, setLoadingUtm] = useState(false);

  // Paginação e filtros do relatório de pedidos
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Order Details Modal & Refund Target
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refundOrderTarget, setRefundOrderTarget] = useState(null);

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

  const loadOrders = useCallback(async (page = 1) => {
    try {
      setLoadingOrders(true);
      const data = await fetchOrdersReportApi({
        search: searchTerm,
        status: statusFilter,
        paymentMethod: methodFilter,
        limit: 20,
        offset: (page - 1) * 20,
      });
      const orderList = Array.isArray(data) ? data : (data.items || []);
      const totalCount = Array.isArray(data) ? data.length : (data.total ?? orderList.length);
      setOrders(orderList);
      setTotalOrders(totalCount);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar pedidos.', 'error');
    } finally {
      setLoadingOrders(false);
    }
  }, [searchTerm, statusFilter, methodFilter, addToast]);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleMethodFilterChange = (val) => {
    setMethodFilter(val);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadOrders(newPage);
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrderApi(orderId);
      addToast('Pedido excluído com sucesso.', 'success');
      loadOrders(currentPage);
      loadMetrics();
    } catch (err) {
      addToast(err.message || 'Erro ao excluir pedido.', 'error');
      throw err;
    }
  };

  const handleBulkDeleteOrders = async (orderIds) => {
    try {
      const res = await bulkDeleteOrdersApi(orderIds);
      addToast(`${res.deleted_count || orderIds.length} pedidos excluídos com sucesso.`, 'success');
      loadOrders(currentPage);
      loadMetrics();
    } catch (err) {
      addToast(err.message || 'Erro ao excluir pedidos em lote.', 'error');
      throw err;
    }
  };

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
      loadOrders(currentPage);
    } else if (activeTab === 'utm_bi') {
      loadUtmBi();
    }
  }, [activeTab, loadMetrics, loadOrders, loadUtmBi, currentPage]);

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

  const handleOpenRefund = (order) => {
    setRefundOrderTarget(order);
  };

  const handleRefundSuccess = (updatedOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
    if (selectedOrderDetails && selectedOrderDetails.id === updatedOrder.id) {
      setSelectedOrderDetails((prev) => ({ ...prev, ...updatedOrder }));
    }
    loadMetrics();
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

        <button
          type="button"
          className={`sales-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
          onClick={() => setActiveTab('recovery')}
          data-testid="tab-sales-recovery"
        >
          <RotateCcw size={16} />
          Recuperação de Vendas
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
          data-testid="tab-sales-proposals"
        >
          <Handshake size={16} />
          Propostas High-Ticket
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'overview' && (
        <SalesOverviewTab metrics={metrics} loading={loadingMetrics} />
      )}

      {activeTab === 'orders' && (
        <OrdersReportTab
          orders={orders}
          totalOrders={totalOrders}
          currentPage={currentPage}
          pageSize={20}
          onPageChange={handlePageChange}
          loading={loadingOrders}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          methodFilter={methodFilter}
          onMethodFilterChange={handleMethodFilterChange}
          onExportCsv={handleExportCsv}
          onViewDetails={handleOpenDetails}
          onOpenRefund={handleOpenRefund}
          onDeleteOrder={handleDeleteOrder}
          onBulkDeleteOrders={handleBulkDeleteOrders}
        />
      )}

      {activeTab === 'utm_bi' && (
        <UtmAnalyticsTab utmBi={utmBi} loading={loadingUtm} />
      )}

      {activeTab === 'recovery' && (
        <RecoveryManagement currentUser={currentUser} />
      )}

      {activeTab === 'proposals' && (
        <ProposalManagement currentUser={currentUser} />
      )}

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsModal
        order={selectedOrderDetails}
        onClose={() => setSelectedOrderDetails(null)}
        onOpenRefund={handleOpenRefund}
      />

      {/* Modal de Confirmação e Registro de Motivo de Reembolso */}
      <RefundModal
        isOpen={!!refundOrderTarget}
        order={refundOrderTarget}
        onClose={() => setRefundOrderTarget(null)}
        onRefundSuccess={handleRefundSuccess}
      />
    </div>
  );
}
