"""
AI Signal Engine
Combines Technical Analysis + SMC + News to generate high-probability trade signals.
Signals are only generated when confidence >= 85%.
"""
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional
import structlog

from analysis.technical import TechnicalAnalyzer
from analysis.smc import SMCAnalyzer

logger = structlog.get_logger()

SESSIONS = {
    "Sydney":   (21, 6),
    "Tokyo":    (23, 8),
    "London":   (7, 16),
    "New York": (12, 21),
}

SYMBOL_META = {
    "XAUUSD": {"name": "Gold", "class": "Gold",  "pip": 0.1,    "typical_atr": 8.0},
    "EURUSD": {"name": "EUR/USD", "class": "Forex", "pip": 0.0001, "typical_atr": 0.0060},
    "GBPUSD": {"name": "GBP/USD", "class": "Forex", "pip": 0.0001, "typical_atr": 0.0080},
    "USDJPY": {"name": "USD/JPY", "class": "Forex", "pip": 0.01,   "typical_atr": 0.60},
    "BTCUSD": {"name": "Bitcoin", "class": "Crypto","pip": 1.0,    "typical_atr": 1200},
    "ETHUSD": {"name": "Ethereum","class": "Crypto","pip": 0.1,    "typical_atr": 80},
    "NDX":    {"name": "NASDAQ",  "class": "Index", "pip": 1.0,    "typical_atr": 150},
    "SPX500": {"name": "S&P 500", "class": "Index", "pip": 0.1,    "typical_atr": 35},
}


def get_active_session() -> str:
    hour = datetime.now(timezone.utc).hour
    active = []
    for name, (start, end) in SESSIONS.items():
        if start < end:
            if start <= hour < end:
                active.append(name)
        else:
            if hour >= start or hour < end:
                active.append(name)
    if len(active) >= 2:
        return "/".join(active[:2]) + " Overlap"
    return active[0] if active else "Off-Hours"


class SignalEngine:
    """Combines TA + SMC + News into a final AI signal."""

    def __init__(self):
        self.ta = TechnicalAnalyzer()
        self.smc = SMCAnalyzer()

    async def analyze(self, symbol: str, timeframe: str) -> Optional[Dict]:
        """
        Run full analysis and return a signal if confidence >= 85%.
        Returns None if no high-quality setup found.
        """
        try:
            # 1. Fetch data
            df = await self.ta.fetch_ohlcv(symbol, timeframe)
            if df is None or len(df) < 50:
                return None

            # 2. Technical Analysis
            ta_result = await self.ta.analyze(symbol, timeframe)
            current_price = ta_result["current_price"]
            atr = ta_result.get("atr") or SYMBOL_META.get(symbol, {}).get("typical_atr", 1.0)

            # 3. SMC Analysis
            smc_result = await self.smc.analyze(symbol, timeframe, df)

            # 4. Compute signal direction
            direction, raw_confidence, reasons = self._compute_signal(ta_result, smc_result)
            if direction is None:
                return None

            # 5. Compute confidence with SMC bonus
            confidence = self._compute_confidence(ta_result, smc_result, reasons)
            if confidence < 85:
                return None  # Only emit high-quality signals

            # 6. Calculate trade levels
            entry = current_price
            if direction in ("BUY", "STRONG_BUY"):
                sl = round(entry - atr * 0.9, 5)
                tp1 = round(entry + atr * 1.0, 5)
                tp2 = round(entry + atr * 1.8, 5)
                tp3 = round(entry + atr * 2.8, 5)
            else:
                sl = round(entry + atr * 0.9, 5)
                tp1 = round(entry - atr * 1.0, 5)
                tp2 = round(entry - atr * 1.8, 5)
                tp3 = round(entry - atr * 2.8, 5)

            risk = abs(entry - sl)
            reward = abs(tp2 - entry)
            rr = round(reward / risk, 2) if risk > 0 else 0

            # 7. Probability estimation
            win_prob = self._estimate_win_probability(confidence, rr, ta_result, smc_result)

            signal = {
                "id": f"{symbol}-{timeframe}-{int(datetime.now().timestamp())}",
                "symbol": symbol,
                "name": SYMBOL_META.get(symbol, {}).get("name", symbol),
                "asset_class": SYMBOL_META.get(symbol, {}).get("class", "Unknown"),
                "direction": direction,
                "confidence": confidence,
                "entry": round(entry, 5),
                "entry_zone": [round(entry - atr * 0.2, 5), round(entry + atr * 0.2, 5)],
                "stop_loss": sl,
                "take_profits": [tp1, tp2, tp3],
                "risk_reward": rr,
                "probability": win_prob,
                "timeframe": timeframe,
                "session": get_active_session(),
                "duration": self._estimate_duration(timeframe),
                "reasoning": reasons,
                "technical_summary": self._build_tech_summary(ta_result),
                "institutional_flow": self._build_smc_narrative(smc_result, direction),
                "trend_strength": self._calc_trend_strength(ta_result),
                "momentum_score": self._calc_momentum(ta_result),
                "liquidity_score": self._calc_liquidity(smc_result),
                "news_risk": "Low",  # Updated by news module
                "status": "Active",
                "created_at": datetime.utcnow().isoformat(),
            }
            logger.info(f"Signal generated: {symbol} {direction} conf={confidence}% rr={rr}")
            return signal

        except Exception as e:
            logger.error(f"Signal engine error for {symbol}: {e}")
            return None

    def _compute_signal(self, ta: Dict, smc: Dict):
        """Score buy vs sell using weighted indicator votes."""
        buy_score = 0
        sell_score = 0
        reasons = []

        # TA votes (each indicator has a weight)
        indicator_weights = {
            "RSI_14": 15, "MACD": 18, "EMA_20": 10, "EMA_50": 12, "EMA_200": 15,
            "Stoch_RSI": 12, "ADX_14": 10, "SuperTrend": 14, "Ichimoku": 12,
            "VWAP": 10, "Bollinger_Bands": 8, "OBV": 8, "CCI_20": 8,
        }
        for name, weight in indicator_weights.items():
            ind = ta["indicators"].get(name)
            if not ind:
                continue
            if ind["signal"] == "BUY":
                buy_score += weight
                if weight >= 12:
                    reasons.append(f"{name.replace('_', ' ')} → Bullish")
            elif ind["signal"] == "SELL":
                sell_score += weight
                if weight >= 12:
                    reasons.append(f"{name.replace('_', ' ')} → Bearish")

        # SMC votes
        if smc.get("market_structure") == "Bullish":
            buy_score += 20
            reasons.append("Bullish Market Structure")
        elif smc.get("market_structure") == "Bearish":
            sell_score += 20
            reasons.append("Bearish Market Structure")

        if smc.get("liquidity_sweep") and smc.get("sweep_direction") == "Bullish":
            buy_score += 25
            reasons.append("Bullish Liquidity Sweep Detected")
        elif smc.get("liquidity_sweep") and smc.get("sweep_direction") == "Bearish":
            sell_score += 25
            reasons.append("Bearish Liquidity Sweep Detected")

        for level in smc.get("levels", []):
            if level["status"] != "Active":
                continue
            if level["direction"] == "Bullish" and level["type"] in ("OrderBlock", "DemandZone"):
                buy_score += 15
                reasons.append(f"Price at Bullish {level['type']}")
                break
            elif level["direction"] == "Bearish" and level["type"] in ("OrderBlock", "SupplyZone"):
                sell_score += 15
                reasons.append(f"Price at Bearish {level['type']}")
                break

        if smc.get("current_position") == "Discount":
            buy_score += 10
            reasons.append("Price in Discount Zone")
        elif smc.get("current_position") == "Premium":
            sell_score += 10
            reasons.append("Price in Premium Zone")

        total = buy_score + sell_score
        if total == 0:
            return None, 0, []

        # Need clear majority
        if buy_score > sell_score * 1.4:
            raw_conf = int((buy_score / total) * 100)
            direction = "STRONG_BUY" if raw_conf > 80 else "BUY"
            return direction, raw_conf, reasons[:8]
        elif sell_score > buy_score * 1.4:
            raw_conf = int((sell_score / total) * 100)
            direction = "STRONG_SELL" if raw_conf > 80 else "SELL"
            return direction, raw_conf, reasons[:8]

        return None, 0, []

    def _compute_confidence(self, ta: Dict, smc: Dict, reasons: List[str]) -> int:
        """Compute final 0-100 confidence score."""
        base = ta["bias_confidence"]
        bonus = 0
        if smc.get("liquidity_sweep"):
            bonus += 8
        if smc.get("market_structure") in ("Bullish", "Bearish"):
            bonus += 5
        if len(reasons) >= 5:
            bonus += 5
        if len(reasons) >= 7:
            bonus += 3
        return min(98, base + bonus)

    def _estimate_win_probability(self, confidence: int, rr: float, ta: Dict, smc: Dict) -> int:
        base = confidence * 0.9
        if rr >= 2.5:
            base += 3
        elif rr < 1.5:
            base -= 5
        return max(50, min(97, int(base)))

    def _estimate_duration(self, tf: str) -> str:
        return {
            "M1": "5-30 min", "M5": "30-120 min", "M15": "2-4 hours",
            "M30": "4-8 hours", "H1": "4-12 hours", "H4": "1-3 days",
            "D1": "3-7 days", "W1": "1-4 weeks",
        }.get(tf, "2-4 hours")

    def _build_tech_summary(self, ta: Dict) -> str:
        inds = ta["indicators"]
        rsi = inds.get("RSI_14", {}).get("value", "N/A")
        macd_sig = inds.get("MACD", {}).get("signal", "N/A")
        ema200 = inds.get("EMA_200", {}).get("signal", "N/A")
        return (f"RSI(14)={rsi} | MACD {macd_sig} | Price {ema200} EMA200 | "
                f"Buy signals: {ta['summary']['buy']}, Sell: {ta['summary']['sell']}")

    def _build_smc_narrative(self, smc: Dict, direction: str) -> str:
        parts = []
        if smc.get("institutional_bias"):
            parts.append(f"Institutional phase: {smc['institutional_bias']}")
        if smc.get("liquidity_sweep"):
            parts.append(f"{smc['sweep_direction']} liquidity sweep confirmed")
        if smc.get("current_position"):
            parts.append(f"Price trading in {smc['current_position']} zone")
        return ". ".join(parts) + "." if parts else "Institutional analysis pending."

    def _calc_trend_strength(self, ta: Dict) -> int:
        adx = ta["indicators"].get("ADX_14", {}).get("value", 25)
        if isinstance(adx, (int, float)):
            return min(100, int(adx * 2))
        return 50

    def _calc_momentum(self, ta: Dict) -> int:
        buy_count = ta["summary"]["buy"]
        total = sum(ta["summary"].values())
        return int((buy_count / total) * 100) if total > 0 else 50

    def _calc_liquidity(self, smc: Dict) -> int:
        score = 60
        if smc.get("liquidity_sweep"):
            score += 20
        active_levels = [l for l in smc.get("levels", []) if l["status"] == "Active"]
        score += min(20, len(active_levels) * 5)
        return min(100, score)
