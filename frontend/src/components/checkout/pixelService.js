/**
 * Serviço de Integração Multi-Pixel no Checkout (#17)
 * Suporta rastreamento unificado para:
 * 1. Meta / Facebook Pixel (fbq)
 * 2. Google Ads (gtag.js)
 * 3. TikTok Ads (ttq)
 */

let activeMetaPixelId = null;
let activeGoogleAdsId = null;
let activeGoogleAdsConversionLabel = null;
let activeTikTokPixelId = null;

export function resetPixelTrackerState() {
  activeMetaPixelId = null;
  activeGoogleAdsId = null;
  activeGoogleAdsConversionLabel = null;
  activeTikTokPixelId = null;
}

/**
 * 1. META / FACEBOOK PIXEL
 */
export function initMetaPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined') return;

  const cleanId = String(pixelId).trim();
  if (!cleanId) return;

  if (activeMetaPixelId === cleanId && window.fbq) {
    return;
  }
  activeMetaPixelId = cleanId;

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
 * 2. GOOGLE ADS (GTAG.JS)
 */
export function initGoogleAds(googleAdsId, conversionLabel = null) {
  if (!googleAdsId || typeof window === 'undefined') return;

  const cleanId = String(googleAdsId).trim();
  if (!cleanId) return;

  const cleanLabel = conversionLabel ? String(conversionLabel).trim() : null;
  activeGoogleAdsId = cleanId;
  activeGoogleAdsConversionLabel = cleanLabel;

  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (!window.gtag) {
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());

    const scriptTag = document.createElement('script');
    scriptTag.async = true;
    scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${cleanId}`;
    document.head.appendChild(scriptTag);
  }

  try {
    window.gtag('config', cleanId);
  } catch (err) {
    console.warn('[Pixel] Erro ao inicializar Google Ads:', err);
  }
}

/**
 * 3. TIKTOK ADS (TTQ)
 */
export function initTikTokPixel(tiktokPixelId) {
  if (!tiktokPixelId || typeof window === 'undefined') return;

  const cleanId = String(tiktokPixelId).trim();
  if (!cleanId) return;

  if (activeTikTokPixelId === cleanId && window.ttq) {
    return;
  }
  activeTikTokPixelId = cleanId;

  if (!window.ttq) {
    /* eslint-disable */
    (function(w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
      ttq.setAndDefer = function(t, e) {
        t[e] = function() {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function(t) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function(e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date;
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var a = document.createElement("script");
        a.type = "text/javascript";
        a.async = !0;
        a.src = r + "?sdkid=" + e + "&lib=" + t;
        var c = document.getElementsByTagName("script")[0];
        if (c && c.parentNode) {
          c.parentNode.insertBefore(a, c);
        } else {
          document.head.appendChild(a);
        }
      };
    })(window, document, 'ttq');
    /* eslint-enable */
  }

  try {
    window.ttq.load(cleanId);
  } catch (err) {
    console.warn('[Pixel] Erro ao inicializar TikTok Pixel:', err);
  }
}

/**
 * Inicializador Unificado de Todos os Pixels do Produto
 */
export function initAllPixels(product) {
  if (!product) return;
  if (product.meta_pixel_id) {
    initMetaPixel(product.meta_pixel_id);
  }
  if (product.google_ads_id) {
    initGoogleAds(product.google_ads_id, product.google_ads_conversion_label);
  }
  if (product.tiktok_pixel_id) {
    initTikTokPixel(product.tiktok_pixel_id);
  }
}

/**
 * Dispara o evento PageView em todas as plataformas ativas
 */
export function trackPixelPageView() {
  if (typeof window === 'undefined') return;

  // 1. Meta
  if (window.fbq) {
    try {
      window.fbq('track', 'PageView');
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar PageView no Meta:', err);
    }
  }

  // 2. Google Ads
  if (window.gtag) {
    try {
      window.gtag('event', 'page_view');
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar page_view no Google Ads:', err);
    }
  }

  // 3. TikTok Ads
  if (window.ttq && typeof window.ttq.page === 'function') {
    try {
      window.ttq.page();
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar page no TikTok:', err);
    }
  }
}

/**
 * Dispara o evento InitiateCheckout / begin_checkout em todas as plataformas
 */
export function trackPixelInitiateCheckout(product, selectedOffer) {
  if (typeof window === 'undefined' || !product) return;
  const value = Number(selectedOffer?.price_brl ?? product.price_brl ?? 0);

  // 1. Meta
  if (window.fbq) {
    try {
      window.fbq('track', 'InitiateCheckout', {
        content_name: product.name,
        content_ids: [String(product.id)],
        content_type: 'product',
        value,
        currency: 'BRL',
      });
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar InitiateCheckout no Meta:', err);
    }
  }

  // 2. Google Ads (begin_checkout)
  if (window.gtag) {
    try {
      window.gtag('event', 'begin_checkout', {
        value,
        currency: 'BRL',
        items: [{
          item_id: String(product.id),
          item_name: product.name,
          price: value,
        }],
      });
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar begin_checkout no Google Ads:', err);
    }
  }

  // 3. TikTok Ads (InitiateCheckout)
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('InitiateCheckout', {
        content_id: String(product.id),
        content_type: 'product',
        content_name: product.name,
        quantity: 1,
        price: value,
        value,
        currency: 'BRL',
      });
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar InitiateCheckout no TikTok:', err);
    }
  }
}

/**
 * Dispara o evento Purchase / CompletePayment quando o pedido for aprovado
 */
export function trackPixelPurchase(order, product) {
  if (typeof window === 'undefined' || !order) return;
  const value = Number(order.amount_brl ?? (product?.price_brl ?? 0));
  const orderCode = String(order.order_code || order.order_id || '');
  const productId = product?.id ? String(product.id) : orderCode;
  const productName = product?.name || 'Produto';

  // 1. Meta
  if (window.fbq) {
    try {
      window.fbq('track', 'Purchase', {
        content_name: productName,
        content_ids: [productId],
        content_type: 'product',
        value,
        currency: 'BRL',
        order_id: orderCode,
      });
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar Purchase no Meta:', err);
    }
  }

  // 2. Google Ads (purchase)
  if (window.gtag) {
    try {
      const gAdsId = product?.google_ads_id || activeGoogleAdsId;
      const gAdsLabel = product?.google_ads_conversion_label || activeGoogleAdsConversionLabel;
      const sendTo = (gAdsId && gAdsLabel)
        ? `${gAdsId}/${gAdsLabel}`
        : gAdsId;

      const gParams = {
        transaction_id: orderCode,
        value,
        currency: 'BRL',
        items: [{
          item_id: productId,
          item_name: productName,
          price: value,
        }],
      };
      if (sendTo) {
        gParams.send_to = sendTo;
      }
      window.gtag('event', 'purchase', gParams);
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar purchase no Google Ads:', err);
    }
  }

  // 3. TikTok Ads (CompletePayment)
  if (window.ttq && typeof window.ttq.track === 'function') {
    try {
      window.ttq.track('CompletePayment', {
        content_id: productId,
        content_type: 'product',
        content_name: productName,
        quantity: 1,
        price: value,
        value,
        currency: 'BRL',
        order_id: orderCode,
      });
    } catch (err) {
      console.warn('[Pixel] Erro ao disparar CompletePayment no TikTok:', err);
    }
  }
}
