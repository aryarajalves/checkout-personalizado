import { useState, useEffect } from 'react';

export default function useExitIntent(enabled = false, sessionKey = 'exit_intent_shown') {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {
      // Ignore sessionStorage exceptions in private mode
    }

    // Desktop: detecta cursor saindo pelo topo da janela
    const handleMouseLeave = (e) => {
      if (e.clientY <= 10) {
        try {
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            setIsOpen(true);
          }
        } catch {
          setIsOpen(true);
        }
      }
    };

    // Mobile: intercepta botão de voltar via history state
    try {
      window.history.pushState({ page: 'checkout' }, '', window.location.href);
    } catch {
      // Ignore history state errors in test environments
    }

    const handlePopState = () => {
      try {
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          setIsOpen(true);
        }
      } catch {
        setIsOpen(true);
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, sessionKey]);

  const closeExitIntent = () => setIsOpen(false);

  return {
    isExitIntentOpen: isOpen,
    closeExitIntent,
  };
}
