from pydantic import BaseModel
from uuid import UUID
from datetime import date, time, datetime
from typing import Optional


class TransactionCreate(BaseModel):
    amount: float
    payment_method: str
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None
    transaction_time: Optional[time] = None


class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    payment_method: Optional[str] = None
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None


class TransactionCancel(BaseModel):
    reason: str


class TransactionResponse(BaseModel):
    id: UUID
    amount: float
    payment_method: str
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    description: Optional[str] = None
    transaction_date: date
    transaction_time: time
    created_by: UUID
    creator_name: Optional[str] = None
    status: str
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    page: int
    per_page: int
