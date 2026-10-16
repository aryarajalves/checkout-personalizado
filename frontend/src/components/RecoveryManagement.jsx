import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShoppingCart, QrCode, Filter, AlertCircle } from 'lucide-react';
import RecoveryStatsCards from './recovery/RecoveryStatsCards';
import AbandonedCartsTab from './recovery/AbandonedCartsTab';
import PendingPixTab from './recovery/PendingPixTab';
import {
  fetchRecoveryStatsApi,
  fetchAbandonedCartsApi,
  fetchPendingPixApi,
} from './recovery/recoveryApi';
import '../styles/recovery.css';

export default function RecoveryManagement() {
  const [activeTab, setActiveTab] = useState('abandoned'); // 'abandoned' | 'pix'
  const [stats, setStats] = useState({});
  const [abandonedCarts, setAbandonedCarts] = useState([]);
  const [pendingPixOrders, setPendingPixOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Estados de busca e filtro
  const [abandonedSearch, setAbandonedSearch] = useState('');
  const [abandonedStatus, setAbandonedStatus] = useState('all');
  const [pixSearch, setPixSearch] = useState('');
  const [pixStatus, setPixStatus] = useState('pending');

  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Carrega produtos para o dropdown de filtro
  const loadProducts = async () => {
    try {
      const res = await fetch('/api/v1/products/?limit=100', {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      // Ignora erro silencioso no filtro
    }
  };

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await fetchRecoveryStatsApi();
      setStats(data);
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao carregar métricas.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadTabData = useCallback(async () => {
    try {
      setLoadingData(true);
      setErrorMessage(null);
      if (activeTab === 'abandoned') {
        const carts = await fetchAbandonedCartsApi({
          productId: selectedProductId || undefined,
          status: abandonedStatus,
          search: abandonedSearch,
        });
        setAbandonedCarts(carts);
      } else {
        const pixOrders = await fetchPendingPixApi({
          productId: selectedProductId || undefined,
          status: pixStatus,
          search: pixSearch,
        });
        setPendingPixOrders(pixOrders);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao carregar dados da aba.');
    } finally {
      setLoadingData(false);
    }
  }, [activeTab, selectedProductId, abandonedStatus, abandonedSearch, pixStatus, pixSearch]);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  const handleRefreshAll = () => {
    loadStats();
    loadTabData();
  };

  return (
    <div className="recovery-container" data-testid="recovery-management-page">
      {/* Cabeçalho da Página */}
      <div className="recovery-header">
        <div>
          <h1 className="recovery-title">Recuperação de Vendas</h1>
          <p className="recovery-subtitle">
            Recupere leads que abandonaram o checkout no Step 1 e compradores com cobranças Pix aguardando pagamento.
          </p>
        </div>

        <div className="recovery-header-actions">
          {/* Filtro de Produto */}
          <div className="recovery-product-select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="recovery-product-select"
              data-testid="select-product-filter"
            >
              <option value="">Todos os Produtos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Atualizar */}
          <button
            type="button"
            onClick={handleRefreshAll}
            className="recovery-refresh-btn"
            title="Atualizar dados e métricas"
            disabled={loadingStats || loadingData}
          >
            <RefreshCw size={16} className={loadingStats || loadingData ? 'spin-icon' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Banner de Erro */}
      {errorMessage && (
        <div className="recovery-error-banner" data-testid="recovery-error-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="error-close-btn">×</button>
        </div>
      )}

      {/* Métricas e Estatísticas */}
      <RecoveryStatsCards stats={stats} />

      {/* Navegação por Abas */}
      <div className="recovery-tabs-nav">
        <button
          className={`recovery-tab-btn ${activeTab === 'abandoned' ? 'active' : ''}`}
          onClick={() => setActiveTab('abandoned')}
          data-testid="tab-abandoned-btn"
        >
          <ShoppingCart size={16} />
          <span>Carrinhos Abandonados</span>
          <span className="tab-counter-badge">{stats.total_abandoned || abandonedCarts.length || 0}</span>
        </button>

        <button
          className={`recovery-tab-btn ${activeTab === 'pix' ? 'active' : ''}`}
          onClick={() => setActiveTab('pix')}
          data-testid="tab-pix-btn"
        >
          <QrCode size={16} />
          <span>Pix Gerados / Pendentes</span>
          <span className="tab-counter-badge warning">{stats.total_pix_pending || pendingPixOrders.length || 0}</span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'abandoned' ? (
        <AbandonedCartsTab
          carts={abandonedCarts}
          loading={loadingData}
          onReload={handleRefreshAll}
          searchQuery={abandonedSearch}
          onSearchChange={setAbandonedSearch}
          statusFilter={abandonedStatus}
          onStatusFilterChange={setAbandonedStatus}
        />
      ) : (
        <PendingPixTab
          orders={pendingPixOrders}
          loading={loadingData}
          onReload={handleRefreshAll}
          searchQuery={pixSearch}
          onSearchChange={setPixSearch}
          statusFilter={pixStatus}
          onStatusFilterChange={setPixStatus}
        />
      )}
    </div>
  );
}
