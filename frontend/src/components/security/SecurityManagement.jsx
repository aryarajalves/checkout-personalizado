import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  Sliders,
  Activity,
  UserX,
} from 'lucide-react';
import {
  fetchBlacklistEntriesApi,
  updateBlacklistEntryApi,
  deleteBlacklistEntryApi,
  fetchSecuritySettingsApi,
} from './securityApi';
import AddBlacklistModal from './AddBlacklistModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import SecuritySettingsSection from './SecuritySettingsSection';
import CardAttemptsLogTab from './CardAttemptsLogTab';

export default function SecurityManagement({ currentUser }) {
  const [activeTab, setActiveTab] = useState('blacklist'); // 'blacklist', 'attempts', 'settings'
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Deleção
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toasts
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, [search, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesData, settingsData] = await Promise.all([
        fetchBlacklistEntriesApi({ search, entry_type: filterType }),
        fetchSecuritySettingsApi().catch(() => null),
      ]);
      setEntries(entriesData);
      if (settingsData) setSettings(settingsData);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar dados de segurança.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (entry) => {
    try {
      const updated = await updateBlacklistEntryApi(entry.id, { is_active: !entry.is_active });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? updated : e)));
      showFeedback('success', `Entrada ${updated.is_active ? 'ativada' : 'desativada'} com sucesso.`);
    } catch (err) {
      showFeedback('error', err.message || 'Falha ao alterar status da entrada.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      setDeleting(true);
      await deleteBlacklistEntryApi(entryToDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== entryToDelete.id));
      showFeedback('success', 'Entrada removida da Blacklist com sucesso.');
      setEntryToDelete(null);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao excluir entrada.');
    } finally {
      setDeleting(false);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'cpf':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>CPF</span>;
      case 'email':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#15803d' }}>E-MAIL</span>;
      case 'phone':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fefce8', color: '#a16207' }}>TELEFONE</span>;
      case 'ip':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fdf2f8', color: '#be185d' }}>ENDEREÇO IP</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}>{type?.toUpperCase()}</span>;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      return new Date(isoStr).toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }} data-testid="security-management-container">
      {/* Toast Feedback */}
      {feedback && (
        <div
          data-testid="security-toast-feedback"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10001,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Header com Resumo de Métricas de Proteção */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Bloqueios na Blacklist</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{entries.length}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Regra do Velocity Check</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              {settings?.velocity_threshold || 5} falhas / {settings?.velocity_window_minutes || 10} min
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Auto-Blacklist Chargeback</span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
              {settings?.auto_blacklist_on_chargeback ? 'Ativo (Automático)' : 'Inativo'}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação de Abas do Módulo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('blacklist')}
          data-testid="tab-security-blacklist"
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'blacklist' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'blacklist' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'blacklist' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <UserX size={16} /> Lista Negra (Blacklist)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attempts')}
          data-testid="tab-security-attempts"
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'attempts' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'attempts' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'attempts' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Activity size={16} /> Auditoria do Cartão (Logs)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          data-testid="tab-security-settings"
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid #0284c7' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'settings' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'settings' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sliders size={16} /> Parâmetros do Escudo
        </button>
      </div>

      {/* Conteúdo da Aba 1: Blacklist */}
      {activeTab === 'blacklist' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          {/* Barra de Filtros e Ações */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <input
                  type="text"
                  placeholder="Buscar CPF, e-mail, IP ou motivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control-modern"
                  data-testid="input-search-blacklist"
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '13px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <select
                className="form-control-modern"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                data-testid="select-filter-blacklist-type"
                style={{ width: '150px', height: '38px', fontSize: '13px' }}
              >
                <option value="">Todos os Tipos</option>
                <option value="cpf">Apenas CPF</option>
                <option value="email">Apenas E-mail</option>
                <option value="phone">Apenas Telefone</option>
                <option value="ip">Apenas Endereço IP</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              data-testid="open-add-blacklist-modal-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} /> Adicionar Bloqueio
            </button>
          </div>

          {/* Tabela de Bloqueios */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando Blacklist...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              Nenhum registro encontrado na Blacklist.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '12px' }}>
                    <th style={{ padding: '10px 12px' }}>Tipo</th>
                    <th style={{ padding: '10px 12px' }}>Valor Bloqueado</th>
                    <th style={{ padding: '10px 12px' }}>Motivo</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Data</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f8fafc' }} data-testid={`blacklist-row-${entry.id}`}>
                      <td style={{ padding: '10px 12px' }}>{getTypeBadge(entry.entry_type)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{entry.value}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{entry.reason || '-'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(entry)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: entry.is_active ? '#15803d' : '#94a3b8',
                          }}
                        >
                          {entry.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {entry.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{formatDate(entry.created_at)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setEntryToDelete(entry)}
                          data-testid={`delete-blacklist-btn-${entry.id}`}
                          title="Remover da Blacklist"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '6px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Tentativas de Cartão */}
      {activeTab === 'attempts' && <CardAttemptsLogTab showFeedback={showFeedback} />}

      {/* Conteúdo da Aba 3: Configurações */}
      {activeTab === 'settings' && <SecuritySettingsSection showFeedback={showFeedback} />}

      {/* Modais */}
      <AddBlacklistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
        showFeedback={showFeedback}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(entryToDelete)}
        title="Remover da Blacklist"
        message={`Deseja realmente remover o bloqueio para "${entryToDelete?.value}"? O usuário voltará a ter permissão para comprar.`}
        loading={deleting}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
