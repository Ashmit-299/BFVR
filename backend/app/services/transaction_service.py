from uuid import UUID
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from app.models.transaction import Transaction
from app.models.category import TransactionCategory
from app.schemas.transaction import TransactionCreate, TransactionUpdate


async def create_transaction(db: AsyncSession, data: TransactionCreate, user_id: UUID) -> Transaction:
    if data.payment_method not in ("CASH", "UPI", "CARD", "OTHER"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment method")

    if data.category_id:
        cat_result = await db.execute(select(TransactionCategory).where(TransactionCategory.id == data.category_id))
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    transaction = Transaction(
        amount=data.amount,
        payment_method=data.payment_method,
        category_id=data.category_id,
        description=data.description,
        transaction_date=data.transaction_date or date.today(),
        transaction_time=data.transaction_time or datetime.now().time(),
        created_by=user_id,
        status="ACTIVE",
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


async def get_transactions(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 50,
    start_date: date = None,
    end_date: date = None,
    payment_method: str = None,
) -> tuple[list[Transaction], int]:
    query = select(Transaction).where(Transaction.status == "ACTIVE")

    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)
    if payment_method:
        query = query.where(Transaction.payment_method == payment_method)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    transactions = list(result.scalars().all())
    return transactions, total


async def get_transaction_by_id(db: AsyncSession, transaction_id: UUID) -> Transaction:
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


async def update_transaction(db: AsyncSession, transaction_id: UUID, data: TransactionUpdate, user_id: UUID) -> Transaction:
    transaction = await get_transaction_by_id(db, transaction_id)

    if transaction.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update cancelled transaction")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)

    transaction.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(transaction)
    return transaction


async def cancel_transaction(db: AsyncSession, transaction_id: UUID, reason: str, user_id: UUID) -> Transaction:
    transaction = await get_transaction_by_id(db, transaction_id)

    if transaction.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction already cancelled")

    transaction.status = "CANCELLED"
    transaction.cancellation_reason = reason
    transaction.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(transaction)
    return transaction


async def get_daily_summary(db: AsyncSession, target_date: date) -> dict:
    result = await db.execute(
        select(
            func.sum(Transaction.amount).label("total"),
            Transaction.payment_method,
        )
        .where(
            and_(
                Transaction.transaction_date == target_date,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(Transaction.payment_method)
    )
    rows = result.all()

    payment_methods = {"CASH": 0, "UPI": 0, "CARD": 0, "OTHER": 0}
    total = 0
    for row in rows:
        payment_methods[row.payment_method] = float(row.total)
        total += float(row.total)

    return {
        "date": target_date,
        "total": total,
        "payment_methods": payment_methods,
    }


async def get_date_range_summary(db: AsyncSession, start: date, end: date) -> dict:
    result = await db.execute(
        select(
            Transaction.transaction_date,
            func.sum(Transaction.amount).label("total"),
        )
        .where(
            and_(
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(Transaction.transaction_date)
        .order_by(Transaction.transaction_date)
    )
    rows = result.all()

    daily = {}
    total = 0
    for row in rows:
        day_str = row.transaction_date.isoformat()
        daily[day_str] = float(row.total)
        total += float(row.total)

    return {"start": start, "end": end, "total": total, "daily": daily}
