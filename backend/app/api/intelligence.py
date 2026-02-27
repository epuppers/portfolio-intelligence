from anthropic import APIError
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.portfolio import Portfolio
from app.schemas.intelligence import BriefingRequest, BriefingResponse
from app.services.intelligence import generate_briefing

router = APIRouter()


@router.post("/briefing", response_model=BriefingResponse)
async def create_briefing(
    body: BriefingRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.id == body.portfolio_id)
        .options(selectinload(Portfolio.holdings))
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if not portfolio.holdings:
        raise HTTPException(
            status_code=400,
            detail="Portfolio has no holdings to analyze",
        )

    try:
        briefing = await generate_briefing(
            portfolio_id=portfolio.id,
            holdings=portfolio.holdings,
        )
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {e.message}")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return briefing
