import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Copy, Check, Edit2, Trash2, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import {
  fetchCouponsApi,
  createCouponApi,
  updateCouponApi,
  deleteCouponApi,
  fetchProductsForCouponsApi,
} from './coupon-management/couponApi';
import { useToast } from '../context/ToastContext';
import CouponFormModal from './coupon-management/CouponFormModal';
import '../styles/coupons.css';

export default function CouponManagement({ currentUser }) {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [couponsData, productsData] = await Promise.all([
        fetchCouponsApi(),
        fetchProductsForCouponsApi(),
      ]);
      setCoupons(couponsData || []);
      setProducts(productsData || []);
    } catch (err) {
      addToast('Erro ao carregar cupons de desconto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      addToast(`Código '${code}' copiado!`, 'success');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
      addToast(`Código: ${code}`, 'info');
    }
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setModalOpen(true);
  };

  const handleSaveCoupon = async (payload) => {
    setModalLoading(true);
    try {
      if (editingCoupon) {
        await updateCouponApi(editingCoupon.id, payload);
        addToast('Cupom atualizado com sucesso!', 'success');
      } else {
        await createCouponApi(payload);
        addToast('Cupom criado com sucesso!', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Erro ao salvar cupom de desconto.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDelete = (coupon) => {
    setCouponToDelete(coupon);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteCouponApi(couponToDelete.id);
      addToast(`Cupom '${couponToDelete.code}' excluído!`, 'success');
      setDeleteModalOpen(false);
      setCouponToDelete(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Erro ao excluir cupom.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.product_name && c.product_name.toLowerCase().includes(q))
    );
  });

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((acc, c) => acc + (c.current_uses || 0), 0);

  return (
    <div className="coupons-container" data-testid="coupon-management">
      {/* Header */}
      <div className="coupons-header">
        <div className="coupons-header-titles">
          <h2>Cupons de Desconto</h2>
          <p>Crie códigos promocionais percentuais com controle de validade e limite de usos.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="coupon-btn-primary"
          data-testid="btn-new-coupon"
        >
          <Plus size={16} />
          <span>Novo Cupom</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="coupons-stats-grid">
        <div className="coupon-stat-card">
          <div className="coupon-stat-icon">
            <Tag size={20} />
          </div>
          <div className="coupon-stat-info">
            <h4>Total de Cupons</h4>
            <span className="stat-number">{totalCoupons}</span>
          </div>
        </div>

        <div className="coupon-stat-card">
          <div className="coupon-stat-icon emerald">
            <Check size={20} />
          </div>
          <div className="coupon-stat-info">
            <h4>Cupons Ativos</h4>
            <span className="stat-number">{activeCoupons}</span>
          </div>
        </div>

        <div className="coupon-stat-card">
          <div className="coupon-stat-icon amber">
            <TrendingUp size={20} />
          </div>
          <div className="coupon-stat-info">
            <h4>Utilizações Totais</h4>
            <span className="stat-number">{totalUses}</span>
          </div>
        </div>
      </div>

      {/* Tabela de Cupons */}
      <div className="coupons-card">
        <div className="coupons-toolbar">
          <div className="coupons-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por código ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-coupon"
            />
          </div>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Exibindo {filteredCoupons.length} de {totalCoupons} cupons
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#0284c7' }} />
            <p>Carregando cupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="empty-state-coupons" data-testid="empty-coupons-msg">
            <Tag size={36} color="#94a3b8" />
            <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Nenhum cupom encontrado</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {searchTerm ? 'Tente buscar com outro termo.' : 'Clique em "Novo Cupom" para criar o primeiro.'}
            </p>
          </div>
        ) : (
          <div className="coupons-table-responsive">
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Desconto</th>
                  <th>Produto</th>
                  <th>Validade</th>
                  <th>Utilizações</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((c) => {
                  const isExpired = !c.never_expires && c.expires_at && new Date(c.expires_at) < new Date();
                  const isMaxReached = c.max_uses !== null && c.current_uses >= c.max_uses;

                  return (
                    <tr key={c.id} data-testid={`coupon-row-${c.id}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="coupon-code-pill">{c.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(c.code)}
                            title="Copiar código"
                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                          >
                            {copiedCode === c.code ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="coupon-discount-badge">{c.discount_percent}% OFF</span>
                      </td>
                      <td style={{ color: '#0f172a', fontWeight: 500 }}>
                        {c.product_name ? c.product_name : '🌐 Global (Todos)'}
                      </td>
                      <td>
                        {c.never_expires ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Vitalício</span>
                        ) : (
                          <span style={{ color: '#0f172a' }}>
                            {new Date(c.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {isExpired && (
                              <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4, fontWeight: 700 }}>
                                Expirado
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{c.current_uses}</span>
                        {c.max_uses ? (
                          <span style={{ color: isMaxReached ? '#ef4444' : '#64748b' }}> / {c.max_uses}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}> (Sem limite)</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: c.is_active ? '#dcfce7' : '#fee2e2',
                            color: c.is_active ? '#15803d' : '#b91c1c',
                            border: `1px solid ${c.is_active ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          {c.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Editar cupom"
                            data-testid={`btn-edit-coupon-${c.id}`}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#0284c7',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(c)}
                            title="Excluir cupom"
                            data-testid={`btn-delete-coupon-${c.id}`}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#ef4444',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Formulário (Criar / Editar) */}
      <CouponFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCoupon}
        coupon={editingCoupon}
        products={products}
        loading={modalLoading}
      />

      {/* Modal de Confirmação de Exclusão (Padrão UX) */}
      {deleteModalOpen && couponToDelete && (
        <div className="coupon-modal-backdrop" data-testid="delete-coupon-modal-backdrop">
          <div className="coupon-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3>Confirmar Exclusão</h3>
            </div>
            <p style={{ color: '#334155', fontSize: 14, margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir permanentemente o cupom{' '}
              <strong style={{ color: '#0f172a' }}>{couponToDelete.code}</strong> ({couponToDelete.discount_percent}% OFF)?
            </p>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px 0' }}>
              Esta ação não pode ser desfeita e compradores não poderão mais resgatar este código.
            </p>
            <div className="coupon-modal-actions">
              <button
                type="button"
                className="coupon-btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                data-testid="btn-cancel-delete"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="coupon-btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                data-testid="btn-confirm-delete"
              >
                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>Excluir Cupom</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
