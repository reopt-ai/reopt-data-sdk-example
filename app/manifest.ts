import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arc Supply — Reopt Data SDK Example",
    short_name: "Arc Supply",
    description:
      "A production-shaped storefront demonstrating the Reopt Data SDK.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#fffdf8",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
