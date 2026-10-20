import React from 'react';
import { FileText, QrCode, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from './checkoutUtils';

export default function CheckoutAsaasInstallmentForm({
  product = {},
  totalPriceBrl = 0,
  asaasData = { installments: 2 },
  onAsaasChange,
}) {
  const maxInst = Math.max(2, parseInt(product?.asaas_max_installments || 12, 10));
  const interestRate = parseFloat(product?.asaas_interest_percent || 0);
  const requireEntryPix = product?.asaas_require_entry_pix !== undefined ? Boolean(product?.asaas_require_entry_pix) : true;
  const currentInst = Math.min(maxInst, Math.max(2, parseInt(asaasData?.installments || 2, 10)));

  // Calcular valor por parcela com juros mensais simples se configurado
  const calculateInstallmentDetail = (n) => {
    const total = interestRate > 0 ? totalPriceBrl * (1 + (interestRate / 100) * n) : totalPriceBrl;
    const installmentVal = total / n;
    return {
      total,
      installmentVal,
      hasInterest: interestRate > 0,
    };
  };

  const currentDetail = calculateInstallmentDetail(currentInst);

  return (
    <div className="checkout-asaas-form" data-testid="checkout-asaas-installment-form" style={{ marginTop: '16px' }}>
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FileText size={20} color="#059669" />
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#065f46' }}>
            Carnê Digital & BolePix Parcelado
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#047857', lineHeight: 1.45 }}>
          Compre parcelado sem comprometer o limite do seu cartão de crédito. Pague a primeira parcela no Pix para liberação imediata e o restante mensalmente via Carnê Asaas.
        </p>
      </div>

      {/* Seletor de Parcelas */}
      <div className="checkout-field-group" style={{ marginBottom: '16px' }}>
        <label className="checkout-label" htmlFor="asaas-installments-select" style={{ fontWeight: 600, color: '#1e293b', marginBottom: '6px', display: 'block' }}>
          Quantidade de Parcelas no Carnê
        </label>
        <select
          id="asaas-installments-select"
          className="checkout-select"
          value={currentInst}
          onChange={(e) => onAsaasChange && onAsaasChange(parseInt(e.target.value, 10))}
          data-testid="select-asaas-installments"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        >
          {Array.from({ length: maxInst - 1 }, (_, i) => i + 2).map((n) => {
            const detail = calculateInstallmentDetail(n);
            return (
              <option key={n} value={n}>
                {n}x de {formatCurrency(detail.installmentVal, 'BRL')}{' '}
                {detail.hasInterest ? `(Total ${formatCurrency(detail.total, 'BRL')})` : 'sem juros'}
              </option>
            );
          })}
        </select>
      </div>

      {/* Resumo do Plano de Pagamento */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px',
          backgroundColor: '#ffffff',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Plano Selecionado:</span>
          <strong style={{ fontSize: '14px', color: '#0f172a' }}>
            {currentInst}x de {formatCurrency(currentDetail.installmentVal, 'BRL')}
          </strong>
        </div>

        {requireEntryPix ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#065f46' }}>
              <QrCode size={16} color="#059669" />
              <span>
                <strong>1ª Parcela (Entrada Pix):</strong> {formatCurrency(currentDetail.installmentVal, 'BRL')} • Liberação imediata
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
              <Calendar size={16} color="#0284c7" />
              <span>
                <strong>{currentInst - 1}x Mensais no Carnê:</strong> {formatCurrency(currentDetail.installmentVal, 'BRL')}/mês com Boleto e BolePix
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569' }}>
            <Calendar size={16} color="#0284c7" />
            <span>
              <strong>Todas as {currentInst} parcelas:</strong> emitidas em carnê bancário com vencimento mensal.
            </span>
          </div>
        )}
      </div>

      {/* Benefícios e Segurança */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <CheckCircle2 size={14} color="#059669" />
          <span>Sem consulta ao SPC/Serasa</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b' }}>
          <ShieldCheck size={14} color="#0284c7" />
          <span>Emissão Oficial Asaas IP</span>
        </div>
      </div>
    </div>
  );
}
