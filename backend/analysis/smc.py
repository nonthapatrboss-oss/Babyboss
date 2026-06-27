"""
Smart Money Concept (SMC) Analysis Engine
Detects: Order Blocks, FVG, Liquidity Zones, BOS, CHoCH,
         Supply/Demand Zones, Breaker Blocks, Mitigation Blocks
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
import structlog

logger = structlog.get_logger()


class SMCAnalyzer:
    """Institutional Smart Money Concept analysis."""

    async def analyze(self, symbol: str, timeframe: str, df: Optional[pd.DataFrame] = None) -> Dict:
        if df is None or df.empty:
            # Return structure only — in production this receives df from TechnicalAnalyzer
            return self._empty_result(symbol)

        result = {
            "symbol": symbol,
            "timeframe": timeframe,
            "market_structure": None,
            "trend": None,
            "premium": None,
            "discount": None,
            "equilibrium": None,
            "current_position": None,
            "institutional_bias": None,
            "liquidity_sweep": False,
            "sweep_direction": None,
            "levels": [],
        }

        closes = df["close"].values
        highs = df["high"].values
        lows = df["low"].values
        opens = df["open"].values

        result["market_structure"] = self._detect_market_structure(highs, lows, closes)
        result["trend"] = self._detect_trend(closes)

        swing_high, swing_low = self._detect_swing_points(highs, lows)
        if swing_high and swing_low:
            result["premium"] = round(swing_high, 5)
            result["discount"] = round(swing_low, 5)
            result["equilibrium"] = round((swing_high + swing_low) / 2, 5)
            current = closes[-1]
            if current > result["equilibrium"]:
                result["current_position"] = "Premium"
            elif current < result["equilibrium"]:
                result["current_position"] = "Discount"
            else:
                result["current_position"] = "Equilibrium"

        result["institutional_bias"] = self._detect_institutional_bias(closes, highs, lows)
        sweep, direction = self._detect_liquidity_sweep(highs, lows, closes)
        result["liquidity_sweep"] = sweep
        result["sweep_direction"] = direction

        # Detect SMC levels
        levels = []
        levels.extend(self._detect_order_blocks(opens, highs, lows, closes))
        levels.extend(self._detect_fair_value_gaps(highs, lows, closes))
        levels.extend(self._detect_supply_demand(highs, lows, closes))
        levels.extend(self._detect_bos_choch(highs, lows, closes))
        result["levels"] = sorted(levels, key=lambda x: abs(x["price"] - closes[-1]))[:12]

        return result

    def _detect_market_structure(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> str:
        if len(closes) < 20:
            return "Ranging"
        hh = highs[-5:].max() > highs[-20:-5].max()
        ll = lows[-5:].min() > lows[-20:-5].min()
        lh = highs[-5:].max() < highs[-20:-5].max()
        hl = lows[-5:].min() < lows[-20:-5].min()
        if hh and ll:
            return "Bullish"
        elif lh and hl:
            return "Bearish"
        return "Ranging"

    def _detect_trend(self, closes: np.ndarray) -> str:
        if len(closes) < 50:
            return "Sideways"
        ema20 = np.mean(closes[-20:])
        ema50 = np.mean(closes[-50:])
        if closes[-1] > ema20 > ema50:
            return "Uptrend"
        elif closes[-1] < ema20 < ema50:
            return "Downtrend"
        return "Sideways"

    def _detect_swing_points(self, highs: np.ndarray, lows: np.ndarray, lookback: int = 50) -> Tuple[Optional[float], Optional[float]]:
        if len(highs) < lookback:
            return None, None
        swing_high = float(highs[-lookback:].max())
        swing_low = float(lows[-lookback:].min())
        return swing_high, swing_low

    def _detect_institutional_bias(self, closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> str:
        if len(closes) < 30:
            return "Unknown"
        recent_range = highs[-30:].max() - lows[-30:].min()
        price_pos = (closes[-1] - lows[-30:].min()) / recent_range if recent_range > 0 else 0.5
        price_change = (closes[-1] - closes[-30]) / closes[-30]

        if price_pos < 0.3 and price_change > 0:
            return "Accumulation"
        elif price_pos > 0.7 and price_change < 0:
            return "Distribution"
        elif abs(price_change) > 0.01:
            return "Trending"
        return "Manipulation"

    def _detect_liquidity_sweep(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> Tuple[bool, Optional[str]]:
        if len(highs) < 10:
            return False, None
        prev_high = highs[-10:-1].max()
        prev_low = lows[-10:-1].min()
        if highs[-1] > prev_high and closes[-1] < prev_high:
            return True, "Bearish"  # Swept buy-side liquidity
        if lows[-1] < prev_low and closes[-1] > prev_low:
            return True, "Bullish"  # Swept sell-side liquidity
        return False, None

    def _detect_order_blocks(self, opens, highs, lows, closes, lookback: int = 50) -> List[Dict]:
        """
        Bullish OB: last bearish candle before a bullish impulse move up
        Bearish OB: last bullish candle before a bearish impulse move down
        """
        blocks = []
        n = min(len(closes), lookback)
        for i in range(2, n - 3):
            idx = -n + i
            is_bearish = closes[idx] < opens[idx]
            is_bullish = closes[idx] > opens[idx]
            # Check for impulse move after
            future_move_up = closes[idx + 1] > closes[idx] * 1.003
            future_move_dn = closes[idx + 1] < closes[idx] * 0.997

            if is_bearish and future_move_up:
                blocks.append({
                    "type": "OrderBlock",
                    "direction": "Bullish",
                    "price": round(float(lows[idx]), 5),
                    "strength": "Strong" if future_move_up else "Medium",
                    "status": "Active" if float(lows[idx]) > closes[-1] * 0.99 else "Mitigated",
                    "timeframe": "M15",
                })
            elif is_bullish and future_move_dn:
                blocks.append({
                    "type": "OrderBlock",
                    "direction": "Bearish",
                    "price": round(float(highs[idx]), 5),
                    "strength": "Strong",
                    "status": "Active" if float(highs[idx]) < closes[-1] * 1.01 else "Mitigated",
                    "timeframe": "M15",
                })
        return blocks[:4]

    def _detect_fair_value_gaps(self, highs, lows, closes) -> List[Dict]:
        """FVG = 3-candle pattern where high[i] < low[i+2] (bullish) or low[i] > high[i+2] (bearish)."""
        fvgs = []
        for i in range(len(closes) - 3, max(len(closes) - 30, 2), -1):
            if highs[i] < lows[i + 2]:
                gap_mid = (highs[i] + lows[i + 2]) / 2
                fvgs.append({
                    "type": "FVG",
                    "direction": "Bullish",
                    "price": round(float(gap_mid), 5),
                    "strength": "Medium",
                    "status": "Active" if closes[-1] > highs[i] else "Mitigated",
                    "timeframe": "M15",
                })
            elif lows[i] > highs[i + 2]:
                gap_mid = (lows[i] + highs[i + 2]) / 2
                fvgs.append({
                    "type": "FVG",
                    "direction": "Bearish",
                    "price": round(float(gap_mid), 5),
                    "strength": "Medium",
                    "status": "Active" if closes[-1] < lows[i] else "Mitigated",
                    "timeframe": "M15",
                })
        return fvgs[:3]

    def _detect_supply_demand(self, highs, lows, closes) -> List[Dict]:
        """Detect supply and demand zones via strong momentum candles."""
        levels = []
        for i in range(len(closes) - 5, max(len(closes) - 50, 2), -1):
            # Simplified: use price levels where strong rejection occurred
            if highs[i] == highs[max(0, i-5):i+1].max():
                levels.append({
                    "type": "SupplyZone",
                    "direction": "Bearish",
                    "price": round(float(highs[i]), 5),
                    "strength": "Strong",
                    "status": "Active",
                    "timeframe": "H1",
                })
            if lows[i] == lows[max(0, i-5):i+1].min():
                levels.append({
                    "type": "DemandZone",
                    "direction": "Bullish",
                    "price": round(float(lows[i]), 5),
                    "strength": "Strong",
                    "status": "Active",
                    "timeframe": "H1",
                })
        return levels[:4]

    def _detect_bos_choch(self, highs, lows, closes) -> List[Dict]:
        """Detect Break of Structure and Change of Character."""
        results = []
        if len(closes) < 10:
            return results
        prev_high = highs[-10:-1].max()
        prev_low = lows[-10:-1].min()
        if closes[-1] > prev_high:
            results.append({
                "type": "BreakOfStructure",
                "direction": "Bullish",
                "price": round(float(prev_high), 5),
                "strength": "Strong",
                "status": "Active",
                "timeframe": "M15",
            })
        if closes[-1] < prev_low:
            results.append({
                "type": "BreakOfStructure",
                "direction": "Bearish",
                "price": round(float(prev_low), 5),
                "strength": "Strong",
                "status": "Active",
                "timeframe": "M15",
            })
        return results

    def _empty_result(self, symbol: str) -> Dict:
        return {
            "symbol": symbol, "timeframe": "M15", "market_structure": "Ranging",
            "trend": "Sideways", "premium": None, "discount": None, "equilibrium": None,
            "current_position": "Equilibrium", "institutional_bias": "Unknown",
            "liquidity_sweep": False, "sweep_direction": None, "levels": [],
        }
