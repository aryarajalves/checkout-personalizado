import React from 'react';
import { Star } from 'lucide-react';

export default function LiveTestimonialsList({ testimonials }) {
  if (!testimonials) return null;
  let items = [];
  try {
    items = typeof testimonials === 'string' ? JSON.parse(testimonials) : testimonials;
  } catch {
    items = [];
  }
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div style={{ marginTop: '16px' }} data-testid="live-preview-testimonials-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '12px', color: '#334155', fontWeight: 700 }}>
          Depoimentos de Quem Já Comprou ({items.length})
        </h5>
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
          ✓ Avaliações Reais
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.slice(0, 5).map((item, idx) => (
          <div
            key={item.id || idx}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
            data-testid={`live-testimonial-item-${idx}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.name}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: item.avatar_url ? 'none' : 'flex',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {item.name ? item.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                    {item.name}
                  </span>
                  {item.role && (
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {item.role}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1px' }}>
                {[...Array(item.rating || 5)].map((_, i) => (
                  <Star key={i} size={11} fill="#eab308" color="#eab308" />
                ))}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
              "{item.text}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
