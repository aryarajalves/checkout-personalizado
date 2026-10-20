import React from 'react';

export default function BuyerAuthForm({
  authStep,
  setAuthStep,
  inputEmail,
  setInputEmail,
  inputCpf,
  setInputCpf,
  inputCode,
  setInputCode,
  handleRequestCode,
  handleVerifyCode,
  loading,
  error,
}) {
  return (
    <div className="buyer-auth-container">
      <div className="buyer-auth-card">
        <div className="buyer-auth-header">
          <div className="buyer-auth-badge">
            <span className="badge-dot" />
            Central do Aluno & Comprador
          </div>
          <h1 className="buyer-auth-title">Acesse Suas Compras</h1>
          <p className="buyer-auth-subtitle">
            {authStep === 'email'
              ? 'Consulte seus pedidos, acesse conteúdos, emita 2ª via de Pix ou gerencie assinaturas.'
              : `Digite o código de 6 dígitos que enviamos para ${inputEmail}`}
          </p>
        </div>

        {error && (
          <div className="buyer-auth-error-banner" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {authStep === 'email' ? (
          <form onSubmit={handleRequestCode} className="buyer-auth-form" noValidate>
            <div className="buyer-form-group">
              <label htmlFor="buyer-email" className="buyer-form-label">
                E-mail utilizado na compra <span className="required-asterisk">*</span>
              </label>
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  id="buyer-email"
                  type="email"
                  className="buyer-input-field"
                  placeholder="exemplo@gmail.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="buyer-form-group">
              <label htmlFor="buyer-cpf" className="buyer-form-label">
                CPF do Comprador <span className="optional-tag">(Opcional)</span>
              </label>
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="buyer-cpf"
                  type="text"
                  className="buyer-input-field"
                  placeholder="000.000.000-00"
                  value={inputCpf}
                  onChange={(e) => setInputCpf(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="buyer-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  Localizando compras...
                </>
              ) : (
                <>
                  <span>Continuar com Código por E-mail</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="buyer-auth-form" noValidate>
            <div className="buyer-form-group">
              <label htmlFor="buyer-code" className="buyer-form-label">
                Código de 6 Dígitos <span className="required-asterisk">*</span>
              </label>
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="buyer-code"
                  type="text"
                  maxLength={6}
                  className="buyer-input-field code-input"
                  placeholder="123456"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
              <p className="buyer-code-hint">
                Verifique sua caixa de entrada e spam. O código é válido por 15 minutos.
              </p>
            </div>

            <button type="submit" className="buyer-btn-primary" disabled={loading || inputCode.length < 4}>
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  Verificando...
                </>
              ) : (
                <>
                  <span>Acessar Minhas Compras</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>

            <div className="buyer-auth-actions-footer">
              <button
                type="button"
                className="buyer-btn-link"
                onClick={() => setAuthStep('email')}
                disabled={loading}
              >
                ← Alterar e-mail informado
              </button>
              <button
                type="button"
                className="buyer-btn-link"
                onClick={handleRequestCode}
                disabled={loading}
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        <div className="buyer-auth-security-notice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Ambiente seguro com criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}
