import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BuyerAuthForm from './BuyerAuthForm';
import BuyerOrdersList from './BuyerOrdersList';
import BuyerSubscriptionsList from './BuyerSubscriptionsList';
import BuyerPixModal from './BuyerPixModal';
import BuyerCardUpdateModal from './BuyerCardUpdateModal';
import BuyerPortalPage from './BuyerPortalPage';
import { buyerPortalApi } from './buyerPortalApi';
import { ToastProvider } from '../../context/ToastContext';

describe('BuyerPortal Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('BuyerAuthForm', () => {
    it('renderiza etapa inicial de e-mail e chama handleRequestCode ao enviar', () => {
      const handleRequestCode = vi.fn((e) => e.preventDefault());
      const setInputEmail = vi.fn();

      render(
        <BuyerAuthForm
          authStep="email"
          setAuthStep={vi.fn()}
          inputEmail="aluno@teste.com"
          setInputEmail={setInputEmail}
          inputCpf=""
          setInputCpf={vi.fn()}
          inputCode=""
          setInputCode={vi.fn()}
          handleRequestCode={handleRequestCode}
          handleVerifyCode={vi.fn()}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText('Acesse Suas Compras')).toBeInTheDocument();
      const emailInput = screen.getByLabelText(/E-mail utilizado na compra/i);
      expect(emailInput).toHaveValue('aluno@teste.com');

      const submitBtn = screen.getByRole('button', { name: /Continuar com Código por E-mail/i });
      fireEvent.click(submitBtn);
      expect(handleRequestCode).toHaveBeenCalled();
    });

    it('renderiza etapa de código OTP e permite submissão', () => {
      const handleVerifyCode = vi.fn((e) => e.preventDefault());
      const setInputCode = vi.fn();
      const setAuthStep = vi.fn();

      render(
        <BuyerAuthForm
          authStep="code"
          setAuthStep={setAuthStep}
          inputEmail="aluno@teste.com"
          setInputEmail={vi.fn()}
          inputCpf=""
          setInputCpf={vi.fn()}
          inputCode="123456"
          setInputCode={setInputCode}
          handleRequestCode={vi.fn()}
          handleVerifyCode={handleVerifyCode}
          loading={false}
          error={null}
        />
      );

      expect(screen.getByText(/Digite o código de 6 dígitos/i)).toBeInTheDocument();
      const codeInput = screen.getByLabelText(/Código de 6 Dígitos/i);
      expect(codeInput).toHaveValue('123456');

      const submitBtn = screen.getByRole('button', { name: /Acessar Minhas Compras/i });
      fireEvent.click(submitBtn);
      expect(handleVerifyCode).toHaveBeenCalled();

      const backBtn = screen.getByRole('button', { name: /Alterar e-mail informado/i });
      fireEvent.click(backBtn);
      expect(setAuthStep).toHaveBeenCalledWith('email');
    });
  });

  describe('BuyerOrdersList', () => {
    it('renderiza estado vazio quando não há pedidos', () => {
      render(
        <BuyerOrdersList
          orders={[]}
          onOpenPix={vi.fn()}
          onRegeneratePix={vi.fn()}
          actionLoading={false}
        />
      );
      expect(screen.getByText('Nenhum Pedido Encontrado')).toBeInTheDocument();
    });

    it('renderiza pedidos aprovados com botão de acesso e pedidos Pix com botão de pagar', () => {
      const onOpenPix = vi.fn();
      const onRegeneratePix = vi.fn();
      const mockOrders = [
        {
          id: 1,
          order_code: 'ORD-001',
          product_name: 'Curso React Master',
          offer_name: 'Oferta Especial',
          amount_brl: 497.0,
          payment_method: 'credit_card',
          status: 'paid',
          member_area_url: 'https://membros.cursoreact.com',
          is_pix_expired: false,
        },
        {
          id: 2,
          order_code: 'ORD-002',
          product_name: 'Mentoria VIP',
          amount_brl: 1500.0,
          payment_method: 'pix',
          status: 'pending',
          is_pix_expired: false,
          qr_code_text: '00020101...',
        },
        {
          id: 3,
          order_code: 'ORD-003',
          product_name: 'E-book Estratégico',
          amount_brl: 97.0,
          payment_method: 'pix',
          status: 'pending',
          is_pix_expired: true,
        },
      ];

      render(
        <BuyerOrdersList
          orders={mockOrders}
          onOpenPix={onOpenPix}
          onRegeneratePix={onRegeneratePix}
          actionLoading={false}
        />
      );

      expect(screen.getByText('Curso React Master')).toBeInTheDocument();
      expect(screen.getByText('Mentoria VIP')).toBeInTheDocument();
      expect(screen.getByText('E-book Estratégico')).toBeInTheDocument();

      // Botão de acesso à área de membros
      const accessBtn = screen.getByRole('link', { name: /Acessar Área de Membros/i });
      expect(accessBtn).toHaveAttribute('href', 'https://membros.cursoreact.com');

      // Botão de pagar com Pix
      const payPixBtn = screen.getByRole('button', { name: /Pagar com Pix/i });
      fireEvent.click(payPixBtn);
      expect(onOpenPix).toHaveBeenCalledWith(mockOrders[1]);

      // Botão de gerar novo Pix
      const regenPixBtn = screen.getByRole('button', { name: /Gerar Novo Pix/i });
      fireEvent.click(regenPixBtn);
      expect(onRegeneratePix).toHaveBeenCalledWith('ORD-003');
    });
  });

  describe('BuyerSubscriptionsList', () => {
    it('renderiza assinaturas e permite abrir modal de troca de cartão', () => {
      const onOpenCardModal = vi.fn();
      const mockSubs = [
        {
          id: 10,
          subscription_code: 'SUB-VIP-001',
          product_name: 'Clube Recorrente',
          billing_cycle: 'monthly',
          amount_brl: 99.0,
          status: 'active',
          card_last_four: '4242',
          card_brand: 'visa',
          next_billing_at: '2026-11-19T00:00:00Z',
          member_area_url: 'https://clube.com',
          invoices: [
            {
              id: 101,
              invoice_code: 'INV-101',
              cycle_number: 1,
              amount_brl: 99.0,
              status: 'paid',
            },
          ],
        },
      ];

      render(
        <BuyerSubscriptionsList
          subscriptions={mockSubs}
          onOpenCardModal={onOpenCardModal}
        />
      );

      expect(screen.getByText('Clube Recorrente')).toBeInTheDocument();
      expect(screen.getByText('SUB-VIP-001')).toBeInTheDocument();
      expect(screen.getByText(/4242 \(VISA\)/i)).toBeInTheDocument();

      const updateCardBtn = screen.getByRole('button', { name: /Atualizar Cartão de Crédito/i });
      fireEvent.click(updateCardBtn);
      expect(onOpenCardModal).toHaveBeenCalledWith(mockSubs[0]);

      // Histórico de faturas
      const invoicesBtn = screen.getByRole('button', { name: /Ver Faturas/i });
      fireEvent.click(invoicesBtn);
      expect(screen.getByText('Histórico de Faturas')).toBeInTheDocument();
      expect(screen.getByText('INV-101')).toBeInTheDocument();
    });
  });

  describe('BuyerPixModal', () => {
    it('exibe dados do pedido e permite fechar e copiar código', () => {
      const onClose = vi.fn();
      const addToast = vi.fn();
      const mockOrder = {
        order_code: 'ORD-PIX-123',
        product_name: 'Guia Prático',
        amount_brl: 120.0,
        qr_code_text: '00020101PIXCODEHERE',
      };

      render(<BuyerPixModal order={mockOrder} onClose={onClose} addToast={addToast} />);

      expect(screen.getByText('Pagar Pedido via Pix')).toBeInTheDocument();
      expect(screen.getByText('Guia Prático')).toBeInTheDocument();
      expect(screen.getByDisplayValue('00020101PIXCODEHERE')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: /Fechar modal de Pix/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('BuyerCardUpdateModal', () => {
    it('formata número de cartão e submete atualização', () => {
      const onClose = vi.fn();
      const onUpdateCard = vi.fn();
      const mockSub = {
        subscription_code: 'SUB-RENEW-99',
        product_name: 'Mentoria Semestral',
      };

      render(
        <BuyerCardUpdateModal
          subscription={mockSub}
          onClose={onClose}
          onUpdateCard={onUpdateCard}
          loading={false}
        />
      );

      expect(screen.getByText('Atualizar Cartão de Crédito')).toBeInTheDocument();
      expect(screen.getByText('Mentoria Semestral')).toBeInTheDocument();

      const numInput = screen.getByLabelText(/Número do Novo Cartão/i);
      fireEvent.change(numInput, { target: { value: '4111111111114242' } });

      const nameInput = screen.getByLabelText(/Nome Impresso no Cartão/i);
      fireEvent.change(nameInput, { target: { value: 'FULANO SILVA' } });

      const expInput = screen.getByLabelText(/Validade/i);
      fireEvent.change(expInput, { target: { value: '1228' } });

      const cvvInput = screen.getByLabelText(/CVV/i);
      fireEvent.change(cvvInput, { target: { value: '123' } });

      const saveBtn = screen.getByRole('button', { name: /Salvar Novo Cartão/i });
      fireEvent.click(saveBtn);

      expect(onUpdateCard).toHaveBeenCalledWith('SUB-RENEW-99', {
        card_number: '4111111111114242',
        card_holder: 'FULANO SILVA',
        card_expiry: '12/28',
        card_cvv: '123',
      });
    });
  });

  describe('BuyerPortalPage Integration', () => {
    it('renderiza fluxo de login inicial quando não há token', () => {
      render(
        <ToastProvider>
          <BuyerPortalPage />
        </ToastProvider>
      );
      expect(screen.getByText('Acesse Suas Compras')).toBeInTheDocument();
      expect(screen.getByLabelText(/E-mail utilizado na compra/i)).toBeInTheDocument();
    });

    it('renderiza painel do aluno quando há sessão autenticada', async () => {
      localStorage.setItem('buyer_portal_token', 'mock_jwt_buyer_token');
      localStorage.setItem(
        'buyer_portal_user',
        JSON.stringify({ name: 'Rodrigo Faro', email: 'rodrigo@teste.com' })
      );

      vi.spyOn(buyerPortalApi, 'getOrders').mockResolvedValue([]);
      vi.spyOn(buyerPortalApi, 'getSubscriptions').mockResolvedValue([]);

      render(
        <ToastProvider>
          <BuyerPortalPage />
        </ToastProvider>
      );

      expect(screen.getByText(/Rodrigo Faro/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Meus Pedidos & Cursos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Minhas Assinaturas/i })).toBeInTheDocument();

      // Botão de logout
      const logoutBtn = screen.getByRole('button', { name: /Sair/i });
      fireEvent.click(logoutBtn);
      expect(localStorage.getItem('buyer_portal_token')).toBeNull();
    });
  });
});
