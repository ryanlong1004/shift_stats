import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/shifts",
          "/analytics",
          "/calendar",
          "/schedule",
          "/goals",
          "/settings",
          "/resend-verification",
          "/verify-email",
        ],
      },
    ],
    sitemap: "https://shift-stats.com/sitemap.xml",
  };
}
