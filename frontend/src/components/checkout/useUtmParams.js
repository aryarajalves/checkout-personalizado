import { useState, useEffect } from 'react';

const STORAGE_KEY = 'checkout_utm_params';

export function getStoredUtmParams() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useUtmParams() {
  const [utmParams, setUtmParams] = useState(() => getStoredUtmParams());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
      const extracted = {};
      let foundAny = false;

      keys.forEach((key) => {
        const val = searchParams.get(key);
        if (val) {
          extracted[key] = val.trim();
          foundAny = true;
        }
      });

      if (foundAny) {
        const merged = { ...getStoredUtmParams(), ...extracted };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setUtmParams(merged);
      }
    } catch (e) {
      console.warn('Erro ao processar parâmetros UTM:', e);
    }
  }, []);

  return utmParams;
}
