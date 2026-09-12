import { listarDocumentos } from "@/lib/content/downloads";
import { loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * Biblioteca de documentos — `/descargas`, `/en/downloads` (DU-08).
 *
 * Lista `published` y `coming-soon`; los `draft` **no aparecen** (RF-29,
 * criterio 2). Un documento en `coming-soon` se lista a propósito: su página
 * captura el correo igual y avisa cuando el archivo exista (RF-40), que es
 * justo lo que hace que la campaña pueda arrancar antes que los PDFs.
 */
export function Biblioteca({ locale }: { locale: Locale }) {
  const t = loadUiStrings()[locale];
  const documentos = listarDocumentos(locale);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold text-blue-deep">{t["downloads.libraryTitle"]}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">{t["downloads.libraryIntro"]}</p>

      {documentos.length === 0 ? (
        // Criterio 10: biblioteca vacía. No puede pasar con los 11 registros
        // en su sitio, pero una lista vacía sin texto es un error silencioso.
        <p className="mt-12 text-ink-2">{t["downloads.libraryEmpty"]}</p>
      ) : (
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {documentos.map((doc) => (
            <li
              key={doc.slug}
              className="flex flex-col gap-2 rounded-lg border border-line bg-paper p-6"
            >
              <p className="text-xs font-bold tracking-[0.09em] text-blue-primary uppercase">
                {doc.estado === "published"
                  ? t["downloads.statusAvailable"]
                  : t["download.comingSoon"]}
              </p>
              <h2 className="text-xl font-bold text-blue-deep">
                {doc.titulo || t["downloads.untitled"]}
              </h2>
              {doc.publico && <p className="text-sm text-ink-2">{doc.publico}</p>}
              <p className="mt-auto pt-3">
                <a href={`${ruta("descargas", locale)}/${doc.slug}`}>
                  {doc.estado === "published" ? t["download.cta"] : t["download.notifyButton"]} →
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
