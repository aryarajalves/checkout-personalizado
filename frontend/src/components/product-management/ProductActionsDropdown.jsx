import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Target,
  Sparkles,
  TrendingUp,
  Radio,
  Share2,
  Sliders,
  Palette,
} from 'lucide-react';

export default function ProductActionsDropdown({
  product,
  onManagePixel,
  onManageOrderBumps,
  onManageUpsell,
  onManageAppearance,
  onManageWebhooks,
  onConfigureSplit,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0, openUp: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    const menuEl = menuRef.current;
    const menuHeight = (menuEl && menuEl.offsetHeight > 0) ? menuEl.offsetHeight : 290;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Detecta se deve abrir para cima quando falta espaço embaixo e há mais espaço acima
    const shouldOpenUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(10, rect.top - menuHeight - 6)
      : Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 6);

    const right = Math.max(12, window.innerWidth - rect.right);

    setCoords({
      top,
      right,
      openUp: shouldOpenUp,
    });
  }, []);

  // Controla abertura, fechamento por clique externo e reposicionamento em scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    function handleClickOutside(event) {
      if (
        (buttonRef.current && buttonRef.current.contains(event.target)) ||
        (menuRef.current && menuRef.current.contains(event.target))
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  const handleAction = (callback) => {
    setIsOpen(false);
    if (callback) callback(product);
  };

  const hasPixel = Boolean(product?.meta_pixel_id);
  const hasSplit = Boolean(product?.split_rules && product.split_rules.length > 0);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid={`dropdown-container-${product.id}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="secondary-action-btn"
        style={{
          padding: '6px 12px',
          fontSize: '12.5px',
          gap: '6px',
          backgroundColor: isOpen ? '#f1f5f9' : '#ffffff',
          borderColor: isOpen ? '#94a3b8' : '#cbd5e1',
          color: '#1e293b',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
        title="Configurações de Funil, Pixel, Webhooks e Split"
        data-testid={`btn-funnel-menu-${product.id}`}
      >
        <Sliders size={13} color="#475569" />
        <span>Mais Opções</span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-testid={`dropdown-menu-${product.id}`}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              width: '230px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.12)',
              border: '1px solid #e2e8f0',
              padding: '6px',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
          {/* Item 1: Pixel */}
          <button
            type="button"
            onClick={() => handleAction(onManagePixel)}
            data-testid={`btn-pixel-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={14} color="#6366f1" />
              <span style={{ fontWeight: 500 }}>Meta Pixel</span>
            </div>
            {hasPixel ? (
              <span style={{ fontSize: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Ativo
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Não conf.</span>
            )}
          </button>

          {/* Item 2: Order Bump */}
          <button
            type="button"
            onClick={() => handleAction(onManageOrderBumps)}
            data-testid={`btn-bumps-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Sparkles size={14} color="#16a34a" />
            <span style={{ fontWeight: 500 }}>Order Bumps</span>
          </button>

          {/* Item 3: UpSell */}
          <button
            type="button"
            onClick={() => handleAction(onManageUpsell)}
            data-testid={`btn-upsell-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <TrendingUp size={14} color="#d97706" />
            <span style={{ fontWeight: 500 }}>UpSell Pós-Compra</span>
          </button>

          {/* Item 4: Aparência do Checkout */}
          <button
            type="button"
            onClick={() => handleAction(onManageAppearance)}
            data-testid={`btn-appearance-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={14} color="#8b5cf6" />
              <span style={{ fontWeight: 500 }}>Aparência do Checkout</span>
            </div>
            {product?.primary_color && product.primary_color !== '#0284c7' && (
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: product.primary_color }} />
            )}
          </button>

          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

          {/* Item 4: Webhooks */}
          <button
            type="button"
            onClick={() => handleAction(onManageWebhooks)}
            data-testid={`btn-webhooks-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Radio size={14} color="#0284c7" />
            <span style={{ fontWeight: 500 }}>Webhooks de Saída</span>
          </button>

          {/* Item 5: Split */}
          <button
            type="button"
            onClick={() => handleAction(onConfigureSplit)}
            data-testid={`btn-split-${product.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              background: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={14} color="#7c3aed" />
              <span style={{ fontWeight: 500 }}>Divisão de Split</span>
            </div>
            {hasSplit && (
              <span style={{ fontSize: '10px', backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                Configurado
              </span>
            )}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
