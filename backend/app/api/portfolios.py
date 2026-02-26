import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.portfolio import Holding, Portfolio
from app.schemas.portfolio import HoldingCreate, HoldingOut, PortfolioCreate, PortfolioOut

router = APIRouter()


@router.get("/", response_model=list[PortfolioOut])
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).options(selectinload(Portfolio.holdings)))
    return result.scalars().all()


@router.post("/", response_model=PortfolioOut, status_code=201)
async def create_portfolio(body: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    portfolio = Portfolio(name=body.name)
    db.add(portfolio)
    await db.commit()
    await db.refresh(portfolio, attribute_names=["holdings"])
    return portfolio


@router.get("/{portfolio_id}", response_model=PortfolioOut)
async def get_portfolio(portfolio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).where(Portfolio.id == portfolio_id).options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.post("/{portfolio_id}/holdings", response_model=HoldingOut, status_code=201)
async def add_holding(
    portfolio_id: uuid.UUID,
    body: HoldingCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holding = Holding(
        portfolio_id=portfolio_id,
        symbol=body.symbol.upper().strip(),
        quantity=body.quantity,
        avg_cost=body.avg_cost,
        thesis=body.thesis,
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)
    return holding


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
async def delete_holding(
    portfolio_id: uuid.UUID,
    holding_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Holding).where(
            Holding.id == holding_id,
            Holding.portfolio_id == portfolio_id,
        )
    )
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    await db.delete(holding)
    await db.commit()
