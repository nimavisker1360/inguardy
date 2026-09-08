export const PRODUCTION_SITE_URL = "https://tradivix.com";
export const MT5_JOURNAL_API_PATH = "/api/mt5/journal";
export const DEFAULT_MT5_JOURNAL_API_URL = `${PRODUCTION_SITE_URL}${MT5_JOURNAL_API_PATH}`;

export function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getConfiguredSiteUrl() {
  const configured =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.JOURNAL_API_BASE_URL?.trim() ||
    "";

  if (configured) {
    return normalizeBaseUrl(configured).replace(/\/api\/mt5\/journal$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${normalizeBaseUrl(process.env.VERCEL_URL)}`;
  }

  return PRODUCTION_SITE_URL;
}

export function getRequestSiteUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || "";

  if (!host) {
    return "";
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const protocol =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return normalizeBaseUrl(`${protocol}://${host}`);
}

export function getConfiguredMt5JournalApiUrl(request?: Request) {
  const requestSiteUrl = request ? getRequestSiteUrl(request) : "";

  if (requestSiteUrl) {
    return `${requestSiteUrl}${MT5_JOURNAL_API_PATH}`;
  }

  const configured = process.env.MT5_JOURNAL_API_URL?.trim() || "";

  if (configured) {
    const normalized = normalizeBaseUrl(configured);
    return normalized.endsWith(MT5_JOURNAL_API_PATH)
      ? normalized
      : `${normalized}${MT5_JOURNAL_API_PATH}`;
  }

  return `${getConfiguredSiteUrl()}${MT5_JOURNAL_API_PATH}`;
}
