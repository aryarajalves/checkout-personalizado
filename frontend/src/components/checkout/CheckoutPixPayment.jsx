import React, { useState, useEffect } from 'react';
import { checkOrderStatusApi, simulatePaymentApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';
import { Copy, Check, Clock, CheckCircle2, ArrowLeft, Zap, ShieldCheck } from 'lucide-react';

export default function CheckoutPixPayment({ order, onBack, onOrderPaid }) {
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status || 'pending');
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutos em segundos

  // Polling de verificação de status a cada 3 segundos enquanto status for 'pending'
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

  // Timer regressivo
  useEffect(() => {
    if (orderStatus === 'paid') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [orderStatus]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    if (!order.qr_code_text) return;
    try {
      await navigator.clipboard.writeText(order.qr_code_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback para seleção manual
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

  if (orderStatus === 'paid') {
    return (
      <div className="pix-success-screen" data-testid="pix-success-screen">
        <div className="pix-success-icon-wrapper">
          <CheckCircle2 size={64} className="pix-success-icon" />
        </div>
        <h2 className="pix-success-title">🎉 Pagamento Confirmado!</h2>
        <p className="pix-success-subtitle">
          Seu Pix no valor de <strong>{formatCurrency(order.amount_brl, 'BRL')}</strong> foi processado com sucesso.
        </p>

        <div className="pix-order-badge">
          <span>Código do Pedido:</span>
          <strong>{order.order_code}</strong>
        </div>

        <div className="pix-receipt-box">
          <div className="pix-receipt-row">
            <span>Status:</span>
            <span className="pix-status-paid">Aprovado</span>
          </div>
          <div className="pix-receipt-row">
            <span>Método:</span>
            <span>Pix Instantâneo</span>
          </div>
          <div className="pix-receipt-row">
            <span>Liberação:</span>
            <span className="pix-instant-badge">Imediata</span>
          </div>
        </div>

        <p className="pix-instructions-note">
          Pagamento Pix recebido e processado com sucesso no sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="pix-payment-container" data-testid="pix-payment-container">
      <div className="pix-payment-header">
        <button type="button" onClick={onBack} className="pix-back-button" title="Voltar para opções">
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <div className="pix-header-info">
          <span className="pix-order-number">Pedido: {order.order_code}</span>
          <span className="pix-total-highlight">{formatCurrency(order.amount_brl, 'BRL')}</span>
        </div>
      </div>

      <div className="pix-qr-section">
        <div className="pix-timer-badge">
          <Clock size={16} />
          <span>Pague em até {formatTimer(timeLeft)}</span>
        </div>

        <div className="pix-qr-wrapper">
          {order.qr_code_base64 ? (
            <img
              src={order.qr_code_base64}
              alt="QR Code Pix"
              className="pix-qr-image"
              data-testid="pix-qr-image"
            />
          ) : (
            <div className="pix-qr-placeholder">Carregando QR Code...</div>
          )}
        </div>

        <p className="pix-qr-instruction">
          Abra o app do seu banco, escolha <strong>Pagar com Pix</strong> e aponte a câmera para o QR Code acima.
        </p>
      </div>

      <div className="pix-copiacola-section">
        <label className="pix-copiacola-label">Ou utilize o Pix Copia e Cola:</label>
        <div className="pix-copiacola-input-group">
          <input
            type="text"
            readOnly
            value={order.qr_code_text || ''}
            className="pix-copiacola-input"
            data-testid="pix-copiacola-input"
            onClick={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`pix-copy-button ${copied ? 'copied' : ''}`}
            data-testid="pix-copy-button"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>
        {copied && (
          <p className="pix-copied-feedback">Código Pix copiado! Cole no aplicativo do seu banco.</p>
        )}
      </div>

      {/* Indicador de Espera Ativa */}
      <div className="pix-waiting-indicator">
        <div className="pix-pulse-dot" />
        <span>Aguardando confirmação do banco em tempo real...</span>
      </div>

      {/* Botão de Simulação em Ambiente Sandbox */}
      <div className="pix-simulation-box">
        <div className="pix-simulation-header">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>Ambiente de Testes / Sandbox</span>
        </div>
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={simulating}
          className="pix-simulate-button"
          data-testid="pix-simulate-button"
        >
          <Zap size={15} />
          <span>{simulating ? 'Confirmando...' : 'Simular Pagamento Aprovado'}</span>
        </button>
      </div>
    </div>
  );
}
