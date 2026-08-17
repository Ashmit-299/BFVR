import uuid
from datetime import datetime, date
from sqlalchemy import String, Numeric, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class DailyClosing(Base):
    __tablename__ = "daily_closing"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    closing_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    system_cash_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    actual_cash_counted: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    cash_difference: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    system_upi_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    upi_settled: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    upi_difference: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    total_expenses: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    operating_result: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    closed_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
