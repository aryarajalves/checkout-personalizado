import React, { useState, useEffect } from 'react';
import { Zap, X, Check } from 'lucide-react';
import {
  fetchProductConversionConfigApi,
  updateProductConversionConfigApi,
  fetchCouponsForConversionApi,
} from './productApi';
import ProductConversionExitIntentSection from './ProductConversionExitIntentSection';
import ProductConversionSocialProofSection from './ProductConversionSocialProofSection';
import ProductConversionCardFallbackSection from './ProductConversionCardFallbackSection';

export function ProductConversionModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);

  // Estados Exit-Intent
  const [enableExitIntent, setEnableExitIntent] = useState(false);
  const [exitIntentCouponId, setExitIntentCouponId] = useState('');
  const [exitIntentTitle, setExitIntentTitle] = useState('Espere! Não perca esta oportunidade exclusiva');
  const [exitIntentSubtitle, setExitIntentSubtitle] = useState('Liberamos um desconto especial de última chance para você concluir seu pedido agora!');

  // Estados Prova Social
  const [enableSocialProof, setEnableSocialProof] = useState(false);
  const [socialProofMode, setSocialProofMode] = useState('hybrid');

  // Estados Fallback de Cartão Recusado (#5)
  const [enableCardFallback, setEnableCardFallback] = useState(true);
  const [cardFallbackDiscountPercent, setCardFallbackDiscountPercent] = useState(0);

  useEffect(() => {
    if (!isOpen || !product) return;

    async function loadData() {
      try {
        setLoading(true);
        const [config, couponsData] = await Promise.all([
          fetchProductConversionConfigApi(product.id),
          fetchCouponsForConversionApi().catch(() => []),
        ]);

        setEnableExitIntent(Boolean(config.enable_exit_intent));
        setExitIntentCouponId(config.exit_intent_coupon_id ? String(config.exit_intent_coupon_id) : '');
        setExitIntentTitle(config.exit_intent_title || 'Espere! Não perca esta oportunidade exclusiva');
        setExitIntentSubtitle(config.exit_intent_subtitle || 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!');
        setEnableSocialProof(Boolean(config.enable_social_proof));
        setSocialProofMode(config.social_proof_mode || 'hybrid');
        setEnableCardFallback(config.enable_card_fallback !== undefined ? Boolean(config.enable_card_fallback) : true);
        setCardFallbackDiscountPercent(Number(config.card_fallback_discount_percent || 0));

        const validCoupons = (couponsData || []).filter(
          (c) => c.is_active && (!c.product_id || c.product_id === product.id)
        );
        setCoupons(validCoupons);
      } catch (err) {
        showFeedback('error', err.message || 'Erro ao carregar configurações de conversão.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, product, showFeedback]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enableExitIntent && !exitIntentCouponId) {
      showFeedback('error', 'Selecione um cupom para o desconto de Exit-Intent.');
      return;
    }

    try {
      setSaving(true);
      await updateProductConversionConfigApi(product.id, {
        enable_exit_intent: enableExitIntent,
        exit_intent_coupon_id: exitIntentCouponId ? parseInt(exitIntentCouponId, 10) : null,
        exit_intent_title: exitIntentTitle.trim(),
        exit_intent_subtitle: exitIntentSubtitle.trim(),
        enable_social_proof: enableSocialProof,
        social_proof_mode: socialProofMode,
        enable_card_fallback: enableCardFallback,
        card_fallback_discount_percent: cardFallbackDiscountPercent,
      });
      showFeedback('success', 'Gatilhos de conversão salvos com sucesso!');
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar gatilhos de conversão.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCoupon = coupons.find((c) => String(c.id) === String(exitIntentCouponId));

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-conversion-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-conversion-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Gatilhos de Alta Conversão</h3>
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
            data-testid="close-conversion-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <div
                className="spinning-icon"
                style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  border: '3px solid #fef3c7',
                  borderTopColor: '#f59e0b',
                  borderRadius: '50%',
                }}
              />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Carregando dados de conversão...</p>
            </div>
          ) : (
            <>
              {/* SEÇÃO 1: EXIT-INTENT */}
              <ProductConversionExitIntentSection
                enableExitIntent={enableExitIntent}
                setEnableExitIntent={setEnableExitIntent}
                exitIntentCouponId={exitIntentCouponId}
                setExitIntentCouponId={setExitIntentCouponId}
                exitIntentTitle={exitIntentTitle}
                setExitIntentTitle={setExitIntentTitle}
                exitIntentSubtitle={exitIntentSubtitle}
                setExitIntentSubtitle={setExitIntentSubtitle}
                coupons={coupons}
                selectedCoupon={selectedCoupon}
              />

              {/* SEÇÃO 2: PROVA SOCIAL */}
              <ProductConversionSocialProofSection
                enableSocialProof={enableSocialProof}
                setEnableSocialProof={setEnableSocialProof}
                socialProofMode={socialProofMode}
                setSocialProofMode={setSocialProofMode}
              />

              {/* SEÇÃO 3: FALLBACK DE CARTÃO RECUSADO (#5) */}
              <ProductConversionCardFallbackSection
                enableCardFallback={enableCardFallback}
                setEnableCardFallback={setEnableCardFallback}
                cardFallbackDiscountPercent={cardFallbackDiscountPercent}
                setCardFallbackDiscountPercent={setCardFallbackDiscountPercent}
              />

              {/* Botões do Rodapé */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '16px',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary-modern"
                  onClick={onClose}
                  disabled={saving}
                  data-testid="btn-cancel-conversion"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-modern"
                  disabled={saving}
                  data-testid="btn-save-conversion"
                  style={{
                    padding: '8px 20px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                  }}
                >
                  {saving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Check size={16} /> Salvar Gatilhos
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default ProductConversionModal;
