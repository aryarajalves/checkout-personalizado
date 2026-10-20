import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sliders, Check } from 'lucide-react';
import { fetchSecuritySettingsApi, updateSecuritySettingsApi } from './securityApi';

export default function SecuritySettingsSection({ showFeedback }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    velocity_threshold: 5,
    velocity_window_minutes: 10,
    auto_blacklist_on_chargeback: true,
    is_velocity_enabled: true,
    is_blacklist_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSecuritySettingsApi();
      setSettings(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar configurações de segurança.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await updateSecuritySettingsApi(settings);
      setSettings(updated);
      showFeedback('success', 'Configurações de segurança atualizadas com sucesso!');
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <p>Carregando configurações de segurança...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sliders size={22} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Parâmetros do Escudo Anti-Carding & Velocity Check</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Ajuste a tolerância de tentativas de pagamento e bloqueios automáticos</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Threshold de Tentativas */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              Tentativas Recusadas Toleradas (Velocity Check)
            </label>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
              Número de falhas no cartão antes do bloqueio preventivo (padrão: 5).
            </p>
            <input
              type="number"
              min="1"
              max="50"
              className="form-control-modern"
              value={settings.velocity_threshold}
              onChange={(e) => setSettings((s) => ({ ...s, velocity_threshold: parseInt(e.target.value) || 1 }))}
              data-testid="input-velocity-threshold"
              style={{ width: '100%', fontSize: '14px', fontWeight: 600 }}
            />
          </div>

          {/* Janela de Tempo em Minutos */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              Janela de Tempo para Contagem (Minutos)
            </label>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
              Intervalo de monitoramento de falhas por IP/CPF (padrão: 10 minutos).
            </p>
            <input
              type="number"
              min="1"
              max="1440"
              className="form-control-modern"
              value={settings.velocity_window_minutes}
              onChange={(e) => setSettings((s) => ({ ...s, velocity_window_minutes: parseInt(e.target.value) || 1 }))}
              data-testid="input-velocity-window"
              style={{ width: '100%', fontSize: '14px', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Toggles de Segurança */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Mecanismos Ativos de Proteção</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={settings.is_velocity_enabled}
                onChange={(e) => setSettings((s) => ({ ...s, is_velocity_enabled: e.target.checked }))}
                data-testid="toggle-velocity-enabled"
                style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                  Ativar Velocity Check em Tempo Real
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Suspende o cartão temporariamente e orienta o cliente para o Pix caso exceda 5 tentativas em 10 minutos.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={settings.is_blacklist_enabled}
                onChange={(e) => setSettings((s) => ({ ...s, is_blacklist_enabled: e.target.checked }))}
                data-testid="toggle-blacklist-enabled"
                style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                  Ativar Blacklist Própria
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Rejeita imediatamente transações de CPFs, e-mails, telefones e IPs cadastrados na Lista Negra.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                checked={settings.auto_blacklist_on_chargeback}
                onChange={(e) => setSettings((s) => ({ ...s, auto_blacklist_on_chargeback: e.target.checked }))}
                data-testid="toggle-auto-chargeback-blacklist"
                style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'block' }}>
                  Auto-Blacklist em caso de Chargeback
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Insere automaticamente CPF, e-mail e telefone de pedidos contestados na Blacklist para evitar reincidência.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            data-testid="save-security-settings-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <Check size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar Parâmetros'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
