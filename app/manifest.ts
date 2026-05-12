import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FieldVision Internal CRM",
    short_name: "FieldVision",
    description: "Internal task and workflow management for the FieldVision team.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1F5F9",
    theme_color: "#2563EB",
    orientation: "portrait-primary"
  };
}
