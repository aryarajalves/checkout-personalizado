import React, { useState } from 'react';
import {
  Search,
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  Link2,
  ExternalLink,
  DollarSign,
  MousePointer,
  ShoppingBag,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AffiliateListTab({
  affiliates = [],
  loading = false,
  searchTerm = '',
  onSearchChange,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenLinkProductModal,
  onRemoveProductLink,
  copiedLink,
  onCopyLink,
}) {
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    try {
      setDeleteLoading(true);
      await onRemoveProductLink(linkToDelete.id);
      setLinkToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFullAffiliateUrl = (relativeLink) => {
    if (!relativeLink) return '';
    return `${window.location.origin}${relativeLink}`;
  };

  return (
    <div className="affiliates-list-container">
      {/* Barra de Ações & Busca */}
      <div className="affiliates-actions-bar">
        <div className="affiliates-search-box">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou código de afiliado..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-primary-affiliate"
          onClick={onOpenCreateModal}
          data-testid="btn-new-affiliate"
        >
          <Plus size={16} />
          Cadastrar Afiliado
        </button>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="empty-state-box">
          <Loader2 className="animate-spin" size={32} color="#38bdf8" />
          <span>Carregando parceiros afiliados...</span>
        </div>
      ) : affiliates.length === 0 ? (
        <div className="empty-state-box">
          <AlertCircle size={36} color="#64748b" />
          <p>Nenhum afiliado encontrado.</p>
        </div>
      ) : (
        <div className="affiliates-list-grid" style={{ marginTop: '1rem' }}>
          {affiliates.map((aff) => {
            const initial = aff.name.charAt(0).toUpperCase();
            return (
              <div key={aff.id} className="affiliate-card" data-testid={`affiliate-card-${aff.id}`}>
                {/* Header do Card */}
                <div className="affiliate-card-header">
                  <div className="affiliate-main-info">
                    <div className="affiliate-avatar">{initial}</div>
                    <div className="affiliate-names">
                      <h3>{aff.name}</h3>
                      <div className="affiliate-meta">
                        <span className="affiliate-code-badge">{aff.affiliate_code}</span>
                        <span>•</span>
                        <span>{aff.email}</span>
                        <span>•</span>
                        <span>{aff.phone}</span>
                        <span>•</span>
                        <span
                          className={`affiliate-badge-status ${
                            aff.is_active ? 'status-active' : 'status-inactive'
                          }`}
                        >
                          {aff.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="affiliate-header-actions">
                    <button
                      type="button"
                      className="btn-icon-subtle"
                      onClick={() => onOpenLinkProductModal(aff)}
                      title="Vincular Produto"
                    >
                      <Link2 size={15} />
                      Vincular Produto
                    </button>

                    <button
                      type="button"
                      className="btn-icon-subtle"
                      onClick={() => onOpenEditModal(aff)}
                      title="Editar Afiliado"
                    >
                      <Edit2 size={15} />
                      Editar
                    </button>
                  </div>
                </div>

                {/* Métricas do Parceiro */}
                <div className="affiliate-metrics-row">
                  <div className="metric-col">
                    <span className="metric-lbl">Comissão Base</span>
                    <span className="metric-val">{aff.default_commission_percent}%</span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-lbl">Vendas Geradas</span>
                    <span className="metric-val">
                      {aff.total_sales_count} (R$ {Number(aff.total_sales_brl || 0).toFixed(2)})
                    </span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-lbl">Comissões a Pagar</span>
                    <span className="metric-val" style={{ color: '#fbbf24' }}>
                      R$ {Number((aff.total_commissions_brl - aff.total_commissions_paid_brl) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="metric-col">
                    <span className="metric-lbl">Comissões Pagas</span>
                    <span className="metric-val" style={{ color: '#4ade80' }}>
                      R$ {Number(aff.total_commissions_paid_brl || 0).toFixed(2)}
                    </span>
                  </div>
                  {aff.pix_key && (
                    <div className="metric-col">
                      <span className="metric-lbl">Chave Pix ({aff.pix_key_type})</span>
                      <span className="metric-val" style={{ fontSize: '0.85rem' }}>
                        {aff.pix_key}
                      </span>
                    </div>
                  )}
                </div>

                {/* Produtos Vinculados & Links de Divulgação */}
                <div className="affiliate-links-section">
                  <div className="links-header">
                    <h4>Links de Divulgação ({aff.product_links?.length || 0})</h4>
                  </div>

                  {!aff.product_links || aff.product_links.length === 0 ? (
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Nenhum produto vinculado especificamente. O parceiro pode divulgar qualquer produto usando ?ref={aff.affiliate_code}
                    </span>
                  ) : (
                    aff.product_links.map((link) => {
                      const fullUrl = getFullAffiliateUrl(link.affiliate_link);
                      const isCopied = copiedLink === fullUrl;

                      return (
                        <div key={link.id} className="link-item-row">
                          <div className="link-product-desc">
                            <ShoppingBag size={14} color="#38bdf8" />
                            <strong>{link.product_name || 'Produto'}</strong>
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              (Comissão: {link.effective_commission_percent}%)
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MousePointer size={12} /> {link.clicks_count} cliques
                            </span>
                          </div>

                          <div className="link-actions-group">
                            <span className="link-url-pill">
                              ?ref={link.ref_code}
                            </span>

                            <button
                              type="button"
                              className="btn-icon-subtle"
                              onClick={() => onCopyLink(fullUrl)}
                              title="Copiar Link de Afiliado"
                            >
                              {isCopied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                              {isCopied ? 'Copiado!' : 'Copiar Link'}
                            </button>

                            <button
                              type="button"
                              className="btn-icon-subtle"
                              style={{ color: '#ef4444' }}
                              onClick={() => setLinkToDelete(link)}
                              title="Remover Vínculo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Remoção de Vínculo de Produto */}
      {linkToDelete && (
        <div className="affiliate-modal-overlay" data-testid="delete-link-confirm-modal">
          <div className="affiliate-modal-card" style={{ maxWidth: '420px' }}>
            <div className="affiliate-modal-header">
              <h3>Remover Vínculo</h3>
            </div>
            <div className="affiliate-modal-body">
              <p style={{ margin: 0, color: '#cbd5e1' }}>
                Tem certeza que deseja desvincular o produto{' '}
                <strong>{linkToDelete.product_name}</strong> deste afiliado?
              </p>
            </div>
            <div className="affiliate-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setLinkToDelete(null)}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDeleteLink}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Removendo...' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
