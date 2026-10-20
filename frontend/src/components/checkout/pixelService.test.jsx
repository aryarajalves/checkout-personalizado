import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initMetaPixel,
  initGoogleAds,
  initTikTokPixel,
  initAllPixels,
  resetPixelTrackerState,
  trackPixelPageView,
  trackPixelInitiateCheckout,
  trackPixelPurchase,
} from './pixelService';

describe('pixelService - Multi-Pixels Tracking (Meta, Google Ads, TikTok)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPixelTrackerState();
    delete window.fbq;
    delete window._fbq;
    delete window.gtag;
    delete window.dataLayer;
    delete window.ttq;
    document.head.innerHTML = '';
  });

  afterEach(() => {
    resetPixelTrackerState();
    delete window.fbq;
    delete window._fbq;
    delete window.gtag;
    delete window.dataLayer;
    delete window.ttq;
    document.head.innerHTML = '';
  });

  describe('Meta Pixel', () => {
    it('does nothing when pixelId is null or empty', () => {
      initMetaPixel(null);
      initMetaPixel('');
      expect(window.fbq).toBeUndefined();
    });

    it('injects script tag and initializes fbq with valid pixelId', () => {
      initMetaPixel('1234567890');
      expect(window.fbq).toBeDefined();
      expect(typeof window.fbq).toBe('function');
      const scriptTag = document.querySelector('script[src*="fbevents.js"]');
      expect(scriptTag).not.toBeNull();
    });
  });

  describe('Google Ads', () => {
    it('does nothing when googleAdsId is null or empty', () => {
      initGoogleAds(null);
      initGoogleAds('');
      expect(window.gtag).toBeUndefined();
    });

    it('injects gtag script and configures Google Ads ID', () => {
      initGoogleAds('AW-123456789', 'labelXYZ');
      expect(window.gtag).toBeDefined();
      expect(typeof window.gtag).toBe('function');
      const scriptTag = document.querySelector('script[src*="googletagmanager.com/gtag/js?id=AW-123456789"]');
      expect(scriptTag).not.toBeNull();
    });
  });

  describe('TikTok Pixel', () => {
    it('does nothing when tiktokPixelId is null or empty', () => {
      initTikTokPixel(null);
      initTikTokPixel('');
      expect(window.ttq).toBeUndefined();
    });

    it('injects analytics.tiktok.com script and loads TikTok pixel ID', () => {
      initTikTokPixel('TT-99887766');
      expect(window.ttq).toBeDefined();
      expect(typeof window.ttq.load).toBe('function');
      const scriptTag = document.querySelector('script[src*="analytics.tiktok.com/i18n/pixel/events.js"]');
      expect(scriptTag).not.toBeNull();
    });
  });

  describe('initAllPixels', () => {
    it('initializes all configured pixels simultaneously', () => {
      initAllPixels({
        meta_pixel_id: '123456789',
        google_ads_id: 'AW-987654',
        google_ads_conversion_label: 'convLabel',
        tiktok_pixel_id: 'TT-55555',
      });
      expect(window.fbq).toBeDefined();
      expect(window.gtag).toBeDefined();
      expect(window.ttq).toBeDefined();
    });
  });

  describe('Tracking Events (PageView, InitiateCheckout, Purchase)', () => {
    beforeEach(() => {
      window.fbq = vi.fn();
      window.gtag = vi.fn();
      window.ttq = {
        page: vi.fn(),
        track: vi.fn(),
      };
    });

    it('tracks PageView across all platforms', () => {
      trackPixelPageView();
      expect(window.fbq).toHaveBeenCalledWith('track', 'PageView');
      expect(window.gtag).toHaveBeenCalledWith('event', 'page_view');
      expect(window.ttq.page).toHaveBeenCalled();
    });

    it('tracks InitiateCheckout across all platforms with product info', () => {
      const mockProduct = { id: 5, name: 'Curso Master', price_brl: 97.0 };
      const mockOffer = { id: 12, price_brl: 147.0 };

      trackPixelInitiateCheckout(mockProduct, mockOffer);

      expect(window.fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
        content_name: 'Curso Master',
        content_ids: ['5'],
        content_type: 'product',
        value: 147.0,
        currency: 'BRL',
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
        currency: 'BRL',
        value: 147.0,
        items: [{ item_id: '5', item_name: 'Curso Master', price: 147.0 }],
      });

      expect(window.ttq.track).toHaveBeenCalledWith('InitiateCheckout', {
        content_id: '5',
        content_type: 'product',
        content_name: 'Curso Master',
        quantity: 1,
        price: 147.0,
        value: 147.0,
        currency: 'BRL',
      });
    });

    it('tracks Purchase across all platforms, including Google Ads conversion label', () => {
      initGoogleAds('AW-123456789', 'convLabelXYZ');

      const mockProduct = {
        id: 5,
        name: 'Curso Master',
        google_ads_id: 'AW-123456789',
        google_ads_conversion_label: 'convLabelXYZ',
      };
      const mockOrder = { order_id: 101, order_code: 'ORD-999', amount_brl: 197.0 };

      trackPixelPurchase(mockOrder, mockProduct);

      expect(window.fbq).toHaveBeenCalledWith('track', 'Purchase', {
        content_name: 'Curso Master',
        content_ids: ['5'],
        content_type: 'product',
        value: 197.0,
        currency: 'BRL',
        order_id: 'ORD-999',
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', {
        transaction_id: 'ORD-999',
        value: 197.0,
        currency: 'BRL',
        items: [{ item_id: '5', item_name: 'Curso Master', price: 197.0 }],
        send_to: 'AW-123456789/convLabelXYZ',
      });

      expect(window.ttq.track).toHaveBeenCalledWith('CompletePayment', {
        content_id: '5',
        content_type: 'product',
        content_name: 'Curso Master',
        quantity: 1,
        price: 197.0,
        value: 197.0,
        currency: 'BRL',
        order_id: 'ORD-999',
      });
    });

    it('is resilient to tracking errors and exceptions (adblock safe)', () => {
      window.fbq = vi.fn(() => { throw new Error('Adblock FB'); });
      window.gtag = vi.fn(() => { throw new Error('Adblock Google'); });
      window.ttq.track = vi.fn(() => { throw new Error('Adblock TT'); });

      expect(() => trackPixelPageView()).not.toThrow();
      expect(() => trackPixelInitiateCheckout({ id: 1, name: 'P' })).not.toThrow();
      expect(() => trackPixelPurchase({ order_id: 1 }, { id: 1 })).not.toThrow();
    });
  });
});
