---
type: planning
title: 04_plan_diseno_apple_nordico
project: slg_website
description: Plan visual, de interacción y de movimiento para la reingeniería de la portada y de las piezas compartidas. Aplica la skill apple-design (Emil Kowalski) sin perder el minimalismo nórdico de SLG. Incluye los principios aplicados y los rechazados, la tabla de tokens antes→después, la especificación de motion, el tratamiento por componente, las barreras de accesibilidad y Lighthouse, y las unidades FU/DU con criterios de aceptación.
tags: [slg, slg_website, planning, reingenieria, diseno, motion, tokens, accesibilidad, apple-design]
status: planning
timestamp: 2026-10-27
inputs:
  - planning/reingenieria/01_analisis_agenciaia.md     # E-AIA
  - planning/reingenieria/01_analisis_prayaga.md       # E-PRY
  - planning/reingenieria/01_analisis_slg_actual.md    # E-SLG (estado = origin/develop)
  - planning/reingenieria/02_sintesis_comparativa.md   # P1…P8, B-01…B-13, D-1…D-8
  - .claude/skills/apple-design/SKILL.md               # §1…§17
  - .claude/skills/review-animations/SKILL.md + STANDARDS.md
  - .claude/skills/prototype/SKILL.md
  - app/tokens.css · app/motion.css · app/apple.css · app/globals.css
  - components/Reveal.tsx · SheetMovil.tsx · Portada.tsx · BarraDeNavegacion.tsx · piezas.tsx
  - lib/design/motion.ts · scripts/ci/check-motion.ts · scripts/ci/check-lighthouse.ts
  - design_docs/style_guide.md
---

# 04 — Plan de diseño: Apple, en nórdico

> **Estado: PLAN para aprobación (AGENTS.md, Planning Gate).** Este documento no cambia código de la
> aplicación. Ninguna unidad de §8 se ejecuta hasta que Ricardo lo apruebe.
>
> **Cómo se lee.** Se mantiene la notación REA de la síntesis. **OBS** es lo leído en el código de esta
> rama (que parte de `origin/develop`, commit `c89cec3`) con su `archivo:línea`. **INF** es una
> propuesta o un juicio. Las referencias `E-…`, `P…`, `B-…` y `D-…` remiten a `02_sintesis_comparativa.md`.
> `§N(apple)` remite a la sección N de la skill `apple-design`. `RNF-…` remite a `planning/requirements.md`.
>
> **Límite heredado.** No hay ninguna vista renderizada del sitio (E-SLG-80, 81). Todo juicio visual de este
> plan sale del código. Por eso la primera unidad (FU-20) mide antes de tocar nada.
>
> **Relación con el plan de contenido.** Este plan da forma a las secciones que propone la síntesis
> (§8, integraciones 1–7). El orden final y el texto de cada sección los decide el plan de contenido (`03_…`).
> Donde este documento propone un orden, es provisional y cede ante ese plan.
>
> **Corregido tras crítica** (`05_critica_y_riesgos.md`): C-01 (`[PENDIENTE]` fuera de `develop`), C-04
> (accesibilidad 100 como no-regresión), C-05 (prerender), C-07 (el mapa sale de la portada), C-08 (salidas de la
> compuerta), C-10 (sin tarjetas de línea en la portada), C-11 (orden y bloques de 03), C-12 (sin escalonado por
> defecto), C-13 (eyebrow y longitud real del hero) y C-14 (montaje único con DU-RC01).

---

## 0. Resumen (INF)

1. **El sistema actual ya es «Apple»: le falta coherencia.** Los springs, el press en `pointerdown`,
   el reveal de 8 px, el sheet con las cuatro cláusulas de RNF-45, el material translúcido y las tres
   preferencias del sistema ya existen (OBS `app/motion.css`, `lib/design/motion.ts`, `components/SheetMovil.tsx`).
   El trabajo no es añadir movimiento. Es **unificar tres fuentes de verdad** (guía, `piezas.tsx` y la capa
   `apple.css` con `!important`) y **cerrar cinco defectos concretos** (§1.3).
2. **Moderación primero.** De los 17 apartados de la skill, la capa pública aplica de lleno siete,
   aplica de forma parcial cuatro y **rechaza o deja sin uso** seis (§2). Rechazar también es aplicar la
   skill: §16(apple) «Purpose: decide what *not* to build».
3. **La portada nueva no anima casi nada.** El hero no anima nunca. Las secciones aparecen una vez con
   el reveal que ya existe. *Corregido tras crítica (C-12):* **no hay escalonado por defecto**, tampoco en el
   método: el orden ya lo dan los numerales y el `<ol>`, y el plan de contenidos pide «sin animación por fase»
   (03 §5.4). El escalonado de 60 ms queda como opción que solo entra si el prototipo demuestra que ayuda a leer
   el orden (DD-7). No hay contadores, carruseles, parallax, rebotes ni vídeo.
4. **La tipografía es el material.** Montserrat no tiene eje óptico (`opsz`), así que el tamaño óptico se
   **emula** con tracking, interlineado y peso para cada escalón (§3.1). Las cifras grandes (01–04 y
   «11 dimensiones») sustituyen a la imagen, como ya dice la guía (`style_guide.md` §4.3).
5. **Accesibilidad.** El freno de CI exige 95 (E-SLG-57), no 100. El objetivo 100 se mide primero
   (FU-20) y se fija después según D-8. El sheet tiene un hueco real de gestión del foco (§1.3, defecto 4).

---

## 1. Punto de partida (OBS) y defectos que este plan corrige

### 1.1 Lo que ya cumple la skill (se conserva)

| Apartado de la skill | Implementación actual | Evidencia |
|---|---|---|
| §1 Respuesta en pointer-down | `.slg-pressable[data-pressed]`, 100 ms, `scale(0.97)`, sin `transition-delay` | `app/motion.css:40-46` |
| §2 Seguimiento 1:1 | `setPointerCapture`, delta sin multiplicar, respeta el punto de agarre | `components/SheetMovil.tsx:137-172` |
| §3 Interrumpibilidad | Retoma desde la matriz presentada (`DOMMatrixReadOnly.m42`) | `SheetMovil.tsx:144, 202-210` |
| §4 Springs, damping 1.0 | `SPRING = { damping: 1.0, response: 0.35 }`; curva `cubic-bezier(0.22, 1, 0.36, 1)` 350 ms | `lib/design/motion.ts:17-21`; `motion.css:23-24` |
| §5 Velocidad transferida | `duracionDesdeVelocidad()` acotada a 120–600 ms | `motion.ts:93-101` |
| §6 Proyección de momentum | `d = 0.998`, fórmula exponencial | `motion.ts:55-59` |
| §9 Rubber-band | `c = 0.55` | `motion.ts:71-76` |
| §11 Solo transform/opacity | Freno `check:motion` | `scripts/ci/check-motion.ts` |
| §12 Material translúcido | Barra `blur(20px) saturate(180%)`, sólida con `prefers-reduced-transparency` | `motion.css:82-86, 146-152` |
| §14 Tres preferencias | Reduced motion → fundido de 200 ms; transparency → sólido; contrast → bordes `ink-2` | `motion.css:117-170`; `globals.css` |
| §15 Tracking por tamaño | `--slg-track-display -0.03em` … `--slg-track-caption 0.02em` | `app/apple.css:29-37` |

### 1.2 Deriva entre fuentes (OBS; cierra B-13)

| Qué | Guía (`style_guide.md`) | `piezas.tsx` / `Portada.tsx` | `apple.css` (gana por `!important`) |
|---|---|---|---|
| Hero H1 | `clamp(2.25rem, 5vw, 4.5rem)` · 1.05 · −0.02em | `clamp(2rem, 6vw, 3.25rem)` · 1.08 · −0.02em (`piezas.tsx:196`) | `clamp(2.25rem, 6.2vw, 4.25rem)` · **1.02** · −0.03em (`apple.css:57-63`) |
| H2 | 600 · `blue-primary` · propuesta `clamp(1.5rem, 2.5vw, 2rem)` | 700 · `blue-deep` · `clamp(1.5rem, 3.5vw, 2.125rem)` · 1.15 (`Portada.tsx:284-291`) | `clamp(1.625rem, 3.6vw, 2.5rem)` · 1.12 · −0.022em |
| Radio de tarjeta | 16 px | `--slg-radius-md` 16 px (`piezas.tsx:216`) | `--slg-radius-lg` **24 px** (`apple.css:131-132`) |
| Material de la barra | 72 % | `color-mix(paper 72%)` (`motion.css:83`) | **68 %** (`apple.css:109`) |
| Sombras | «suaves multicapa» | `--slg-shadow-sm/md/lg` en `tokens.css` | Segunda familia `--slg-elev-1/2` con `rgb()` literal (`apple.css:45-50`) |
| Ritmo de sección | — | `3.5rem 0` literal (`Portada.tsx:282`) | `--slg-seccion` declarado y **sin uso** (`apple.css:41`) |

El hero tiene **tres** escalas distintas, no dos como recoge E-SLG-53. La que se ve es la de `apple.css`.

### 1.3 Defectos concretos (OBS; los corrige este plan)

| # | Defecto | Evidencia | Regla que incumple | Unidad |
|---|---|---|---|---|
| 1 | `transition` de **`color`** en los enlaces de la barra. El freno no lo ve porque la declaración ocupa varias líneas y `check:motion` lee solo la línea de `transition:` | `app/apple.css:118-120`; `check-motion.ts:124-127` | RNF-11 | FU-22, DU-41 |
| 2 | `will-change: transform` permanente en **todas** las tarjetas. El freno solo revisa la propiedad, no dónde se reparte | `apple.css:138`; `check-motion.ts:150-158` | RNF-11 («solo donde el movimiento es inminente») | FU-22, FU-23 |
| 3 | `:hover` con desplazamiento **sin la condición** `(hover: hover) and (pointer: fine)`. En táctil la tarjeta queda «levantada» tras el toque. Además, la sombra salta sin transición mientras el `transform` sí se anima | `apple.css:143-146` | review-animations, estándar 8 | FU-23 |
| 4 | El sheet es `role="dialog" aria-modal="true"`, pero **no mueve el foco** al abrir, **no lo atrapa**, no marca el resto como `inert` y **no lo devuelve** al botón «Menú» al cerrar. Además entra sin transición (aparece) y, al cerrar con Escape o con el telón, desaparece sin recorrido de salida | `SheetMovil.tsx:48, 103-109, 115-122` | WCAG 2.4.3; §7(apple) simetría | DU-40 |
| 5 | Dos mecanismos de press. `motion.css` usa `pointerdown` porque «`:active` en iOS llega tarde». `apple.css` aplica press con `:active` a todo enlace o botón con borde y radio | `motion.css:33-46` frente a `apple.css:184-190` | RNF-10; §4(apple) «Familiarity» | FU-23 |
| 6 | El enlace «saltar al contenido» anima 160 ms. Es una acción **iniciada por teclado** | `motion.css:277` | STANDARDS: «Never animate keyboard-initiated actions» | FU-23 |
| 7 | La barra pide `fontWeight: 500`, pero solo se cargan los cortes 400/600/700. Se ve 400 | `BarraDeNavegacion.tsx:101`; `globals.css` (`@font-face` 400/600/700) | §15(apple) jerarquía por peso | DU-41 |
| 8 | El telón del sheet lleva un color literal `rgb(10 10 20 / 0.32)` en el componente | `SheetMovil.tsx:221` | `tokens.css` («único archivo autorizado») | FU-21 |

---

## 2. Principios: dónde se aplica la skill y dónde no

La regla de desempate es fija. Si un apartado de la skill choca con **una idea por viewport, contenido
visible, nada que se mueva solo** (RNF-44, P7), gana el minimalismo nórdico. La skill misma lo permite:
§16(apple) «Simplicity — not minimalism», «decide what not to build», y STANDARDS «when unsure, the
strongest move is often to delete it».

### 2.1 Se aplica de lleno

| Principio (skill) | Cómo se aplica aquí (INF) |
|---|---|
| **Respuesta instantánea** §1 | Cada objeto pulsable responde en `pointerdown` con un único mecanismo (FU-23). El press dura 100 ms al bajar y 160 ms al soltar: el usuario empieza la acción y el sistema responde rápido. Cero retardos en la ruta de entrada. |
| **Interrumpibilidad** §3 | Solo hay transiciones CSS (se reorientan desde el valor actual) y el gesto del sheet (parte del valor presentado). Cero `@keyframes` en lo que se pueda agarrar. La entrada del sheet también se puede agarrar a mitad. |
| **Spring crítico por defecto** §4 | `damping 1.0` en todo. **Matiz (INF):** un spring que parte del reposo empieza con velocidad 0, es decir, despacio. En una transición disparada por un clic, una ease-out fuerte (`cubic-bezier(0.22, 1, 0.36, 1)`) **se percibe más rápida** y se aproxima al spring de `response` 0.35 en la llegada. Por eso **el spring de verdad queda para el gesto**, donde hay una velocidad que heredar (§5), y la curva sirve para todo lo demás. Es lo que ya hace el código, y este plan lo deja escrito. |
| **Coherencia espacial** §7 | El sheet entra desde abajo y sale hacia abajo, siempre, cierre por gesto, por Escape, por el telón o por un enlace. El telón aparece y desaparece en el mismo eje temporal que el panel. |
| **Feedback útil** §13, §16 | Cuatro tipos (estado, completado, aviso, error) solo en el formulario de descarga: validación en línea al salir del campo, `aria-live`, estado de envío y de completado. Ningún feedback decorativo. |
| **Tipografía** §15 | Tracking e interlineado **por escalón**, nunca un valor único. Jerarquía por peso + tamaño + interlineado. Todo en `rem`. Emulación del tamaño óptico (§3.1). |
| **Movimiento reducido** §14 | Se conserva el contrato: fundido de 200 ms, sin desplazamiento ni escalonado. Se añade `prefers-reduced-transparency` al telón y al sheet. |

### 2.2 Se aplica de forma parcial

| Principio | Qué se toma | Qué se deja (y por qué) |
|---|---|---|
| **Materiales y profundidad** §12 | **Una sola** superficie translúcida: la barra. El borde de scroll (*scroll edge*) en vez de una línea de 1 px. El telón que oscurece en el sheet (tarea modal). | **Sin cristal en tarjetas, hero, franja ni sheet.** El sheet es sólido, porque nunca se apilan dos superficies claras translúcidas. **Sin «empujar el fondo hacia atrás»** (escalar la página al abrir el sheet): es espectáculo, no información, y obliga a componer la página entera en una capa. La profundidad nórdica sale de la línea fina y de la alternancia `paper`/`paper-2`, no de la sombra. |
| **Momentum y velocidad** §5–6 | Solo en el sheet (ya está). | En ningún otro sitio: la capa pública no tiene nada más arrastrable, y no se va a crear nada para tenerlo. |
| **Indicar la dirección del gesto** §8 | El tirador del sheet y el seguimiento 1:1 ya indican la dirección. | Sin flechas animadas, sin «bounce hint» de «desliza aquí». |
| **Fluidez a nivel de fotograma** §11 | `transform`/`opacity`, `will-change` solo durante el gesto, presupuesto de §4.6. | Sin desenfoque de movimiento ni estiramiento: nada se mueve tan rápido como para necesitarlo. |

### 2.3 Se rechaza en la capa pública (moderación ante todo)

| Lo que no se añade | Apartado que lo permitiría | Por qué no (INF) |
|---|---|---|
| **Rebote** (`damping 0.8`), incluso tras un lanzamiento del sheet | §4, RNF-09 lo permite tras un gesto con momentum | El rubber-band ya da la física. Un rebote en una consultora estratégica se lee como juego. **Se usa `damping 1.0` en toda la capa pública.** `SPRING_CON_REBOTE` se queda sin uso. |
| **Hápticos y sonido** (Vibration API) | §13 | La utilidad no se cumple: abrir un menú no es un «momento significativo». La API no existe en iOS Safari, así que la experiencia sería desigual. |
| **Animación de entrada del hero** (fundido, subida, escritura) | — | El H1 es el LCP. Esconderlo retrasa la métrica y la lectura. `Reveal` ya no esconde lo que está a la vista (`Reveal.tsx:33-37`). El hero **no anima nunca**. |
| **Parallax, fondos que se mueven, scroll-telling, dibujo de líneas al hacer scroll** | — | RNF-46 y la idea por viewport. El diagrama antes/después y los conectores del método son **estáticos**. |
| **Contadores que suben, números que se escriben** | — | Bloqueados por `check:copy` y por la síntesis (§4.2). Las cifras grandes son tipografía quieta. |
| **Carrusel, slider, tabs, flip-box, acordeón** (incluido el «carrusel de artículos» que menciona la guía §6) | §6 (snap points) | P7: nada detrás de una interacción. Los artículos van en rejilla. |
| **Hover decorativo** (subrayados que se dibujan, brillos que siguen al ratón, `useSpring` sobre el puntero) | §4, STANDARDS «decorative mouse-tracking» | Frecuencia «decenas al día» → reducir o quitar. El color del enlace cambia **sin transición**. |
| **Animación en acciones de teclado** (anillo de foco, saltar al contenido, Escape) | — | STANDARDS: nunca. |
| **Librería de animación** (Motion/Framer Motion) | §4 mapeo web | El presupuesto de JS es < 150 KB gzip (`check:js-budget`) y la física ya está en 100 líneas (`lib/design/motion.ts`). No aporta nada que el sitio necesite. |
| **Desplazamiento suave a las anclas** (`scroll-behavior: smooth`) | — | Un salto largo y animado desorienta y retrasa. Salto instantáneo; el foco y `scroll-padding-top` hacen el resto (§6). |
| **Cambio de tema claro/oscuro** | §14 | Modo oscuro fuera de v1 (`style_guide.md` §7.2). |

---

## 3. Cambios de tokens: tabla antes → después

Todo cambio se escribe en `app/tokens.css` (valores) y `app/motion.css` (motion). La capa `apple.css`
deja de definir valores y pasa a **consumir** tokens (FU-21). Así se acaba la deriva de §1.2 sin
reescribir las 79 páginas que motivaron el `!important` (`apple.css:10-16`).

### 3.1 Escala tipográfica (Montserrat 400/600/700, estática, sin `opsz`)

**Emulación del tamaño óptico (INF).** Una fuente con eje óptico estrecha el espaciado y afina el trazo al
crecer, y lo abre al encoger. Montserrat es geométrica y ancha, y sus tres archivos son estáticos
(`globals.css`, «no una fuente variable»), así que `font-optical-sizing: auto` no hace nada. Se emula así:

- tracking **negativo** creciente en los tamaños grandes y **positivo** en los pequeños;
- interlineado **inverso** al tamaño, pero nunca por debajo de **1.06** en display: los titulares en
  español llevan mayúsculas acentuadas (Á, É, Ó) y descendentes (p, q, g, ñ). Con 1.02 (`apple.css:35`), la
  tilde de la segunda línea toca la descendente de la primera;
- peso 700 solo en display y H1/H2, 600 en H3 y en estados activos, y 400 en todo lo demás. **No hay 500**
  (defecto 7);
- tracking del display en dos pasos según el tamaño real, porque −0.03em a 36 px apelmaza Montserrat.

| Escalón | Antes (lo que se ve hoy) | Después (propuesta) | Uso |
|---|---|---|---|
| `--slg-type-display` (H1 de la portada) | `clamp(2.25rem, 6.2vw, 4.25rem)` · 700 · 1.02 · −0.03em (`apple.css`) | `clamp(2.25rem, 1.35rem + 3.6vw, 4rem)` · 700 · **1.06** · −0.018em hasta 3rem y **−0.026em** desde 3rem · `text-wrap: balance` · máx. 20ch | Solo el H1 de `/` y de `/en` |
| `--slg-type-h1` (páginas interiores) | Igual que display (la regla `main h1` alcanza a todas) | `clamp(1.875rem, 1.3rem + 2.4vw, 3rem)` · 700 · 1.1 · −0.02em · máx. 24ch | H1 del resto de páginas |
| `--slg-type-numeral` (cifra gráfica) | No existe | `clamp(3rem, 2rem + 4vw, 5rem)` · 700 · **1.0** · −0.04em · `font-variant-numeric: lining-nums tabular-nums` | 01–04 del método, «11» de la puerta de entrada |
| `--slg-type-h2` | `clamp(1.625rem, 3.6vw, 2.5rem)` · 1.12 · −0.022em (`apple.css`) | `clamp(1.5rem, 1.15rem + 1.5vw, 2.25rem)` · 700 · 1.15 · −0.015em · `blue-deep` | Título de cada sección |
| `--slg-type-lead` (párrafo tras H1 o H2) | `clamp(1.0625rem, 1.9vw, 1.375rem)` · 1.5 · −0.008em · `ink-2` · 52ch | `clamp(1.125rem, 1rem + 0.6vw, 1.375rem)` · 400 · 1.5 · −0.005em · `ink-2` · 52ch | Apoyo del hero y de cada H2 |
| `--slg-type-h3` | `1.25rem` · 600 · 1.25 · −0.015em | `1.25rem` · 600 · **1.3** · −0.01em · `indigo` | Fases, dolores, reglas, tarjetas |
| `--slg-type-body` | `1.0625rem` · 400 · 1.6–1.62 · 0 | **Sin cambio:** `1.0625rem` · 400 · 1.6 · 0 · máx. 68ch · `text-wrap: pretty` (mejora progresiva) | Cuerpo |
| `--slg-type-small` | `0.875rem` · 1.45 · +0.04em (guía) | `0.875rem` · 400 · 1.45 · **+0.01em** | Notas, pie, microcopy del CTA |
| `--slg-type-eyebrow` | `0.8125rem` · MAYÚSCULAS · +0.04em → +0.02em por `apple.css:95-98` | `0.8125rem` · 600 · MAYÚSCULAS · 1.2 · **+0.08em** | «Para directorios y comités», «Fase 01» |

**Reglas que acompañan a la tabla.**

- **Sin cursivas.** No se carga ningún corte itálico, así que el navegador las sintetiza inclinando la
  letra. Una escena (P2) se distingue por color (`ink-2`) y no por cursiva.
- **Eyebrows en `blue-primary` solo sobre `paper`.** Sobre `paper-2` mide 4,4:1 y exige ≥ 24 px
  (`style_guide.md` §2.2.3). Sobre `paper-2`, el eyebrow va en `ink-2`.
- **Sin guiones automáticos** en titulares (`hyphens: manual`).
- **Precarga solo del corte 700** (`<link rel="preload" as="font" type="font/woff2" crossorigin>`), porque
  el LCP es el H1 en 700. Hoy no se precarga ninguno (OBS: sin `preload` en `app/layout.tsx`). Se añade una
  `@font-face` de respaldo métrico (`size-adjust`, `ascent-override`, `descent-override` sobre Arial) para
  que el cambio de fuente no mueva el layout. **Los valores se miden** con la métrica real de los archivos
  (p. ej. Capsize/Fontaine) y no se inventan.

### 3.2 Ritmo de espaciado (hoy no existe como token, B-13)

| Token | Antes | Después | Uso |
|---|---|---|---|
| `--slg-space-1` … `-9` | Literales sueltos (`0.75rem`, `1.25rem`, `2rem`, `3.5rem`…) | `0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4 · 6` rem | Escala única de 4 px en `rem` |
| `--slg-seccion` | Declarado y sin uso (`apple.css:41`); secciones a `3.5rem 0` | `clamp(4rem, 2.75rem + 5.5vw, 7rem)` arriba y abajo | Separación entre secciones de la portada |
| `--slg-hero-pad` | `clamp(4.5rem, 11vw, 8rem)` / `clamp(2rem, 5vw, 3.5rem)` (`apple.css:165-168`) | `clamp(3.5rem, 2rem + 6vw, 7rem)` arriba / `--slg-space-8` abajo | El hero deja ver el inicio de la sección siguiente en 1280×800 (no hay «falso suelo») |
| `--slg-gutter` | `1.25rem` | `clamp(1.25rem, 0.75rem + 2.5vw, 2.5rem)` | Margen lateral |
| `--slg-contenedor` | `72rem` literal | `72rem` (token) | Ancho máximo |
| `--slg-medida` / `--slg-medida-lead` | `68ch` / `52ch` / `42rem` mezclados | `68ch` / `52ch` | Medida de lectura |
| Separación interna | — | Título→apoyo `--slg-space-3`; apoyo→contenido `--slg-space-6`; entre elementos de una lista `--slg-space-5` | Proximidad = relación (§16(apple), «Grouping») |

### 3.3 Color (paleta sobria, sin tonos nuevos)

| Aspecto | Antes | Después |
|---|---|---|
| Paleta | 9 de marca (`site.config.ts`) + `ink-2`, `paper-2` | **Sin cambio.** Ningún tono nuevo. Sin verde, amarillo ni naranja. |
| Rojo | Solo CTA de descarga y alertas | **Sin cambio.** En la portada aparece como mucho en el CTA del hero, en la puerta de entrada y en el CTA final, y nunca más de 1–2 veces por viewport. El error del formulario usa texto `ink` con un filete de 2 px en `red`, que cuenta como instancia. |
| Cian | Acento sobre oscuro, capa exterior del foco | **Sin cambio.** En la franja de independencia, solo como filete y nunca como texto pequeño. |
| `--slg-scrim` | Literal en `SheetMovil.tsx:221` | `rgb(10 10 20 / 0.32)` **en `tokens.css`** |
| `--slg-hairline` | `color-mix(line 55%)` literal en `apple.css:132` | `color-mix(in srgb, var(--slg-line) 55%, transparent)` en `tokens.css`. Se usa solo para dividir y nunca para delimitar un control (1,6:1). |

### 3.4 Superficies, materiales y elevación

| Token | Antes | Después | Regla |
|---|---|---|---|
| `--slg-surface-base` | `paper` | `paper` | Fondo |
| `--slg-surface-sunken` | `paper-2` («alternancia») | `paper-2` | Bandas alternas: dolor y «cuándo no comprar». No llevan sombra. |
| `--slg-surface-inverse` | Franja `blue-deep` (`Portada.tsx:316`) | `blue-deep` | **Una** franja oscura por página: la de independencia. Sin logo dentro. |
| `--slg-surface-material` | 72 % (`motion.css`) **y** 68 % (`apple.css`) | **72 %** + `--slg-blur` | **Solo** la barra. |
| Elevación | Dos familias: `--slg-shadow-sm/md/lg` y `--slg-elev-1/2` | **Una:** `--slg-elev-0` (none, línea fina) · `-1` (tarjeta en reposo: contacto casi invisible) · `-2` (tarjeta en hover, barra) · `-3` (sheet). Todo en `tokens.css`. `--slg-shadow-*` pasan a alias para no romper las páginas. | La profundidad nórdica es línea + tono; la sombra solo marca lo que flota (barra, sheet) o responde (hover). |

### 3.5 Radios

| Token | Antes | Después | Regla |
|---|---|---|---|
| `--slg-radius-sm` | 12 px | 12 px | Controles, campos, botones, foco |
| `--slg-radius-md` | 16 px (forzado a 24 en tarjetas por `apple.css:131`) | **16 px, sin forzar** (decisión DD-4) | Tarjetas |
| `--slg-radius-lg` | 24 px | 24 px | Franja, puerta de entrada, sheet |
| `--slg-radius-full` | `999px` literal (tirador, pastillas) | `999px` (token) | Solo el tirador y las etiquetas |
| Regla concéntrica | — | radio interior = radio exterior − padding (mínimo 4 px) | Un botón dentro de la puerta de entrada (24 px, padding 2 rem) usa 12 px |

### 3.6 Motion (tokens)

| Token | Antes | Después | Uso |
|---|---|---|---|
| `--slg-ease-out` | `--slg-spring: cubic-bezier(0.22, 1, 0.36, 1)` | El mismo valor con nombre honesto. `--slg-spring` queda como alias. | Todo lo que entra, sale o responde |
| `--slg-ease-drawer` | No existe | `cubic-bezier(0.32, 0.72, 0, 1)` | Entrada y salida del sheet sin gesto |
| `--slg-ease-in-out` | No existe | `cubic-bezier(0.65, 0, 0.35, 1)` | Reservado para un movimiento en pantalla. **Hoy no hay ningún uso en la capa pública.** |
| `--slg-dur-press` / `--slg-dur-release` | 100 ms / 100 ms (simétrico) | **100 ms / 160 ms** | Press al bajar y al soltar |
| `--slg-dur-fade` | 200 ms (`CROSSFADE_MS`) | 200 ms | Telón, fundidos, movimiento reducido |
| `--slg-dur-exit` | — (desmonta sin salida) | **240 ms** | Sheet cerrado por Escape, por el telón o por un enlace |
| `--slg-dur-enter` | — (aparece) | **300 ms** | Apertura del sheet |
| `--slg-dur-hover` | 260 ms (`apple.css:137`) | **200 ms** | Elevación de la tarjeta en hover |
| `--slg-dur-reveal` | 350 ms (`--slg-spring-duration`) | 350 ms (alias) | Reveal. Es explicativo, no de UI, así que puede pasar de 300 ms (STANDARDS, «Marketing / explanatory») |
| `--slg-stagger` | — | **0 ms por defecto**; 60 ms (0/60/120/180) solo si DD-7 lo aprueba tras el prototipo | **Solo** las cuatro fases del método (C-12) |
| `--slg-reveal-offset` | 8 px | 8 px | Sin cambio (RNF-46) |
| Duración del gesto | 120–600 ms según la velocidad | Sin cambio | `duracionDesdeVelocidad()` |

---

## 4. Especificación de motion

### 4.1 Inventario: qué anima y qué no

| Elemento | ¿Anima? | Cómo | Por qué (propósito válido según STANDARDS) |
|---|---|---|---|
| H1 y apoyo del hero | **Nunca** | — | LCP; primera lectura |
| CTA (botón) | Sí | Press `scale(0.97)` en `pointerdown`, 100 ms bajando y 160 ms soltando, `--slg-ease-out` | Feedback |
| Enlaces de texto y de la barra | **No** (cambio de color instantáneo) | — | Decenas al día; `color` no es transform/opacity |
| Tarjeta de línea (hover con puntero fino) | Sí | `translateY(-2px)` 200 ms + sombra `elev-2` en un `::before` que se funde por `opacity` | Afordancia de objeto pulsable. La sombra se anima en el compositor. |
| Tarjeta (táctil) | Solo el press | Press como el CTA | Feedback, sin hover pegajoso |
| Secciones bajo el pliegue | Sí, una vez | Reveal existente: opacidad + 8 px, 350 ms | Evitar un cambio brusco al entrar |
| Fases del método | Sí, una vez | Reveal del `<ol>` como bloque. Escalonado de 60 ms solo si DD-7 lo aprueba (C-12) | El orden ya lo dan numerales y DOM; el escalonado sería explicativo, no imprescindible |
| Dolor, reglas, «cuándo no comprar», tabla | Una vez, como bloque | Reveal sin escalonado | — |
| Números 01–04 y «11» | **Nunca** | — | No hay contadores |
| Conectores del método, diagrama antes/después | **Nunca** | Estáticos | P7 |
| Sheet (abrir) | Sí | `translateY(100%) → 0`, 300 ms `--slg-ease-drawer`; telón `opacity 0 → 1`, 200 ms | Coherencia espacial (§7) |
| Sheet (cerrar sin gesto) | Sí | `0 → 100%`, 240 ms `--slg-ease-drawer`; telón 200 ms. Luego se desmonta. | Simetría. El sistema responde más rápido de lo que abre. |
| Sheet (gesto) | Sí | Contrato actual RNF-45, sin rebote | Manipulación directa |
| Anillo de foco, saltar al contenido | **Nunca** | Aparición instantánea | Acción de teclado |
| Formulario: error en línea | **No** | Aparece sin movimiento y se anuncia con `aria-live="polite"` | Un error que se desliza retrasa la lectura |
| Formulario: enviado | Sí | Fundido de 200 ms entre el estado del botón y el mensaje | Completado |
| Barra (scroll edge) | Opcional (DD-5) | Opacidad de un `::after` ligada al scroll (`animation-timeline: scroll()`), con `@supports` | Wayfinding: la barra solo se separa cuando algo pasa por debajo |
| Mapa del sitio «Empieza aquí» | **Nunca** | — | Ya decidido (E-SLG-43) |

### 4.2 Sheet móvil v2 (DU-40)

- **Apertura.** Se monta con `translate3d(0, 100%, 0)`. En el siguiente fotograma (doble `requestAnimationFrame`)
  pasa a `0` con 300 ms y `--slg-ease-drawer`. Durante la entrada el panel **se puede agarrar**: el
  `pointerdown` ya lee la traslación presentada (`SheetMovil.tsx:144`). No se usa `@starting-style`, porque el
  `transform` en línea del componente le gana y obligaría a usar `!important`.
- **Cierre sin gesto.** Escape, toque en el telón o toque en un enlace llevan el panel a `100%` en 240 ms. El
  desmontaje ocurre al terminar. **La navegación no espera a la animación**: el cambio de página es la
  respuesta.
- **Umbral de arrastre.** 8 px de histéresis vertical antes de tomar el gesto, para que un toque con poco
  desplazamiento sobre un enlace no arrastre el panel (§10(apple)).
- **Sin rebote.** Al soltar sin llegar a cerrar, vuelve a `0` con `--slg-ease-out` en 350 ms y
  `damping 1.0`. El rubber-band hacia arriba se queda como está.
- **Foco.** Al abrir, el foco pasa al primer enlace. `Tab` y `Shift+Tab` quedan atrapados en el panel.
  `header` y `main` llevan `inert`. Al cerrar, el foco vuelve al botón «Menú». Escape cierra, como hoy.
- **Scroll.** `overscroll-behavior: contain` en el telón, para que la página no se desplace por detrás.
- **Preferencias.** Con `prefers-reduced-motion` el panel no se desplaza: el panel y el telón se funden en
  200 ms, como ya hace el cierre (`SheetMovil.tsx:93-95`), ahora también la apertura. Con
  `prefers-reduced-transparency` o `prefers-contrast: more`, el telón pasa a `rgb(10 10 20 / 0.6)`.
- **Capa.** `will-change: transform` solo mientras dura el gesto o la transición, y se quita cuando el panel
  se asienta.

### 4.3 Press unificado (FU-23)

Un solo mecanismo. El componente o el contenedor marca los pulsables con `.slg-pressable`, y un
escuchador delegado en `ArmazonPublico` (`pointerdown` / `pointerup` / `pointercancel`, pasivo, < 1 KB) pone
`data-pressed` en el `closest('.slg-pressable')`. Se retira la regla `:active` de `apple.css:184-190`. El
`translateZ(0)` permanente de `.slg-pressable` (`motion.css:42`) se elimina, porque crea una capa por botón
sin que haya movimiento inminente.

### 4.4 Reveal y escalonado (encaje con `Reveal.tsx` y `motion.css`)

- `Reveal` **no cambia de contrato**: nace visible, esconde solo lo que está debajo del viewport, se
  desconecta al primer cruce y tiene rescate a 3 s y visibilidad al imprimir (`Reveal.tsx`, `motion.css:63-80`).
- **El escalonado del método** (solo si DD-7 lo aprueba; por defecto no existe, C-12) se hace sin JS nuevo. Cada `<li>` lleva `style="--i: n"` y
  `.slg-reveal[data-revealed] .slg-escalon { transition-delay: calc(var(--i) * var(--slg-stagger)) }`. El retardo
  existe solo durante el reveal y no está en ninguna ruta de entrada, así que no contradice
  «cero retardos artificiales» (`motion.css:37`). Con movimiento reducido el retardo es 0.
- **Una sola `Reveal` por sección**, nunca una por tarjeta. Así hay como mucho 4 elementos animándose a la
  vez.

### 4.5 Movimiento reducido (sin cambio de contrato, más cobertura)

| Preferencia | Comportamiento |
|---|---|
| `prefers-reduced-motion: reduce` | Todo pasa a fundido de 200 ms (`motion.css:117-144`). Sin desplazamiento, sin escalonado, sin elevación en hover, sin press de escala. El reveal funde sin los 8 px. El sheet funde. |
| `prefers-reduced-transparency: reduce` | La barra pasa a `paper` sólido. El telón se hace más opaco. Nada más es translúcido. |
| `prefers-contrast: more` | `--slg-line` pasa a `ink-2` (`globals.css`). Las tarjetas pierden la sombra y ganan borde. El filete de la franja pasa a blanco. |

### 4.6 Presupuesto de rendimiento

- **Propiedades:** solo `transform` y `opacity`. Ninguna transición de `color`, `box-shadow`, `filter`,
  `backdrop-filter`, `height` ni `clip-path`.
- **Capas:** `will-change` solo en el panel del sheet mientras se mueve. `backdrop-filter` solo en la barra,
  que es una capa. Nada translúcido se desplaza.
- **Hilo principal:** cero escuchadores de `scroll`. Solo `IntersectionObserver` y eventos de puntero
  pasivos. Ninguna lectura de layout dentro de un bucle de animación (`offsetHeight` solo en manejadores,
  como hoy).
- **JS:** la portada nueva **no añade ningún componente de cliente** salvo los que ya existen (`Reveal`,
  barra y sheet) y el escuchador delegado del press. El JS inicial sigue < 150 KB gzip (`check:js-budget`).
- **Medida:** en el perfil móvil de Lighthouse (4× CPU), cero tareas largas > 50 ms atribuibles a motion. El
  sheet se graba y se revisa cuadro a cuadro (gate D3, `scripts/ci/test-gesto.ts`). CLS < 0,1 con el
  respaldo métrico de la fuente. LCP < 2,5 s.

---

## 5. Tratamiento por componente (secciones nuevas de la portada)

*Corregido tras crítica (C-11).* El orden es el de `03_…` §2.1: **barra → hero → dolor → lo que cambia
(antes/después) → método → puerta de entrada → cuatro reglas y postura (franja oscura) → cuándo no comprar →
quién responde → doctrina (banda clara) → Holdings (una línea) → CTA final → pie.** El mapa «Empieza aquí» y
las tarjetas de línea **no** están en la portada (C-07, C-10). Todas las
secciones van alineadas a la izquierda, sobre la rejilla de 72 rem y con un único H2. **Ninguna lleva icono,
ilustración, foto, contador ni tarjeta decorativa.** El texto vive en `content/` (RF-16, `check:cadenas`).

### 5.1 Barra de navegación (DU-41)

- Se conserva todo lo que funciona: cinco destinos a la vista, banderas junto al logo, «Acceder»
  secundario y nunca rojo (`BarraDeNavegacion.tsx`).
- Material al 72 % con el token. La separación es el *scroll edge* (hoy una sombra de `apple.css:111-114`) y
  pasa a token.
- Enlaces: inactivo 400 `ink-2`, activo 600 `blue-deep` con `aria-current`. **Sin transición de color.**
- `html { scroll-padding-top: <alto de la barra> + 1rem }`, para que ni un ancla ni el foco queden debajo de
  la barra fija (WCAG 2.4.11).
- Botón móvil: se mantiene la palabra «Menú», sin icono de hamburguesa (§16(apple), «direct, specific
  labels»). Objetivo táctil ≥ 44×44 px.
- **Opcional (DD-5):** la sombra del borde aparece solo cuando hay contenido por debajo, mediante la opacidad
  de un `::after` ligada a `scroll()`. Si `check:motion` no la acepta en ese archivo, **se descarta, no se
  exceptúa**.

### 5.2 Hero (DU-42; depende de D-1 y del texto de 03)

- **Estructura.** Eyebrow, H1 display, lead y **un** botón rojo (descarga de la puerta de entrada), con el texto
  de 03 §1. *Corregido tras crítica (C-13):* 03 recomienda como eyebrow una **frase** («No vendemos inteligencia
  artificial.»), no una etiqueta. Una frase no va en mayúsculas forzadas con +0.08em: el eyebrow del hero usa caja
  normal, 600, `--slg-type-small` o superior, en `blue-deep` o `blue-primary` sobre `paper`. `--slg-type-eyebrow`
  (MAYÚSCULAS) queda para etiquetas de 1–3 palabras («Fase 01»). El «para quién» va en el lead, como en 03. Como mucho
  un enlace de texto secundario hacia `#metodo`, si 03 lo decide. Ningún segundo botón.
- **Sin foto** (decisión D-7 pendiente; recomendación INF: la portada sin foto, como dice la guía §4.3).
  Sin imagen de fondo, sin degradado, sin «blob».
- **Disposición.** Una columna, alineada a la izquierda, H1 de 20ch como máximo, lead de 52ch, CTA a
  `--slg-space-6` del lead. En 1280×800, el H2 de la sección de dolor asoma por debajo del pliegue. En 360 px
  caben eyebrow, H1, lead y CTA sin desplazar. *Corregido tras crítica (C-13):* el texto real de 03 no son «unos
  60 caracteres»: el H1 ES tiene unos 82 y el lead unos 170. El prototipo se hace con ese texto, y si no cabe a
  360×740 se acorta el lead en 03, no se reduce la escala.
- **Motion.** Ninguno, salvo el press del botón.
- **Fijo.** Un solo H1, sin rotación, sin texto que se escribe (P1).

### 5.3 Dolor (DU-43)

- Banda `--slg-surface-sunken`. H2 y tres dolores en `<ul>`. Cada dolor lleva un H3 en lenguaje del
  comprador y **una** línea de escena en `ink-2`.
- Escritorio: tres columnas con un filete superior de 1 px (`--slg-hairline`). Móvil: apilado con el mismo
  filete. **Sin números**, que se reservan para el método, y sin iconos ni tarjetas.
- Motion: un reveal para el bloque, sin escalonado.

### 5.4 Independencia: las cuatro reglas y la postura sobre la prueba (DU-44)

- `--slg-surface-inverse` (`blue-deep`), radio 24 px, la única franja oscura de la página. Texto blanco
  (11,9:1). El acento es un filete izquierdo de 2 px en `cyan` en cada regla (máximo 3 colores: `blue-deep`,
  blanco y `cyan`).
- Arriba, la frase «sin licencias ni comisiones» como lead. Debajo, las cuatro reglas en `<ul>` de 2×2
  (escritorio) o 1 columna (móvil), cada una con título 600 y una frase. Al pie, la postura sobre la prueba en
  `--slg-type-small` con enlace a `/nosotros` en `cyan` (5,0:1 sobre `blue-deep`).
- **Una fuente única** en `content/`, compartida con `/nosotros` (P3).
- **Sin CTA dentro** de la franja: el rojo no se pone sobre fondo oscuro. **Sin logo dentro** (regla 4 del kit).
- Motion: un reveal.

### 5.5 Método (DU-45)

- **Un solo componente** (`Metodo`), alimentado desde `content/`, usado en `/`, `/ai` y los servicios
  (P4). El orden del DOM es igual al de lectura, sin la propiedad `order` de CSS.
- **Semántica.** `<ol>` con 4 `<li>`. Numeral `--slg-type-numeral` en `blue-deep` con `aria-hidden="true"`
  (el `<ol>` ya da el orden, y así no se lee «cero uno»). Dentro de cada fase: nombre en H3, una frase,
  «Entregable: …» (o nada, si la fase tiene `entregable: null`, 03 FU-RC04) y «Compuerta: Avanzar · Ajustar ·
  Descartar» como texto, sin pastillas. *Corregido tras crítica (C-08):* la redacción es la de 03 §5.2, que leen
  todos los usos desde el registro `metodo`; el texto final lo fija FU-RC02.
- **Disposición.** En escritorio, cuatro columnas con un filete continuo de 1 px a la altura de los numerales
  (un único `border-top` del `<ol>`, que funciona como conector estático). En móvil, una lista vertical con un
  filete izquierdo que une los numerales. Debajo del nombre de cada fase, la línea de oferta que le
  corresponde (`small`, enlace), y así el método ordena la oferta.
- **Motion.** Reveal del `<ol>` como bloque. Sin escalonado salvo DD-7 (C-12).
- **Antes/después (préstamo de E-AIA-17, en forma estática).** *Corregido tras crítica (C-11):* es una sección
  propia, **antes** del método (bloque 3 de 03 §2.1), con las tres filas de 03 («Decides con la información de
  quien vende → Decides con criterio propio…»). Las columnas «de quién es la información / quién se queda con la
  capacidad» son de la comparativa de Nosotros (03 §7.4), no de esta tabla. Forma: una `<table>` semántica de
  tres filas. La columna «después» va en `ink` con un filete de 2 px en
  `blue-primary`. Sin ✓/✗, sin rojo ni verde. En móvil se usa el patrón de ficha por fila que ya existe
  (`[data-slg-tabla]`, `motion.css:194-221`).

### 5.6 Puerta de entrada (DU-46)

- Superficie `paper-2` con radio 24 px y padding `--slg-space-7`. A la izquierda, el numeral «11» en
  `--slg-type-numeral` con «dimensiones» en `small` (la cifra hace de imagen, guía §4.3). A la derecha, el
  nombre público, el alcance, «Qué recibes» con el patrón de filete izquierdo que ya existe (`piezas.tsx`,
  `itemIncluye`) y el **botón rojo** con el mismo texto y el mismo destino que el del hero. Debajo del botón,
  el microcopy «solo un correo corporativo» en `small`.
- El eyebrow, si lo hay, va en `ink-2`, porque está sobre `paper-2`.
- **Un CTA por página:** si se repite, es **la misma acción**. Nunca son dos acciones distintas.

### 5.7 «Cuándo no conviene comprar IA (todavía)» (DU-43)

- Sobre `paper`, H2 y 3–4 criterios en `<ul>` con filete superior. La voz es la de SLG. Sin color de aviso,
  sin icono, sin cursiva.
- Comparte el componente de lista tipográfica con la sección de dolor (`ListaTipografica`), así que hay una
  sola pieza y una sola forma.

### 5.8 Líneas de oferta (DU-47)

*Corregido tras crítica (C-10).* **Estas tarjetas no van en la portada.** En 03 la portada lleva las líneas como
enlace bajo cada fase del método y Holdings como una línea de texto (bloques 4 y 10); repetirlas en tarjetas
duplica la oferta y gasta un viewport. El componente se usa en `/servicios` («Todos los servicios», DU-RC02) y,
si hace falta, en los overviews. El eyebrow de fase sigue 03 §2.3: **Enterprise cubre las fases 02 y 03**
(«Fases 02–03»), no una sola.

- Tres tarjetas (Academy, Enterprise, Factory) y Holdings como enlace de texto aparte, según 03 y D-2.
- Tarjeta: `--slg-radius-md` 16 px, `--slg-hairline`, `elev-0` en reposo y `elev-2` en hover con puntero fino.
  Dentro, eyebrow «Fase 0N · nombre», nombre en H3, «Para [rol]» en `ink-2`, una frase y «N servicios» en
  `small`. Toda la tarjeta es el objetivo, mediante el `::after` del enlace (`apple.css:150-157`).
- Motion: la elevación de §4.1 y el press. **Sin `will-change` en reposo.**

### 5.9 CTA final (DU-46)

- Sobre `paper`: un H2, una línea y el botón rojo, que es la misma acción. Formulario de descarga con un
  único campo (correo corporativo). Etiqueta visible, error en línea al salir del campo, `aria-live`,
  `autocomplete="email"`, `inputmode="email"`.
- Estados: reposo → enviando (el botón se desactiva y cambia el texto, sin spinner girando) → enviado
  (fundido de 200 ms al mensaje) → error (texto `ink` con filete rojo).

### 5.10 Mapa «Empieza aquí» y pie

- *Corregido tras crítica (C-07).* El mapa **sale de la portada** a su ruta, `/empieza-aqui` y `/en/start-here`
  (03 §2.2), **sin cambios de forma** (CSS puro, sin JS, sin animación, E-SLG-43). Se enlaza desde el menú y el pie.
- El pie añade la razón social y la jurisdicción en texto (síntesis, M-PRY-09 adaptado). Sin motion.

### 5.11 Quién responde, Doctrina y Holdings (añadido tras crítica, C-11)

- **Quién responde** (bloque 8 de 03). Sobre `paper`, H2, dos o tres líneas de trayectoria y enlace de texto a
  Nosotros y LinkedIn. **Sin foto** mientras D-7 y P-04 no estén resueltos; si llega, es una foto propia, en
  escala de grises o color natural, sin recorte circular decorativo, con `alt` descriptivo y dimensiones fijas
  (CLS). Si P-03 no llega, el bloque se omite entero, no se rellena.
- **Doctrina** (bloque 9). Banda clara (`paper`), **no** oscura: la única franja oscura es la de §5.4 (DD-6). La
  cita va como `<blockquote>` en `--slg-type-h2`, sin comillas gigantes decorativas.
- **Holdings** (bloque 10). Una sola línea de texto con enlace, sin tarjeta ni superficie propia.
- Motion: un reveal por sección, como el resto.

---

## 6. Barreras de accesibilidad y Lighthouse

**Estado real (OBS).** El freno exige `accessibility ≥ 95` (`check-lighthouse.ts:62-65`, E-SLG-57). Que hoy
se obtenga 100 es **UNK**, porque no hay ninguna medición renderizada en el expediente (E-SLG-80). El encargo
pide que el 100 actual se mantenga. Este plan lo trata así: **FU-20 mide la línea base**. Si no es 100, se
corrige antes de la primera DU visual. *Corregido tras crítica (C-04):* **el 100 en las páginas tocadas es
criterio de aceptación de cada DU visual, no una opción.** D-8 decide solo si además se sube
`LH_MIN_ACCESSIBILITY` a 100 en el freno de CI.

| # | Barrera | Cómo se verifica |
|---|---|---|
| A1 | Lighthouse móvil **a11y = 100** (objetivo) y ≥ 95 (freno) en `/`, `/en`, `/servicios`, `/ai` y una página de servicio; **performance ≥ 90**, best-practices ≥ 90, SEO ≥ 90 | `check:lighthouse` con `LH_PAGINAS` |
| A2 | Contraste AA de cada par nuevo: blanco y cian sobre `blue-deep`, `ink-2` sobre `paper-2`, eyebrow `blue-primary` **solo** sobre `paper` | `check:contraste` con los pares añadidos |
| A3 | Un H1 por página. Los H2 en orden, sin saltos de nivel. El `<ol>` del método y los numerales `aria-hidden` | Revisión + axe |
| A4 | Teclado completo y foco visible de dos capas (D-44), nunca animado. El foco no queda tapado por la barra (`scroll-padding-top`) | Prueba manual con Tab en 360 px y 1280 px |
| A5 | Sheet: foco al abrir, foco atrapado, `inert` en el fondo, Escape, foco devuelto al cerrar | Test automatizado (DU-40) |
| A6 | Objetivos táctiles ≥ 24×24 px (WCAG 2.5.8), 44×44 px en barra, sheet y CTA | Revisión |
| A7 | Reflujo a 320 px y zoom al 400 %: sin desplazamiento horizontal de la página | Revisión |
| A8 | Tres preferencias del sistema en cada componente nuevo | Revisión con emulación de DevTools |
| A9 | Ningún contenido detrás de una interacción ni movimiento automático (WCAG 2.2.2 se cumple por diseño) | `check:motion` + revisión |
| A10 | Formulario: etiqueta asociada, error en línea con `aria-describedby`, `aria-live`, sin CAPTCHA | Test + revisión |
| A11 | `lang` correcto y paridad ES/EN de cada sección nueva | `check:pairs`, `check:seo` |
| A12 | CLS < 0,1 · LCP < 2,5 s · JS inicial < 150 KB gzip · cero terceros | Lighthouse, `check:js-budget`, `check:terceros` |
| A13 | *(Añadido tras crítica, C-05.)* Las páginas tocadas siguen prerenderizadas (`x-nextjs-prerender: 1`, E-SLG-21). El escuchador delegado del press es una isla de cliente mínima dentro de `ArmazonPublico`, que sigue siendo de servidor | Cabecera de respuesta en `check:runtime`/`check:paginas` + revisión |

---

## 7. Decisiones de diseño que pide este plan (para Ricardo)

Se suman a D-1…D-8 de la síntesis. D-1 (portada), D-2 (marca), D-7 (fotografía) y D-8 (objetivo 100)
**bloquean** unidades de §8.

| ID | Decisión | Recomendación (INF) | Bloquea |
|---|---|---|---|
| DD-1 | Escala del hero: la guía dice 4.5rem, `apple.css` 4.25rem, la propuesta 4rem | **4rem**: con 4.5rem y el H1 real de 03 (unos 82 caracteres en ES, C-13) el CTA cae bajo el pliegue en 1280×800. Se confirma en el prototipo de DU-42 con el texto real | FU-21 |
| DD-2 | Color y peso del H2: la guía dice 600 `blue-primary`, el código 700 `blue-deep` | **700 `blue-deep`**: funciona sobre `paper-2` sin la restricción de ≥ 24 px, y la jerarquía va por peso | FU-21 |
| DD-3 | Rebote tras un gesto con momentum (RNF-09 lo permite) | **No usarlo** en la capa pública | DU-40 |
| DD-4 | Radio de las tarjetas: 16 px (guía) o 24 px (`apple.css`) | **16 px**: 24 px en tarjetas de 18 rem se lee blando y compite con la franja y la puerta de entrada | FU-21 |
| DD-5 | Scroll edge ligado al scroll en la barra | Prototipo primero. Si no pasa el freno, se descarta | DU-41 |
| DD-6 | La franja oscura para las reglas (P3), frente a una banda clara | **Franja oscura**: es el ancla de confianza de la página y hoy la franja «doctrina» no tiene un papel claro | DU-44 |
| DD-7 | *(Añadida tras crítica, C-12.)* Escalonado de 60 ms en las fases del método | **No, por defecto.** Solo si el prototipo muestra que ayuda a leer el orden; 03 §5.4 pide «sin animación por fase» | DU-45 |

---

## 8. Unidades de trabajo (FU/DU)

**Convenciones.** Formato de `implementation/user_units.md`. **Numeración provisional** en un rango
reservado para este plan (FU-20…FU-23, DU-40…DU-47), para no chocar con el plan de contenido. La numeración
definitiva se asigna al consolidar ambos en `user_units.md`. Las seis condiciones de DU completa (§0.1 de
`user_units.md`) se dan por exigidas. Aquí, «backend» se reduce a contenido en `content/` y a la ficha.
**Toda DU visual** exige además estas tres cosas:

- **(a)** el pase de la skill `review-animations` con veredicto **Approve**;
- **(b)** las ocho preguntas de la lente C.6 respondidas en `work_log`;
- **(c)** capturas a 360, 768 y 1280 px en las tres preferencias del sistema.

Todo parte de `origin/develop`.

**Corregido tras crítica.** (C-01) `develop` es producción (E-SLG-71) y allí `check:pending` solo avisa: ningún
texto con `[PENDIENTE]` se mergea a `develop`; vive en la rama de trabajo y su vista previa, y el merge exige
`CONTENT_STRICT=1 npm run check:pending`. (C-14) Correspondencia con 03: FU-RC01 (rama e inventario) va antes de
FU-20 (medición); **DU-47 y DU-RC01 son la misma unidad de montaje** y se cierran con los criterios de las dos;
DU-42…46 producen los componentes que DU-RC01 consume.

**Orden.** FU-20 → FU-21 → FU-22 → FU-23 → DU-40, DU-41 (en paralelo) → prototipo (`/prototype`) de hero
y método → DU-42 … DU-47.

---

#### FU-20 · Línea base medida del sitio publicado

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Depende de** | — |
| **Cierra** | UNK E-SLG-80, 81; precondición de D-8 |

**Qué produce.** Una medición, sin cambios de código, de `origin/develop` desplegado. Incluye Lighthouse
móvil y escritorio en las 5 páginas de A1, capturas a 360/768/1280 px, la grabación del sheet a 60 fps y la
traza de rendimiento de la portada.

**Criterios de aceptación.**
1. Las cuatro puntuaciones de Lighthouse quedan registradas por página y por perfil, con la fecha y el commit.
2. Hay capturas a 360, 768 y 1280 px de cada página, también con `prefers-reduced-motion` y `prefers-contrast: more` emulados.
3. Hay una grabación del sheet (abrir, arrastrar, lanzar, soltar a medias), revisada cuadro a cuadro según `test-gesto.ts`.
4. LCP, CLS, TBT y el JS inicial de la portada quedan anotados.
5. Queda escrito si la accesibilidad es 100 hoy. Si no lo es, se listan las auditorías que fallan.

**Gates.** D3 (revisión de motion, solo lectura).

---

#### FU-21 · Tokens v2: tipografía, espaciado, superficies, radios y motion

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Depende de** | FU-20 · DD-1, DD-2, DD-4 |
| **Cierra** | B-13; defectos 8 y deriva de §1.2 |

**Qué produce.** Los tokens de §3 en `tokens.css` y `motion.css`. `apple.css` deja de definir valores y
consume tokens: se van `--slg-elev-*` literales, el material al 68 % y el radio forzado. Los alias
`--slg-spring`, `--slg-spring-duration` y `--slg-shadow-*` se mantienen. `style_guide.md` §4.2, §5 y §6 se
actualizan para que guía, tokens y código digan lo mismo. Las decisiones quedan registradas en `decision_log`.

**Criterios de aceptación.**
1. Cada fila «Después» de §3 existe como variable CSS y ningún componente de la portada usa un literal en su lugar.
2. Ningún color literal fuera de `tokens.css` en los archivos tocados: el telón y las sombras pasan a tokens.
3. La escala del hero es idéntica en la guía, en `tokens.css` y en lo que se ve (comprobado contra una captura).
4. En las páginas fuera del alcance, un diff de capturas frente a FU-20 muestra solo los cambios declarados (radio, material, tipografía). Cada diferencia queda listada.
5. Se añaden la precarga del corte 700 y el respaldo métrico de la fuente, con valores medidos. CLS de la portada ≤ el de FU-20.
6. `check:contraste`, `check:motion` y `check:ci` en verde.

**Gates.** QG · D2 · D2b.

---

#### FU-22 · Frenos endurecidos

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Depende de** | FU-21 |
| **Cierra** | Defectos 1 y 2 (que el freno los atrape) |

**Qué produce.** Cuatro cambios en los frenos:

- `check:motion` lee las declaraciones `transition` que ocupan varias líneas;
- `check:motion` rechaza `will-change` fuera de una lista de selectores permitidos (panel del sheet);
- `check:motion` rechaza un `:hover` con `transform` fuera de `@media (hover: hover) and (pointer: fine)`;
- `check:contraste` incluye los pares nuevos de A2.

Lleva casos negativos en `scripts/ci/negative/`. Si D-8 lo aprueba, `LH_MIN_ACCESSIBILITY = 100` para
`LH_PAGINAS`.

**Criterios de aceptación.**
1. Un caso negativo con `transition:\n color 140ms` hace fallar `check:motion`. Con el código actual, el freno señala `apple.css:118-120`.
2. Un caso negativo con `will-change: transform` en `.slg-card` falla.
3. Un caso negativo con `:hover { transform }` sin la condición de puntero falla.
4. `verify-brakes.ts` registra los tres frenos nuevos.
5. Tras FU-23, `check:ci` vuelve a verde **sin excepciones nuevas**.

**Gates.** QG.

---

#### FU-23 · Primitivas de interacción: press único, hover con condición, sin animaciones de teclado

| Campo | Contenido |
|---|---|
| **Tipo** | FU |
| **Depende de** | FU-21, FU-22 |
| **Cierra** | Defectos 1, 2, 3, 5 y 6 |

**Qué produce.** Cinco cambios:

- el escuchador delegado de §4.3;
- la retirada de la regla `:active` de `apple.css`;
- el hover de tarjeta con condición de puntero, con la sombra en un `::before` que se funde y sin
  `will-change` en reposo;
- el color de los enlaces de la barra sin transición;
- «saltar al contenido» sin animación.

**Criterios de aceptación.**
1. En un iPhone real (o en el emulador de iOS), el press del CTA se ve en el primer fotograma tras el toque: 100 ms al bajar y 160 ms al soltar.
2. Ningún selector `:active` aplica `transform` en la capa pública.
3. En táctil, una tarjeta no queda levantada tras el toque. Con ratón, se eleva 2 px en 200 ms y la sombra se funde sin saltar.
4. `will-change` solo aparece en el panel del sheet.
5. El anillo de foco y «saltar al contenido» aparecen sin transición.
6. El escuchador añade < 1 KB gzip al JS inicial.

**Gates.** QG · D3.

---

#### DU-40 · Sheet móvil v2: simetría, foco y moderación

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-23 · DD-3 |
| **Cierra** | Defecto 4; RNF-45 se conserva |

**Qué produce.** El sheet de §4.2.

**Criterios de aceptación.**
1. Abre desde abajo en 300 ms (`--slg-ease-drawer`) y cierra hacia abajo en 240 ms por Escape, por el telón y por un enlace. El telón funde 200 ms en las dos direcciones.
2. Agarrar el panel durante la apertura o el cierre continúa desde la posición presentada, sin salto (revisión cuadro a cuadro).
3. Las cuatro cláusulas de RNF-45 siguen pasando `test-gesto.ts`. Se añade la histéresis de 8 px y un caso de toque con 5 px de desplazamiento que no arrastra.
4. No hay rebote en ningún camino.
5. Foco: al abrir pasa al primer enlace, queda atrapado, el fondo es `inert` y al cerrar vuelve a «Menú». Hay test automatizado.
6. Con movimiento reducido, apertura y cierre son fundidos de 200 ms sin desplazamiento. Con transparencia reducida, el telón es más opaco.
7. Cero `@keyframes`. `will-change` solo durante el movimiento.

**Gates.** D2 · D3 · QG.

---

#### DU-41 · Barra de navegación v2

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-23 · DD-5 |
| **Cierra** | Defectos 1 y 7 |

**Qué produce.** La barra de §5.1.

**Criterios de aceptación.**
1. Pesos reales: 400 inactivo, 600 activo. Ningún `fontWeight: 500` en la capa pública.
2. Material y separación salen de tokens. Sin `border-bottom` literal en el componente.
3. `scroll-padding-top` hace que un ancla y el elemento enfocado queden visibles bajo la barra a 360 px y a 1280 px.
4. El botón «Menú» mide ≥ 44×44 px y lleva `aria-expanded` y `aria-haspopup`.
5. Si se implementa DD-5: solo `opacity`, dentro de `@supports`, y `check:motion` pasa sin excepción. Si no pasa, no se implementa.

**Gates.** D2 · D2b · D3.

---

#### DU-42 · Hero de la portada

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-21, FU-23 · **D-1**, D-7, DD-1 · texto de 03 · prototipo aprobado |
| **Cierra** | B-01, B-02 (forma) · P1, P6 |

**Qué produce.** El hero de §5.2 en `/` y `/en`, con el texto desde `content/`. Antes, un prototipo de 3
variantes con `/prototype` en la ruta `(prototipo)`, que diverge en densidad, posición del eyebrow y presencia
del enlace secundario. Ricardo elige una.

**Criterios de aceptación.**
1. Un solo H1, fijo, que no rota ni se escribe. Eyebrow, H1, lead y **un** botón.
2. A 360×740 y a 1280×800, la primera pantalla contiene para quién, problema, resultado y CTA sin desplazar.
3. El hero no tiene ninguna animación de entrada. El LCP es el H1 y queda < 2,5 s en el perfil móvil.
4. Sin fotografía ni imagen de fondo, salvo que D-7 diga lo contrario.
5. Rojo: una instancia en el viewport del hero.
6. Revisión: un lector que no conoce SLG repite las tres piezas tras 5 segundos (prueba de P1).

**Gates.** D2 · D2b · D3 · RNF-44.

---

#### DU-43 · Lista tipográfica: dolor y «cuándo no comprar»

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-21 · texto de 03 |
| **Cierra** | B-04, B-11 (forma) · P2, P5 |

**Qué produce.** El componente `ListaTipografica`, usado en las dos secciones de §5.3 y §5.7.

**Criterios de aceptación.**
1. Un solo componente con dos usos. Semántica `<ul>` con H3 por elemento.
2. Sin iconos, números, tarjetas ni cursivas. La escena va en `ink-2`.
3. Sobre `paper-2`, ningún texto en `blue-primary` por debajo de 24 px.
4. Un reveal por sección, sin escalonado.
5. Hay paridad ES/EN, y si el contenido falta, la sección no se pinta, con el patrón de `Portada.tsx`.

**Gates.** D2 · D2b.

---

#### DU-44 · Franja de independencia

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-21 · DD-6 · texto de 03 (una fuente compartida con `/nosotros`) |
| **Cierra** | B-03, B-08 (forma) · P3 |

**Qué produce.** La franja de §5.4.

**Criterios de aceptación.**
1. Las cuatro reglas, «sin licencias ni comisiones» y la postura salen de **una** fuente en `content/`, que también usa `/nosotros`. Un test comprueba que el texto es idéntico.
2. Contraste: blanco 11,9:1 y enlace cian 5,0:1 sobre `blue-deep`, medidos por `check:contraste`.
3. Sin CTA rojo ni logo dentro. Como máximo 3 colores de marca.
4. Con `prefers-contrast: more`, el filete pasa a blanco.

**Gates.** D2 · D2b.

---

#### DU-45 · Componente Método + antes/después estático

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-21 · D-3 (nombre) · texto de 03 · prototipo aprobado |
| **Cierra** | B-06, B-10 (forma) · P4, P7 |

**Qué produce.** `Metodo` y la tabla antes/después de §5.5, usados en `/`, `/ai` y las páginas de
servicio. Antes, un prototipo con `/prototype` de la disposición en escritorio (horizontal frente a 2×2) y
del dibujo del conector.

**Criterios de aceptación.**
1. Una sola fuente en `content/` y tres usos. El orden del DOM es igual al de lectura, sin `order` de CSS.
2. `<ol>` con 4 fases. Numerales con `aria-hidden`. Cada fase declara entregable (o `entregable: null`) y compuerta («Avanzar · Ajustar · Descartar», texto del registro `metodo`; C-08).
3. El conector es un filete estático, sin SVG animado ni dibujo al hacer scroll.
4. Reveal del `<ol>` como bloque. Escalonado de 60 ms solo si DD-7 lo aprueba, y desactivado con movimiento reducido (C-12).
5. La tabla es una `<table>` con `<th scope>`, se lee como ficha por fila a ≤ 48 rem y no usa ✓/✗ ni rojo.
6. La regla de la compuerta tiene una sola redacción en todo el sitio (búsqueda en `content/`).

**Gates.** D2 · D2b · D3.

---

#### DU-46 · Puerta de entrada + CTA final

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | FU-23 · D-2 (nombre público), D-4 (duración, si se publica) · texto de 03 |
| **Cierra** | B-07 (forma) · P6 |

**Qué produce.** §5.6 y §5.9, con el formulario de descarga que ya existe.

**Criterios de aceptación.**
1. Una sola acción primaria en toda la página. Si se repite, tiene el mismo texto y el mismo destino.
2. Como mucho 2 instancias de rojo por viewport, contando el error del formulario.
3. El «11» es tipografía estática (`--slg-type-numeral`) y no cuenta.
4. El formulario lleva etiqueta visible, validación al salir del campo, `aria-live`, `autocomplete="email"` y estados reposo/enviando/enviado/error resueltos. Hay test del camino de envío.
5. El botón usa el press único y mide ≥ 44 px de alto. Cero calendarios, cero «Sesión Cero» (`check:copy`).

**Gates.** D2 · D2b · QG.

---

#### DU-47 · Tarjetas de línea y montaje de la portada

| Campo | Contenido |
|---|---|
| **Tipo** | DU |
| **Depende de** | DU-40 … DU-46 · D-1, D-2 |
| **Cierra** | Montaje de P1–P8 en `/` y `/en` |

**Qué produce.** *Corregido tras crítica (C-07, C-10, C-14):* el montaje de la portada completa en ES y EN, con
el orden final de 03 §2.1 y los bloques de §5.11, y el pie con razón social. Es **la misma unidad que DU-RC01**.
Las tarjetas de §5.8 se montan en `/servicios` (DU-RC02), no aquí, y el mapa vive en `/empieza-aqui`.

**Criterios de aceptación.**
1. A1–A13 de §6 se cumplen en `/` y `/en`, con **accesibilidad 100** (C-04).
2. Hay una franja oscura y ningún escalonado salvo DD-7. Ningún carrusel, tab, flip, contador, vídeo ni muro de logos (revisión y búsqueda en el código).
3. Las tarjetas no tienen `will-change` en reposo, y el hover lleva condición de puntero.
4. El JS inicial de `/` es ≤ el de FU-20 + 1 KB.
5. El diff de capturas frente a FU-20 queda archivado como antes/después del proyecto.
6. `review-animations` sobre el diff completo da **Approve**.

**Gates.** D1 · D2 · D2b · D3 · DoD de la capa pública.

---

## 9. Lo que este plan no hace

- **No reescribe las 79 páginas** que motivan el `!important` de `apple.css`. Unifica los valores, y la
  limpieza de los estilos en línea queda como trabajo aparte (propuesta para después de DU-47).
- **No decide ningún texto.** Las frases de ejemplo de la síntesis son de registro, no de copy.
- **No añade dependencias** ni ningún tercero.
- **No toca HQ ni el portal.** El rojo de alerta y la tabla de app quedan como están.
