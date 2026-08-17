from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.schemas.daily_closing import DailyClosingCreate, DailyClosingResponse, DailyClosingListResponse
from app.services.closing_service import create_daily_closing, get_closing_by_date, get_closing_history

router = APIRouter(prefix="/api/closing", tags=["Daily Closing"])


@router.post("", response_model=DailyClosingResponse)
async def create_closing(
    data: DailyClosingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    closing = await create_daily_closing(
        db, data.closing_date, current_user.id,
        data.actual_cash_counted, data.upi_settled, data.notes,
    )
    return closing


@router.get("/{closing_date}", response_model=DailyClosingResponse)
async def get_closing(
    closing_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    closing = await get_closing_by_date(db, closing_date)
    return closing


@router.get("", response_model=DailyClosingListResponse)
async def list_closings(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    closings, total = await get_closing_history(db, page, per_page)
    return DailyClosingListResponse(
        closings=closings,
        total=total,
        page=page,
        per_page=per_page,
    )
