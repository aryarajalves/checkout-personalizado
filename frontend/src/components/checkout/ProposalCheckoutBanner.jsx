import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';

export default function ProposalCheckoutBanner({ proposal }) {
  const [timeLeft, setTimeLeft] = useState('');

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  useEffect(() => {
    if (!proposal || !proposal.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(proposal.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirada');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [proposal]);

  if (!proposal) return null;

  if (proposal.is_expired || proposal.status !== 'active') {
    return (
      <div className="proposal-banner-expired">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <h4 style={{ margin: 0 }}>Proposta Personalizada Expirada</h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          O prazo de validade desta condição especial negociada encerrou-se. Por favor, entre em contato com o seu consultor para reativar a oferta.
        </p>
      </div>
    );
  }

  return (
    <div className="proposal-checkout-banner">
      <div className="proposal-banner-icon">
        <Sparkles size={26} />
      </div>
      <div className="proposal-banner-content" style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4>Condição Exclusiva Reservada para {proposal.customer_name}</h4>
          <span style={{
            background: '#0284c7',
            color: '#ffffff',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            Proposta Especial
          </span>
        </div>

        <p>
          <strong>{proposal.title}</strong> — Valor fechado:{' '}
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
            {formatBRL(proposal.amount_brl)}
          </span>
          {proposal.payment_method_allowed === 'hybrid_pix_card' && (
            <span> (Entrada de {formatBRL(proposal.custom_pix_amount_brl)} no Pix + Saldo no Cartão)</span>
          )}
        </p>

        {timeLeft && timeLeft !== 'Expirada' && (
          <div className="proposal-banner-timer">
            <Clock size={14} />
            <span>Condição especial garantida por: {timeLeft}</span>
          </div>
        )}
      </div>
    </div>
  );
}
