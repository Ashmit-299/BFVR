from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.services.analytics_service import (
    get_revenue_by_period, get_expenses_by_period, get_best_days,
    get_best_months, get_revenue_trends, get_payment_method_stats,
    get_expense_alerts,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/revenue")
async def revenue_analytics(
    start_date: date = None,
    end_date: date = None,
    period: str = Query("day", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    data = await get_revenue_by_period(db, start_date, end_date, period)
    total = sum(d["revenue"] for d in data)
    return {"start_date": start_date, "end_date": end_date, "period": period, "total": total, "data": data}


@router.get("/expenses")
async def expense_analytics(
    start_date: date = None,
    end_date: date = None,
    period: str = Query("day", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    data = await get_expenses_by_period(db, start_date, end_date, period)
    total = sum(d["expenses"] for d in data)
    return {"start_date": start_date, "end_date": end_date, "period": period, "total": total, "data": data}


@router.get("/best-days")
async def best_days_analytics(
    start_date: date = None,
    end_date: date = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not start_date:
        start_date = date.today() - timedelta(days=90)
    if not end_date:
        end_date = date.today()

    data = await get_best_days(db, start_date, end_date)
    return {"start_date": start_date, "end_date": end_date, "data": data}


@router.get("/best-months")
async def best_months_analytics(
    year: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not year:
        year = date.today().year

    data = await get_best_months(db, year)
    return {"year": year, "data": data}


@router.get("/trends")
async def trends_analytics(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    data = await get_revenue_trends(db, months)
    return {"months": months, "data": data}


@router.get("/payment-methods")
async def payment_method_analytics(
    start_date: date = None,
    end_date: date = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    data = await get_payment_method_stats(db, start_date, end_date)
    total = sum(d["total"] for d in data)
    return {"start_date": start_date, "end_date": end_date, "total": total, "data": data}


@router.get("/expense-alerts")
async def expense_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    today = date.today()
    current_start = today - timedelta(days=30)
    prev_start = current_start - timedelta(days=30)
    prev_end = current_start - timedelta(days=1)

    alerts = await get_expense_alerts(db, current_start, today, prev_start, prev_end)
    return {"alerts": alerts}
