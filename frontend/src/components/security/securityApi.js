/**
 * Camada de comunicação com a API de Segurança, Anti-Carding e Blacklist (#10)
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchSecuritySettingsApi() {
  const res = await fetch('/api/v1/security/settings', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar configurações de segurança.');
  }
  return res.json();
}

export async function updateSecuritySettingsApi(payload) {
  const res = await fetch('/api/v1/security/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar configurações de segurança.');
  }
  return res.json();
}

export async function fetchBlacklistEntriesApi(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.entry_type) query.append('entry_type', params.entry_type);
  if (params.active_only) query.append('active_only', 'true');
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));

  const res = await fetch(`/api/v1/security/blacklist?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de bloqueios.');
  }
  return res.json();
}

export async function createBlacklistEntryApi(payload) {
  const res = await fetch('/api/v1/security/blacklist', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar na Blacklist.');
  }
  return res.json();
}

export async function updateBlacklistEntryApi(entryId, payload) {
  const res = await fetch(`/api/v1/security/blacklist/${entryId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar entrada da Blacklist.');
  }
  return res.json();
}

export async function deleteBlacklistEntryApi(entryId) {
  const res = await fetch(`/api/v1/security/blacklist/${entryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir entrada da Blacklist.');
  }
  return res.json();
}

export async function fetchCardAttemptsApi(limit = 50) {
  const res = await fetch(`/api/v1/security/card-attempts?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar logs de tentativas de cartão.');
  }
  return res.json();
}
