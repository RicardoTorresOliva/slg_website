# Vistas previas de LinkedIn por página · paquete para SLG_WEB

Preparado el 30-oct-2026 en el proyecto LinkedIn LeadGen. Este paquete se aplica en el repositorio del sitio (proyecto SLG_WEB).

## 0. Diagnóstico (por qué todas las miniaturas salen iguales)

Revisé el HTML publicado de las 5 páginas:

1. **Todas apuntan a la misma imagen:** `og:image = https://softlandingglobal.com/og.png` (y `twitter:image` igual).
2. **Esa imagen no existe:** `https://softlandingglobal.com/og.png` y `https://www.softlandingglobal.com/og.png` devuelven **404**. LinkedIn muestra entonces una miniatura genérica, igual para todo.
3. `og:url` usa `https://softlandingglobal.com/...` (sin www), pero los enlaces que compartes y el sitio que responde usan `https://www.softlandingglobal.com/...`. Conviene unificar en **www**.
4. `og:image:height` dice 630; las nuevas imágenes miden 1200×627 (el formato recomendado por LinkedIn). Hay que declarar 627.
5. Menor: la versión inglesa (`/en/start-here`) parece servirse con `lang="es"`. Revisar que `<html lang>` sea `en` en `/en/*`.

La solución estructural tiene tres partes: una imagen distinta por página e idioma, metadatos propios por página, y una imagen por defecto que sí exista para el resto del sitio.

## 1. Archivos de este paquete

| Archivo en el paquete | Dónde va en el repo | Página |
|---|---|---|
| `public/og/start-here-es.png` | `public/og/start-here-es.png` | /empieza-aqui (y `/`) |
| `public/og/start-here-en.png` | `public/og/start-here-en.png` | /en/start-here (y `/en`) |
| `public/og/phoenix-peex-es.png` | `public/og/phoenix-peex-es.png` | /ai/academy/phoenix-peex |
| `public/og/phoenix-peex-en.png` | `public/og/phoenix-peex-en.png` | /en/ai/academy/phoenix-peex |
| `public/og/phoenix-teax-es.png` | `public/og/phoenix-teax-es.png` | /ai/academy/phoenix-teax |
| `public/og/phoenix-teax-en.png` | `public/og/phoenix-teax-en.png` | /en/ai/academy/phoenix-teax |
| `public/og/readiness-es.png` | `public/og/readiness-es.png` | /ai/enterprise/readiness |
| `public/og/readiness-en.png` | `public/og/readiness-en.png` | /en/ai/enterprise/readiness |
| `public/og/implement-es.png` | `public/og/implement-es.png` | /ai/enterprise/implement |
| `public/og/implement-en.png` | `public/og/implement-en.png` | /en/ai/enterprise/implement |
| `public/og.png` | `public/og.png` | Imagen por defecto (arregla el 404 en el resto del sitio) |

`source/build.py` y `source/render.js` generan las imágenes desde HTML (Montserrat, colores de marca). Para cambiar un texto: editar `build.py`, ejecutar `python3 build.py <html_out> <carpeta_fuentes_montserrat>` y luego `node render.js <html_out> <png_out>` (requiere Playwright). `preview-todas.png` muestra las 10 juntas.

## 2. Textos por página

`og:title` ≤ 60 caracteres y `og:description` ≤ 150, para que LinkedIn no los corte.

### Empieza aquí / Start here
- **ES title:** SLG Agency · Transformación de negocio AI-first, Human-first
- **ES description:** Diseñamos, construimos y desplegamos estructuras para el escenario de negocios que crea la IA. Primero criterio, después construcción.
- **EN title:** SLG Agency · AI-first, Human-first business transformation
- **EN description:** We design, build and deploy structures for the business landscape that AI creates. Judgment first, then we build.
- **alt ES / EN:** SLG Agency: primero criterio, después construcción / SLG Agency: judgment first, then we build

### Phoenix PEEx
- **ES title:** Phoenix PEEx · Programa de IA para directores
- **ES description:** Para directores que deben decidir sobre IA sin depender de quien la vende: qué preguntar, qué exigir, qué no comprar y cómo saber si funciona.
- **EN title:** Phoenix PEEx · AI program for directors
- **EN description:** For directors who must decide on AI without relying on whoever sells it: what to ask, what to demand, what not to buy, and how to know it works.
- **alt ES / EN:** Phoenix PEEx, programa de IA para directores / Phoenix PEEx, AI program for directors

### Phoenix TEAx
- **ES title:** Phoenix TEAx · Programa de IA para la alta gerencia
- **ES description:** Para la alta gerencia que recibe la decisión del directorio y debe convertirla en operación. Un equipo gerencial que decide con los mismos criterios.
- **EN title:** Phoenix TEAx · AI program for senior management
- **EN description:** For senior management teams that receive the board's AI decision and must turn it into operations. One leadership team, one shared set of criteria.
- **alt ES / EN:** Phoenix TEAx, programa de IA para la alta gerencia / Phoenix TEAx, AI program for senior management

### SLG_Readiness
- **ES title:** SLG_Readiness · Diagnóstico de preparación para la IA
- **ES description:** Antes de invertir, sabe dónde está tu empresa frente a la IA: once dimensiones, evidencia en cada una y prioridades defendibles ante el directorio.
- **EN title:** SLG_Readiness · AI readiness diagnostic
- **EN description:** Before you invest, know where your company really stands on AI: eleven dimensions, evidence for each, and priorities you can defend to the board.
- **alt ES / EN:** SLG_Readiness, diagnóstico de preparación para la IA en 11 dimensiones / SLG_Readiness, 11-dimension AI readiness diagnostic

### SLG_Implement
- **ES title:** SLG_Implement · Implementación de IA por fases
- **ES description:** Cuando el piloto funcionó y el despliegue no avanza: implementación por fases sobre tu stack, con compuertas de aprobación tuyas y sin lock-in.
- **EN title:** SLG_Implement · Phased AI implementation
- **EN description:** When the pilot worked and the rollout is stuck: phased implementation on your stack, with your approval gates and no lock-in.
- **alt ES / EN:** SLG_Implement, implementación de IA por fases / SLG_Implement, phased AI implementation

Nota: el `<title>` y la `meta description` de la página pueden quedarse como están. Estos textos son solo para `og:*` y `twitter:*`, que es lo que lee LinkedIn.

## 3. Implementación

## 3.0 En el repo `slg_website` (lo que aplica de verdad)

Revisé el repo. Todas las páginas pasan por `metadatosDe()` en `lib/content/seo.ts`, que hoy fija una sola imagen (`const IMAGEN_OG = "/og.png"`, 1200×630) y `public/og.png` no existe. El cambio estructural va **ahí**, en un solo sitio:

1. Copiar `public/og.png` y `public/og/*.png` de este paquete a `public/` del repo.
2. En `lib/content/seo.ts`, añadir un mapa `OG_POR_RUTA` con las 10 rutas (`/empieza-aqui`, `/en/start-here`, `/ai/academy/phoenix-peex`, `/en/ai/academy/phoenix-peex`, `/ai/academy/phoenix-teax`, `/en/ai/academy/phoenix-teax`, `/ai/enterprise/readiness`, `/en/ai/enterprise/readiness`, `/ai/enterprise/implement`, `/en/ai/enterprise/implement`; `/` y `/en` reutilizan las de empieza-aqui / start-here). Cada entrada: `imagen`, `titulo`, `descripcion`, `alt` (textos de la sección 2).
3. Dentro de `metadatosDe()`: si la `ruta` está en `OG_POR_RUTA`, usar su imagen (con `?v=2026-10-30`), título, descripción y alt en `openGraph` y `twitter`; si no, `IMAGEN_OG`. Declarar `width: 1200, height: 627`. El `title` y la `description` de la página no cambian.
4. Variable de entorno de la dirección pública `NEXT_PUBLIC_SITE_URL` (la que lee `baseDelSitio()`): ponerla en `https://www.softlandingglobal.com` (con www) en producción, para que `og:url` y `canonical` coincidan con los enlaces que se comparten.
5. Revisar que `<html lang>` sea `en` en `/en/*`.
6. Pasar los checks del repo (`npm run check:content`, `npm run build`) antes de desplegar.

Las secciones 3.1 a 3.3 son la versión genérica del mismo cambio, como referencia.

El sitio parece Next.js con App Router (por el patrón `favicon.ico?favicon.<hash>`). Si no lo es, usar la variante HTML del punto 3.3.

### 3.1 Helper compartido (`lib/og.ts`)

```ts
import type { Metadata } from "next";

const SITE = "https://www.softlandingglobal.com";
type Lang = "es" | "en";
type OgKey = "start-here" | "phoenix-peex" | "phoenix-teax" | "readiness" | "implement";

const OG: Record<OgKey, { path: Record<Lang, string>; title: Record<Lang, string>; description: Record<Lang, string>; alt: Record<Lang, string> }> = {
  "start-here": {
    path: { es: "/empieza-aqui", en: "/en/start-here" },
    title: {
      es: "SLG Agency · Transformación de negocio AI-first, Human-first",
      en: "SLG Agency · AI-first, Human-first business transformation",
    },
    description: {
      es: "Diseñamos, construimos y desplegamos estructuras para el escenario de negocios que crea la IA. Primero criterio, después construcción.",
      en: "We design, build and deploy structures for the business landscape that AI creates. Judgment first, then we build.",
    },
    alt: {
      es: "SLG Agency: primero criterio, después construcción",
      en: "SLG Agency: judgment first, then we build",
    },
  },
  "phoenix-peex": {
    path: { es: "/ai/academy/phoenix-peex", en: "/en/ai/academy/phoenix-peex" },
    title: {
      es: "Phoenix PEEx · Programa de IA para directores",
      en: "Phoenix PEEx · AI program for directors",
    },
    description: {
      es: "Para directores que deben decidir sobre IA sin depender de quien la vende: qué preguntar, qué exigir, qué no comprar y cómo saber si funciona.",
      en: "For directors who must decide on AI without relying on whoever sells it: what to ask, what to demand, what not to buy, and how to know it works.",
    },
    alt: {
      es: "Phoenix PEEx, programa de IA para directores",
      en: "Phoenix PEEx, AI program for directors",
    },
  },
  "phoenix-teax": {
    path: { es: "/ai/academy/phoenix-teax", en: "/en/ai/academy/phoenix-teax" },
    title: {
      es: "Phoenix TEAx · Programa de IA para la alta gerencia",
      en: "Phoenix TEAx · AI program for senior management",
    },
    description: {
      es: "Para la alta gerencia que recibe la decisión del directorio y debe convertirla en operación. Un equipo gerencial que decide con los mismos criterios.",
      en: "For senior management teams that receive the board's AI decision and must turn it into operations. One leadership team, one shared set of criteria.",
    },
    alt: {
      es: "Phoenix TEAx, programa de IA para la alta gerencia",
      en: "Phoenix TEAx, AI program for senior management",
    },
  },
  readiness: {
    path: { es: "/ai/enterprise/readiness", en: "/en/ai/enterprise/readiness" },
    title: {
      es: "SLG_Readiness · Diagnóstico de preparación para la IA",
      en: "SLG_Readiness · AI readiness diagnostic",
    },
    description: {
      es: "Antes de invertir, sabe dónde está tu empresa frente a la IA: once dimensiones, evidencia en cada una y prioridades defendibles ante el directorio.",
      en: "Before you invest, know where your company really stands on AI: eleven dimensions, evidence for each, and priorities you can defend to the board.",
    },
    alt: {
      es: "SLG_Readiness, diagnóstico de preparación para la IA en 11 dimensiones",
      en: "SLG_Readiness, 11-dimension AI readiness diagnostic",
    },
  },
  implement: {
    path: { es: "/ai/enterprise/implement", en: "/en/ai/enterprise/implement" },
    title: {
      es: "SLG_Implement · Implementación de IA por fases",
      en: "SLG_Implement · Phased AI implementation",
    },
    description: {
      es: "Cuando el piloto funcionó y el despliegue no avanza: implementación por fases sobre tu stack, con compuertas de aprobación tuyas y sin lock-in.",
      en: "When the pilot worked and the rollout is stuck: phased implementation on your stack, with your approval gates and no lock-in.",
    },
    alt: {
      es: "SLG_Implement, implementación de IA por fases",
      en: "SLG_Implement, phased AI implementation",
    },
  },
};

// Bump when an image changes, so LinkedIn treats it as a new URL.
const OG_VERSION = "2026-10-30";

export function ogMetadata(key: OgKey, lang: Lang): Metadata {
  const o = OG[key];
  const image = {
    url: `${SITE}/og/${key}-${lang}.png?v=${OG_VERSION}`,
    width: 1200,
    height: 627,
    alt: o.alt[lang],
    type: "image/png",
  };
  return {
    alternates: {
      canonical: `${SITE}${o.path[lang]}`,
      languages: { es: `${SITE}${o.path.es}`, en: `${SITE}${o.path.en}` },
    },
    openGraph: {
      type: "website",
      siteName: "SLG Agency",
      locale: lang === "es" ? "es_PE" : "en_US",
      alternateLocale: lang === "es" ? ["en_US"] : ["es_PE"],
      url: `${SITE}${o.path[lang]}`,
      title: o.title[lang],
      description: o.description[lang],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: o.title[lang],
      description: o.description[lang],
      images: [image.url],
    },
  };
}
```

### 3.2 Uso en cada página

En cada `page.tsx` de las 10 rutas, combinar con la metadata que ya tenga la página (no reemplazar `title` ni `description` existentes):

```ts
// app/(es)/ai/academy/phoenix-peex/page.tsx  (ajustar a la estructura real)
import { ogMetadata } from "@/lib/og";

export const metadata = {
  title: "Phoenix PEEx · SLG Agency",           // lo que ya existe
  description: "…",                             // lo que ya existe
  ...ogMetadata("phoenix-peex", "es"),
};
```

Si las rutas ES/EN comparten un `page.tsx` con `[lang]` o un `generateMetadata`, llamar `ogMetadata(key, lang)` dentro de `generateMetadata` con el idioma del segmento.

`/` (portada ES) y `/en` usan `ogMetadata("start-here", lang)`.

**Layout raíz** (`app/layout.tsx` o donde esté hoy `og.png`):
- `metadataBase: new URL("https://www.softlandingglobal.com")` (con www).
- Dejar `/og.png` como imagen por defecto para el resto del sitio, con `width: 1200, height: 627`, y subir el `public/og.png` de este paquete para que deje de dar 404.
- Revisar que `<html lang>` sea `en` en las rutas `/en/*`.

### 3.3 Variante HTML (si el sitio no es Next.js)

Ejemplo para Phoenix PEEx en español; repetir con los textos de la sección 2 en cada página:

```html
<link rel="canonical" href="https://www.softlandingglobal.com/ai/academy/phoenix-peex">
<link rel="alternate" hreflang="es" href="https://www.softlandingglobal.com/ai/academy/phoenix-peex">
<link rel="alternate" hreflang="en" href="https://www.softlandingglobal.com/en/ai/academy/phoenix-peex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SLG Agency">
<meta property="og:locale" content="es_PE">
<meta property="og:url" content="https://www.softlandingglobal.com/ai/academy/phoenix-peex">
<meta property="og:title" content="Phoenix PEEx · Programa de IA para directores">
<meta property="og:description" content="Para directores que deben decidir sobre IA sin depender de quien la vende: qué preguntar, qué exigir, qué no comprar y cómo saber si funciona.">
<meta property="og:image" content="https://www.softlandingglobal.com/og/phoenix-peex-es.png?v=2026-10-30">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="627">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="Phoenix PEEx, programa de IA para directores">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Phoenix PEEx · Programa de IA para directores">
<meta name="twitter:description" content="Para directores que deben decidir sobre IA sin depender de quien la vende: qué preguntar, qué exigir, qué no comprar y cómo saber si funciona.">
<meta name="twitter:image" content="https://www.softlandingglobal.com/og/phoenix-peex-es.png?v=2026-10-30">
```

### 3.4 Regla para páginas futuras

Toda página nueva que se vaya a compartir en LinkedIn lleva su propia entrada en `OG` y su par de PNG (`<slug>-es.png`, `<slug>-en.png`) generados con `source/build.py`. Las demás heredan `/og.png`.

## 4. Verificación después del deploy

1. Las 11 imágenes responden 200 y `image/png`:
   ```bash
   for f in og.png og/start-here-es.png og/start-here-en.png og/phoenix-peex-es.png og/phoenix-peex-en.png og/phoenix-teax-es.png og/phoenix-teax-en.png og/readiness-es.png og/readiness-en.png og/implement-es.png og/implement-en.png; do
     curl -sI "https://www.softlandingglobal.com/$f" | head -1; done
   ```
2. Cada página sirve sus etiquetas:
   ```bash
   curl -s https://www.softlandingglobal.com/ai/academy/phoenix-peex | grep -oE '<meta (property|name)="(og|twitter):[^>]+>'
   ```
3. **LinkedIn Post Inspector** (https://www.linkedin.com/post-inspector/): pegar cada una de las 10 URLs (5 en ES, 5 en EN) y pulsar *Inspect*. Esto obliga a LinkedIn a volver a leer la página. Comprobar que la imagen, el título y la descripción son los nuevos.

## 5. Volver a poner los enlaces en LinkedIn (Destacados)

LinkedIn guarda la vista previa de un elemento Destacado cuando se crea, así que los actuales no cambian solos.

1. Perfil → sección **Destacados** → lápiz.
2. Borra los enlaces actuales (icono de basurero en cada uno).
3. **+** → **Añadir un enlace** → pega la URL **con www** (por ejemplo `https://www.softlandingglobal.com/ai/academy/phoenix-peex`). Espera a que cargue la miniatura nueva.
4. Revisa título y descripción (se rellenan solos con los nuevos textos) y guarda.
5. Repite con las demás, en este orden: Empieza aquí, SLG_Readiness, Phoenix PEEx, Phoenix TEAx, SLG_Implement. Readiness va segundo porque es la oferta de entrada. Si SLG_Implement lo quieres en inglés, usa `https://www.softlandingglobal.com/en/ai/enterprise/implement` (con www).
6. Si alguna sigue mostrando la imagen antigua, vuelve a pasarla por Post Inspector, espera 5 minutos y añádela de nuevo.
