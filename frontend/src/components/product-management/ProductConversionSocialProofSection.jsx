import React from 'react';
import { Users, ShoppingBag } from 'lucide-react';

export default function ProductConversionSocialProofSection({
  enableSocialProof,
  setEnableSocialProof,
  socialProofMode,
  setSocialProofMode,
}) {
  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#2563eb" />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              Prova Social ao Vivo (Notificações Flutuantes)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Exibe pequenos avisos no canto inferior informando compras recentes de outros clientes.
            </p>
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
          <input
            type="checkbox"
            checked={enableSocialProof}
            onChange={(e) => setEnableSocialProof(e.target.checked)}
            data-testid="toggle-enable-social-proof"
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: enableSocialProof ? '#2563eb' : '#cbd5e1',
              borderRadius: '22px',
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '',
                height: '16px',
                width: '16px',
                left: enableSocialProof ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
              }}
            />
          </span>
        </label>
      </div>

      {enableSocialProof && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Origem dos Dados de Prova Social
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: socialProofMode === 'hybrid' ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${socialProofMode === 'hybrid' ? '#3b82f6' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="radio"
                  name="social_proof_mode"
                  value="hybrid"
                  checked={socialProofMode === 'hybrid'}
                  onChange={() => setSocialProofMode('hybrid')}
                  data-testid="radio-mode-hybrid"
                />
                <div>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Modo Híbrido (Recomendado)
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Mostra compras reais quando existirem e complementa com notificações simuladas para manter o checkout dinâmico.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: socialProofMode === 'simulated' ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${socialProofMode === 'simulated' ? '#3b82f6' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="radio"
                  name="social_proof_mode"
                  value="simulated"
                  checked={socialProofMode === 'simulated'}
                  onChange={() => setSocialProofMode('simulated')}
                  data-testid="radio-mode-simulated"
                />
                <div>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Modo Simulado
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Gera notificações com nomes e cidades brasileiras autênticas em intervalos realistas.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: socialProofMode === 'real' ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${socialProofMode === 'real' ? '#3b82f6' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <input
                  type="radio"
                  name="social_proof_mode"
                  value="real"
                  checked={socialProofMode === 'real'}
                  onChange={() => setSocialProofMode('real')}
                  data-testid="radio-mode-real"
                />
                <div>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Modo 100% Real
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Exibe apenas vendas pagas de clientes reais registrados neste produto.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Exemplo de preview do toast */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <ShoppingBag size={16} />
            </div>
            <div style={{ fontSize: '12px' }}>
              <div style={{ color: '#0f172a', fontWeight: 600 }}>
                Lucas M. <span style={{ color: '#64748b', fontWeight: 400 }}>de São Paulo - SP</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>
                Acabou de comprar via Pix • <strong style={{ color: '#059669' }}>há 2 min</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
