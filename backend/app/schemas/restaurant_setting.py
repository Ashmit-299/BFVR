from pydantic import BaseModel
from typing import Optional


class RestaurantSettingUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    tagline: Optional[str] = None
    currency_symbol: Optional[str] = None


class RestaurantSettingResponse(BaseModel):
    restaurant_name: str
    tagline: str
    currency_symbol: str
