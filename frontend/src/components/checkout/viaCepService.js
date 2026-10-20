/**
 * Serviço de busca e formatação de CEP (ViaCEP) com fallback para a API interna.
 */

export const cleanCep = (value = '') => String(value || '').replace(/\D/g, '').slice(0, 8);

export const maskCep = (value = '') => {
  const digits = cleanCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

export const fetchAddressByCep = async (rawCep) => {
  const digits = cleanCep(rawCep);
  if (digits.length !== 8) {
    return { error: 'CEP deve conter 8 dígitos numéricos.', address: null };
  }

  // 1. Tenta consulta direta no ViaCEP público
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.erro === true) {
        return { error: 'CEP não encontrado.', address: null };
      }
      if (data) {
        return {
          error: null,
          address: {
            zipCode: maskCep(data.cep || digits),
            street: data.logradouro || '',
            complement: data.complemento || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          },
        };
      }
    }
  } catch {
    // Falha silenciosa no ViaCEP direto (CORS, offline, timeout) para acionar fallback
  }

  // 2. Fallback na API interna
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const fallbackResp = await fetch(`/api/v1/checkout/cep/${digits}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (fallbackResp.ok) {
      const data = await fallbackResp.json();
      return {
        error: null,
        address: {
          zipCode: maskCep(data.cep || digits),
          street: data.street || '',
          complement: data.complement || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
        },
      };
    } else {
      const errData = await fallbackResp.json().catch(() => ({}));
      return {
        error: errData.detail || 'CEP não localizado.',
        address: null,
      };
    }
  } catch (err) {
    return {
      error: 'Não foi possível localizar o CEP. Digite os dados manualmente.',
      address: null,
    };
  }
};
