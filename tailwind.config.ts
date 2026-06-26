import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tv: {
          bg:      "#131722",
          panel:   "#1e222d",
          card:    "#2a2e39",
          surface: "#363a45",
          border:  "#2a2e39",
          "border-l": "#363a45",
          text:    "#d1d4dc",
          "text-2":"#787b86",
          "text-3":"#434651",
          green:   "#26a69a",
          red:     "#ef5350",
          blue:    "#2196f3",
          yellow:  "#f9a825",
          orange:  "#ff9800",
          purple:  "#9c27b0",
        },
      },
      fontFamily: {
        sans: ["-apple-system","BlinkMacSystemFont","Trebuchet MS","Roboto","Ubuntu","sans-serif"],
        mono: ["Consolas","'Courier New'","monospace"],
      },
      animation: {
        ticker: "ticker 40s linear infinite",
        blink:  "blink 1.5s ease-in-out infinite",
        scan:   "scan 2s ease-in-out infinite",
      },
      keyframes: {
        ticker: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        blink:  { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.2" } },
        scan:   { "0%,100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
