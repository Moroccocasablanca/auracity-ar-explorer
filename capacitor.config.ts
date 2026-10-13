import type { CapacitorConfig } from "@capacitor/cli";

// The iPhone app is a native shell around the AURACITY web app: it keeps the GPS alive in the background
// (so venues can invite you while the phone is locked) and shows system notifications.
// CAP_SERVER_URL is the address of the running web app (the Lovable site, or a temporary tunnel while testing).
const url = process.env["CAP_SERVER_URL"];

const config: CapacitorConfig = {
  appId: "it.auracity.bra",
  appName: "AURACITY",
  webDir: "capacitor-www",
  ios: { contentInset: "never", backgroundColor: "#201a47", allowsLinkPreview: false },
  ...(url ? { server: { url, cleartext: false, allowNavigation: ["*.trycloudflare.com", "*.lovable.app", "*.supabase.co", "tiles.openfreemap.org", "huggingface.co", "*.huggingface.co"] } } : {}),
};

export default config;
