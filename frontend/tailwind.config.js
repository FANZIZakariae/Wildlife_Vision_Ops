/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `hsl(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        surface: {
          DEFAULT: withOpacity("--surface"),
          elevated: withOpacity("--surface-elevated"),
        },
        border: {
          DEFAULT: withOpacity("--border"),
          strong: withOpacity("--border-strong"),
        },
        foreground: withOpacity("--foreground"),
        "muted-foreground": withOpacity("--muted-foreground"),
        "subtle-foreground": withOpacity("--subtle-foreground"),
        primary: {
          DEFAULT: withOpacity("--primary"),
          foreground: withOpacity("--primary-foreground"),
          soft: withOpacity("--primary-soft"),
        },
        success: withOpacity("--success"),
        warn: withOpacity("--warn"),
        danger: withOpacity("--danger"),
        ring: withOpacity("--ring"),
      },
      borderRadius: {
        xl: "var(--radius)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        glow: "var(--glow-primary)",
      },
    },
  },
  plugins: [],
};
