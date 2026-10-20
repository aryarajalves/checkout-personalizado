import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, DollarSign, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchMyFinancialProfileApi, updateMyFinancialProfileApi, updateMyProfileApi } from './userSettingsApi';
import { useToast } from '../../context/ToastContext';
import '../../styles/user-settings.css';

export default function UserSettingsModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('financial'); // 'account' | 'financial'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [financialForm, setFinancialForm] = useState({
    document: '',
    document_type: 'cpf',
    phone: '',
    pix_key_type: 'cpf',
    pix_key: '',
    crypto_wallet: '',
    crypto_network: 'Polygon',
    external_recipient_id: '',
  });

  const [hasFinancialProfile, setHasFinancialProfile] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    setAccountForm({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      current_password: '',
      new_password: '',
      confirm_password: '',
    });

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoading(true);
    fetchMyFinancialProfileApi(token)
      .then((data) => {
        setFinancialForm({
          document: data.document || '',
          document_type: data.document_type || 'cpf',
          phone: data.phone || '',
          pix_key_type: data.pix_key_type || 'cpf',
          pix_key: data.pix_key || '',
          crypto_wallet: data.crypto_wallet || '',
          crypto_network: data.crypto_network || 'Polygon',
          external_recipient_id: data.external_recipient_id || '',
        });
        setHasFinancialProfile(!!data.has_financial_profile);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados financeiros:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    if (!token) {
      addToast('Sessão expirada. Faça login novamente.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (activeTab === 'account') {
        if (accountForm.new_password) {
          if (!accountForm.current_password) {
            addToast('Informe a senha atual para definir uma nova senha.', 'error');
            setSaving(false);
            return;
          }
          if (accountForm.new_password !== accountForm.confirm_password) {
            addToast('A nova senha e a confirmação não coincidem.', 'error');
            setSaving(false);
            return;
          }
          if (accountForm.new_password.length < 6) {
            addToast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
            setSaving(false);
            return;
          }
        }

        const updatePayload = {
          name: accountForm.name,
          current_password: accountForm.current_password || undefined,
          new_password: accountForm.new_password || undefined,
        };

        const updated = await updateMyProfileApi(updatePayload, token);
        addToast('Dados da conta atualizados com sucesso!', 'success');
        if (onUserUpdated) onUserUpdated(updated);
        setAccountForm((prev) => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
        }));
      } else {
        // Tab de dados financeiros
        const res = await updateMyFinancialProfileApi(financialForm, token);
        setHasFinancialProfile(!!res.has_financial_profile);
        addToast('Dados de repasse (Pix / Split / Afiliado) atualizados!', 'success');
        if (onUserUpdated) {
          onUserUpdated({ ...currentUser, has_financial_profile: res.has_financial_profile });
        }
      }
    } catch (err) {
      addToast(err.message || 'Erro ao salvar alterações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="user-settings-overlay"
      data-testid="user-settings-overlay"
      onClick={(e) => {
        // Regra: NÃO fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="user-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-settings-modal-title"
        data-testid="user-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="user-settings-header">
          <div className="user-settings-header-title">
            <div className="user-settings-header-icon">
              {activeTab === 'financial' ? <DollarSign size={22} /> : <User size={22} />}
            </div>
            <div>
              <h3 id="user-settings-modal-title" className="user-settings-title">
                {activeTab === 'financial' ? 'Dados de Repasse & Pix' : 'Minha Conta'}
              </h3>
              <p className="user-settings-subtitle">
                {activeTab === 'financial'
                  ? 'Recebimento de coprodutor (Split) e comissões de afiliado'
                  : 'Gerencie seu nome e credenciais de acesso'}
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="user-settings-tabs">
          <button
            type="button"
            className={`user-settings-tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
            data-testid="tab-financial-settings"
          >
            <DollarSign size={15} />
            <span>Dados de Repasse (Split / Pix)</span>
          </button>
          <button
            type="button"
            className={`user-settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
            data-testid="tab-account-settings"
          >
            <ShieldCheck size={15} />
            <span>Minha Conta</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="user-settings-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Loader2 size={30} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '10px', fontSize: '13px' }}>Carregando dados...</p>
              </div>
            ) : activeTab === 'financial' ? (
              <>
                <div
                  className={`financial-badge-wrapper ${hasFinancialProfile ? 'configured' : 'pending'}`}
                  data-testid="financial-status-badge"
                >
                  <div className="financial-badge-title">
                    {hasFinancialProfile ? (
                      <>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <span>Dados de Repasse Configurados</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} color="#d97706" />
                        <span>Configuração Pendente</span>
                      </>
                    )}
                  </div>
                  <span className="financial-badge-text">
                    {hasFinancialProfile
                      ? 'Pronto para receber splits e comissões'
                      : 'Preencha sua chave Pix abaixo para habilitar repasses'}
                  </span>
                </div>

                <div className="user-settings-grid-2">
                  <div className="user-settings-field">
                    <label className="user-settings-label">Tipo de Documento</label>
                    <select
                      className="user-settings-select"
                      value={financialForm.document_type}
                      onChange={(e) => setFinancialForm({ ...financialForm, document_type: e.target.value })}
                      data-testid="select-doc-type"
                    >
                      <option value="cpf">CPF (Pessoa Física)</option>
                      <option value="cnpj">CNPJ (Pessoa Jurídica)</option>
                    </select>
                  </div>
                  <div className="user-settings-field">
                    <label className="user-settings-label">Número do CPF / CNPJ</label>
                    <input
                      type="text"
                      className="user-settings-input"
                      placeholder="000.000.000-00"
                      value={financialForm.document}
                      onChange={(e) => setFinancialForm({ ...financialForm, document: e.target.value })}
                      data-testid="input-financial-doc"
                    />
                  </div>
                </div>

                <div className="user-settings-grid-2">
                  <div className="user-settings-field">
                    <label className="user-settings-label">Tipo de Chave Pix</label>
                    <select
                      className="user-settings-select"
                      value={financialForm.pix_key_type}
                      onChange={(e) => setFinancialForm({ ...financialForm, pix_key_type: e.target.value })}
                      data-testid="select-pix-type"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone / Celular</option>
                      <option value="random">Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div className="user-settings-field">
                    <label className="user-settings-label">Chave Pix</label>
                    <input
                      type="text"
                      className="user-settings-input"
                      placeholder="Informe sua chave Pix"
                      value={financialForm.pix_key}
                      onChange={(e) => setFinancialForm({ ...financialForm, pix_key: e.target.value })}
                      data-testid="input-financial-pix"
                    />
                  </div>
                </div>

                <div className="user-settings-field">
                  <label className="user-settings-label">WhatsApp / Telefone para Contato</label>
                  <input
                    type="text"
                    className="user-settings-input"
                    placeholder="(11) 99999-9999"
                    value={financialForm.phone}
                    onChange={(e) => setFinancialForm({ ...financialForm, phone: e.target.value })}
                    data-testid="input-financial-phone"
                  />
                </div>

                <div className="user-settings-grid-2">
                  <div className="user-settings-field">
                    <label className="user-settings-label">Carteira Web3 (Opcional - Crypto)</label>
                    <input
                      type="text"
                      className="user-settings-input"
                      placeholder="0x..."
                      value={financialForm.crypto_wallet}
                      onChange={(e) => setFinancialForm({ ...financialForm, crypto_wallet: e.target.value })}
                      data-testid="input-crypto-wallet"
                    />
                  </div>
                  <div className="user-settings-field">
                    <label className="user-settings-label">Rede Crypto</label>
                    <select
                      className="user-settings-select"
                      value={financialForm.crypto_network}
                      onChange={(e) => setFinancialForm({ ...financialForm, crypto_network: e.target.value })}
                      data-testid="select-crypto-network"
                    >
                      <option value="Polygon">Polygon (POL/USDT)</option>
                      <option value="Ethereum">Ethereum (ETH/USDT)</option>
                      <option value="BSC">BNB Chain (BSC)</option>
                      <option value="Tron">Tron (TRC-20)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="user-settings-field">
                  <label className="user-settings-label">Nome Completo</label>
                  <input
                    type="text"
                    className="user-settings-input"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    required
                    data-testid="input-account-name"
                  />
                </div>

                <div className="user-settings-field">
                  <label className="user-settings-label">E-mail Cadastrado</label>
                  <input
                    type="email"
                    className="user-settings-input"
                    value={accountForm.email}
                    readOnly
                    data-testid="input-account-email"
                  />
                  <span className="user-settings-help">O e-mail de acesso não pode ser alterado diretamente.</span>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Alteração de Senha (Opcional)</span>
                </div>

                <div className="user-settings-field">
                  <label className="user-settings-label">Senha Atual</label>
                  <input
                    type="password"
                    className="user-settings-input"
                    placeholder="Digite sua senha atual"
                    value={accountForm.current_password}
                    onChange={(e) => setAccountForm({ ...accountForm, current_password: e.target.value })}
                    data-testid="input-current-password"
                  />
                </div>

                <div className="user-settings-grid-2">
                  <div className="user-settings-field">
                    <label className="user-settings-label">Nova Senha</label>
                    <input
                      type="password"
                      className="user-settings-input"
                      placeholder="Mínimo 6 caracteres"
                      value={accountForm.new_password}
                      onChange={(e) => setAccountForm({ ...accountForm, new_password: e.target.value })}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="user-settings-field">
                    <label className="user-settings-label">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      className="user-settings-input"
                      placeholder="Repita a nova senha"
                      value={accountForm.confirm_password}
                      onChange={(e) => setAccountForm({ ...accountForm, confirm_password: e.target.value })}
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Rodapé com exatamente 1 botão de fechar/cancelar e 1 botão de ação principal */}
          <div className="user-settings-footer">
            <button
              type="button"
              className="user-settings-cancel-btn"
              onClick={onClose}
              disabled={saving}
              data-testid="cancel-user-settings-btn"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="user-settings-save-btn"
              disabled={saving || loading}
              data-testid="save-user-settings-btn"
            >
              {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
