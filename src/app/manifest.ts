import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inventory — Arcy's & Bale",
    short_name: "Inventory",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#DC2626",
    background_color: "#ffffff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
