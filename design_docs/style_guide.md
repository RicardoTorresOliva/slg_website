---
type: style_guide
title: style_guide
project: slg_website
description: Sistema de diseño consultable de slg_website — tokens con contraste medido, reglas heredadas del Kit de Marca SLG Rojo v1, tipografía Montserrat, materiales y profundidad, contrato de motion resumido y la lente de revisión de los ocho principios aplicada por DU de interfaz.
tags: [slg, slg_website, design-doc, style-guide, tokens, marca, tipografia, motion, accesibilidad, okf, software-app]
status: design
level: LIGHT
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md v1.1 — Anexo C (C.1–C.6), Anexo D (gates D1, D2, D2b, D3), §0 Diseño, §1 Constraints, Anexo I-5"
  - "~/Dev/SLG_Overhauling/assets/Kit_Marca_SLG_Rojo.md v1 (2026-05-26) — §2 paleta, §3 tipografía, §4 logo, §5 prohibiciones, §6 aplicaciones"
  - "planning/requirements.md — RNF-04 a RNF-15, RNF-43 a RNF-46"
  - "planning/risks.md — R-35 (activos de marca ausentes)"
  - "implementation/user_units.md — FU-02 (tokens), FU-10 (sistema de componentes C.5), FU-12 (shell de app)"
  - "docs/decision_log.md — D-14 (perfil software-app)"
  - "profiles/software-app/profile.md — design_docs (style_guide: LIGHT)"
---

# Guía de estilo — slg_website

Documento de diseño del paso 6 de `init-project`, nivel **LIGHT** declarado por el perfil
`software-app`. **No reinventa nada**: destila el Anexo C del brief y el Kit de Marca SLG Rojo v1 en
algo que se pueda consultar mientras se produce, sin volver a abrir el brief entero.

Donde este documento y el Anexo C digan lo mismo, manda el Anexo C. Donde este documento añada un
número que el Anexo C no trae, va **etiquetado como medido o como propuesta**, nunca como si fuera
del brief.

---

## 0. Cómo se lee este documento

### 0.1 Qué decide y qué no

| Decide aquí | Vive en otro documento |
|---|---|
| Tokens, contraste, prohibiciones de color | Qué pantallas existen y cómo se navegan → `ui_wireframes` |
| Tipografía, jerarquía, carga de la fuente | Entidades y campos → `data_model` |
| Materiales, profundidad, superficies | Endpoints, alcances y códigos → `api_contracts` |
| Resumen consultable del contrato de motion | Contrato completo de motion → `planning/requirements.md`, RNF-45 y RNF-46 |
| La lente de revisión aplicada por DU de interfaz | Criterios de aceptación por unidad → `implementation/user_units.md` |

### 0.2 Notación

- `§N` = sección del brief · `§10-N` = decisión HITL de Ricardo · `A.N` / `B.N` / `C.N` / `F.N` =
  anexos del brief · `D1`…`D12` y `D2b` = gates del Anexo D · `DoD #N` = pruebas del §4 ·
  `D-14`…`D-24` = `docs/decision_log.md`.
- `[PENDIENTE: …]` = hueco real, no adorno. Ninguno puede llegar a `main` (RNF-18, gate D5).
- **medido** = contraste calculado sobre los hexadecimales del kit con la fórmula WCAG 2.x. Cuando el
  Anexo C ya trae el número, coincide; cuando no lo trae, se marca así.

### 0.3 A quién obliga

A **FU-02** (tokens como variables CSS), **FU-10** (los nueve componentes de C.5 con prototipo
aprobado), **FU-12** (shell de HQ y portal) y a **las 19 DU que producen pantalla propia**:
DU-01…DU-08, DU-10, DU-11, DU-13…DU-21. Las demás unidades no tienen superficie visual propia.

---

## 1. Concepto — *autoridad silenciosa*

El producto es pensamiento. Titulares tipográficos grandes, **una idea por viewport**, blanco
generoso, motion físico y contenido. **Light-first**: el kit prohíbe el logo sobre fondo oscuro, así
que el sitio se diseña sobre claro y las secciones oscuras son la excepción acotada del §7 de este
documento.

Cero stock, cero clichés visuales de IA, cero confeti (RNF-44). La referencia de sensación es la
claridad de una keynote, no una landing de agencia.

Consecuencia práctica, no eslogan: **si un elemento no ayuda a entender la idea de ese viewport, no
entra**. La jerarquía se consigue con tipografía y espacio, no con adornos.

---

## 2. Tokens de color (C.1) con contraste medido

Todos son **variables CSS** (RNF-15): el modo oscuro de v1.1 no debe exigir rehacer componentes.
Cero valores hexadecimales literales fuera del archivo de tokens (criterio 2 de FU-02).

| Token | Valor | Uso en la web | Contraste |
|---|---|---|---|
| `--blue-primary` | `#2878B4` | Color de marca: H2, botón secundario (texto blanco), líneas estructurales, eyebrows, bordes de bloque | **4,7:1** sobre `--paper` (AA texto) · **4,4:1** sobre `--paper-2` → ahí **solo a ≥ 24 px** |
| `--blue-deep` | `#24394D` | Hero y H1, texto de enlace, títulos de bloque, superficies de HQ y portal, cifras grandes | **6,5:1** sobre `--paper` · **6,0:1** sobre `--paper-2` · blanco encima: **6,5:1** *(medido)* |
| `--cyan` | `#50B4DC` | Highlights, marcador de palabras clave, iconos, subrayados | **2,4:1** sobre `--paper` → **nunca texto sobre claro** · `--ink` encima: **8,3:1** · sobre `--indigo`: **5,3:1** · sobre `--blue-deep`: **2,8:1** *(medido)* → **tampoco ahí** |
| `--blue-tint` | `#78B4DC` | Fondos de tabla y áreas de respiración, al 20–40 % de opacidad | **Solo fondo** (2,2:1 sobre `--paper`, *medido*) · `--ink` encima: **8,8:1** |
| `--indigo` | `#282878` | H3, elementos secundarios de marca, `SLG_Academy`, datos destacados en tablas | **12,6:1** sobre `--paper` · **11,7:1** sobre `--paper-2` *(medido)* · blanco encima: **12,6:1** *(medido)* |
| `--red` | `#DC141E` | **Detención visual**: botón del CTA de descarga (texto blanco) y alertas críticas en HQ | **5,0:1** sobre `--paper` · blanco sobre rojo: **5,0:1** |
| `--ink` | `#0A0A14` | Texto de cuerpo | **19,7:1** sobre `--paper` · **18,2:1** sobre `--paper-2` *(medido)* |
| `--ink-2` | `#5A6470` | Texto secundario, captions, pie | **6,0:1** sobre `--paper` · **5,6:1** sobre `--paper-2` *(medido)* |
| `--line` | `#C8CCD3` | Divisores sutiles, bordes de tarjeta | **1,6:1** *(medido)* → **solo líneas decorativas**, nunca un borde que deba percibirse |
| `--paper` | `#FFFFFF` | Fondo principal | — |
| `--paper-2` | `#F4F6F9` | Fondos suaves y alternancia de secciones | — |

**11 tokens de color**: 6 de marca (`blue-primary`, `blue-deep`, `cyan`, `blue-tint`, `indigo`,
`red`) + 5 neutros (`ink`, `ink-2`, `line`, `paper`, `paper-2`).

### 2.1 Tokens de geometría y material

| Token | Valor | Uso |
|---|---|---|
| Radio | `12px` · `16px` · `24px` | Controles / tarjetas / superficies grandes |
| Sombra | Sombras suaves multicapa | Elevación de tarjeta, modal y sheet |
| Difuminado | `blur(20px) saturate(180%)` | Barra de navegación translúcida (§5) |

### 2.2 Prohibiciones duras de color (gate D2 · RNF-04)

Estas tres no admiten excepción y se verifican en cada DU de interfaz:

1. **`--cyan` `#50B4DC` NUNCA como color de texto sobre claro.** 2,4:1 — falla AA por casi el doble.
   Sobre claro es fondo de marcador (con `--ink` encima, 8,3:1), icono, subrayado o highlight; jamás
   la letra.
2. **`--blue-tint` `#78B4DC` solo fondo.** 2,2:1 sobre `--paper` (*medido*). Nunca texto, nunca
   borde que deba percibirse.
3. **`--blue-primary` `#2878B4` sobre `--paper-2` solo a ≥ 24 px.** 4,4:1 no llega a AA de texto
   normal (4,5:1) pero sí al umbral de texto grande (3:1). Sobre `--paper` (4,7:1) no hay límite de
   tamaño.

### 2.3 Dos consecuencias medidas que el Anexo C no explicita

Ambas se derivan de los mismos hexadecimales del kit, no de una preferencia:

- **`--cyan` sobre `--blue-deep` es 2,8:1** *(medido)*. El §7 admite el cyan como acento en secciones
  oscuras; en `--blue-deep` ese acento **no puede llevar texto ni ser un borde que deba percibirse**
  (no alcanza ni 3:1). Sobre `--indigo` sí (5,3:1). Traducción operativa: **si la sección oscura
  necesita cyan legible, la sección es `--indigo`, no `--blue-deep`**.
- **`--line` `#C8CCD3` es 1,6:1** *(medido)*. Sirve para dividir, no para delimitar un control. El
  borde de un campo de formulario, el anillo de foco y cualquier límite que el usuario deba percibir
  se construyen con `--blue-primary`, `--ink-2` o `--ink`.

> **Token del anillo de foco — resuelto por D-44 (`docs/decision_log.md`); cierra CF-3 de
> `design_docs/design_summary.md` §2.** El anillo de foco es de **dos capas**: capa **exterior**
> `--cyan` `#50B4DC` y capa **interior** `--blue-primary` `#2878B4` o `--ink`. El Anexo C.1 lista
> `--cyan` entre los usos de «anillos de foco», pero medido da **2,4:1 sobre `--paper`**: solo, no
> cumple RNF-05 ni el gate D2. La capa exterior conserva esa intención cromática del kit; la capa
> interior es la que aporta el contraste que faltaba (`--blue-primary` 4,7:1 sobre `--paper`; `--ink`
> por encima). Las dos capas son, por tanto, una **precisión** del Anexo C, no una contradicción.
> **`--cyan` nunca se usa como anillo de foco de una sola capa.** El token se fija en **FU-02** y se
> verifica en **FU-10**.

---

## 3. Reglas heredadas del Kit de Marca (gate D2b · RNF-13)

Del Kit de Marca SLG Rojo v1 (2026-05-26). Se verifican **por revisión**, viewport a viewport:

1. **Sin verde, amarillo ni naranja.** Ni como color de marca, ni de estado, ni de gráfico. Los
   estados de éxito y de aviso se resuelven con la paleta azul, `--ink-2` y `--red`.
2. **El rojo `#DC141E` nunca es decorativo ni de relleno.** Es detención visual: el botón del CTA de
   descarga y las alertas críticas de HQ. **Máximo 1–2 instancias por viewport.** Nunca como fondo de
   sección, nunca como color de una lista, nunca «porque destaca».
3. **Máximo 3 colores de marca por elemento gráfico.** Combinación preferida del kit:
   `--blue-primary` + `--blue-deep` + `--cyan` como acento; `--indigo` para lo secundario.
4. **El logo nunca sobre fondo oscuro ni deformado.** Solo sobre `--paper` o `--paper-2`, sin caja de
   fondo, sin alterar proporciones.
5. **Margen de respeto = 1 altura de la «S»** en los cuatro lados del logo.
6. **Nada de serif ni de tipografías decorativas para el nombre de marca.**

Regla de coherencia derivada de (4): **las secciones oscuras del §7 no llevan logo dentro**.

---

## 4. Tipografía (C.2 + kit §3)

### 4.1 Carga de la fuente (RNF-14 · gate D1)

- **Montserrat autoalojada en `woff2`**, pesos **400, 600 y 700**, `font-display: swap`,
  **subconjunto latino**. **Cero peticiones a servicios de fuentes de terceros** — se verifica en la
  pestaña de red, no por inspección del código.
- Fallbacks del kit, en este orden:
  `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.
- Es la excepción justificada a la regla «fuente de sistema»: la marca ya tiene familia.
- **Bebas Neue u Oswald** (kit): **solo** separadores de sección y eyebrows en mayúsculas. **Nunca**
  para cuerpo. **Nunca** para el nombre de marca.

### 4.2 Jerarquía

Espaciado y tamaños en `rem` para respetar el tamaño de texto del usuario. La jerarquía se consigue
por **peso + tamaño + interlineado como conjunto**, no por color solo.

| Nivel | Familia y peso | Tamaño | Interlineado | Tracking | Color |
|---|---|---|---|---|---|
| **Hero** | Montserrat 700 | `clamp(2.25rem, 5vw, 4.5rem)` | `1.05` | `-0.02em` | `--blue-deep` |
| **H1** (páginas no portada) | Montserrat 700 | `[PENDIENTE: fijar en FU-02]` — propuesta `clamp(1.875rem, 3.5vw, 2.75rem)` | propuesta `1.15` | `normal` (kit) | `--blue-deep` |
| **H2** | Montserrat 600 | `[PENDIENTE: fijar en FU-02]` — propuesta `clamp(1.5rem, 2.5vw, 2rem)` | propuesta `1.25` | `normal` (kit) | `--blue-primary` |
| **H3** | Montserrat 600 | `[PENDIENTE: fijar en FU-02]` — propuesta `1.25rem` | propuesta `1.35` | `normal` (kit) | `--indigo` |
| **Cuerpo** | Montserrat 400 | `1.0625rem` | `1.6` | `normal` | `--ink` |
| **Caption** | Montserrat 400 | `0.875rem` | propuesta `1.45` | `+0.04em` | `--ink-2` |
| **Eyebrow** | Montserrat 700, MAYÚSCULAS | `0.75rem` | propuesta `1.2` | `+0.08–0.10em` | `--blue-primary` |

**Qué es del brief y qué es propuesta.** Hero, cuerpo, caption y eyebrow vienen literales de C.2, con
su color y su tracking. Familia, peso y color de H1, H2 y H3 vienen de C.1 y C.2. **El brief no fija
tamaño ni interlineado web para H1, H2 y H3, ni interlineado para caption y eyebrow**: el kit los da
en puntos de documento impreso (H1 18 pt, H2 14 pt, H3 12 pt), que no se traducen a pantalla. Las
celdas marcadas «propuesta» son eso, una propuesta a aprobar en FU-02 y a registrar en
`decision_log`; hasta entonces son `[PENDIENTE]` y no pueden llegar a `main`.

### 4.3 Cifras grandes como elemento gráfico

Las cifras del copy (las **11 dimensiones** de `SLG_Readiness`, las **3 versiones Phoenix**) se
componen en `--blue-deep` a escala de titular. **Sustituyen a la fotografía**: son el recurso visual
del sitio, junto con el blanco y la línea estructural.

---

## 5. Materiales y profundidad (C.3)

| Regla | Detalle |
|---|---|
| Barra de navegación | Translúcida (`backdrop-filter`, `blur(20px) saturate(180%)`) sobre fondo claro, con el contenido pasando por debajo |
| Separación de la barra | **Scroll edge effect**, no un borde de 1 px |
| Apilamiento | **Nunca dos superficies claras translúcidas apiladas** — la segunda es sólida |
| Modales | Con **scrim** que empuja el fondo |
| Paneles laterales (HQ) | **Sin scrim** — el contexto de detrás sigue siendo operable |
| Jerarquía en listas | Bloques con `border-left 3px` en `--blue-primary` / `--cyan` / `--indigo` (patrón del kit para email), recurso de las listas «Qué incluye» |
| `prefers-reduced-transparency` | **Todas** las superficies translúcidas pasan a sólidas (RNF-07) |
| `prefers-contrast: more` | Bordes definidos y fondos casi sólidos (RNF-08) |

Los tres radios (`12` / `16` / `24 px`) y las sombras suaves multicapa son los del §2.1; no se
inventan valores intermedios por componente.

---

## 6. Motion (C.4) — versión consultable

> El contrato completo y verificable vive en `planning/requirements.md`: **RNF-09 a RNF-12**,
> **RNF-45** (gesto del sheet móvil) y **RNF-46** (reveals al scroll). Esta tabla es la copia de
> mano; ante cualquier diferencia, manda `requirements.md`.

| Qué | Cifra exacta |
|---|---|
| Respuesta a la entrada | Feedback en `pointerdown`: `scale(0.97)` durante **100 ms**. Cero retardos artificiales en la ruta de entrada |
| Spring por defecto | `damping` **1.0** (sin rebote), `response` **0.3–0.4 s** |
| Rebote | `~0.8`, **solo** tras un gesto con momentum (sheet móvil lanzada, carrusel de artículos) |
| Interrumpibilidad | Se anima **desde el valor presentado**, nunca desde el objetivo. **Cero `@keyframes`** en interacciones agarrables |
| Sheet móvil (4 cláusulas) | Seguimiento **1:1** con `setPointerCapture` · proyección de momentum **`d ≈ 0.998`** para decidir cerrar o abrir · **rubber-band** en el límite · **velocidad transferida** al spring de cierre |
| Reveals al scroll | Opacidad + **8 px** de desplazamiento, **una sola vez** por elemento, `damping` **1.0**. Sin parallax, sin fondos en movimiento, sin bucles lentos |
| Propiedades animadas | **Solo `transform` y `opacity`**. `will-change` únicamente donde el movimiento es inminente |
| `prefers-reduced-motion: reduce` | Todo degrada a **cross-fade de 200 ms**: sin desplazamientos, sin rebotes |

**Cómo se verifica** (gate D3): el sheet móvil y el hero se revisan **cuadro a cuadro**, no por
inspección del código (RNF-45, criterio 10 de FU-10).

---

## 7. Secciones oscuras y modo oscuro

### 7.1 Secciones oscuras (permitidas, acotadas)

- Fondo: **`--blue-deep`** o **`--indigo`**. Ningún otro.
- Texto: **blanco** (6,5:1 sobre `--blue-deep`, 12,6:1 sobre `--indigo` — ambos *medidos*).
- Acento: **`--cyan`**, con el límite del §2.3 — legible como texto solo sobre `--indigo` (5,3:1);
  sobre `--blue-deep` (2,8:1) es acento gráfico no informativo o no se usa.
- **Sin logo dentro** (regla 4 del kit, §3 de este documento). En una sección oscura el nombre de
  marca, si aparece, es texto compuesto, no el logotipo.
- El rojo sigue contando: **1–2 instancias por viewport**, secciones oscuras incluidas.

### 7.2 Modo oscuro

**Fuera de v1** (§5.2). No se construye, no se prueba, no se promete. Lo que sí es obligatorio ahora:
que **todos** los tokens de color, radio, sombra y difuminado sean **variables CSS** (RNF-15,
criterio 2 de FU-02), de forma que habilitarlo en v1.1 sea redefinir tokens y no rehacer componentes.

---

## 8. Orden de construcción de componentes (C.5)

Los **nueve componentes** de C.5, con prototipo interactivo aprobado **antes** de construir ninguna
DU de página (FU-10). El orden efectivo, con la reordenación ya declarada en FU-10:

1. **Formulario de descarga** — primero (RF-134): es el CTA único de toda página de servicio.
2. Barra de navegación translúcida + sheet móvil arrastrable.
3. Hero tipográfico.
4. Tarjeta de rama/servicio.
5. Bloque «Qué incluye».
6. Tarjeta de artículo.
7. Pie.
8. Shell de app (barra lateral, tabla, ficha, estado vacío, estado de error).
9. Visor de entregables.

Un prototipo es un **componente real, navegable con teclado y con gesto**. Una imagen no cierra esa
compuerta.

---

## 9. Lente de revisión (C.6) — checklist por DU de interfaz

Los **ocho principios**, convertidos en preguntas que se responden por escrito en el `work_log` de
cada una de las **19 DU con pantalla propia** (§0.3) y de FU-10 y FU-12. Una respuesta vacía no
cierra el gate (RNF-43).

| # | Principio | Pregunta accionable | Se ve mal si… |
|---|---|---|---|
| 1 | **Propósito** | ¿Qué decidimos **no** construir en esta pantalla, y por qué el usuario no lo echa de menos? | La pantalla crece «por si acaso» |
| 2 | **Agencia** | ¿Se puede deshacer todo lo reversible sin preguntar? ¿La confirmación aparece **solo** en lo irreversible? | Diálogos de confirmación en acciones que se podrían deshacer |
| 3 | **Responsabilidad** | ¿Se piden los datos mínimos? ¿Cada permiso se pide en el momento justo, no antes? | Un formulario con un campo que nadie va a usar |
| 4 | **Familiaridad** | ¿El mismo patrón está en el mismo lugar que en las demás pantallas? | Dos pantallas resuelven lo mismo de dos formas |
| 5 | **Flexibilidad** | Móvil = **rápido**; escritorio = **profundo**. ¿Se cumple, o el móvil es el escritorio encogido? | La tabla de HQ se lee en móvil con zoom |
| 6 | **Simplicidad** | ¿Hay **jerarquía**, no minimalismo? ¿Se distingue lo primario de lo secundario sin leerlo todo? | Todo pesa igual y nada guía la mirada |
| 7 | **Craft** | ¿Cada espaciado, radio y `timing` es **defendible**? ¿Sale de un token o de este documento? | Un valor «a ojo» que no está en §2.1 ni en §6 |
| 8 | **Deleite** | ¿El movimiento es **consecuencia** de la acción, no confeti añadido? | Una animación que no explica nada |

**Wayfinding, en las tres preguntas, en cada pantalla:** **dónde estoy** · **a dónde puedo ir** ·
**cómo salgo**.

**Comprobaciones mecánicas del mismo pase** (no sustituyen la lente, la acompañan): contraste AA en
todas las combinaciones (§2) · teclado completo con foco visible · `alt` en toda imagen informativa ·
etiqueta asociada y error en línea en cada campo · las tres preferencias del sistema
(`prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`) · rojo ≤ 2 instancias
· ≤ 3 colores de marca por elemento gráfico.

---

## 10. Activos de marca — `[PENDIENTE]` y su respaldo

**Los cuatro activos que faltan** (Anexo I-5, riesgo R-35):

| # | Activo | Estado |
|---|---|---|
| 1 | Logo **SLG Agency** en SVG + PNG | `[PENDIENTE]` |
| 2 | Favicon | `[PENDIENTE]` |
| 3 | Imagen Open Graph de marca | `[PENDIENTE]` |
| 4 | Montserrat en `woff2` (400 / 600 / 700, subconjunto latino) | `[PENDIENTE]` |

**El logo del kit no sirve como sustituto.** El kit entrega `SLGA-Horizontal-A.png` — *Softlanding
Global Academy*. La web es de **SLG Agency**: es otra marca, no una variante. Usarlo sería un defecto
de marca, no un apaño (R-35).

### 10.1 El respaldo que define el propio brief

Mientras falte el logo, C.3 fija el sustituto: **wordmark tipográfico «SLG Agency» en Montserrat 700,
color `--blue-deep`**.

**Cómo se implementa, para que sustituirlo cueste un archivo y no una refactorización** (mitigación
de R-35):

- **Un componente**, no una repetición: toda aparición de la marca —barra de navegación, pie, correo,
  imagen OG, favicon— pasa por el mismo componente de marca.
- **Un token** que decide qué renderiza ese componente: wordmark tipográfico o archivo de logo.
- El componente aplica siempre las reglas del kit, con logo o sin él: **solo sobre `--paper` o
  `--paper-2`**, con **margen de respeto de 1 altura de la «S»**, **sin deformar**, **nunca dentro de
  una sección oscura**.
- Sustituir el respaldo por el logo real = añadir el archivo y cambiar el token. **Ninguna DU se
  reabre.**

### 10.2 Cuándo dejan de ser opcionales

Los cuatro activos entran en la **lista de requisitos de go-live**, no en la de M1. El sitio se
construye entero con el respaldo; lo que no puede ocurrir es llegar al go-live con el respaldo
puesto y el Anexo I-5 sin cerrar.

---

## 11. Huecos abiertos de este documento

| # | Hueco | Dónde se cierra |
|---|-------|-----------------|
| ~~1~~ | ~~Token del anillo de foco: el cyan medido (2,4:1) no cumple RNF-05 ni el gate D2 (§2.3)~~ | ✅ **Cerrado por D-44**: anillo de dos capas, exterior `--cyan`, interior `--blue-primary` o `--ink` (§2.3). Token en FU-02, verificación en FU-10 |
| 2 | Tamaño e interlineado web de H1, H2 y H3; interlineado de caption y eyebrow (§4.2) | FU-02 + `decision_log` |
| 3 | Logo SLG Agency (SVG/PNG), favicon, imagen OG y Montserrat en `woff2` (§10) | Anexo I-5 · requisito de go-live |
| 4 | Confirmación de si el tagline *«The discipline of going global»* se usa en `SLG_Holdings` (Anexo I-5) | FU-01 (copy maestro) |

---

## Registro

- `2026-09-08` — Creado en el paso 6 de `init-project`, nivel **LIGHT** del perfil `software-app`,
  destilando el Anexo C (C.1–C.6) de `START_PROJECT.md` v1.1 y el `Kit_Marca_SLG_Rojo.md` v1
  (2026-05-26), que **sí** estaba accesible en `~/Dev/SLG_Overhauling/assets/` y con el que este
  documento no entra en contradicción. Los contrastes de C.1 se **recalcularon** sobre los
  hexadecimales del kit: los **trece** valores que declara el brief coinciden. Se añaden **ocho**
  contrastes que el Anexo C no traía, marcados *(medido)*, de los que salen las dos consecuencias
  del §2.3 y el
  conflicto del anillo de foco. Sin nombrar ningún producto que Ricardo no haya elegido
  (AGENTS.md Regla 7).
- `2026-09-08` — **D-44** cierra ese conflicto (CF-3): el §2.3 y el hueco 1 del §11 pasan de
  declaración de conflicto a **token resuelto** (anillo de dos capas, exterior `--cyan`, interior
  `--blue-primary` o `--ink`).
