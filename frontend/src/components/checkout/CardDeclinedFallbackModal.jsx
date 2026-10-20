import React from 'react';
import { AlertTriangle, Zap, Split, CreditCard, X, Loader2, ShieldAlert } from 'lucide-react';
import { formatCurrency } from './checkoutUtils';

export default function CardDeclinedFallbackModal({
  isOpen,
  onClose,
  onPayWithPix,
  onPayWithHybrid,
  onTryAnotherCard,
  product,
  totalBrl = 0,
  submittingPix = false,
  declinedReason,
}) {
  if (!isOpen) return null;

  const fallbackDiscountPercent = Number(product?.card_fallback_discount_percent || 0);
  const pixDiscountPercent = Number(product?.pix_discount_percent || 0);
  const effectiveDiscountPercent = fallbackDiscountPercent > 0 ? fallbackDiscountPercent : pixDiscountPercent;

  const discountedPixAmount = effectiveDiscountPercent > 0
    ? Math.max(1.0, totalBrl * (1 - effectiveDiscountPercent / 100))
    : totalBrl;

  const savingsAmount = totalBrl - discountedPixAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
      data-testid="card-declined-fallback-modal"
      // Backdrop NÃO fecha ao clicar fora, em estrita conformidade com as regras do sistema
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl transition-all"
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Único de Fechar */}
        <button
          type="button"
          onClick={onClose}
          data-testid="close-fallback-modal-btn"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Cabeçalho com Alerta Amigável */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 mb-1">
              <AlertTriangle size={12} />
              Transação Não Autorizada
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Seu banco não autorizou o cartão
            </h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              {declinedReason || 'Isso geralmente ocorre por limite temporário, bloqueio de segurança no aplicativo ou instabilidade da operadora.'}
            </p>
          </div>
        </div>

        {/* Oferta VIP em 1-Clique: Conclusão via Pix */}
        <div
          className="rounded-xl p-4 sm:p-5 mb-5 border transition-all"
          style={{
            backgroundColor: '#f0fdf4',
            borderColor: '#bbf7d0',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Zap size={14} className="fill-emerald-600 text-emerald-600" />
              Opção Recomendada (Aprovação Instantânea)
            </span>
            {effectiveDiscountPercent > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
                🔥 {effectiveDiscountPercent}% OFF NO PIX
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-black text-emerald-900">
              {formatCurrency(discountedPixAmount)}
            </span>
            {effectiveDiscountPercent > 0 && (
              <span className="text-sm text-slate-400 line-through">
                {formatCurrency(totalBrl)}
              </span>
            )}
            {effectiveDiscountPercent > 0 && savingsAmount > 0 && (
              <span className="text-xs font-semibold text-emerald-700">
                (Economize {formatCurrency(savingsAmount)})
              </span>
            )}
          </div>

          <p className="text-xs text-emerald-800 mb-4 leading-normal">
            Não perca seu acesso! Gere o código Pix agora mesmo. Seus dados já estão salvos e você libera seu conteúdo no mesmo instante.
          </p>

          <button
            type="button"
            onClick={onPayWithPix}
            disabled={submittingPix}
            data-testid="fallback-pay-pix-btn"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor: '#16a34a',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
            }}
          >
            {submittingPix ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Gerando Pix Seguro...</span>
              </>
            ) : (
              <>
                <Zap size={18} className="fill-current" />
                <span>Pagar via Pix Agora (Aprovação em 1s)</span>
              </>
            )}
          </button>
        </div>

        {/* Outras Alternativas de Pagamento */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ou escolha outra alternativa:
          </p>

          {/* Alternativa: Pagamento Híbrido */}
          <button
            type="button"
            onClick={onPayWithHybrid}
            data-testid="fallback-pay-hybrid-btn"
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Split size={16} className="text-sky-600" />
              <span>Dividir em 2 Formas (Pix + Cartão ou 2 Cartões)</span>
            </span>
            <span className="text-xs text-sky-600 font-bold">Fatiar Limite &rarr;</span>
          </button>

          {/* Alternativa: Tentar Outro Cartão */}
          <button
            type="button"
            onClick={onTryAnotherCard}
            data-testid="fallback-try-another-card-btn"
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <CreditCard size={16} className="text-slate-500" />
              <span>Inserir outro cartão de crédito</span>
            </span>
            <span className="text-xs text-slate-500 font-bold">Trocar Cartão &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
