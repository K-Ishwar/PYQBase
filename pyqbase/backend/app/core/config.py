from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List
import os

class Settings(BaseSettings):
    DATABASE_URL: str = Field(..., description="PostgreSQL database URL")
    SUPABASE_JWT_SECRET: str = Field(..., description="Supabase JWT secret for decoding tokens")
    SUPABASE_URL: str = Field(..., description="Supabase Project URL")
    SUPABASE_SERVICE_KEY: str = Field(..., description="Supabase Service Role Key")
    GROQ_API_KEY: str = Field(..., description="API key for Groq")
    RESEND_API_KEY: str = Field(..., description="API key for Resend")
    ENVIRONMENT: str = Field("development", description="Environment (development, staging, production)")
    SENTRY_DSN: str = Field(None, description="Sentry DSN for error tracking")
    
    # Comma-separated list in .env, parsing to list
    CORS_ORIGINS: str = Field(..., description="Comma separated list of allowed CORS origins")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

# Load settings at startup. If any required field is missing, Pydantic will raise ValidationError
settings = Settings()
