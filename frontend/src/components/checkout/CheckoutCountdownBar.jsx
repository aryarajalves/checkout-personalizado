import React, { useState, useEffect } from 'react';
import { Flame, Clock } from 'lucide-react';

export default function CheckoutCountdownBar({
  enabled = false,
  minutes = 15,
  text = 'Esta oferta especial expira em:',
  productId,
}) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const storageKey = `checkout_timer_${productId || 'global'}`;
    const initialSeconds = Math.max(60, (Number(minutes) || 15) * 60);

    let expireAt = sessionStorage.getItem(storageKey);
    if (!expireAt) {
      expireAt = String(Date.now() + initialSeconds * 1000);
      sessionStorage.setItem(storageKey, expireAt);
    }

    const calculateRemaining = () => {
      const remainingMs = Math.max(0, parseInt(expireAt, 10) - Date.now());
      return Math.floor(remainingMs / 1000);
    };

    setTimeLeft(calculateRemaining());

    const interval = setInterval(() => {
      const sec = calculateRemaining();
      setTimeLeft(sec);
      if (sec <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, minutes, productId]);

  if (!enabled || timeLeft === null) return null;

  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  const formatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  const isExpiring = timeLeft <= 120; // Menos de 2 minutos

  return (
    <div
      className={`checkout-countdown-bar ${isExpiring ? 'is-expiring' : ''}`}
      data-testid="checkout-countdown-bar"
      role="region"
      aria-label="Cronômetro de oferta especial"
    >
      <div className="checkout-countdown-content">
        <div className="checkout-countdown-badge">
          <Flame size={15} className="checkout-countdown-flame" />
          <span>OFERTA LIMITADA</span>
        </div>
        <div className="checkout-countdown-message">
          <span>{text || 'Esta oferta especial expira em:'}</span>
        </div>
        <div className="checkout-countdown-clock" data-testid="countdown-clock-display">
          <Clock size={14} />
          <span>{formatted}</span>
        </div>
      </div>
    </div>
  );
}
