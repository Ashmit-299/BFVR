from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, extract
from app.models.transaction import Transaction
from app.models.expense import Expense
from app.models.category import TransactionCategory


async def get_revenue_by_period(db: AsyncSession, start: date, end: date, period: str = "day") -> list[dict]:
    if period == "day":
        group_col = Transaction.transaction_date
    elif period == "week":
        group_col = func.date_trunc("week", Transaction.transaction_date)
    elif period == "month":
        group_col = func.date_trunc("month", Transaction.transaction_date)
    else:
        group_col = Transaction.transaction_date

    result = await db.execute(
        select(
            group_col.label("period"),
            func.sum(Transaction.amount).label("revenue"),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(group_col)
        .order_by(group_col)
    )
    rows = result.all()
    return [{"period": str(row.period), "revenue": float(row.revenue), "count": row.count} for row in rows]


async def get_expenses_by_period(db: AsyncSession, start: date, end: date, period: str = "day") -> list[dict]:
    if period == "day":
        group_col = Expense.expense_date
    elif period == "week":
        group_col = func.date_trunc("week", Expense.expense_date)
    elif period == "month":
        group_col = func.date_trunc("month", Expense.expense_date)
    else:
        group_col = Expense.expense_date

    result = await db.execute(
        select(
            group_col.label("period"),
            func.sum(Expense.amount).label("expenses"),
            func.count(Expense.id).label("count"),
        )
        .where(
            and_(
                Expense.expense_date >= start,
                Expense.expense_date <= end,
                Expense.status == "ACTIVE",
            )
        )
        .group_by(group_col)
        .order_by(group_col)
    )
    rows = result.all()
    return [{"period": str(row.period), "expenses": float(row.expenses), "count": row.count} for row in rows]


async def get_best_days(db: AsyncSession, start: date, end: date) -> list[dict]:
    result = await db.execute(
        select(
            func.extract("dow", Transaction.transaction_date).label("day_of_week"),
            func.avg(Transaction.amount).label("avg_sales"),
            func.sum(Transaction.amount).label("total_sales"),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(func.extract("dow", Transaction.transaction_date))
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = result.all()
    day_names = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
    return [
        {
            "day": day_names.get(int(row.day_of_week), "Unknown"),
            "avg_sales": float(row.avg_sales),
            "total_sales": float(row.total_sales),
            "count": row.count,
        }
        for row in rows
    ]


async def get_best_months(db: AsyncSession, year: int) -> list[dict]:
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    result = await db.execute(
        select(
            func.extract("month", Transaction.transaction_date).label("month"),
            func.sum(Transaction.amount).label("total_sales"),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(func.extract("month", Transaction.transaction_date))
        .order_by(func.extract("month", Transaction.transaction_date))
    )
    rows = result.all()
    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December",
    }
    return [
        {
            "month": month_names.get(int(row.month), "Unknown"),
            "month_number": int(row.month),
            "total_sales": float(row.total_sales),
            "count": row.count,
        }
        for row in rows
    ]


async def get_revenue_trends(db: AsyncSession, months: int = 6) -> list[dict]:
    end = date.today()
    start = end - timedelta(days=months * 30)

    revenue_data = await get_revenue_by_period(db, start, end, "month")
    expense_data = await get_expenses_by_period(db, start, end, "month")

    revenue_map = {r["period"]: r["revenue"] for r in revenue_data}
    expense_map = {e["period"]: e["expenses"] for e in expense_data}

    all_periods = sorted(set(list(revenue_map.keys()) + list(expense_map.keys())))

    trends = []
    for period in all_periods:
        rev = revenue_map.get(period, 0)
        exp = expense_map.get(period, 0)
        trends.append({
            "period": period,
            "revenue": rev,
            "expenses": exp,
            "result": rev - exp,
        })
    return trends


async def get_payment_method_stats(db: AsyncSession, start: date, end: date) -> list[dict]:
    result = await db.execute(
        select(
            Transaction.payment_method,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.transaction_date >= start,
                Transaction.transaction_date <= end,
                Transaction.status == "ACTIVE",
            )
        )
        .group_by(Transaction.payment_method)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = result.all()
    return [{"method": row.payment_method, "total": float(row.total), "count": row.count} for row in rows]


async def _get_expenses_by_category(db: AsyncSession, start: date, end: date) -> list[dict]:
    result = await db.execute(
        select(
            TransactionCategory.name,
            func.sum(Expense.amount).label("total"),
        )
        .join(TransactionCategory, Expense.category_id == TransactionCategory.id)
        .where(
            and_(
                Expense.expense_date >= start,
                Expense.expense_date <= end,
                Expense.status == "ACTIVE",
            )
        )
        .group_by(TransactionCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    )
    rows = result.all()
    return [{"category": row.name, "total": float(row.total)} for row in rows]


async def get_expense_alerts(db: AsyncSession, current_start: date, current_end: date, prev_start: date, prev_end: date) -> list[dict]:
    current = await _get_expenses_by_category(db, current_start, current_end)
    previous = await _get_expenses_by_category(db, prev_start, prev_end)

    prev_map = {p["category"]: p["total"] for p in previous}
    alerts = []

    for item in current:
        cat = item["category"]
        curr_total = item["total"]
        prev_total = prev_map.get(cat, 0)

        if prev_total > 0:
            change_pct = ((curr_total - prev_total) / prev_total) * 100
            if change_pct > 20:
                alerts.append({
                    "category": cat,
                    "current": curr_total,
                    "previous": prev_total,
                    "change_percent": round(change_pct, 1),
                    "alert_type": "INCREASE",
                    "message": f"{cat} expenses increased {round(change_pct, 1)}% compared to previous period",
                })
            elif change_pct < -20:
                alerts.append({
                    "category": cat,
                    "current": curr_total,
                    "previous": prev_total,
                    "change_percent": round(change_pct, 1),
                    "alert_type": "DECREASE",
                    "message": f"{cat} expenses decreased {round(abs(change_pct), 1)}% compared to previous period",
                })
    return alerts
