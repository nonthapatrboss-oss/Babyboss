"""
Technical Analysis Engine
Computes RSI, MACD, EMA, Bollinger Bands, ATR, ADX, VWAP, Stochastic, CCI, OBV,
Ichimoku Cloud, SuperTrend, Parabolic SAR, Keltner Channel, Donchian Channel
"""
import numpy as np
import pandas as pd
import pandas_ta as pta
from typing import Dict, List, Optional, Tuple
import httpx
import structlog
import os

logger = structlog.get_logger()

# Load API key from pydantic settings (reads .env file automatically)
try:
    from config import Settings as _Settings
    TWELVE_DATA_KEY = _Settings().TWELVE_DATA_KEY
except Exception:
    TWELVE_DATA_KEY = os.getenv("TWELVE_DATA_KEY", "")

if TWELVE_DATA_KEY:
    logger.info(f"Twelve Data API key loaded ({TWELVE_DATA_KEY[:6]}…)")
else:
    logger.warning("No TWELVE_DATA_KEY found — will use synthetic data")


def _signal(value: float, buy_threshold: float, sell_threshold: float) -> str:
    if value > buy_threshold:
        return "BUY"
    elif value < sell_threshold:
        return "SELL"
    return "NEUTRAL"


def _get_bb_col(df: pd.DataFrame, prefix: str) -> Optional[str]:
    """Find Bollinger Band column regardless of pandas-ta version naming (2.0 vs 2)."""
    for col in df.columns:
        if col.startswith(prefix):
            return col
    return None


class TechnicalAnalyzer:
    """Computes full technical analysis from OHLCV data."""

    def __init__(self):
        self._cache: Dict[str, pd.DataFrame] = {}
        self._cache_time: Dict[str, float] = {}  # track when each cache entry was fetched

    # Twelve Data requires slash format: XAU/USD, EUR/USD, BTC/USD etc.
    SYMBOL_MAP = {
        "XAUUSD": "XAU/USD", "XAGUSD": "XAG/USD",
        "EURUSD": "EUR/USD", "GBPUSD": "GBP/USD",
        "USDJPY": "USD/JPY", "AUDUSD": "AUD/USD",
        "USDCAD": "USD/CAD", "USDCHF": "USD/CHF",
        "NZDUSD": "NZD/USD", "EURGBP": "EUR/GBP",
        "BTCUSD": "BTC/USD", "ETHUSD": "ETH/USD",
        "SOLUSD": "SOL/USD", "BNBUSD": "BNB/USD",
        "NDX": "NDX",        "SPX500": "SPX",
        "USOIL": "WTI/USD",  "US30": "DJI",
    }

    async def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 300) -> pd.DataFrame:
        """Fetch OHLCV candles from Twelve Data API (free tier: 800 req/day)."""
        import time
        cache_key = f"{symbol}_{timeframe}"
        # Return cached data if fresher than 60 seconds — avoids hitting rate limit
        if cache_key in self._cache and self._cache_time.get(cache_key, 0) > time.time() - 60:
            return self._cache[cache_key]

        tf_map = {"M1": "1min", "M5": "5min", "M15": "15min", "M30": "30min",
                  "H1": "1h", "H4": "4h", "D1": "1day", "W1": "1week"}
        interval = tf_map.get(timeframe, "15min")
        api_key = TWELVE_DATA_KEY or os.getenv("TWELVE_DATA_KEY", "")
        td_symbol = self.SYMBOL_MAP.get(symbol, symbol)   # convert XAUUSD → XAU/USD
        url = (
            f"https://api.twelvedata.com/time_series"
            f"?symbol={td_symbol}&interval={interval}&outputsize={limit}&format=JSON"
            f"&apikey={api_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url)
                data = r.json()
            if data.get("status") == "error" or not data.get("values"):
                logger.warning(f"Twelve Data returned no values for {symbol}: {data.get('message','')} — using synthetic")
                return self._generate_synthetic_data(symbol, limit)
            values = data["values"]
            df = pd.DataFrame(values)
            for col in ["open", "high", "low", "close", "volume"]:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col])
            df["datetime"] = pd.to_datetime(df["datetime"])
            df = df.sort_values("datetime").reset_index(drop=True)
            import time
            self._cache[cache_key] = df
            self._cache_time[cache_key] = time.time()
            logger.info(f"Fetched {len(df)} candles for {symbol}/{timeframe} from Twelve Data")
            return df
        except Exception as e:
            logger.warning(f"API fetch failed for {symbol}: {e} — using synthetic data")
            return self._generate_synthetic_data(symbol, limit)

    def _generate_synthetic_data(self, symbol: str, limit: int) -> pd.DataFrame:
        """Generate realistic synthetic OHLCV for testing (when no API key)."""
        base = {"XAUUSD": 3380, "EURUSD": 1.085, "BTCUSD": 68000, "NDX": 19800,
                "GBPUSD": 1.27, "USDJPY": 157.5, "AUDUSD": 0.658, "USDCAD": 1.365,
                "ETHUSD": 3800, "SPX500": 5200, "XAGUSD": 32.5}.get(symbol, 1.0)
        np.random.seed(hash(symbol) % 1000)
        returns = np.random.normal(0, 0.001, limit)
        closes = base * np.exp(np.cumsum(returns))
        dates = pd.date_range(end=pd.Timestamp.now(), periods=limit, freq="15min")
        df = pd.DataFrame({
            "datetime": dates,
            "open": closes * (1 + np.random.normal(0, 0.0003, limit)),
            "high": closes * (1 + np.abs(np.random.normal(0, 0.001, limit))),
            "low": closes * (1 - np.abs(np.random.normal(0, 0.001, limit))),
            "close": closes,
            "volume": np.random.randint(100, 10000, limit).astype(float),
        })
        return df

    async def analyze(self, symbol: str, timeframe: str) -> Dict:
        """Run full technical analysis and return structured result."""
        df = await self.fetch_ohlcv(symbol, timeframe)
        close = df["close"]
        high = df["high"]
        low = df["low"]
        # Forex pairs from Twelve Data don't include volume — use placeholder
        volume = df["volume"] if "volume" in df.columns else pd.Series([1.0] * len(df), index=df.index)

        results = {}

        # ── Oscillators ────────────────────────────────────────
        # RSI
        try:
            rsi = pta.rsi(close, length=14)
            rsi_val = float(rsi.iloc[-1]) if rsi is not None else 50
            results["RSI_14"] = {
                "value": round(rsi_val, 2),
                "signal": "BUY" if rsi_val < 40 else "SELL" if rsi_val > 70 else "NEUTRAL",
                "strength": int(abs(rsi_val - 50) * 2),
            }
        except Exception:
            pass

        # MACD
        try:
            macd = pta.macd(close, fast=12, slow=26, signal=9)
            if macd is not None and not macd.empty:
                macd_line = float(macd["MACD_12_26_9"].iloc[-1])
                signal_line = float(macd["MACDs_12_26_9"].iloc[-1])
                hist = float(macd["MACDh_12_26_9"].iloc[-1])
                results["MACD"] = {
                    "value": round(macd_line, 6),
                    "signal": "BUY" if macd_line > signal_line and hist > 0 else "SELL" if macd_line < signal_line and hist < 0 else "NEUTRAL",
                    "strength": min(100, int(abs(hist) * 10000)),
                }
        except Exception:
            pass

        # Stochastic RSI
        try:
            stochrsi = pta.stochrsi(close, length=14)
            if stochrsi is not None and not stochrsi.empty:
                k = float(stochrsi.iloc[-1, 0])
                results["Stoch_RSI"] = {
                    "value": round(k, 2),
                    "signal": "BUY" if k < 20 else "SELL" if k > 80 else "NEUTRAL",
                    "strength": int(abs(k - 50) * 2),
                }
        except Exception:
            pass

        # CCI
        try:
            cci = pta.cci(high, low, close, length=20)
            if cci is not None:
                cci_val = float(cci.iloc[-1])
                results["CCI_20"] = {
                    "value": round(cci_val, 2),
                    "signal": "BUY" if cci_val < -100 else "SELL" if cci_val > 100 else "NEUTRAL",
                    "strength": min(100, int(abs(cci_val) / 2)),
                }
        except Exception:
            pass

        # ── Trend / MAs ────────────────────────────────────────
        current_close = float(close.iloc[-1])

        for period in [20, 50, 200]:
            try:
                ema = pta.ema(close, length=period)
                if ema is not None:
                    ema_val = float(ema.iloc[-1])
                    results[f"EMA_{period}"] = {
                        "value": round(ema_val, 5),
                        "signal": "BUY" if current_close > ema_val else "SELL",
                        "strength": min(100, int(abs((current_close - ema_val) / ema_val) * 10000)),
                    }
            except Exception:
                pass

        # Bollinger Bands — use dynamic column lookup (works with all pandas-ta versions)
        try:
            bbands = pta.bbands(close, length=20, std=2)
            if bbands is not None and not bbands.empty:
                upper_col = _get_bb_col(bbands, "BBU")
                lower_col = _get_bb_col(bbands, "BBL")
                mid_col   = _get_bb_col(bbands, "BBM")
                if upper_col and lower_col and mid_col:
                    bb_upper = float(bbands[upper_col].iloc[-1])
                    bb_lower = float(bbands[lower_col].iloc[-1])
                    bb_mid   = float(bbands[mid_col].iloc[-1])
                    bb_signal = ("BUY" if current_close <= bb_lower
                                 else "SELL" if current_close >= bb_upper
                                 else "NEUTRAL")
                    results["Bollinger_Bands"] = {
                        "value": round(bb_mid, 5),
                        "signal": bb_signal,
                        "strength": 60,
                    }
        except Exception as e:
            logger.debug(f"BB error: {e}")

        # ATR
        atr = None
        try:
            atr = pta.atr(high, low, close, length=14)
            if atr is not None:
                results["ATR_14"] = {"value": round(float(atr.iloc[-1]), 5), "signal": "NEUTRAL", "strength": 50}
        except Exception:
            pass

        # ADX
        try:
            adx = pta.adx(high, low, close, length=14)
            if adx is not None and not adx.empty:
                adx_val = float(adx["ADX_14"].iloc[-1])
                dmp = float(adx["DMP_14"].iloc[-1])
                dmn = float(adx["DMN_14"].iloc[-1])
                results["ADX_14"] = {
                    "value": round(adx_val, 2),
                    "signal": "BUY" if dmp > dmn and adx_val > 25 else "SELL" if dmn > dmp and adx_val > 25 else "NEUTRAL",
                    "strength": min(100, int(adx_val * 2)),
                }
        except Exception:
            pass

        # VWAP
        try:
            typical = (high + low + close) / 3
            vwap_val = float(((typical * volume).cumsum() / volume.cumsum()).iloc[-1])
            results["VWAP"] = {
                "value": round(vwap_val, 5),
                "signal": "BUY" if current_close > vwap_val else "SELL",
                "strength": 65,
            }
        except Exception:
            pass

        # SuperTrend
        try:
            st = pta.supertrend(high, low, close, length=10, multiplier=3)
            if st is not None and not st.empty:
                st_dir = int(st.iloc[-1, -1])
                st_val = float(st.iloc[-1, 0])
                results["SuperTrend"] = {
                    "value": round(st_val, 5),
                    "signal": "BUY" if st_dir == 1 else "SELL",
                    "strength": 75,
                }
        except Exception:
            pass

        # Ichimoku
        try:
            ichimoku = pta.ichimoku(high, low, close)
            if ichimoku is not None and len(ichimoku) > 0:
                ichi_df = ichimoku[0]
                if not ichi_df.empty:
                    span_a = float(ichi_df.iloc[-1, 2]) if ichi_df.shape[1] > 2 else current_close
                    span_b = float(ichi_df.iloc[-1, 3]) if ichi_df.shape[1] > 3 else current_close
                    above_cloud = current_close > max(span_a, span_b)
                    results["Ichimoku"] = {
                        "value": "Above Cloud" if above_cloud else "Below Cloud",
                        "signal": "BUY" if above_cloud else "SELL",
                        "strength": 78,
                    }
        except Exception:
            pass

        # Parabolic SAR
        try:
            psar = pta.psar(high, low, close)
            if psar is not None and not psar.empty:
                psar_val = float(psar.iloc[-1, 0])
                if psar_val:
                    results["Parabolic_SAR"] = {
                        "value": round(psar_val, 5),
                        "signal": "BUY" if current_close > psar_val else "SELL",
                        "strength": 72,
                    }
        except Exception:
            pass

        # OBV
        try:
            obv = pta.obv(close, volume)
            if obv is not None and len(obv) > 5:
                obv_trend = "Rising" if float(obv.iloc[-1]) > float(obv.iloc[-5]) else "Falling"
                results["OBV"] = {
                    "value": obv_trend,
                    "signal": "BUY" if obv_trend == "Rising" else "SELL",
                    "strength": 68,
                }
        except Exception:
            pass

        # Williams %R
        try:
            willr = pta.willr(high, low, close, length=14)
            if willr is not None:
                w_val = float(willr.iloc[-1])
                results["Williams_R"] = {
                    "value": round(w_val, 2),
                    "signal": "BUY" if w_val < -80 else "SELL" if w_val > -20 else "NEUTRAL",
                    "strength": int(abs(w_val + 50) * 2),
                }
        except Exception:
            pass

        # Momentum
        try:
            mom = pta.mom(close, length=10)
            if mom is not None:
                mom_val = float(mom.iloc[-1])
                results["Momentum"] = {
                    "value": round(mom_val, 5),
                    "signal": "BUY" if mom_val > 0 else "SELL",
                    "strength": 55,
                }
        except Exception:
            pass

        # ── Compute Overall Bias ───────────────────────────────
        buy_count     = sum(1 for v in results.values() if v["signal"] == "BUY")
        sell_count    = sum(1 for v in results.values() if v["signal"] == "SELL")
        neutral_count = sum(1 for v in results.values() if v["signal"] == "NEUTRAL")
        total = len(results)

        buy_pct  = buy_count / total  if total > 0 else 0
        sell_pct = sell_count / total if total > 0 else 0

        if buy_pct >= 0.75:
            bias = "STRONG_BUY"
        elif buy_pct >= 0.55:
            bias = "BUY"
        elif sell_pct >= 0.75:
            bias = "STRONG_SELL"
        elif sell_pct >= 0.55:
            bias = "SELL"
        else:
            bias = "NEUTRAL"

        confidence = int(max(buy_pct, sell_pct) * 100)
        atr_val = float(atr.iloc[-1]) if atr is not None and len(atr) > 0 else None

        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "bias": bias,
            "bias_confidence": confidence,
            "indicators": results,
            "summary": {"buy": buy_count, "sell": sell_count, "neutral": neutral_count},
            "current_price": current_close,
            "atr": atr_val,
            "is_real_data": bool(TWELVE_DATA_KEY),
        }

    async def get_live_quotes(self, symbols: List[str]) -> List[Dict]:
        """Get latest prices for ticker strip."""
        quotes = []
        for symbol in symbols:
            df = self._cache.get(f"{symbol}_M15")
            if df is not None and not df.empty:
                price = float(df["close"].iloc[-1])
                prev  = float(df["close"].iloc[-2]) if len(df) > 1 else price
                change = price - prev
                pct    = (change / prev) * 100 if prev else 0
                quotes.append({
                    "symbol": symbol,
                    "price": round(price, 5),
                    "change": round(change, 5),
                    "change_pct": round(pct, 3),
                })
        return quotes
