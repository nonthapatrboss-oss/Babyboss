"use client";
import { TechnicalAnalysis } from "@/lib/types";

export function MarketBiasCard({ analysis }: { analysis: TechnicalAnalysis }) {
  const { bias, summary, indicators } = analysis;
  const total = (summary.buy + summary.sell + summary.neutral) || 1;
  const buyPct  = Math.round((summary.buy  / total) * 100);
  const sellPct = Math.round((summary.sell / total) * 100);
  const neutPct = 100 - buyPct - sellPct;

  const isBull = bias.includes("BUY");
  const isBear = bias.includes("SELL");
  const color  = isBull ? "#26a69a" : isBear ? "#ef5350" : "#787b86";

  return (
    <div className="tv-panel" style={{ borderRadius: 4 }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a2e39", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#787b86", letterSpacing: 1 }}>MARKET BIAS</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{bias.replace("_", " ")}</span>
      </div>
      <div style={{ padding: 12 }}>
        {/* Bias bar */}
        <div style={{ width: "100%", height: 6, borderRadius: 3, overflow: "hidden", display: "flex", marginBottom: 8, background: "#131722" }}>
          <div style={{ width: `${buyPct}%`,  background: "#26a69a", transition: "width .3s" }} />
          <div style={{ width: `${neutPct}%`, background: "#434651" }} />
          <div style={{ width: `${sellPct}%`, background: "#ef5350", transition: "width .3s" }} />
        </div>
        {/* Counts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
          {([["BUY", summary.buy, "#26a69a"], ["NEUT", summary.neutral, "#787b86"], ["SELL", summary.sell, "#ef5350"]] as [string, number, string][]).map(([label, count, c]) => (
            <div key={label} style={{ textAlign: "center", background: "#131722", borderRadius: 4, padding: "6px 0" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{count}</div>
              <div style={{ fontSize: 10, color: "#434651", marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {indicators.slice(0, 6).map(ind => {
            const ic = ind.signal === "BUY" ? "#26a69a" : ind.signal === "SELL" ? "#ef5350" : "#787b86";
            return (
              <div key={ind.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#787b86" }}>{ind.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 48, height: 3, background: "#1e222d", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(ind.strength ?? 50, 100)}%`, height: "100%", background: ic }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: ic, width: 28, textAlign: "right" }}>{ind.signal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
