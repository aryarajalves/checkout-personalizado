import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Package,
  CreditCard,
  QrCode,
  Coins,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Mail,
  Phone,
  User,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { fetchOrderByCodeApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';

export default function CheckoutThankYouPage({ orderCode: propOrderCode }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const redirectTimerRef = useRef(null);

  // Extrai orderCode da prop ou da URL (?order_code=... ou /thank-you/:orderCode)
  const resolvedOrderCode =
    propOrderCode ||
    new URLSearchParams(window.location.search).get('order_code') ||
    window.location.pathname.replace('/thank-you/', '').replace('/thank-you', '').split('/')[0].split('?')[0];

  useEffect(() => {
    async function loadOrder() {
      if (!resolvedOrderCode) {
        setError('Código de pedido não informado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchOrderByCodeApi(resolvedOrderCode);
        setOrder(data);
      } catch (err) {
        setError(err.message || 'Erro ao carregar detalhes do pedido.');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [resolvedOrderCode]);

  // Se o pedido tiver thank_you_url externa configurada, inicia a contagem regressiva de 3s
  useEffect(() => {
    if (!order || !order.thank_you_url) return;

    const targetUrl = buildRedirectUrl(order.thank_you_url, order);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = targetUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    redirectTimerRef.current = interval;

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [order]);

  const buildRedirectUrl = (baseUrl, orderData) => {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('order_id', orderData.order_code || '');
      url.searchParams.set('name', orderData.customer_name || '');
      if (orderData.customer_email) url.searchParams.set('email', orderData.customer_email);
      if (orderData.customer_phone) url.searchParams.set('phone', orderData.customer_phone);
      return url.toString();
    } catch {
      // Se não for uma URL com protocolo absoluto, anexa os parâmetros manualmente
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}order_id=${encodeURIComponent(orderData.order_code || '')}&name=${encodeURIComponent(orderData.customer_name || '')}&email=${encodeURIComponent(orderData.customer_email || '')}&phone=${encodeURIComponent(orderData.customer_phone || '')}`;
    }
  };

  const getPaymentMethodDisplay = (method) => {
    switch (method) {
      case 'pix':
        return { label: 'Pix Instantâneo', icon: <QrCode size={18} color="#059669" /> };
      case 'credit_card':
        return { label: 'Cartão de Crédito', icon: <CreditCard size={18} color="#0284c7" /> };
      case 'crypto':
        return { label: 'Criptomoeda Web3', icon: <Coins size={18} color="#7c3aed" /> };
      default:
        return { label: (method || 'Pagamento').toUpperCase(), icon: <CreditCard size={18} color="#475569" /> };
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading-screen" data-testid="thank-you-loading" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <Loader2 className="checkout-spinner" size={44} color="#0284c7" />
        <p style={{ marginTop: '16px', fontSize: '15px', fontWeight: 600, color: '#64748b' }}>Carregando confirmação do seu pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="checkout-error-screen" data-testid="thank-you-error" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#0f172a', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={52} color="#ef4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>Pedido não encontrado</h2>
        <p style={{ color: '#64748b', maxWidth: '440px', lineHeight: 1.5, marginBottom: '24px' }}>
          {error || 'Não encontramos as informações deste pedido ou o código informado é inválido.'}
        </p>
        <a href="/" style={{ padding: '12px 24px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}>
          Voltar para a Página Inicial
        </a>
      </div>
    );
  }

  const paymentDisplay = getPaymentMethodDisplay(order.payment_method);
  const targetExternalUrl = order.thank_you_url ? buildRedirectUrl(order.thank_you_url, order) : null;

  return (
    <div
      className="checkout-page-wrapper"
      data-testid="checkout-thank-you-page"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 16px 40px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header Seguro Estilo Checkout */}
      <header
        style={{
          width: '100%',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
            Checkout Seguro
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#059669',
              backgroundColor: '#ecfdf5',
              border: '1px solid #d1fae5',
              padding: '5px 12px',
              borderRadius: '20px',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>Compra Confirmada</span>
          </div>
        </div>
      </header>

      {/* Card Principal Clean White Premium */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '36px 30px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow Superior Suave */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '220px',
            height: '5px',
            background: 'linear-gradient(90deg, #10b981, #0284c7)',
            borderRadius: '0 0 10px 10px',
          }}
        />

        {/* Ícone de Sucesso Esmeralda */}
        <div
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            border: '2px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            color: '#059669',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
          }}
        >
          <CheckCircle2 size={42} />
        </div>

        {/* Badge de Confirmação */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '5px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '14px',
          }}
        >
          <Sparkles size={14} color="#16a34a" />
          <span data-testid="thank-you-badge">Pagamento Confirmado</span>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 900,
            color: '#0f172a',
            marginBottom: '8px',
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}
        >
          🎉 Parabéns pela sua compra!
        </h1>
        <p style={{ color: '#475569', fontSize: '14.5px', marginBottom: '26px', lineHeight: 1.5 }}>
          Seu pedido foi registrado e processado com sucesso. Guarde o comprovante abaixo:
        </p>

        {/* Box de Redirecionamento Automático (se thank_you_url externa estiver configurada) */}
        {targetExternalUrl && (
          <div
            data-testid="external-redirect-box"
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#0284c7',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              <Clock size={16} />
              <span>Redirecionando em {countdown} segundo{countdown !== 1 ? 's' : ''}...</span>
            </div>
            <p style={{ color: '#64748b', fontSize: '12.5px', margin: '0 0 14px' }}>
              Você será transferido para a página exclusiva de acesso ao seu produto.
            </p>
            <a
              href={targetExternalUrl}
              data-testid="immediate-redirect-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 22px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '14px',
                textDecoration: 'none',
                width: '100%',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
              }}
            >
              <span>Acessar Conteúdo Imediatamente</span>
              <ExternalLink size={16} />
            </a>
          </div>
        )}

        {/* Resumo do Pedido - Clean White */}
        <div
          data-testid="order-summary-card"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px 22px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '13.5px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #edf2f7',
              marginBottom: '12px',
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Código do Pedido</span>
            <span
              data-testid="order-code-display"
              style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.04em' }}
            >
              {order.order_code}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #edf2f7',
              marginBottom: '12px',
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Produto Adquirido</span>
            <span data-testid="order-product-name" style={{ fontWeight: 700, color: '#0284c7' }}>
              {order.product_name}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #edf2f7',
              marginBottom: '12px',
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Forma de Pagamento</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
              {paymentDisplay.icon}
              <span>{paymentDisplay.label}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid #edf2f7',
              marginBottom: '12px',
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Valor Total</span>
            <span data-testid="order-amount-display" style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
              {formatCurrency(order.amount_brl, 'BRL')}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: order.customer_email ? '12px' : '0',
              borderBottom: order.customer_email ? '1px solid #edf2f7' : 'none',
              marginBottom: order.customer_email ? '12px' : '0',
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Comprador</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>
              {order.customer_name}
            </span>
          </div>

          {order.customer_email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>E-mail Cadastrado</span>
              <span data-testid="order-customer-email" style={{ color: '#334155', fontWeight: 600 }}>
                {order.customer_email}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé Seguro */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '12.5px' }}>
          <ShieldCheck size={16} color="#059669" />
          <span>Ambiente Seguro • Compra Aprovada e Processada</span>
        </div>
      </div>
    </div>
  );
}
