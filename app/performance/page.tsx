"use client";
import { mockPerformance, mockChartData, mockTrades } from "@/lib/mockData";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const PIE_DATA = [
  { name:"Forex",       value:45, color:"#2196f3" },
  { name:"Commodities", value:25, color:"#f9a825" },
  { name:"Crypto",      value:20, color:"#9c27b0" },
  { name:"Indices",     value:10, color:"#26a69a" },
];

const BAR_DATA = [
  { d:"Mon",  p:320 },{ d:"Tue", p:-85 },{ d:"Wed", p:540 },
  { d:"Thu", p:210 },{ d:"Fri", p:-40 },{ d:"Sat", p:180 },{ d:"Sun", p:95 },
];

function Kpi({ label, value, sub, color="#d1d4dc" }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div className="tv-panel" style={{ borderRadius:4, padding:14 }}>
      <div style={{ fontSize:11, color:"#787b86", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#434651" }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#2a2e39", border:"1px solid #363a45", borderRadius:4, padding:"6px 10px", fontSize:11 }}>
      <div style={{ color:"#787b86" }}>{label}</div>
      <div style={{ color:payload[0].value>=0?"#26a69a":"#ef5350", fontWeight:700 }}>
        {payload[0].value>=0?"+":""}{payload[0].value}
      </div>
    </div>
  );
};

export default function Performance() {
  const p = mockPerformance;

  return (
    <div style={{ padding:8, height:"calc(100vh - 48px)", overflowY:"auto" }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, marginBottom:8 }}>
        <Kpi label="Total Trades"  value={String(p.totalTrades)}         color="#d1d4dc"  />
        <Kpi label="Win Rate"      value={p.winRate+"%"}                  color="#26a69a"  />
        <Kpi label="Total Profit"  value={`+$${p.totalProfit.toLocaleString()}`} color="#26a69a" sub="All time" />
        <Kpi label="Avg R:R"       value={String(p.avgRR)}                color="#f9a825"  />
        <Kpi label="Profit Factor" value={String(p.profitFactor)}         color="#2196f3"  />
        <Kpi label="Max Drawdown"  value={p.maxDrawdown+"%"}              color="#ef5350"  />
      </div>

      {/* Charts row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, marginBottom:8 }}>
        {/* Equity curve */}
        <div className="tv-panel" style={{ borderRadius:4 }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>EQUITY CURVE</div>
          <div style={{ height:200, padding:"8px 8px 8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="eqperf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#26a69a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#26a69a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill:"#787b86", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#787b86", fontSize:10 }} axisLine={false} tickLine={false} domain={["auto","auto"]}/>
                <Tooltip contentStyle={{ background:"#2a2e39", border:"1px solid #363a45", borderRadius:4, fontSize:11 }} labelStyle={{ color:"#787b86" }} itemStyle={{ color:"#26a69a" }}/>
                <Area type="monotone" dataKey="value" stroke="#26a69a" strokeWidth={2} fill="url(#eqperf)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset allocation */}
        <div className="tv-panel" style={{ borderRadius:4 }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>ALLOCATION</div>
          <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE_DATA} cx="40%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {PIE_DATA.map((e,i) => <Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:"#2a2e39", border:"1px solid #363a45", borderRadius:4, fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginLeft:-20 }}>
              {PIE_DATA.map(d=>(
                <div key={d.name} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"#787b86" }}>{d.name}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:"#d1d4dc" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {/* Daily P&L bar */}
        <div className="tv-panel" style={{ borderRadius:4 }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>DAILY P&L</div>
          <div style={{ height:160, padding:"8px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR_DATA}>
                <XAxis dataKey="d" tick={{ fill:"#787b86", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#787b86", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="p" radius={[2,2,0,0]}>
                  {BAR_DATA.map((e,i)=><Cell key={i} fill={e.p>=0?"#26a69a":"#ef5350"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss table */}
        <div className="tv-panel" style={{ borderRadius:4 }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #2a2e39", fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>WIN / LOSS BREAKDOWN</div>
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { label:"Winning Trades", value:p.winningTrades, total:p.totalTrades, color:"#26a69a" },
              { label:"Losing Trades",  value:p.losingTrades,  total:p.totalTrades, color:"#ef5350" },
              { label:"Best Trade",     value:`+$${p.bestTrade}`,  total:null, color:"#26a69a",  raw:true },
              { label:"Worst Trade",    value:`-$${Math.abs(p.worstTrade)}`, total:null, color:"#ef5350", raw:true },
            ].map(row=>(
              <div key={row.label}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:"#787b86" }}>{row.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:row.color }}>{typeof row.value==="number"?row.value:row.value}</span>
                </div>
                {row.total && (
                  <div style={{ height:3, background:"#131722", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${(row.value as number/row.total)*100}%`, height:"100%", background:row.color }}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
