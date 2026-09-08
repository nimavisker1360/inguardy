export function getCtraderConfig() {
  const clientId = process.env.CTRADER_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.CTRADER_CLIENT_SECRET?.trim() || "";
  const redirectUri = process.env.CTRADER_REDIRECT_URI?.trim() || "";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "CTRADER_CLIENT_ID, CTRADER_CLIENT_SECRET and CTRADER_REDIRECT_URI are required"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export const CTRADER_AUTHORIZE_URL =
  "https://id.ctrader.com/my/settings/openapi/grantingaccess/";
export const CTRADER_TOKEN_URL = "https://openapi.ctrader.com/apps/token";

