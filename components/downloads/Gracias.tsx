import { eq, sql } from "drizzle-orm";

import { loadUiStrings } from "@/lib/content/loader";
import { withSystemScope } from "@/lib/db/scope";
import { downloadEvent } from "@/lib/db/schema";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * `/gracias` · `/en/thank-you` (DU-08, RF-42).
 *
 * Recibe el identificador del **evento**, nunca la URL firmada: una URL
 * firmada en la barra de direcciones acaba en el historial del navegador, en
 * la cabecera `Referer` de la siguiente petición y en cualquier captura de
 * pantalla que el visitante comparta. Con el identificador del evento, la
 * firma se emite en el momento de pulsar y vive los minutos que dura.
 *
 * Esta página es dinámica y `no-store` por herencia del armazón (D-57): su
 * contenido depende de un secreto de un solo destinatario.
 */
export async function Gracias({
  locale,
  eventoId,
  pendiente,
}: {
  locale: Locale;
  eventoId?: string;
  pendiente: boolean;
}) {
  const t = loadUiStrings()[locale];

  // Variante «próximamente»: se capturó el correo, no hay archivo que entregar.
  if (pendiente) {
    return (
      <Marco titulo={t["thanks.comingSoonTitle"]} cuerpo={t["thanks.comingSoonBody"]} locale={locale} t={t} />
    );
  }

  if (!eventoId) {
    return <Marco titulo={t["thanks.title"]} cuerpo={t["thanks.notFound"]} locale={locale} t={t} />;
  }

  const evento = await withSystemScope(
    "lectura del evento de descarga para mostrar el enlace al visitante (RF-42)",
    async (db) => {
      const [fila] = await db
        .select({
          id: downloadEvent.id,
          // La vigencia la decide el reloj de la BASE DE DATOS, que es el mismo
          // que escribió la caducidad. Compararla en el render con `Date.now()`
          // metería la desviación de reloj entre el servidor de aplicación y el
          // de datos justo en la comprobación que protege un secreto — y además
          // es una función impura dentro de un componente.
          vigente: sql<boolean>`${downloadEvent.signedUrlExpiresAt} > now()`,
        })
        .from(downloadEvent)
        .where(eq(downloadEvent.id, eventoId))
        .limit(1);
      return fila ?? null;
    },
  );

  if (!evento) {
    return <Marco titulo={t["thanks.title"]} cuerpo={t["thanks.notFound"]} locale={locale} t={t} />;
  }

  // Criterio 10: recargar `/gracias` con el enlace ya caducado no puede dar un
  // botón que lleve a un error del almacenamiento.
  if (!evento.vigente) {
    return <Marco titulo={t["thanks.expired"]} cuerpo={t["thanks.expiredBody"]} locale={locale} t={t} />;
  }

  return (
    <Marco titulo={t["thanks.title"]} cuerpo={t["thanks.downloadReady"]} locale={locale} t={t}>
      <p className="mt-6">
        <a
          href={`/api/descarga/${evento.id}`}
          className="inline-block rounded-md bg-stop px-5 py-3 font-bold text-paper no-underline"
        >
          {t["thanks.downloadCta"]}
        </a>
      </p>
    </Marco>
  );
}

function Marco({
  titulo,
  cuerpo,
  locale,
  t,
  children,
}: {
  titulo: string;
  cuerpo: string;
  locale: Locale;
  t: Record<string, string>;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold text-blue-deep">{titulo}</h1>
      <p className="mt-4 text-lg text-ink-2">{cuerpo}</p>
      {children}
      <p className="mt-12 text-ink-2">
        {t["thanks.nextStep"]}{" "}
        <a href={ruta("contacto", locale)}>{t["service.contactLink"]}</a>
      </p>
    </div>
  );
}
