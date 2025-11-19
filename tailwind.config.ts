import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(220, 10%, 97%)",
        foreground: "hsl(220, 10%, 20%)",
        sidebar: "#ffffff",
        card: "#ffffff",
        muted: "hsl(220, 10%, 92%)",
        "muted-foreground": "hsl(220, 10%, 40%)",
        border: "hsl(220, 10%, 90%)",
        primary: {
          DEFAULT: "#4f46e5",
          foreground: "#eef2ff"
        },
        secondary: {
          DEFAULT: "#64748b",
          foreground: "#e2e8f0"
        },
        accent: {
          DEFAULT: "#0ea5e9",
          foreground: "#e0f2fe"
        }
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
        heading: ["Pretendard", "system-ui", "sans-serif"],
        pretendard: ["Pretendard", "system-ui", "sans-serif"],
      }
    }
  },
  plugins: []
};

export default config;
