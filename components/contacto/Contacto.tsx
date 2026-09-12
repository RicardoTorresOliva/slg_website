import { FormularioDeCaptura } from "@/components/downloads/FormularioDeCaptura";
import { loadUiStrings } from "@/lib/content/loader";
import { ruta, type Locale } from "@/lib/routes/map";

/**
 * Contacto — `/contacto`, `/en/contact` (DU-10).
 *
 * **Mismo componente de formulario que la descarga**, sin archivo asociado
 * (§2.8): produce `lead_capture` con `source: contact` y recorre la misma
 * validación, la misma cola y el mismo aviso (RF-43). Una sola máquina con
 * tres puertas — tres formularios distintos serían tres sitios donde arreglar
 * el mismo fallo.
 *
 * **Sin agenda embebida ni widget de terceros** (RF-08): la sección ⑥ de cada
 * página de servicio termina aquí, y aquí no hay calendario incrustado. La
 * «Sesión Cero» tampoco se ofrece en ninguna superficie pública (RF-96).
 */
export function Contacto({ locale }: { locale: Locale }) {
  const t = loadUiStrings()[locale];

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-bold text-blue-deep text-balance">{t["contact.title"]}</h1>
      <p className="mt-4 text-lg text-ink-2">{t["contact.intro"]}</p>

      <section className="superficie-suave mt-10 rounded-lg border border-line bg-paper-2 p-6">
        <FormularioDeCaptura
          origen="contact"
          rutaDePagina={ruta("contacto", locale)}
          strings={t}
          variante="completo"
          conMensaje
          claveDeBoton="contact.submit"
          privacyHref={ruta("legalPrivacidad", locale)}
        />
      </section>
    </div>
  );
}
