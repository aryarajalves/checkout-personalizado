import React, { useState, useEffect } from 'react';
import {
  Globe,
  X,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  fetchProductDomainApi,
  updateProductDomainApi,
  verifyProductDomainApi,
} from './productApi';

export default function ProductDomainModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [domain, setDomain] = useState('');
  const [domainInfo, setDomainInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadDomainInfo();
    } else {
      setDomain('');
      setDomainInfo(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, product]);

  const loadDomainInfo = async () => {
    try {
      setLoading(true);
      const data = await fetchProductDomainApi(product.id);
      setDomainInfo(data);
      setDomain(data.custom_domain || '');
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao carregar informações de domínio.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTarget = () => {
    const target = domainInfo?.cname_target || 'checkout.seudominiobase.com';
    navigator.clipboard.writeText(target);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSaving(true);
      const updated = await updateProductDomainApi(product.id, domain.trim() || null);
      setDomainInfo(updated);
      setDomain(updated.custom_domain || '');
      if (showFeedback) {
        showFeedback(
          'success',
          domain.trim()
            ? 'Domínio personalizado configurado com sucesso! Siga as instruções de DNS.'
            : 'Domínio personalizado desvinculado com sucesso.'
        );
      }
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao salvar domínio personalizado.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const result = await verifyProductDomainApi(product.id);
      setDomainInfo(result);
      if (showFeedback) {
        if (result.is_pointing) {
          showFeedback('success', result.message || 'Apontamento CNAME validado com sucesso!');
        } else {
          showFeedback('info', result.message || 'DNS ainda em propagação. Aguarde alguns minutos.');
        }
      }
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Falha ao verificar DNS.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setSaving(true);
      const updated = await updateProductDomainApi(product.id, null);
      setDomainInfo(updated);
      setDomain('');
      setShowDeleteConfirm(false);
      if (showFeedback) {
        showFeedback('success', 'Domínio próprio desvinculado do produto com sucesso.');
      }
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao remover domínio.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  const targetHost = domainInfo?.cname_target || 'checkout.seudominiobase.com';

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-domain-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-domain-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-modal-title">
            <Globe size={20} color="#0284c7" />
            <div>
              <h3>Domínio Próprio • CNAME Whitelabel</h3>
              <p>
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            disabled={saving}
            data-testid="btn-close-domain-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="webhooks-modal-body" style={{ padding: '20px' }}>
          {/* Instruções de Apontamento DNS */}
          <div
            style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Info size={16} color="#0284c7" />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0369a1' }}>
                Como Funciona o Apontamento CNAME Whitelabel
              </span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#0c4a6e', lineHeight: 1.45 }}>
              Para rodar o checkout no seu próprio domínio ou subdomínio (ex: <code>pay.seudominio.com.br</code>), crie uma entrada DNS no seu provedor de domínio (Cloudflare, Registro.br, Hostinger, GoDaddy):
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 40px',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid #e0f2fe',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11.5px',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>TIPO</span>
                <strong style={{ color: '#0284c7' }}>CNAME</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>DESTINO / VALOR</span>
                <code style={{ color: '#0f172a', fontWeight: 600 }}>{targetHost}</code>
              </div>
              <button
                type="button"
                onClick={handleCopyTarget}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: copied ? '#16a34a' : '#64748b',
                  padding: '4px',
                }}
                title="Copiar Destino CNAME"
                data-testid="btn-copy-cname-target"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Campo de Domínio */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Subdomínio ou Domínio do Checkout *
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Ex: pay.meudominio.com.br"
              data-testid="input-custom-domain"
              style={{ width: '100%', fontSize: '13px' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
              Informe o subdomínio ou domínio completo. Não inclua <code>https://</code> ou barras.
            </p>
          </div>

          {/* Status do Domínio e Verificação */}
          {domainInfo && domainInfo.custom_domain && (
            <div
              style={{
                backgroundColor: domainInfo.is_pointing ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${domainInfo.is_pointing ? '#bbf7d0' : '#fef3c7'}`,
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
              data-testid="domain-status-box"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {domainInfo.is_pointing ? (
                  <CheckCircle2 size={20} color="#16a34a" />
                ) : (
                  <Clock size={20} color="#d97706" />
                )}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: domainInfo.is_pointing ? '#166534' : '#92400e' }}>
                    {domainInfo.is_pointing ? 'CNAME Ativo e Conectado' : 'Aguardando Propagação DNS'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: domainInfo.is_pointing ? '#15803d' : '#b45309' }}>
                    {domainInfo.message}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={handleVerify}
                  disabled={verifying}
                  data-testid="btn-verify-domain"
                  style={{ fontSize: '11.5px', padding: '5px 10px', gap: '5px' }}
                  title="Testar apontamento DNS agora"
                >
                  <RefreshCw size={13} className={verifying ? 'spinning-icon' : ''} />
                  <span>{verifying ? 'Verificando...' : 'Verificar DNS'}</span>
                </button>

                {domainInfo.is_pointing && (
                  <a
                    href={`https://${domainInfo.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-action-btn"
                    style={{ fontSize: '11.5px', padding: '5px 10px', gap: '4px', textDecoration: 'none', color: '#0284c7' }}
                    title="Abrir no navegador"
                    data-testid="link-test-custom-domain"
                  >
                    <ExternalLink size={13} />
                    <span>Abrir</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="webhooks-modal-footer">
          <div>
            {domainInfo?.custom_domain && (
              <button
                type="button"
                className="webhooks-btn-secondary"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                data-testid="btn-request-remove-domain"
                style={{ color: '#ef4444', borderColor: '#fecaca', fontSize: '12px' }}
              >
                Desvincular Domínio
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="webhooks-btn-secondary"
              onClick={onClose}
              disabled={saving}
              data-testid="btn-cancel-domain"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="webhooks-btn-primary"
              onClick={handleSave}
              disabled={saving || loading}
              data-testid="btn-save-domain"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>

        {/* Popup de Confirmação de Remoção de Domínio */}
        {showDeleteConfirm && (
          <div
            className="confirmation-modal-overlay"
            data-testid="delete-domain-modal-overlay"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
            }}
          >
            <div
              className="confirmation-modal-dialog"
              data-testid="delete-domain-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                Desvincular Domínio Próprio?
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                O produto voltará a ser acessado exclusivamente pela URL padrão da plataforma (<code>/pay/{product.slug}</code>). O domínio <code>{domainInfo?.custom_domain}</code> deixará de resolver o checkout.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="webhooks-btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  data-testid="btn-cancel-remove-domain"
                  style={{ minWidth: '100px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger-action-btn"
                  onClick={handleConfirmDelete}
                  disabled={saving}
                  data-testid="btn-confirm-remove-domain"
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Confirmar Desvinculação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
