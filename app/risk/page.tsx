"use client";
import { useState, useMemo } from "react";

function Field({ label, value, onChange, prefix, suffix }: { label:string; value:number; onChange:(v:number)=>void; prefix?:string; suffix?:string }) {
  return (
    <div>
      <label style={{ fontSize:11, color:"#787b86", display:"block", marginBottom:4 }}>{label}</label>
      <div style={{ position:"relative" }}>
        {prefix && <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#787b86", fontSize:12 }}>{prefix}</span>}
        <input type="number" className="tv-input" value={value} onChange={e=>onChange(Number(e.target.value))} style={{ paddingLeft:prefix?22:8, paddingRight:suffix?30:8 }}/>
        {suffix && <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", color:"#787b86", fontSize:12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Result({ label, value, color="#d1d4dc", big }: { label:string; value:string; color?:string; big?:boolean }) {
  return (
    <div className="tv-card" style={{ padding:12, borderRadius:4 }}>
      <div style={{ fontSize:11, color:"#787b86", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:big?22:16, fontWeight:700, color, fontFamily:"monospace" }}>{value}</div>
    </div>
  );
}

const RULES = [
  { label:"Risk per trade ≤ 2%",      check:(r:number)=>r<=2  },
  { label:"R:R Ratio ≥ 1.5",          check:(_:number,rr:number)=>rr>=1.5 },
  { label:"Max daily loss ≤ 6%",      check:(r:number)=>r*3<=6 },
  { label:"Never risk > $500/trade",  check:(_:number,__:number,ra:number)=>ra<=500 },
  { label:"Position size ≤ 5 lots",   check:(_:number,__:number,___:number,ls:number)=>ls<=5 },
  { label:"Min 2 confirmations",      check:()=>true },
];

export default function Risk() {
  const [balance, setBalance]   = useState(10000);
  const [riskPct, setRiskPct]   = useState(1);
  const [entry, setEntry]       = useState(2345.0);
  const [sl, setSl]             = useState(2330.0);
  const [tp, setTp]             = useState(2375.0);
  const [pipVal, setPipVal]     = useState(1);
  const [leverage, setLeverage] = useState(100);

  const calc = useMemo(() => {
    const riskAmt = (balance * riskPct) / 100;
    const slPips  = Math.abs(entry - sl);
    const tpPips  = Math.abs(tp - entry);
    const rr      = slPips > 0 ? (tpPips / slPips) : 0;
    const lotSize = slPips > 0 ? riskAmt / (slPips * pipVal) : 0;
    const profit  = lotSize * tpPips * pipVal;
    const margin  = (lotSize * 100000 * entry) / leverage;
    return { riskAmt, slPips, tpPips, rr, lotSize, profit, margin };
  }, [balance, riskPct, entry, sl, tp, pipVal, leverage]);

  const level = riskPct <= 1 ? { label:"Conservative", color:"#26a69a" } : riskPct <= 2 ? { label:"Moderate", color:"#f9a825" } : { label:"Aggressive", color:"#ef5350" };

  return (
    <div style={{ padding:8, height:"calc(100vh - 48px)", overflowY:"auto" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxWidth:900, margin:"0 auto" }}>
        {/* Inputs */}
        <div className="tv-panel" style={{ borderRadius:4, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"8px 14px", borderBottom:"1px solid #2a2e39", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1 }}>POSITION CALCULATOR</span>
            <span style={{ fontSize:11, fontWeight:700, color:level.color }}>{level.label} Risk</span>
          </div>
          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Account Balance" value={balance} onChange={setBalance} prefix="$"/>
            <Field label="Risk %" value={riskPct} onChange={setRiskPct} suffix="%"/>
            <div style={{ height:1, background:"#2a2e39" }}/>
            <Field label="Entry Price" value={entry} onChange={setEntry}/>
            <Field label="Stop Loss" value={sl} onChange={setSl}/>
            <Field label="Take Profit" value={tp} onChange={setTp}/>
            <div style={{ height:1, background:"#2a2e39" }}/>
            <Field label="Pip Value ($)" value={pipVal} onChange={setPipVal} prefix="$"/>
            <Field label="Leverage" value={leverage} onChange={setLeverage} suffix="x"/>
          </div>
        </div>

        {/* Results */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {/* Visual SL/TP */}
          <div className="tv-panel" style={{ borderRadius:4, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1, marginBottom:10 }}>PRICE LEVELS</div>
            <div style={{ position:"relative", height:80 }}>
              <div style={{ position:"absolute", left:0, right:0, top:"50%", height:2, background:"#363a45" }}/>
              {[
                { label:"TP", price:tp, top:"8%", color:"#26a69a" },
                { label:"Entry", price:entry, top:"48%", color:"#d1d4dc" },
                { label:"SL", price:sl, top:"88%", color:"#ef5350" },
              ].map(p=>(
                <div key={p.label} style={{ position:"absolute", top:p.top, left:0, right:0, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:p.color, width:30, textAlign:"right" }}>{p.label}</span>
                  <div style={{ flex:1, height:1, background:p.color, opacity:.5 }}/>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:p.color }}>{p.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <Result label="Risk Amount"    value={`$${calc.riskAmt.toFixed(2)}`}    color="#ef5350" />
            <Result label="Lot Size"       value={calc.lotSize.toFixed(3)}           color="#f9a825" />
            <Result label="Potential Profit" value={`$${calc.profit.toFixed(2)}`}   color="#26a69a" />
            <Result label="Risk : Reward"  value={`1 : ${calc.rr.toFixed(2)}`}      color={calc.rr>=2?"#26a69a":calc.rr>=1.5?"#f9a825":"#ef5350"} big />
            <Result label="Stop Loss Pips" value={calc.slPips.toFixed(1)}            color="#787b86" />
            <Result label="Margin Req."    value={`$${calc.margin.toFixed(2)}`}      color="#787b86" />
          </div>

          {/* Rules */}
          <div className="tv-panel" style={{ borderRadius:4, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#787b86", letterSpacing:1, marginBottom:10 }}>RISK RULES</div>
            {RULES.map((rule,i)=>{
              const pass = rule.check(riskPct, calc.rr, calc.riskAmt, calc.lotSize);
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:i<RULES.length-1?"1px solid #1e222d":"none" }}>
                  <span style={{ fontSize:11, color:"#787b86" }}>{rule.label}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:pass?"#26a69a":"#ef5350", background:pass?"rgba(38,166,154,.1)":"rgba(239,83,80,.1)", padding:"2px 8px", borderRadius:3 }}>{pass?"PASS":"FAIL"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
