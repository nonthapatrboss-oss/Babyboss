"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader, TrendingUp, TrendingDown, Target, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { fetchSignals, Signal } from "@/lib/api";

const CLASSES = ["All","Forex","Crypto","Metals","Indices"];

export default function Signals() {
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string|null>(null);
  const [assetClass, setAssetClass] = useState("All");
  const [direction, setDirection]   = useState("All");
  const [minConf, setMinConf]       = useState(70);
  const [expanded, setExpanded]     = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchSignals({ limit:50, min_confidence:minConf });
      setSignals(data);
    } catch {
      setError("ไม่สามารถเชื่อมต่อ backend");
    } finally {
      setLoading(false);
    }
  }, [minConf]);

  useEffect(() => { load(); }, [load]);

  const filtered = signals
    .filter(s => assetClass==="All" || s.asset_class===assetClass)
    .filter(s => direction==="All" || s.direction.includes(direction));

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", overflow:"hidden" }}>
      {/* Toolbar */}
      <div className="tv-panel" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none", flexShrink:0 }}>
        <select value={assetClass} onChange={e=>setAssetClass(e.target.value)}
          style={{ background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 6px" }}>
          {CLASSES.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={direction} onChange={e=>setDirection(e.target.value)}
          style={{ background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 6px" }}>
          <option>All</option><option value="BUY">BUY only</option><option value="SELL">SELL only</option>
        </select>
        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#787b86" }}>
          <span>Min confidence:</span>
          <input type="number" value={minConf} onChange={e=>setMinConf(+e.target.value)} min={0} max={100}
            style={{ width:44, background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 4px", textAlign:"center" }}/>%
        </div>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:11, color:"#787b86" }}>{filtered.length} signals</span>
        <button onClick={load} className="tv-btn">
          {loading?<Loader size={11} style={{ animation:"spin 1s linear infinite" }}/>:<RefreshCw size={11}/>}
          <span>Refresh</span>
        </button>
      </div>

      {error && <div style={{ background:"rgba(239,83,80,.1)", padding:"6px 14px", fontSize:12, color:"#ef5350" }}>⚠ {error}</div>}

      <div style={{ flex:1, overflowY:"auto", padding:"8px 12px", display:"flex", flexDirection:"column", gap:8 }}>
        {loading && signals.length===0 && (
          <div style={{ textAlign:"center", padding:40 }}>
            <Loader size={24} color="#787b86" style={{ animation:"spin 1s linear infinite", margin:"0 auto" }}/>
          </div>
        )}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:"center", padding:40, color:"#787b86", fontSize:13 }}>
            ยังไม่มีสัญญาณที่ตรงเงื่อนไข (confidence ≥{minConf}%)
            <br/><span style={{ fontSize:11, marginTop:8, display:"block" }}>รัน backend แล้ว scanner จะสร้างสัญญาณทุก 60 วินาที</span>
          </div>
        )}
        {filtered.map(sig => {
          const buy      = sig.direction.includes("BUY");
          const sigColor = buy ? "#26a69a" : "#ef5350";
          const sigBg    = buy ? "rgba(38,166,154,.08)" : "rgba(239,83,80,.08)";
          const isOpen   = expanded === sig.id;
          return (
            <div key={sig.id} style={{ background:sigBg, border:`1px solid ${sigColor}40`, borderRadius:4 }}>
              {/* Header row */}
              <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", cursor:"pointer" }}
                onClick={() => setExpanded(isOpen ? null : sig.id)}>
                {buy?<TrendingUp size={14} color="#26a69a"/>:<TrendingDown size={14} color="#ef5350"/>}
                <span style={{ fontWeight:800, fontSize:14, color:"#d1d4dc", marginLeft:8 }}>{sig.symbol}</span>
                <span className={buy?"badge-buy":"badge-sell"} style={{ marginLeft:8 }}>{sig.direction.replace("_"," ")}</span>
                <span style={{ fontSize:11, color:"#787b86", marginLeft:8 }}>{sig.timeframe}</span>
                <span style={{ flex:1 }}/>
                <span style={{ fontSize:13, fontWeight:700, color:sigColor, marginRight:8 }}>{sig.confidence}%</span>
                <span style={{ fontSize:12, color:"#787b86", marginRight:8 }}>
                  {new Date(sig.created_at).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}
                </span>
                {isOpen ? <ChevronUp size={14} color="#787b86"/> : <ChevronDown size={14} color="#787b86"/>}
              </div>

              {/* Price row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:1, background:"#2a2e39", borderTop:`1px solid ${sigColor}30` }}>
                {[
                  { label:"ENTRY", value:sig.entry, color:"#2196f3" },
                  { label:"STOP",  value:sig.stop_loss, color:"#ef5350" },
                  { label:"TP1",   value:sig.take_profits?.[0], color:"#26a69a" },
                  { label:"TP2",   value:sig.take_profits?.[1], color:"#26a69a" },
                ].map(({label,value,color})=>(
                  <div key={label} style={{ background:"#1e222d", padding:"8px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#787b86", marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color, fontFamily:"monospace" }}>
                      {value?.toLocaleString(undefined,{maximumFractionDigits:5}) ?? "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding:"10px 14px", borderTop:"1px solid #2a2e39" }}>
                  <div style={{ display:"flex", gap:16, fontSize:11, color:"#787b86", marginBottom:8 }}>
                    <span>R:R <span style={{ color:"#f9a825", fontWeight:700 }}>1:{sig.risk_reward?.toFixed(1)}</span></span>
                    <span>Win% <span style={{ color:"#d1d4dc", fontWeight:700 }}>{sig.probability}%</span></span>
                    <span>Session <span style={{ color:"#2196f3" }}>{sig.session}</span></span>
                    <span>Duration <span style={{ color:"#d1d4dc" }}>{sig.duration}</span></span>
                    <span>News Risk <span style={{ color:sig.news_risk==="High"?"#ef5350":sig.news_risk==="Medium"?"#f9a825":"#26a69a" }}>{sig.news_risk}</span></span>
                  </div>
                  {sig.reasoning?.length > 0 && (
                    <div>
                      <div style={{ fontSize:11, color:"#787b86", marginBottom:4 }}>AI Reasoning:</div>
                      {sig.reasoning.map((r,i) => (
                        <div key={i} style={{ fontSize:11, color:"#d1d4dc", padding:"2px 0" }}>• {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
