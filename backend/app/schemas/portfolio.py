import uuid
from datetime import datetime

from pydantic import BaseModel


class HoldingOut(BaseModel):
    id: uuid.UUID
    symbol: str
    quantity: float
    avg_cost: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str


class PortfolioOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    holdings: list[HoldingOut] = []

    model_config = {"from_attributes": True}
