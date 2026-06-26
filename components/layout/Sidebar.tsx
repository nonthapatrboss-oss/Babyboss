"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, ScanLine, Zap, Briefcase,
  Shield, BarChart2, ChevronRight, ChevronLeft,
} from "lucide-react";

const NAV = [
  { href: "/",            icon: LayoutDashboard, label: "Dashboard"   },
  { href: "/analyzer",   icon: TrendingUp,      label: "AI Analyzer" },
  { href: "/scanner",    icon: ScanLine,        label: "AI Scanner"  },
  { href: "/signals",    icon: Zap,             label: "Signals"     },
  { href: "/portfolio",  icon: Briefcase,       label: "Portfolio"   },
  { href: "/risk",       icon: Shield,          label: "Risk"        },
  { href: "/performance",icon: BarChart2,       label: "Performance" },
];

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(true);
  const W = open ? 200 : 48;

  return (
    <aside
      id="sidebar"
      style={{
        position: "fixed", left: 0, top: 0, height: "100vh", zIndex: 50,
        width: W, background: "#1e222d", borderRight: "1px solid #2a2e39",
        display: "flex", flexDirection: "column", transition: "width .2s",
      }}
    >
      {/* Logo */}
      <div style={{ height: 48, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderBottom: "1px solid #2a2e39", flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, background: "#2196f3", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp size={13} color="#fff" />
        </div>
        {open && <span style={{ fontWeight: 700, fontSize: 13, color: "#d1d4dc", whiteSpace: "nowrap" }}>AI Trader Pro</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", margin: "1px 6px", borderRadius: 4,
                cursor: "pointer", transition: "all .15s",
                background: active ? "#2a2e39" : "transparent",
                color: active ? "#d1d4dc" : "#787b86",
                borderLeft: `2px solid ${active ? "#2196f3" : "transparent"}`,
              }}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {open && <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      {open && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid #2a2e39" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#26a69a", display: "inline-block", animation: "blink 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "#26a69a" }}>Markets Live</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#787b86" }}>Today P&amp;L</span>
            <span style={{ fontSize: 11, color: "#26a69a", fontWeight: 600 }}>+$342</span>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 32, width: 32, borderRadius: 4, margin: "8px auto",
          background: "#2a2e39", color: "#787b86", border: "none", cursor: "pointer",
          transition: "background .15s", flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#363a45")}
        onMouseLeave={e => (e.currentTarget.style.background = "#2a2e39")}
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
