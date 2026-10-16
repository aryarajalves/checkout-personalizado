import React, { useState, useEffect, useRef } from 'react';
import { checkOrderStatusApi, simulatePaymentApi, confirmWeb3PaymentApi } from './checkoutApi';
import { payWithMetaMask, isMetaMaskInstalled } from './metamaskUtils';
import { formatCurrency } from './checkoutUtils';
import {
  Copy,
  Check,
  CheckCircle2,
  ArrowLeft,
  Zap,
  ShieldAlert,
  Coins,
  RefreshCw,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import '../../styles/checkout-crypto.css';

export default function CheckoutCryptoPayment({ order, onBack, onOrderPaid }) {
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status || 'pending');
  const [simulating, setSimulating] = useState(false);
  const [web3Loading, setWeb3Loading] = useState(false);
  const [web3Error, setWeb3Error] = useState(null);
  const [txHash, setTxHash] = useState(order.external_transaction_id || null);
  const autoTriggeredRef = useRef(false);

  const cryptoCurr = (order.crypto_currency || 'USDT').toUpperCase();
  const cryptoNet = order.crypto_network || 'Polygon';
  const supportsEvmMetaMask = cryptoCurr !== 'BTC';

  // Polling de status a cada 3 segundos enquanto status for 'pending'
  useEffect(() => {
    if (orderStatus === 'paid') return;

    const intervalId = setInterval(async () => {
      try {
        const data = await checkOrderStatusApi(order.order_id);
        if (data.status === 'paid') {
          setOrderStatus('paid');
          if (onOrderPaid) onOrderPaid(data);
        }
      } catch (err) {
        // Silencioso no polling contínuo
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [order.order_id, orderStatus, onOrderPaid]);

  const handlePayWithMetaMask = async () => {
    setWeb3Error(null);
    setWeb3Loading(true);
    try {
      const result = await payWithMetaMask({
        walletAddress: order.crypto_wallet_address,
        amount: order.crypto_amount,
        currency: cryptoCurr,
        network: cryptoNet,
      });

      setTxHash(result.txHash);

      const confirmed = await confirmWeb3PaymentApi(
        order.order_id,
        result.txHash,
        result.senderAddress
      );
      setOrderStatus('paid');
      if (onOrderPaid) onOrderPaid(confirmed);
    } catch (err) {
      setWeb3Error(
        err.message || 'Conexão ou assinatura cancelada na MetaMask. Tente novamente ou use o QR Code.'
      );
    } finally {
      setWeb3Loading(false);
    }
  };

  // Dispara automaticamente o popup da MetaMask ao abrir a tela caso a extensão esteja instalada
  useEffect(() => {
    if (
      !autoTriggeredRef.current &&
      orderStatus !== 'paid' &&
      supportsEvmMetaMask &&
      isMetaMaskInstalled()
    ) {
      autoTriggeredRef.current = true;
      handlePayWithMetaMask();
    }
  }, []);

  const handleCopyWallet = async () => {
    if (!order.crypto_wallet_address) return;
    try {
      await navigator.clipboard.writeText(order.crypto_wallet_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setCopied(true);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setSimulating(true);
      const res = await simulatePaymentApi(order.order_id);
      if (res.status === 'paid') {
        setOrderStatus('paid');
        if (onOrderPaid) onOrderPaid(res);
      }
    } catch (err) {
      alert(err.message || 'Erro ao simular confirmação de pagamento.');
    } finally {
      setSimulating(false);
    }
  };

  if (orderStatus === 'paid') {
    return (
      <div className="crypto-success-screen" data-testid="crypto-success-screen">
        <div className="crypto-success-icon-wrapper">
          <div className="crypto-success-icon-bg">
            <CheckCircle2 size={38} className="crypto-success-icon" />
          </div>
        </div>
        <h2 className="crypto-success-title">🎉 Pagamento Cripto Confirmado!</h2>
        <p className="crypto-success-subtitle">
          Sua transação de <strong>{order.crypto_amount} {cryptoCurr}</strong> foi validada com sucesso na blockchain.
        </p>

        <div className="crypto-order-badge">
          <span>Código do Pedido:</span>
          <strong>{order.order_code}</strong>
        </div>

        <div className="crypto-receipt-box">
          <div className="crypto-receipt-row">
            <span className="crypto-receipt-label">Status:</span>
            <span className="crypto-status-paid">
              <span className="crypto-status-dot" />
              Confirmado na Rede
            </span>
          </div>
          <div className="crypto-receipt-row">
            <span className="crypto-receipt-label">Rede Blockchain:</span>
            <span className="crypto-network-tag">{cryptoNet}</span>
          </div>
          <div className="crypto-receipt-row">
            <span className="crypto-receipt-label">Moeda:</span>
            <span className="crypto-currency-tag">{cryptoCurr}</span>
          </div>
          {txHash && (
            <div className="crypto-receipt-row">
              <span className="crypto-receipt-label">Hash da Transação:</span>
              <span className="crypto-tx-hash" data-testid="crypto-tx-hash" title={txHash}>
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </span>
            </div>
          )}
          <div className="crypto-receipt-row">
            <span className="crypto-receipt-label">Liberação de Acesso:</span>
            <span className="crypto-instant-badge">Imediata</span>
          </div>
        </div>

        <p className="crypto-instructions-note">
          Transação aprovada e validada com sucesso na blockchain.
        </p>
      </div>
    );
  }

  return (
    <div className="crypto-payment-container" data-testid="crypto-payment-container">
      {/* Cabeçalho */}
      <div className="crypto-payment-header">
        <button type="button" onClick={onBack} className="crypto-back-button" title="Voltar para opções">
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <div className="crypto-header-info">
          <span className="crypto-order-number">Pedido: {order.order_code}</span>
          <span className="crypto-total-highlight">
            {order.crypto_amount} {cryptoCurr}
          </span>
        </div>
      </div>

      {/* Conexão Direta Web3 / MetaMask */}
      {supportsEvmMetaMask && (
        <div className="crypto-metamask-box" data-testid="crypto-metamask-box">
          <div className="crypto-metamask-header">
            <Wallet size={20} className="crypto-metamask-icon" />
            <div>
              <h4>Pagamento Direto com Carteira Web3</h4>
              <p>Conecte sua extensão MetaMask para assinar e enviar em 1 clique na rede {cryptoNet}.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayWithMetaMask}
            disabled={web3Loading}
            className="crypto-metamask-button"
            data-testid="crypto-metamask-button"
          >
            <Wallet size={18} />
            <span>
              {web3Loading
                ? 'Aguardando confirmação na MetaMask...'
                : `🦊 Conectar e Pagar ${order.crypto_amount} ${cryptoCurr} com MetaMask`}
            </span>
          </button>

          {web3Error && (
            <div className="crypto-metamask-error" data-testid="crypto-metamask-error">
              <AlertCircle size={15} />
              <span>{web3Error}</span>
            </div>
          )}
        </div>
      )}

      {/* Alerta de Rede Importante */}
      <div className="crypto-network-alert" data-testid="crypto-network-alert">
        <ShieldAlert size={20} className="crypto-alert-icon" />
        <div className="crypto-alert-content">
          <strong>Atenção à Rede de Envio:</strong>
          <p>
            Envie exclusivamente via rede <strong>{cryptoNet}</strong>. Depósitos efetuados por outras redes resultarão em perda irreversível.
          </p>
        </div>
      </div>

      {/* Seção do QR Code */}
      <div className="crypto-qr-section">
        <div className="crypto-amount-badge">
          <Coins size={16} />
          <span>
            Valor a Enviar: <strong>{order.crypto_amount} {cryptoCurr}</strong> (~{formatCurrency(order.amount_usd || order.amount_brl / 5, 'USD')})
          </span>
        </div>

        <div className="crypto-qr-wrapper">
          {order.qr_code_base64 ? (
            <img
              src={order.qr_code_base64}
              alt="QR Code Carteira Cripto"
              className="crypto-qr-image"
              data-testid="crypto-qr-image"
            />
          ) : (
            <div className="crypto-qr-placeholder">Carregando QR Code...</div>
          )}
        </div>

        <p className="crypto-qr-instruction">
          Ou escaneie com a câmera do app da sua carteira no celular (MetaMask Mobile, Trust, Phantom).
        </p>
      </div>

      {/* Seção Copiar Endereço */}
      <div className="crypto-wallet-section">
        <label className="crypto-wallet-label">Endereço da Carteira para Depósito Manual:</label>
        <div className="crypto-wallet-input-group">
          <input
            type="text"
            readOnly
            value={order.crypto_wallet_address || ''}
            className="crypto-wallet-input"
            data-testid="crypto-wallet-input"
            onClick={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={handleCopyWallet}
            className={`crypto-copy-button ${copied ? 'copied' : ''}`}
            data-testid="crypto-copy-button"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copiar Endereço</span>
              </>
            )}
          </button>
        </div>
        {copied && (
          <p className="crypto-copied-feedback">Endereço copiado! Cole no seu aplicativo de carteira.</p>
        )}
      </div>

      {/* Indicador de Espera Blockchain */}
      <div className="crypto-waiting-indicator">
        <div className="crypto-pulse-dot" />
        <RefreshCw size={14} className="crypto-spin-icon" />
        <span>Aguardando detecção da transação na blockchain...</span>
      </div>

      {/* Caixa de Simulação Sandbox */}
      <div className="crypto-simulation-box">
        <div className="crypto-simulation-header">
          <Zap size={16} className="text-amber-600" />
          <span>Ambiente de Testes / Sandbox</span>
        </div>
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={simulating}
          className="crypto-simulate-button"
          data-testid="crypto-simulate-button"
        >
          <Zap size={15} />
          <span>{simulating ? 'Validando transação...' : 'Simular Confirmação Blockchain'}</span>
        </button>
      </div>
    </div>
  );
}
