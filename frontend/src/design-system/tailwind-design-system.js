/**
 * Tailwind design system extension — Web3 Fintech
 * Merge this into your tailwind.config.js theme.extend
 *
 * Usage in tailwind.config.js:
 *   import designSystem from './src/design-system/tailwind-design-system.js';
 *   export default { theme: { extend: designSystem } };
 */

export default {
  colors: {
    /* Full-color tokens use var(); space-separated HSL use hsl(var()) */
    ds: {
      primary: "var(--color-primary)",
      "primary-foreground": "hsl(var(--color-primary-foreground))",
      secondary: "var(--color-secondary)",
      "secondary-foreground": "hsl(var(--color-secondary-foreground))",
      accent: "var(--color-accent)",
      "accent-foreground": "hsl(var(--color-accent-foreground))",
      bg: "hsl(var(--color-bg))",
      surface: "hsl(var(--color-surface))",
      elevated: "hsl(var(--color-elevated))",
      border: "hsl(var(--color-border))",
      text: "hsl(var(--color-text))",
      muted: "hsl(var(--color-muted))",
      success: "hsl(var(--color-success))",
      warn: "hsl(var(--color-warn))",
      error: "hsl(var(--color-error))",
      info: "hsl(var(--color-info))",
      "chart-1": "hsl(var(--chart-1))",
      "chart-2": "hsl(var(--chart-2))",
      "chart-3": "hsl(var(--chart-3))",
      "chart-4": "hsl(var(--chart-4))",
      "chart-5": "hsl(var(--chart-5))",
      "chart-6": "hsl(var(--chart-6))",
      "chart-7": "hsl(var(--chart-7))",
      "chart-8": "hsl(var(--chart-8))",
      "crypto-xlm": "hsl(var(--crypto-xlm))",
      "crypto-btc": "hsl(var(--crypto-btc))",
      "crypto-eth": "hsl(var(--crypto-eth))",
    },
  },
  borderRadius: {
    "ds-xs": "var(--radius-xs)",
    "ds-sm": "var(--radius-sm)",
    "ds-md": "var(--radius-md)",
    "ds-lg": "var(--radius-lg)",
    "ds-xl": "var(--radius-xl)",
    "ds-2xl": "var(--radius-2xl)",
    "ds-full": "var(--radius-full)",
  },
  spacing: {
    "ds-1": "var(--space-1)",
    "ds-2": "var(--space-2)",
    "ds-3": "var(--space-3)",
    "ds-4": "var(--space-4)",
    "ds-5": "var(--space-5)",
    "ds-6": "var(--space-6)",
    "ds-8": "var(--space-8)",
    "ds-10": "var(--space-10)",
    "ds-12": "var(--space-12)",
    "ds-16": "var(--space-16)",
  },
  boxShadow: {
    "ds-0": "var(--shadow-0)",
    "ds-1": "var(--shadow-1)",
    "ds-2": "var(--shadow-2)",
    "ds-3": "var(--shadow-3)",
    "ds-4": "var(--shadow-4)",
    "ds-focus": "var(--shadow-focus)",
  },
  blur: {
    "ds-sm": "var(--blur-sm)",
    "ds-md": "var(--blur-md)",
    "ds-lg": "var(--blur-lg)",
    "ds-xl": "var(--blur-xl)",
  },
  fontFamily: {
    "ds-sans": "var(--font-sans)",
    "ds-mono": "var(--font-mono)",
  },
  fontSize: {
    "ds-title-xl": "var(--text-title-xl)",
    "ds-title-lg": "var(--text-title-lg)",
    "ds-title-md": "var(--text-title-md)",
    "ds-metric": "var(--text-metric)",
    "ds-metric-sm": "var(--text-metric-sm)",
    "ds-body": "var(--text-body)",
    "ds-body-sm": "var(--text-body-sm)",
    "ds-label": "var(--text-label)",
    "ds-caption": "var(--text-caption)",
  },
  letterSpacing: {
    "ds-tight": "var(--tracking-tight)",
    "ds-normal": "var(--tracking-normal)",
    "ds-wide": "var(--tracking-wide)",
  },
  transitionDuration: {
    "ds-fast": "var(--motion-duration-fast)",
    "ds-normal": "var(--motion-duration-normal)",
    "ds-slow": "var(--motion-duration-slow)",
  },
  transitionTimingFunction: {
    "ds-ease": "var(--motion-ease)",
  },
  keyframes: {
    "gradient-drift": {
      "0%, 100%": { backgroundPosition: "0% 50%" },
      "50%": { backgroundPosition: "100% 50%" },
    },
    "aurora-shift": {
      "0%, 100%": { opacity: "0.6", transform: "translate(0, 0) scale(1)" },
      "50%": { opacity: "0.8", transform: "translate(2%, 1%) scale(1.02)" },
    },
    "shimmer-slide": {
      "0%": { backgroundPosition: "200% 0" },
      "100%": { backgroundPosition: "-200% 0" },
    },
    "particle-float": {
      "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.4" },
      "50%": { transform: "translateY(-8px) translateX(4px)", opacity: "0.7" },
    },
  },
  animation: {
    "gradient-drift": "gradient-drift 12s ease-in-out infinite",
    "aurora-shift": "aurora-shift 8s ease-in-out infinite",
    "shimmer-slide": "shimmer-slide 1.5s ease-in-out infinite",
    "particle-float": "particle-float 6s ease-in-out infinite",
  },
  backgroundImage: {
    "gradient-hero-1": "var(--gradient-hero-1)",
    "gradient-hero-2": "var(--gradient-hero-2)",
    "gradient-hero-3": "var(--gradient-hero-3)",
    "gradient-hero-4": "var(--gradient-hero-4)",
    "gradient-glow-card-1": "var(--gradient-glow-card-1)",
    "gradient-glow-card-2": "var(--gradient-glow-card-2)",
    "gradient-glow-card-3": "var(--gradient-glow-card-3)",
    "gradient-glow-card-4": "var(--gradient-glow-card-4)",
    "gradient-success-1": "var(--gradient-success-1)",
    "gradient-success-2": "var(--gradient-success-2)",
    "gradient-warn-1": "var(--gradient-warn-1)",
    "gradient-error-1": "var(--gradient-error-1)",
    "gradient-shimmer": "var(--gradient-shimmer)",
    "gradient-shimmer-dark": "var(--gradient-shimmer-dark)",
  },
};
