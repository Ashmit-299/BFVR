from uuid import UUID
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from app.models.expense import Expense
from app.models.category import TransactionCategory
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


async def create_expense(db: AsyncSession, data: ExpenseCreate, user_id: UUID) -> Expense:
    if data.payment_method not in ("CASH", "UPI", "CARD", "OTHER"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment method")

    cat_result = await db.execute(select(TransactionCategory).where(TransactionCategory.id == data.category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    expense = Expense(
        amount=data.amount,
        category_id=data.category_id,
        payment_method=data.payment_method,
        vendor_name=data.vendor_name,
        description=data.description,
        expense_date=data.expense_date or date.today(),
        created_by=user_id,
        status="ACTIVE",
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


async def get_expenses(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 50,
    start_date: date = None,
    end_date: date = None,
    category_id: UUID = None,
) -> tuple[list[Expense], int]:
    query = select(Expense).where(Expense.status == "ACTIVE")

    if start_date:
        query = query.where(Expense.expense_date >= start_date)
    if end_date:
        query = query.where(Expense.expense_date <= end_date)
    if category_id:
        query = query.where(Expense.category_id == category_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    expenses = list(result.scalars().all())
    return expenses, total


async def get_expense_by_id(db: AsyncSession, expense_id: UUID) -> Expense:
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


async def update_expense(db: AsyncSession, expense_id: UUID, data: ExpenseUpdate, user_id: UUID) -> Expense:
    expense = await get_expense_by_id(db, expense_id)

    if expense.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update cancelled expense")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    expense.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(expense)
    return expense


async def cancel_expense(db: AsyncSession, expense_id: UUID, reason: str, user_id: UUID) -> Expense:
    expense = await get_expense_by_id(db, expense_id)

    if expense.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense already cancelled")

    expense.status = "CANCELLED"
    expense.cancellation_reason = reason
    expense.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(expense)
    return expense


async def get_daily_expenses(db: AsyncSession, target_date: date) -> dict:
    result = await db.execute(
        select(
            func.sum(Expense.amount).label("total"),
        )
        .where(
            and_(
                Expense.expense_date == target_date,
                Expense.status == "ACTIVE",
            )
        )
    )
    row = result.one()
    return {"date": target_date, "total": float(row.total) if row.total else 0}


async def get_expenses_by_category(
    db: AsyncSession, start_date: date, end_date: date
) -> list[dict]:
    result = await db.execute(
        select(
            TransactionCategory.name,
            func.sum(Expense.amount).label("total"),
        )
        .join(TransactionCategory, Expense.category_id == TransactionCategory.id)
        .where(
            and_(
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
                Expense.status == "ACTIVE",
            )
        )
        .group_by(TransactionCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    )
    rows = result.all()
    return [{"category": row.name, "total": float(row.total)} for row in rows]
