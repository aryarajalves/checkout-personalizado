import React, { useState, useEffect } from 'react';
import { Package, Tag, Share2 } from 'lucide-react';
import ProductManagement from '../ProductManagement';
import CouponManagement from '../CouponManagement';
import AffiliateManagement from '../AffiliateManagement';

export default function ProductsHub({ currentUser, initialTab = 'catalog' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab || 'catalog');

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="hub-container" data-testid="products-hub-container">
      {/* Top Navigation Tabs */}
      <div
        className="sales-tabs-bar"
        style={{
          padding: '0 24px',
          paddingTop: '16px',
          marginBottom: '0',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('catalog')}
          data-testid="tab-products-catalog"
        >
          <Package size={16} />
          Catálogo de Produtos
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('coupons')}
          data-testid="tab-products-coupons"
        >
          <Tag size={16} />
          Cupons de Desconto
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'affiliates' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('affiliates')}
          data-testid="tab-products-affiliates"
        >
          <Share2 size={16} />
          Gestão de Afiliados
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeSubTab === 'catalog' && <ProductManagement currentUser={currentUser} />}
        {activeSubTab === 'coupons' && <CouponManagement currentUser={currentUser} />}
        {activeSubTab === 'affiliates' && <AffiliateManagement currentUser={currentUser} />}
      </div>
    </div>
  );
}
