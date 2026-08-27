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
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        accent: "var(--accent)",
        success: "var(--success)",
        "success-surface": "var(--success-surface)",
        failure: "var(--failure)",
        "failure-surface": "var(--failure-surface)",
        review: "var(--review)",
        "review-surface": "var(--review-surface)",
        neutral: "var(--neutral)",
      },
    },
  },
  plugins: [],
};
export default config;
