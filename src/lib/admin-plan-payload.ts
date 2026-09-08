export function parsePlanPayload(body: Record<string, unknown>, allowSlug: boolean) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const priceUSDT = body.priceUSDT === undefined ? undefined : Number(body.priceUSDT);
  const durationDays = body.durationDays === undefined ? undefined : Number(body.durationDays);
  const hasMaxTrades = Object.hasOwn(body, "maxTrades");
  const hasMaxScreenshots = Object.hasOwn(body, "maxScreenshots");
  const hasMaxPlaybooks = Object.hasOwn(body, "maxPlaybooks");
  const hasMaxChecklists = Object.hasOwn(body, "maxChecklists");
  const maxTrades = !hasMaxTrades || body.maxTrades === "" ? null : Number(body.maxTrades);
  const maxScreenshots = !hasMaxScreenshots || body.maxScreenshots === "" ? null : Number(body.maxScreenshots);
  const maxPlaybooks = !hasMaxPlaybooks || body.maxPlaybooks === "" ? null : Number(body.maxPlaybooks);
  const maxChecklists = !hasMaxChecklists || body.maxChecklists === "" ? null : Number(body.maxChecklists);

  if (allowSlug && (!name || !slug)) {
    return { error: "name and slug are required" };
  }

  if (priceUSDT !== undefined && (!Number.isFinite(priceUSDT) || priceUSDT < 0)) {
    return { error: "priceUSDT cannot be negative" };
  }

  if (durationDays !== undefined && (!Number.isInteger(durationDays) || durationDays < 0)) {
    return { error: "durationDays cannot be negative" };
  }

  for (const value of [maxTrades, maxScreenshots, maxPlaybooks, maxChecklists]) {
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      return { error: "Plan limits cannot be negative" };
    }
  }

  return {
    data: {
      ...(name ? { name } : {}),
      ...(allowSlug ? { slug } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() || null } : {}),
      ...(priceUSDT !== undefined ? { priceUSDT: priceUSDT.toFixed(2) } : {}),
      ...(durationDays !== undefined ? { durationDays } : {}),
      ...(allowSlug || hasMaxTrades ? { maxTrades } : {}),
      ...(allowSlug || hasMaxScreenshots ? { maxScreenshots } : {}),
      ...(allowSlug || hasMaxPlaybooks ? { maxPlaybooks } : {}),
      ...(allowSlug || hasMaxChecklists ? { maxChecklists } : {}),
      ...(typeof body.aiAnalysis === "boolean" ? { aiAnalysis: body.aiAnalysis } : {}),
      ...(typeof body.advancedAnalytics === "boolean" ? { advancedAnalytics: body.advancedAnalytics } : {}),
      ...(typeof body.exportEnabled === "boolean" ? { exportEnabled: body.exportEnabled } : {}),
      ...(typeof body.isTrial === "boolean" ? { isTrial: body.isTrial } : {}),
      ...(typeof body.isFree === "boolean" ? { isFree: body.isFree } : {}),
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
    },
  };
}
