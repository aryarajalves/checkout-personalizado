import React from 'react';
import { Info, AlertTriangle, AlertCircle, Globe, ListFilter } from 'lucide-react';

export default function LogTypeFilter({ currentFilter, onSelectFilter, counts }) {
  const filterOptions = [
    { id: 'all', label: 'Todos', icon: ListFilter, count: counts.all, color: '#475569', activeBg: '#f1f5f9', activeBorder: '#94a3b8', activeColor: '#0f172a' },
    { id: 'info', label: 'Info', icon: Info, count: counts.info, color: '#0284c7', activeBg: '#e0f2fe', activeBorder: '#38bdf8', activeColor: '#0369a1' },
    { id: 'warning', label: 'Avisos', icon: AlertTriangle, count: counts.warning, color: '#d97706', activeBg: '#fef3c7', activeBorder: '#f59e0b', activeColor: '#b45309' },
    { id: 'error', label: 'Erros', icon: AlertCircle, count: counts.error, color: '#dc2626', activeBg: '#fee2e2', activeBorder: '#ef4444', activeColor: '#b91c1c' },
    { id: 'http', label: 'HTTP', icon: Globe, count: counts.http, color: '#16a34a', activeBg: '#dcfce7', activeBorder: '#22c55e', activeColor: '#15803d' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px 18px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        marginBottom: '14px',
      }}
      data-testid="log-type-filter-bar"
    >
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', marginRight: '6px' }}>
        Separar por tipo:
      </span>
      {filterOptions.map((opt) => {
        const IconComponent = opt.icon;
        const isActive = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectFilter(opt.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: isActive ? `1.5px solid ${opt.activeBorder}` : '1px solid #e2e8f0',
              backgroundColor: isActive ? opt.activeBg : '#f8fafc',
              color: isActive ? opt.activeColor : '#64748b',
              boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
            }}
            data-testid={`filter-btn-${opt.id}`}
          >
            <IconComponent size={14} color={isActive ? opt.color : '#64748b'} />
            <span>{opt.label}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: isActive ? opt.color : '#e2e8f0',
                color: isActive ? '#ffffff' : '#475569',
                fontWeight: 700,
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
