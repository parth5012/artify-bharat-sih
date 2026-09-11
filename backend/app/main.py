from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.config import get_settings
from app.core.database import engine, Base
from app.api.v1.router import api_v1_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure DB schema tables are initialized
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Ensure media directory exists
    Path(settings.STORAGE_LOCAL_DIR).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ArtifyBharat Backend (SIH PS 26090) - Digital Business Manager & Heritage Passport Engine",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local media directory for served assets (audio recordings, enhanced images, QR codes)
media_path = Path(settings.STORAGE_LOCAL_DIR)
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "problem_statement": "SIH PS 26090: Digital Business Manager & Cryptographic Heritage Passport for Artisans",
        "docs": "/docs",
    }
