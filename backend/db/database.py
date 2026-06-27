"""
SQLite async database layer using aiosqlite.
Replaces the old asyncpg (PostgreSQL-only) implementation.
"""
import aiosqlite
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()

DB_PATH = "trading.db"


class Database:
    def __init__(self, url: str):
        # Accept either "sqlite+aiosqlite:///trading.db" or plain path
        if ":///" in url:
            path = url.split("///", 1)[1]
        else:
            path = url
        self._path = path or DB_PATH
        self._conn: Optional[aiosqlite.Connection] = None

    async def connect(self):
        try:
            self._conn = await aiosqlite.connect(self._path)
            self._conn.row_factory = aiosqlite.Row
            await self._conn.execute("PRAGMA journal_mode=WAL")
            await self._create_tables()
            logger.info(f"SQLite connected: {self._path}")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")

    async def disconnect(self):
        if self._conn:
            await self._conn.close()

    async def _create_tables(self):
        await self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS signals (
                id TEXT PRIMARY KEY,
                symbol TEXT NOT NULL,
                asset_class TEXT,
                direction TEXT NOT NULL,
                confidence INTEGER,
                entry REAL,
                stop_loss REAL,
                take_profit_1 REAL,
                take_profit_2 REAL,
                take_profit_3 REAL,
                risk_reward REAL,
                probability REAL,
                timeframe TEXT,
                session TEXT,
                duration TEXT,
                reasoning TEXT,
                technical_summary TEXT,
                institutional_flow TEXT,
                trend_strength INTEGER,
                momentum_score INTEGER,
                liquidity_score INTEGER,
                news_risk TEXT DEFAULT 'Low',
                status TEXT DEFAULT 'Active',
                exit_price REAL,
                created_at TEXT DEFAULT (datetime('now')),
                closed_at TEXT
            );

            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                signal_id TEXT,
                symbol TEXT,
                direction TEXT,
                entry REAL,
                exit_price REAL,
                pnl REAL,
                status TEXT DEFAULT 'Open',
                opened_at TEXT DEFAULT (datetime('now')),
                closed_at TEXT,
                FOREIGN KEY (signal_id) REFERENCES signals(id)
            );
        """)
        await self._conn.commit()

    async def save_signal(self, signal: dict) -> str:
        if not self._conn:
            return signal.get("id", str(uuid.uuid4()))
        sig_id = str(uuid.uuid4())
        tps = signal.get("take_profits", [0, 0, 0])
        tp1 = tps[0] if len(tps) > 0 else None
        tp2 = tps[1] if len(tps) > 1 else None
        tp3 = tps[2] if len(tps) > 2 else None
        reasoning = signal.get("reasoning", [])
        if isinstance(reasoning, list):
            reasoning = json.dumps(reasoning)
        try:
            await self._conn.execute("""
                INSERT INTO signals
                    (id, symbol, asset_class, direction, confidence, entry, stop_loss,
                     take_profit_1, take_profit_2, take_profit_3, risk_reward, probability,
                     timeframe, session, duration, reasoning, technical_summary,
                     institutional_flow, trend_strength, momentum_score, liquidity_score, news_risk)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                sig_id,
                signal["symbol"],
                signal.get("asset_class"),
                signal["direction"],
                signal.get("confidence"),
                signal.get("entry"),
                signal.get("stop_loss"),
                tp1, tp2, tp3,
                signal.get("risk_reward"),
                signal.get("probability"),
                signal.get("timeframe"),
                signal.get("session"),
                signal.get("duration"),
                reasoning,
                signal.get("technical_summary"),
                signal.get("institutional_flow"),
                signal.get("trend_strength"),
                signal.get("momentum_score"),
                signal.get("liquidity_score"),
                signal.get("news_risk", "Low"),
            ))
            await self._conn.commit()
            return sig_id
        except Exception as e:
            logger.error(f"save_signal error: {e}")
            return sig_id

    async def get_signals(self, limit=20, status=None, symbol=None, min_confidence=80) -> List[Dict]:
        if not self._conn:
            return []
        query = "SELECT * FROM signals WHERE confidence >= ?"
        params: list = [min_confidence]
        if status:
            query += " AND status = ?"; params.append(status)
        if symbol:
            query += " AND symbol = ?"; params.append(symbol.upper())
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        try:
            async with self._conn.execute(query, params) as cursor:
                rows = await cursor.fetchall()
            result = []
            for r in rows:
                d = dict(r)
                # Parse reasoning back to list
                if isinstance(d.get("reasoning"), str):
                    try:
                        d["reasoning"] = json.loads(d["reasoning"])
                    except Exception:
                        d["reasoning"] = [d["reasoning"]]
                # Reconstruct take_profits list
                d["take_profits"] = [
                    d.pop("take_profit_1", None),
                    d.pop("take_profit_2", None),
                    d.pop("take_profit_3", None),
                ]
                result.append(d)
            return result
        except Exception as e:
            logger.error(f"get_signals error: {e}")
            return []

    async def close_signal(self, signal_id: str, exit_price: float):
        if not self._conn:
            return
        try:
            await self._conn.execute("""
                UPDATE signals SET status='Closed', exit_price=?, closed_at=datetime('now')
                WHERE id=?
            """, (exit_price, signal_id))
            await self._conn.commit()
        except Exception as e:
            logger.error(f"close_signal error: {e}")

    async def get_performance_stats(self) -> Dict:
        if not self._conn:
            return {}
        try:
            async with self._conn.execute("""
                SELECT
                    COUNT(*) as total_signals,
                    SUM(CASE WHEN status='Closed' AND exit_price > entry AND direction='BUY' THEN 1
                             WHEN status='Closed' AND exit_price < entry AND direction='SELL' THEN 1
                             ELSE 0 END) as wins,
                    SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) as active,
                    AVG(confidence) as avg_confidence
                FROM signals
            """) as cursor:
                row = await cursor.fetchone()
            return dict(row) if row else {}
        except Exception as e:
            logger.error(f"get_performance_stats error: {e}")
            return {}
