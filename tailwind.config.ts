import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trust-forward palette (education + payments). No AI purple gradients.
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb6ff",
          400: "#598eff",
          500: "#2f66f6",
          600: "#1746a2", // primary
          700: "#123a86",
          800: "#12316d",
          900: "#132c5c",
        },
        accent: {
          // Emerald = success / "secure" / go
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.04)",
        card: "0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)",
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
