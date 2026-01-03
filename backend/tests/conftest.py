"""
Test configuration for SkillsPulse backend
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from core.database import Base, get_async_db_dependency


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_database.db"
TEST_SYNC_DATABASE_URL = "sqlite:///./test_database.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def client(test_db) -> Generator[TestClient, None, None]:
    """Create test client with overridden database dependency."""
    
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_async_db_dependency] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_csv_content() -> bytes:
    """Sample CSV content for testing."""
    return b"""name,department,score,date
John Doe,Engineering,85,2026-01-01
Jane Smith,Marketing,92,2026-01-02
Bob Wilson,Engineering,78,2026-01-03
Alice Brown,Sales,88,2026-01-04
Charlie Davis,Marketing,95,2026-01-05
"""


@pytest.fixture
def auth_headers() -> dict:
    """Sample authentication headers for testing."""
    return {"Authorization": "Bearer test_token"}
