"""
Telegram Bot Notification Module
"""
import httpx
import structlog

logger = structlog.get_logger()


class TelegramNotifier:
    def __init__(self, bot_token: str, chat_id: str):
        self.token = bot_token
        self.chat_id = chat_id
        self._enabled = bool(bot_token and chat_id)
        self._base_url = f"https://api.telegram.org/bot{bot_token}"

    async def send(self, text: str) -> bool:
        if not self._enabled:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(f"{self._base_url}/sendMessage", json={
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                })
            if r.status_code == 200:
                logger.info("Telegram message sent")
                return True
            logger.error(f"Telegram failed: {r.text}")
            return False
        except Exception as e:
            logger.error(f"Telegram error: {e}")
            return False

    def format_signal(self, signal: dict) -> str:
        is_buy = "BUY" in signal["direction"]
        emoji = "🟢" if is_buy else "🔴"
        return (
            f"{emoji} <b>AI SIGNAL</b>\n\n"
            f"<b>Asset:</b> {signal['symbol']}\n"
            f"<b>Signal:</b> {signal['direction'].replace('_', ' ')}\n"
            f"<b>Confidence:</b> {signal['confidence']}%\n\n"
            f"<b>Entry:</b> {signal['entry']}\n"
            f"<b>SL:</b> {signal['stop_loss']}\n"
            f"<b>TP1:</b> {signal['take_profits'][0]}\n"
            f"<b>TP2:</b> {signal['take_profits'][1]}\n"
            f"<b>TP3:</b> {signal['take_profits'][2]}\n\n"
            f"<b>R:R:</b> {signal['risk_reward']}:1  |  "
            f"<b>Win Prob:</b> {signal['probability']}%\n"
            f"<b>Timeframe:</b> {signal['timeframe']}  |  "
            f"<b>Session:</b> {signal.get('session','')}\n\n"
            f"<i>AI Trading Platform — Not financial advice</i>"
        )
