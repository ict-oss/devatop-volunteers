import type { MetadataRoute } from "next";

/** Lets people install the site on their phone like an app (requirements: PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Devatop Volunteers",
    short_name: "Volunteers",
    description: "Volunteer with Devatop Centre for Africa Development: calls, hours, check-in and certificates.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F2EDE3",
    theme_color: "#F05023",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
