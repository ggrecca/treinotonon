/** Valores de referência para ferramentas, documentação e usos em JavaScript. */
export const spacing = Object.freeze({4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48, 64: 64});

export const typography = Object.freeze({
  display: {size: "2rem", lineHeight: 1.15, weight: 800},
  h1: {size: "1.75rem", lineHeight: 1.2, weight: 800},
  h2: {size: "1.5rem", lineHeight: 1.25, weight: 750},
  h3: {size: "1.25rem", lineHeight: 1.3, weight: 700},
  title: {size: "1.125rem", lineHeight: 1.35, weight: 700},
  subtitle: {size: "1rem", lineHeight: 1.45, weight: 600},
  body: {size: "1rem", lineHeight: 1.5, weight: 400},
  bodySmall: {size: ".875rem", lineHeight: 1.45, weight: 400},
  caption: {size: ".75rem", lineHeight: 1.35, weight: 400},
  label: {size: ".75rem", lineHeight: 1.3, weight: 700},
  button: {size: ".875rem", lineHeight: 1.15, weight: 700},
});

export const designTokens = Object.freeze({
  color: {primary: "--tt-color-primary", secondary: "--tt-color-secondary", success: "--tt-color-success", warning: "--tt-color-warning", danger: "--tt-color-danger", info: "--tt-color-info", background: "--tt-color-background", surface: "--tt-color-surface", card: "--tt-color-card", border: "--tt-color-border", muted: "--tt-color-muted", disabled: "--tt-color-disabled", overlay: "--tt-color-overlay"},
  spacing,
  typography,
  radius: {sm: "--tt-radius-sm", md: "--tt-radius-md", lg: "--tt-radius-lg", pill: "--tt-radius-pill"},
  shadow: {sm: "--tt-shadow-sm", md: "--tt-shadow-md", lg: "--tt-shadow-lg"},
  zIndex: {base: 0, sticky: 10, dropdown: 40, bottomSheet: 80, dialogOverlay: 110, dialogContent: 111, dirtyGuard: 120, toast: 140},
  duration: {fast: "120ms", normal: "180ms", slow: "260ms"},
});
