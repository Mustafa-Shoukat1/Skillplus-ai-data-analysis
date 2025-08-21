from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Generator
import asyncio
from pathlib import Path

from core.config import settings
from core.logger import logger

# Create database directory if using SQLite
if settings.DATABASE_TYPE == "sqlite":
    db_path = Path("database")
    db_path.mkdir(exist_ok=True)

# Database engines
if settings.DATABASE_TYPE == "sqlite":
    DATABASE_URL = f"sqlite:///{settings.DATABASE_URL.split('///')[-1]}"
    DATABASE_ASYNC_URL = f"sqlite+aiosqlite:///{settings.DATABASE_URL.split('///')[-1]}"
else:
    DATABASE_URL = settings.DATABASE_URL
    DATABASE_ASYNC_URL = settings.DATABASE_ASYNC_URL or settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Sync engine
engine = create_engine(
    DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG
)

# Async engine
async_engine = create_async_engine(
    DATABASE_ASYNC_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_ASYNC_URL else {}
)

# Session makers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()
metadata = MetaData()

def get_db() -> Generator[Session, None, None]:
    """Sync database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@asynccontextmanager
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Async database session context manager"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_async_db_dependency() -> AsyncGenerator[AsyncSession, None]:
    """Async database session dependency for FastAPI"""
    async with get_async_db() as session:
        yield session
\
async def init_db():
    """Initialize database tables"""
    try:
        # Import models to ensure they're registered
        from models.database import User, UploadedFile, AnalysisResult, AITemplate
        
        logger.info("Creating database tables...")
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ Database tables created successfully")
        
        # Verify analysis_results table has proper columns
        async with AsyncSessionLocal() as session:
            try:
                # Test query to verify table structure
                result = await session.execute(text("SELECT analysis_id FROM analysis_results LIMIT 1"))
                logger.info("✅ analysis_results table structure verified")
            except Exception as table_error:
                logger.warning(f"⚠️ analysis_results table verification failed: {table_error}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise

async def create_default_user():
    """Create a default user for testing purposes"""
    try:
        async with get_async_db() as db:
            from models.database import User
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.id == 1))
            existing_user = result.scalar_one_or_none()
            if not existing_user:
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                default_user = User(
                    id=1,
                    email="test@example.com",
                    username="testuser",
                    full_name="Test User",
                    hashed_password=pwd_context.hash("password123"),
                    is_active=True,
                    is_admin=True
                )
                db.add(default_user)
                await db.commit()
                logger.info("✅ Default user created")
    except Exception as e:
        logger.warning(f"Could not create default user: {e}")
        default_user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            hashed_password=pwd_context.hash("password123"),
            is_active=True,
            is_admin=True
        )
        
        db.add(default_user)
        await db.commit()
        logger.info("✅ Default user created")

async def create_default_templates():
    """Create default templates during initialization"""
    try:
        async with get_async_db() as db:
            from services.template_service import TemplateService
            await TemplateService.create_default_templates(db)
            logger.info("✅ Default templates created/verified")
    except Exception as e:
        logger.warning(f"Could not create default templates: {e}")

