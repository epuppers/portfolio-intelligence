from fastapi import APIRouter

from app.api.intelligence import router as intelligence_router
from app.api.portfolios import router as portfolios_router

router = APIRouter()
router.include_router(portfolios_router, prefix="/portfolios", tags=["portfolios"])
router.include_router(intelligence_router, prefix="/intelligence", tags=["intelligence"])
