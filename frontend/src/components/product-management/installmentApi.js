/**
 * Camada de API e utilitários para Cálculo de Parcelamento e Simulação de Split (#4).
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchInstallmentSimulationApi(productId, offerId = null) {
  const query = offerId ? `?offer_id=${offerId}` : '';
  const res = await fetch(`/api/v1/products/${productId}/installment-simulation${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar simulação de parcelamento.');
  }
  return res.json();
}

/**
 * Utilitário cliente para gerar opções de parcelamento respeitando as regras do produto.
 */
export function calculateClientInstallments({
  totalPriceBrl,
  maxInstallments = 12,
  freeInstallmentsCount = 1,
  interestRatePercent = 2.99,
  interestPayer = 'buyer',
  formatCurrencyFn = (val) => `R$ ${val.toFixed(2).replace('.', ',')}`,
}) {
  const limit = Math.max(1, Math.min(12, parseInt(maxInstallments || 12, 10)));
  const freeCount = Math.max(1, Math.min(12, parseInt(freeInstallmentsCount || 1, 10)));
  const rate = Math.max(0, parseFloat(interestRatePercent !== undefined ? interestRatePercent : 2.99));
  const payer = interestPayer || 'buyer';

  return Array.from({ length: limit }, (_, i) => {
    const installments = i + 1;

    if (installments === 1) {
      return {
        installments: 1,
        installmentValue: totalPriceBrl,
        totalAmount: totalPriceBrl,
        hasInterest: false,
        label: `1x de ${formatCurrencyFn(totalPriceBrl)} à vista`,
      };
    }

    if (installments <= freeCount || payer === 'producer') {
      const installmentVal = totalPriceBrl / installments;
      return {
        installments,
        installmentValue: installmentVal,
        totalAmount: totalPriceBrl,
        hasInterest: false,
        label: `${installments}x de ${formatCurrencyFn(installmentVal)} sem juros`,
      };
    }

    // Juros compostos / Tabela Price repassados ao comprador
    const monthlyRate = rate / 100.0;
    const factor = Math.pow(1.0 + monthlyRate, -installments);
    let installmentVal = totalPriceBrl / installments;

    if (factor < 1.0 && monthlyRate > 0) {
      installmentVal = (totalPriceBrl * monthlyRate) / (1.0 - factor);
    }
    const totalAmount = installmentVal * installments;

    return {
      installments,
      installmentValue: installmentVal,
      totalAmount,
      hasInterest: true,
      interestRate: rate,
      label: `${installments}x de ${formatCurrencyFn(installmentVal)} (total: ${formatCurrencyFn(totalAmount)})`,
    };
  });
}
