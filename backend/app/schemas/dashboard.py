from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class PaymentMethodBreakdown(BaseModel):
    cash: float = 0
    upi: float = 0
    card: float = 0
    other: float = 0
    total: float = 0


class DailySummary(BaseModel):
    date: date
    total_revenue: float
    total_expenses: float
    operating_result: float
    transaction_count: int
    expense_count: int
    payment_methods: PaymentMethodBreakdown


class WeeklySummary(BaseModel):
    start_date: date
    end_date: date
    total_revenue: float
    total_expenses: float
    operating_result: float
    daily_breakdown: List[dict]


class MonthlySummary(BaseModel):
    month: int
    year: int
    total_revenue: float
    total_expenses: float
    operating_result: float
    days_with_data: int
    avg_daily_revenue: float


class YearlySummary(BaseModel):
    year: int
    total_revenue: float
    total_expenses: float
    operating_result: float
    best_month: Optional[str] = None
    best_day: Optional[str] = None
    avg_monthly_revenue: float


class TrendData(BaseModel):
    label: str
    revenue: float
    expenses: float
    result: float


class AnalyticsResponse(BaseModel):
    trends: List[TrendData]
    best_day: Optional[str] = None
    best_month: Optional[str] = None
    revenue_growth: Optional[float] = None
    expense_growth: Optional[float] = None
