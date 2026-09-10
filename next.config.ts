import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Despliegue en Easypanel sobre el VPS Hostinger (§10-1): la imagen Docker
  // necesita la salida autocontenida. Ver design_docs/architecture.md §8.
  output: "standalone",

  // El contenido visible vive en content/ (B.4), no en componentes.
  reactStrictMode: true,

  // Nunca revelar la versión del framework: es información gratis para quien
  // busca vulnerabilidades conocidas.
  poweredByHeader: false,

  /**
   * Cabeceras de seguridad (B.8, FU-05 criterio 7) — salvo
   * `Content-Security-Policy`, que se fija en `proxy.ts` (FU-07): necesita un
   * nonce distinto en cada petición, y `headers()` aquí se evalúa una vez por
   * build/arranque, no por petición.
   *
   * Hallazgo propio (FU-07): la CSP estática que vivía aquí antes
   * (`script-src 'self'`, sin nonce) bloqueaba la hidratación de React en
   * TODAS las páginas, estáticas incluida la portada — nadie lo notó antes
   * porque ninguna unidad hasta FU-07 enviaba un Client Component con
   * interactividad real que lo hiciera visible. Detalle en `docs/decision_log.md`.
   *
   * `frame-ancestors 'none'` protege la aplicación de ser embebida. El visor de
   * entregables HTML es el caso contrario —él SÍ se embebe— y por eso vive en un
   * ORIGEN SEPARADO con su propia política (D-45), no bajo estas cabeceras.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Dos años y precarga: el sitio es HTTPS puro desde el primer día.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
