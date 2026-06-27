"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Bell } from "lucide-react";
import { fetchQuotes, Quote } from "@/lib/api";

function Dot({ on }: { on: boolean }) {
  return <span style={{ width:6, height:6, borderRadius:"50%", display:"inline-block", background:on?"#26a69a":"#363a45", marginRight:4 }} />;
}

function getSession(utcH: number) {
  if (utcH >= 13 && utcH < 17) return "London/New York";
  if (utcH >= 8 && utcH < 17)  return "London";
  if (utcH >= 17 && utcH < 22) return "New York";
  if (utcH >= 0  && utcH < 9)  return "Asian";
  return "Sydney";
}

export function Header() {
  const [time, setTime]     = useState("");
  const [session, setSession] = useState("Asian");
  const [utcH, setUtcH]    = useState(0);
  const [tickers, setTickers] = useState<Quote[]>([]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const s = now.getUTCSeconds();
      const ictH = (h + 7) % 24;
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(ictH)}:${pad(m)}:${pad(s)} ICT`);
      setUtcH(h);
      setSession(getSession(h));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      try { const data = await fetchQuotes(); if (data?.length) setTickers(data); } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const dotSyd = utcH >= 22 || utcH < 2;
  const dotTok = utcH >= 0  && utcH < 9;
  const dotLon = utcH >= 8  && utcH < 17;
  const dotNY  = utcH >= 13 && utcH < 22;
  const items  = tickers.length ? [...tickers, ...tickers] : [];

  return (
    <header style={{ position:"fixed", top:0, left:200, right:0, height:48, zIndex:40,
      background:"#1e222d", borderBottom:"1px solid #2a2e39", display:"flex", alignItems:"center" }}>

      {/* Ticker tape */}
      <div style={{ flex:1, overflow:"hidden", height:"100%", display:"flex", alignItems:"center" }}>
        <div className="ticker-content" style={{ display:"flex", alignItems:"center", gap:32, paddingLeft:16 }}>
          {items.map((t, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <span style={{ fontWeight:600, fontSize:12, color:"#d1d4dc" }}>{t.symbol}</span>
              <span style={{ fontFamily:"monospace", fontSize:12, color:"#d1d4dc" }}>
                {t.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:5})}
              </span>
              <span style={{ fontFamily:"monospace", fontSize:11, color:t.change_pct>=0?"#26a69a":"#ef5350" }}>
                {t.change_pct>=0?"▲":"▼"} {Math.abs(t.change_pct).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display:"flex", alignItems:"center", gap:16, padding:"0 16px", borderLeft:"1px solid #2a2e39", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#787b86" }}>
          <Dot on={dotSyd}/><span>SYD</span>
          <Dot on={dotTok}/><span>TYO</span>
          <Dot on={dotLon}/><span>LON</span>
          <Dot on={dotNY}/><span>NY</span>
        </div>
        <span style={{ fontFamily:"monospace", fontSize:12, color:"#d1d4dc" }}>{time}</span>
        <button className="tv-btn" style={{ padding:"3px 8px" }}><RefreshCw size={12} /></button>
        <button style={{ background:"none", border:"none", cursor:"pointer", color:"#787b86", position:"relative" }}>
          <Bell size={16} />
          <span style={{ position:"absolute", top:-2, right:-2, width:8, height:8, borderRadius:"50%", background:"#2196f3" }} />
        </button>
        <div style={{ width:28, height:28, borderRadius:"50%", background:"#2196f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>P</div>
      </div>
    </header>
  );
            }
