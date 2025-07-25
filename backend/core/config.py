import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "SkillsPulse"
    PROJECT_DESCRIPTION: str = "SkillsPulse is a comprehensive data analysis platform designed to streamline the process of analyzing and visualizing data through a series of automated steps."
    PROJECT_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    OPENAI_API_KEY: str = "your-openai-api-key-here"
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "your-anthropic-api-key-here")  # Add proper API key
    GOOGLE_API_KEY: str = ""
    PANDA_AGI_KEY: str = ""
    JULIUS_API_TOKEN: str = ""
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = ['.csv', '.xlsx', '.xls']
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "generated_charts"
    
    # OpenAI Settings
    OPENAI_MODEL: str = "gpt-4"
    MAX_TOKENS: int = 3000
    TEMPERATURE: float = 0.7
    # Database settings
    DATABASE_TYPE: str = "sqlite"  # can be "sqlite" or "postgresql"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database/db.sqlite")  # default SQLite
    DATABASE_ASYNC_URL: str | None = None  # will be computed based on DATABASE_URL
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    class Config:
        env_file = ".env"

settings = Settings()
