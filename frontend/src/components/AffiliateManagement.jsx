import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  MousePointer,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  fetchAffiliateStatsApi,
  fetchAffiliatesApi,
  createAffiliateApi,
  updateAffiliateApi,
  linkProductToAffiliateApi,
  removeProductLinkApi,
  fetchCommissionsHistoryApi,
  markCommissionPaidApi,
  fetchProductsForAffiliatesApi,
} from './affiliates/affiliateApi';
import AffiliateListTab from './affiliates/AffiliateListTab';
import AffiliateCommissionsTab from './affiliates/AffiliateCommissionsTab';
import AffiliateFormModal from './affiliates/AffiliateFormModal';
import AffiliateLinkProductModal from './affiliates/AffiliateLinkProductModal';
import { useToast } from '../context/ToastContext';
import '../styles/affiliates.css';

export default function AffiliateManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'commissions'
  const [stats, setStats] = useState({
    total_affiliates: 0,
    active_affiliates: 0,
    total_sales_via_affiliates: 0,
    total_sales_brl: 0.0,
    total_commissions_pending_brl: 0.0,
    total_commissions_paid_brl: 0.0,
    total_clicks: 0,
  });

  const [affiliates, setAffiliates] = useState([]);
  const [products, setProducts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedLink, setCopiedLink] = useState(null);

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingAffiliate, setLinkingAffiliate] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, affiliatesData, productsData] = await Promise.all([
        fetchAffiliateStatsApi().catch(() => ({})),
        fetchAffiliatesApi().catch(() => []),
        fetchProductsForAffiliatesApi().catch(() => []),
      ]);
      setStats((prev) => ({ ...prev, ...statsData }));
      setAffiliates(affiliatesData || []);
      setProducts(productsData || []);

      if (activeTab === 'commissions') {
        const commData = await fetchCommissionsHistoryApi({ status: statusFilter }).catch(() => []);
        setCommissions(commData || []);
      }
    } catch {
      addToast('Erro ao carregar dados do painel de afiliados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const handleCopyLink = (url) => {
    try {
      navigator.clipboard.writeText(url);
      setCopiedLink(url);
      addToast('Link de indicação copiado com sucesso!', 'success');
      setTimeout(() => setCopiedLink(null), 2500);
    } catch {
      addToast('Não foi possível copiar o link.', 'error');
    }
  };

  const handleCreateOrUpdateAffiliate = async (payload) => {
    try {
      setModalLoading(true);
      if (editingAffiliate?.id) {
        await updateAffiliateApi(editingAffiliate.id, payload);
        addToast('Parceiro afiliado atualizado com sucesso!', 'success');
      } else {
        await createAffiliateApi(payload);
        addToast('Novo parceiro cadastrado com sucesso!', 'success');
      }
      setIsFormModalOpen(false);
      setEditingAffiliate(null);
      await loadData();
    } catch (err) {
      addToast(err.message || 'Falha ao salvar dados do afiliado.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleLinkProduct = async (payload) => {
    if (!linkingAffiliate?.id) return;
    try {
      setModalLoading(true);
      await linkProductToAffiliateApi(linkingAffiliate.id, payload);
      addToast('Produto vinculado com sucesso!', 'success');
      setIsLinkModalOpen(false);
      setLinkingAffiliate(null);
      await loadData();
    } catch (err) {
      addToast(err.message || 'Falha ao vincular produto.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveProductLink = async (linkId) => {
    try {
      await removeProductLinkApi(linkId);
      addToast('Vínculo removido com sucesso.', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Falha ao remover vínculo.', 'error');
    }
  };

  const handleMarkCommissionPaid = async (commissionId, notes) => {
    try {
      await markCommissionPaidApi(commissionId, notes);
      addToast('Comissão marcada como paga!', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Falha ao liquidar comissão.', 'error');
    }
  };

  const filteredAffiliates = affiliates.filter((aff) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      aff.name.toLowerCase().includes(term) ||
      aff.email.toLowerCase().includes(term) ||
      aff.affiliate_code.toLowerCase().includes(term)
    );
  });

  return (
    <div className="affiliates-container" data-testid="affiliate-management">
      {/* Header */}
      <div className="affiliates-header">
        <div className="affiliates-title-box">
          <h1>
            <Users size={24} color="#38bdf8" />
            Gestão de Afiliados & Parcerias
          </h1>
          <p>
            Cadastre afiliados, gere links de indicação, acompanhe conversões e gerencie comissões.
          </p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="affiliates-kpi-grid">
        <div className="affiliate-kpi-card" data-testid="kpi-total-affiliates">
          <div className="affiliate-kpi-icon kpi-icon-blue">
            <Users size={22} />
          </div>
          <div className="affiliate-kpi-info">
            <span className="affiliate-kpi-label">Afiliados Ativos</span>
            <span className="affiliate-kpi-value">
              {stats.active_affiliates} / {stats.total_affiliates}
            </span>
          </div>
        </div>

        <div className="affiliate-kpi-card" data-testid="kpi-total-sales">
          <div className="affiliate-kpi-icon kpi-icon-purple">
            <TrendingUp size={22} />
          </div>
          <div className="affiliate-kpi-info">
            <span className="affiliate-kpi-label">Vendas por Afiliados</span>
            <span className="affiliate-kpi-value">
              R$ {Number(stats.total_sales_brl || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="affiliate-kpi-card" data-testid="kpi-commissions-pending">
          <div className="affiliate-kpi-icon kpi-icon-amber">
            <Clock size={22} />
          </div>
          <div className="affiliate-kpi-info">
            <span className="affiliate-kpi-label">Comissões a Pagar</span>
            <span className="affiliate-kpi-value" style={{ color: '#fbbf24' }}>
              R$ {Number(stats.total_commissions_pending_brl || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="affiliate-kpi-card" data-testid="kpi-commissions-paid">
          <div className="affiliate-kpi-icon kpi-icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="affiliate-kpi-info">
            <span className="affiliate-kpi-label">Comissões Liquidadas</span>
            <span className="affiliate-kpi-value" style={{ color: '#4ade80' }}>
              R$ {Number(stats.total_commissions_paid_brl || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="affiliate-kpi-card" data-testid="kpi-total-clicks">
          <div className="affiliate-kpi-icon kpi-icon-blue">
            <MousePointer size={22} />
          </div>
          <div className="affiliate-kpi-info">
            <span className="affiliate-kpi-label">Cliques em Links</span>
            <span className="affiliate-kpi-value">{stats.total_clicks}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="affiliates-nav-tabs">
        <button
          type="button"
          className={`affiliates-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
          data-testid="tab-affiliates-list"
        >
          <Users size={16} />
          Parceiros Cadastrados ({affiliates.length})
        </button>

        <button
          type="button"
          className={`affiliates-tab-btn ${activeTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('commissions')}
          data-testid="tab-commissions-history"
        >
          <FileSpreadsheet size={16} />
          Extrato de Comissões
        </button>
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === 'list' ? (
        <AffiliateListTab
          affiliates={filteredAffiliates}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenCreateModal={() => {
            setEditingAffiliate(null);
            setIsFormModalOpen(true);
          }}
          onOpenEditModal={(aff) => {
            setEditingAffiliate(aff);
            setIsFormModalOpen(true);
          }}
          onOpenLinkProductModal={(aff) => {
            setLinkingAffiliate(aff);
            setIsLinkModalOpen(true);
          }}
          onRemoveProductLink={handleRemoveProductLink}
          copiedLink={copiedLink}
          onCopyLink={handleCopyLink}
        />
      ) : (
        <AffiliateCommissionsTab
          commissions={commissions}
          loading={loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onMarkPaid={handleMarkCommissionPaid}
        />
      )}

      {/* Modais */}
      <AffiliateFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAffiliate(null);
        }}
        onSubmit={handleCreateOrUpdateAffiliate}
        initialData={editingAffiliate}
        loading={modalLoading}
      />

      <AffiliateLinkProductModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setLinkingAffiliate(null);
        }}
        onSubmit={handleLinkProduct}
        affiliate={linkingAffiliate}
        products={products}
        loading={modalLoading}
      />
    </div>
  );
}
