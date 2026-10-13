export const systemConfig = {
  pilotCity: "Bra",
  securityMode: "GDPR_COMPLIANT",
  premiumFeaturesActive: false,
  adminBypassMode: true,
  pwaDeploymentReady: true,
  lowBatteryModeEnabled: true,
  /** Messages and reviews pass through the automatic moderation before they are published. */
  autoModeration: true,
  /** Content tied to a place is loaded / animated only inside this radius around the user (metres). */
  proximityLoadingRadiusMeters: 50,
} as const;

export function venueFeaturesEnabled(subscribed: boolean) {
  return !systemConfig.premiumFeaturesActive || subscribed;
}

export function publicMessageCutoff(now = Date.now(), expirationHours = 48) {
  return new Date(now - expirationHours * 60 * 60 * 1000);
}

export function isPreviewHost(hostname: string) {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("id-preview--") || host.startsWith("preview--") || host.endsWith(".lovableproject-dev.com") || host.endsWith(".trycloudflare.com") || host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
}

export function canUseTestAdmin(hostname: string, isDev: boolean) {
  return systemConfig.adminBypassMode && (isDev || isPreviewHost(hostname));
}