/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // ── Birik brand tokens (direct — used by new landing + icon accents) ──
        ink: "#0A0A0A",
        mist: "#111111",
        fog: "#1A1A1A",
        edge: "#262626",
        bone: "#F5F5F0",
        cream: "#FAFAF5",
        birik: {
          DEFAULT: "#C4FF4D",
          hot: "#E5FF66",
          deep: "#8FCC00",
        },
        heat: "#FF5B2E",
        plum: "#7C3AED",

        // ── shadcn/ui semantic tokens (consumed by all existing components) ──
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        display: ['"Archivo Black"', "Impact", "sans-serif"],
      },
      fontSize: {
        mega: ["clamp(3.5rem, 10vw, 9rem)", { lineHeight: "0.9", letterSpacing: "-0.04em" }],
        huge: ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        big: ["clamp(1.75rem, 3.5vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        brick: "28px",
        pill: "9999px",
      },
      boxShadow: {
        chunk: "0 20px 60px -20px rgba(196, 255, 77, 0.4)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "toast-out": {
          from: { transform: "translateX(0)", opacity: "1" },
          to: { transform: "translateX(120%)", opacity: "0" },
        },
        celebrate: {
          "0%": { transform: "scale(0) rotate(-20deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(5deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.3)" },
          "70%": { boxShadow: "0 0 0 8px transparent" },
          "100%": { boxShadow: "0 0 0 0 transparent" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        glimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "50%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "success-pulse": {
          "0%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.25" },
          "100%": { opacity: "0", transform: "scale(1.05)" },
        },
        "copy-highlight": {
          "0%": { boxShadow: "0 0 0 0 hsl(142 71% 45% / 0.3)" },
          "50%": { boxShadow: "0 0 0 6px hsl(142 71% 45% / 0)" },
          "100%": { boxShadow: "0 0 0 0 transparent" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "success-pulse": "success-pulse 1.05s ease-out forwards",
        "fade-in": "fade-in 0.2s ease",
        "slide-up": "slide-up 0.3s ease",
        "toast-in": "toast-in 0.3s ease",
        "toast-out": "toast-out 0.3s ease forwards",
        celebrate: "celebrate 0.6s ease-out",
        "pulse-ring": "pulse-ring 1.5s infinite",
        blink: "blink 1.5s infinite",
        glimmer: "glimmer 3s linear infinite",
        "success-pulse": "success-pulse 1s ease-out forwards",
        "copy-highlight": "copy-highlight 0.6s ease-out",
      },
    },
  },
  plugins: [],
};
