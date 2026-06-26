"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";
import { fetchScanner, ScannerRow } from "@/lib/api";

const CLASSES = ["All","Forex","Crypto","Metals","Indices"];
type SortKey = "symbol"|"bias_confidence"|"current_price";

export default function Scanner() {
  const [rows, setRows]           = useState<ScannerRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string|null>(null);
  const [tf, setTf]               = useState("M15");
  const [assetClass, setAssetClass] = useState("All");
  const [direction, setDirection] = useState("All");
  const [minConf, setMinConf]     = useState(0);
  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("bias_confidence");
  const [sortDir, setSortDir]     = useState<1|-1>(-1);
  const [countdown, setCountdown] = useState(60);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScanner(tf);
      setRows(data);
      setCountdown(60);
    } catch {
      setError("ไม่สามารถเชื่อมต่อ backend — รัน uvicorn main:app --reload ก่อน");
    } finally {
      setLoading(false);
    }
  }, [tf]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => { if(c<=1){load();return 60;} return c-1; }), 1000);
    return () => clearInterval(t);
  }, [load]);

  const toggleSort = (k: SortKey) => {
    if(sortKey===k) setSortDir(d => d===1?-1:1);
    else { setSortKey(k); setSortDir(-1); }
  };

  const filtered = rows
    .filter(r => assetClass==="All" || r.asset_class===assetClass)
    .filter(r => direction==="All" || r.bias.includes(direction))
    .filter(r => r.bias_confidence >= minConf)
    .filter(r => r.symbol.includes(search.toUpperCase()))
    .sort((a,b) => {
      const av = a[sortKey] as number|string;
      const bv = b[sortKey] as number|string;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });

  const biasColor = (b:string) => b.includes("BUY")?"#26a69a":b.includes("SELL")?"#ef5350":"#787b86";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", overflow:"hidden" }}>
      {/* Toolbar */}
      <div className="tv-panel" style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none", flexShrink:0, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <Search size={12} color="#787b86"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search symbol…"
            style={{ background:"#1e222d", border:"1px solid #2a2e39", borderRadius:3, color:"#d1d4dc", fontSize:12, padding:"3px 8px", width:110 }}/>
        </div>

        <select value={assetClass} onChange={e=>setAssetClass(e.target.value)}
          style={{ background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 6px" }}>
          {CLASSES.map(c=><option key={c}>{c}</option>)}
        </select>

        <select value={direction} onChange={e=>setDirection(e.target.value)}
          style={{ background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 6px" }}>
          <option>All</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
        </select>

        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#787b86" }}>
          <Filter size={11}/>
          <span>Min:</span>
          <input type="number" value={minConf} onChange={e=>setMinConf(+e.target.value)} min={0} max={100}
            style={{ width:44, background:"#1e222d", border:"1px solid #2a2e39", color:"#d1d4dc", fontSize:11, borderRadius:3, padding:"3px 4px", textAlign:"center" }}/>
          <span>%</span>
        </div>

        {(["M5","M15","M30","H1","H4","D1"]).map(t=>(
          <button key={t} onClick={()=>setTf(t)} className="tv-tab"
            style={{ fontSize:11, color:tf===t?"#26a69a":"#787b86", borderBottom:tf===t?"2px solid #26a69a":"2px solid transparent" }}>
            {t}
          </button>
        ))}

        <div style={{ flex:1 }}/>
        <span style={{ fontSize:11, color:"#787b86" }}>Refresh in <span style={{ color:"#2196f3" }}>{countdown}s</span></span>
        <button onClick={load} className="tv-btn">
          {loading?<Loader size={11} style={{ animation:"spin 1s linear infinite" }}/>:<RefreshCw size={11}/>}
          <span>Scan</span>
        </button>
      </div>

      {error && (
        <div style={{ background:"rgba(239,83,80,.1)", padding:"6px 14px", fontSize:12, color:"#ef5350", flexShrink:0 }}>⚠ {error}</div>
      )}

      {/* Table */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead style={{ position:"sticky", top:0, background:"#1e222d", zIndex:1 }}>
            <tr>
              {[
                {k:"symbol" as SortKey, l:"Symbol"},
                {k:null, l:"Class"},
                {k:"bias_confidence" as SortKey, l:"Bias / Conf%"},
                {k:null, l:"Indicators"},
                {k:"current_price" as SortKey, l:"Price"},
                {k:null, l:"ATR"},
                {k:null, l:"Signal"},
              ].map(({k,l})=>(
                <th key={l} onClick={k?()=>toggleSort(k):undefined}
                  style={{ padding:"8px 12px", textAlign:"left", color:"#787b86", fontWeight:600, letterSpacing:.5,
                    cursor:k?"pointer":"default", userSelect:"none",
                    borderBottom:"1px solid #2a2e39",
                    color: k&&sortKey===k?"#2196f3":"#787b86" }}>
                  {l}{k&&sortKey===k?(sortDir===-1?" ▼":" ▲"):""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length===0 && (
              <tr><td colSpan={7} style={{ textAlign:"center", padding:32, color:"#787b86" }}>
                <Loader size={20} style={{ animation:"spin 1s linear infinite", margin:"0 auto" }}/>
              </td></tr>
            )}
            {!loading && filtered.length===0 && rows.length>0 && (
              <tr><td colSpan={7} style={{ textAlign:"center", padding:32, color:"#787b86" }}>ไม่พบผลลัพธ์ที่ตรงเงื่อนไข</td></tr>
            )}
            {filtered.map(row => {
              const isBuy = row.bias.includes("BUY");
              const bc    = biasColor(row.bias);
              const total = row.summary.buy + row.summary.sell + row.summary.neutral;
              return (
                <tr key={row.symbol} style={{ borderBottom:"1px solid #1e222d" }}
                  className="hover-row">
                  <td style={{ padding:"10px 12px", fontWeight:700, color:"#d1d4dc" }}>{row.symbol}</td>
                  <td style={{ padding:"10px 12px", color:"#787b86", fontSize:11 }}>{row.asset_class}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontWeight:700, color:bc, minWidth:80 }}>{row.bias.replace("_"," ")}</span>
                      <div style={{ flex:1, height:4, background:"#131722", borderRadius:2, overflow:"hidden", minWidth:60 }}>
                        <div style={{ width:`${row.bias_confidence}%`, height:"100%", background:bc }}/>
                      </div>
                      <span style={{ color:bc, fontFamily:"monospace", fontSize:11 }}>{row.bias_confidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:6, fontSize:11 }}>
                      <span style={{ color:"#26a69a" }}>▲{row.summary.buy}</span>
                      <span style={{ color:"#ef5350" }}>▼{row.summary.sell}</span>
                      <span style={{ color:"#787b86" }}>—{row.summary.neutral}</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"#d1d4dc", fontWeight:600 }}>
                    {row.current_price.toLocaleString(undefined,{maximumFractionDigits:5})}
                  </td>
                  <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"#787b86", fontSize:11 }}>
                    {row.atr?.toFixed(4) ?? "—"}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {row.has_signal && row.signal ? (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {isBuy?<TrendingUp size={12} color="#26a69a"/>:<TrendingDown size={12} color="#ef5350"/>}
                        <span className={isBuy?"badge-buy":"badge-sell"} style={{ fontSize:10 }}>
                          {row.signal.direction.replace("_"," ")} {row.signal.confidence}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color:"#434651", fontSize:11 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop:"1px solid #2a2e39", padding:"6px 12px", display:"flex", justifyContent:"space-between", fontSize:11, color:"#787b86", flexShrink:0 }}>
        <span>{filtered.length} / {rows.length} symbols</span>
        <span>Timeframe: {tf} · Data: {rows[0]?.symbol ? (rows.some(r=>r.current_price>0)?"Real-time":"Synthetic") : "—"}</span>
      </div>
    </div>
  );
}
