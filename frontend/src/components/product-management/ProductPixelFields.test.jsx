import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductPixelFields from './ProductPixelFields';

describe('ProductPixelFields Component', () => {
  it('renders all multi-pixel input fields (Meta, Google Ads, TikTok)', () => {
    const formData = {
      meta_pixel_id: '',
      google_ads_id: '',
      google_ads_conversion_label: '',
      tiktok_pixel_id: '',
    };
    const setFormData = vi.fn();

    render(<ProductPixelFields formData={formData} setFormData={setFormData} />);

    expect(screen.getByTestId('input-product-meta-pixel-id')).toBeInTheDocument();
    expect(screen.getByTestId('input-product-google-ads-id')).toBeInTheDocument();
    expect(screen.getByTestId('input-product-google-ads-conversion-label')).toBeInTheDocument();
    expect(screen.getByTestId('input-product-tiktok-pixel-id')).toBeInTheDocument();
  });

  it('triggers setFormData when user inputs IDs', () => {
    const formData = {
      meta_pixel_id: '',
      google_ads_id: '',
      google_ads_conversion_label: '',
      tiktok_pixel_id: '',
    };
    const setFormData = vi.fn();

    render(<ProductPixelFields formData={formData} setFormData={setFormData} />);

    fireEvent.change(screen.getByTestId('input-product-google-ads-id'), {
      target: { value: 'AW-555666777' },
    });
    expect(setFormData).toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('input-product-tiktok-pixel-id'), {
      target: { value: 'TTK-123456' },
    });
    expect(setFormData).toHaveBeenCalled();
  });
});
