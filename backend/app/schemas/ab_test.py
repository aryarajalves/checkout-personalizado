from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ABTestBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Nome do teste A/B")
    variant_a_offer_id: int = Field(..., description="ID da Oferta A (Controle)")
    variant_b_offer_id: int = Field(..., description="ID da Oferta B (Variante)")
    is_active: bool = Field(True, description="Se o teste está ativo")
    split_ratio: int = Field(50, ge=1, le=99, description="Porcentagem de tráfego para a Variante A (1 a 99, padrão 50)")

class ABTestCreate(ABTestBase):
    pass

class ABTestUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    is_active: Optional[bool] = None
    split_ratio: Optional[int] = Field(None, ge=1, le=99)

class ABTestTrackEvent(BaseModel):
    test_id: int = Field(..., description="ID do teste A/B")
    variant: str = Field(..., pattern="^(A|B)$", description="Variante atribuída ('A' ou 'B')")
    event_type: str = Field(..., pattern="^(visit|initiate_checkout)$", description="Tipo do evento do funil")

class ABTestPublicInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    variant_a_offer_id: int
    variant_b_offer_id: int
    split_ratio: int

class ABTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    name: str
    variant_a_offer_id: int
    variant_b_offer_id: int
    variant_a_offer_name: Optional[str] = None
    variant_b_offer_name: Optional[str] = None
    variant_a_price_brl: Optional[float] = None
    variant_b_price_brl: Optional[float] = None
    variant_a_slug: Optional[str] = None
    variant_b_slug: Optional[str] = None
    is_active: bool
    split_ratio: int

    # Métricas
    visits_a: int = 0
    visits_b: int = 0
    initiates_a: int = 0
    initiates_b: int = 0
    conversions_a: int = 0
    conversions_b: int = 0
    revenue_brl_a: float = 0.0
    revenue_brl_b: float = 0.0

    # Indicadores Calculados
    conversion_rate_a: float = 0.0
    conversion_rate_b: float = 0.0
    winning_variant: Optional[str] = None  # 'A', 'B', ou None

    created_at: datetime
    updated_at: datetime
