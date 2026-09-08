export type DashboardTheme = "dark" | "light";

export const DASHBOARD_THEME_COOKIE_KEY = "tradivix_dashboard_theme";
export const DASHBOARD_THEME_STORAGE_KEY = "tradivix-dashboard-theme";

export function parseDashboardTheme(value: string | null | undefined): DashboardTheme {
  return value === "light" ? "light" : "dark";
}
