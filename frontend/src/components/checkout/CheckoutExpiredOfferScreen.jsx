import React from 'react';
import { Clock, MessageCircle, ArrowRight, Home, AlertCircle } from 'lucide-react';
import '../../styles/checkout-expired.css';

export default function CheckoutExpiredOfferScreen({ proposal, product, slug, isProductInactive = false }) {
  const formatDateTime = (dtStr) => {
    if (!dtStr) return null;
    try {
      const dt = new Date(dtStr);
      if (isNaN(dt.getTime())) return null;
      return dt.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const formattedExpiry = proposal?.expires_at ? formatDateTime(proposal.expires_at) : null;

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      `Olá! Tentei acessar a oferta exclusiva "${proposal?.title || product?.name || 'Condição Especial'}" (${proposal?.proposal_code || slug || ''}), mas o link expirou e saiu do ar. Ainda é possível reativar essa condição?`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleGoToStandardOffer = () => {
    window.location.href = `/pay/${slug || product?.slug}`;
  };

  return (
    <div className="checkout-expired-screen-wrapper" data-testid="checkout-expired-screen">
      <div className="checkout-expired-card">
        <div className="checkout-expired-icon-circle">
          <Clock size={44} className="checkout-expired-clock-icon" />
        </div>

        <div className="checkout-expired-badge" data-testid="badge-expired-status">
          <AlertCircle size={14} />
          <span>Link Expirado</span>
        </div>

        {/* Texto GRANDE de Link Expirado */}
        <h1 className="checkout-expired-title" data-testid="expired-screen-title">
          Este Link de Pagamento Expirou
        </h1>

        {/* Destaque informando claramente que expirou devido a data e horário */}
        <div className="checkout-expired-highlight-box" data-testid="expired-screen-notice">
          <p className="checkout-expired-main-text">
            Este link foi expirado devido à data e horário limite de validade terem se encerrado.
          </p>
          {formattedExpiry && (
            <div className="checkout-expired-timestamp-box">
              <Clock size={15} />
              <span>Prazo limite encerrado em: <strong>{formattedExpiry} (Horário de Brasília)</strong></span>
            </div>
          )}
        </div>

        <p className="checkout-expired-desc" data-testid="expired-screen-desc">
          Por motivos de segurança e término do prazo negociado, todos os dados e formulários para pagamento foram desativados e não estão disponíveis.
        </p>

        {proposal && (
          <div className="checkout-expired-details-box" data-testid="proposal-expired-details">
            <div className="checkout-expired-details-row">
              <span className="label">Condição Especial:</span>
              <strong className="value">{proposal.title || 'Proposta Personalizada'}</strong>
            </div>
            {proposal.customer_name && (
              <div className="checkout-expired-details-row">
                <span className="label">Destinado a:</span>
                <span className="value">{proposal.customer_name}</span>
              </div>
            )}
            <div className="checkout-expired-details-row">
              <span className="label">Status:</span>
              <span className="status-badge-expired" data-testid="badge-expired-tag">Expirada</span>
            </div>
          </div>
        )}

        {isProductInactive && !proposal && (
          <div className="checkout-expired-details-box">
            <div className="checkout-expired-details-row">
              <span className="label">Produto:</span>
              <strong className="value">{product?.name || 'Oferta'}</strong>
            </div>
            <div className="checkout-expired-details-row">
              <span className="label">Status:</span>
              <span className="status-badge-expired">Desativado</span>
            </div>
          </div>
        )}

        <div className="checkout-expired-actions">
          <button
            type="button"
            onClick={handleWhatsAppContact}
            className="checkout-expired-btn primary"
            data-testid="btn-contact-whatsapp"
          >
            <MessageCircle size={18} />
            <span>Falar com Consultor no WhatsApp</span>
          </button>

          {Boolean(product && product.slug && product.is_active !== false) && (
            <button
              type="button"
              onClick={handleGoToStandardOffer}
              className="checkout-expired-btn secondary"
              data-testid="btn-view-standard-offer"
            >
              <span>Acessar Oferta Normal do Produto</span>
              <ArrowRight size={16} />
            </button>
          )}

          <a href="/" className="checkout-expired-home-link" data-testid="link-back-home">
            <Home size={15} />
            <span>Voltar para o Início</span>
          </a>
        </div>
      </div>
    </div>
  );
}
