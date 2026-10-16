import React, { useState } from 'react';
import { Plus, Trash2, Star, User, MessageSquareQuote } from 'lucide-react';

export default function TestimonialsEditor({ testimonials = [], onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    const newTestimonial = {
      id: Date.now(),
      name: name.trim(),
      role: role.trim() || 'Cliente Verificado',
      rating: Number(rating) || 5,
      text: text.trim(),
      avatar_url: avatarUrl.trim() || null,
    };

    const updated = [...testimonials, newTestimonial];
    onChange(updated);

    // Limpa campos
    setName('');
    setRole('');
    setRating(5);
    setText('');
    setAvatarUrl('');
    setIsAdding(false);
  };

  const handleDelete = (id) => {
    const updated = testimonials.filter((t) => t.id !== id);
    onChange(updated);
  };

  return (
    <div className="testimonials-editor-container" data-testid="testimonials-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquareQuote size={16} color="#7c3aed" />
            <span>Depoimentos e Prova Social ({testimonials.length})</span>
          </label>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            Exibidos na tela de checkout para aumentar a confiança e a conversão do comprador.
          </span>
        </div>
        {!isAdding && (
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => setIsAdding(true)}
            data-testid="btn-add-testimonial"
            style={{ fontSize: '12px', padding: '6px 12px', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Novo Depoimento</span>
          </button>
        )}
      </div>

      {/* Formulário para Adicionar Depoimento */}
      {isAdding && (
        <div
          data-testid="add-testimonial-form"
          style={{
            padding: '16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            marginBottom: '16px',
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
            Cadastrar Novo Depoimento
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Nome do Cliente *
              </label>
              <input
                type="text"
                className="form-control-modern"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mariana Costa"
                data-testid="input-testimonial-name"
                style={{ width: '100%', fontSize: '12.5px' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Papel / Cidade (Opcional)
              </label>
              <input
                type="text"
                className="form-control-modern"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Aluna da Turma 1 • SP"
                data-testid="input-testimonial-role"
                style={{ width: '100%', fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                URL da Foto / Avatar (Opcional)
              </label>
              <input
                type="url"
                className="form-control-modern"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                data-testid="input-testimonial-avatar"
                style={{ width: '100%', fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Avaliação
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '36px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    data-testid={`star-rating-btn-${s}`}
                  >
                    <Star
                      size={18}
                      color={s <= rating ? '#f59e0b' : '#cbd5e1'}
                      fill={s <= rating ? '#f59e0b' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Texto do Depoimento *
            </label>
            <textarea
              className="form-control-modern"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex: Conteúdo maravilhoso, tive resultados na primeira semana!"
              rows={3}
              data-testid="input-testimonial-text"
              style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="webhooks-btn-secondary"
              onClick={() => setIsAdding(false)}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primary-action-btn"
              onClick={handleAdd}
              disabled={!name.trim() || !text.trim()}
              data-testid="btn-confirm-add-testimonial"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Salvar Depoimento
            </button>
          </div>
        </div>
      )}

      {/* Lista de Depoimentos Existentes */}
      {testimonials.length === 0 && !isAdding ? (
        <div
          data-testid="empty-testimonials-msg"
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '12.5px',
          }}
        >
          Nenhum depoimento cadastrado ainda. Clique em "Novo Depoimento" para adicionar provas sociais ao seu checkout.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
          {testimonials.map((item, idx) => (
            <div
              key={item.id || idx}
              data-testid={`testimonial-card-${item.id || idx}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#ede9fe',
                      color: '#7c3aed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {item.name ? item.name.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{item.name}</span>
                    {item.role && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>• {item.role}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color={i < (item.rating || 5) ? '#f59e0b' : '#e2e8f0'}
                        fill={i < (item.rating || 5) ? '#f59e0b' : 'none'}
                      />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{item.text}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                data-testid={`btn-delete-testimonial-${item.id || idx}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                title="Excluir depoimento"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
