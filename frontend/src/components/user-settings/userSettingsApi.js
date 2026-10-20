export const fetchMyFinancialProfileApi = async (token) => {
  const res = await fetch('/api/v1/auth/me/financial', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Erro ao carregar dados financeiros.');
  }
  return data;
};

export const updateMyFinancialProfileApi = async (financialData, token) => {
  const res = await fetch('/api/v1/auth/me/financial', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(financialData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Erro ao atualizar dados financeiros.');
  }
  return data;
};

export const updateMyProfileApi = async (profileData, token) => {
  const res = await fetch('/api/v1/auth/me/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Erro ao atualizar perfil.');
  }
  return data;
};
