import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.database import engine, async_session, Base
from app.models.user import User
from app.models.category import TransactionCategory
from app.models.restaurant_setting import RestaurantSetting
from app.utils.auth import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:

        # --- Users ---
        for email, name, password, role, phone in [
            ("owner@baba.com", "Restaurant Owner", "baba2580", "OWNER", "9559327592"),
            ("manager@ashmit.com", "Restaurant Manager", "ashmit2580", "MANAGER", "8874409773"),
        ]:
            exists = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not exists:
                db.add(User(name=name, email=email, password_hash=hash_password(password), role=role, phone=phone))

        # --- Categories ---
        for name, typ, desc in [
            ("Food Sales", "INCOME", "Daily food and beverage sales"),
            ("Beverage Sales", "INCOME", "Tea, coffee, cold drinks"),
            ("Takeaway Sales", "INCOME", "Parcel and takeaway orders"),
            ("Delivery Sales", "INCOME", "Online delivery orders"),
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
            exists = (await db.execute(
                select(TransactionCategory).where(TransactionCategory.name == name, TransactionCategory.type == typ)
            )).scalar_one_or_none()
            if not exists:
                db.add(TransactionCategory(name=name, type=typ, description=desc, is_default=True))

        # --- Restaurant Settings ---
        for key, value, desc in [
            ("restaurant_name", "Baba Restaurant", "Name of the restaurant"),
            ("tagline", "Financial Management", "Subtitle shown in sidebar"),
            ("currency_symbol", "₹", "Currency symbol for display"),
        ]:
            exists = (await db.execute(
                select(RestaurantSetting).where(RestaurantSetting.key == key)
            )).scalar_one_or_none()
            if not exists:
                db.add(RestaurantSetting(key=key, value=value, description=desc))

        await db.commit()
        print("Seed completed.")
        print("Owner: owner@baba.com / baba2580")
        print("Manager: manager@ashmit.com / ashmit2580")


if __name__ == "__main__":
    asyncio.run(seed())
