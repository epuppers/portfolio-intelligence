from fastapi import APIRouter

from app.api.portfolios import router as portfolios_router

router = APIRouter()
router.include_router(portfolios_router, prefix="/portfolios", tags=["portfolios"])
