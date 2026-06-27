"""
AI Trading Platform — FastAPI Backend
Institutional-grade signal engine for Forex, Gold, Indices & Crypto
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

import structlog
import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel

from config import Settings
from signals.engine import SignalEngine
from analysis.technical import TechnicalAnalyzer
from analysis.smc import SMCAnalyzer
from news.scraper import NewsScraper
from notifications.line_notify import LineNotifier
from notifications.telegram import TelegramNotifier
from db.database import Database

logger = structlog.get_logger()
settings = Settings()

# ── Global Instances ──────────────────────────────────────
signal_engine = SignalEngine()
tech_analyzer = TechnicalAnalyzer()
smc_analyzer = SMCAnalyzer()
news_scraper = NewsScraper()
line_notifier = LineNotifier(settings.LINE_CHANNEL_ACCESS_TOKEN, settings.LINE_USER_ID)
telegram_notifier = TelegramNotifier(settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_CHAT_ID)
db = Database(settings.DATABASE_URL)
scheduler = AsyncIOScheduler()
ws_clients: List[WebSocket] = []  # Connected WebSocket clients


# ── Lifespan ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Trading Platform backend...")
    await db.connect()

    # Start news scraper in background — don't block server startup
    asyncio.create_task(news_scraper.start())

    # Schedule recurring jobs
    scheduler.add_job(run_scanner, "interval", seconds=60, id="scanner")
    scheduler.add_job(news_scraper.refresh, "interval", minutes=5, id="news")
    scheduler.add_job(broadcast_market_data, "interval", seconds=5, id="ws_ticker")
    scheduler.start()
    logger.info("Scheduler started — scanner every 60s, news every 5m, ticker every 5s")

    yield  # App runs here

    scheduler.shutdown()
    await db.disconnect()
    logger.info("Backend shutdown complete")


# ── App ────────────────────────────────────────────────────
app = FastAPI(
    title="AI Trading Platform API",
    description="Institutional-grade AI signal engine",
    version="1.0.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ────────────────────────────────────────
class AnalysisRequest(BaseModel):
    symbol: str
    timeframe: str = "M15"

class RiskCalcRequest(BaseModel):
    account_size: float
    risk_pct: float
    entry: float
    stop_loss: float
    take_profit: float
    leverage: int = 100
    pip_value: float = 10.0


# ── WebSocket Broadcast ────────────────────────────────────
async def broadcast_market_data():
    """Push live ticker data to all connected WebSocket clients."""
    if not ws_clients:
        return
    data = await tech_analyzer.get_live_quotes(["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "NDX"])
    payload = json.dumps({"type": "ticker", "data": data, "ts": datetime.utcnow().isoformat()})
    dead = []
    for ws in ws_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_clients.remove(ws)


async def broadcast_signal(signal: dict):
    """Push new signal to all connected WebSocket clients."""
    if not ws_clients:
        return
    payload = json.dumps({"type": "signal", "data": signal, "ts": datetime.utcnow().isoformat()})
    for ws in ws_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            pass


# ── Scanner Job ────────────────────────────────────────────
SCAN_SYMBOLS = [
    "XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "USDJPY",
]

async def run_scanner():
    """Run full AI scan across all instruments. Called every 60s."""
    logger.info("Running AI scanner...")
    results = []
    for symbol in SCAN_SYMBOLS:
        try:
            signal = await signal_engine.analyze(symbol, "M15")
            if signal and signal["confidence"] >= 85:
                results.append(signal)
                await db.save_signal(signal)

                if signal["confidence"] >= 87:
                    msg = format_line_message(signal)
                    await line_notifier.send(msg)
                    await telegram_notifier.send(msg)
                    await broadcast_signal(signal)
        except Exception as e:
            logger.error(f"Scanner error for {symbol}: {e}")

    results.sort(key=lambda x: x["confidence"], reverse=True)
    logger.info(f"Scanner complete: {len(results)} signals found")
    return results


def format_line_message(signal: dict) -> str:
    direction_emoji = "🟢" if "BUY" in signal["direction"] else "🔴"
    return f"""🚨 AI SIGNAL

{direction_emoji} Asset: {signal['symbol']}
📊 Signal: {signal['direction'].replace('_', ' ')}
💯 Confidence: {signal['confidence']}%

💰 Entry: {signal['entry']}
🛡️ SL: {signal['stop_loss']}
🎯 TP1: {signal['take_profits'][0]}
🎯 TP2: {signal['take_profits'][1]}
🎯 TP3: {signal['take_profits'][2]}

📈 R:R Ratio: {signal['risk_reward']}:1
🎲 Win Probability: {signal['probability']}%
⏱️ Timeframe: {signal['timeframe']}
⚡ Session: {signal['session']}

📋 Reasons:
{chr(10).join('✔ ' + r for r in signal['reasoning'][:4])}

⚠️ News Risk: {signal['news_risk']}
🕐 Duration: {signal['duration']}

─────────────────
AI Trading Platform | Not financial advice"""


# ── REST Endpoints ──────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/analyze")
async def analyze(req: AnalysisRequest):
    """Full AI analysis for a symbol: TA + SMC + News + Signal."""
    try:
        ta = await tech_analyzer.analyze(req.symbol, req.timeframe)
        smc = await smc_analyzer.analyze(req.symbol, req.timeframe)
        news = await news_scraper.get_relevant(req.symbol)
        signal = await signal_engine.analyze(req.symbol, req.timeframe)

        return {
            "symbol": req.symbol,
            "timeframe": req.timeframe,
            "technical": ta,
            "smc": smc,
            "news": news[:5],
            "signal": signal,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(500, str(e))


@app.get("/api/signals")
async def get_signals(
    limit: int = Query(20, le=100),
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    min_confidence: int = Query(80, ge=50, le=100),
):
    """Get recent AI-generated signals from DB."""
    signals = await db.get_signals(limit=limit, status=status, symbol=symbol, min_confidence=min_confidence)
    return {"signals": signals, "count": len(signals)}


@app.get("/api/scanner")
async def get_scanner_results():
    """Get latest scanner results."""
    results = await run_scanner()
    return {"results": results, "scanned_at": datetime.utcnow().isoformat()}


@app.get("/api/news")
async def get_news(currency: Optional[str] = None, impact: Optional[str] = None):
    """Get economic calendar & news events."""
    events = await news_scraper.get_all()
    if currency:
        events = [e for e in events if e["currency"] == currency.upper()]
    if impact:
        events = [e for e in events if e["impact"].lower() == impact.lower()]
    return {"events": events, "count": len(events)}


@app.post("/api/risk/calculate")
async def calculate_risk(req: RiskCalcRequest):
    """AI risk calculation: lot size, margin, PnL projections."""
    risk_amount = req.account_size * req.risk_pct / 100
    stop_pips = abs(req.entry - req.stop_loss)
    tp_pips = abs(req.take_profit - req.entry)
    rr = round(tp_pips / stop_pips, 2) if stop_pips > 0 else 0
    lot_size = round(risk_amount / (stop_pips * req.pip_value), 4) if stop_pips > 0 else 0
    potential_profit = lot_size * tp_pips * req.pip_value
    margin_required = (lot_size * 100000 * req.entry) / req.leverage

    return {
        "risk_amount": round(risk_amount, 2),
        "lot_size": lot_size,
        "potential_profit": round(potential_profit, 2),
        "potential_loss": round(risk_amount, 2),
        "risk_reward": rr,
        "stop_pips": round(stop_pips, 2),
        "tp_pips": round(tp_pips, 2),
        "margin_required": round(margin_required, 2),
        "risk_level": "Low" if req.risk_pct <= 1 else "Medium" if req.risk_pct <= 2 else "High",
    }


@app.get("/api/performance")
async def get_performance():
    """Get trading performance statistics."""
    stats = await db.get_performance_stats()
    return stats


@app.post("/api/signal/{signal_id}/close")
async def close_signal(signal_id: str, exit_price: float = Query(...)):
    """Mark a signal as closed with exit price."""
    await db.close_signal(signal_id, exit_price)
    return {"status": "closed", "signal_id": signal_id, "exit_price": exit_price}


@app.get("/api/quotes")
async def get_quotes():
    """Live price ticker for header strip."""
    symbols = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "NDX", "ETHUSD", "XAGUSD"]
    quotes = await tech_analyzer.get_live_quotes(symbols)
    return quotes or []


@app.post("/api/notify/test")
async def test_notification():
    """Send a test notification to LINE and Telegram."""
    msg = "🧪 AI Trading Platform\nTest notification — all systems operational!"
    await line_notifier.send(msg)
    await telegram_notifier.send(msg)
    return {"status": "sent", "channels": ["line", "telegram"]}


# ── WebSocket ──────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    logger.info(f"WebSocket client connected. Total: {len(ws_clients)}")
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "subscribe":
                symbol = msg.get("symbol", "XAUUSD")
                analysis = await signal_engine.analyze(symbol, "M15")
                await ws.send_text(json.dumps({"type": "analysis", "data": analysis}))
    except WebSocketDisconnect:
        ws_clients.remove(ws)
        logger.info(f"WebSocket client disconnected. Total: {len(ws_clients)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
