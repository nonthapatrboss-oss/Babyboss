"use client";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { mockTrades } from "@/lib/mockData";
import { Trade } from "@/lib/types";

const COLS: { label:string; key:keyof Trade }[] = [
  { label:"Symbol",    key:"symbol"    },
  { label:"Direction", key:"direction" },
  { label:"Entry",     key:"entry"     },
  { label:"SL",        key:"stopLoss"  },
  { label:"TP",        key:"takeProfit"},
  { label:"Lots",      key:"lots"      },
  { label:"P&L",       key:"pnl"       },
  { label:"Status",    key:"status"    },
  { label:"Timeframe", key:"timeframe" },
];

export default function Portfolio() {
  const [tab, setTab] = useState<"all"|"active"|"closed">("all");
  const [sort, setSort] = useState<keyof Trade>("pnl");
  const [asc, setAsc] = useState(false);

  const trades = mockTrades
    .filter(t => tab==="all" || (tab==="active"?t.status==="Active":t.status==="Closed"))
    .sort((a,b) => {
      const av = a[sort] as number;
      const bv = b[sort] as number;
      if (typeof av === "number") return asc ? av-bv : bv-av;
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const totalPnl = mockTrades.filter(t=>t.status==="Closed").reduce((s,t)=>s+t.pnl,0);
  const wins = mockTrades.filter(t=>t.pnl>0).length;
  const wr = Math.round((wins/mockTrades.length)*100);

  return (
    <div style={{ padding:8, height:"calc(100vh - 48px)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
        {[
          ["Total Trades", mockTrades.length, "#d1d4dc"],
          ["Win Rate",     wr+"%",            "#26a69a"],
          ["Total P&L",    `${totalPnl>=0?"+":""}$${Math.abs(totalPnl).toFixed(0)}`, totalPnl>=0?"#26a69a":"#ef5350"],
          ["Active",       mockTrades.filter(t=>t.status==="Active").length, "#2196f3"],
        ].map(([l,v,c])=>(
          <div key={l as string} className="tv-panel" style={{ padding:12, borderRadius:4 }}>
            <div style={{ fontSize:11, color:"#787b86", marginBottom:4 }}>{l as string}</div>
            <div style={{ fontSize:20, fontWeight:700, color:c as string }}>{v as string|number}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tv-panel" style={{ borderRadius:4, marginBottom:8, display:"flex", flexShrink:0 }}>
        {(["all","active","closed"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className="tv-tab" style={{ textTransform:"capitalize", color:tab===t?"#d1d4dc":"#787b86", borderBottom:tab===t?"2px solid #2196f3":"2px solid transparent" }}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div className="tv-panel" style={{ borderRadius:4, flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div style={{ flex:1, overflowY:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead style={{ position:"sticky", top:0, background:"#1e222d", zIndex:1 }}>
              <tr style={{ borderBottom:"1px solid #2a2e39" }}>
                {COLS.map(c=>(
                  <th key={c.key} onClick={()=>{ if(sort===c.key) setAsc(!asc); else{setSort(c.key);setAsc(false);} }}
                    style={{ padding:"8px 12px", textAlign:"left", fontWeight:600, fontSize:11, color:sort===c.key?"#d1d4dc":"#787b86", cursor:"pointer", whiteSpace:"nowrap", userSelect:"none" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>{c.label}<ArrowUpDown size={10}/></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t,i)=>(
                <tr key={t.id} style={{ borderBottom:"1px solid #1e222d" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="#2a2e39")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"8px 12px", fontWeight:700, color:"#d1d4dc" }}>{t.symbol}</td>
                  <td style={{ padding:"8px 12px" }}><span className={t.direction==="BUY"?"badge-buy":"badge-sell"}>{t.direction}</span></td>
                  <td style={{ padding:"8px 12px", fontFamily:"monospace", color:"#d1d4dc" }}>{t.entry}</td>
                  <td style={{ padding:"8px 12px", fontFamily:"monospace", color:"#ef5350" }}>{t.stopLoss}</td>
                  <td style={{ padding:"8px 12px", fontFamily:"monospace", color:"#26a69a" }}>{t.takeProfit}</td>
                  <td style={{ padding:"8px 12px", color:"#787b86" }}>{t.lots}</td>
                  <td style={{ padding:"8px 12px", fontFamily:"monospace", fontWeight:700, color:t.pnl>0?"#26a69a":"#ef5350" }}>{t.pnl>0?"+":""}{t.pnl}</td>
                  <td style={{ padding:"8px 12px" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:t.status==="Active"?"#26a69a":"#787b86", background:t.status==="Active"?"rgba(38,166,154,.1)":"#1e222d", padding:"2px 7px", borderRadius:3 }}>{t.status}</span>
                  </td>
                  <td style={{ padding:"8px 12px", color:"#787b86" }}>{t.timeframe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
