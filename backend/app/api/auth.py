from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, TokenRefresh, UserListResponse
from app.services.auth_service import register_user, login_user, refresh_access_token, list_users
from app.api.deps import get_current_active_user, require_owner
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    user = await register_user(db, user_data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    tokens = await login_user(db, credentials)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    tokens = await refresh_access_token(db, data.refresh_token)
    return tokens


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/users", response_model=UserListResponse)
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    users = await list_users(db)
    return UserListResponse(users=users)
