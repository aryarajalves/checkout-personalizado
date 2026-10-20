import { useState, useCallback } from 'react';
import { maskCep, cleanCep, fetchAddressByCep } from './viaCepService';

export const initialBillingAddressState = {
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export default function useBillingAddress(initialData = {}) {
  const [billingAddress, setBillingAddress] = useState({
    ...initialBillingAddressState,
    ...initialData,
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepNotice, setCepNotice] = useState(null);

  const handleAddressChange = useCallback((field, value) => {
    let formattedValue = value;
    if (field === 'zipCode') {
      formattedValue = maskCep(value);
    }
    if (field === 'state') {
      formattedValue = String(value).toUpperCase().slice(0, 2);
    }

    setBillingAddress((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));

    setAddressErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const handleCepLookup = useCallback(async (customCep) => {
    const targetCep = customCep !== undefined ? customCep : billingAddress.zipCode;
    const digits = cleanCep(targetCep);
    if (digits.length !== 8) {
      return;
    }

    setLoadingCep(true);
    setCepNotice(null);

    const result = await fetchAddressByCep(digits);
    setLoadingCep(false);

    if (result.error) {
      setCepNotice(result.error);
    } else if (result.address) {
      setBillingAddress((prev) => ({
        ...prev,
        zipCode: result.address.zipCode || prev.zipCode,
        street: result.address.street || prev.street,
        complement: result.address.complement || prev.complement,
        neighborhood: result.address.neighborhood || prev.neighborhood,
        city: result.address.city || prev.city,
        state: result.address.state || prev.state,
      }));
      setCepNotice(null);

      // Limpa erros dos campos que foram preenchidos
      setAddressErrors((prev) => {
        const next = { ...prev };
        ['zipCode', 'street', 'neighborhood', 'city', 'state'].forEach((k) => delete next[k]);
        return next;
      });
    }
  }, [billingAddress.zipCode]);

  const validateBillingAddress = useCallback(() => {
    const errors = {};
    const digits = cleanCep(billingAddress.zipCode);

    if (!digits || digits.length !== 8) {
      errors.zipCode = 'Informe um CEP válido com 8 dígitos.';
    }
    if (!billingAddress.street || !billingAddress.street.trim()) {
      errors.street = 'Informe o logradouro / rua.';
    }
    if (!billingAddress.number || !billingAddress.number.trim()) {
      errors.number = 'Informe o número.';
    }
    if (!billingAddress.neighborhood || !billingAddress.neighborhood.trim()) {
      errors.neighborhood = 'Informe o bairro.';
    }
    if (!billingAddress.city || !billingAddress.city.trim()) {
      errors.city = 'Informe a cidade.';
    }
    if (!billingAddress.state || billingAddress.state.trim().length !== 2) {
      errors.state = 'UF (2 letras).';
    }

    setAddressErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [billingAddress]);

  return {
    billingAddress,
    setBillingAddress,
    addressErrors,
    setAddressErrors,
    loadingCep,
    cepNotice,
    handleAddressChange,
    handleCepLookup,
    validateBillingAddress,
  };
}
