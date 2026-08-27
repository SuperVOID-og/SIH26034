import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "surface-raised": "var(--surface-raised)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        "accent-surface": "var(--accent-surface)",
        success: "var(--success)",
        "success-surface": "var(--success-surface)",
        failure: "var(--failure)",
        "failure-surface": "var(--failure-surface)",
        warning: "var(--warning)",
        "warning-surface": "var(--warning-surface)",
        review: "var(--review)",
        "review-surface": "var(--review-surface)",
        info: "var(--info)",
        "info-surface": "var(--info-surface)",
        neutral: "var(--neutral)",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
