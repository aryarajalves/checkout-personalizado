/**
 * API client nativo (fetch) para a Central Rápida do Comprador (/minhas-compras).
 */

const API_BASE = '/api/v1/buyer-portal';

function getHeaders() {
  const token = localStorage.getItem('buyer_portal_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.detail || 'Ocorreu um erro na requisição.');
    err.status = res.status;
    err.detail = errorData.detail;
    throw err;
  }
  return res.json();
}

export const buyerPortalApi = {
  // Solicita código OTP por e-mail
  async requestCode(email, cpf = null) {
    const res = await fetch(`${API_BASE}/request-code`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, cpf }),
    });
    return handleResponse(res);
  },

  // Valida código OTP e recebe token JWT do comprador
  async verifyCode(email, code) {
    const res = await fetch(`${API_BASE}/verify-code`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, code }),
    });
    return handleResponse(res);
  },

  // Consulta perfil do comprador logado
  async getProfile() {
    const res = await fetch(`${API_BASE}/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Lista todos os pedidos do comprador
  async getOrders() {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Gera 2ª via / renova Pix para pedidos pendentes
  async regeneratePix(orderCode) {
    const res = await fetch(`${API_BASE}/orders/${orderCode}/regenerate-pix`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Lista assinaturas recorrentes
  async getSubscriptions() {
    const res = await fetch(`${API_BASE}/subscriptions`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Atualiza cartão de crédito de uma assinatura
  async updateCard(subscriptionCode, cardData) {
    const res = await fetch(`${API_BASE}/subscriptions/${subscriptionCode}/update-card`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cardData),
    });
    return handleResponse(res);
  },
};
