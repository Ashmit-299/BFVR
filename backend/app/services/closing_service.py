from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
from app.models.daily_closing import DailyClosing
from app.services.transaction_service import get_daily_summary
from app.services.expense_service import get_daily_expenses


async def create_daily_closing(
    db: AsyncSession,
    closing_date: date,
    user_id: UUID,
    actual_cash_counted: float = None,
    upi_settled: float = None,
    notes: str = None,
) -> DailyClosing:
    existing = await db.execute(
        select(DailyClosing).where(DailyClosing.closing_date == closing_date)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closing already exists for this date",
        )

    revenue_summary = await get_daily_summary(db, closing_date)
    expense_summary = await get_daily_expenses(db, closing_date)

    system_cash = revenue_summary["payment_methods"]["CASH"]
    system_upi = revenue_summary["payment_methods"]["UPI"]
    total_expenses = expense_summary["total"]
    operating_result = revenue_summary["total"] - total_expenses

    cash_diff = None
    upi_diff = None
    if actual_cash_counted is not None:
        cash_diff = actual_cash_counted - system_cash
    if upi_settled is not None:
        upi_diff = upi_settled - system_upi

    closing = DailyClosing(
        closing_date=closing_date,
        system_cash_total=system_cash,
        actual_cash_counted=actual_cash_counted,
        cash_difference=cash_diff,
        system_upi_total=system_upi,
        upi_settled=upi_settled,
        upi_difference=upi_diff,
        total_expenses=total_expenses,
        operating_result=operating_result,
        closed_by=user_id,
        notes=notes,
    )
    db.add(closing)
    await db.commit()
    await db.refresh(closing)
    return closing


async def get_closing_by_date(db: AsyncSession, closing_date: date) -> DailyClosing:
    result = await db.execute(
        select(DailyClosing).where(DailyClosing.closing_date == closing_date)
    )
    closing = result.scalar_one_or_none()
    if not closing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No closing found for this date",
        )
    return closing


async def get_closing_history(
    db: AsyncSession, page: int = 1, per_page: int = 30
) -> tuple[list[DailyClosing], int]:
    query = select(DailyClosing).order_by(DailyClosing.closing_date.desc())

    from sqlalchemy import func
    count_result = await db.execute(select(func.count()).select_from(DailyClosing))
    total = count_result.scalar()

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    closings = list(result.scalars().all())
    return closings, total
