from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.expense import Expense
from app.schemas.dashboard import DailySummary, PaymentMethodBreakdown
from app.services.transaction_service import get_daily_summary
from app.services.expense_service import get_daily_expenses

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/today", response_model=DailySummary)
async def get_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    today = date.today()
    rev = await get_daily_summary(db, today)
    exp = await get_daily_expenses(db, today)

    txn_count_result = await db.execute(
        select(func.count()).where(
            and_(Transaction.transaction_date == today, Transaction.status == "ACTIVE")
        )
    )
    transaction_count = txn_count_result.scalar()

    exp_count_result = await db.execute(
        select(func.count()).where(
            and_(Expense.expense_date == today, Expense.status == "ACTIVE")
        )
    )
    expense_count = exp_count_result.scalar()

    return DailySummary(
        date=today,
        total_revenue=rev["total"],
        total_expenses=exp["total"],
        operating_result=rev["total"] - exp["total"],
        transaction_count=transaction_count,
        expense_count=expense_count,
        payment_methods=PaymentMethodBreakdown(
            cash=rev["payment_methods"]["CASH"],
            upi=rev["payment_methods"]["UPI"],
            card=rev["payment_methods"]["CARD"],
            other=rev["payment_methods"]["OTHER"],
            total=rev["total"],
        ),
    )


@router.get("/custom")
async def get_custom_range(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from app.services.transaction_service import get_date_range_summary
    from app.services.expense_service import get_expenses_by_category

    rev = await get_date_range_summary(db, start_date, end_date)
    exp_by_cat = await get_expenses_by_category(db, start_date, end_date)
    total_expenses = sum(c["total"] for c in exp_by_cat)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": rev["total"],
        "total_expenses": total_expenses,
        "operating_result": rev["total"] - total_expenses,
        "daily_revenue": rev["daily"],
        "expense_by_category": exp_by_cat,
    }
