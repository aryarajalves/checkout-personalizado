import { useState, useCallback } from 'react';

/**
 * Hook para gerenciamento do Fallback Inteligente de Cartão Recusado (#5).
 * Detecta recusa de cartão, abre o modal de recuperação e orquestra a
 * migração para Pix em 1 clique, Pagamento Híbrido ou troca de cartão.
 */
export default function useCardDeclinedFallback({
  product,
  setPaymentMethod,
  setCardData,
  submitCheckoutWithMethod,
}) {
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [declinedReason, setDeclinedReason] = useState('');
  const [submittingFallbackPix, setSubmittingFallbackPix] = useState(false);

  const openFallback = useCallback((reason) => {
    // Só abre se o fallback não estiver desativado no produto
    if (product?.enable_card_fallback === false) {
      return false;
    }
    setDeclinedReason(reason || 'O banco emissor não autorizou a cobrança no cartão de crédito.');
    setIsFallbackOpen(true);
    return true;
  }, [product?.enable_card_fallback]);

  const closeFallback = useCallback(() => {
    setIsFallbackOpen(false);
  }, []);

  const handlePayWithPix = useCallback(async () => {
    try {
      setSubmittingFallbackPix(true);
      setPaymentMethod('pix');
      if (typeof submitCheckoutWithMethod === 'function') {
        await submitCheckoutWithMethod({
          overrideMethod: 'pix',
          cardFallbackApplied: true,
        });
      }
      setIsFallbackOpen(false);
    } catch {
      // Erro será exibido na tela principal pelo submitHandler
      setIsFallbackOpen(false);
    } finally {
      setSubmittingFallbackPix(false);
    }
  }, [setPaymentMethod, submitCheckoutWithMethod]);

  const handlePayWithHybrid = useCallback(() => {
    setPaymentMethod('hybrid_pix_card');
    setIsFallbackOpen(false);
  }, [setPaymentMethod]);

  const handleTryAnotherCard = useCallback(() => {
    if (typeof setCardData === 'function') {
      setCardData((prev) => ({
        ...prev,
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
      }));
    }
    setPaymentMethod('credit_card');
    setIsFallbackOpen(false);
  }, [setCardData, setPaymentMethod]);

  return {
    isFallbackOpen,
    declinedReason,
    submittingFallbackPix,
    openFallback,
    closeFallback,
    handlePayWithPix,
    handlePayWithHybrid,
    handleTryAnotherCard,
  };
}
