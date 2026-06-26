"use client";
import { useState } from "react";
import { MarketBiasCard } from "@/components/dashboard/MarketBiasCard";
import { SignalCard } from "@/components/dashboard/SignalCard";
import { mockSignals, mockPerformance, mockChartData, mockTrades, mockTechnicalAnalysis } from "@/lib/mockData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ASSETS = [
  { s: "XAUUSD", tv: "TVC:GOLD"           },
  { s: "EURUSD", tv: "FX:EURUSD"          },
  { s: "BTCUSD", tv: "BITSTAMP:BTCUSD"    },
  { s: "NAS100", tv: "NASDAQ:NDX"         },
  { s: "GBPUSD", tv: "FX:GBPUSD"         },
];
const TFS = [
  { v:"1",  l:"1m" },{ v:"5",  l:"5m" },{ v:"15", l:"15m" },
  { v:"60", l:"1H" },{ v:"240",l:"4H" },{ v:"D",  l:"1D"  },
];

function Stat({ label, value, sub, up }: { label:string; value:string; sub?:string; up?:boolean }) {
  const c = up === undefined ? "#d1d4dc" : up ? "#26a69a" : "#ef5350";
  return (
    <div className="tv-panel" style={{ borderRadius:4, padding:12 }}>
      <div style={{ fontSize:11, color:"#787b86", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:c, lineHeight:1, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#434651" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [asset, setAsset] = useState(ASSETS[0]);
  const [tf, setTf] = useState("15");

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", overflow:"hidden" }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, padding:"8px 8px 0" }}>
        <Stat label="Total P&L"       value="+$8,420"  sub="This month"        up={true} />
        <Stat label="Win Rate"        value="73.2%"    sub="127 trades"         up={true} />
        <Stat label="Active Signals"  value="3"        sub="≥85% confidence"             />
        <Stat label="Avg R:R"         value="2.4"      sub="Risk / Reward"       up={true} />
      </div>

      {/* Main */}
      <div style={{ display:"flex", flex:1, gap:6, padding:"6px 8px", overflow:"hidden" }}>
        {/* Chart column */}
        <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:0, overflow:"hidden" }}>
          {/* Toolbar */}
          <div className="tv-panel" style={{ borderRadius:4, marginBottom:6, display:"flex", alignItems:"center", flexShrink:0 }}>
            {ASSETS.map(a => (
              <button key={a.s} onClick={() => setAsset(a)} className="tv-tab"
                style={{ color: asset.s===a.s?"#d1d4dc":"#787b86", borderBottom: asset.s===a.s?"2px solid #2196f3":"2px solid transparent" }}>
                {a.s}
              </button>
            ))}
            <div style={{ flex:1 }} />
            {TFS.map(t => (
              <button key={t.v} onClick={() => setTf(t.v)} className="tv-tab"
                style={{ fontSize:11, color:tf===t.v?"#26a69a":"#787b86", borderBottom:tf===t.v?"2px solid #26a69a":"2px solid transparent" }}>
                {t.l}
              </button>
            ))}
          </div>

          {/* TradingView Chart */}
          <div className="tv-panel" style={{ borderRadius:4, flex:1, overflow:"hidden", minHeight:300 }}>
            <iframe
              key={`${asset.tv}-${tf}`}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(asset.tv)}&interval=${tf}&theme=dark&style=1&locale=en&toolbar_bg=%231e222d&hide_top_toolbar=0&save_image=0&calendar=0&hide_legend=0&hide_volume=0&backgroundColor=%23131722&gridColor=%232a2e39`}
              style={{ width:"100%", height:"100%", border:"none" }}
            />
          </div>

          {/* Bottom charts row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:6, flexShrink:0 }}>
            {/* Equity curve */}
            <div className="tv-panel" style={{ borderRadius:4 }}>
              <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>EQUITY CURVE</div>
              <div style={{ height:110, padding:"4px 8px 8px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#26a69a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#26a69a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={["auto","auto"]}/>
                    <Tooltip contentStyle={{ background:"#2a2e39", border:"1px solid #363a45", borderRadius:4, fontSize:11 }} labelStyle={{ color:"#787b86" }} itemStyle={{ color:"#26a69a" }}/>
                    <Area type="monotone" dataKey="value" stroke="#26a69a" strokeWidth={1.5} fill="url(#eq)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent trades */}
            <div className="tv-panel" style={{ borderRadius:4, overflow:"hidden" }}>
              <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>RECENT TRADES</div>
              <table style={{ width:"100%", fontSize:11, borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #2a2e39" }}>
                    {["Symbol","Dir","Entry","P&L","Status"].map(h=>(
                      <th key={h} style={{ padding:"5px 10px", textAlign:"left", fontWeight:500, color:"#434651", fontFamily:"inherit" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockTrades.slice(0,5).map(t=>(
                    <tr key={t.id} style={{ borderBottom:"1px solid #1e222d" }}>
                      <td style={{ padding:"5px 10px", fontWeight:600, color:"#d1d4dc" }}>{t.symbol}</td>
                      <td style={{ padding:"5px 10px" }}><span className={t.direction==="BUY"?"badge-buy":"badge-sell"}>{t.direction}</span></td>
                      <td style={{ padding:"5px 10px", fontFamily:"monospace", color:"#787b86" }}>{t.entry}</td>
                      <td style={{ padding:"5px 10px", fontFamily:"monospace", fontWeight:600, color:(t.pnl??0)>0?"#26a69a":"#ef5350" }}>{(t.pnl??0)>0?"+":""}{t.pnl??0}</td>
                      <td style={{ padding:"5px 10px", fontSize:10, color:t.status==="Active"?"#26a69a":"#434651" }}>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:6, overflow:"hidden" }}>
          <MarketBiasCard analysis={mockTechnicalAnalysis} />
          <div className="tv-panel" style={{ borderRadius:4, flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"6px 12px", borderBottom:"1px solid #2a2e39", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>LIVE SIGNALS</span>
              <span className="badge-buy">{mockSignals.length} Active</span>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:8 }}>
              {mockSignals.map(s => <SignalCard key={s.id} signal={s} compact />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
