import { FormularioDeCaptura } from "@/components/downloads/FormularioDeCaptura";
import { bloquesDe } from "@/lib/content/bloques";
import { loadCollection, loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * Doctrina (DU-06) — `/doctrina`, `/en/doctrine`.
 *
 * Tres bloques (`ui_wireframes` §2.4): resumen ejecutivo público, los tres
 * pilares de DAL OS, y el documento completo a solicitud.
 *
 * **La «D» de DAL OS se expande SIEMPRE como Destrucción Creativa** (RF-15,
 * criterio 1). Aquí no se escribe a mano: los pilares salen del contenido, y
 * `npm run check:nomenclature` lo verifica sobre el archivo — su prueba
 * negativa incluye exactamente este caso.
 */
export function Doctrina({ locale }: { locale: Locale }) {
  const t = loadUiStrings()[locale];

  const pagina = loadCollection<{ title: string; description: string; pair: string | null }>(
    "page",
    locale,
  ).find((p) => (locale === "es" ? p.slug === "doctrina" : p.data.pair === "doctrina"))!;

  const secciones = loadCollection<{ title: string; order: number }>("doctrine", locale).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const bloques = bloquesDe(pagina.body);
  // El resumen ejecutivo es todo lo que hay antes del bloque de los pilares.
  const resumen = bloques.filter((b) => b.tipo === "parrafo").slice(0, 1);
  const pilares = bloques.find((b) => b.tipo === "lista");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold text-blue-deep text-balance">{pagina.data.title}</h1>

      {/* ① Resumen ejecutivo público */}
      <section className="mt-8">
        {resumen.length > 0 && resumen[0].tipo === "parrafo" && !resumen[0].texto.includes("[PENDIENTE") ? (
          <p className="text-lg text-ink">{resumen[0].texto}</p>
        ) : (
          // El resumen vive fuera de este repositorio y `doctrine-summary.md`
          // prohíbe rellenarlo por inferencia. Estado vacío redactado, nunca
          // una frase inventada con voz de doctrina.
          <p className="text-lg text-ink-2">{t["doctrine.summaryPending"]}</p>
        )}
      </section>

      {/* ② Los tres pilares de DAL OS */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-blue-primary">{t["doctrine.pillarsTitle"]}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {(pilares?.tipo === "lista" ? pilares.elementos : []).map((pilar) => (
            <li
              key={pilar}
              className="rounded-lg border-l-[3px] border-indigo-brand bg-paper-2 p-4 font-bold text-blue-deep"
            >
              {pilar}
            </li>
          ))}
        </ul>
        {secciones.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {secciones.map((s) => (
              <p key={s.slug} className="text-ink-2">
                {s.body.replace(/\s+/g, " ").trim()}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* ③ Documento completo a solicitud (DU-10, RF-44) */}
      <section className="superficie-suave mt-12 rounded-lg border border-line bg-paper-2 p-6">
        <h2 className="text-2xl font-bold text-blue-deep">{t["doctrine.fullDocTitle"]}</h2>
        <p className="mt-3 mb-4 text-ink-2">{t["doctrine.fullDocBody"]}</p>
        {/*
          Mismo formulario, misma validación y misma cola que una descarga
          (RF-44). No hay archivo detrás todavía, así que se comporta como un
          documento en «próximamente»: captura el correo, no emite URL firmada
          y no registra descarga.
        */}
        <FormularioDeCaptura
          origen="doctrine-request"
          rutaDePagina={ruta("doctrina", locale)}
          strings={t}
          variante="proximamente"
          claveDeBoton="doctrine.requestButton"
          privacyHref={ruta("legalPrivacidad", locale)}
        />
      </section>
    </div>
  );
}
