import React, { useState } from 'react';
import { Search, Download, Eye, RotateCcw, Trash2 } from 'lucide-react';
import OrdersPagination from './OrdersPagination';
import ConfirmDeleteOrderModal from './ConfirmDeleteOrderModal';

export default function OrdersReportTab({
  orders = [],
  totalOrders = 0,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  loading = false,
  searchTerm = '',
  onSearchChange,
  statusFilter = '',
  onStatusFilterChange,
  methodFilter = '',
  onMethodFilterChange,
  onExportCsv,
  onViewDetails,
  onOpenRefund,
  onDeleteOrder,
  onBulkDeleteOrders,
}) {
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !orders.some((o) => o.id === id)));
    } else {
      const pageIds = orders.map((o) => o.id);
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenSingleDelete = (order) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    setOrderToDelete(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (orderToDelete) {
        if (onDeleteOrder) await onDeleteOrder(orderToDelete.id);
        setSelectedOrderIds((prev) => prev.filter((id) => id !== orderToDelete.id));
      } else {
        if (onBulkDeleteOrders) await onBulkDeleteOrders(selectedOrderIds);
        setSelectedOrderIds([]);
      }
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

  const getStatusBadge = (status, refundReason) => {
    switch (status) {
      case 'paid':
        return <span className="sales-badge sales-badge-paid">Pago</span>;
      case 'pending':
        return <span className="sales-badge sales-badge-pending">Pendente</span>;
      case 'failed':
      case 'canceled':
        return <span className="sales-badge sales-badge-canceled">Cancelado</span>;
      case 'refunded':
        return (
          <div>
            <span className="sales-badge sales-badge-refunded">Reembolsado</span>
            {refundReason && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#9f1239',
                  marginTop: '2px',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={refundReason}
              >
                {refundReason}
              </div>
            )}
          </div>
        );
      default:
        return <span className="sales-badge">{status}</span>;
    }
  };

  const formatMethod = (method) => {
    switch (method) {
      case 'pix':
        return 'Pix';
      case 'credit_card':
        return 'Cartão';
      case 'crypto':
        return 'Cripto';
      default:
        return method;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="sales-toolbar">
        <div className="sales-search-box">
          <Search size={16} className="sales-search-icon" />
          <input
            type="text"
            className="sales-search-input"
            placeholder="Buscar por código, cliente ou e-mail..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="orders-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="sales-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            data-testid="orders-status-filter"
          >
            <option value="">Todos os status</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="canceled">Cancelados / Falhas</option>
            <option value="refunded">Reembolsados</option>
          </select>

          <select
            className="sales-filter-select"
            value={methodFilter}
            onChange={(e) => onMethodFilterChange(e.target.value)}
            data-testid="orders-method-filter"
          >
            <option value="">Todos os métodos</option>
            <option value="pix">Pix</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="crypto">Criptomoeda</option>
          </select>

          <button
            type="button"
            className="sales-btn-export"
            onClick={onExportCsv}
            data-testid="btn-export-orders-csv"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Barra Contextual de Ações em Massa */}
      {selectedOrderIds.length > 0 && (
        <div
          data-testid="orders-bulk-actions-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 600 }}>
              {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              data-testid="btn-clear-selection"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '12.5px',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              Desmarcar todos
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenBulkDelete}
            data-testid="btn-bulk-delete"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            <Trash2 size={14} />
            <span>Excluir selecionados ({selectedOrderIds.length})</span>
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="sales-table-wrapper" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <table className="sales-table" data-testid="orders-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleToggleSelectAll}
                  data-testid="select-all-orders-checkbox"
                  title="Selecionar todos da página atual"
                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                />
              </th>
              <th>Código</th>
              <th>Data/Hora</th>
              <th>Cliente</th>
              <th>Produto / Oferta</th>
              <th>Método</th>
              <th>Valor</th>
              <th>Status</th>
              <th>UTM Origem</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="sales-empty">Carregando pedidos...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="10" className="sales-empty" data-testid="orders-empty-message">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const isSelected = selectedOrderIds.includes(o.id);
                return (
                  <tr
                    key={o.id}
                    data-testid={`order-row-${o.id}`}
                    style={{ backgroundColor: isSelected ? '#f8fafc' : undefined }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOrder(o.id)}
                        data-testid={`select-order-checkbox-${o.id}`}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                        {o.order_code}
                      </strong>
                    </td>
                    <td>{formatDate(o.created_at)}</td>
                    <td>
                      <div><strong>{o.customer_name}</strong></div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{o.customer_email}</div>
                    </td>
                    <td>
                      <div>{o.product_name || `Produto #${o.product_id}`}</div>
                      {o.offer_name && (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{o.offer_name}</div>
                      )}
                    </td>
                    <td>{formatMethod(o.payment_method)}</td>
                    <td>
                      <strong>R$ {o.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </td>
                    <td>{getStatusBadge(o.status, o.refund_reason)}</td>
                    <td>
                      {o.utm_source ? (
                        <span className="sales-badge-utm">{o.utm_source}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>direto</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {o.status === 'paid' && onOpenRefund && (
                          <button
                            type="button"
                            className="sales-btn-view"
                            style={{ color: '#dc2626', borderColor: '#fee2e2', backgroundColor: '#fff1f2' }}
                            title="Estornar / Reembolsar Pedido"
                            onClick={() => onOpenRefund(o)}
                            data-testid={`refund-order-btn-${o.id}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="sales-btn-view"
                          title="Ver detalhes do pedido"
                          onClick={() => onViewDetails(o.id)}
                          data-testid={`view-order-btn-${o.id}`}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          className="sales-btn-view"
                          style={{ color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fff5f5' }}
                          title="Excluir Pedido"
                          onClick={() => handleOpenSingleDelete(o)}
                          data-testid={`delete-order-btn-${o.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação Integrada de 20 por página */}
      <OrdersPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalOrders || orders.length}
        onPageChange={onPageChange}
      />

      {/* Modal de Confirmação de Exclusão (Individual e em Massa) */}
      <ConfirmDeleteOrderModal
        isOpen={deleteModalOpen}
        order={orderToDelete}
        selectedCount={selectedOrderIds.length}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
      />
    </div>
  );
}
