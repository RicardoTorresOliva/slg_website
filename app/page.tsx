import Link from "next/link";

import { Wordmark } from "@/components/Wordmark";

/**
 * Ruta raíz — marcador de posición de FU-02.
 *
 * La Home real (hero tipográfico, las dos puertas, las tres tarjetas, franja
 * Doctrina, últimos artículos, descarga destacada) es un DU de M1-B, y no se
 * construye hasta que el copy maestro pase su compuerta (FU-01).
 *
 * Lo que esta página demuestra es lo que FU-02 tiene que demostrar: que el
 * andamiaje compila, que la fuente se sirve desde nuestro dominio y que el
 * anillo de foco de dos capas (D-44) funciona con el teclado.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "34rem" }}>
        <Wordmark />

        <p
          style={{
            marginTop: "1.5rem",
            color: "var(--slg-ink-2)",
            fontSize: "0.9375rem",
          }}
        >
          Andamiaje en construcción · FU-02
        </p>

        <p
          style={{
            marginTop: "0.75rem",
            color: "var(--slg-ink-2)",
            fontSize: "0.875rem",
          }}
        >
          Pulsa el tabulador para comprobar el anillo de foco de dos capas:{" "}
          <Link href="/" style={{ color: "var(--slg-link)" }}>
            este enlace
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
