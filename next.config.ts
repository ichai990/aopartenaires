import type { NextConfig } from "next";

const securityHeaders = [
  // Empêche l'interprétation de contenu uploadé comme un autre type (XSS).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Pas d'intégration en iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS : ignoré en HTTP local, appliqué derrière HTTPS (tunnel, Vercel, VPS).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // La page d'accueil publique = la vitrine statique AO Partenaires (public/home.html).
  // Le CRM reste sur /connexion, /app, /admin.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/home.html" }],
    };
  },
};

export default nextConfig;
