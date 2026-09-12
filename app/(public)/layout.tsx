import { headers } from "next/headers";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/nav/NavBar";
import { loadUiStrings } from "@/lib/content/loader";
import { localeDeRuta, navPrincipal, ruta, rutaAlterna } from "@/lib/routes/map";

/**
 * Armazón de la capa pública (DU-02) — la navegación, el pie y el conmutador
 * de idioma por los que se recorre todo lo demás.
 *
 * `loadUiStrings()` se llama aquí, y esa llamada es deliberada: valida la
 * paridad de claves ES/EN **en tiempo de build**. Una clave presente en
 * `content/ui/es.json` y ausente en `content/ui/en.json` detiene el despliegue
 * en vez de dejar un hueco en pantalla (FU-03, criterio 5 · RF-140).
 * Si esta llamada desaparece, el gate desaparece con ella. No es decorativa.
 *
 * Ni aquí ni en el pie hay enlace a `/hq` o `/portal` (RF-87): no están
 * ocultos por CSS —no existen en `navPrincipal`— y no pueden aparecer por
 * descuido mientras M3 y M4 sigan abiertos.
 */
export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const strings = loadUiStrings();
  const pathname = (await headers()).get("x-pathname") ?? "/";

  const locale = localeDeRuta(pathname);
  const t = strings[locale];
  const alterna = rutaAlterna(pathname);

  return (
    <>
      <NavBar
        logoHref={ruta("home", locale)}
        items={navPrincipal(locale, pathname, t)}
        signInLabel={t["nav.signin"]}
        signInHref={ruta("acceder", locale)}
        locale={locale}
        switchLangHref={alterna}
        strings={t}
      />

      <main id="contenido">{children}</main>

      <Footer
        ramas={[
          { href: ruta("slg-ai", locale), label: t["nav.ai"] },
          { href: locale === "es" ? "/holdings" : "/en/holdings", label: t["nav.holdings"] },
        ]}
        downloadsHref={ruta("descargas", locale)}
        contactHref={ruta("contacto", locale)}
        privacyHref={ruta("legalPrivacidad", locale)}
        termsHref={ruta("legalTerminos", locale)}
        rssHref={ruta("blogRss", locale)}
        locale={locale}
        switchLangHref={alterna}
        strings={t}
      />
    </>
  );
}
