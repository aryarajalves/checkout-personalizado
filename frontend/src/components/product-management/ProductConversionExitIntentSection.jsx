import React from 'react';
import { Tag } from 'lucide-react';

export default function ProductConversionExitIntentSection({
  enableExitIntent,
  setEnableExitIntent,
  exitIntentCouponId,
  setExitIntentCouponId,
  exitIntentTitle,
  setExitIntentTitle,
  exitIntentSubtitle,
  setExitIntentSubtitle,
  coupons,
  selectedCoupon,
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
          <Tag size={18} color="#d97706" />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              Desconto Relâmpago ao Sair (Exit-Intent Popup)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Exibe um pop-up com desconto quando o cliente tenta fechar a página ou voltar.
            </p>
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
          <input
            type="checkbox"
            checked={enableExitIntent}
            onChange={(e) => setEnableExitIntent(e.target.checked)}
            data-testid="toggle-enable-exit-intent"
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
              backgroundColor: enableExitIntent ? '#f59e0b' : '#cbd5e1',
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
                left: enableExitIntent ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: '0.2s',
              }}
            />
          </span>
        </label>
      </div>

      {enableExitIntent && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Cupom de Desconto Vinculado *
            </label>
            <select
              className="form-control-modern"
              value={exitIntentCouponId}
              onChange={(e) => setExitIntentCouponId(e.target.value)}
              data-testid="select-exit-intent-coupon"
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">Selecione um cupom cadastrado...</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.discount_percent}% de Desconto) {c.product_id ? '• Exclusivo deste produto' : '• Global'}
                </option>
              ))}
            </select>
            {coupons.length === 0 && (
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#dc2626' }}>
                Nenhum cupom ativo encontrado. Crie um cupom na aba Cupons primeiro.
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Título Chamativo do Pop-up
            </label>
            <input
              type="text"
              className="form-control-modern"
              value={exitIntentTitle}
              onChange={(e) => setExitIntentTitle(e.target.value)}
              data-testid="input-exit-intent-title"
              placeholder="Ex: Espere! Não perca esta oportunidade exclusiva"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Texto de Apoio / Subtítulo
            </label>
            <textarea
              className="form-control-modern"
              rows={2}
              value={exitIntentSubtitle}
              onChange={(e) => setExitIntentSubtitle(e.target.value)}
              data-testid="input-exit-intent-subtitle"
              placeholder="Ex: Liberamos um desconto especial de última chance para você concluir seu pedido agora!"
              style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          {selectedCoupon && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px dashed #f59e0b',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Tag size={16} color="#d97706" />
              <span>
                Cupom selecionado: <strong>{selectedCoupon.code}</strong> (
                {selectedCoupon.discount_percent}% OFF). O checkout aplicará automaticamente em 1 clique!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
