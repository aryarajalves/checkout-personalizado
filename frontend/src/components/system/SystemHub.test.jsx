import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SystemHub from './SystemHub';

vi.mock('../UserManagement', () => ({
  default: () => <div data-testid="mock-user-management">User Management Mock</div>,
}));

vi.mock('../LogManagement', () => ({
  default: () => <div data-testid="mock-log-management">Log Management Mock</div>,
}));

vi.mock('../AutomatedBackup', () => ({
  default: () => <div data-testid="mock-automated-backup">Automated Backup Mock</div>,
}));

vi.mock('../security/SecurityManagement', () => ({
  default: () => <div data-testid="mock-security-management">Security Management Mock</div>,
}));

describe('SystemHub Component', () => {
  it('renders all system tabs and displays UserManagement by default', () => {
    render(<SystemHub currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByTestId('system-hub-container')).toBeInTheDocument();
    expect(screen.getByTestId('tab-system-users')).toBeInTheDocument();
    expect(screen.getByTestId('tab-system-logs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-system-backup')).toBeInTheDocument();
    expect(screen.getByTestId('tab-system-security')).toBeInTheDocument();
    expect(screen.getByTestId('mock-user-management')).toBeInTheDocument();
  });

  it('switches to Escudo de Segurança & Blacklist tab when clicked', () => {
    render(<SystemHub currentUser={{ role: 'superadmin' }} />);

    const securityTab = screen.getByTestId('tab-system-security');
    fireEvent.click(securityTab);

    expect(screen.getByTestId('mock-security-management')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-user-management')).not.toBeInTheDocument();
  });

  it('respects initialTab prop for security tab', () => {
    render(<SystemHub currentUser={{ role: 'superadmin' }} initialTab="security" />);

    expect(screen.getByTestId('mock-security-management')).toBeInTheDocument();
  });
});
