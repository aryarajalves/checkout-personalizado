import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function OrdersPagination({
  currentPage = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalItems, currentPage * pageSize);

  // Gera lista de páginas para exibição inteligente
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
        color: '#64748b',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
      }}
      data-testid="orders-pagination-bar"
    >
      <div>
        {totalItems > 0 ? (
          <span>
            Mostrando <strong>{startIndex}</strong> a <strong>{endIndex}</strong> de{' '}
            <strong>{totalItems}</strong> pedidos (20 por página)
          </span>
        ) : (
          <span>Nenhum registro para exibir</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: currentPage <= 1 ? '#cbd5e1' : '#334155',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
          data-testid="btn-pagination-prev"
        >
          <ChevronLeft size={14} />
          <span>Anterior</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8' }}>
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  border: p === currentPage ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: p === currentPage ? '#2563eb' : '#ffffff',
                  color: p === currentPage ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: p === currentPage ? 700 : 500,
                }}
                data-testid={`btn-pagination-page-${p}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
          data-testid="btn-pagination-next"
        >
          <span>Próxima</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
