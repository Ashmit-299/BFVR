from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class DailyClosingCreate(BaseModel):
    closing_date: date
    actual_cash_counted: Optional[float] = None
    upi_settled: Optional[float] = None
    notes: Optional[str] = None


class DailyClosingResponse(BaseModel):
    id: UUID
    closing_date: date
    system_cash_total: float
    actual_cash_counted: Optional[float] = None
    cash_difference: Optional[float] = None
    system_upi_total: float
    upi_settled: Optional[float] = None
    upi_difference: Optional[float] = None
    total_expenses: float
    operating_result: float
    closed_by: UUID
    creator_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyClosingListResponse(BaseModel):
    closings: list[DailyClosingResponse]
    total: int
    page: int
    per_page: int
