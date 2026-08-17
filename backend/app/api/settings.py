from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_active_user, require_owner
from app.models.user import User
from app.models.restaurant_setting import RestaurantSetting
from app.schemas.restaurant_setting import RestaurantSettingResponse, RestaurantSettingUpdate

router = APIRouter(prefix="/api/settings", tags=["Restaurant Settings"])

DEFAULTS = {
    "restaurant_name": "My Restaurant",
    "tagline": "Financial Management",
    "currency_symbol": "₹",
}


async def get_settings_dict(db: AsyncSession) -> dict:
    result = await db.execute(select(RestaurantSetting))
    rows = result.scalars().all()
    settings = {row.key: row.value for row in rows}
    return {
        "restaurant_name": settings.get("restaurant_name", DEFAULTS["restaurant_name"]),
        "tagline": settings.get("tagline", DEFAULTS["tagline"]),
        "currency_symbol": settings.get("currency_symbol", DEFAULTS["currency_symbol"]),
    }


@router.get("", response_model=RestaurantSettingResponse)
async def get_restaurant_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await get_settings_dict(db)


@router.put("", response_model=RestaurantSettingResponse)
async def update_restaurant_settings(
    data: RestaurantSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            result = await db.execute(
                select(RestaurantSetting).where(RestaurantSetting.key == key)
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = value
            else:
                db.add(RestaurantSetting(key=key, value=value))
    await db.commit()
    return await get_settings_dict(db)
