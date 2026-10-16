import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus, Edit2, Trash2, Check, DollarSign } from 'lucide-react';
import {
  fetchProductOrderBumpsApi,
  createProductOrderBumpApi,
  updateProductOrderBumpApi,
  deleteProductOrderBumpApi,
} from './productApi';

export function ProductOrderBumpsModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [bumps, setBumps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBumpId, setEditingBumpId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_brl: '',
    is_active: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, bump: null });

  useEffect(() => {
    if (!isOpen || !product) return;
    loadBumps();
  }, [isOpen, product]);

  const loadBumps = async () => {
    try {
      setLoading(true);
      const data = await fetchProductOrderBumpsApi(product.id);
      setBumps(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar order bumps.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleStartAdd = () => {
    setIsEditing(true);
    setEditingBumpId(null);
    setFormData({
      title: '',
      description: '',
      price_brl: '',
      is_active: true,
    });
  };

  const handleStartEdit = (bump) => {
    setIsEditing(true);
    setEditingBumpId(bump.id);
    setFormData({
      title: bump.title,
      description: bump.description || '',
      price_brl: String(bump.price_brl),
      is_active: bump.is_active,
    });
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingBumpId(null);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showFeedback('error', 'O título da oferta de order bump é obrigatório.');
      return;
    }
    const price = parseFloat(formData.price_brl);
    if (isNaN(price) || price < 0) {
      showFeedback('error', 'Informe um preço válido para o order bump.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price_brl: price,
        is_active: formData.is_active,
      };

      if (editingBumpId) {
        await updateProductOrderBumpApi(product.id, editingBumpId, payload);
        showFeedback('success', 'Order bump atualizado com sucesso!');
      } else {
        await createProductOrderBumpApi(product.id, payload);
        showFeedback('success', 'Novo order bump adicionado com sucesso!');
      }

      handleCancelForm();
      loadBumps();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar order bump.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.bump) return;
    try {
      setActionLoading(true);
      await deleteProductOrderBumpApi(product.id, deleteConfirm.bump.id);
      showFeedback('success', 'Order bump removido com sucesso!');
      setDeleteConfirm({ isOpen: false, bump: null });
      loadBumps();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao remover order bump.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-order-bumps-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-order-bumps-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Order Bumps no Checkout</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            data-testid="close-order-bumps-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Ofertas complementares de 1-clique exibidas diretamente no checkout.
            </span>
            {!isEditing && (
              <button
                type="button"
                className="webhooks-btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#047857', padding: '6px 12px', fontSize: '12.5px' }}
                onClick={handleStartAdd}
                data-testid="btn-add-order-bump"
              >
                <Plus size={14} />
                <span>Novo Bump</span>
              </button>
            )}
          </div>

          {/* Formulário de Criação/Edição */}
          {isEditing && (
            <form onSubmit={handleSaveForm} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                {editingBumpId ? 'Editar Order Bump' : 'Adicionar Novo Order Bump'}
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Título da Chamada (Ex: Leve também o Guia Prático em PDF) *
                </label>
                <input
                  type="text"
                  className="form-control-modern"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Leve também o Checklist Exclusivo"
                  data-testid="input-bump-title"
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Preço Adicional em R$ (BRL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control-modern"
                    value={formData.price_brl}
                    onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
                    placeholder="27.00"
                    data-testid="input-bump-price"
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                      data-testid="toggle-bump-active"
                      style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                    />
                    <span>Ativo no Checkout</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Descrição Curta e Persuasiva
                </label>
                <textarea
                  className="form-control-modern"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Explique o benefício imediato em poucas palavras..."
                  data-testid="input-bump-description"
                  style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="webhooks-btn-secondary"
                  onClick={handleCancelForm}
                  disabled={actionLoading}
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="webhooks-btn-primary"
                  style={{ backgroundColor: '#059669', borderColor: '#047857', padding: '5px 14px', fontSize: '12px' }}
                  disabled={actionLoading}
                  data-testid="btn-save-order-bump"
                >
                  <Check size={13} />
                  <span>{actionLoading ? 'Salvando...' : 'Salvar Bump'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Listagem de Bumps */}
          {loading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #ecfdf5', borderTopColor: '#059669', borderRadius: '50%' }} />
              <p style={{ marginTop: '8px', fontSize: '12.5px' }}>Carregando bumps...</p>
            </div>
          ) : bumps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Sparkles size={24} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Nenhum Order Bump configurado</p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Adicione produtos complementares para aumentar o ticket médio das suas vendas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bumps.map((b) => (
                <div
                  key={b.id}
                  data-testid={`bump-card-${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: `1px solid ${b.is_active ? '#a7f3d0' : '#e2e8f0'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{b.title}</span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: b.is_active ? '#ecfdf5' : '#f1f5f9', color: b.is_active ? '#059669' : '#64748b' }}>
                        {b.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {b.description && (
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>{b.description}</p>
                    )}
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                      + R$ {Number(b.price_brl).toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="webhooks-btn-secondary"
                      onClick={() => handleStartEdit(b)}
                      style={{ padding: '5px 8px', fontSize: '12px' }}
                      title="Editar bump"
                      data-testid={`btn-edit-bump-${b.id}`}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="webhooks-btn-danger"
                      onClick={() => setDeleteConfirm({ isOpen: true, bump: b })}
                      style={{ padding: '5px 8px', fontSize: '12px', color: '#dc2626' }}
                      title="Excluir bump"
                      data-testid={`btn-delete-bump-${b.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="webhooks-btn-secondary"
              onClick={onClose}
              data-testid="footer-close-order-bumps-btn"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Modal de confirmação de exclusão */}
        {deleteConfirm.isOpen && deleteConfirm.bump && (
          <div
            className="webhooks-confirm-overlay"
            data-testid="delete-bump-confirm-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="webhooks-confirm-dialog"
              role="dialog"
              aria-modal="true"
              data-testid="delete-bump-confirm-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="webhooks-confirm-icon-box delete">
                <Trash2 size={24} />
              </div>
              <h3 className="webhooks-confirm-title">Excluir Order Bump?</h3>
              <p className="webhooks-confirm-message">
                Deseja realmente remover o bump <strong>"{deleteConfirm.bump.title}"</strong>?
              </p>
              <div className="webhooks-confirm-actions">
                <button
                  type="button"
                  className="webhooks-btn-secondary"
                  onClick={() => setDeleteConfirm({ isOpen: false, bump: null })}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="webhooks-confirm-primary-btn"
                  style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                  onClick={handleExecuteDelete}
                  disabled={actionLoading}
                  data-testid="confirm-delete-bump-btn"
                >
                  <span>{actionLoading ? 'Excluindo...' : 'Sim, Excluir'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
