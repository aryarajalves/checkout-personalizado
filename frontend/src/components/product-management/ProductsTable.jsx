import React from 'react';
import { Package, Edit2, Trash2, Share2, Copy, Check, CreditCard, Coins, Tag, Globe } from 'lucide-react';
import ProductActionsDropdown from './ProductActionsDropdown';

export default function ProductsTable({
  products,
  loading,
  copiedSlug,
  onCopyLink,
  onEdit,
  onConfigureSplit,
  onManageOffers,
  onManageWebhooks,
  onManagePixel,
  onManageOrderBumps,
  onManageUpsell,
  onManageAppearance,
  onManageConversion,
  onManageDomain,
  onManageABTest,
  onDelete,
  onNewProduct,
}) {
  if (loading && (!products || products.length === 0)) {
    return (
      <div className="product-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinning-icon" style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e0f2fe', borderTopColor: '#0284c7', borderRadius: '50%' }} />
        <p style={{ marginTop: '14px', color: '#64748b', fontSize: '14px' }}>Carregando catálogo de produtos...</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="product-table-card" style={{ padding: '64px 24px', textAlign: 'center' }} data-testid="empty-products-state">
        <div style={{ width: '60px', height: '60px', margin: '0 auto 16px', borderRadius: '16px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
          <Package size={30} />
        </div>
        <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Nenhum produto cadastrado ainda</h3>
        <p style={{ color: '#64748b', fontSize: '13.5px', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
          Cadastre seu primeiro produto para gerar links públicos de checkout e configurar a divisão automática de pagamentos.
        </p>
        <button
          type="button"
          className="primary-action-btn"
          onClick={onNewProduct}
          data-testid="empty-new-product-btn"
        >
          <Package size={16} />
          <span>Cadastrar Primeiro Produto</span>
        </button>
      </div>
    );
  }

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const getPaymentBadges = (methods) => {
    if (methods === 'crypto_only') {
      return (
        <span className="badge-payment-method badge-method-crypto">
          <Coins size={12} /> Cripto
        </span>
      );
    }
    if (methods === 'pix_card') {
      return (
        <span className="badge-payment-method badge-method-fiat">
          <CreditCard size={12} /> Pix / Cartão
        </span>
      );
    }
    return (
      <span className="badge-payment-method badge-method-all">
        <Check size={12} /> Todos os Métodos
      </span>
    );
  };

  return (
    <div className="product-table-card" data-testid="products-table-container">
      <div style={{ overflowX: 'auto' }}>
        <table className="product-table">
          <thead>
            <tr>
              <th>Produto / Checkout Link</th>
              <th>Preço Principal</th>
              <th>Métodos</th>
              <th>Split Configurado</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((prod) => {
              const totalSplit = (prod.split_rules || []).reduce((acc, r) => acc + (r.percentage || 0), 0);
              const splitCount = (prod.split_rules || []).length;
              const offersCount = (prod.offers || []).length;

              return (
                <tr
                  key={prod.id}
                  data-testid={`product-row-${prod.id}`}
                >
                  <td>
                    <div className="product-name-text">{prod.name}</div>
                    <div className="product-slug-badge">
                      <span>/pay/{prod.slug}</span>
                      <button
                        type="button"
                        onClick={() => onCopyLink(prod.slug)}
                        className={`copy-slug-btn ${copiedSlug === prod.slug ? 'copied' : ''}`}
                        title="Copiar link de checkout principal"
                        data-testid={`copy-link-${prod.id}`}
                      >
                        {copiedSlug === prod.slug ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedSlug === prod.slug ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    {prod.custom_domain && (
                      <div
                        style={{
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bae6fd',
                          width: 'fit-content',
                        }}
                        data-testid={`custom-domain-badge-${prod.id}`}
                      >
                        <Globe size={11} />
                        <span style={{ fontWeight: 600 }}>{prod.custom_domain}</span>
                      </div>
                    )}
                  </td>

                  <td>
                    <div className="product-price-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="price-main">{formatBRL(prod.price_brl)}</span>
                        {offersCount > 1 && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                            title={`${offersCount} ofertas cadastradas`}
                          >
                            {offersCount} ofertas
                          </span>
                        )}
                      </div>
                      {prod.price_usd && (
                        <span className="price-secondary">
                          $ {prod.price_usd.toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    {getPaymentBadges(prod.payment_methods)}
                  </td>

                  <td>
                    {splitCount > 0 ? (
                      <span className="badge-split-configured">
                        <Share2 size={13} />
                        <span>{totalSplit.toFixed(1)}% ({splitCount} {splitCount === 1 ? 'sócio' : 'sócios'})</span>
                      </span>
                    ) : (
                      <span className="badge-split-none">Sem split (100% próprio)</span>
                    )}
                  </td>

                  <td>
                    <span className={`status-pill ${prod.is_active ? 'active' : 'inactive'}`}>
                      {prod.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td>
                    <div className="product-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => onManageOffers && onManageOffers(prod)}
                        className="secondary-action-btn"
                        style={{ padding: '6px 10px', fontSize: '12.5px', gap: '5px' }}
                        title="Gerenciar Múltiplas Ofertas e Preços"
                        data-testid={`btn-offers-${prod.id}`}
                      >
                        <Tag size={13} />
                        <span>Ofertas ({offersCount || 1})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(prod)}
                        className="action-edit-btn"
                        title="Editar Produto"
                        data-testid={`btn-edit-${prod.id}`}
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      {/* Dropdown com Funil (Pixel, Order Bump, UpSell), Domínio, Webhooks e Split */}
                      <ProductActionsDropdown
                        product={prod}
                        onManagePixel={onManagePixel}
                        onManageOrderBumps={onManageOrderBumps}
                        onManageUpsell={onManageUpsell}
                        onManageAppearance={onManageAppearance}
                        onManageConversion={onManageConversion}
                        onManageDomain={onManageDomain}
                        onManageWebhooks={onManageWebhooks}
                        onConfigureSplit={onConfigureSplit}
                        onManageABTest={onManageABTest}
                      />

                      <button
                        type="button"
                        onClick={() => onDelete(prod)}
                        className="action-delete-btn"
                        title="Excluir Produto"
                        data-testid={`btn-delete-${prod.id}`}
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
    </div>
  );
}
