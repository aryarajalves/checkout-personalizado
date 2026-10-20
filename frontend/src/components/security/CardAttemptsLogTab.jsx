import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { fetchCardAttemptsApi } from './securityApi';

export default function CardAttemptsLogTab({ showFeedback }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchCardAttemptsApi(50);
      setLogs(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar histórico de tentativas.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#15803d' }}>
            <CheckCircle size={13} /> Aprovado
          </span>
        );
      case 'blocked':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ffedd5', color: '#c2410c' }}>
            <AlertTriangle size={13} /> Bloqueado (Escudo)
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            <XCircle size={13} /> Recusado
          </span>
        );
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Tentativas de Pagamento com Cartão (Auditoria)</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Monitoramento em tempo real utilizado pelo algoritmo de Velocity Check</p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          data-testid="refresh-card-attempts-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spinning-icon' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p>Carregando logs de tentativas...</p>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>Nenhuma tentativa de cartão registrada até o momento.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '12px' }}>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>IP do Cliente</th>
                <th style={{ padding: '10px 12px' }}>CPF / E-mail</th>
                <th style={{ padding: '10px 12px' }}>Pedido</th>
                <th style={{ padding: '10px 12px' }}>Motivo / Resposta</th>
                <th style={{ padding: '10px 12px' }}>Data / Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }} data-testid={`card-attempt-row-${log.id}`}>
                  <td style={{ padding: '10px 12px' }}>{getStatusBadge(log.status)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#0f172a' }}>{log.ip_address || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#334155' }}>
                    <div>{log.email || '-'}</div>
                    {log.cpf && <div style={{ fontSize: '11px', color: '#64748b' }}>CPF: {log.cpf}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#0284c7' }}>{log.order_code || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{log.reason || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px' }}>{formatDate(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
