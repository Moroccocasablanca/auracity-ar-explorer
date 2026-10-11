export const systemConfig = {
  pilotCity: "Bra",
  securityMode: "GDPR_COMPLIANT",
  premiumFeaturesActive: false,
  adminBypassMode: true,
  pwaDeploymentReady: true,
  lowBatteryModeEnabled: true,
} as const;

export function venueFeaturesEnabled(subscribed: boolean) {
  return !systemConfig.premiumFeaturesActive || subscribed;
}

export function isPreviewHost(hostname: string) {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("id-preview--") || host.startsWith("preview--") || host.endsWith(".lovableproject-dev.com") || host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
}

export function canUseTestAdmin(hostname: string, isDev: boolean) {
  return systemConfig.adminBypassMode && (isDev || isPreviewHost(hostname));
}