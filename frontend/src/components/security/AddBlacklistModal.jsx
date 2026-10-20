import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import { createBlacklistEntryApi } from './securityApi';

export default function AddBlacklistModal({ isOpen, onClose, onSuccess, showFeedback }) {
  const [entryType, setEntryType] = useState('cpf');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) {
      showFeedback('error', 'Informe o valor para bloqueio (ex: CPF, e-mail, telefone ou IP).');
      return;
    }

    try {
      setLoading(true);
      await createBlacklistEntryApi({
        entry_type: entryType,
        value: value.trim(),
        reason: reason.trim() || 'Bloqueio preventivo manual',
        is_active: true,
      });
      showFeedback('success', 'Identificador adicionado à Blacklist com sucesso!');
      onSuccess();
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao adicionar entrada na Blacklist.');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (entryType) {
      case 'cpf': return 'Ex: 123.456.789-00 ou apenas números';
      case 'email': return 'Ex: golpista@fraude.com';
      case 'phone': return 'Ex: 11999998888 ou +5511999998888';
      case 'ip': return 'Ex: 192.168.1.100 ou 200.150.10.5';
      default: return 'Digite o valor...';
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="add-blacklist-modal-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="add-blacklist-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Novo Bloqueio na Blacklist</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Impeça novas compras no checkout para este identificador</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            data-testid="close-add-blacklist-modal-btn"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Tipo de Identificador
            </label>
            <select
              className="form-control-modern"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              data-testid="select-blacklist-entry-type"
              style={{ width: '100%', height: '40px', fontSize: '13px' }}
            >
              <option value="cpf">CPF do Comprador</option>
              <option value="email">Endereço de E-mail</option>
              <option value="phone">Número de Telefone / WhatsApp</option>
              <option value="ip">Endereço IP</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Valor a Bloquear
            </label>
            <input
              type="text"
              className="form-control-modern"
              placeholder={getPlaceholder()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-testid="input-blacklist-value"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              Motivo do Bloqueio (Auditoria)
            </label>
            <input
              type="text"
              className="form-control-modern"
              placeholder="Ex: Chargeback recorrente, teste de cartão, fraude confirmada..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-blacklist-reason"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="webhooks-btn-secondary"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-add-blacklist-btn"
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              data-testid="submit-add-blacklist-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#dc2626',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Check size={16} />
              <span>{loading ? 'Salvando...' : 'Bloquear Identificador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
