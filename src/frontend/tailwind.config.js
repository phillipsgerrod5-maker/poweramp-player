import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        "glow-blue": "0 0 20px rgba(0, 213, 255, 0.6), inset 0 0 10px rgba(0, 213, 255, 0.25)",
        "glow-purple": "0 0 20px rgba(153, 69, 255, 0.6), inset 0 0 10px rgba(153, 69, 255, 0.25)",
        "glow-cyan": "0 0 24px rgba(0, 213, 255, 0.7), inset 0 0 12px rgba(0, 213, 255, 0.3)",
        "glow-enhanced": "0 0 32px rgba(0, 213, 255, 0.5), 0 0 64px rgba(153, 69, 255, 0.3), inset 0 0 16px rgba(0, 213, 255, 0.2)",
        "glow-stabilizer": "0 0 20px rgba(153, 69, 255, 0.6), 0 0 40px rgba(153, 69, 255, 0.35), 0 0 60px rgba(100, 0, 200, 0.2)",
        "tile-default": "0 4px 16px rgba(0, 100, 255, 0.15), inset 0 1px 0 rgba(0, 150, 255, 0.2)",
        "tile-active": "0 0 20px rgba(0, 213, 255, 0.6), 0 0 40px rgba(0, 213, 255, 0.3), inset 0 1px 0 rgba(0, 150, 255, 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 24px rgba(0, 213, 255, 0.6)",
          },
          "50%": {
            opacity: "0.85",
            boxShadow: "0 0 48px rgba(0, 213, 255, 0.4), 0 0 72px rgba(153, 69, 255, 0.25)",
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "startup-sequence": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "boot-flash": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1.0)", opacity: "1" },
        },
        "tile-press": {
          "0%": { transform: "scale(1)", boxShadow: "0 4px 12px rgba(0, 100, 255, 0.2)" },
          "50%": { transform: "scale(0.98)", boxShadow: "0 2px 8px rgba(0, 100, 255, 0.15)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 20px rgba(0, 213, 255, 0.4)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "startup": "startup-sequence 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "boot-flash": "boot-flash 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "tile-press": "tile-press 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
