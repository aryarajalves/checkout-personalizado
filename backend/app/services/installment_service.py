"""
Serviço de Cálculo de Parcelamento e Simulação de Lucro Líquido do Split (#4).
Oferece cálculo financeiro preciso (Tabela Price) de opções de parcelamento e
simulador multi-cenário em tempo real (Pix, Cartão 1x, 6x, 12x e Cripto).
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product, ProductOffer, ProductSplitRule
from app.schemas.product import (
    InstallmentOption,
    SplitRecipientSimulation,
    SimulationScenario,
    ProductInstallmentSimulationResponse,
)
from app.core.logger import logger


def calculate_single_installment(
    principal: float,
    installments: int,
    free_installments_count: int = 1,
    interest_rate_percent: float = 2.99,
    interest_payer: str = "buyer"
) -> InstallmentOption:
    """Calcula o valor da parcela individual com base nas regras do produto."""
    principal = round(float(principal), 2)
    
    if installments <= 1:
        val_str = f"{principal:.2f}".replace(".", ",")
        return InstallmentOption(
            installments=1,
            installment_value=principal,
            total_amount=principal,
            has_interest=False,
            interest_rate=0.0,
            label=f"1x de R$ {val_str} à vista"
        )

    # Faixa sem juros para o comprador ou juros absorvidos pelo produtor
    if installments <= free_installments_count or interest_payer == "producer":
        val = round(principal / installments, 2)
        total = round(val * installments, 2)
        val_str = f"{val:.2f}".replace(".", ",")
        return InstallmentOption(
            installments=installments,
            installment_value=val,
            total_amount=total,
            has_interest=False,
            interest_rate=0.0,
            label=f"{installments}x de R$ {val_str} sem juros"
        )

    # Com juros repassados ao comprador (Tabela Price / Juros Compostos Padrão Mercado)
    i = (interest_rate_percent / 100.0)
    factor = (1.0 + i) ** (-installments)
    if factor >= 1.0 or i <= 0:
        val = round(principal / installments, 2)
    else:
        val = round((principal * i) / (1.0 - factor), 2)

    total = round(val * installments, 2)
    val_str = f"{val:.2f}".replace(".", ",")
    tot_str = f"{total:.2f}".replace(".", ",")
    return InstallmentOption(
        installments=installments,
        installment_value=val,
        total_amount=total,
        has_interest=True,
        interest_rate=interest_rate_percent,
        label=f"{installments}x de R$ {val_str} (total: R$ {tot_str})"
    )


def calculate_product_installments(
    price_brl: float,
    max_installments: int = 12,
    free_installments_count: int = 1,
    interest_rate_percent: float = 2.99,
    interest_payer: str = "buyer"
) -> List[InstallmentOption]:
    """Gera todas as opções de parcelamento de 1x até max_installments."""
    limit = max(1, min(12, int(max_installments or 12)))
    free_count = max(1, min(12, int(free_installments_count or 1)))
    rate = max(0.0, float(interest_rate_percent if interest_rate_percent is not None else 2.99))
    payer = interest_payer if interest_payer in ["buyer", "producer"] else "buyer"

    options = []
    for n in range(1, limit + 1):
        opt = calculate_single_installment(
            principal=price_brl,
            installments=n,
            free_installments_count=free_count,
            interest_rate_percent=rate,
            interest_payer=payer
        )
        options.append(opt)
    return options


def _build_scenario(
    name: str,
    payment_method: str,
    installments: int,
    base_price: float,
    product: Product,
    split_rules: List[ProductSplitRule]
) -> SimulationScenario:
    """Calcula um cenário financeiro e a partição do split entre o produtor e seus sócios."""
    base_price = round(float(base_price), 2)
    gross_amount = base_price
    gateway_fee = 0.0

    if payment_method == "pix":
        # Desconto Pix se houver
        pix_disc = float(getattr(product, "pix_discount_percent", 0.0) or 0.0)
        if pix_disc > 0:
            gross_amount = round(base_price * (1.0 - pix_disc / 100.0), 2)
        gateway_fee = round(0.99, 2) # Padrão Pagar.me Pix R$ 0.99
    elif payment_method == "crypto":
        # Desconto Cripto se houver
        crypto_disc = float(getattr(product, "crypto_discount_percent", 0.0) or 0.0)
        if crypto_disc > 0:
            gross_amount = round(base_price * (1.0 - crypto_disc / 100.0), 2)
        gateway_fee = round(gross_amount * 0.005, 2) # 0.5% NOWPayments
    else: # credit_card
        payer = getattr(product, "interest_payer", "buyer") or "buyer"
        free_count = int(getattr(product, "free_installments_count", 1) or 1)
        rate = float(getattr(product, "interest_rate_percent", 2.99) or 2.99)

        if installments == 1:
            gateway_fee = round(base_price * 0.0399 + 0.49, 2)
        elif payer == "buyer":
            # O comprador arca com os juros
            if installments > free_count:
                single_calc = calculate_single_installment(
                    principal=base_price,
                    installments=installments,
                    free_installments_count=free_count,
                    interest_rate_percent=rate,
                    interest_payer="buyer"
                )
                gross_amount = single_calc.total_amount
                interest_diff = round(gross_amount - base_price, 2)
                gateway_fee = round(base_price * 0.0399 + 0.49 + interest_diff, 2)
            else:
                gateway_fee = round(base_price * 0.0399 + 0.49, 2)
        else: # payer == "producer"
            # O produtor absorve a taxa de parcelamento/antecipação
            installment_tax = (installments - 1) * 0.015 # 1.5% ao mês aproximado de antecipação
            gateway_fee = round(base_price * (0.0399 + installment_tax) + 0.49, 2)

    net_amount = max(0.0, round(gross_amount - gateway_fee, 2))

    # Distribuição do Split
    now_dt = datetime.now(timezone.utc)
    partners_distribution: List[SplitRecipientSimulation] = []
    total_partners_perc = 0.0
    total_partners_amount = 0.0

    for rule in split_rules:
        is_expired = False
        if rule.valid_until is not None:
            expiry_dt = rule.valid_until if rule.valid_until.tzinfo else rule.valid_until.replace(tzinfo=timezone.utc)
            is_expired = expiry_dt < now_dt

        perc = float(rule.percentage or 0.0)
        rec_name = rule.recipient.name if rule.recipient else f"Sócio #{rule.recipient_id}"

        if not is_expired and perc > 0:
            share = round((perc / 100.0) * net_amount, 2)
            total_partners_perc += perc
            total_partners_amount += share
        else:
            share = 0.0

        partners_distribution.append(
            SplitRecipientSimulation(
                recipient_id=rule.recipient_id,
                recipient_name=rec_name,
                percentage=perc,
                amount_brl=share,
                is_expired=is_expired
            )
        )

    producer_percentage = max(0.0, round(100.0 - total_partners_perc, 2))
    producer_amount = max(0.0, round(net_amount - total_partners_amount, 2))

    return SimulationScenario(
        scenario_name=name,
        payment_method=payment_method,
        installments=installments,
        gross_amount_brl=gross_amount,
        gateway_fee_brl=gateway_fee,
        net_amount_brl=net_amount,
        producer_amount_brl=producer_amount,
        producer_percentage=producer_percentage,
        partners_distribution=partners_distribution
    )


def simulate_product_splits(
    db: Session,
    product_id: int,
    offer_id: Optional[int] = None
) -> ProductInstallmentSimulationResponse:
    """Gera a simulação completa de parcelamento e lucratividade do split de um produto."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Produto ID {product_id} não encontrado."
        )

    base_price = product.price_brl
    if offer_id:
        offer = db.query(ProductOffer).filter(ProductOffer.id == offer_id, ProductOffer.product_id == product_id).first()
        if offer and offer.price_brl is not None:
            base_price = offer.price_brl

    max_inst = int(getattr(product, "max_installments", 12) or 12)
    free_inst = int(getattr(product, "free_installments_count", 1) or 1)
    interest_rate = float(getattr(product, "interest_rate_percent", 2.99) or 2.99)
    interest_payer = getattr(product, "interest_payer", "buyer") or "buyer"

    # Opções de parcelamento completas
    inst_options = calculate_product_installments(
        price_brl=base_price,
        max_installments=max_inst,
        free_installments_count=free_inst,
        interest_rate_percent=interest_rate,
        interest_payer=interest_payer
    )

    split_rules = list(product.split_rules or [])

    # Cenários comparativos de alta relevância
    scenarios = [
        _build_scenario("Pix à Vista", "pix", 1, base_price, product, split_rules),
        _build_scenario("Cartão de Crédito 1x", "credit_card", 1, base_price, product, split_rules),
    ]

    if max_inst >= 6:
        scenarios.append(_build_scenario("Cartão de Crédito 6x", "credit_card", 6, base_price, product, split_rules))

    if max_inst >= 12:
        scenarios.append(_build_scenario("Cartão de Crédito 12x", "credit_card", 12, base_price, product, split_rules))
    elif max_inst > 1 and max_inst != 6:
        scenarios.append(_build_scenario(f"Cartão de Crédito {max_inst}x", "credit_card", max_inst, base_price, product, split_rules))

    scenarios.append(_build_scenario("Criptomoedas", "crypto", 1, base_price, product, split_rules))

    return ProductInstallmentSimulationResponse(
        product_id=product.id,
        product_name=product.name,
        base_price_brl=base_price,
        max_installments=max_inst,
        free_installments_count=free_inst,
        interest_rate_percent=interest_rate,
        interest_payer=interest_payer,
        installment_options=inst_options,
        scenarios=scenarios
    )
