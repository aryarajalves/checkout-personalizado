import React from 'react';
import { Timer, Flame, Clock } from 'lucide-react';

const TIMER_PRESETS = [5, 10, 15, 20, 30];

export default function TimerConfigSection({
  timerEnabled,
  setTimerEnabled,
  timerMinutes,
  setTimerMinutes,
  timerText,
  setTimerText,
  primaryColor = '#0284c7',
}) {
  return (
    <div className="timer-config-container" data-testid="timer-config-section">
      {/* Switch Ativar Cronômetro */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '10px',
          backgroundColor: timerEnabled ? '#eff6ff' : '#f8fafc',
          border: timerEnabled ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: timerEnabled ? '#dbeafe' : '#e2e8f0',
              color: timerEnabled ? '#1d4ed8' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Timer size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e293b' }}>
              Ativar Cronômetro de Escassez
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Exibe barra de contagem regressiva no topo do checkout para gerar urgência e acelerar compras.
            </div>
          </div>
        </div>

        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={timerEnabled}
            onChange={(e) => setTimerEnabled(e.target.checked)}
            data-testid="toggle-timer-enabled"
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
              backgroundColor: timerEnabled ? primaryColor : '#cbd5e1',
              borderRadius: '24px',
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: '18px',
                width: '18px',
                left: timerEnabled ? '22px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </span>
        </label>
      </div>

      {timerEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Minutos do Cronômetro */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Tempo Limite da Contagem Regressiva (Minutos)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {TIMER_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTimerMinutes(m)}
                  data-testid={`btn-timer-preset-${m}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: timerMinutes === m ? `2px solid ${primaryColor}` : '1px solid #cbd5e1',
                    backgroundColor: timerMinutes === m ? '#f0fdf4' : '#ffffff',
                    color: timerMinutes === m ? '#15803d' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {m} minutos
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  className="form-control-modern"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  data-testid="input-timer-minutes"
                  style={{ width: '80px', fontSize: '12.5px', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>min</span>
              </div>
            </div>
          </div>

          {/* Mensagem de Urgência */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Mensagem Persuasiva do Cronômetro
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={timerText}
              onChange={(e) => setTimerText(e.target.value)}
              placeholder="Ex: Esta oferta especial e exclusiva expira em:"
              data-testid="input-timer-text"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Prévia da Barra de Cronômetro no Checkout */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} color="#ea580c" />
              <span>Prévia da Barra no Topo do Checkout:</span>
            </div>
            <div
              data-testid="timer-live-preview"
              style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#c2410c',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Clock size={16} />
              <span>{timerText || 'Esta oferta especial expira em:'}</span>
              <span
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  letterSpacing: '0.04em',
                }}
              >
                {String(timerMinutes).padStart(2, '0')}:00
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
