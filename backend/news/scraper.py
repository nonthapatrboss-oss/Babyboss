"""
News & Economic Calendar Scraper
Sources: ForexFactory calendar, Reuters RSS, Investing.com RSS
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import feedparser
import httpx
from bs4 import BeautifulSoup
import structlog

logger = structlog.get_logger()

CURRENCY_MAP = {
    "USD": ["XAU", "BTC", "ETH", "NDX", "SPX"],
    "EUR": ["EURUSD", "GBPEUR"],
    "GBP": ["GBPUSD"],
    "JPY": ["USDJPY"],
    "AUD": ["AUDUSD"],
    "CAD": ["USDCAD"],
}

HIGH_IMPACT_KEYWORDS = [
    "NFP", "Non-Farm", "CPI", "FOMC", "Fed", "Interest Rate",
    "GDP", "PMI", "Retail Sales", "PPI", "Employment", "Inflation",
    "ECB", "BOJ", "BOE", "BOC", "RBA", "Central Bank",
]


class NewsScraper:
    def __init__(self):
        self._events: List[Dict] = []
        self._last_refresh: Optional[datetime] = None

    async def start(self):
        await self.refresh()

    async def refresh(self):
        """Fetch latest economic calendar and news."""
        logger.info("Refreshing news and economic calendar...")
        try:
            events = []
            events.extend(await self._fetch_ff_calendar())
            events.extend(await self._fetch_reuters_rss())
            self._events = events
            self._last_refresh = datetime.utcnow()
            logger.info(f"News refreshed: {len(events)} events")
        except Exception as e:
            logger.error(f"News refresh error: {e}")

    async def _fetch_ff_calendar(self) -> List[Dict]:
        """Fetch ForexFactory economic calendar (HTML scrape)."""
        events = []
        try:
            async with httpx.AsyncClient(timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }) as client:
                r = await client.get("https://www.forexfactory.com/calendar")
            soup = BeautifulSoup(r.text, "lxml")
            rows = soup.select("tr.calendar__row")
            current_date = datetime.now().strftime("%A, %B %d")
            for row in rows[:30]:
                try:
                    time_el = row.select_one(".calendar__time")
                    currency_el = row.select_one(".calendar__currency")
                    impact_el = row.select_one(".calendar__impact span")
                    title_el = row.select_one(".calendar__event-title")
                    actual_el = row.select_one(".calendar__actual")
                    forecast_el = row.select_one(".calendar__forecast")
                    prev_el = row.select_one(".calendar__previous")

                    if not title_el:
                        continue

                    impact_class = impact_el.get("class", []) if impact_el else []
                    impact = "High" if "high" in str(impact_class) else "Medium" if "medium" in str(impact_class) else "Low"
                    title = title_el.text.strip()

                    events.append({
                        "id": f"ff-{len(events)}",
                        "title": title,
                        "currency": currency_el.text.strip() if currency_el else "USD",
                        "impact": impact,
                        "time": time_el.text.strip() if time_el else "TBD",
                        "date": current_date,
                        "actual": actual_el.text.strip() if actual_el else None,
                        "forecast": forecast_el.text.strip() if forecast_el else "—",
                        "previous": prev_el.text.strip() if prev_el else "—",
                        "ai_bias": self._assess_news_bias(title, None, forecast_el.text.strip() if forecast_el else None),
                        "volatility_expected": "High" if impact == "High" else "Medium",
                        "fake_move_risk": 70 if impact == "High" else 40,
                        "wait_time": "15 min after" if impact == "High" else "5 min after",
                        "source": "ForexFactory",
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"ForexFactory scrape failed: {e}")
        return events

    async def _fetch_reuters_rss(self) -> List[Dict]:
        """Fetch Reuters financial news RSS."""
        events = []
        feeds = [
            "https://feeds.reuters.com/reuters/businessNews",
            "https://feeds.reuters.com/reuters/USnews",
        ]
        for url in feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    title = entry.get("title", "")
                    is_high = any(kw.lower() in title.lower() for kw in HIGH_IMPACT_KEYWORDS)
                    events.append({
                        "id": f"rss-{len(events)}",
                        "title": title,
                        "currency": "USD",
                        "impact": "High" if is_high else "Low",
                        "time": "Breaking",
                        "date": "Today",
                        "actual": None,
                        "forecast": "—",
                        "previous": "—",
                        "ai_bias": "Neutral",
                        "volatility_expected": "High" if is_high else "Low",
                        "fake_move_risk": 55 if is_high else 20,
                        "wait_time": "5 min after",
                        "source": "Reuters",
                        "url": entry.get("link", ""),
                    })
            except Exception as e:
                logger.warning(f"RSS feed error {url}: {e}")
        return events

    def _assess_news_bias(self, title: str, actual: Optional[str], forecast: Optional[str]) -> str:
        """Simple rule-based AI bias for news events."""
        title_lower = title.lower()
        if any(w in title_lower for w in ["rate hike", "hawkish", "stronger", "beat", "surplus"]):
            return "Bullish"
        if any(w in title_lower for w in ["rate cut", "dovish", "weaker", "miss", "deficit"]):
            return "Bearish"
        return "Neutral"

    async def get_all(self) -> List[Dict]:
        if not self._events or (self._last_refresh and (datetime.utcnow() - self._last_refresh).seconds > 300):
            await self.refresh()
        return self._events

    async def get_relevant(self, symbol: str) -> List[Dict]:
        """Get news relevant to a specific symbol."""
        all_events = await self.get_all()
        symbol_currencies = []
        for currency, symbols in CURRENCY_MAP.items():
            if any(s in symbol for s in symbols) or symbol.startswith(currency):
                symbol_currencies.append(currency)
        if not symbol_currencies:
            symbol_currencies = ["USD"]
        return [e for e in all_events if e.get("currency") in symbol_currencies]

    async def get_upcoming_high_impact(self, hours: int = 4) -> List[Dict]:
        """Get high-impact events in the next N hours."""
        all_events = await self.get_all()
        return [e for e in all_events if e["impact"] == "High" and e["actual"] is None]
