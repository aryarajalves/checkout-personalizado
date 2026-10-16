import React, { useState } from 'react';
import { CreditCard, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw, Send, Coins } from 'lucide-react';

export default function GatewayCards({
  gateways,
  loading,
  testingGateway,
  savingGateway,
  onTestConnection,
  onSaveGateway,
}) {
  const [formData, setFormData] = useState({});
  const [showKeys, setShowKeys] = useState({});

  // Helper para ler o valor de um campo (do form local ou do objeto carregado da API)
  const getValue = (gatewayName, field) => {
    if (formData[gatewayName] && formData[gatewayName][field] !== undefined) {
      return formData[gatewayName][field];
    }
    const current = gateways.find((g) => g.gateway_name === gatewayName);
    if (!current) return '';
    if (field === 'api_key') return current.api_key_masked || '';
    if (field === 'webhook_secret') return current.webhook_secret_masked || '';
    return current[field] || '';
  };

  const getBoolean = (gatewayName, field, defaultVal = false) => {
    if (formData[gatewayName] && formData[gatewayName][field] !== undefined) {
      return formData[gatewayName][field];
    }
    const current = gateways.find((g) => g.gateway_name === gatewayName);
    return current ? current[field] : defaultVal;
  };

  const getEnv = (gatewayName) => {
    if (formData[gatewayName] && formData[gatewayName].environment !== undefined) {
      return formData[gatewayName].environment;
    }
    const current = gateways.find((g) => g.gateway_name === gatewayName);
    return current ? current.environment : 'sandbox';
  };

  const handleChange = (gatewayName, field, val) => {
    setFormData((prev) => ({
      ...prev,
      [gatewayName]: {
        ...prev[gatewayName],
        [field]: val,
      },
    }));
  };

  const toggleShowKey = (keyId) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleSave = (gatewayName) => {
    const current = gateways.find((g) => g.gateway_name === gatewayName) || {};
    const local = formData[gatewayName] || {};

    const payload = {
      gateway_name: gatewayName,
      is_active: local.is_active !== undefined ? local.is_active : current.is_active || false,
      environment: local.environment !== undefined ? local.environment : current.environment || 'sandbox',
      api_key: local.api_key !== undefined ? local.api_key : undefined,
      public_key: local.public_key !== undefined ? local.public_key : current.public_key,
      webhook_secret: local.webhook_secret !== undefined ? local.webhook_secret : undefined,
      merchant_id: local.merchant_id !== undefined ? local.merchant_id : current.merchant_id,
    };
    onSaveGateway(payload);
  };

  const handleTest = (gatewayName) => {
    const current = gateways.find((g) => g.gateway_name === gatewayName) || {};
    const local = formData[gatewayName] || {};

    const payload = {
      gateway_name: gatewayName,
      environment: local.environment !== undefined ? local.environment : current.environment || 'sandbox',
      api_key: local.api_key !== undefined ? local.api_key : undefined,
    };
    onTestConnection(payload);
  };

  if (loading && (!gateways || gateways.length === 0)) {
    return (
      <div className="loading-state-container" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={24} className="spinning-icon" />
        <p style={{ marginTop: '10px', color: '#64748b' }}>Carregando integrações de pagamento...</p>
      </div>
    );
  }

  return (
    <div className="gateway-cards-grid" data-testid="gateway-cards-container">
      {/* ---------------- CARD 1: PAGAR.ME ---------------- */}
      <div className="gateway-card glass-panel" data-testid="card-pagarme">
        <div className="gateway-card-header">
          <div className="gateway-title-box">
            <div className="gateway-icon-badge pagarme-badge">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="gateway-name">Pagar.me (Stone Co.)</h3>
              <span className="gateway-desc">Cartão de Crédito e Pix com Split nativo</span>
            </div>
          </div>

          <div className="gateway-switch-box">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={getBoolean('pagarme', 'is_active', false)}
                onChange={(e) => handleChange('pagarme', 'is_active', e.target.checked)}
                data-testid="toggle-pagarme-active"
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`status-pill ${getBoolean('pagarme', 'is_active') ? 'active' : 'inactive'}`}>
              {getBoolean('pagarme', 'is_active') ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="gateway-env-selector">
          <span className="env-label">Ambiente:</span>
          <div className="env-toggle-group">
            <button
              type="button"
              className={`env-btn ${getEnv('pagarme') === 'sandbox' ? 'active' : ''}`}
              onClick={() => handleChange('pagarme', 'environment', 'sandbox')}
              data-testid="env-pagarme-sandbox"
            >
              Sandbox (Testes)
            </button>
            <button
              type="button"
              className={`env-btn ${getEnv('pagarme') === 'production' ? 'active' : ''}`}
              onClick={() => handleChange('pagarme', 'environment', 'production')}
              data-testid="env-pagarme-production"
            >
              Produção
            </button>
          </div>
        </div>

        <div className="gateway-fields">
          <div className="form-group">
            <label>Chave Secreta (Secret Key - Backend) *</label>
            <div className="password-input-wrapper">
              <input
                type={showKeys['pagarme_secret'] ? 'text' : 'password'}
                className="form-input"
                placeholder="sk_test_..."
                value={getValue('pagarme', 'api_key')}
                onChange={(e) => handleChange('pagarme', 'api_key', e.target.value)}
                data-testid="input-pagarme-secret"
              />
              <button
                type="button"
                className="toggle-visibility-btn"
                onClick={() => toggleShowKey('pagarme_secret')}
                title="Mostrar/Ocultar"
              >
                {showKeys['pagarme_secret'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Chave Pública (Public Key - Tokenização do Cartão)</label>
            <input
              type="text"
              className="form-input"
              placeholder="pk_test_..."
              value={getValue('pagarme', 'public_key')}
              onChange={(e) => handleChange('pagarme', 'public_key', e.target.value)}
              data-testid="input-pagarme-public"
            />
          </div>

          <div className="form-group">
            <label>Segredo de Webhook (Webhook Secret)</label>
            <input
              type="password"
              className="form-input"
              placeholder="whsec_..."
              value={getValue('pagarme', 'webhook_secret')}
              onChange={(e) => handleChange('pagarme', 'webhook_secret', e.target.value)}
              data-testid="input-pagarme-webhook"
            />
          </div>
        </div>

        <div className="gateway-card-actions">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => handleTest('pagarme')}
            disabled={testingGateway === 'pagarme'}
            data-testid="test-pagarme-btn"
          >
            {testingGateway === 'pagarme' ? <RefreshCw size={15} className="spinning-icon" /> : <Send size={15} />}
            <span>Testar Conexão</span>
          </button>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => handleSave('pagarme')}
            disabled={savingGateway === 'pagarme'}
            data-testid="save-pagarme-btn"
          >
            {savingGateway === 'pagarme' ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* ---------------- CARD 2: NOWPAYMENTS (CRIPTO) ---------------- */}
      <div className="gateway-card glass-panel" data-testid="card-nowpayments">
        <div className="gateway-card-header">
          <div className="gateway-title-box">
            <div className="gateway-icon-badge nowpayments-badge">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="gateway-name">NOWPayments (Cripto)</h3>
              <span className="gateway-desc">BTC, ETH, USDC direto na sua MetaMask</span>
            </div>
          </div>

          <div className="gateway-switch-box">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={getBoolean('nowpayments', 'is_active', false)}
                onChange={(e) => handleChange('nowpayments', 'is_active', e.target.checked)}
                data-testid="toggle-nowpayments-active"
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`status-pill ${getBoolean('nowpayments', 'is_active') ? 'active' : 'inactive'}`}>
              {getBoolean('nowpayments', 'is_active') ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div className="gateway-env-selector">
          <span className="env-label">Ambiente:</span>
          <div className="env-toggle-group">
            <button
              type="button"
              className={`env-btn ${getEnv('nowpayments') === 'sandbox' ? 'active' : ''}`}
              onClick={() => handleChange('nowpayments', 'environment', 'sandbox')}
              data-testid="env-nowpayments-sandbox"
            >
              Sandbox (Testes)
            </button>
            <button
              type="button"
              className={`env-btn ${getEnv('nowpayments') === 'production' ? 'active' : ''}`}
              onClick={() => handleChange('nowpayments', 'environment', 'production')}
              data-testid="env-nowpayments-production"
            >
              Produção
            </button>
          </div>
        </div>

        <div className="gateway-fields">
          <div className="form-group">
            <label>Chave de API (x-api-key) *</label>
            <div className="password-input-wrapper">
              <input
                type={showKeys['nowp_secret'] ? 'text' : 'password'}
                className="form-input"
                placeholder="Insira sua API Key do NOWPayments"
                value={getValue('nowpayments', 'api_key')}
                onChange={(e) => handleChange('nowpayments', 'api_key', e.target.value)}
                data-testid="input-nowpayments-secret"
              />
              <button
                type="button"
                className="toggle-visibility-btn"
                onClick={() => toggleShowKey('nowp_secret')}
                title="Mostrar/Ocultar"
              >
                {showKeys['nowp_secret'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Chave Secreta de IPN / Webhook</label>
            <input
              type="password"
              className="form-input"
              placeholder="IPN Secret Key"
              value={getValue('nowpayments', 'webhook_secret')}
              onChange={(e) => handleChange('nowpayments', 'webhook_secret', e.target.value)}
              data-testid="input-nowpayments-webhook"
            />
          </div>
        </div>

        <div className="gateway-card-actions">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => handleTest('nowpayments')}
            disabled={testingGateway === 'nowpayments'}
            data-testid="test-nowpayments-btn"
          >
            {testingGateway === 'nowpayments' ? <RefreshCw size={15} className="spinning-icon" /> : <Send size={15} />}
            <span>Testar Conexão</span>
          </button>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => handleSave('nowpayments')}
            disabled={savingGateway === 'nowpayments'}
            data-testid="save-nowpayments-btn"
          >
            {savingGateway === 'nowpayments' ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
