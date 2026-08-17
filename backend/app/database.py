import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


def _is_remote(url: str) -> bool:
    return any(h in url for h in ("supabase", "render.com", "amazonaws", "neon.tech", "pooler"))


def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def get_async_engine():
    url = settings.async_db_url
    connect_args = {"ssl": _ssl_ctx()} if _is_remote(url) else {}
    return create_async_engine(url, echo=False, connect_args=connect_args)


engine = get_async_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
