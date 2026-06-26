"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader, TrendingUp, TrendingDown, Target, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { fetchAnalysis, fetchSignals, fetchNews, TechnicalAnalysis, Signal } from "@/lib/api";
import { mockSMCAnalysis, ASSETS } from "@/lib/mockData";

const TFS = [{v:"M1",l:"1m"},{v:"M5",l:"5m"},{v:"M15",l:"15m"},{v:"M30",l:"30m"},{v:"H1",l:"1H"},{v:"H4",l:"4H"},{v:"D1",l:"1D"}];
const TF_MAP: Record<string,string> = { M1:"1",M5:"5",M15:"15",M30:"30",H1:"60",H4:"240",D1:"D" };

export default function Analyzer() {
  const [symbol, setSymbol] = useState<typeof ASSETS[number]>(ASSETS[0]);
  const [tf, setTf]         = useState("M15");
  const [tab, setTab]       = useState<"indicators"|"smc"|"news">("indicators");
  const [loading, setLoading]   = useState(false);
  const [ta, setTa]             = useState<TechnicalAnalysis | null>(null);
  const [sig, setSig]           = useState<Signal | null>(null);
  const [news, setNews]         = useState<any[]>([]);
  const [error, setError]       = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taData, signals, newsData] = await Promise.all([
        fetchAnalysis(symbol.symbol, tf),
        fetchSignals({ symbol: symbol.symbol, limit: 1, min_confidence: 70 }),
        fetchNews(),
      ]);
      setTa(taData);
      setSig(signals[0] ?? null);
      setNews(newsData.slice(0, 20));
    } catch (e: any) {
      setError("ไม่สามารถเชื่อมต่อ backend — รัน uvicorn main:app --reload ก่อน");
    } finally {
      setLoading(false);
    }
  }, [symbol, tf]);

  useEffect(() => { analyze(); }, [analyze]);

  // Derive display values
  const buy      = sig?.direction?.includes("BUY");
  const sigColor = buy ? "#26a69a" : "#ef5350";
  const sigBg    = buy ? "rgba(38,166,154,.1)" : "rgba(239,83,80,.1)";
  const smc      = mockSMCAnalysis;

  // Convert backend indicators dict → sorted array
  const indicatorList = ta
    ? Object.entries(ta.indicators)
        .map(([name, v]) => ({ name: name.replace(/_/g," "), ...v }))
        .sort((a,b) => {
          const order = ["BUY","SELL","NEUTRAL"];
          return order.indexOf(a.signal) - order.indexOf(b.signal);
        })
    : [];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", overflow:"hidden" }}>
      {/* Toolbar */}
      <div className="tv-panel" style={{ display:"flex", alignItems:"center", borderRadius:0, borderLeft:"none", borderRight:"none", borderTop:"none", flexShrink:0 }}>
        <div style={{ display:"flex", overflowX:"auto", borderRight:"1px solid #2a2e39" }}>
          {ASSETS.map(a => (
            <button key={a.symbol} onClick={() => setSymbol(a)} className="tv-tab"
              style={{ color:symbol.symbol===a.symbol?"#d1d4dc":"#787b86", borderBottom:symbol.symbol===a.symbol?"2px solid #2196f3":"2px solid transparent" }}>
              {a.symbol}
            </button>
          ))}
        </div>
        <div style={{ display:"flex" }}>
          {TFS.map(t => (
            <button key={t.v} onClick={() => setTf(t.v)} className="tv-tab"
              style={{ fontSize:11, color:tf===t.v?"#26a69a":"#787b86", borderBottom:tf===t.v?"2px solid #26a69a":"2px solid transparent" }}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        {/* Live/Demo badge */}
        <div style={{ display:"flex", alignItems:"center", gap:4, marginRight:8 }}>
          {ta?.is_real_data
            ? <><Wifi size={12} color="#26a69a"/><span style={{ fontSize:10, color:"#26a69a" }}>LIVE</span></>
            : <><WifiOff size={12} color="#f9a825"/><span style={{ fontSize:10, color:"#f9a825" }}>SYNTHETIC</span></>
          }
        </div>
        <button onClick={analyze} className="tv-btn" style={{ margin:"0 12px" }}>
          {loading ? <Loader size={12} style={{ animation:"spin 1s linear infinite" }}/> : <RefreshCw size={12}/>}
          <span>Analyze</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background:"rgba(239,83,80,.1)", border:"1px solid rgba(239,83,80,.3)", padding:"6px 14px", fontSize:12, color:"#ef5350", flexShrink:0 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Chart */}
        <div style={{ flex:1, minWidth:0, padding:"6px 0 6px 8px", display:"flex", flexDirection:"column" }}>
          <div className="tv-panel" style={{ flex:1, borderRadius:4, overflow:"hidden", position:"relative" }}>
            {loading && (
              <div style={{ position:"absolute", inset:0, background:"rgba(19,23,34,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}>
                <div style={{ color:"#787b86", fontSize:13 }}>Analyzing {symbol.symbol}…</div>
              </div>
            )}
            {/* Price badge */}
            {ta && (
              <div style={{ position:"absolute", top:8, left:8, zIndex:5, background:"rgba(19,23,34,.85)", border:"1px solid #2a2e39", borderRadius:4, padding:"4px 10px" }}>
                <span style={{ fontSize:18, fontWeight:800, color:"#d1d4dc", fontFamily:"monospace" }}>
                  {ta.current_price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                </span>
                <span style={{ fontSize:11, color:"#787b86", marginLeft:6 }}>{symbol.symbol}</span>
              </div>
            )}
            <iframe
              key={`${symbol.tv}-${tf}`}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol.tv)}&interval=${TF_MAP[tf]||"15"}&theme=dark&style=1&locale=en&toolbar_bg=%231e222d&hide_top_toolbar=0&save_image=0&backgroundColor=%23131722&gridColor=%232a2e39`}
              style={{ width:"100%", height:"100%", border:"none" }}
            />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:340, flexShrink:0, display:"flex", flexDirection:"column", gap:6, padding:"6px 8px", overflow:"hidden" }}>
          {/* ═══ ENTRY SIGNAL PANEL ═══ */}
          {sig ? (
            <div style={{ background:sigBg, border:`1px solid ${sigColor}50`, borderRadius:4, padding:14, flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {buy ? <TrendingUp size={16} color="#26a69a"/> : <TrendingDown size={16} color="#ef5350"/>}
                  <span style={{ fontWeight:800, fontSize:15, color:"#d1d4dc" }}>{sig.symbol}</span>
                  <span className={buy?"badge-buy":"badge-sell"}>{sig.direction.replace("_"," ")}</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:22, fontWeight:900, color:sigColor, lineHeight:1 }}>{sig.confidence}%</div>
                  <div style={{ fontSize:9, color:"#787b86", letterSpacing:1 }}>CONFIDENCE</div>
                </div>
              </div>

              <div style={{ display:"flex", gap:12, fontSize:11, color:"#787b86", marginBottom:8 }}>
                <span>🕐 <span style={{ color:"#d1d4dc" }}>
                  {new Date(sig.created_at).toLocaleDateString("th-TH",{day:"2-digit",month:"short",year:"numeric"})}
                  {" "}{new Date(sig.created_at).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}
                </span></span>
                <span>Session: <span style={{ color:"#2196f3" }}>{sig.session}</span></span>
                <span style={{ marginLeft:"auto", color:"#26a69a", animation:"blink 1.5s infinite" }}>● ACTIVE</span>
              </div>

              <div style={{ height:3, background:"#1e222d", borderRadius:2, marginBottom:12, overflow:"hidden" }}>
                <div style={{ width:`${sig.confidence}%`, height:"100%", background:sigColor }}/>
              </div>

              {/* Entry box */}
              <div style={{ background:"rgba(33,150,243,.12)", border:"1px solid rgba(33,150,243,.3)", borderRadius:4, padding:"10px 14px", marginBottom:8, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#2196f3", fontWeight:700, letterSpacing:1, marginBottom:4 }}>📍 ENTRY PRICE</div>
                <div style={{ fontSize:26, fontWeight:900, color:"#d1d4dc", fontFamily:"monospace", letterSpacing:1 }}>
                  {sig.entry.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                </div>
              </div>

              {/* SL / TPs */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5 }}>
                <div style={{ background:"rgba(239,83,80,.12)", border:"1px solid rgba(239,83,80,.3)", borderRadius:4, padding:"8px 4px", textAlign:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, marginBottom:3 }}>
                    <ShieldAlert size={10} color="#ef5350"/>
                    <span style={{ fontSize:9, color:"#ef5350", fontWeight:700 }}>STOP</span>
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#ef5350" }}>
                    {sig.stop_loss?.toLocaleString(undefined,{maximumFractionDigits:5})}
                  </div>
                </div>
                {(sig.take_profits||[]).slice(0,3).map((tp,i)=>(
                  <div key={i} style={{ background:"rgba(38,166,154,.12)", border:"1px solid rgba(38,166,154,.3)", borderRadius:4, padding:"8px 4px", textAlign:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, marginBottom:3 }}>
                      <Target size={10} color="#26a69a"/>
                      <span style={{ fontSize:9, color:"#26a69a", fontWeight:700 }}>TP{i+1}</span>
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#26a69a" }}>
                      {tp?.toLocaleString(undefined,{maximumFractionDigits:5})}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", justifyContent:"space-around", marginTop:8, paddingTop:8, borderTop:"1px solid #2a2e39" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#787b86" }}>R:R Ratio</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#f9a825" }}>1:{sig.risk_reward?.toFixed(1)}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#787b86" }}>Win Prob.</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#d1d4dc" }}>{sig.probability}%</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#787b86" }}>Timeframe</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#d1d4dc" }}>{sig.timeframe}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#787b86" }}>News Risk</div>
                  <div style={{ fontSize:14, fontWeight:700, color:sig.news_risk==="High"?"#ef5350":sig.news_risk==="Medium"?"#f9a825":"#26a69a" }}>{sig.news_risk}</div>
                </div>
              </div>
            </div>
          ) : ta && (
            /* No signal yet — show bias summary */
            <div style={{ background:"rgba(30,34,45,.8)", border:"1px solid #2a2e39", borderRadius:4, padding:14, flexShrink:0, textAlign:"center" }}>
              <div style={{ fontSize:12, color:"#787b86", marginBottom:6 }}>AI Bias — {symbol.symbol} {tf}</div>
              <div style={{ fontSize:22, fontWeight:900, color:ta.bias.includes("BUY")?"#26a69a":"#ef5350", marginBottom:4 }}>
                {ta.bias.replace("_"," ")}
              </div>
              <div style={{ fontSize:12, color:"#787b86" }}>
                Confidence: <span style={{ color:"#d1d4dc" }}>{ta.bias_confidence}%</span>
                {"  "}|{"  "}
                Price: <span style={{ color:"#d1d4dc" }}>{ta.current_price.toLocaleString(undefined,{maximumFractionDigits:5})}</span>
              </div>
              <div style={{ fontSize:11, color:"#f9a825", marginTop:6 }}>ยังไม่มีสัญญาณที่ confidence ≥70%</div>
            </div>
          )}

          {/* Tabs */}
          <div className="tv-panel" style={{ borderRadius:4, display:"flex", flexShrink:0 }}>
            {(["indicators","smc","news"] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)} className="tv-tab"
                style={{ flex:1, textAlign:"center", color:tab===t?"#d1d4dc":"#787b86", borderBottom:tab===t?"2px solid #2196f3":"2px solid transparent", fontSize:11 }}>
                {t==="smc"?"SMC":t==="indicators"?`Indicators (${indicatorList.length})`:"News"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="tv-panel" style={{ borderRadius:4, flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ flex:1, overflowY:"auto" }}>

              {tab==="indicators" && ta && (
                <div>
                  <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>{indicatorList.length} INDICATORS</span>
                    <div style={{ display:"flex", gap:8, fontSize:11 }}>
                      <span style={{ color:"#26a69a" }}>▲ {ta.summary.buy}</span>
                      <span style={{ color:"#ef5350" }}>▼ {ta.summary.sell}</span>
                      <span style={{ color:"#787b86" }}>— {ta.summary.neutral}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:ta.bias.includes("BUY")?"#26a69a":"#ef5350" }}>{ta.bias.replace("_"," ")}</span>
                  </div>
                  {indicatorList.map(ind => {
                    const ic = ind.signal==="BUY"?"#26a69a":ind.signal==="SELL"?"#ef5350":"#787b86";
                    return (
                      <div key={ind.name} style={{ display:"flex", alignItems:"center", padding:"7px 12px", borderBottom:"1px solid #1e222d" }}>
                        <span style={{ flex:1, fontSize:12, color:"#d1d4dc" }}>{ind.name}</span>
                        <span style={{ fontSize:11, fontFamily:"monospace", color:"#434651", marginRight:8 }}>
                          {typeof ind.value==="number"?ind.value.toFixed(4):ind.value}
                        </span>
                        <div style={{ width:44, height:3, background:"#131722", borderRadius:2, marginRight:8, overflow:"hidden" }}>
                          <div style={{ width:`${Math.min(ind.strength??50,100)}%`, height:"100%", background:ic }}/>
                        </div>
                        <span style={{ width:32, textAlign:"right", fontSize:11, fontWeight:600, color:ic }}>{ind.signal}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab==="smc" && (
                <div>
                  <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>SMART MONEY</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#26a69a" }}>{smc.marketStructure}</span>
                  </div>
                  {smc.levels.map((lv,i)=>(
                    <div key={i} style={{ padding:"8px 12px", borderBottom:"1px solid #1e222d" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                        <span style={{ fontSize:12, color:"#d1d4dc", fontWeight:500 }}>{lv.type}</span>
                        <span style={{ fontSize:12, fontFamily:"monospace", color:"#f9a825", fontWeight:700 }}>{lv.price}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, fontSize:11, color:"#787b86" }}>
                        <span style={{ color:(lv.direction as string)==="BUY"||(lv.direction as string)==="Bullish"?"#26a69a":"#ef5350" }}>{lv.direction}</span>
                        <span>Strength: {lv.strength}</span>
                        {lv.tested && <span style={{ color:"#f9a825" }}>● Tested</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab==="news" && (
                <div>
                  <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>ECONOMIC CALENDAR</div>
                  {news.length === 0 && (
                    <div style={{ padding:16, color:"#787b86", fontSize:12 }}>กำลังโหลด…</div>
                  )}
                  {news.map((ev,i)=>{
                    const ic=ev.impact==="High"?"#ef5350":ev.impact==="Medium"?"#f9a825":"#26a69a";
                    return (
                      <div key={i} style={{ padding:"8px 12px", borderBottom:"1px solid #1e222d" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:12, color:"#d1d4dc", fontWeight:500 }}>{ev.event}</span>
                          <span style={{ fontSize:10, color:ic, background:`${ic}20`, padding:"1px 6px", borderRadius:3, fontWeight:700 }}>{ev.impact}</span>
                        </div>
                        <div style={{ display:"flex", gap:8, fontSize:11, color:"#787b86" }}>
                          <span style={{ color:"#2196f3" }}>{ev.currency}</span>
                          <span>{ev.time}</span>
                          {ev.forecast&&<span>F: {ev.forecast}</span>}
                          {ev.actual&&<span style={{ color:"#26a69a" }}>A: {ev.actual}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
