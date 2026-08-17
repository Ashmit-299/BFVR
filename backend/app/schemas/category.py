from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class CategoryCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    type: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
