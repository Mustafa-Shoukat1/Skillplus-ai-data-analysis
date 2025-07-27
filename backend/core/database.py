import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from core.config import settings
from core.logger import logger

# Create declarative base
Base = declarative_base()

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

async def run_migrations():
    """Run database migrations including analysis_id updates and field renames"""
    try:
        async with async_engine.begin() as conn:
            # Check current table structure
            result = await conn.execute(text("PRAGMA table_info(analysis_results)"))
            columns = [row[1] for row in result.fetchall()]
            
            logger.info(f"Current analysis_results columns: {columns}")
            
            # Ensure analysis_id column exists and is properly indexed
            if 'analysis_id' not in columns:
                logger.info("Adding analysis_id column to analysis_results table")
                await conn.execute(text("ALTER TABLE analysis_results ADD COLUMN analysis_id TEXT UNIQUE"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_analysis_id ON analysis_results(analysis_id)"))
                logger.info("✅ Migration completed: added analysis_id column with index")
            else:
                logger.info("analysis_id column already exists")
                # Ensure it has proper constraints
                await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_id_unique ON analysis_results(analysis_id)"))
            
            # Update existing records without analysis_id
            result = await conn.execute(text("SELECT COUNT(*) FROM analysis_results WHERE analysis_id IS NULL OR analysis_id = ''"))
            null_count = result.fetchone()[0]
            
            if null_count > 0:
                logger.info(f"Found {null_count} records without analysis_id, updating...")
                
                # Get records without analysis_id
                result = await conn.execute(text("SELECT id, created_at FROM analysis_results WHERE analysis_id IS NULL OR analysis_id = ''"))
                records = result.fetchall()
                
                import uuid
                import time
                
                for record in records:
                    db_id, created_at = record
                    # Generate analysis_id based on creation time or current time
                    timestamp = int(time.mktime(created_at.timetuple())) if created_at else int(time.time())
                    unique_suffix = str(uuid.uuid4())[:8]
                    new_analysis_id = f"analysis_{timestamp}_{unique_suffix}"
                    
                    await conn.execute(
                        text("UPDATE analysis_results SET analysis_id = :analysis_id WHERE id = :id"),
                        {"analysis_id": new_analysis_id, "id": db_id}
                    )
                
                logger.info(f"✅ Updated {null_count} records with analysis_id")
            
            if 'visualization_html' not in columns:
                logger.info("Adding visualization_html column to analysis_results table")
                await conn.execute(text("ALTER TABLE analysis_results ADD COLUMN visualization_html TEXT"))
                logger.info("✅ Migration completed: added visualization_html column")
            else:
                logger.info("visualization_html column already exists")
            
            # Add template_id column if missing
            if 'template_id' not in columns:
                logger.info("Adding template_id column to analysis_results table")
                await conn.execute(text("ALTER TABLE analysis_results ADD COLUMN template_id INTEGER REFERENCES ai_templates(id)"))
                logger.info("✅ Migration completed: added template_id column")
            else:
                logger.info("template_id column already exists")
            
            # Handle is_visible to is_active migration
            if 'is_visible' in columns and 'is_active' not in columns:
                logger.info("Migrating is_visible to is_active column")
                await conn.execute(text("ALTER TABLE analysis_results ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
                await conn.execute(text("UPDATE analysis_results SET is_active = is_visible"))
                logger.info("✅ Migration completed: migrated is_visible to is_active")
            elif 'is_active' not in columns:
                logger.info("Adding is_active column to analysis_results table")
                await conn.execute(text("ALTER TABLE analysis_results ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
                logger.info("✅ Migration completed: added is_active column")
            else:
                logger.info("is_active column already exists")
                
            # Add index for is_active for faster queries
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_is_active ON analysis_results(is_active)"))
            
            # Remove legacy is_visible column if it exists and is_active exists
            if 'is_visible' in columns and 'is_active' in columns:
                logger.info("Removing legacy is_visible column")
                # Note: SQLite doesn't support DROP COLUMN, so we'll just leave it
                logger.info("⚠️ is_visible column left for compatibility (SQLite limitation)")
                
    except Exception as e:
        logger.warning(f"Migration warning: {e}")

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
    except Exception as e:
        logger.warning(f"Could not create default templates: {e}")

