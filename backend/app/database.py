import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings


def _is_remote(url: str) -> bool:
    return "supabase" in url or "render.com" in url or "amazonaws" in url or "neon.tech" in url


def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def get_async_engine():
    url = settings.async_db_url
    connect_args = {"ssl": _ssl_ctx()} if _is_remote(url) else {}
    return create_async_engine(url, echo=False, connect_args=connect_args)


def get_sync_engine():
    url = settings.sync_db_url
    connect_args = {"sslmode": "require"} if _is_remote(url) else {}
    return create_engine(url, echo=False, connect_args=connect_args)


engine = get_async_engine()
sync_engine = get_sync_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
SyncSession = sessionmaker(sync_engine)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
