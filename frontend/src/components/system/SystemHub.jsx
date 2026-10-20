import React, { useState, useEffect } from 'react';
import { Users, Terminal, Database, ShieldAlert } from 'lucide-react';
import UserManagement from '../UserManagement';
import LogManagement from '../LogManagement';
import AutomatedBackup from '../AutomatedBackup';
import SecurityManagement from '../security/SecurityManagement';

export default function SystemHub({ currentUser, initialTab = 'users' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab || 'users');

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="hub-container" data-testid="system-hub-container">
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
          className={`sales-tab-btn ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('users')}
          data-testid="tab-system-users"
        >
          <Users size={16} />
          Gestão de Usuários
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('logs')}
          data-testid="tab-system-logs"
        >
          <Terminal size={16} />
          Gerenciamento de Logs
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('backup')}
          data-testid="tab-system-backup"
        >
          <Database size={16} />
          Backup Automático
        </button>

        <button
          type="button"
          className={`sales-tab-btn ${activeSubTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('security')}
          data-testid="tab-system-security"
        >
          <ShieldAlert size={16} />
          Escudo de Segurança & Blacklist
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeSubTab === 'users' && <UserManagement currentUser={currentUser} />}
        {activeSubTab === 'logs' && <LogManagement currentUser={currentUser} />}
        {activeSubTab === 'backup' && <AutomatedBackup currentUser={currentUser} />}
        {activeSubTab === 'security' && <SecurityManagement currentUser={currentUser} />}
      </div>
    </div>
  );
}
