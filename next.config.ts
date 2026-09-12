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
   * Cabeceras de seguridad (B.8, FU-05 criterio 7).
   *
   * `frame-ancestors 'none'` protege la aplicación de ser embebida. El visor de
   * entregables HTML es el caso contrario —él SÍ se embebe— y por eso vive en un
   * ORIGEN SEPARADO con su propia política (D-45), no bajo estas cabeceras.
   *
   * LA CSP NO ESTÁ AQUÍ. Vive en `middleware.ts` porque lleva un **nonce
   * distinto en cada petición**, y una cabecera declarada en este archivo es la
   * misma para todas. Con la CSP estática que había —`script-src 'self'`— el
   * navegador rechazaba los scripts en línea de Next y **la hidratación no
   * ocurría**: el sitio se veía y no funcionaba. Está medido con un navegador
   * real en `scripts/ci/test-gesto.ts`. Si alguien vuelve a declararla aquí,
   * las dos políticas se INTERSECAN y el sitio se queda mudo otra vez.
   *
   * Las de abajo sí son constantes, y por eso siguen aquí.
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
