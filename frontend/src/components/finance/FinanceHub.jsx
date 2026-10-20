import React, { useState, useEffect } from 'react';
import { Repeat, CreditCard } from 'lucide-react';
import SubscriptionManagement from '../SubscriptionManagement';
import GatewayManagement from '../GatewayManagement';

export default function FinanceHub({ currentUser, initialTab = 'subscriptions' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab || 'subscriptions');

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="hub-container" data-testid="finance-hub-container">
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
          className={`sales-tab-btn ${activeSubTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('subscriptions')}
          data-testid="tab-finance-subscriptions"
        >
          <Repeat size={16} />
          Assinaturas & MRR
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'gateways' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('gateways')}
          data-testid="tab-finance-gateways"
        >
          <CreditCard size={16} />
          Gateways & Split de Sócios
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeSubTab === 'subscriptions' && <SubscriptionManagement currentUser={currentUser} />}
        {activeSubTab === 'gateways' && <GatewayManagement currentUser={currentUser} />}
      </div>
    </div>
  );
}
