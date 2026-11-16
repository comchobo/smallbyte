from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    postgres_user: str = "smallbyte"
    postgres_password: SecretStr = Field(min_length=1)
    postgres_db: str = "smallbyte"
    postgres_host: str = "db"
    postgres_port: int = 5432
    app_origin: str = "http://localhost:3000"
    github_client_id: str = ""
    github_client_secret: SecretStr = SecretStr("")
    ollama_api_key: SecretStr = SecretStr("")
    ollama_model: str = "deepseek-v4.1-flash:1017"
    github_timeout: float = 15
    ai_timeout: float = 120
    submission_max_bytes: int = 200_000
    github_download_max_bytes: int = 2_000_000
    ai_requests_per_minute: int = 6
    session_days: int = 30

    @property
    def secure_cookies(self) -> bool:
        return self.app_origin.startswith("https://")

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
