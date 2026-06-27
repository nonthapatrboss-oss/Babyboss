"""
LINE Messaging API Notification Module
Sends push messages to your LINE account when signals are generated.

Setup:
1. Go to LINE Developers Console → Create a Messaging API channel
2. Get your Channel Access Token
3. Get your LINE User ID (via https://api.line.me/v2/profile with your user token)
4. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID in .env
"""
import httpx
import structlog
from typing import Optional

logger = structlog.get_logger()

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"
LINE_MULTICAST_URL = "https://api.line.me/v2/bot/message/multicast"


class LineNotifier:
    def __init__(self, channel_access_token: str, user_id: str):
        self.token = channel_access_token
        self.user_id = user_id
        self._enabled = bool(channel_access_token and user_id)
        if not self._enabled:
            logger.warning("LINE notifier disabled — missing token or user_id")

    @property
    def _headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
        }

    async def send(self, text: str) -> bool:
        """Send a text message to the configured LINE user."""
        if not self._enabled:
            logger.debug("LINE send skipped (not configured)")
            return False
        try:
            payload = {
                "to": self.user_id,
                "messages": [{"type": "text", "text": text}],
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(LINE_PUSH_URL, headers=self._headers, json=payload)
            if r.status_code == 200:
                logger.info("LINE message sent successfully")
                return True
            else:
                logger.error(f"LINE send failed: {r.status_code} {r.text}")
                return False
        except Exception as e:
            logger.error(f"LINE send exception: {e}")
            return False

    async def send_flex(self, alt_text: str, flex_content: dict) -> bool:
        """Send a Flex Message (rich card layout) to LINE."""
        if not self._enabled:
            return False
        try:
            payload = {
                "to": self.user_id,
                "messages": [{
                    "type": "flex",
                    "altText": alt_text,
                    "contents": flex_content,
                }],
            }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(LINE_PUSH_URL, headers=self._headers, json=payload)
            return r.status_code == 200
        except Exception as e:
            logger.error(f"LINE flex send exception: {e}")
            return False

    def build_signal_flex(self, signal: dict) -> dict:
        """Build a beautiful LINE Flex Message for a trading signal."""
        is_buy = "BUY" in signal["direction"]
        color = "#10B981" if is_buy else "#EF4444"
        direction_label = signal["direction"].replace("_", " ")
        emoji = "🟢" if is_buy else "🔴"

        return {
            "type": "bubble",
            "header": {
                "type": "box", "layout": "vertical",
                "backgroundColor": color,
                "contents": [
                    {"type": "text", "text": f"{emoji} AI SIGNAL", "color": "#FFFFFF", "size": "lg", "weight": "bold"},
                    {"type": "text", "text": f"{signal['symbol']} · {signal['timeframe']}", "color": "#FFFFFF88", "size": "sm"},
                ]
            },
            "body": {
                "type": "box", "layout": "vertical", "spacing": "md",
                "contents": [
                    {"type": "text", "text": direction_label, "size": "xl", "weight": "bold", "color": color},
                    {"type": "text", "text": f"Confidence: {signal['confidence']}%", "size": "sm", "color": "#94A3B8"},
                    {"type": "separator"},
                    {"type": "box", "layout": "horizontal", "contents": [
                        {"type": "box", "layout": "vertical", "contents": [
                            {"type": "text", "text": "Entry", "size": "xs", "color": "#94A3B8"},
                            {"type": "text", "text": str(signal["entry"]), "size": "sm", "weight": "bold"},
                        ]},
                        {"type": "box", "layout": "vertical", "contents": [
                            {"type": "text", "text": "Stop Loss", "size": "xs", "color": "#EF4444"},
                            {"type": "text", "text": str(signal["stop_loss"]), "size": "sm", "weight": "bold", "color": "#EF4444"},
                        ]},
                        {"type": "box", "layout": "vertical", "contents": [
                            {"type": "text", "text": "TP1", "size": "xs", "color": "#10B981"},
                            {"type": "text", "text": str(signal["take_profits"][0]), "size": "sm", "weight": "bold", "color": "#10B981"},
                        ]},
                    ]},
                    {"type": "separator"},
                    {"type": "box", "layout": "horizontal", "contents": [
                        {"type": "text", "text": f"R:R {signal['risk_reward']}:1", "size": "sm", "color": "#8B5CF6"},
                        {"type": "text", "text": f"Win: {signal['probability']}%", "size": "sm", "color": "#3B82F6"},
                        {"type": "text", "text": f"Risk: {signal.get('news_risk','Low')}", "size": "sm",
                         "color": "#EF4444" if signal.get("news_risk") == "High" else "#F59E0B"},
                    ]},
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical",
                "backgroundColor": "#0F1629",
                "contents": [
                    {"type": "text", "text": "AI Trading Platform", "size": "xs", "color": "#475569", "align": "center"},
                    {"type": "text", "text": "Not financial advice", "size": "xs", "color": "#334155", "align": "center"},
                ]
            }
        }

    async def send_signal(self, signal: dict) -> bool:
        """Send a trading signal as a rich Flex Message."""
        flex = self.build_signal_flex(signal)
        alt_text = f"🚨 {signal['direction']} {signal['symbol']} — Confidence: {signal['confidence']}%"
        return await self.send_flex(alt_text, flex)
