export const APP_NAME = "OboApp";

export const PWA_MANIFEST_PATH = "/manifest.json";

export const PWA_ICON_PATHS = {
  icon32: "/icon-32x32.png",
  icon72: "/icon-72x72.png",
  icon192: "/icon-192x192.png",
  icon512: "/icon-512x512.png",
  faviconSvg: "/favicon.svg",
  faviconIco: "/favicon.ico",
  appleTouchIcon: "/apple-touch-icon.png",
} as const;

export const MANIFEST_ICONS = [
  {
    src: PWA_ICON_PATHS.icon32,
    sizes: "32x32",
    type: "image/png",
    purpose: "any",
  },
  {
    src: PWA_ICON_PATHS.icon72,
    sizes: "72x72",
    type: "image/png",
    purpose: "any",
  },
  {
    src: PWA_ICON_PATHS.icon192,
    sizes: "192x192",
    type: "image/png",
    purpose: "any maskable",
  },
  {
    src: PWA_ICON_PATHS.icon512,
    sizes: "512x512",
    type: "image/png",
    purpose: "any maskable",
  },
] as const;

export const METADATA_ICON_LINKS = [
  { rel: "icon", url: PWA_ICON_PATHS.icon32, sizes: "32x32" },
  { rel: "icon", url: PWA_ICON_PATHS.icon72, sizes: "72x72" },
  { rel: "icon", url: PWA_ICON_PATHS.icon192, sizes: "192x192" },
  { rel: "icon", url: PWA_ICON_PATHS.icon512, sizes: "512x512" },
] as const;
