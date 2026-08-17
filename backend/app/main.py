from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import auth, transactions, expenses, categories, dashboard, analytics, closing
from app.api import settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Restaurant Financial Management System",
    description="A multi-user restaurant financial and operational management platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(expenses.router)
app.include_router(categories.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)
app.include_router(closing.router)
app.include_router(settings_router.router)


@app.get("/")
async def root():
    return {
        "message": "Restaurant Financial Management System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
