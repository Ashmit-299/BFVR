import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import sync_engine, SyncSession, Base
from app.models.user import User
from app.models.category import TransactionCategory
from app.models.restaurant_setting import RestaurantSetting
from app.utils.auth import hash_password


def seed():
    Base.metadata.create_all(sync_engine)

    with SyncSession() as db:
        from sqlalchemy import select

        existing = db.execute(select(User).where(User.email == "owner@restaurant.com")).scalar_one_or_none()
        if existing:
            print("Seed data already exists. Skipping.")
            return

        owner = User(
            name="Restaurant Owner",
            email="owner@restaurant.com",
            password_hash=hash_password("owner123"),
            role="OWNER",
            phone="9999999999",
        )
        db.add(owner)

        manager = User(
            name="Restaurant Manager",
            email="manager@restaurant.com",
            password_hash=hash_password("manager123"),
            role="MANAGER",
            phone="8888888888",
        )
        db.add(manager)

        income_categories = [
            ("Food Sales", "INCOME", "Daily food and beverage sales"),
            ("Beverage Sales", "INCOME", "Tea, coffee, cold drinks"),
            ("Takeaway Sales", "INCOME", "Parcel and takeaway orders"),
            ("Delivery Sales", "INCOME", "Online delivery orders"),
        ]

        expense_categories = [
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
        ]

        for name, typ, desc in income_categories:
            db.add(TransactionCategory(name=name, type=typ, description=desc, is_default=True))

        for name, typ, desc in expense_categories:
            db.add(TransactionCategory(name=name, type=typ, description=desc, is_default=True))

        default_settings = [
            ("restaurant_name", "My Restaurant", "Name of the restaurant"),
            ("tagline", "Financial Management", "Subtitle shown in sidebar"),
            ("currency_symbol", "₹", "Currency symbol for display"),
        ]
        for key, value, desc in default_settings:
            db.add(RestaurantSetting(key=key, value=value, description=desc))

        db.commit()
        print("Seed data created successfully!")
        print("Owner: owner@restaurant.com / owner123")
        print("Manager: manager@restaurant.com / manager123")


if __name__ == "__main__":
    seed()
