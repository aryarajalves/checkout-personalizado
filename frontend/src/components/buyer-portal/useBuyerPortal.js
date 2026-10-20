import { useState, useEffect, useCallback } from 'react';
import { buyerPortalApi } from './buyerPortalApi';

export function useBuyerPortal(addToast) {
  const [buyerUser, setBuyerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('buyer_portal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [buyerToken, setBuyerToken] = useState(() => {
    return localStorage.getItem('buyer_portal_token') || null;
  });

  const [authStep, setAuthStep] = useState('email'); // 'email' | 'code'
  const [inputEmail, setInputEmail] = useState('');
  const [inputCpf, setInputCpf] = useState('');
  const [inputCode, setInputCode] = useState('');

  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'subscriptions'

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modais
  const [selectedPixOrder, setSelectedPixOrder] = useState(null);
  const [selectedSubForCard, setSelectedSubForCard] = useState(null);

  // Carrega dados do portal
  const loadPortalData = useCallback(async () => {
    if (!buyerToken) return;
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, subsRes] = await Promise.all([
        buyerPortalApi.getOrders(),
        buyerPortalApi.getSubscriptions(),
      ]);
      setOrders(ordersRes);
      setSubscriptions(subsRes);
    } catch (err) {
      const detail = err.detail || err.message || 'Erro ao carregar dados do comprador.';
      if (err.status === 401) {
        handleLogout();
        addToast?.('Sua sessão expirou. Por favor, acesse novamente.', 'error');
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  }, [buyerToken, addToast]);

  useEffect(() => {
    if (buyerToken) {
      loadPortalData();
    }
  }, [buyerToken, loadPortalData]);

  // Solicita envio de código OTP
  const handleRequestCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputEmail.trim()) {
      addToast?.('Por favor, informe seu e-mail cadastrado na compra.', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await buyerPortalApi.requestCode(inputEmail.trim(), inputCpf.trim() || null);
      setAuthStep('code');
      // Se vier dev_code (ambiente de dev/teste), preenche automaticamente
      if (res.dev_code) {
        setInputCode(res.dev_code);
      }
      addToast?.(res.message || 'Código de acesso enviado para o seu e-mail!', 'success');
    } catch (err) {
      const msg = err.detail || err.message || 'Erro ao solicitar código de acesso.';
      setError(msg);
      addToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Valida código OTP e loga
  const handleVerifyCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputCode.trim()) {
      addToast?.('Por favor, digite o código de 6 dígitos recebido por e-mail.', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await buyerPortalApi.verifyCode(inputEmail.trim(), inputCode.trim());
      localStorage.setItem('buyer_portal_token', res.access_token);
      localStorage.setItem('buyer_portal_user', JSON.stringify(res.customer));
      setBuyerToken(res.access_token);
      setBuyerUser(res.customer);
      setAuthStep('email');
      addToast?.(`Bem-vindo(a), ${res.customer.name}!`, 'success');
    } catch (err) {
      const msg = err.detail || err.message || 'Código de verificação incorreto ou expirado.';
      setError(msg);
      addToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('buyer_portal_token');
    localStorage.removeItem('buyer_portal_user');
    setBuyerToken(null);
    setBuyerUser(null);
    setOrders([]);
    setSubscriptions([]);
    setAuthStep('email');
    setInputCode('');
  };

  // Regenerar / Gerar 2ª via Pix
  const handleRegeneratePix = async (orderCode) => {
    setActionLoading(true);
    try {
      const res = await buyerPortalApi.regeneratePix(orderCode);
      addToast?.(res.message || 'Novo Pix gerado com sucesso!', 'success');
      // Atualiza lista de pedidos local
      setOrders((prev) =>
        prev.map((o) =>
          o.order_code === orderCode
            ? {
                ...o,
                qr_code_text: res.qr_code_text,
                qr_code_base64: res.qr_code_base64,
                expires_at: res.expires_at,
                is_pix_expired: false,
              }
            : o
        )
      );
      // Abre modal com o novo Pix
      const updatedOrder = orders.find((o) => o.order_code === orderCode);
      if (updatedOrder) {
        setSelectedPixOrder({
          ...updatedOrder,
          qr_code_text: res.qr_code_text,
          qr_code_base64: res.qr_code_base64,
          expires_at: res.expires_at,
          is_pix_expired: false,
        });
      }
    } catch (err) {
      addToast?.(err.detail || err.message || 'Erro ao gerar nova via do Pix.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Atualizar cartão da assinatura
  const handleUpdateCard = async (subscriptionCode, cardData) => {
    setActionLoading(true);
    try {
      const res = await buyerPortalApi.updateCard(subscriptionCode, cardData);
      addToast?.(res.message || 'Cartão atualizado com sucesso!', 'success');
      setSelectedSubForCard(null);
      // Atualiza lista de assinaturas
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.subscription_code === subscriptionCode
            ? {
                ...s,
                card_last_four: res.card_last_four,
                card_brand: res.card_brand,
                status: res.status,
              }
            : s
        )
      );
    } catch (err) {
      addToast?.(err.detail || err.message || 'Erro ao atualizar cartão.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    buyerUser,
    buyerToken,
    authStep,
    setAuthStep,
    inputEmail,
    setInputEmail,
    inputCpf,
    setInputCpf,
    inputCode,
    setInputCode,
    orders,
    subscriptions,
    activeTab,
    setActiveTab,
    loading,
    actionLoading,
    error,
    selectedPixOrder,
    setSelectedPixOrder,
    selectedSubForCard,
    setSelectedSubForCard,
    handleRequestCode,
    handleVerifyCode,
    handleLogout,
    handleRegeneratePix,
    handleUpdateCard,
    loadPortalData,
  };
}
