import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.portfolio import Portfolio
from app.schemas.portfolio import PortfolioCreate, PortfolioOut

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
