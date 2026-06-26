// ============================================================
// CORE TYPES — AI Institutional Trading Platform
// ============================================================

export type SignalDirection = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
export type TimeFrame = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";
export type AssetClass = "Forex" | "Gold" | "Crypto" | "Index" | "Stock" | "Commodity";
export type NewsImpact = "High" | "Medium" | "Low" | "None";
export type TradeStatus = "Active" | "Closed" | "Pending";

export interface Asset {
  symbol: string;
  name: string;
  class: AssetClass;
  tradingViewSymbol: string;
  pip: number;
  digits: number;
}

export interface Signal {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  confidence: number; // 0-100
  entry: number;
  entryZone: [number, number];
  stopLoss: number;
  takeProfits: [number, number, number];
  riskReward: number;
  probability: number; // 0-100
  timeframe: TimeFrame;
  session: string;
  duration: string; // "2-4 hours"
  createdAt: string;
  status: TradeStatus;
  reasoning: string[];
  technicalSummary: string;
  fundamentalSummary: string;
  newsSummary: string;
  institutionalFlow: string;
  liquidityScore: number; // 0-100
  momentumScore: number; // 0-100
  trendStrength: number; // 0-100
  newsRisk: NewsImpact;
}

export interface TechnicalIndicator {
  name: string;
  value: number | string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: number; // 0-100
}

export interface TechnicalAnalysis {
  symbol: string;
  timeframe: TimeFrame;
  bias: SignalDirection;
  biasConfidence: number;
  indicators: TechnicalIndicator[];
  oscillators: TechnicalIndicator[];
  movingAverages: TechnicalIndicator[];
  summary: {
    buy: number;
    sell: number;
    neutral: number;
  };
  updatedAt: string;
}

export interface SMCLevel {
  type:
    | "OrderBlock"
    | "FVG"
    | "LiquidityZone"
    | "BreakOfStructure"
    | "ChangeOfCharacter"
    | "SupplyZone"
    | "DemandZone"
    | "MitigationBlock"
    | "BreakerBlock";
  direction: "Bullish" | "Bearish" | "Neutral";
  price: number;
  strength: "Strong" | "Medium" | "Weak";
  status: "Active" | "Mitigated" | "Broken";
  timeframe: TimeFrame;
  tested?: boolean;
}

export interface SMCAnalysis {
  symbol: string;
  marketStructure: "Bullish" | "Bearish" | "Ranging";
  trend: "Uptrend" | "Downtrend" | "Sideways";
  premium: number; // price level
  discount: number; // price level
  equilibrium: number; // 50% level
  currentPosition: "Premium" | "Discount" | "Equilibrium";
  institutionalBias: "Accumulation" | "Distribution" | "Manipulation" | "Trending";
  levels: SMCLevel[];
  liquiditySweep: boolean;
  sweepDirection?: "Bullish" | "Bearish";
}

export interface NewsEvent {
  id: string;
  title: string;
  currency: string;
  impact: NewsImpact;
  actual: string | null;
  forecast: string;
  previous: string;
  time: string;
  date: string;
  aiBias: "Bullish" | "Bearish" | "Neutral";
  volatilityExpected: "High" | "Medium" | "Low";
  fakeMoveRisk: number; // 0-100
  waitTime: string; // "15 min after"
}

export interface Trade {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number;
  exit?: number;
  stopLoss: number;
  takeProfit: number;
  lots: number;
  profit?: number;
  pnl?: number;
  status: TradeStatus;
  openedAt: string;
  closedAt?: string;
  timeframe: TimeFrame;
  signalConfidence: number;
  pnlPips?: number;
}

export interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  avgRR: number;
  totalProfit: number;
  todayProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  winningTrades: number;
  losingTrades: number;
  bestTrade: number;
  worstTrade: number;
}

export interface RiskSettings {
  accountSize: number;
  maxDailyLoss: number;
  maxRiskPerTrade: number; // %
  leverage: number;
  preferredRR: number;
}

export interface ScannerResult {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  timeframe: TimeFrame;
  session: string;
  reason: string;
  change24h: number;
  volume: string;
  lastScanned: string;
}

export interface MarketTicker {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}
