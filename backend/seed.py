import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine, async_session, Base
from app.models.user import User
from app.models.category import TransactionCategory
from app.models.restaurant_setting import RestaurantSetting
from app.utils.auth import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from sqlalchemy import select

        existing = await db.execute(select(User).where(User.email == "owner@restaurant.com"))
        if existing.scalar_one_or_none():
            print("Seed data already exists. Skipping.")
            return

        db.add(User(
            name="Restaurant Owner",
            email="owner@baba.com",
            password_hash=hash_password("baba2580"),
            role="OWNER",
            phone="9559327592",
        ))
        db.add(User(
            name="Restaurant Manager",
            email="manager@ashmit.com",
            password_hash=hash_password("ashmit2580"),
            role="MANAGER",
            phone="8874409773",
        ))

        for name, typ, desc in [
            ("Food Sales", "INCOME", "Daily food and beverage sales"),
            ("Beverage Sales", "INCOME", "Tea, coffee, cold drinks"),
            ("Takeaway Sales", "INCOME", "Parcel and takeaway orders"),
            ("Delivery Sales", "INCOME", "Online delivery orders"),
        ]:
            db.add(TransactionCategory(name=name, type=typ, description=desc, is_default=True))

        for name, typ, desc in [
            ("Vegetables", "EXPENSE", "Fresh vegetable purchases"),
            ("Dairy", "EXPENSE", "Milk, paneer, curd, butter"),
            ("Kirana", "EXPENSE", "Rice, flour, oil, spices, grocery"),
            ("Gas", "EXPENSE", "LPG/CNG gas cylinders"),
            ("Electricity", "EXPENSE", "Electricity bills"),
            ("Water", "EXPENSE", "Water supply and bottles"),
            ("Salaries", "EXPENSE", "Staff salaries"),
            ("Rent", "EXPENSE", "Shop/restaurant rent"),
            ("Maintenance", "EXPENSE", "Kitchen and equipment maintenance"),
            ("Packaging", "EXPENSE", "Plates, cups, napkins, parcel bags"),
            ("Miscellaneous", "EXPENSE", "Other miscellaneous expenses"),
        ]:
            db.add(TransactionCategory(name=name, type=typ, description=desc, is_default=True))

        for key, value, desc in [
            ("restaurant_name", "My Restaurant", "Name of the restaurant"),
            ("tagline", "Financial Management", "Subtitle shown in sidebar"),
            ("currency_symbol", "₹", "Currency symbol for display"),
        ]:
            db.add(RestaurantSetting(key=key, value=value, description=desc))

        await db.commit()
        print("Seed data created successfully!")
        print("Owner: owner@restaurant.com / owner123")
        print("Manager: manager@restaurant.com / manager123")


if __name__ == "__main__":
    asyncio.run(seed())
