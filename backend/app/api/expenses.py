from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.category import TransactionCategory
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseCancel,
    ExpenseResponse, ExpenseListResponse,
)
from app.services.expense_service import (
    create_expense, get_expenses, get_expense_by_id,
    update_expense, cancel_expense,
)

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


async def exp_to_response(e, db: AsyncSession) -> ExpenseResponse:
    category_name = None
    if e.category_id:
        cat_result = await db.execute(select(TransactionCategory.name).where(TransactionCategory.id == e.category_id))
        cat_row = cat_result.first()
        if cat_row:
            category_name = cat_row[0]

    creator_name = None
    user_result = await db.execute(select(User.name).where(User.id == e.created_by))
    user_row = user_result.first()
    if user_row:
        creator_name = user_row[0]

    return ExpenseResponse(
        id=e.id,
        amount=float(e.amount),
        category_id=e.category_id,
        category_name=category_name,
        payment_method=e.payment_method,
        vendor_name=e.vendor_name,
        description=e.description,
        expense_date=e.expense_date,
        created_by=e.created_by,
        creator_name=creator_name,
        status=e.status,
        cancellation_reason=e.cancellation_reason,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


@router.post("", response_model=ExpenseResponse)
async def add_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = await create_expense(db, data, current_user.id)
    return await exp_to_response(expense, db)


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    start_date: date = None,
    end_date: date = None,
    category_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expenses, total = await get_expenses(db, page, per_page, start_date, end_date, category_id)
    return ExpenseListResponse(
        expenses=[await exp_to_response(e, db) for e in expenses],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = await get_expense_by_id(db, expense_id)
    return await exp_to_response(expense, db)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def edit_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = await update_expense(db, expense_id, data, current_user.id)
    return await exp_to_response(expense, db)


@router.post("/{expense_id}/cancel", response_model=ExpenseResponse)
async def cancel_exp(
    expense_id: UUID,
    data: ExpenseCancel,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    expense = await cancel_expense(db, expense_id, data.reason, current_user.id)
    return await exp_to_response(expense, db)
