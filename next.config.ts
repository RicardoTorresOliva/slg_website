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
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next inyecta estilos en línea; el nonce llega en FU-06 con el middleware.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      // Montserrat se sirve desde nuestro dominio (RNF-14): sin terceros.
      "font-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
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
