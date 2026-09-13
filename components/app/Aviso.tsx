import type { CSSProperties } from "react";

/**
 * El aviso de «lo que acabas de hacer, pasó» (DU-16).
 *
 * POR QUÉ EXISTE Y POR QUÉ NO ES UN SÉPTIMO ESTADO CANÓNICO. Los seis estados
 * de FU-12 describen **en qué situación está la pantalla**: cargando, vacía,
 * vacía por filtro, sin poder cargar, sin poder actuar, sin permiso. Ninguno
 * dice «la acción salió bien», porque eso no es una situación de la pantalla:
 * es el **resultado de algo que acaba de hacer una persona**, dura una
 * navegación y desaparece.
 *
 * Lo que sí comparte con ellos es la razón de ser un componente: el papel ARIA.
 * `role="status"` lo anuncia un lector de pantalla **sin interrumpir**, que es
 * exactamente lo que hace falta para una confirmación. Escrito a mano en cada
 * pantalla, la mitad se quedarían sin él y nadie lo notaría mirando. Por eso el
 * freno `check:shell` prohíbe que una pantalla escriba `role="status"` y por
 * eso esto vive aquí: la pantalla pasa el texto, el componente pone el papel.
 *
 * NO LLEVA COLOR DE ÉXITO NI ICONO DE VISTO. Los tres resultados del reintento
 * manual —abierto, ya estaba entregada, sigue en cola— son igual de legítimos y
 * ninguno es un fallo; pintar dos en verde y uno en rojo inventaría una
 * jerarquía que no existe.
 */
export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" style={caja}>
      {children}
    </p>
  );
}

const caja: CSSProperties = {
  margin: 0,
  padding: "0.75rem 1rem",
  border: "1px solid var(--slg-line)",
  borderRadius: "var(--slg-radius-sm)",
  background: "var(--slg-paper-2)",
  fontSize: "0.9375rem",
};
