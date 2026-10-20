import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SecurityManagement from './SecurityManagement';
import * as securityApi from './securityApi';

vi.mock('./securityApi');

const mockEntries = [
  {
    id: 1,
    client_id: 1,
    entry_type: 'cpf',
    value: '12345678909',
    reason: 'Fraude confirmada em estorno',
    is_active: true,
    created_at: '2026-10-17T12:00:00Z',
    updated_at: '2026-10-17T12:00:00Z',
  },
  {
    id: 2,
    client_id: 1,
    entry_type: 'email',
    value: 'golpista@fraude.com',
    reason: 'Tentativa recorrente de carding',
    is_active: false,
    created_at: '2026-10-17T13:00:00Z',
    updated_at: '2026-10-17T13:00:00Z',
  },
];

const mockSettings = {
  id: 1,
  client_id: 1,
  velocity_threshold: 5,
  velocity_window_minutes: 10,
  auto_blacklist_on_chargeback: true,
  is_velocity_enabled: true,
  is_blacklist_enabled: true,
  created_at: '2026-10-17T12:00:00Z',
  updated_at: '2026-10-17T12:00:00Z',
};

const mockAttempts = [
  {
    id: 101,
    client_id: 1,
    status: 'declined',
    reason: 'Cartão recusado pelo emissor',
    card_last_four: '4242',
    card_brand: 'visa',
    ip_address: '189.10.20.30',
    email: 'comprador@teste.com',
    cpf: '12345678909',
    created_at: '2026-10-17T14:00:00Z',
  },
  {
    id: 102,
    client_id: 1,
    status: 'blocked',
    reason: 'Limite de velocity atingido',
    card_last_four: '1111',
    card_brand: 'mastercard',
    ip_address: '189.10.20.30',
    email: 'comprador@teste.com',
    cpf: '12345678909',
    created_at: '2026-10-17T14:05:00Z',
  },
];

describe('SecurityManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(securityApi, 'fetchBlacklistEntriesApi').mockResolvedValue(mockEntries);
    vi.spyOn(securityApi, 'fetchSecuritySettingsApi').mockResolvedValue(mockSettings);
    vi.spyOn(securityApi, 'fetchCardAttemptsApi').mockResolvedValue(mockAttempts);
    vi.spyOn(securityApi, 'updateBlacklistEntryApi').mockImplementation((id, data) => {
      const target = mockEntries.find((e) => e.id === id);
      return Promise.resolve({ ...target, ...data });
    });
    vi.spyOn(securityApi, 'deleteBlacklistEntryApi').mockResolvedValue({ success: true });
    vi.spyOn(securityApi, 'createBlacklistEntryApi').mockResolvedValue({
      id: 3,
      client_id: 1,
      entry_type: 'cpf',
      value: '200.100.50.25',
      reason: 'IP suspeito',
      is_active: true,
      created_at: '2026-10-17T15:00:00Z',
    });
  });

  it('renders header, stats and blacklist table correctly', async () => {
    render(<SecurityManagement currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByTestId('security-management-container')).toBeInTheDocument();
    expect(screen.getByText('Bloqueios na Blacklist')).toBeInTheDocument();
    expect(screen.getByText('Regra do Velocity Check')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12345678909')).toBeInTheDocument();
      expect(screen.getByText('golpista@fraude.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Fraude confirmada em estorno')).toBeInTheDocument();
  });

  it('switches between tabs (blacklist, attempts, settings)', async () => {
    render(<SecurityManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('12345678909')).toBeInTheDocument();
    });

    // Clique na aba Auditoria do Cartão
    const attemptsTab = screen.getByTestId('tab-security-attempts');
    fireEvent.click(attemptsTab);

    await waitFor(() => {
      expect(screen.getByText('Tentativas de Pagamento com Cartão (Auditoria)')).toBeInTheDocument();
      expect(screen.getByText('Cartão recusado pelo emissor')).toBeInTheDocument();
      expect(screen.getByText('Limite de velocity atingido')).toBeInTheDocument();
    });

    // Clique na aba Parâmetros do Escudo
    const settingsTab = screen.getByTestId('tab-security-settings');
    fireEvent.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText('Parâmetros do Escudo Anti-Carding & Velocity Check')).toBeInTheDocument();
      expect(screen.getByTestId('input-velocity-threshold')).toBeInTheDocument();
    });
  });

  it('toggles active status of an entry', async () => {
    render(<SecurityManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('12345678909')).toBeInTheDocument();
    });

    const activeBtn = screen.getByText('Ativo');
    fireEvent.click(activeBtn);

    await waitFor(() => {
      expect(securityApi.updateBlacklistEntryApi).toHaveBeenCalledWith(1, { is_active: false });
    });
  });

  it('opens confirmation modal and removes entry on confirm', async () => {
    render(<SecurityManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('12345678909')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-blacklist-btn-1');
    fireEvent.click(deleteBtn);

    // Modal de confirmação aberto
    expect(screen.getByText('Remover da Blacklist')).toBeInTheDocument();
    expect(screen.getByText(/Deseja realmente remover o bloqueio para "12345678909"/i)).toBeInTheDocument();

    const confirmActionBtn = screen.getByTestId('confirm-delete-modal-btn');
    fireEvent.click(confirmActionBtn);

    await waitFor(() => {
      expect(securityApi.deleteBlacklistEntryApi).toHaveBeenCalledWith(1);
    });
  });

  it('opens add modal and submits new blacklist entry', async () => {
    render(<SecurityManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('12345678909')).toBeInTheDocument();
    });

    const openAddBtn = screen.getByTestId('open-add-blacklist-modal-btn');
    fireEvent.click(openAddBtn);

    expect(screen.getByText('Novo Bloqueio na Blacklist')).toBeInTheDocument();

    // Preenche os campos do modal
    const valueInput = screen.getByTestId('input-blacklist-value');
    const reasonInput = screen.getByTestId('input-blacklist-reason');

    fireEvent.change(valueInput, { target: { value: '200.100.50.25' } });
    fireEvent.change(reasonInput, { target: { value: 'IP suspeito' } });

    const submitBtn = screen.getByTestId('submit-add-blacklist-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(securityApi.createBlacklistEntryApi).toHaveBeenCalledWith({
        entry_type: 'cpf',
        value: '200.100.50.25',
        reason: 'IP suspeito',
        is_active: true,
      });
    });
  });
});
