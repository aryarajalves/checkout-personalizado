import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Check, Trash2, Video, DollarSign, ExternalLink } from 'lucide-react';
import {
  fetchProductUpsellsApi,
  createProductUpsellApi,
  updateProductUpsellApi,
  deleteProductUpsellApi,
} from './productApi';

export function ProductUpsellModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upsellId, setUpsellId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    price_brl: '',
    video_url: '',
    image_url: '',
    external_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (!isOpen || !product) return;
    loadUpsell();
  }, [isOpen, product]);

  const loadUpsell = async () => {
    try {
      setLoading(true);
      const list = await fetchProductUpsellsApi(product.id);
      if (list && list.length > 0) {
        const u = list[0];
        setUpsellId(u.id);
        setFormData({
          title: u.title || '',
          subtitle: u.subtitle || '',
          description: u.description || '',
          price_brl: String(u.price_brl),
          video_url: u.video_url || '',
          image_url: u.image_url || '',
          external_url: u.external_url || '',
          is_active: u.is_active,
        });
      } else {
        setUpsellId(null);
        setFormData({
          title: 'Espere! Oferta Especial e Única para Você',
          subtitle: 'Aproveite esta oportunidade única para acelerar seus resultados',
          description: 'Acesso imediato ao nosso conteúdo avançado e exclusivo com desconto especial somente nesta página.',
          price_brl: '97.00',
          video_url: '',
          image_url: '',
          external_url: '',
          is_active: true,
        });
      }
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar UpSell.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showFeedback('error', 'O título da oferta de UpSell é obrigatório.');
      return;
    }
    const price = parseFloat(formData.price_brl);
    if (isNaN(price) || price < 0) {
      showFeedback('error', 'Informe um preço válido para o UpSell.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        price_brl: price,
        video_url: formData.video_url.trim() || null,
        image_url: formData.image_url.trim() || null,
        external_url: formData.external_url.trim() || null,
        is_active: formData.is_active,
      };

      if (upsellId) {
        await updateProductUpsellApi(product.id, upsellId, payload);
        showFeedback('success', 'Oferta de UpSell atualizada com sucesso!');
      } else {
        const res = await createProductUpsellApi(product.id, payload);
        setUpsellId(res.id);
        showFeedback('success', 'Oferta de UpSell criada com sucesso!');
      }
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar oferta de UpSell.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!upsellId) return;
    try {
      setSaving(true);
      await deleteProductUpsellApi(product.id, upsellId);
      showFeedback('success', 'UpSell removido com sucesso!');
      setUpsellId(null);
      setShowDeleteConfirm(false);
      loadUpsell();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao excluir UpSell.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-upsell-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-upsell-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Configuração de UpSell Pós-Compra</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            disabled={saving}
            data-testid="close-upsell-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #fef3c7', borderTopColor: '#d97706', borderRadius: '50%' }} />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Carregando UpSell...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Headline / Título de Impacto *
                </label>
                <input
                  type="text"
                  className="form-control-modern"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Espere! Seu pedido foi confirmado, mas veja isso..."
                  data-testid="input-upsell-title"
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Subtítulo / Proposta de Valor
                </label>
                <input
                  type="text"
                  className="form-control-modern"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Ex: Adicione a Formação Avançada com 70% de desconto nesta página"
                  data-testid="input-upsell-subtitle"
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Preço Especial do UpSell (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control-modern"
                    value={formData.price_brl}
                    onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
                    placeholder="97.00"
                    data-testid="input-upsell-price"
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                      data-testid="toggle-upsell-active"
                      style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
                    />
                    <span>Ativar UpSell Pós-Compra</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Link de Vídeo Explicativo (YouTube, Vimeo ou MP4)
                </label>
                <input
                  type="text"
                  className="form-control-modern"
                  value={formData.video_url}
                  onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  data-testid="input-upsell-video"
                  style={{ width: '100%', fontSize: '12.5px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Link da Página de Vendas Externa do UpSell (Opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    className="form-control-modern"
                    value={formData.external_url}
                    onChange={(e) => setFormData((p) => ({ ...p, external_url: e.target.value }))}
                    placeholder="https://seusite.com/oferta-upsell"
                    data-testid="input-upsell-external-url"
                    style={{ width: '100%', fontSize: '12.5px', paddingLeft: '34px' }}
                  />
                  <ExternalLink
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Se preenchido, o comprador será direcionado para sua página de vendas externa após o pagamento.
                </span>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Descrição Completa da Oferta
                </label>
                <textarea
                  className="form-control-modern"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Explique detalhadamente o que o cliente receberá no UpSell..."
                  data-testid="input-upsell-description"
                  style={{ width: '100%', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              {/* Botões de Ação */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  {upsellId && (
                    <button
                      type="button"
                      className="webhooks-btn-danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={saving}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      data-testid="btn-delete-upsell"
                    >
                      <Trash2 size={13} />
                      <span>Excluir UpSell</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="webhooks-btn-secondary"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="webhooks-btn-primary"
                    style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
                    disabled={saving}
                    data-testid="btn-save-upsell"
                  >
                    <Check size={14} />
                    <span>{saving ? 'Salvando...' : 'Salvar UpSell'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Popup de Confirmação de Exclusão Centralizado */}
      {showDeleteConfirm && (
        <div
          className="webhooks-modal-overlay"
          style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={(e) => e.stopPropagation()}
          data-testid="upsell-delete-confirm-overlay"
        >
          <div
            className="webhooks-modal-dialog"
            role="dialog"
            aria-modal="true"
            data-testid="upsell-delete-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', textAlign: 'center', padding: '24px' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Excluir Oferta de UpSell?
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
              Esta ação removerá permanentemente a oferta de UpSell deste produto. Deseja continuar?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                className="webhooks-btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                data-testid="btn-cancel-delete-upsell"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="webhooks-btn-danger"
                onClick={handleDelete}
                disabled={saving}
                data-testid="btn-confirm-delete-upsell"
              >
                {saving ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
