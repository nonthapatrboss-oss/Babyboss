from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Trading Platform"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "https://your-domain.vercel.app"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/trading"
    REDIS_URL: str = "redis://localhost:6379"

    # LINE Messaging API
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_USER_ID: str = ""   # Your LINE user ID to push to

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # Market Data APIs
    ALPHA_VANTAGE_KEY: str = ""      # Free: 25 req/day — or use paid tier
    TWELVE_DATA_KEY: str = ""         # 800 req/day free — recommended
    POLYGON_API_KEY: str = ""         # Stocks & crypto
    COINMARKETCAP_KEY: str = ""       # Crypto data

    # AI (Optional — for narrative generation)
    OPENAI_API_KEY: str = ""

    # Signal Settings
    MIN_CONFIDENCE: int = 85
    SCAN_INTERVAL_SECONDS: int = 60
    NEWS_REFRESH_MINUTES: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True
