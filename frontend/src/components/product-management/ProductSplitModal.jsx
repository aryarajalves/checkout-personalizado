import React, { useState, useEffect } from 'react';
import { Share2, Plus, Trash2, X, Check, AlertCircle, AlertTriangle, Calendar } from 'lucide-react';

export default function ProductSplitModal({
  isOpen,
  product,
  availableRecipients,
  loading,
  onSave,
  onCancel,
}) {
  const [rules, setRules] = useState([]);
  const [duplicateError, setDuplicateError] = useState('');

  useEffect(() => {
    if (product && product.split_rules) {
      setRules(
        product.split_rules.map((r) => ({
          recipient_id: r.recipient_id,
          percentage: r.percentage,
          valid_until: r.valid_until ? r.valid_until.slice(0, 10) : '',
          is_expired: !!r.is_expired,
        }))
      );
    } else {
      setRules([]);
    }
    setDuplicateError('');
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const totalPercentage = rules.reduce((acc, curr) => acc + (parseFloat(curr.percentage) || 0), 0);
  const remainingPercentage = Math.max(0, 100 - totalPercentage);
  const isOver100 = totalPercentage > 100;

  // Identificar quais recebedores já foram selecionados para evitar duplicidade
  const selectedRecipientIds = new Set(rules.map((r) => r.recipient_id));
  const unselectedRecipients = availableRecipients.filter((r) => !selectedRecipientIds.has(r.id));
  const canAddMore = unselectedRecipients.length > 0;

  const handleAddRecipient = () => {
    if (!canAddMore) return;
    const nextRecipient = unselectedRecipients[0];
    const defaultPerc = remainingPercentage > 0 ? remainingPercentage : 10;
    setRules((prev) => [
      ...prev,
      {
        recipient_id: nextRecipient.id,
        percentage: Math.min(defaultPerc, 100),
        valid_until: '',
        is_expired: false,
      },
    ]);
    setDuplicateError('');
  };

  const handleRemoveRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setDuplicateError('');
  };

  const handleChangeRecipient = (index, recipientId) => {
    const numId = parseInt(recipientId, 10);
    // Verificar se já existe em outra linha
    const isAlreadyUsed = rules.some((r, i) => i !== index && r.recipient_id === numId);
    if (isAlreadyUsed) {
      setDuplicateError('Não é permitido adicionar o mesmo sócio mais de uma vez.');
      return;
    }
    setDuplicateError('');
    setRules((prev) => {
      const updated = [...prev];
      updated[index].recipient_id = numId;
      return updated;
    });
  };

  const handleChangePercentage = (index, value) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index].percentage = value === '' ? '' : parseFloat(value);
      return updated;
    });
  };

  const handleChangeValidUntil = (index, value) => {
    setRules((prev) => {
      const updated = [...prev];
      const isPast = value ? new Date(`${value}T23:59:59`) < new Date() : false;
      updated[index] = {
        ...updated[index],
        valid_until: value,
        is_expired: isPast,
      };
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isOver100) return;

    // Validação estrita de não duplicidade
    const recipientIds = rules.map((r) => r.recipient_id);
    const hasDuplicates = new Set(recipientIds).size !== recipientIds.length;
    if (hasDuplicates) {
      setDuplicateError('Não é permitido adicionar o mesmo sócio mais de uma vez.');
      return;
    }

    const formattedRules = rules.map((r) => ({
      recipient_id: r.recipient_id,
      percentage: parseFloat(r.percentage) || 0,
      valid_until: r.valid_until ? `${r.valid_until}T23:59:59Z` : null,
    }));

    onSave(product.id, formattedRules);
  };

  return (
    <div
      className="modal-backdrop-custom modal-overlay"
      data-testid="product-split-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="product-modal-dialog"
        data-testid="product-split-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="product-modal-header">
          <div className="product-modal-title-group">
            <div className="product-modal-icon-badge purple">
              <Share2 size={22} />
            </div>
            <div>
              <h3 className="product-modal-title">
                Divisão de Split: {product.name}
              </h3>
              <span className="product-modal-subtitle">
                Configure as porcentagens automáticas repassadas aos seus sócios
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="product-modal-close-btn"
            title="Fechar modal"
            data-testid="header-close-split-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Progresso Visual de 0 a 100% */}
        <div className="split-progress-box">
          <div className="split-progress-labels">
            <span style={{ fontWeight: 600, color: '#475569' }}>Divisão do Pagamento:</span>
            <span style={{ fontWeight: 700, color: isOver100 ? '#dc2626' : '#7c3aed' }}>
              {totalPercentage.toFixed(1)}% Sócios / {remainingPercentage.toFixed(1)}% Você
            </span>
          </div>
          <div className="split-track">
            <div
              className={`split-fill ${isOver100 ? 'danger' : ''}`}
              style={{ width: `${Math.min(100, totalPercentage)}%` }}
            />
          </div>
          <div className="split-summary-footer">
            <span>
              {remainingPercentage > 0
                ? `Sua conta principal receberá ${remainingPercentage.toFixed(1)}% do valor líquido.`
                : isOver100
                ? '⚠️ A soma ultrapassou 100%! Reduza as porcentagens antes de salvar.'
                : '100% do valor da venda está distribuído.'}
            </span>
          </div>
        </div>

        {/* Alerta de Duplicidade */}
        {duplicateError && (
          <div className="form-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{duplicateError}</span>
          </div>
        )}

        {availableRecipients.length === 0 ? (
          <div>
            <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertCircle size={28} />
              </div>
              <h4 style={{ color: '#0f172a', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>
                Nenhum recebedor cadastrado no sistema
              </h4>
              <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                Acesse a aba <strong>"Gateways & Split"</strong> para cadastrar seus sócios e coprodutores antes de vincular a este produto.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={onCancel}
                data-testid="close-empty-split-modal-btn"
              >
                <X size={15} />
                <span>Fechar</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
                  Sócios Participantes ({rules.length})
                </span>
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={handleAddRecipient}
                  disabled={!canAddMore}
                  title={!canAddMore ? 'Todos os sócios disponíveis já foram adicionados' : 'Adicionar novo sócio'}
                  data-testid="add-split-rule-btn"
                  style={{ opacity: canAddMore ? 1 : 0.6 }}
                >
                  <Plus size={14} />
                  <span>{canAddMore ? 'Adicionar Sócio' : 'Todos os Sócios Adicionados'}</span>
                </button>
              </div>

              {rules.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '13.5px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
                  Nenhum split configurado para este produto. 100% dos recebimentos ficarão na sua conta principal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rules.map((rule, idx) => {
                    return (
                      <div
                        key={idx}
                        className="split-recipient-card"
                        data-testid={`split-rule-row-${idx}`}
                      >
                        <select
                          className="split-recipient-select"
                          value={rule.recipient_id}
                          onChange={(e) => handleChangeRecipient(idx, e.target.value)}
                          data-testid={`select-recipient-${idx}`}
                        >
                          {availableRecipients.map((rec) => {
                            const isSelectedInOtherRow = rules.some(
                              (r, i) => i !== idx && r.recipient_id === rec.id
                            );
                            return (
                              <option
                                key={rec.id}
                                value={rec.id}
                                disabled={isSelectedInOtherRow}
                              >
                                {rec.name} {rec.document ? `(${rec.document})` : ''} {isSelectedInOtherRow ? '— (Já adicionado)' : ''}
                              </option>
                            );
                          })}
                        </select>

                        <div className="split-percentage-wrapper">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="100"
                            placeholder="0"
                            className="split-percentage-input"
                            value={rule.percentage !== undefined && rule.percentage !== null ? rule.percentage : ''}
                            onChange={(e) => handleChangePercentage(idx, e.target.value)}
                            data-testid={`input-split-percentage-${idx}`}
                          />
                          <span className="split-percentage-symbol">%</span>
                        </div>

                        {/* Prazo de Contrato (Opcional) */}
                        <div
                          className="split-contract-box"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: rule.is_expired ? '#fef2f2' : '#f8fafc',
                            border: rule.is_expired ? '1px solid #fecaca' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '4px 8px',
                          }}
                          title="Data limite de expiração do contrato (em branco para vitalício)"
                        >
                          <Calendar size={13} style={{ color: rule.is_expired ? '#dc2626' : '#64748b', flexShrink: 0 }} />
                          <input
                            type="date"
                            value={rule.valid_until || ''}
                            onChange={(e) => handleChangeValidUntil(idx, e.target.value)}
                            data-testid={`input-split-valid-until-${idx}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              fontSize: '12px',
                              color: rule.is_expired ? '#dc2626' : '#334155',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          />
                          {rule.is_expired ? (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#dc2626',
                                backgroundColor: '#fee2e2',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                              data-testid={`badge-expired-${idx}`}
                            >
                              Expirado
                            </span>
                          ) : rule.valid_until ? (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#059669',
                                backgroundColor: '#ecfdf5',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Ativo
                            </span>
                          ) : null}
                        </div>

                        {product.price_brl > 0 && (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                              minWidth: '65px',
                              textAlign: 'right',
                              flexShrink: 0,
                            }}
                            title="Valor repassado estimado por venda"
                          >
                            ≈ R$ {((product.price_brl * (parseFloat(rule.percentage) || 0)) / 100).toFixed(2).replace('.', ',')}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="action-delete-btn"
                          title="Remover sócio deste split"
                          data-testid={`remove-split-rule-${idx}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={onCancel}
                disabled={loading}
                data-testid="cancel-split-modal-btn"
              >
                <X size={15} />
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                className="primary-action-btn"
                disabled={loading || isOver100 || !!duplicateError}
                data-testid="save-split-modal-btn"
                style={{ backgroundColor: '#7c3aed' }}
              >
                <Check size={15} />
                <span>{loading ? 'Salvando...' : 'Salvar Split'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
