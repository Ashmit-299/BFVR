from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.category import TransactionCategory
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionCancel,
    TransactionResponse, TransactionListResponse,
)
from app.services.transaction_service import (
    create_transaction, get_transactions, get_transaction_by_id,
    update_transaction, cancel_transaction,
)

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


async def txn_to_response(t, db: AsyncSession) -> TransactionResponse:
    category_name = None
    if t.category_id:
        cat_result = await db.execute(select(TransactionCategory.name).where(TransactionCategory.id == t.category_id))
        cat_row = cat_result.first()
        if cat_row:
            category_name = cat_row[0]

    creator_name = None
    user_result = await db.execute(select(User.name).where(User.id == t.created_by))
    user_row = user_result.first()
    if user_row:
        creator_name = user_row[0]

    return TransactionResponse(
        id=t.id,
        amount=float(t.amount),
        payment_method=t.payment_method,
        category_id=t.category_id,
        category_name=category_name,
        description=t.description,
        transaction_date=t.transaction_date,
        transaction_time=t.transaction_time,
        created_by=t.created_by,
        creator_name=creator_name,
        status=t.status,
        cancellation_reason=t.cancellation_reason,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.post("", response_model=TransactionResponse)
async def add_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    txn = await create_transaction(db, data, current_user.id)
    return await txn_to_response(txn, db)


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    start_date: date = None,
    end_date: date = None,
    payment_method: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    transactions, total = await get_transactions(db, page, per_page, start_date, end_date, payment_method)
    return TransactionListResponse(
        transactions=[await txn_to_response(t, db) for t in transactions],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    txn = await get_transaction_by_id(db, transaction_id)
    return await txn_to_response(txn, db)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def edit_transaction(
    transaction_id: UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    txn = await update_transaction(db, transaction_id, data, current_user.id)
    return await txn_to_response(txn, db)


@router.post("/{transaction_id}/cancel", response_model=TransactionResponse)
async def cancel_txn(
    transaction_id: UUID,
    data: TransactionCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    txn = await cancel_transaction(db, transaction_id, data.reason, current_user.id)
    return await txn_to_response(txn, db)
