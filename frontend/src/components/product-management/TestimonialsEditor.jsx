import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Star, User, MessageSquareQuote, AlertTriangle, X } from 'lucide-react';
import ImageUploadInput from '../common/ImageUploadInput';

export default function TestimonialsEditor({ testimonials = [], onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Estado para o Popup de Confirmação de Exclusão
  const [testimonialToDelete, setTestimonialToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const resetForm = () => {
    setName('');
    setRole('');
    setRating(5);
    setText('');
    setAvatarUrl('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (item) => {
    setName(item.name || '');
    setRole(item.role || '');
    setRating(item.rating || 5);
    setText(item.text || '');
    setAvatarUrl(item.avatar_url || '');
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    if (editingId) {
      // Atualizar depoimento existente
      const updated = testimonials.map((t) =>
        t.id === editingId
          ? {
              ...t,
              name: name.trim(),
              role: role.trim() || 'Cliente Verificado',
              rating: Number(rating) || 5,
              text: text.trim(),
              avatar_url: avatarUrl.trim() || null,
            }
          : t
      );
      onChange(updated);
    } else {
      // Adicionar novo depoimento
      const newTestimonial = {
        id: Date.now(),
        name: name.trim(),
        role: role.trim() || 'Cliente Verificado',
        rating: Number(rating) || 5,
        text: text.trim(),
        avatar_url: avatarUrl.trim() || null,
      };
      onChange([...testimonials, newTestimonial]);
    }

    resetForm();
  };

  const handleRequestDelete = (item) => {
    setTestimonialToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!testimonialToDelete) return;
    const updated = testimonials.filter((t) => t.id !== testimonialToDelete.id);
    onChange(updated);
    setTestimonialToDelete(null);
    setIsDeleteModalOpen(false);
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
            onClick={handleStartAdd}
            data-testid="btn-add-testimonial"
            style={{ fontSize: '12px', padding: '6px 12px', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Novo Depoimento</span>
          </button>
        )}
      </div>

      {/* Formulário para Adicionar / Editar Depoimento */}
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
            {editingId ? 'Editar Depoimento' : 'Cadastrar Novo Depoimento'}
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

          {/* Upload ou URL da Foto / Avatar */}
          <div style={{ marginBottom: '10px' }}>
            <ImageUploadInput
              label="Foto / Avatar do Cliente (Opcional)"
              value={avatarUrl}
              onChange={setAvatarUrl}
              placeholder="https://exemplo.com/foto.jpg"
              helperText="Envie uma foto do cliente ou cole o link da imagem."
              testId="input-testimonial-avatar"
            />
          </div>

          {/* Avaliação em Estrelas */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Avaliação (Estrelas)
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
                    size={20}
                    color={s <= rating ? '#f59e0b' : '#cbd5e1'}
                    fill={s <= rating ? '#f59e0b' : 'none'}
                  />
                </button>
              ))}
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
              onClick={resetForm}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primary-action-btn"
              onClick={handleSave}
              disabled={!name.trim() || !text.trim()}
              data-testid="btn-confirm-add-testimonial"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {editingId ? 'Atualizar Depoimento' : 'Salvar Depoimento'}
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
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: item.avatar_url ? 'none' : 'flex',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  {item.name ? item.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
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

              {/* Botões de Ação: Editar e Excluir */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleStartEdit(item)}
                  data-testid={`btn-edit-testimonial-${item.id || idx}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.15s',
                  }}
                  title="Editar depoimento"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <Edit2 size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestDelete(item)}
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
            </div>
          ))}
        </div>
      )}

      {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO (Centralizado, backdrop escuro, não fecha ao clicar fora) */}
      {isDeleteModalOpen && testimonialToDelete && (
        <div
          data-testid="modal-delete-testimonial-backdrop"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'builderFadeIn 0.15s ease-out',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="modal-delete-testimonial-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Excluir Depoimento
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir o depoimento de <strong>{testimonialToDelete.name}</strong>? Esta ação não pode ser desfeita.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTestimonialToDelete(null);
                }}
                data-testid="btn-cancel-delete-testimonial"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="action-delete-btn"
                onClick={handleConfirmDelete}
                data-testid="btn-confirm-delete-testimonial"
                style={{
                  backgroundColor: '#ef4444',
                  borderColor: '#ef4444',
                  color: '#ffffff',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
