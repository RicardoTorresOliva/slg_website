---
type: ui_wireframes
title: ui_wireframes
project: slg_website
description: Navegación, disposición de las pantallas clave y flujos de las tres superficies de slg_website (capa pública ES/EN, HQ y portal de clientes), con wayfinding, estados vacíos y estados de error por pantalla.
tags: [slg, slg_website, design-doc, ui, wireframes, navegacion, flujos, okf, software-app]
status: design
level: MEDIUM
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 — §0, §4, §5.1, Anexos A (A.1–A.5), B (B.1, B.3, B.5, B.8), C (C.3–C.6), F (F.1)"
  - "planning/requirements.md — RF-01…RF-148, RNF-01…RNF-46"
  - "planning/scope.md — Dentro de v1 · Fronteras que se defienden"
  - "planning/risks.md — R-04, R-07, R-11, R-23, R-24"
  - "docs/decision_log.md — D-14 … D-20"
  - "profiles/software-app/profile.md — design_docs (ui_wireframes: MEDIUM), deliverable_unit_completeness"
---

# Wireframes de interfaz — slg_website

Documento de diseño del paso 6 de `init-project`, nivel **MEDIUM** declarado por el perfil
`software-app`. Define **navegación, disposición de las pantallas clave y flujos**. Se relee en cada
DU de interfaz: por eso las pantallas llevan aquí su wayfinding y sus estados, y no en el `work_log`.

---

## 0. Cómo se lee este documento

### 0.1 Qué decide y qué no

| Decide aquí | Vive en otro documento |
|---|---|
| Qué pantallas existen y cómo se llega a cada una | Entidades y campos → `data_model` |
| Qué bloques tiene cada pantalla y en qué orden | Endpoints, códigos y alcances → `api_contracts` |
| Qué pasa en cada estado (vacío, error, permiso, carga) | Tokens, tipografía, espaciado, motion → `style_guide` |
| Los flujos completos: descarga, identidad, entrega de entregables | Componentes y su comunicación → `architecture` |

### 0.2 Notación

- `§N` = sección del brief · `§10-N` = decisión HITL de Ricardo · `A.N` / `B.N` / `C.N` / `F.N` =
  sección de anexo · `D1`…`D12`, `D2b` = gates del Anexo D · `DoD #N` = prueba del §4 ·
  `D-14`…`D-20` = decisiones del `decision_log` · `R-NN` = riesgo de `planning/risks.md`.
- `D-01`…`D-11` en el **texto** = los once documentos de descarga (D-17), nunca un origen.
- `ui.<clave>` = cadena de interfaz leída de `content/ui/<lang>.json` (RF-16, RF-140).
  **Ningún texto de estos wireframes se escribe en un componente.** Lo que aparece entre comillas es
  la *intención* de la cadena, no su redacción: la redacción es FU-01 (RF-132).
- `[PENDIENTE: …]` = hueco real del contrato. Visible en staging, prohibido en `main` (RNF-18).

### 0.3 Reglas transversales que gobiernan toda pantalla

1. **Wayfinding en cada pantalla** (C.6, RNF-43): dónde estoy · a dónde puedo ir · cómo salgo.
   Ninguna pantalla se da por terminada sin las tres respuestas. Matriz completa en §9.
2. **Estados obligatorios** en toda pantalla autenticada (perfil `deliverable_unit_completeness`,
   RNF-34): cargando · vacío inicial · vacío por filtro · error de carga · error de acción ·
   permiso/no encontrado. Catálogo en §8.1, matriz por pantalla en §10.
3. **Una idea por viewport** en la capa pública (RNF-44); cero fotografía de stock, cero clichés
   visuales de IA.
4. **El rojo `#DC141E` es detención visual**, no decoración: el botón de descarga y las alertas
   críticas de HQ. Máximo 1–2 instancias por viewport (RNF-13). En cuanto una pantalla necesita un
   segundo rojo, uno de los dos no era crítico.
5. **Cero scripts de terceros en la capa pública** (frontera (h) de `scope.md`, D-16): sin desafío
   anti-bot, sin agenda embebida, sin widgets.
6. **Idioma**: la capa pública se sirve en ES en la raíz y EN bajo `/en` (RF-03); HQ y portal se
   muestran en el idioma de preferencia del usuario (RF-72) y **no llevan conmutador de idioma**.
7. **La autorización no es la interfaz**: ocultar un botón no autoriza nada (RF-68). Todo wireframe
   que muestre una acción por rol asume la comprobación en el servidor.

---

## 1. Navegación

### 1.1 Navegación pública (A.1)

Cinco destinos y un botón. Ni uno más (RF-01).

| Orden | ES | EN | Ruta ES | Ruta EN |
|---|---|---|---|---|
| 1 | `SLG_AI` | `SLG_AI` | `/ai` | `/en/ai` |
| 2 | `SLG_Holdings` | `SLG_Holdings` | `/holdings` | `/en/holdings` |
| 3 | Doctrina | Doctrine | `/doctrina` | `/en/doctrine` |
| 4 | Blog | Blog | `/blog` | `/en/blog` |
| 5 | Nosotros | About | `/nosotros` | `/en/about` |
| — | Acceder *(botón)* | Sign in | `/acceder` | `/en/sign-in` |

**Reglas duras de la barra:**

- **Etiquetas específicas. Nunca "Inicio" / "Home" como destino de menú** (A.1, RF-01). El acceso a
  la portada es **el logo**, siempre a la izquierda, siempre enlazado a `/` (o `/en` en inglés).
- La nomenclatura **no se traduce**: `SLG_AI` y `SLG_Holdings` se escriben literales en los dos
  idiomas (RF-14). Solo Doctrina→Doctrine y Nosotros→About cambian.
- **Sin menús desplegables.** La profundidad de la oferta se navega desde el overview `/ai`, que es
  la pantalla que explica las tres ramas. Un desplegable convertiría cinco destinos en dieciséis y
  rompería RF-01.
- El botón "Acceder" es **secundario** en peso visual: el CTA de la capa pública es la descarga, no
  el login (§10-8). Nunca es rojo.
- Barra translúcida con `backdrop-filter` y *scroll edge effect* en lugar de borde de 1 px (C.3).
  Con `prefers-reduced-transparency`, superficie sólida (RNF-07).

**Escritorio (≥ 1024 px)**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ┌───────────┐                                                                   │
│  │SLG Agency │   SLG_AI   SLG_Holdings   Doctrina   Blog   Nosotros   ES|EN  [Acceder] │
│  └───────────┘                                                                   │
│    logo → /                                        ^ ruta activa subrayada       │
└──────────────────────────────────────────────────────────────────────────────────┘
   barra translúcida · el contenido pasa por debajo · sin borde, con scroll edge
```

**Móvil (< 768 px)**

```
┌────────────────────────────────────┐        sheet arrastrable (C.4, RNF-45)
│ ┌───────────┐                      │        ┌────────────────────────────────────┐
│ │SLG Agency │                [ ≡ ] │        │              ▁▁▁▁▁                 │
│ └───────────┘                      │  ───▶  │                                    │
└────────────────────────────────────┘        │   SLG_AI                           │
                                              │   SLG_Holdings                     │
  [ ≡ ] abre el sheet; el sheet se cierra     │   Doctrina                         │
  arrastrando hacia abajo, tocando el         │   Blog                             │
  scrim o con Esc. Foco atrapado dentro       │   Nosotros                         │
  mientras está abierto.                      │   ─────────────────────────────    │
                                              │   [ Acceder ]           ES | EN    │
                                              └────────────────────────────────────┘
```

El sheet cumple el contrato de gesto de RNF-45 (seguimiento 1:1 con `setPointerCapture`, proyección
de momentum `d ≈ 0.998`, rubber-band en el límite, velocidad transferida al spring de cierre) y es
interrumpible (RNF-12). Con `prefers-reduced-motion`, cross-fade de 200 ms sin desplazamiento
(RNF-06).

### 1.2 Conmutador de idioma

`ES | EN` lleva **a la misma página** en el otro idioma, nunca a la portada (RF-04). Se resuelve por
el campo `pair` del registro de contenido (RF-20), no por sustitución de cadenas en la URL: los
slugs difieren (`/descargas/x` ↔ `/en/downloads/x`).

- Si el par no existe —caso posible solo en `post`, donde la paridad no es obligatoria (RF-26)— el
  conmutador se muestra **deshabilitado con explicación**, no oculto: "este artículo solo existe en
  español" + enlace al índice del otro idioma. Ocultarlo dejaría al lector sin saber por qué.
- Ninguna redirección automática por idioma del navegador sobrescribe la ruta pedida (RF-03).

### 1.3 Mapa completo de rutas públicas (A.2 — 25 filas de tabla, **27 rutas** por idioma)

**Árbol ES (raíz del dominio)**

```
/                                        Home
├── ai                                   SLG_AI (overview de las tres ramas)
│   ├── academy                          SLG_Academy (overview)  → enlace externo a Phoenix Academy
│   │   ├── phoenix-peex                 Phoenix PEEx        · descarga D-01
│   │   ├── phoenix-teax                 Phoenix TEAx        · descarga D-02
│   │   ├── phoenix-retx                 Phoenix RETx        · descarga D-03
│   │   ├── customize-programs           Customize Programs  · descarga D-04
│   │   └── ai-coaching                  AI Coaching for Directors · descarga D-05
│   ├── enterprise                       SLG_Enterprise (overview)
│   │   ├── readiness                    SLG_Readiness       · descarga D-06
│   │   └── implement                    SLG_Implement       · descarga D-07
│   └── factory                          SLG_Factory (overview)
│       ├── app-building                 APP_Building        · descarga D-08
│       ├── age-building                 AGE_Building        · descarga D-09
│       └── coo-as-a-service             CoO as a Service    · descarga D-10
├── holdings                             SLG_Holdings        · descarga D-11
├── doctrina                             Doctrina (+ solicitud del documento completo = captura)
├── nosotros                             Nosotros
├── blog                                 Índice de artículos
│   ├── [slug]                           Artículo
│   ├── etiqueta/[tag]                   Índice por etiqueta
│   └── rss.xml                          Canal RSS (RF-23)
├── descargas                            Biblioteca de documentos
│   └── [slug]                           Documento + formulario de captura
├── gracias                              Post-envío (tres variantes, §3.6)
├── contacto                             Formulario de contacto
└── legal
    ├── privacidad                       Privacidad
    └── terminos                         Términos
```

**Árbol EN (prefijo `/en`) — paridad obligatoria en `page` y `service` (RF-02, RNF-16)**

```
/en                                      Home
├── ai
│   ├── academy
│   │   ├── phoenix-peex · phoenix-teax · phoenix-retx · customize-programs · ai-coaching
│   ├── enterprise
│   │   ├── readiness · implement
│   └── factory
│       ├── app-building · age-building · coo-as-a-service
├── holdings
├── doctrine                             ← el slug cambia (doctrina → doctrine)
├── about                                ← nosotros → about
├── blog
│   ├── [slug]
│   ├── tag/[tag]                        ← etiqueta → tag
│   └── rss.xml
├── downloads                            ← descargas → downloads
│   └── [slug]
├── thank-you                            ← gracias → thank-you
├── contact
└── legal
    ├── privacy
    └── terms
```

**Rutas de sistema (no son entradas de A.2, no aparecen en el menú):** `/acceder`
(`/en/sign-in`), `/invitacion/[token]`, `/recuperar`, `404`, `500`, `sitemap.xml`, `robots.txt`.
`/hq/**` y `/portal/**` existen desde M0 pero **no se enlazan desde ninguna pantalla pública** hasta
que su milestone cierre (RF-87).

### 1.4 Navegación entre superficies

```
                    ┌──────────────────────────────────────────┐
   capa pública ───▶ │  [Acceder] → /acceder                    │
                    └──────────────────┬───────────────────────┘
                                       │ según rol (RF-70)
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
              slg_admin / slg_operator            client_admin / client_member
                     │                                   │
                  /hq/tablero                        /portal
                     │                                   │
        salida ◀─────┴── menú de usuario ──────┬─────────┴──▶ salida
                     "Ver el sitio público" (→ `/`, nueva pestaña no)
                     "Cerrar sesión" (→ `/`, con confirmación de salida global aparte)
```

- Un `client_*` que pide `/hq/**` recibe **404**, no 403 (RF-71, RF-95): un 403 confirmaría que la
  ruta existe. Lo mismo al revés para recursos de otra empresa.
- El **logo dentro de HQ y del portal lleva al inicio de esa superficie**, no a la portada pública.
  La vuelta al sitio público es una entrada explícita del menú de usuario. Regla de familiaridad
  (C.6): un mismo símbolo no significa dos destinos según el contexto sin decirlo.

---

## 2. Pantallas públicas

### 2.1 Home (`/`, `/en`) — orden fijo (A.3, RF-09)

Siete bloques, en este orden. Alterarlo es rechazar la página.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ barra translúcida ]                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1 · HERO TIPOGRÁFICO — una idea, sin imagen                                │
│                                                                              │
│   ────────────────────────────────────────────                               │
│   [PENDIENTE: titular maestro — FU-01]                                       │
│   ────────────────────────────────────────────                               │
│   subtítulo de una frase · sin botón, sin formulario                         │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│   2 · DOS PUERTAS  (las dos ramas del negocio)                               │
│   ┌───────────────────────────────┐   ┌───────────────────────────────┐      │
│   │ SLG_AI                        │   │ SLG_Holdings                  │      │
│   │ una frase de definición       │   │ una frase de definición       │      │
│   │ → /ai                         │   │ → /holdings                   │      │
│   └───────────────────────────────┘   └───────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────────────┤
│   3 · TRES TARJETAS DE SLG_AI                                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│   │ SLG_Academy  │  │ SLG_Enterprise│ │ SLG_Factory  │                       │
│   │ una frase    │  │ una frase    │  │ una frase    │                       │
│   │ → /ai/academy│  │ → /ai/enterp.│  │ → /ai/factory│                       │
│   └──────────────┘  └──────────────┘  └──────────────┘                       │
├──────────────────────────────────────────────────────────────────────────────┤
│   4 · FRANJA DOCTRINA  (sección oscura permitida: --blue-deep o --indigo,    │
│       texto blanco, SIN logo dentro — C.3)                                   │
│                                                                              │
│        « pull-quote de The Phoenix Doctrine »                                │
│        [PENDIENTE: cita — FU-01]                          → /doctrina        │
├──────────────────────────────────────────────────────────────────────────────┤
│   5 · ÚLTIMOS ARTÍCULOS                                                      │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            → /blog         │
│   │ tarjeta     │ │ tarjeta     │ │ tarjeta     │                            │
│   └─────────────┘ └─────────────┘ └─────────────┘                            │
├──────────────────────────────────────────────────────────────────────────────┤
│   6 · DESCARGA DESTACADA                                                     │
│   título del documento · para quién · qué aprende                            │
│   [ Descargar el documento ]  ← único elemento rojo de la página             │
├──────────────────────────────────────────────────────────────────────────────┤
│   7 · PIE                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- El bloque 6 **enlaza a la página del documento** (`/descargas/[slug]`), donde vive el formulario.
  No se duplica el formulario en Home: un formulario en dos sitios son dos comportamientos que
  divergen.
- `[PENDIENTE: qué documento de los once se destaca en Home y con qué criterio se rota — FU-01]`.
- Bloque 5 vacío (aún no hay artículos publicados): la sección **no se renderiza**; Home no muestra
  un hueco con "próximamente" (una portada con estados vacíos visibles no es una portada).

**Pie (todas las páginas públicas)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SLG Agency                                                                  │
│  SLG_AI · SLG_Holdings · Doctrina · Blog · Nosotros                          │
│  Descargas · Contacto                                                        │
│  Privacidad · Términos                                          ES | EN  RSS │
│  © SLG Agency Inc.  ·  [PENDIENTE: datos de contacto y jurisdicción — FU-01] │
└──────────────────────────────────────────────────────────────────────────────┘
```

El pie es el segundo camino a Descargas, Contacto y Legal, que no están en el menú principal
(el menú son cinco destinos, RF-01). Sin él, `/descargas`, `/contacto` y `/legal/**` solo serían
alcanzables desde dentro del cuerpo de otra página: eso no es wayfinding.

### 2.2 Página de servicio — el contrato A.3 (RF-06, RF-07, RF-08)

Once páginas comparten esta plantilla exacta: `phoenix-peex`, `phoenix-teax`, `phoenix-retx`,
`customize-programs`, `ai-coaching`, `readiness`, `implement`, `app-building`, `age-building`,
`coo-as-a-service` y `holdings`. **Seis secciones, orden fijo. Falta o desorden de una = página
rechazada.**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ barra ]                                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  SLG_ACADEMY ›                              ← eyebrow de rama: dónde estoy   │
│  Phoenix PEEx                               ← nombre literal (RF-14)         │
│                                                                              │
│  ① PARA QUIÉN Y QUÉ PROBLEMA                                                 │
│     dos frases · el comprador se reconoce · sin alarmismo                    │
│  ────────────────────────────────────────────────────────────────────────    │
│  ② QUÉ ES                                                                    │
│     definición literal desde la fuente de la oferta                          │
│  ────────────────────────────────────────────────────────────────────────    │
│  ③ QUÉ INCLUYE                                                               │
│     │ ítem                     ← bloques con border-left 3px (C.3)           │
│     │ ítem                       cifra grande como elemento gráfico (C.2)    │
│     │ ítem                       p. ej. las 11 dimensiones de SLG_Readiness  │
│  ────────────────────────────────────────────────────────────────────────    │
│  ④ CÓMO TRABAJAMOS                                                           │
│     una frase por principio: sin lock-in · stack elegido por el cliente ·    │
│     compuertas de aprobación (SDD) · capacidad transferible (DAL OS)         │
│  ────────────────────────────────────────────────────────────────────────    │
│  ⑤ DESCARGA  ── ÚNICO CTA DE LA PÁGINA (RF-07) ────────────────────────      │
│     ┌────────────────────────────────────────────────────────────────┐       │
│     │ Título del documento (D-0N)                                    │       │
│     │ Para quién · Qué aprende (3 viñetas)                           │       │
│     │ [ tu correo corporativo            ]                           │       │
│     │ [ Descargar ]  ← el único rojo del viewport (RNF-13)           │       │
│     │ al enviar aceptas la política de privacidad → /legal/privacidad│       │
│     └────────────────────────────────────────────────────────────────┘       │
│  ────────────────────────────────────────────────────────────────────────    │
│  ⑥ SIGUIENTE PASO                                                            │
│     "Si después de leerlo quieres conversar, escríbenos" → /contacto         │
│     Sin agenda embebida. Sin segundo formulario. Sin widget. (RF-08)         │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ pie ]                                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Nada de "Sesión Cero" en esta página** ni en ninguna pública (RF-96, §10-8).
- El *eyebrow* de rama (`SLG_ACADEMY ›`) es el marcador de posición y el enlace de vuelta al
  overview de la rama. Sustituye a una miga de pan completa: en móvil una miga de tres niveles ocupa
  una línea entera para decir lo que el eyebrow dice en una palabra.
- Estado **"disponible próximamente"** de la sección ⑤: §3.5.
- Variante `SLG_Holdings`: misma plantilla, con la particularidad de que la sección ③ lista las tres
  líneas de negocio. `[PENDIENTE: si el tagline "The discipline of going global" se usa aquí —
  Anexo I-5]`.

### 2.3 Overviews de rama (`/ai`, `/ai/academy`, `/ai/enterprise`, `/ai/factory`)

Estas cuatro **no** son páginas de servicio: no tienen descarga y por tanto no tienen CTA rojo.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SLG_AI                                                                      │
│  una idea: qué resuelve la rama                                              │
│                                                                              │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                    │
│  │ SLG_Academy    │ │ SLG_Enterprise │ │ SLG_Factory    │   ← hijos directos │
│  │ una frase      │ │ una frase      │ │ una frase      │                    │
│  └────────────────┘ └────────────────┘ └────────────────┘                    │
│                                                                              │
│  (en /ai/academy, las tarjetas son los 5 servicios; en /ai/enterprise, 2;    │
│   en /ai/factory, 3 — y cada tarjeta nombra su documento de descarga)        │
│                                                                              │
│  En /ai/academy, además:  Phoenix Academy ↗ (enlace externo, RF-13)          │
│     marcado como externo · sin integración · sin sesión compartida           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Doctrina (`/doctrina`, `/en/doctrine`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Doctrina                                                                    │
│  ① Resumen ejecutivo público de The Phoenix Doctrine                         │
│     (secciones ordenadas por `order` del registro `doctrine`, RF-139)        │
│  ────────────────────────────────────────────────────────────────────────    │
│  ② Los tres pilares de DAL OS                                                │
│     ┌──────────────────────┬──────────────────────┬──────────────────────┐   │
│     │ Destrucción Creativa │ Antifragilidad       │ AI Literacy          │   │
│     └──────────────────────┴──────────────────────┴──────────────────────┘   │
│     La "D" se expande SIEMPRE como Destrucción Creativa (RF-15).             │
│  ────────────────────────────────────────────────────────────────────────    │
│  ③ Documento completo a solicitud                                            │
│     [ tu correo corporativo   ]  [ Solicitar ]   → captura doctrine-request  │
│     mismo formulario, mismas validaciones y misma cola que una descarga      │
│     (RF-44). `[PENDIENTE: existe archivo del documento completo de Doctrina? │
│     no figura en la lista D-01…D-11 — Anexo I-3]`                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Mientras no exista archivo, la solicitud se comporta como "disponible próximamente" (§3.5): captura
el correo, no emite URL firmada, no dispara `download.completed` (RF-40).

### 2.5 Nosotros (`/nosotros`, `/en/about`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Nosotros                                                                    │
│  SLG Agency Inc. (Florida) — qué es y para qué existe                        │
│  ────────────────────────────────────────────────────────────────────────    │
│  Ricardo Torres Oliva — [PENDIENTE: biografía — FU-01]                       │
│  ────────────────────────────────────────────────────────────────────────    │
│  Mentorías y programas: [PENDIENTE: ACP, SelectUSA/SGWIT — dato verificado   │
│  y autorizado antes de publicar (RF-11)]                                     │
│  ────────────────────────────────────────────────────────────────────────    │
│  → /contacto                                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Sin cifras, premios ni logotipos de terceros hasta que exista dato verificado (RF-11, RNF-18).

### 2.6 Blog

**Índice (`/blog`) y etiqueta (`/blog/etiqueta/[tag]`)** comparten plantilla; la de etiqueta añade el
nombre de la etiqueta como título y un enlace "ver todos".

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Blog                                              [etiqueta] [etiqueta] …   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [cover]  fecha · etiquetas                                             │  │
│  │          Título del artículo                                           │  │
│  │          description (2 líneas)                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  … (solo `status: published` — RF-22)                                        │
│                                                        RSS ↗ (/blog/rss.xml) │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Artículo (`/blog/[slug]`)**: título, fecha, autor, etiquetas, cuerpo, y al final enlace al índice
y a la etiqueta. Sin formulario de captura (el CTA del blog es leer y volver, no convertir).
Vacío del índice: "todavía no hay artículos publicados" + enlace a `/descargas`; nunca una página en
blanco.

### 2.7 Descargas

**Biblioteca (`/descargas`, `/en/downloads`)** — RF-29: lista `published` y `coming-soon`; los
`draft` no aparecen.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Descargas                                                                   │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐          │
│  │ D-01 · Phoenix PEEx          │  │ D-06 · SLG_Readiness         │          │
│  │ Título del documento         │  │ Título del documento         │          │
│  │ Para quién · qué aprende     │  │ Para quién · qué aprende     │          │
│  │ [ Descargar ]                │  │ ⌛ disponible próximamente    │          │
│  └──────────────────────────────┘  └──────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

En la biblioteca, "Descargar" **navega a la página del documento**; el rojo se reserva para el botón
de envío real del formulario (RNF-13: una rejilla de once botones rojos no es detención visual, es
decoración).

**Documento (`/descargas/[slug]`, `/en/downloads/[slug]`)** — RF-30:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Descargas                                                                 │
│  Título del documento                     ┌────────────────────────────────┐ │
│  Para quién es                            │  FORMULARIO (§3.2)             │ │
│  Qué aprende:                             │  nombre · correo corporativo · │ │
│   │ punto 1                               │  empresa · cargo               │ │
│   │ punto 2                               │  [honeypot oculto]             │ │
│   │ punto 3                               │  [ Descargar ]  ← rojo         │ │
│  Servicio asociado → página de servicio   │  consentimiento + privacidad   │ │
│                                           └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.8 Contacto (`/contacto`, `/en/contact`)

Mismo componente de formulario que la descarga, sin archivo asociado: produce `lead_capture` con
`source: contact` y recorre la misma validación, la misma cola y el mismo aviso (RF-43). Campo
adicional de mensaje libre. Al enviar → `/gracias` variante *contacto*.

### 2.9 Legal, 404 y 500

- `/legal/privacidad` y `/legal/terminos` (+ EN): documento largo, sin navegación lateral, con fecha
  de última actualización. **Públicas y sin autenticación**: las pantallas de consentimiento OAuth
  las exigen (RF-12, F.2-1). `[PENDIENTE: texto legal — Anexo I-6]`.
- **404**: título, una frase, y tres salidas — Home, `/ai`, `/blog`. Bilingüe, resuelta por el
  prefijo de la ruta pedida (RF-17).
- **500**: título, una frase sin detalle técnico (RNF-32), enlace a Home y "vuelve a intentarlo".
  Nunca traza, nunca nombre de servicio, nunca versión.

---

## 3. Flujo de descarga (la máquina que paga el proyecto)

Es el flujo que se prototipa **antes que ningún otro componente** (RF-134, C.5).

### 3.1 Recorrido completo

```
  Página de servicio (§ ⑤)  ó  /descargas/[slug]  ó  Doctrina  ó  /contacto
            │
            ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ FORMULARIO                                                        │
  │  · honeypot invisible (RF-33)                                     │
  │  · validación de correo corporativo, cliente + servidor (RF-31)   │
  │  · límite de peticiones por IP y por correo (RF-34)               │
  │  · consentimiento con marca de tiempo (RF-36)                     │
  └───────────────┬───────────────────────────────────────────────────┘
                  │ envío
                  ▼
        ┌─────────────────────┐   honeypot relleno   ┌──────────────────────────┐
        │ VALIDACIÓN SERVIDOR ├─────────────────────▶│ descarte silencioso      │
        └──────────┬──────────┘                      │ (pantalla de éxito       │
                   │                                 │  normal, sin registro)   │
      dominio libre│  límite excedido                └──────────────────────────┘
        ┌──────────┴──────────┐
        ▼                     ▼
  ┌─────────────┐      ┌─────────────┐
  │ error en    │      │ 429 neutro  │
  │ línea (§3.4)│      │ (§3.4)      │
  └─────────────┘      └─────────────┘
                   │ válido
                   ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ lead_capture GUARDADO   crm_sync_status = pending   (RF-37)       │
  └───────────────┬───────────────────────────────────────────────────┘
                  │  ← el visitante NO espera al CRM (RF-39)
        ┌─────────┴─────────┐
        │                   │
        ▼ ¿hay archivo?     ▼ no hay archivo (status: coming-soon)
  ┌──────────────────┐   ┌───────────────────────────────────────────┐
  │ URL FIRMADA con  │   │ "disponible próximamente" (§3.5)          │
  │ caducidad(RF-38) │   │ sin URL firmada · sin download.completed  │
  │ download_event   │   │ el correo queda capturado igual (RF-40)   │
  └────────┬─────────┘   └──────────────────┬────────────────────────┘
           └──────────────┬─────────────────┘
                          ▼
                   /gracias  (§3.6)

  ── en segundo plano, invisible para el visitante ─────────────────────────────
     cola de entrega al CRM (adaptador de dos modos, D-19) ──▶ crm_delivery
     reintentos 1 min · 10 min · 1 h · 6 h · 24 h; 5 fallos → failed + alerta HQ
     aviso por correo a support@softlandingglobal.com con enlace a la ficha
     webhooks: lead.captured · download.completed · lead.delivered_to_crm
```

**El CRM caído no tiene representación en la interfaz pública.** El visitante recibe su documento
igual (DoD #1, R-07). La única superficie donde se ve es HQ (§6.7).

### 3.2 Estados del formulario

| Estado | Qué se ve | Regla |
|---|---|---|
| Reposo | Campos vacíos, botón rojo activo, enlace a privacidad | — |
| Foco | Anillo de foco de **dos capas** (D-44): capa exterior `--cyan` `#50B4DC`, capa interior `--blue-primary` `#2878B4` o `--ink`. Nunca `--cyan` solo | Nunca `outline: none`; RNF-05 |
| Validando en cliente | Nada bloqueante; el error aparece al salir del campo | La autoridad es el servidor (RNF-33) |
| Enviando | Botón en estado de espera, campos deshabilitados, sin retardo artificial (RNF-10) | Feedback en `pointerdown`, 100 ms |
| Éxito con archivo | Navegación a `/gracias` con el enlace de descarga | — |
| Éxito sin archivo | Navegación a `/gracias` variante *próximamente* | RF-40 |
| Error en línea | Mensaje bajo el campo, campo marcado, foco devuelto al campo | RNF-05 |
| Error de servidor | Mensaje sobre el formulario, **datos conservados**, botón reactivado | Nunca se pierde lo escrito |

> **Token del anillo de foco — cerrado por D-44 (`docs/decision_log.md`); resuelve CF-3 de
> `design_docs/design_summary.md` §2.** El Anexo C.1 del brief lista `--cyan` entre los usos de
> «anillos de foco»; `style_guide` §2.3 mide **2,4:1** de `--cyan` sobre `--paper` y concluye que un
> anillo solo de cyan **no cumple RNF-05 ni el gate D2**. El anillo es de **dos capas**: exterior
> `--cyan`, interior `--blue-primary` o `--ink` — la exterior conserva la intención cromática del
> kit, la interior aporta el contraste. Es una precisión del Anexo C, no una contradicción. Se fija
> en el token de **FU-02** y se verifica en **FU-10**. Firme como siempre: **el foco es visible y
> nunca `outline: none`**.

### 3.3 Campos

| Campo | Obligatorio | Nota |
|---|---|---|
| Nombre | sí | Viaja al CRM como nombre del contacto (RF-47) |
| Correo corporativo | sí | Validación de dominio libre (RF-31) |
| Empresa | sí | Al CRM como texto: la clave actual no crea empresas (R-04) |
| Cargo | sí | Al CRM como cargo del contacto |
| Mensaje | solo en `/contacto` | — |
| Consentimiento | sí | `consent_at` + versión del texto aceptada (RF-36, R-13) |
| Honeypot | — | Invisible para personas, no para lectores de pantalla mal etiquetados: `aria-hidden` + `tabindex="-1"` + `autocomplete="off"` |

Ocultos y automáticos: página de origen, `locale`, UTM (RF-45).

### 3.4 Mensajes de rechazo

- **Correo gratuito** (RF-31): mensaje **explícito y en el idioma de la página**, en línea bajo el
  campo, que dice *qué* pasa y *qué hacer*: el documento se envía a direcciones corporativas; usa el
  correo de tu empresa. Nunca "correo inválido" (es válido: es que no sirve aquí). Nunca la lista de
  dominios rechazados. `[PENDIENTE: redacción ES/EN — FU-01]`.
  La lista de dominios es dato editable, no código (RF-32).
- **Límite excedido** (RF-34): 429 con mensaje neutro que invita a reintentar más tarde y ofrece
  `/contacto` como alternativa. **No revela el umbral, ni el contador, ni el tiempo restante.**
- **Honeypot** (RF-33): sin mensaje. El bot ve la pantalla de éxito; no se crea `lead_capture`.
- **Error del servidor**: una frase sin detalle interno (RNF-32) y el formulario intacto.

### 3.5 Estado "disponible próximamente" (RF-40, R-18)

Se activa cuando el registro `download` está en `status: coming-soon`.

```
┌────────────────────────────────────────────────────────────────┐
│  ⌛  Disponible próximamente                                    │
│  Déjanos tu correo corporativo y te lo enviamos en cuanto      │
│  esté listo.                                                   │
│  [ correo corporativo        ]  [ Avísame ]  ← NO es rojo      │
└────────────────────────────────────────────────────────────────┘
```

El botón pierde el rojo: el rojo es la detención visual de una acción disponible (RNF-13); aquí no
hay documento que entregar. La captura se registra exactamente igual (RF-40) y aparece en HQ con su
documento asociado.

### 3.6 Página de gracias (`/gracias`, `/en/thank-you`) — RF-42

**Una ruta, tres variantes** según el `source` de la captura. Tres rutas distintas serían tres
plantillas que divergen; una ruta con tres variantes es un solo componente con un conmutador de
contenido en `content/ui`.

| Variante | Bloque principal | Siguiente paso |
|---|---|---|
| `download` | Botón "Abrir el documento" (URL firmada) + aviso de caducidad del enlace | Artículo relacionado · `/contacto` |
| `doctrine-request` (sin archivo) o descarga en `coming-soon` | Confirmación de que se avisará por correo | `/blog` · `/contacto` |
| `contact` | Confirmación de recepción; `[PENDIENTE: compromiso de plazo de respuesta — FU-01]` | `/descargas` |

- El enlace firmado **caduca**: la página lo dice antes de que el visitante lo descubra
  (`[PENDIENTE: minutos de caducidad — se fija en api_contracts, RNF-20]`).
- Si el visitante recarga `/gracias` con el enlace ya caducado: mensaje de enlace caducado + acción
  "vuelve a pedirlo" que lleva a la página del documento. Nunca un 500.
- La página de gracias **no** ofrece Sesión Cero (RF-96).

---

## 4. Flujos de identidad (F.1)

### 4.1 Acceso (`/acceder`, `/en/sign-in`) — RF-58, RF-59

```
┌──────────────────────────────────────────────────────────────────┐
│  [SLG Agency]                                                    │
│                                                                  │
│   Acceder                                                        │
│                                                                  │
│   [  Continuar con Google           ]                            │
│   [  Continuar con Microsoft        ]                            │
│   ──────────────  o  ──────────────                              │
│   [ correo                       ]                               │
│   [ contraseña                   ]  ¿Olvidaste tu contraseña?    │
│   [ Entrar ]                                                     │
│                                                                  │
│   El acceso es por invitación. Si no tienes cuenta, solicita     │
│   acceso a tu contacto en SLG.                     ← RF-59       │
│                                                                  │
│   ← Volver al sitio                                              │
└──────────────────────────────────────────────────────────────────┘
```

- **Ningún botón de "Crear cuenta".** No existe registro público (RF-59).
- **Mensaje neutro siempre**: credenciales incorrectas, usuario inexistente y usuario sin invitación
  producen **el mismo mensaje**. Enumerar cuentas es una fuga.
- Bloqueo progresivo por intentos (RNF-24): al activarse, mensaje de espera sin decir cuántos
  intentos quedan.
- El botón de Microsoft **no se muestra** hasta que el registro en Entra exista (F.2-3, R-06):
  anunciar un método que falla es peor que no anunciarlo. Se controla por variable de entorno.
- Tras autenticar, el destino lo decide el rol (RF-70): `slg_*` → `/hq/tablero`; `client_*` →
  `/portal`. Un usuario sin rol utilizable ve una pantalla de cuenta sin acceso con enlace a
  `/contacto`, no un bucle de login.

### 4.2 Invitación (`/invitacion/[token]`) — RF-60, RF-61, RF-63

```
  HQ o client_admin crea la invitación
            │  correo del proveedor de correo transaccional (categoría, D-15)
            ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Te han invitado a <Empresa>                                 │
  │  Elige cómo quieres entrar:                                  │
  │   [ Google ]  [ Microsoft ]  [ Crear contraseña ]            │
  │  El enlace caduca en 72 h y sirve una sola vez.              │
  └───────────────┬──────────────────────────────────────────────┘
                  ▼
      ¿el proveedor devuelve correo verificado?
        │ sí                                   │ no (Entra, R-22)
        ▼                                      ▼
  cuenta vinculada o creada            se exige coincidencia explícita
  ancla: `oid` en Entra (RF-62)        de correo antes de aceptar (RF-63)
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
        cuenta ligada a la empresa y al rol de la invitación
                       ▼
              /portal  ó  /hq/tablero
```

Estados de esta pantalla:

| Estado | Qué se ve |
|---|---|
| Token válido | Las tres opciones + nombre de la empresa |
| Token caducado (> 72 h) | "Esta invitación caducó" + "pide una nueva a tu contacto en SLG". Sin reenvío automático |
| Token ya usado | Mismo mensaje que caducado + enlace a `/acceder` |
| Token inexistente o alterado | Mismo mensaje. Nunca se distingue de los anteriores |
| Correo del proveedor ≠ correo de la invitación | Explicación clara y opción de reintentar con otra cuenta; **no** se acepta la invitación |

### 4.3 Recuperación (`/recuperar`) — RF-64

```
  /recuperar  →  [ correo ]  [ Enviar enlace ]
                       │
                       ▼
     Respuesta SIEMPRE idéntica: "si esa dirección tiene cuenta,
     te hemos enviado un enlace"   ← no revela si el correo existe
                       │
                       ▼
     correo con enlace de un solo uso  →  /recuperar/[token]
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
  token válido                   token usado/caducado
  [ nueva contraseña ]           "el enlace ya no sirve" + volver a pedirlo
  mínimo 12 caracteres
        ▼
  contraseña cambiada → se cierran las demás sesiones → /acceder
```

El mismo bloqueo progresivo que el login protege esta ruta (RNF-24).

### 4.4 Sesión y salida — RF-65, RF-66

- Cookies seguras, expiración deslizante de 7 días.
- **"Cerrar sesión"** (menú de usuario) termina la sesión actual → `/`.
- **"Cerrar sesión en todos los dispositivos"** vive en el perfil (§7.6), **con confirmación**: es
  irreversible para las demás sesiones y esa es exactamente la clase de acción que C.6 (Agencia)
  exige confirmar. El resto de acciones no se confirman: se deshacen.

---

## 5. Shell de aplicación (HQ y portal)

Un solo shell, dos configuraciones (C.5 lo pide como un único componente: "shell de app: barra
lateral, tabla, ficha, estado vacío, estado de error"). Cambian la navegación, el alcance de los
datos y los permisos; **no cambian** los patrones.

```
┌───────────────────┬──────────────────────────────────────────────────────────┐
│  SLG Agency · HQ  │  Empresas                            [ + Nueva empresa ] │  ← acción primaria
│  ───────────────  ├──────────────────────────────────────────────────────────┤
│  ▸ Tablero        │  [ buscar…        ]  [ estado ▾ ]            12 de 12    │  ← filtros + recuento
│  ▸ Empresas       │  ┌────────────────────────────────────────────────────┐  │
│  ▸ Usuarios       │  │ Nombre        Estado    Proyectos   Contacto       │  │
│  ▸ Proyectos      │  ├────────────────────────────────────────────────────┤  │
│  ▸ Entregables    │  │ Cliente Demo  activa    3           j@ejemplo.com  │  │  ← fila → ficha
│  ▸ Avisos         │  │ …                                                  │  │
│  ▸ Capturas web   │  └────────────────────────────────────────────────────┘  │
│  ▸ Claves de API  │                                                          │
│  ▸ Auditoría      │                                                          │
│  ───────────────  │                                                          │
│  [ Abrir CRM ↗ ]  │                                                          │
│  Ricardo ▾        │                                                          │
└───────────────────┴──────────────────────────────────────────────────────────┘
   ^ barra lateral      ^ título = dónde estoy · una sola acción primaria por pantalla
   colapsable en tablet; en móvil se convierte en el mismo sheet de la capa pública
```

### 5.1 Patrones

| Patrón | Cuándo | Comportamiento |
|---|---|---|
| **Tabla** | Listas de entidades | Ordenable por columna, filtro persistente en la URL (compartible), recuento visible, fila entera clicable → ficha |
| **Ficha** | Detalle de una entidad | Cabecera con nombre + estado + acciones; secciones; al fondo, metadatos (creado, por quién) |
| **Panel lateral (drawer)** | Crear o editar | **Sin scrim** (C.3): el contexto de la lista permanece visible. Esc cierra; cambios sin guardar piden confirmación |
| **Modal con scrim** | Solo acciones irreversibles | Revocar clave, revocar invitación, cerrar sesiones. El scrim "empuja" el fondo (C.3) |
| **Aviso en línea** | Resultado de una acción | Sobre el contenido afectado, no como notificación flotante que se pierde |

Consecuencia de C.6 (Agencia): **confirmación solo en lo irreversible**. Editar una empresa no se
confirma; revocar una clave sí, porque no se deshace.

### 5.2 Anatomía de los estados

```
CARGANDO                        VACÍO INICIAL                    ERROR DE CARGA
┌────────────────────┐          ┌────────────────────┐           ┌────────────────────┐
│ ▓▓▓▓▓▓▓  ▓▓▓  ▓▓▓  │          │  Todavía no hay X  │           │  No se pudo cargar │
│ ▓▓▓▓▓▓▓  ▓▓▓  ▓▓▓  │          │  una frase que     │           │  una frase, sin    │
│ ▓▓▓▓▓▓▓  ▓▓▓  ▓▓▓  │          │  dice qué pasa     │           │  detalle interno   │
│                    │          │  cuando lo haya    │           │                    │
│ esqueleto con la   │          │  [ + Crear el      │           │  [ Reintentar ]    │
│ forma de la tabla  │          │    primero ]       │           │  ← Volver al       │
│ (no un spinner)    │          │                    │           │    tablero         │
└────────────────────┘          └────────────────────┘           └────────────────────┘

VACÍO POR FILTRO                ERROR DE ACCIÓN                  PERMISO / NO ENCONTRADO
┌────────────────────┐          ┌────────────────────┐           ┌────────────────────┐
│ Ningún resultado   │          │ ⚠ No se pudo       │           │ Esta página no     │
│ para "acme"        │          │   guardar          │           │ existe             │
│ [ Limpiar filtros ]│          │ Los datos siguen   │           │ ← Volver al inicio │
│                    │          │ en el formulario   │           │                    │
│ ≠ vacío inicial:   │          │ [ Reintentar ]     │           │ 404, nunca 403     │
│ aquí SÍ hay datos  │          │                    │           │ (RF-71, RF-95)     │
└────────────────────┘          └────────────────────┘           └────────────────────┘
```

Distinguir **vacío inicial** de **vacío por filtro** no es cosmética: el primero invita a crear, el
segundo a limpiar el filtro. Confundirlos hace que alguien concluya que sus datos desaparecieron.

Ningún estado de error muestra traza, nombre de tabla, consulta ni versión (RNF-32).

---

## 6. HQ — intranet SLG (`/hq`)

Rol `slg_admin` y `slg_operator`. `slg_operator` no ve Claves de API ni Auditoría en la barra
lateral, **y además el servidor rechaza sus peticiones a esas rutas** (RF-86, RF-68).

### 6.1 Tablero (`/hq/tablero`) — RF-73…RF-76

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Tablero                                          [ Abrir CRM ↗ ]  (RF-75)   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ⚠ 3 capturas no entregadas al CRM          [ Ver capturas ]  ← alerta roja  │
│     (única instancia de rojo del tablero — RNF-13)                           │
├───────────────────────────────────┬──────────────────────────────────────────┤
│ CAPTURAS WEB (hoy)                │ PIPELINE — dato del CRM                  │
│ [documento ▾][página ▾][fecha ▾]  │ embudo · fuentes                         │
│ ─────────────────────────────────  │ ────────────────────────────────────    │
│ correo   documento  estado   →CRM │ [gráfico/valores]                        │
│ …        D-01       delivered  ↗  │ Leído del CRM · caché 5 min ·            │
│ …        D-06       pending       │ actualizado hh:mm  (RF-74)               │
│ …        D-03       failed  [↻]   │ [ Reintentar lectura ]                   │
├───────────────────────────────────┴──────────────────────────────────────────┤
│ Modo de entrega al CRM: contact_note   ← D-19 · visible aquí a propósito     │
│ 7 capturas requieren crear la oportunidad a mano en el CRM (R-04, R-24)      │
├──────────────────────────────────────────────────────────────────────────────┤
│ EMPRESAS ACTIVAS │ PROYECTOS Y ENTREGABLES RECIENTES │ ARTÍCULOS             │
│ …                │ …                                 │ publicados/borradores │
│                  │                                   │ + extractos sociales  │
│                  │                                   │   [copiar] (RF-25)    │
├──────────────────────────────────────────────────────────────────────────────┤
│ ACTIVIDAD DE AGENTES        │ ÚLTIMOS EVENTOS DE AUDITORÍA                   │
│ agent_event recientes       │ (solo slg_admin — RF-83)                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **El modo del adaptador (D-19) se muestra en pantalla**, no solo en una variable de entorno: es la
  mitigación de R-24 convertida en elemento de interfaz. Si producción sigue en `contact_note`
  dentro de un año, se ve todos los días.
- El panel del CRM tiene **estado degradado propio**: si el CRM no responde, muestra el último dato
  cacheado con su marca de tiempo y un aviso; el resto del tablero funciona. Un CRM caído no tumba
  HQ (R-07).
- Los extractos sociales tienen acción "copiar" por campo (`hook`, `linkedin`, `x`), que es
  exactamente lo que DoD #3 pide ver.

### 6.2 Empresas (`/hq/empresas`) — RF-77

Tabla: nombre · slug · tipo · estado · nº proyectos · contacto principal.
Ficha de empresa: datos + pestañas *Proyectos* · *Usuarios* · *Avisos*, y acción "Invitar usuario".
Crear/editar en panel lateral. Sin borrado en v1: una empresa se archiva cambiando su `status`
(borrar arrastra proyectos, entregables y capturas).

### 6.3 Usuarios e invitaciones (`/hq/usuarios`) — RF-78

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Usuarios e invitaciones                     [ + Invitar ]                   │
│  ( Usuarios | Invitaciones )                                                 │
│  ── Invitaciones ─────────────────────────────────────────────────────────   │
│  correo          empresa       rol           enviada    caduca     acción    │
│  a@ejemplo.com   Cliente Demo  client_admin  hoy 10:12  en 71 h  [Revocar]   │
│  b@ejemplo.com   Cliente Demo  client_member ayer       caducada [Reenviar]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- "Revocar" es irreversible → modal con scrim.
- Si el correo de invitación falla en el envío, **la invitación queda creada y reenviable** (RF-119):
  el hecho de negocio no se pierde por un fallo del proveedor. La fila lo indica.
- Solo `slg_admin` invita usuarios SLG (RF-86).

### 6.4 Proyectos (`/hq/proyectos`) — RF-79

Tabla: nombre · empresa · servicio (nomenclatura literal) · estado · responsable · fechas.
Ficha: datos + *Entregables* + *Avisos* + actividad. El campo servicio se elige de la lista literal
(`Phoenix PEEx`, `SLG_Readiness`, `APP_Building`…), no se escribe libre: así el script de
nomenclatura (RF-14) no tiene nada que corregir.

### 6.5 Entregables (`/hq/entregables`) — RF-80

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Entregables                                       [ + Publicar entregable ] │
│  [ proyecto ▾ ] [ tipo ▾ ] [ visibilidad ▾ ]                                 │
│  título          proyecto      tipo   v.  visibilidad  publicado  por        │
│  Informe final   Cliente Demo  pdf    2   client       ayer       Ricardo    │
│  Reporte         Cliente Demo  html   1   internal     lunes      clave·API  │  ← RF-111
└──────────────────────────────────────────────────────────────────────────────┘

  Panel de publicación:
  ┌────────────────────────────────────────────┐
  │ Proyecto        [ ▾ ]                      │
  │ Título          [        ]                 │
  │ Tipo   ( pdf | html | md | link | material)│  ← valor de datos (RF-142)
  │ Archivo [ subir ]  ó  URL [        ]       │
  │ Visibilidad ( client | internal )           │
  │ Versión: se crea la v(N+1); la anterior     │  ← RF-143: no se destruye
  │ permanece accesible                         │
  │ [ Publicar ]                                │
  └────────────────────────────────────────────┘
```

Validación de tipo MIME y tamaño en el servidor antes de aceptar (RNF-25,
`[PENDIENTE: MB máximos — se fija en data_model]`).

### 6.6 Avisos (`/hq/avisos`) — RF-81

Lista por empresa; composición en Markdown con previsualización. Publicar dispara
`announcement.published`. El Markdown se sanea antes de renderizarse en el portal (RNF-31).

### 6.7 Capturas web (`/hq/capturas`) — RF-84, RF-51, RF-52

La pantalla que hace visible lo que de otro modo se pierde en silencio (R-07, R-23).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Capturas web                                                                │
│  [ documento ▾ ] [ página ▾ ] [ estado ▾ ] [ fecha ▾ ]      128 de 340       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ fecha   correo         documento  origen   estado CRM   acción         │  │
│  │ 10:12   a@empresa.com  D-01       /ai/…    delivered ↗  ver ficha CRM  │  │
│  │ 09:40   b@empresa.com  D-06       /ai/…    pending      —              │  │
│  │ ayer    c@empresa.com  D-03       /ai/…    failed (5)   [ Reintentar ] │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Ficha de captura:                                                           │
│   datos del lead · página · idioma · UTM · consent_at                        │
│   Intentos de entrega (crm_delivery):                                        │
│    #1 10:12 502 · #2 10:13 timeout · #3 10:23 502 · #4 11:12 502 · #5 …      │
│    último error: [mensaje del CRM, sin detalle interno de nuestra app]       │
│   [ Reintentar ahora ]   ← queda auditado (RF-52)                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

El enlace a la ficha del CRM se construye desde plantilla configurable, no codificada (RF-54,
`[PENDIENTE: ruta de la ficha de contacto en el CRM — Anexo I-9]`). Mientras la plantilla no esté
configurada, la columna muestra el identificador sin enlace, no un enlace roto.

**Esta pantalla no gestiona leads**: no hay etapa, ni propietario, ni valor, ni "próximo paso"
(RF-57, RF-85, frontera (a) de `scope.md`). Es evidencia y cola de entrega.

### 6.8 Claves de API (`/hq/claves`) — RF-82 · solo `slg_admin`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Claves de API                                        [ + Nueva clave ]      │
│  nombre            propietario  alcances              límite  caduca  estado │
│  Hermes · validador clave       events:write          60/min  30 dic  activa │
│  Hermes · entregas  clave       deliverables:write…   60/min  30 dic  activa │
│                                                                [ Revocar ]   │
└──────────────────────────────────────────────────────────────────────────────┘

  Al crear:  alcances por casilla (granulares, ninguno implica a otro — RF-147)
             caducidad y límite OBLIGATORIOS en el formulario (R-14)
  Tras crear:
  ┌──────────────────────────────────────────────────────────────┐
  │  Copia la clave ahora. No volverá a mostrarse.               │
  │  [ ····································· ]  [ Copiar ]       │
  └──────────────────────────────────────────────────────────────┘
```

La clave en claro se muestra **una sola vez** (RF-82). El campo no se rellena nunca al editar.

### 6.9 Auditoría (`/hq/auditoria`) — RF-83 · solo `slg_admin`

Tabla filtrable por actor (usuario o clave), acción, entidad y fecha. **Solo lectura**: no hay
acción de editar ni borrar en la pantalla, porque `audit_log` es inmutable (RNF-29). Ausencia de
botones aquí es una decisión de seguridad, no un olvido.

---

## 7. Portal de clientes (`/portal`)

Rol `client_admin` y `client_member`. Todo lo que se ve está acotado por el `organization_id` del
contexto autenticado (RF-71, R-10).

```
┌───────────────────┬──────────────────────────────────────────────────────────┐
│  Cliente Demo     │  Inicio                                                  │
│  ───────────────  ├──────────────────────────────────────────────────────────┤
│  ▸ Inicio         │  AVISOS DE SLG                                           │
│  ▸ Proyectos      │  ┌────────────────────────────────────────────────────┐  │
│  ▸ Materiales     │  │ fecha · Título del aviso                           │  │
│  ▸ Miembros       │  │ cuerpo en Markdown (saneado — RNF-31)              │  │
│  ▸ Perfil         │  └────────────────────────────────────────────────────┘  │
│  ───────────────  │                                                          │
│  Sesión Cero      │  TUS PROYECTOS            ÚLTIMOS ENTREGABLES            │
│  Nombre ▾         │  · Proyecto A (3)         · Informe final · v2 · pdf     │
└───────────────────┴──────────────────────────────────────────────────────────┘
   ^ el nombre de la empresa es el marcador de "dónde estoy": el cliente
     debe ver siempre de qué empresa está viendo datos
```

### 7.1 Inicio (`/portal`) — RF-88

Avisos + accesos a proyectos y últimos entregables. Vacío inicial redactado (RF-88): "Todavía no
hay avisos" + "aquí aparecerán las comunicaciones de SLG". Nunca una tarjeta vacía sin texto.

### 7.2 Proyectos y entregables (`/portal/proyectos`, `/portal/proyectos/[id]`) — RF-89

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Proyectos                                                                 │
│  Proyecto A · SLG_Readiness · en curso                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Entregable            tipo   versión  publicado    acción              │  │
│  │ Informe de Readiness  html   v2       12 sep       [ Abrir ]           │  │
│  │ Resumen ejecutivo     pdf    v1       10 sep       [ Descargar ]       │  │
│  │ Panel de control      link   —        10 sep       [ Abrir ↗ ]         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  Las versiones anteriores se despliegan bajo cada fila (RF-143).             │
└──────────────────────────────────────────────────────────────────────────────┘
```

Los entregables `internal` **no aparecen ni por enlace directo** (RF-89): pedir su identificador
devuelve 404.

### 7.3 Visor de entregables (`/portal/entregables/[id]`) — RF-90, RF-142

El tipo es **dato**, no rama de código: cada tipo declara su renderizador y añadir uno es añadir un
registro (RF-142).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Proyecto A · Informe de Readiness · v2                    [ Descargar ]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  pdf   → visor nativo del navegador sobre URL firmada con caducidad          │
│  html  → <iframe sandbox> SIN allow-same-origin, servido desde origen        │
│          separado, CSP estricta, sin cookies de sesión (RNF-21, R-11)        │
│  md    → Markdown OKF renderizado y saneado (RNF-31)                         │
│  link  → tarjeta que ANUNCIA el destino externo y abre en pestaña nueva;     │
│          nunca se incrusta contenido externo en el marco de la app           │
├──────────────────────────────────────────────────────────────────────────────┤
│  Estados: enlace caducado → [ Volver a abrir ] (reemite la firma)            │
│           archivo no disponible → aviso + contacto con SLG, sin traza        │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **Origen separado — cerrado por D-45 (`docs/decision_log.md`); resuelve CF-4 de
> `design_docs/design_summary.md` §2.** El «servido desde origen separado» (subdominio propio) del
> caso `html` es **normativo**, como ya lo daban este documento y `data_model` §3.10, y `architecture`
> §11.3 lo recoge así. El resto del visor —`sandbox` sin `allow-same-origin`, CSP estricta, sin
> cookies de sesión— **se mantiene** como defensa en profundidad, no como alternativa. Se construye en
> DU-19, con `[PENDIENTE: nombre del subdominio del visor, se fija en M4]`.

### 7.4 Materiales (`/portal/materiales`) — RF-91, RF-144

Entregables de tipo `material`, **agrupados por proyecto**, nunca como biblioteca global: no existe
ruta ni entidad que los liste fuera del proyecto que los contiene (RF-144). Se abren con el mismo
visor.

### 7.5 Miembros (`/portal/miembros`) — RF-92

Lista de miembros de la empresa. `client_admin` ve además `[ + Invitar ]` y las invitaciones
pendientes con su caducidad; `client_member` solo ve la lista (y el servidor lo aplica, RF-68).

### 7.6 Perfil (`/portal/perfil`) — RF-93

Nombre · idioma de interfaz (ES/EN, RF-72) · método de acceso · cambio de contraseña **solo si el
método es contraseña** · "Cerrar sesión en todos los dispositivos" (con confirmación, RF-66).

### 7.7 Paso "Agenda tu Sesión Cero" — RF-94

```
┌────────────────────────────────────────────────────────────┐
│  Sesión Cero                                               │
│  qué es y qué se lleva el cliente de ella                  │
│  [ Agendar ↗ ]   ← URL desde content/ui                    │
│                                                            │
│  Si la URL no existe todavía:                              │
│  ⌛ Próximamente · el paso se muestra igual, explicado,     │
│     con el botón deshabilitado. No rompe la pantalla.      │
│  [PENDIENTE: URL del calendario — Anexo I-10]              │
└────────────────────────────────────────────────────────────┘
```

Es el **único** lugar del producto donde aparece la Sesión Cero (RF-96).

---

## 8. Estados: catálogo y aplicación

### 8.1 Los seis estados canónicos

| Estado | Cuándo | Qué muestra | Qué NO hace |
|---|---|---|---|
| **Cargando** | Petición en curso | Esqueleto con la forma del contenido | Spinner centrado que no dice qué llega |
| **Vacío inicial** | No hay datos todavía | Qué es esto, qué aparecerá aquí, acción para crear el primero (si el rol puede) | Decir solo "sin datos" |
| **Vacío por filtro** | Hay datos, el filtro no casa | Qué filtro está aplicado + "limpiar filtros" | Parecerse al vacío inicial |
| **Error de carga** | La lectura falla | Frase sin detalle interno + "Reintentar" + salida al nivel superior | Mostrar traza o dejar la pantalla en blanco |
| **Error de acción** | La escritura falla | Aviso junto a la acción, **datos conservados**, reintento | Perder lo que el usuario escribió |
| **Permiso / no encontrado** | Recurso ajeno o inexistente | 404 con salida al inicio de la superficie | Devolver 403 (confirmaría que existe) |

### 8.2 Matriz por pantalla autenticada

`—` = no aplica en esa pantalla.

| Pantalla | Vacío inicial | Vacío por filtro | Error de carga | Error de acción | 404/permiso |
|---|---|---|---|---|---|
| `/acceder` | — | — | Proveedor OAuth no responde → mensaje + método de contraseña disponible | Credenciales/bloqueo: mensaje neutro | — |
| `/invitacion/[token]` | — | — | — | Correo ≠ invitación → reintentar con otra cuenta | Token usado/caducado/inexistente → mismo mensaje |
| `/recuperar` | — | — | — | Enlace usado o caducado → volver a pedirlo | — |
| **HQ Tablero** | "Aún no hay capturas" + "publica una página con descarga" | Filtro de capturas sin resultados | Panel del CRM caído → último dato en caché + aviso; el resto vive | Reintento de lectura del CRM falla → aviso en el panel | — |
| **HQ Empresas** | "Todavía no hay empresas" + `[+ Nueva empresa]` | "Ningún resultado para …" | Reintentar · ← Tablero | Guardar falla → panel abierto, datos intactos | Empresa inexistente → 404 |
| **HQ Ficha de empresa** | Pestañas vacías con su propio texto (sin proyectos / sin usuarios / sin avisos) | — | Reintentar · ← Empresas | Igual | 404 |
| **HQ Usuarios e invitaciones** | "Sin usuarios SLG" / "Sin invitaciones pendientes" | Filtro por empresa o estado | Reintentar · ← Tablero | Envío de correo falla → invitación creada + `[Reenviar]` (RF-119) | `slg_operator` en acción de invitar → 403 servidor + aviso |
| **HQ Proyectos** | "Todavía no hay proyectos" + `[+ Nuevo proyecto]` | Filtro por empresa/estado | Reintentar · ← Tablero | Guardar falla → datos intactos | 404 |
| **HQ Entregables** | "Todavía no hay entregables" + `[+ Publicar]` | Filtro por proyecto/tipo | Reintentar · ← Proyectos | Subida rechazada por tipo/tamaño → error en el campo, resto del formulario intacto | 404 |
| **HQ Avisos** | "Ningún aviso publicado" | Filtro por empresa | Reintentar · ← Tablero | Publicar falla → borrador conservado | 404 |
| **HQ Capturas web** | "Todavía no hay capturas" | Filtro sin resultados | Reintentar · ← Tablero | Reintento manual falla → fila en `failed`, nuevo intento registrado y visible | 404 |
| **HQ Claves de API** | "No hay claves creadas" + `[+ Nueva clave]` | — | Reintentar · ← Tablero | Crear/revocar falla → estado sin cambio + aviso | `slg_operator` → 404 en la ruta (RF-86) |
| **HQ Auditoría** | "Sin eventos registrados" | Filtro por actor/acción/fecha | Reintentar · ← Tablero | — (solo lectura) | `slg_operator` → 404 en la ruta |
| **Portal Inicio** | "Todavía no hay avisos" + qué aparecerá | — | Reintentar · sin salir de la superficie | — | — |
| **Portal Proyectos** | "Todavía no hay proyectos" + "tu contacto en SLG los publicará aquí" | — | Reintentar · ← Inicio | — | Proyecto de otra empresa → 404 |
| **Portal Ficha de proyecto** | "Este proyecto aún no tiene entregables" | — | Reintentar · ← Proyectos | — | 404 |
| **Portal Visor** | — | — | Archivo no disponible → aviso + contacto, sin traza | Enlace firmado caducado → `[Volver a abrir]` | Entregable `internal` o ajeno → 404 |
| **Portal Materiales** | "Aún no hay materiales" | — | Reintentar · ← Inicio | — | 404 |
| **Portal Miembros** | Nunca vacío (siempre está quien mira) | — | Reintentar · ← Inicio | Invitación falla → creada y reenviable | `client_member` en acción de invitar → 403 servidor |
| **Portal Perfil** | — | — | Reintentar | Guardar o cambio de contraseña falla → datos intactos, mensaje concreto | — |
| **Portal Sesión Cero** | Sin URL → estado "próximamente" explicado (RF-94) | — | — | — | — |

---

## 9. Wayfinding (C.6, RNF-43)

Tres preguntas por pantalla. Si una queda sin responder, la DU no cierra.

| Pantalla | Dónde estoy | A dónde puedo ir | Cómo salgo |
|---|---|---|---|
| Home | Logo + ruta activa vacía | Cinco destinos + descarga destacada + pie | Es la salida de todo lo público |
| Overview de rama | Título = nombre de la rama; ruta activa `SLG_AI` | Tarjetas de sus hijos | Logo → Home · pie |
| Página de servicio | Eyebrow de rama + nombre del servicio | Descarga (⑤) · `/contacto` (⑥) · overview de la rama vía eyebrow | Logo → Home · pie |
| Doctrina / Nosotros | Ruta activa en el menú | Formulario (Doctrina) · `/contacto` | Logo · pie |
| Blog índice / etiqueta | Ruta activa `Blog`; la etiqueta se nombra en el título | Artículos · otras etiquetas · RSS | Logo · pie |
| Artículo | Título + fecha + etiquetas | Etiqueta · índice | Logo · pie |
| Biblioteca de descargas | Título "Descargas" (llegada desde el pie o desde una página) | Ficha de cada documento | Logo · pie |
| Documento | Título del documento + enlace "← Descargas" | Página del servicio asociado | Logo · pie |
| `/gracias` | Confirmación explícita de lo que acaba de pasar | Documento · blog · contacto | Logo · pie |
| `/acceder` | Título "Acceder" | Tres métodos · recuperación | "← Volver al sitio" |
| `/invitacion/[token]` | Nombre de la empresa que invita | Tres métodos | Cerrar / `/acceder` |
| HQ (toda pantalla) | Marca "· HQ" + ruta activa en la barra lateral + título de la pantalla | Barra lateral completa + "Abrir CRM ↗" | Menú de usuario: "Ver el sitio público" · "Cerrar sesión" |
| HQ ficha (empresa/proyecto/captura) | "← <lista>" + nombre de la entidad | Pestañas de la ficha | Volver a la lista · barra lateral |
| Portal (toda pantalla) | **Nombre de la empresa** en la barra lateral + ruta activa | Barra lateral | Menú de usuario: "Ver el sitio público" · "Cerrar sesión" |
| Visor de entregables | "← <proyecto> · <título> · v<N>" | Proyecto · descarga | Volver al proyecto |
| 404 / 500 | Explicación en el idioma de la ruta pedida | Home · `/ai` · `/blog` | Cualquiera de las tres |

---

## 10. Comportamiento responsive

| Franja | Capa pública | HQ / Portal |
|---|---|---|
| < 768 px | Barra + sheet arrastrable (RNF-45); una columna; tarjetas apiladas; formulario a ancho completo | Barra lateral → mismo sheet; **tablas → tarjetas apiladas** con las 3 columnas que importan; el panel lateral pasa a hoja a pantalla completa |
| 768–1023 px | Dos columnas en rejillas de tres tarjetas | Barra lateral colapsada a iconos con etiqueta al desplegar |
| ≥ 1024 px | Rejilla completa; hero a ancho de columna de texto, nunca a ancho total de pantalla | Barra lateral fija; tablas completas; panel lateral sobre la lista |

Regla de C.6 (Flexibilidad): **móvil = rápido, escritorio = profundo**. En móvil, la tabla de
capturas muestra correo, documento y estado; el detalle vive en la ficha. Reducir una tabla de siete
columnas a un desplazamiento horizontal no es responsive.

---

## 11. Trazabilidad — requisito → sección

| Sección | Requisitos que materializa |
|---|---|
| §1 Navegación | RF-01, RF-02, RF-03, RF-04, RF-13, RF-14, RF-70, RF-87, RNF-45 |
| §2 Pantallas públicas | RF-06 a RF-12, RF-15, RF-17, RF-21 a RF-24, RF-29, RF-30, RF-96, RNF-44 |
| §3 Flujo de descarga | RF-28 a RF-45, RF-134, RNF-05, RNF-13, RNF-20, RNF-32, RNF-33 |
| §4 Identidad | RF-58 a RF-66, RF-119, RNF-24, RNF-37 |
| §5 Shell | RF-72, RF-68, C.5 (componente 8), RNF-34 |
| §6 HQ | RF-25, RF-51, RF-52, RF-54, RF-73 a RF-86, RF-111, RF-143, RF-147, RNF-25, RNF-29 |
| §7 Portal | RF-88 a RF-96, RF-142, RF-144, RNF-21, RNF-31 |
| §8 Estados | RNF-34, perfil `deliverable_unit_completeness`, RF-71, RF-95 |
| §9 Wayfinding | RNF-43, C.6 |
| §10 Responsive | RNF-01 (coste de render), C.6 (Flexibilidad) |

Los RNF de motion, marca y rendimiento (RNF-01 a RNF-15, RNF-46) no se materializan en wireframes:
son gates (`style_guide` + Anexo D) y se verifican sobre el componente construido.

---

## 12. Huecos declarados

Ninguno se resuelve inventando. Todos son visibles en staging y bloquean `main` (RNF-18).

| # | Hueco | Ref. |
|---|---|---|
| 1 | Redacción de todas las cadenas: titulares, mensajes de error, textos de estado vacío, ES y EN | FU-01, RF-132 |
| 2 | Qué documento se destaca en Home y con qué criterio rota | A.3, FU-01 |
| 3 | Si existe archivo del documento completo de Doctrina (no figura en D-01…D-11) | A.3, Anexo I-3 |
| 4 | Texto legal de privacidad y términos | F.2-1, Anexo I-6 |
| 5 | Caducidad de la URL firmada (minutos) — se fija en `api_contracts` | RNF-20 |
| 6 | Tamaño máximo de subida (MB) — se fija en `data_model` | RNF-25 |
| 7 | Ruta de la ficha de contacto en el CRM para el enlace profundo | RF-54, Anexo I-9 |
| 8 | URL del calendario de Sesión Cero | RF-94, Anexo I-10 |
| 9 | Datos de contacto y jurisdicción del pie; biografía y mentorías de Nosotros | RF-11, FU-01 |
| 10 | Logo de SLG Agency y favicon (mientras tanto, wordmark tipográfico) | C.3, Anexo I-5, R-35 |
| 11 | Plazo de respuesta comprometido en la variante *contacto* de `/gracias` | FU-01 |

---

## Registro

- `2026-09-08` — Creado en el paso 6 de `init-project`, nivel MEDIUM del perfil `software-app`, sobre
  `START_PROJECT.md` v1.1 (A.1, A.2, A.3, A.4, A.5, B.1, B.3, B.5, B.8, C.3–C.6, F.1),
  `planning/requirements.md` tras su reparación (RF-01…RF-148, RNF-01…RNF-46), `planning/scope.md`,
  `planning/risks.md` (R-04, R-07, R-11, R-23, R-24 con efecto directo en la interfaz de HQ) y
  `docs/decision_log.md` (D-16, D-17, D-19). Sin nombrar producto en las dos categorías abiertas
  (correo transaccional, object storage de backups) — AGENTS.md Regla 7.
- `2026-09-08` — **D-44** cierra CF-3 en el §3.2: el anillo de foco es de **dos capas** —exterior
  `--cyan`, interior `--blue-primary` o `--ink`—. **D-45** cierra CF-4 en el §7.3: el **origen
  separado** del visor es **normativo**, con `sandbox` y CSP como defensa en profundidad.
