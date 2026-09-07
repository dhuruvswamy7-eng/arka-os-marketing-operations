/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f7f7f5",
      "foreground": "#141414",
      "border": "#deddd8",
      "card": "#ffffff",
      "cardForeground": "#141414",
      "popover": "#ffffff",
      "popoverForeground": "#141414",
      "primary": "#bf9218",
      "primaryForeground": "#0d0d0d",
      "secondary": "#ebeae7",
      "secondaryForeground": "#1c1c1c",
      "muted": "#edebe7",
      "mutedForeground": "#6b6b6b",
      "accent": "#fabe1f",
      "accentForeground": "#0d0d0d",
      "destructive": "#d94d43",
      "destructiveForeground": "#fffaf3",
      "input": "#c9c7c0",
      "ring": "#bf9218",
      "chart1": "#bf9218",
      "chart2": "#1a1a1a",
      "chart3": "#18a1e9",
      "chart4": "#c5844c",
      "chart5": "#7a7a7a",
      "sidebar": "#0a0a0a",
      "sidebarForeground": "#f1efe8",
      "sidebarBorder": "#2e2e2e",
      "sidebarPrimary": "#fabe1f",
      "sidebarPrimaryForeground": "#0d0d0d",
      "sidebarAccent": "#1f1f1f",
      "sidebarAccentForeground": "#f1efe8",
      "sidebarRing": "#fabe1f"
    },
    "dark": {
      "background": "#121212",
      "foreground": "#f1efe8",
      "border": "#383838",
      "card": "#1c1c1c",
      "cardForeground": "#f1efe8",
      "popover": "#1c1c1c",
      "popoverForeground": "#f1efe8",
      "primary": "#fabe1f",
      "primaryForeground": "#0d0d0d",
      "secondary": "#2d2d2d",
      "secondaryForeground": "#f1efe8",
      "muted": "#292929",
      "mutedForeground": "#aaa79e",
      "accent": "#fabe1f",
      "accentForeground": "#0d0d0d",
      "destructive": "#ec6a5f",
      "destructiveForeground": "#1b0b09",
      "input": "#4b4b4b",
      "ring": "#fabe1f",
      "chart1": "#fabe1f",
      "chart2": "#f1efe8",
      "chart3": "#49b8f0",
      "chart4": "#d99b62",
      "chart5": "#aaa79e",
      "sidebar": "#080808",
      "sidebarForeground": "#f1efe8",
      "sidebarBorder": "#242424",
      "sidebarPrimary": "#fabe1f",
      "sidebarPrimaryForeground": "#0d0d0d",
      "sidebarAccent": "#1c1c1c",
      "sidebarAccentForeground": "#f1efe8",
      "sidebarRing": "#fabe1f"
    }
  },
  "fontFamily": {
    "sans": [
      "DM Sans",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Space Mono",
      "monospace"
    ]
  },
  "radius": "0.8rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
