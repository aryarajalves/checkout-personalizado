/**
 * Serviço de Integração do Meta / Facebook Pixel no Checkout
 * Suporta inicialização dinâmica por produto e rastreamento de PageView, InitiateCheckout e Purchase.
 */

let activePixelId = null;

/**
 * Inicializa dinamicamente o Meta Pixel para o produto especificado.
 * Injeta o script oficial do Facebook no head se ainda não estiver presente.
 */
export function initMetaPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined') return;

  const cleanId = String(pixelId).trim();
  if (!cleanId) return;

  if (activePixelId === cleanId && window.fbq) {
    return;
  }

  activePixelId = cleanId;

  // Injeção do snippet padrão do Meta Pixel
  if (!window.fbq) {
    /* eslint-disable */
    (function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      if (s && s.parentNode) {
        s.parentNode.insertBefore(t, s);
      } else {
        b.head.appendChild(t);
      }
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
  }

  try {
    window.fbq('init', cleanId);
  } catch (err) {
    console.warn('[Pixel] Erro ao inicializar Meta Pixel:', err);
  }
}

/**
 * Dispara o evento PageView
 */
export function trackPixelPageView() {
  if (typeof window === 'undefined' || !window.fbq) return;
  try {
    window.fbq('track', 'PageView');
  } catch (err) {
    console.warn('[Pixel] Erro ao disparar PageView:', err);
  }
}

/**
 * Dispara o evento InitiateCheckout quando o usuário interage com o formulário ou método de pagamento
 */
export function trackPixelInitiateCheckout(product, selectedOffer) {
  if (typeof window === 'undefined' || !window.fbq || !product) return;
  try {
    const value = selectedOffer?.price_brl ?? product.price_brl ?? 0;
    window.fbq('track', 'InitiateCheckout', {
      content_name: product.name,
      content_ids: [String(product.id)],
      content_type: 'product',
      value: Number(value),
      currency: 'BRL',
    });
  } catch (err) {
    console.warn('[Pixel] Erro ao disparar InitiateCheckout:', err);
  }
}

/**
 * Dispara o evento Purchase quando o pedido for pago/aprovado com sucesso
 */
export function trackPixelPurchase(order, product) {
  if (typeof window === 'undefined' || !window.fbq || !order) return;
  try {
    const value = order.amount_brl ?? (product?.price_brl ?? 0);
    window.fbq('track', 'Purchase', {
      content_name: product?.name || 'Produto',
      content_ids: product?.id ? [String(product.id)] : [String(order.order_code)],
      content_type: 'product',
      value: Number(value),
      currency: 'BRL',
      order_id: String(order.order_code || order.order_id),
    });
  } catch (err) {
    console.warn('[Pixel] Erro ao disparar Purchase:', err);
  }
}
