import React from 'react';
import { Star, MessageSquareQuote, User, ShieldCheck } from 'lucide-react';

export default function CheckoutTestimonials({ testimonials }) {
  if (!testimonials) return null;

  let items = [];
  if (Array.isArray(testimonials)) {
    items = testimonials;
  } else if (typeof testimonials === 'string') {
    try {
      items = JSON.parse(testimonials);
    } catch {
      items = [];
    }
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="checkout-testimonials-section" data-testid="checkout-testimonials-section">
      <div className="checkout-testimonials-header">
        <div className="checkout-testimonials-title">
          <MessageSquareQuote size={18} color="#7c3aed" />
          <span>O que dizem os nossos clientes</span>
        </div>
        <div className="checkout-testimonials-subtitle">
          <ShieldCheck size={13} color="#16a34a" />
          <span>Avaliações e Provas Reais</span>
        </div>
      </div>

      <div className="checkout-testimonials-grid">
        {items.map((t, idx) => (
          <div
            key={t.id || idx}
            className="checkout-testimonial-card"
            data-testid={`checkout-testimonial-card-${t.id || idx}`}
          >
            <div className="checkout-testimonial-stars">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  color={i < (t.rating || 5) ? '#f59e0b' : '#e2e8f0'}
                  fill={i < (t.rating || 5) ? '#f59e0b' : 'none'}
                />
              ))}
            </div>

            <p className="checkout-testimonial-text">
              "{t.text}"
            </p>

            <div className="checkout-testimonial-author">
              {t.avatar_url ? (
                <img
                  src={t.avatar_url}
                  alt={t.name}
                  className="checkout-testimonial-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="checkout-testimonial-avatar-placeholder"
                style={{ display: t.avatar_url ? 'none' : 'flex' }}
              >
                {t.name ? t.name.charAt(0).toUpperCase() : <User size={14} />}
              </div>
              <div className="checkout-testimonial-info">
                <span className="checkout-testimonial-name">{t.name}</span>
                {t.role && (
                  <span className="checkout-testimonial-role">• {t.role}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
