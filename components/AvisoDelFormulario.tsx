"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * El motivo por el que el servidor devolvió al visitante al formulario.
 *
 * Los manejadores de `/api/descargas` y `/api/contacto` responden a un rechazo
 * con un `303` a la misma página y `?error=<motivo>` (FU-11): así funciona sin
 * JavaScript y el botón «atrás» no reenvía nada. Este componente es la otra
 * mitad: lee ese motivo y pinta **el texto que le corresponde**, que llega por
 * `textos` desde `content/ui` —aquí no hay una sola cadena—.
 *
 * Es un componente de cliente y no un `searchParams` del servidor **a
 * propósito**: la página del documento se prerrenderiza (`generateStaticParams`
 * + `dynamicParams = false`, RF-29), y leer la URL en el servidor la volvería
 * dinámica para todo el mundo por un aviso que solo ve quien se equivocó. Va
 * dentro de `Suspense` porque `useSearchParams` lo exige en una página estática.
 *
 * Solo habla de lo que una persona real puede provocar sin querer: un motivo
 * sin texto —`limite`, `correo_invalido`— no pinta nada, igual que hasta ahora.
 */
export type TextosDeAviso = Readonly<Record<string, string>>;

function Aviso({ textos }: { textos: TextosDeAviso }) {
  const motivo = useSearchParams().get("error");
  const texto = motivo ? textos[motivo] : undefined;
  if (!texto) return null;
  return (
    <p role="alert" style={estilo}>
      {texto}
    </p>
  );
}

export function AvisoDelFormulario({ textos }: { textos: TextosDeAviso }) {
  return (
    <Suspense fallback={null}>
      <Aviso textos={textos} />
    </Suspense>
  );
}

const estilo: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.875rem",
  // El rojo como DETENCIÓN, no como decoración: 5,0:1 sobre --paper.
  color: "var(--slg-red)",
};
