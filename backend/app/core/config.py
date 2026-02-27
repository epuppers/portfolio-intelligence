from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://portfolio:portfolio@localhost:5432/portfolio_intelligence"
    cors_origins: list[str] = ["http://localhost:3000"]
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    newsapi_key: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
