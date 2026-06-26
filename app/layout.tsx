import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "AI Trading Platform",
  description: "Institutional-grade AI trading signals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#131722", color: "#d1d4dc", overflow: "hidden" }}>
        <Sidebar />
        <Header />
        <main style={{ marginLeft: 200, paddingTop: 48, minHeight: "100vh", background: "#131722", overflowY: "auto", height: "100vh" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
