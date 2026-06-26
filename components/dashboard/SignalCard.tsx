"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Signal } from "@/lib/types";

export function SignalCard({ signal, compact }: { signal: Signal; compact?: boolean }) {
  const [exp, setExp] = useState(false);
  const buy   = signal.direction.includes("BUY");
  const color = buy ? "#26a69a" : "#ef5350";
  const bg    = buy ? "rgba(38,166,154,.08)" : "rgba(239,83,80,.08)";
  const bdr   = buy ? "rgba(38,166,154,.25)" : "rgba(239,83,80,.25)";

  if (compact) {
    return (
      <div onClick={() => setExp(!exp)} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 4, padding: "8px 10px", cursor: "pointer", marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#d1d4dc" }}>{signal.symbol}</span>
            <span className={buy ? "badge-buy" : "badge-sell"}>{signal.direction.replace("_"," ")}</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color }}>{signal.confidence}%</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#787b86" }}>
          <span>Entry <span style={{ color: "#d1d4dc", fontFamily: "monospace" }}>{signal.entry}</span></span>
          <span>RR <span style={{ color: "#f9a825" }}>1:{signal.riskReward}</span></span>
          <span style={{ marginLeft: "auto" }}>{signal.timeframe}</span>
        </div>
        {exp && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2a2e39" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 6 }}>
              {[["SL", signal.stopLoss, "#ef5350"],["TP1",signal.takeProfits[0],"#26a69a"],["TP2",signal.takeProfits[1],"#26a69a"]].map(([l,v,c])=>(
                <div key={l as string} style={{ textAlign: "center", background: "#131722", borderRadius: 3, padding: "4px 0" }}>
                  <div style={{ fontSize: 10, color: "#787b86" }}>{l as string}</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: c as string }}>{v as number}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#787b86" }}>{signal.reasoning[0]}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "#1e222d", border: `1px solid #2a2e39`, borderLeft: `3px solid ${color}`, borderRadius: 4, padding: 16, marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#d1d4dc" }}>{signal.symbol}</span>
            <span className={buy ? "badge-buy" : "badge-sell"}>{signal.direction.replace("_"," ")}</span>
            <span style={{ fontSize: 11, color: "#787b86" }}>{signal.timeframe} · {signal.session}</span>
          </div>
          <div style={{ fontSize: 11, color: "#787b86" }}>Duration: {signal.duration}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{signal.confidence}%</div>
          <div style={{ fontSize: 10, color: "#787b86", marginTop: 2 }}>CONFIDENCE</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ height: 3, background: "#131722", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${signal.confidence}%`, height: "100%", background: color }} />
      </div>

      {/* Price grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginBottom: 10 }}>
        {[["ENTRY",signal.entry,"#d1d4dc"],["STOP",signal.stopLoss,"#ef5350"],["TP1",signal.takeProfits[0],"#26a69a"],["TP2",signal.takeProfits[1],"#26a69a"],["TP3",signal.takeProfits[2],"#26a69a"]].map(([l,v,c])=>(
          <div key={l as string} style={{ textAlign: "center", background: "#131722", borderRadius: 4, padding: "6px 4px" }}>
            <div style={{ fontSize: 10, color: "#787b86", marginBottom: 3 }}>{l as string}</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: c as string }}>{v as number}</div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#787b86", marginBottom: 10 }}>
        <span>R:R <strong style={{ color: "#f9a825" }}>1:{signal.riskReward}</strong></span>
        <span>Win <strong style={{ color: "#d1d4dc" }}>{signal.probability}%</strong></span>
        <span>News <strong style={{ color: signal.newsRisk==="High"?"#ef5350":signal.newsRisk==="Medium"?"#f9a825":"#26a69a" }}>{signal.newsRisk}</strong></span>
        <span style={{ marginLeft: "auto" }}>
          <span style={{ fontSize: 10, color: "#26a69a", fontWeight: 600 }}>● ACTIVE</span>
        </span>
      </div>

      {/* Reasoning toggle */}
      <div style={{ borderTop: "1px solid #2a2e39", paddingTop: 8, cursor: "pointer" }} onClick={() => setExp(!exp)}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#787b86", marginBottom: exp ? 8 : 0 }}>
          <span>Analysis</span>
          {exp ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
        </div>
        {exp && signal.reasoning.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, color: "#787b86", marginBottom: 3 }}>
            <span style={{ color: "#2196f3" }}>›</span><span>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
