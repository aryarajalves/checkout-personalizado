/**
 * Camada de API para gerenciamento administrativo de Cupons de Desconto.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCouponsApi(productId = null) {
  const query = productId ? `?product_id=${productId}` : '';
  const res = await fetch(`/api/v1/coupons${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de cupons.');
  }
  return res.json();
}

export async function createCouponApi(payload) {
  const res = await fetch('/api/v1/coupons', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar cupom de desconto.');
  }
  return res.json();
}

export async function updateCouponApi(couponId, payload) {
  const res = await fetch(`/api/v1/coupons/${couponId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar cupom de desconto.');
  }
  return res.json();
}

export async function deleteCouponApi(couponId) {
  const res = await fetch(`/api/v1/coupons/${couponId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir cupom de desconto.');
  }
  return true;
}

export async function fetchProductsForCouponsApi() {
  const res = await fetch('/api/v1/products', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de produtos.');
  }
  return res.json();
}
