/**
 * Tailwind theme extension for Web3/Fintech design system.
 * Merge this into theme.extend in tailwind.config.js.
 *
 * Usage in tailwind.config.js:
 *   import designSystem from './src/styles/design-system/tailwind.extend.js';
 *   theme: { extend: { ...designSystem } }
 */

export default {
  colors: {
    /* Semantic (tokens.css maps --background etc. to design-system vars) */
    "color-bg": "hsl(var(--color-bg-hsl))",
    "color-surface": "hsl(var(--color-surface-hsl))",
    "color-elevated": "hsl(var(--color-elevated-hsl))",
    "color-border": "hsl(var(--color-border-hsl))",
    "color-text": "hsl(var(--color-text-hsl))",
    "color-text-muted": "hsl(var(--color-text-muted-hsl))",
    "color-success": "hsl(var(--color-success-hsl))",
    "color-warn": "hsl(var(--color-warn-hsl))",
    "color-error": "hsl(var(--color-error-hsl))",
    "color-info": "hsl(var(--color-info-hsl))",
    "color-crypto-xlm": "hsl(var(--color-crypto-xlm-hsl))",
    "color-crypto-btc": "hsl(var(--color-crypto-btc-hsl))",
    "color-crypto-eth": "hsl(var(--color-crypto-eth-hsl))",
  },
  borderRadius: {
    "ds-sm": "var(--radius-sm)",
    "ds-md": "var(--radius-md)",
    "ds-lg": "var(--radius-lg)",
    "ds-xl": "var(--radius-xl)",
    "ds-2xl": "var(--radius-2xl)",
    "ds-full": "var(--radius-full)",
  },
  boxShadow: {
    "ds-0": "var(--shadow-0)",
    "ds-1": "var(--shadow-1)",
    "ds-2": "var(--shadow-2)",
    "ds-3": "var(--shadow-3)",
    "ds-4": "var(--shadow-4)",
    "ds-glow-subtle": "var(--shadow-glow-subtle)",
    "ds-glow-medium": "var(--shadow-glow-medium)",
  },
  backdropBlur: {
    "ds-sm": "var(--blur-sm)",
    "ds-md": "var(--blur-md)",
    "ds-lg": "var(--blur-lg)",
    "ds-xl": "var(--blur-xl)",
    "ds-2xl": "var(--blur-2xl)",
  },
  fontFamily: {
    sans: ["var(--font-sans)"],
    mono: ["var(--font-mono)"],
    metric: ["var(--font-metric)"],
  },
  fontSize: {
    "ds-title-lg": ["var(--text-title-lg)", { lineHeight: "var(--leading-tight)" }],
    "ds-title-md": ["var(--text-title-md)", { lineHeight: "var(--leading-tight)" }],
    "ds-title-sm": ["var(--text-title-sm)", { lineHeight: "var(--leading-tight)" }],
    "ds-metric": ["var(--text-metric)", { lineHeight: "1.2", fontFeatureSettings: '"tnum"' }],
    "ds-metric-sm": ["var(--text-metric-sm)", { lineHeight: "1.25", fontFeatureSettings: '"tnum"' }],
    "ds-body": ["var(--text-body)", { lineHeight: "var(--leading-normal)" }],
    "ds-body-sm": ["var(--text-body-sm)", { lineHeight: "var(--leading-normal)" }],
    "ds-label": ["var(--text-label)", { lineHeight: "1.25" }],
    "ds-caption": ["var(--text-caption)", { lineHeight: "1.25" }],
  },
  keyframes: {
    "gradient-drift": {
      "0%, 100%": { backgroundPosition: "0% 50%" },
      "50%": { backgroundPosition: "100% 50%" },
    },
    "shimmer-token": {
      "0%": { backgroundPosition: "200% 0" },
      "100%": { backgroundPosition: "-200% 0" },
    },
  },
  animation: {
    "gradient-drift": "gradient-drift 18s ease-in-out infinite",
    "shimmer-token": "shimmer-token 1.8s ease-in-out infinite",
  },
};
