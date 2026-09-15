import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asset Library",
    short_name: "Asset Library",
    description: "Private image library — upload, organize, and share your visual assets.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0906",
    theme_color: "#0b0906",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
