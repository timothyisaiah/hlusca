import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HLUSCA SACCO Platform",
    short_name: "HLUSCA",
    description: "Savings, loans and membership for HLUSCA members.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef1ff",
    theme_color: "#535fe8",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
