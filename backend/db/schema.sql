-- AI Trading Platform — PostgreSQL Schema
-- Run: psql -U postgres -d trading -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Signals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol          VARCHAR(20) NOT NULL,
    asset_class     VARCHAR(20),
    direction       VARCHAR(15) NOT NULL CHECK (direction IN ('STRONG_BUY','BUY','NEUTRAL','SELL','STRONG_SELL')),
    confidence      SMALLINT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    entry           DECIMAL(18,5) NOT NULL,
    entry_zone_low  DECIMAL(18,5),
    entry_zone_high DECIMAL(18,5),
    stop_loss       DECIMAL(18,5) NOT NULL,
    take_profit_1   DECIMAL(18,5),
    take_profit_2   DECIMAL(18,5),
    take_profit_3   DECIMAL(18,5),
    risk_reward     DECIMAL(6,2),
    probability     SMALLINT,
    timeframe       VARCHAR(5) NOT NULL,
    session         VARCHAR(30),
    duration        VARCHAR(20),
    reasoning       TEXT[],
    technical_summary TEXT,
    institutional_flow TEXT,
    trend_strength  SMALLINT,
    momentum_score  SMALLINT,
    liquidity_score SMALLINT,
    news_risk       VARCHAR(10) DEFAULT 'Low',
    status          VARCHAR(10) DEFAULT 'Active' CHECK (status IN ('Active','Closed','Pending')),
    exit_price      DECIMAL(18,5),
    pnl_pips        DECIMAL(10,2),
    pnl_usd         DECIMAL(12,2),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    CONSTRAINT signals_confidence_min CHECK (confidence >= 80)
);

CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_created ON signals(created_at DESC);
CREATE INDEX idx_signals_confidence ON signals(confidence DESC);

-- ── Trades ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id       UUID REFERENCES signals(id) ON DELETE SET NULL,
    symbol          VARCHAR(20) NOT NULL,
    direction       VARCHAR(5) NOT NULL CHECK (direction IN ('BUY','SELL')),
    entry           DECIMAL(18,5) NOT NULL,
    exit_price      DECIMAL(18,5),
    stop_loss       DECIMAL(18,5) NOT NULL,
    take_profit     DECIMAL(18,5),
    lots            DECIMAL(8,4) NOT NULL,
    leverage        SMALLINT DEFAULT 100,
    risk_amount     DECIMAL(12,2),
    profit          DECIMAL(12,2),
    pnl_pips        DECIMAL(10,2),
    status          VARCHAR(10) DEFAULT 'Active',
    timeframe       VARCHAR(5),
    opened_at       TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);

-- ── Performance Stats ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_date   DATE NOT NULL UNIQUE,
    total_trades    INT DEFAULT 0,
    winning_trades  INT DEFAULT 0,
    losing_trades   INT DEFAULT 0,
    win_rate        DECIMAL(5,2),
    total_pnl       DECIMAL(12,2) DEFAULT 0,
    avg_rr          DECIMAL(5,2),
    max_drawdown    DECIMAL(5,2),
    profit_factor   DECIMAL(6,2),
    sharpe_ratio    DECIMAL(6,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── News Events Cache ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    currency        VARCHAR(5),
    impact          VARCHAR(10),
    event_time      TIMESTAMPTZ,
    actual          VARCHAR(20),
    forecast        VARCHAR(20),
    previous        VARCHAR(20),
    ai_bias         VARCHAR(10),
    volatility      VARCHAR(10),
    source          VARCHAR(30),
    fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_currency ON news_events(currency);
CREATE INDEX idx_news_time ON news_events(event_time);

-- ── Scanner Cache ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scanner_results (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(20) NOT NULL,
    direction       VARCHAR(15),
    confidence      SMALLINT,
    entry           DECIMAL(18,5),
    stop_loss       DECIMAL(18,5),
    take_profit     DECIMAL(18,5),
    risk_reward     DECIMAL(6,2),
    timeframe       VARCHAR(5),
    reason          TEXT,
    scanned_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scanner_conf ON scanner_results(confidence DESC);
CREATE INDEX idx_scanner_time ON scanner_results(scanned_at DESC);

-- ── Alert Settings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_settings (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(50) DEFAULT 'default',
    min_confidence  SMALLINT DEFAULT 85,
    notify_line     BOOLEAN DEFAULT TRUE,
    notify_telegram BOOLEAN DEFAULT TRUE,
    notify_email    BOOLEAN DEFAULT FALSE,
    symbols_filter  TEXT[],  -- NULL = all
    max_risk        VARCHAR(10) DEFAULT 'Medium',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO alert_settings (user_id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ── Views ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_performance AS
SELECT
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE profit > 0) AS winning_trades,
    COUNT(*) FILTER (WHERE profit <= 0) AS losing_trades,
    ROUND(COUNT(*) FILTER (WHERE profit > 0)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) AS win_rate_pct,
    ROUND(SUM(profit), 2) AS total_pnl,
    ROUND(SUM(profit) FILTER (WHERE profit > 0) / NULLIF(ABS(SUM(profit) FILTER (WHERE profit < 0)), 0), 2) AS profit_factor,
    ROUND(AVG(ABS(take_profit - entry) / NULLIF(ABS(entry - stop_loss), 0)), 2) AS avg_rr
FROM trades
WHERE status = 'Closed';
