import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Sparkles, RefreshCw } from 'lucide-react';
import ProposalMetrics from './proposals/ProposalMetrics';
import ProposalTable from './proposals/ProposalTable';
import ProposalModal from './proposals/ProposalModal';
import { useToast } from '../context/ToastContext';
import '../styles/proposals.css';

export default function ProposalManagement() {
  const { addToast } = useToast();
  const [proposals, setProposals] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/proposals/metrics', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas de propostas:', err);
    }
  }, []);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set('search', search.trim());
      if (statusFilter) query.set('status', statusFilter);
      if (productFilter) query.set('product_id', productFilter);
      if (paymentMethodFilter) query.set('payment_method', paymentMethodFilter);

      const qs = query.toString();
      const url = qs ? `/api/v1/proposals?${qs}` : '/api/v1/proposals';

      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProposals(data.items || []);
      } else {
        addToast('error', 'Falha ao carregar lista de propostas.');
      }
    } catch (err) {
      console.error('Erro ao carregar propostas:', err);
      addToast('error', 'Falha ao carregar lista de propostas.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, productFilter, paymentMethodFilter, addToast]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/products', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar produtos para propostas:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchProposals();
    fetchProducts();
  }, [fetchMetrics, fetchProposals, fetchProducts]);

  const handleOpenCreateModal = () => {
    setEditingProposal(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proposal) => {
    setEditingProposal(proposal);
    setIsModalOpen(true);
  };

  const handleSaveProposal = async (proposalData, editId) => {
    const isEdit = Boolean(editId);
    const url = isEdit ? `/api/v1/proposals/${editId}` : '/api/v1/proposals';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(proposalData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || (isEdit ? 'Erro ao atualizar proposta.' : 'Erro ao gerar proposta comercial.'));
    }
    if (isEdit) {
      addToast('success', `Proposta ${data.proposal_code} atualizada com sucesso!`);
    } else {
      addToast('success', `Proposta ${data.proposal_code} gerada com sucesso! Link pronto para envio.`);
    }
    setIsModalOpen(false);
    setEditingProposal(null);
    fetchMetrics();
    fetchProposals();
  };

  const handleCancelProposal = async (id) => {
    try {
      const res = await fetch(`/api/v1/proposals/${id}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao cancelar proposta.');
      }
      addToast('success', 'Proposta comercial cancelada com sucesso.');
      fetchMetrics();
      fetchProposals();
    } catch (err) {
      addToast('error', err.message || 'Erro ao cancelar proposta.');
    }
  };

  const handleDeleteProposal = async (id) => {
    try {
      const res = await fetch(`/api/v1/proposals/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao excluir proposta.');
      }
      addToast('success', 'Registro de proposta excluído com sucesso.');
      fetchMetrics();
      fetchProposals();
    } catch (err) {
      addToast('error', err.message || 'Erro ao excluir proposta.');
    }
  };

  return (
    <div className="proposals-container">
      <div className="proposals-header">
        <div>
          <h1>
            <Sparkles size={24} color="#0284c7" />
            Links de Negociação Personalizada (High-Ticket)
          </h1>
          <p>
            Crie propostas comerciais sob medida para clientes de WhatsApp, Closer ou Call com valor, parcelas e prazos exclusivos.
          </p>
        </div>

        <button
          type="button"
          className="btn-new-proposal"
          onClick={handleOpenCreateModal}
        >
          <Plus size={18} />
          Nova Proposta Personalizada
        </button>
      </div>

      {/* Métricas / KPIs */}
      <ProposalMetrics metrics={metrics} loading={loading} />

      {/* Barra de Filtros e Busca */}
      <div className="proposal-filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            className="proposal-search-input"
            placeholder="Buscar por código, cliente, closer ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Filter size={18} color="#64748b" />
          <select
            className="proposal-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="active">Ativas (Válidas)</option>
            <option value="paid">Fechadas (Pagas)</option>
            <option value="expired">Expiradas</option>
            <option value="canceled">Canceladas</option>
          </select>

          <select
            className="proposal-filter-select"
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            data-testid="proposal-filter-payment-method"
          >
            <option value="">Todas as Formas de Pagamento</option>
            <option value="all">Todos os Métodos Permitidos</option>
            <option value="pix">Apenas Pix</option>
            <option value="credit_card">Apenas Cartão</option>
            <option value="hybrid_pix_card">Pix + Cartão (Híbrido)</option>
            <option value="hybrid_two_cards">2 Cartões (Híbrido)</option>
          </select>

          <select
            className="proposal-filter-select"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">Todos os Produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn-icon-action"
            title="Atualizar Lista"
            onClick={() => {
              fetchMetrics();
              fetchProposals();
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabela de Propostas */}
      <ProposalTable
        proposals={proposals}
        loading={loading}
        onCancel={handleCancelProposal}
        onDelete={handleDeleteProposal}
        onEdit={handleOpenEditModal}
      />

      {/* Modal para Criação ou Edição de Proposta */}
      <ProposalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProposal(null);
        }}
        onSave={handleSaveProposal}
        products={products}
        proposalToEdit={editingProposal}
      />
    </div>
  );
}
