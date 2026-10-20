import React, { useState, useEffect } from 'react';
import { checkOrderStatusApi, simulatePaymentApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';
import { Copy, Check, CheckCircle2, ArrowLeft, QrCode, FileText, Calendar, ExternalLink, Zap } from 'lucide-react';

export default function CheckoutAsaasCarnetPayment({ order, onBack, onOrderPaid }) {
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status || 'pending');
  const [simulating, setSimulating] = useState(false);

  // Polling automático para detectar pagamento da entrada Pix
  useEffect(() => {
    if (orderStatus === 'paid') return;

    const intervalId = setInterval(async () => {
      try {
        const data = await checkOrderStatusApi(order.order_id);
        if (data.status === 'paid') {
          setOrderStatus('paid');
          if (onOrderPaid) onOrderPaid(data);
        }
      } catch (err) {
        // Silencioso no polling
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [order.order_id, orderStatus, onOrderPaid]);

  const handleCopy = async () => {
    if (!order.qr_code_text) return;
    try {
      await navigator.clipboard.writeText(order.qr_code_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setCopied(true);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setSimulating(true);
      const res = await simulatePaymentApi(order.order_id);
      if (res.status === 'paid') {
        setOrderStatus('paid');
        if (onOrderPaid) onOrderPaid(res);
      }
    } catch (err) {
      alert(err.message || 'Erro ao simular pagamento.');
    } finally {
      setSimulating(false);
    }
  };

  const installments = order.installments_list || [];

  if (orderStatus === 'paid') {
    return (
      <div className="pix-success-screen" data-testid="asaas-carnet-success-screen">
        <div className="pix-success-icon-wrapper">
          <CheckCircle2 size={64} className="pix-success-icon" />
        </div>
        <h2 className="pix-success-title">🎉 Entrada Confirmada & Acesso Liberado!</h2>
        <p className="pix-success-subtitle">
          A 1ª parcela do seu carnê foi quitada com sucesso. Seu acesso foi liberado!
        </p>

        <div className="pix-order-badge">
          <span>Código do Pedido:</span>
          <strong>{order.order_code}</strong>
        </div>

        {order.bank_slip_url && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a
              href={order.bank_slip_url}
              target="_blank"
              rel="noopener noreferrer"
              className="checkout-slip-btn"
              data-testid="link-download-carnet-pdf"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#059669',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '13.5px',
              }}
            >
              <FileText size={16} />
              <span>Baixar / Visualizar Carnê Completo</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="checkout-pix-screen" data-testid="asaas-carnet-payment-screen">
      {onBack && (
        <button type="button" onClick={onBack} className="checkout-pix-back-btn" data-testid="btn-back-to-form">
          <ArrowLeft size={16} />
          <span>Alterar forma de pagamento</span>
        </button>
      )}

      {/* Header Informativo */}
      <div className="checkout-pix-header">
        <div className="checkout-pix-icon-circle" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
          <FileText size={32} />
        </div>
        <h2 className="checkout-pix-screen-title">Carnê Digital Asaas Gerado!</h2>
        <p className="checkout-pix-screen-desc">
          Pague a <strong>1ª Parcela (Entrada Pix)</strong> abaixo para liberação imediata do seu conteúdo. As demais parcelas serão enviadas mensalmente por e-mail.
        </p>
      </div>

      {/* Box de Entrada Pix */}
      {order.qr_code_text && (
        <div className="checkout-pix-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', justifyContent: 'center' }}>
            <QrCode size={18} color="#059669" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#065f46' }}>
              Entrada via Pix Copia e Cola
            </h4>
          </div>

          {order.qr_code_base64 && (
            <div className="checkout-pix-qr-box">
              <img
                src={order.qr_code_base64.startsWith('data:') ? order.qr_code_base64 : `data:image/png;base64,${order.qr_code_base64}`}
                alt="QR Code Pix Entrada"
                className="checkout-pix-qr-image"
                data-testid="asaas-entry-qr-image"
              />
            </div>
          )}

          <div className="checkout-pix-copy-box">
            <input
              type="text"
              readOnly
              value={order.qr_code_text}
              className="checkout-pix-copy-input"
              data-testid="asaas-entry-pix-code"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`checkout-pix-copy-btn ${copied ? 'copied' : ''}`}
              data-testid="btn-copy-asaas-entry-pix"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grade de Parcelas do Carnê */}
      {installments.length > 0 && (
        <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#ffffff' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#0284c7" />
            <span>Cronograma de Parcelas do Carnê ({installments.length}x)</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {installments.map((inst) => (
              <div
                key={inst.id || inst.installment_number}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: inst.installment_number === 1 ? '#f0fdf4' : '#f8fafc',
                  border: inst.installment_number === 1 ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                data-testid={`carnet-installment-item-${inst.installment_number}`}
              >
                <div>
                  <strong style={{ color: inst.installment_number === 1 ? '#065f46' : '#1e293b' }}>
                    {inst.installment_number}ª Parcela {inst.installment_number === 1 ? '(Entrada Pix)' : ''}
                  </strong>
                  <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b' }}>
                    Vencimento: {inst.due_date}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(inst.amount_brl, 'BRL')}</strong>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: inst.status === 'paid' ? '#059669' : '#d97706',
                    }}
                  >
                    {inst.status === 'paid' ? 'Pago' : 'Aguardando'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Simulação em Ambiente de Teste */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={simulating}
          className="pix-simulate-btn"
          data-testid="simulate-asaas-payment-btn"
        >
          <Zap size={14} />
          <span>{simulating ? 'Confirmando...' : '⚡ Simular Pagamento da Entrada (Modo Teste)'}</span>
        </button>
      </div>
    </div>
  );
}
