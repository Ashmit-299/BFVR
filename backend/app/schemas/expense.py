from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class ExpenseCreate(BaseModel):
    amount: float
    category_id: UUID
    payment_method: str
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[UUID] = None
    payment_method: Optional[str] = None
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseCancel(BaseModel):
    reason: str


class ExpenseResponse(BaseModel):
    id: UUID
    amount: float
    category_id: UUID
    category_name: Optional[str] = None
    payment_method: str
    vendor_name: Optional[str] = None
    description: Optional[str] = None
    expense_date: date
    created_by: UUID
    creator_name: Optional[str] = None
    status: str
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]
    total: int
    page: int
    per_page: int
