from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "PackSure AI"
    API_V1_STR: str = "/api/v1"
    
    # Storage
    LOCAL_STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "local_storage")
    
    # Database
    DATABASE_URL: str = "sqlite:///./packsure.db"

    class Config:
        env_file = ".env"

settings = Settings()

# Ensure local storage directory exists
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
