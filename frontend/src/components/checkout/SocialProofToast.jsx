import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, X, CheckCircle } from 'lucide-react';
import { fetchPublicSocialProofApi } from '../product-management/productApi';

export default function SocialProofToast({ slug, enabled = false, initialDelayMs = 4000 }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !slug) return;

    let isMounted = true;
    async function loadSocialProof() {
      try {
        const data = await fetchPublicSocialProofApi(slug);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch {
        // Falhas silenciosas para não atrapalhar a compra do cliente
      }
    }

    loadSocialProof();

    return () => {
      isMounted = false;
    };
  }, [enabled, slug]);

  useEffect(() => {
    if (!enabled || items.length === 0 || dismissed) return;

    const initialTimeout = setTimeout(() => {
      setVisible(true);
    }, initialDelayMs);

    return () => clearTimeout(initialTimeout);
  }, [enabled, items.length, dismissed, initialDelayMs]);

  useEffect(() => {
    if (!visible || items.length === 0) return;

    // Cada notificação fica visível por 6 segundos
    const hideTimeout = setTimeout(() => {
      setVisible(false);
      // Próxima notificação aparece 14 segundos depois
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setVisible(true);
      }, 14000);
    }, 6000);

    return () => {
      clearTimeout(hideTimeout);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, items.length]);

  if (!enabled || items.length === 0 || !visible || dismissed) {
    return null;
  }

  const currentItem = items[currentIndex] || items[0];

  return (
    <aside
      className="social-proof-toast"
      data-testid="social-proof-toast"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
        maxWidth: '340px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(8px)',
        borderRadius: '14px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'slideUpToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* Ícone de Sucesso */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#ecfdf5',
          border: '1.5px solid #a7f3d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#059669',
          flexShrink: 0,
        }}
      >
        <ShoppingBag size={18} />
      </div>

      {/* Conteúdo textual da compra */}
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            data-testid="social-proof-customer-name"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentItem.customer_name}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            de {currentItem.city} - {currentItem.state}
          </span>
        </div>

        <div
          style={{
            fontSize: '11.5px',
            color: '#475569',
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <CheckCircle size={12} color="#16a34a" />
          <span>
            Comprou via <strong>{currentItem.payment_method}</strong> •{' '}
            <span
              data-testid="social-proof-time-ago"
              style={{ color: '#059669', fontWeight: 600 }}
            >
              {currentItem.time_ago}
            </span>
          </span>
        </div>
      </div>

      {/* Botão de Fechar */}
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setDismissed(true);
        }}
        data-testid="close-social-proof-toast"
        aria-label="Dispensar notificação"
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        <X size={14} />
      </button>
    </aside>
  );
}
