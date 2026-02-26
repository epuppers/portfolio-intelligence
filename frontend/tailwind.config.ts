import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          green: "#33ff33",
          "green-dim": "#20c020",
          "green-dark": "#0a3a0a",
          amber: "#ffb000",
          "amber-dim": "#cc8800",
          bg: "#0a0a0a",
          "bg-light": "#111411",
          border: "#1a3a1a",
        },
      },
      fontFamily: {
        mono: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "cursor-blink": "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;
