/**
 * API client — connects to FastAPI backend at http://localhost:8000
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IndicatorResult {
  value: number | string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: number;
}

export interface TechnicalAnalysis {
  symbol: string;
  timeframe: string;
  bias: string;
  bias_confidence: number;
  indicators: Record<string, IndicatorResult>;
  summary: { buy: number; sell: number; neutral: number };
  current_price: number;
  atr: number | null;
  is_real_data: boolean;
}

export interface Signal {
  id: string;
  symbol: string;
  asset_class: string;
  direction: "BUY" | "SELL" | "STRONG_BUY" | "STRONG_SELL";
  confidence: number;
  entry: number;
  stop_loss: number;
  take_profits: [number, number, number];
  risk_reward: number;
  probability: number;
  timeframe: string;
  session: string;
  duration: string;
  reasoning: string[];
  technical_summary: string;
  news_risk: string;
  status: "Active" | "Closed";
  created_at: string;
}

export interface ScannerRow {
  symbol: string;
  asset_class: string;
  bias: string;
  bias_confidence: number;
  current_price: number;
  atr: number | null;
  summary: { buy: number; sell: number; neutral: number };
  has_signal: boolean;
  signal?: Signal;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
}

export interface NewsEvent {
  time: string;
  currency: string;
  event: string;
  impact: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

/**
 * Full TA for one symbol + timeframe.
 * Backend: POST /api/analyze → returns { symbol, timeframe, technical, smc, news, signal }
 * We extract `technical` which is a TechnicalAnalysis.
 */
export async function fetchAnalysis(symbol: string, timeframe: string): Promise<TechnicalAnalysis> {
  const data = await post<{ technical: TechnicalAnalysis }>("/api/analyze", { symbol, timeframe });
  return data.technical;
}

/**
 * Latest signals from DB.
 * Backend: GET /api/signals → { signals: Signal[], count: number }
 */
export async function fetchSignals(opts?: {
  limit?: number;
  symbol?: string;
  min_confidence?: number;
}): Promise<Signal[]> {
  const data = await get<{ signals: Signal[]; count: number }>("/api/signals", {
    limit: opts?.limit ?? 20,
    ...(opts?.symbol ? { symbol: opts.symbol } : {}),
    min_confidence: opts?.min_confidence ?? 70,
  });
  return data.signals ?? [];
}

/**
 * Scanner: runs full analysis on all symbols.
 * Backend: GET /api/scanner → { results: Signal[], scanned_at }
 * We transform into ScannerRow[] for the table.
 */
export async function fetchScanner(_timeframe = "M15"): Promise<ScannerRow[]> {
  const data = await get<{ results: Signal[]; scanned_at: string }>("/api/scanner");
  // Convert signal list → ScannerRow (backend returns only signals that passed threshold)
  return (data.results ?? []).map(sig => ({
    symbol: sig.symbol,
    asset_class: sig.asset_class ?? "—",
    bias: sig.direction,
    bias_confidence: sig.confidence,
    current_price: sig.entry ?? 0,
    atr: null,
    summary: { buy: 0, sell: 0, neutral: 0 },
    has_signal: true,
    signal: sig,
  }));
}

/**
 * Live price ticker.
 * Backend: GET /api/quotes → Quote[]
 */
export async function fetchQuotes(): Promise<Quote[]> {
  return get<Quote[]>("/api/quotes");
}

/**
 * News / economic calendar.
 * Backend: GET /api/news → { events: NewsEvent[], count }
 */
export async function fetchNews(): Promise<NewsEvent[]> {
  const data = await get<{ events: NewsEvent[]; count: number }>("/api/news");
  return data.events ?? [];
}

/** Health check */
export async function fetchHealth(): Promise<{ status: string; timestamp: string }> {
  return get("/health");
}
