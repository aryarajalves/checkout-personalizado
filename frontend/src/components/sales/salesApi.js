/**
 * Camada de API para Painel de Vendas, Relatório de Pedidos e BI de UTMs.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchSalesMetricsApi({ startDate = '', endDate = '', productId = '' } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (productId) params.append('product_id', productId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/v1/sales/metrics${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar métricas de vendas.');
  }
  return res.json();
}

export async function fetchOrdersReportApi({
  startDate = '',
  endDate = '',
  status = '',
  paymentMethod = '',
  productId = '',
  utmSource = '',
  utmCampaign = '',
  search = '',
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (status) params.append('status', status);
  if (paymentMethod) params.append('payment_method', paymentMethod);
  if (productId) params.append('product_id', productId);
  if (utmSource) params.append('utm_source', utmSource);
  if (utmCampaign) params.append('utm_campaign', utmCampaign);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  const query = `?${params.toString()}`;
  const res = await fetch(`/api/v1/sales/orders${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar relatório de pedidos.');
  }
  const totalCount = parseInt(res.headers.get('X-Total-Count'), 10);
  const items = await res.json();
  return {
    items,
    total: !isNaN(totalCount) ? totalCount : items.length,
  };
}

export async function fetchOrderDetailsApi(orderId) {
  const res = await fetch(`/api/v1/sales/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Pedido não encontrado.');
  }
  return res.json();
}

export async function fetchUtmBiAnalyticsApi({ startDate = '', endDate = '', productId = '' } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (productId) params.append('product_id', productId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/v1/sales/utm-bi${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar BI de UTMs.');
  }
  return res.json();
}

export async function downloadOrdersCsvApi(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.status) params.append('status', filters.status);
  if (filters.paymentMethod) params.append('payment_method', filters.paymentMethod);
  if (filters.productId) params.append('product_id', filters.productId);
  if (filters.search) params.append('search', filters.search);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/v1/sales/export-csv${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Falha ao exportar CSV de pedidos.');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function refundOrderApi(orderId, { reason, notes = '' } = {}) {
  const res = await fetch(`/api/v1/sales/orders/${orderId}/refund`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason, notes }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao estornar o pedido.');
  }
  return res.json();
}

export async function deleteOrderApi(orderId) {
  const res = await fetch(`/api/v1/sales/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir pedido.');
  }
  return res.json();
}

export async function bulkDeleteOrdersApi(orderIds) {
  const res = await fetch('/api/v1/sales/orders/bulk-delete', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ order_ids: orderIds }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir pedidos em lote.');
  }
  return res.json();
}

