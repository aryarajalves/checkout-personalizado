import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initMetaPixel,
  trackPixelPageView,
  trackPixelInitiateCheckout,
  trackPixelPurchase,
} from './pixelService';

describe('pixelService - Meta / Facebook Pixel Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.fbq;
    delete window._fbq;
    document.head.innerHTML = '';
  });

  afterEach(() => {
    delete window.fbq;
    delete window._fbq;
    document.head.innerHTML = '';
  });

  it('does nothing when pixelId is null, empty or undefined', () => {
    initMetaPixel(null);
    initMetaPixel('');
    initMetaPixel('   ');
    expect(window.fbq).toBeUndefined();
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull();
  });

  it('injects script tag and initializes fbq with valid pixelId', () => {
    initMetaPixel('1234567890');

    expect(window.fbq).toBeDefined();
    expect(typeof window.fbq).toBe('function');

    const scriptTag = document.querySelector('script[src*="fbevents.js"]');
    expect(scriptTag).not.toBeNull();
    expect(scriptTag.async).toBe(true);
  });

  it('tracks PageView event when fbq is available', () => {
    window.fbq = vi.fn();
    trackPixelPageView();

    expect(window.fbq).toHaveBeenCalledWith('track', 'PageView');
  });

  it('tracks InitiateCheckout event with product and offer prices', () => {
    window.fbq = vi.fn();
    const mockProduct = {
      id: 5,
      name: 'Curso de Astro',
      price_brl: 97.0,
    };
    const mockOffer = {
      id: 12,
      price_brl: 147.0,
    };

    trackPixelInitiateCheckout(mockProduct, mockOffer);

    expect(window.fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      content_name: 'Curso de Astro',
      content_ids: ['5'],
      content_type: 'product',
      value: 147.0,
      currency: 'BRL',
    });
  });

  it('tracks Purchase event with amount, product name and order code', () => {
    window.fbq = vi.fn();
    const mockProduct = {
      id: 5,
      name: 'Curso de Astro',
    };
    const mockOrder = {
      order_id: 101,
      order_code: 'ORD-999',
      amount_brl: 197.0,
      status: 'paid',
    };

    trackPixelPurchase(mockOrder, mockProduct);

    expect(window.fbq).toHaveBeenCalledWith('track', 'Purchase', {
      content_name: 'Curso de Astro',
      content_ids: ['5'],
      content_type: 'product',
      value: 197.0,
      currency: 'BRL',
      order_id: 'ORD-999',
    });
  });

  it('handles exceptions gracefully without throwing errors (adblock safe)', () => {
    window.fbq = vi.fn(() => {
      throw new Error('Blocked by client extension');
    });

    expect(() => trackPixelPageView()).not.toThrow();
    expect(() => trackPixelInitiateCheckout({ id: 1, name: 'P' })).not.toThrow();
    expect(() => trackPixelPurchase({ order_id: 1 }, { id: 1 })).not.toThrow();
  });
});
