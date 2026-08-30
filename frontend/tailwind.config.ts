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
        "surface-muted": "var(--surface-muted)",
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
        sans: ['var(--font-inter)', 'sans-serif'],
        sora: ['var(--font-sora)', 'sans-serif'],
        ibm: ['var(--font-ibm)', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        emphasized: 'var(--ease-emphasized)',
        decelerated: 'var(--ease-decelerated)',
      },
    },
  },
  plugins: [],
};
export default config;
