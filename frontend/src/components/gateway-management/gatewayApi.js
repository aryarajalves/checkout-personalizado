/**
 * Serviços de API para Gateways de Pagamento e Split de Recebíveis.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchGatewaysApi() {
  const res = await fetch('/api/v1/gateways', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar gateways de pagamento.');
  }
  return res.json();
}

export async function saveGatewayApi(gatewayData) {
  const res = await fetch('/api/v1/gateways', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(gatewayData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao salvar configurações do gateway.');
  }
  return res.json();
}

export async function testGatewayConnectionApi(testData) {
  const res = await fetch('/api/v1/gateways/test-connection', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(testData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao testar conexão com o gateway.');
  }
  return res.json();
}

export async function fetchSplitRecipientsApi() {
  const res = await fetch('/api/v1/split-recipients', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar recebedores de split.');
  }
  return res.json();
}

export async function createSplitRecipientApi(recipientData) {
  const res = await fetch('/api/v1/split-recipients', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(recipientData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao criar recebedor de split.');
  }
  return res.json();
}

export async function updateSplitRecipientApi(id, recipientData) {
  const res = await fetch(`/api/v1/split-recipients/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(recipientData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar recebedor de split.');
  }
  return res.json();
}

export async function deleteSplitRecipientApi(id) {
  const res = await fetch(`/api/v1/split-recipients/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir recebedor de split.');
  }
  return res.json();
}
