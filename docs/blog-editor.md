# El blog como fuente única: del Editor a la web y de la web a las redes

Cómo entra un artículo, quién lo firma, y cómo sale de la web hacia LinkedIn y X sin que nadie
lo copie a mano. Escrito el 2026-09-18 a partir de lo que el sitio ya tiene construido (DU-11 y
DU-12); no inventa piezas nuevas.

## 1. La cadena, en una línea

**Editor (Hermes Agent) escribe un `.md` → PR a `develop` → los frenos lo revisan → Ricardo firma
y fusiona → despliegue → la web emite `post.published` → n8n lo reparte a las redes.**

El repositorio es la cola editorial y la fuente de verdad. No hay CMS, ni panel, ni API de
publicación: **añadir un archivo y hacer push publica** (criterio 1 de DU-11), y un `status: draft`
no se sirve en ninguna parte (criterio 2). Todo lo que sale a redes sale del mismo archivo.

## 2. El contrato del artículo (lo que el Editor tiene que producir)

Un archivo por idioma en `content/blog/es/<slug>.md` y, si hay versión inglesa,
`content/blog/en/<slug-en>.md`. El inglés es opcional (RF-26): un artículo puede existir solo en
español. Frontmatter exacto:

```yaml
---
type: post
title: "La autoridad no se anuncia"
description: "Una frase que resume la tesis. Es la meta description y el subtítulo."
lang: es
pair: "silent-authority"        # slug del hermano en el otro idioma, o null si no existe
date: 2026-09-08                # fecha de publicación; ordena el índice y el RSS
tags:
  - Agentic Mindset             # de la lista viva de etiquetas (mirar las existentes antes de inventar)
  - AI Literacy
status: draft                   # draft mientras se revisa; published lo hace visible. Nada más.
cover: null                     # ruta bajo /public si hay imagen propia; null si no
social:
  hook: "Una frase de gancho, ≤ 140 caracteres."
  linkedin: "El texto del post de LinkedIn: dos o tres frases, sin enlaces (el enlace lo añade n8n)."
  x: "El texto para X, ≤ 240 caracteres."
author: Ricardo Torres Oliva
copy: temporal                  # temporal hasta que Ricardo lo firme; entonces aprobado
---
```

Reglas del cuerpo, las mismas que el resto del sitio y que los frenos comprueban:

- **Voz**: ejecutiva, sobria, sin superlativos ni promesas. `check:copy` rechaza «líder», «el
  mejor», premios y casos de cliente; toda cifra lleva `[fuente: …]` en la misma línea o va como
  `[PENDIENTE: …]`, y un `[PENDIENTE]` no se publica.
- **Nomenclatura literal** (`knowledge/naming-rules.md`): `SLG_VoltAi`, `SLG_Academy`, `Phoenix
  PEEx`, `CoO (Company of One)` siempre con paréntesis, la D de DAL OS es Destrucción Creativa.
  «Softlanding Global» solo en contexto `SLG_Holdings`.
- **Sin llamadas a agendar** ni «Sesión Cero» (RF-96). El único CTA del sitio es la descarga.
- Markdown plano: títulos `##`, párrafos cortos, enlaces relativos (`/descargas/d-06`, `/doctrina`).
  Sin HTML, sin scripts, sin imágenes externas (RF-127: cero terceros).
- Extensión orientativa: 700–1.200 palabras. El `social.hook` es la primera frase que se lee en
  redes: se escribe con el mismo cuidado que el título.

## 3. El flujo de trabajo del Editor

1. Rama `blog/<slug>` desde `develop`. Escribe el `.md` con `status: draft`.
2. Corre los frenos de contenido en local: `npm run check:content` (frontmatter, pares,
   nomenclatura, pendientes, copy). Con la salida `standalone`, `npm run check:blog` comprueba que
   el borrador **no** se sirve y que el publicado aparece en índice, URL, etiqueta y RSS.
3. Abre un PR a `develop`. El CI repite los frenos. El preview de Vercel enseña el artículo tal como
   se verá (con `status: draft` no se ve: para revisarlo en el preview se cambia a `published` en la
   rama, y es el PR lo que impide que llegue a producción sin firma).
4. **Ricardo firma**: revisa, cambia `copy: temporal` por `copy: aprobado` si el texto es definitivo,
   fusiona a `develop` y de ahí a `main`. Esa fusión es la compuerta de aprobación (Regla 1 de
   `AGENTS.md`): ningún agente publica solo.
5. El despliegue publica el artículo. No hay más pasos.

Lo que el Editor **no** hace: no toca código, no toca `content/ui`, no crea etiquetas nuevas sin
avisar, no cambia `date` de artículos ya publicados, no publica directamente en `main`.

## 4. De la web a las redes: `post.published` → n8n

El sitio ya emite webhooks firmados (DU-12). Al arrancar un despliegue con `WEBHOOK_ANNOUNCE_POSTS=1`,
recorre los artículos `published` y emite **una vez** por artículo e idioma el evento
`post.published` con este cuerpo:

```json
{
  "slug": "autoridad-silenciosa",
  "locale": "es",
  "title": "La autoridad no se anuncia",
  "url": "https://softlandingglobal.com/blog/autoridad-silenciosa",
  "tags": ["Agentic Mindset", "AI Literacy"],
  "social": { "hook": "…", "linkedin": "…", "x": "…" }
}
```

Cabeceras: `x-slg-event`, `x-slg-timestamp`, `x-slg-signature` (`sha256=` + HMAC-SHA256 de
`<timestamp>.<cuerpo crudo>` con el secreto del destino). El detalle está en
`docs/deployment.md` §4sexies. Los reintentos y la cola los lleva la web; n8n solo tiene que
responder 2xx.

**Lo que hay que montar, y en este orden:**

1. En n8n (ya corre en Easypanel, proyecto `n8n`): un flujo con disparador *Webhook* que verifique
   la firma, lea `social.linkedin` y `social.x`, añada `url`, y publique en LinkedIn y en X con las
   credenciales de esas plataformas dentro de n8n. Un nodo por red; si mañana se añade otra, se
   añade un nodo, no se toca la web.
2. En el despliegue de la web: `WEBHOOK_SUBSCRIBERS` (o `N8N_WEBHOOK_URL` + `WEBHOOK_SIGNING_SECRET`)
   apuntando a ese flujo, y **después** `WEBHOOK_ANNOUNCE_POSTS=1`. El orden importa: encendida
   antes de conectar n8n, anunciaría los artículos antiguos de golpe cuando n8n se conecte.
3. Primera vez: los tres artículos ya publicados se anunciarán. Si no se quieren en redes, se
   dejan pasar en n8n filtrando por `date` anterior al día del arranque.

En una plataforma de funciones el «arranque» es el primer arranque en frío tras el despliegue, y
la deduplicación vive en la base (`webhook_delivery`), así que un despliegue no repite anuncios.
El barrido de colas de `lib/colas` entrega los webhooks pendientes igual que las capturas.

## 5. Qué falta para que funcione mañana

- Del lado de Hermes: un perfil o skill del Editor que lea §2 y §3 de este documento como contrato
  (frontmatter, voz, frenos, PR). Nada más: el repositorio ya sabe qué hacer con el archivo.
- Del lado de n8n: el flujo de §4.1 y las credenciales de LinkedIn y X dentro de n8n.
- Del lado del despliegue: las variables de §4.2, en el proyecto de Vercel.
