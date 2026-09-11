"""
Shared test fixtures. Uses an on-disk SQLite file via aiosqlite as a stand-in
for PostgreSQL so the suite runs without a live Postgres/Redis instance;
override DATABASE_URL to point at real Postgres for full-fidelity runs.
"""
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fakeredis.aioredis import FakeRedis

from app.core.database import Base, get_db
from app.core.security import get_redis
from app.main import app
import app.models  # noqa: F401 ensure models registered on Base.metadata

_fake_redis = FakeRedis(decode_responses=True)


async def _override_get_redis() -> FakeRedis:
    return _fake_redis


app.dependency_overrides[get_redis] = _override_get_redis

TEST_DB_URL = "sqlite+aiosqlite:///./test_artify_bharat.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def _setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _fake_redis.flushall()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
