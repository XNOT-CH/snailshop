export const themeClasses = {
  shell: "theme-shell",
  surface: "theme-surface",
  surfaceSoft: "theme-surface-soft",
  surfaceMedia: "theme-surface-media",
  actionMuted: "theme-action-muted",
  overlayScrim: "theme-overlay-scrim",
  header: "theme-header",
  navPill: "theme-nav-pill",
  mobileNav: "theme-mobile-nav",
  sale: "theme-sale",
  saleText: "theme-text-sale",
  alert: "luxury-alert",
  badge: "luxury-badge",
  panel: "luxury-panel",
  panelSoft: "luxury-panel-soft",
  link: "luxury-link",
} as const

export type ThemeClassName = (typeof themeClasses)[keyof typeof themeClasses]
