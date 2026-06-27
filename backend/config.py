from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Trading Platform"
    DEBUG: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://babyboss-topaz.vercel.app",
    ]

    # Database — SQLite by default (no external DB needed)
    DATABASE_URL: str = "sqlite+aiosqlite:///trading.db"

    # LINE Messaging API
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_USER_ID: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # Market Data APIs
    ALPHA_VANTAGE_KEY: str = ""
    TWELVE_DATA_KEY: str = ""
    POLYGON_API_KEY: str = ""
    COINMARKETCAP_KEY: str = ""

    # AI (Optional)
    OPENAI_API_KEY: str = ""

    # Signal Settings
    MIN_CONFIDENCE: int = 85
    SCAN_INTERVAL_SECONDS: int = 60
    NEWS_REFRESH_MINUTES: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True
