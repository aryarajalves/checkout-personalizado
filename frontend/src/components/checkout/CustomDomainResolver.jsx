import React, { useState, useEffect } from 'react';
import { fetchPublicProductByDomainApi } from './checkoutApi';
import CheckoutPage from './CheckoutPage';
import { Loader2 } from 'lucide-react';

/**
 * Resolve se o hostname atual é um domínio Whitelabel CNAME registrado para algum produto.
 * Se for, renderiza a CheckoutPage correspondente.
 * Se não for, renderiza o fallback (ex: tela de Login ou Dashboard).
 */
export default function CustomDomainResolver({ domain, fallback }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'found' | 'not_found'

  useEffect(() => {
    let isMounted = true;
    async function checkDomain() {
      try {
        await fetchPublicProductByDomainApi(domain);
        if (isMounted) setStatus('found');
      } catch {
        if (isMounted) setStatus('not_found');
      }
    }
    checkDomain();
    return () => {
      isMounted = false;
    };
  }, [domain]);

  if (status === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0c',
          color: '#9ca3af',
        }}
      >
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (status === 'found') {
    return <CheckoutPage domain={domain} />;
  }

  return fallback;
}
