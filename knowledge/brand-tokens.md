---
type: Convención
title: Tokens de marca y prohibiciones del kit
description: Los tokens de color, tipografía y material de C.1–C.3 con su valor, su uso y su contraste medido, más las prohibiciones duras del Kit de Marca SLG que la web hereda y que el gate D2b verifica.
tags: [marca, tokens, color, tipografia, contraste, accesibilidad, kit]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md Anexo C (C.1, C.2, C.3), §10-4, Anexo D (gates D2 y D2b)"
  - "Kit de Marca SLG Rojo v1 (2026-05-26) — fuente de marca, fuera de este repo"
---

# Tokens de marca y prohibiciones del kit

Concepto de diseño: **autoridad silenciosa**. El producto es pensamiento, así que el peso visual lo
llevan la tipografía, el blanco y la jerarquía — no la imagen. Light-first (el kit prohíbe el logo
sobre fondo oscuro). Cero stock, cero clichés de IA, cero confeti.

La marca la manda el **Kit de Marca SLG Rojo v1**, decidido en §10-4, que sustituye cualquier paleta
anterior. Este archivo es la traducción del kit a tokens web con contraste medido. El sistema de
diseño completo (componentes, escalas, estados) vive en
[../design_docs/style_guide.md](../design_docs/style_guide.md).

---

## 1. Tokens de color (C.1) — valor, uso y contraste

Los contrastes de esta tabla vienen medidos en el brief. No se recalculan por intuición: si una
combinación no aparece aquí, se mide antes de usarla.

| Token | Valor | Uso en la web | Contraste medido |
|---|---|---|---|
| `--blue-primary` | `#2878B4` | Color de marca: H2, botón secundario (texto blanco), líneas estructurales, eyebrows, bordes de bloque | 4,7:1 sobre blanco (AA texto); **4,4:1 sobre blanco roto → ahí solo en tamaño grande (≥ 24 px)** |
| `--blue-deep` | `#24394D` | H1 y titulares de portada, texto de enlace, títulos de bloque, superficies de HQ y portal | 6,5:1 sobre blanco; 6,0:1 sobre blanco roto |
| `--cyan` | `#50B4DC` | Highlights, marcador de palabras clave (fondo con texto tinta: 8,3:1), iconos, subrayados, y anillos de foco **solo como capa exterior de un anillo de dos capas** (D-44), cuya capa interior es `--blue-primary` o `--ink` | **2,4:1 sobre blanco → NUNCA como color de texto sobre claro; nunca anillo de foco de una sola capa.** Como texto, solo sobre índigo (5,3:1) |
| `--blue-tint` | `#78B4DC` | Fondos de tabla y áreas de respiración, a 20–40 % de opacidad | Solo fondo (texto tinta encima: 8,8:1) |
| `--indigo` | `#282878` | H3, elementos secundarios de marca, `SLG_Academy`, datos destacados en tablas | 12,6:1 sobre blanco |
| `--red` | `#DC141E` | **Detención visual**: el botón del CTA de descarga (texto blanco) y las alertas críticas de HQ | 5,0:1 sobre blanco; blanco sobre rojo 5,0:1 |
| `--ink` | `#0A0A14` | Texto de cuerpo | 19,7:1 sobre blanco |
| `--ink-2` | `#5A6470` | Texto secundario, captions, pie | 6,0:1 sobre blanco |
| `--line` | `#C8CCD3` | Divisores sutiles, bordes de tarjeta | Solo líneas, nunca texto |
| `--paper` | `#FFFFFF` | Fondo principal | — |
| `--paper-2` | `#F4F6F9` | Fondos suaves y alternancia de secciones ("blanco roto") | — |

**Secciones oscuras**: permitidas en `--blue-deep` o `--indigo`, con texto blanco y cyan como acento,
y **sin logo** dentro.

**Modo oscuro**: fuera de v1. Los tokens se declaran como variables CSS precisamente para habilitarlo
en v1.1 sin rehacer nada.

## 2. Materiales y profundidad (C.1, C.3)

| Token | Valor | Uso |
|---|---|---|
| Radio | `12 / 16 / 24 px` | Tarjetas, campos, superficies |
| Sombra | Suaves, multicapa | Elevación; nunca borde duro para simular profundidad |
| Blur | `blur(20px) saturate(180%)` | Barra de navegación translúcida |

Reglas de material: barra de navegación translúcida sobre fondo claro con el contenido pasando por
debajo; *scroll edge effect* en lugar de un borde de 1 px; **nunca dos superficies claras
translúcidas apiladas**; modales con scrim que empuja el fondo; paneles laterales de HQ sin scrim;
`prefers-reduced-transparency` → superficies sólidas.

Recurso de jerarquía heredado del kit: bloques con `border-left: 3px` en `--blue-primary`, `--cyan` o
`--indigo`, usado en las listas "Qué incluye" del contrato de página
([offer-structure](offer-structure.md) §5).

## 3. Tipografía (C.2)

- **Montserrat**, autoalojada en `woff2` (pesos 400, 600, 700; `font-display: swap`; subconjunto
  latino). Fallbacks del kit: `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. Es la
  excepción justificada a la regla "fuente de sistema": la marca ya tiene familia.
- **Bebas Neue u Oswald** (kit) **solo** para separadores de sección y eyebrows en mayúsculas. Nunca
  para cuerpo ni para el nombre de marca.

| Rol | Especificación |
|---|---|
| Hero / portada | Montserrat 700 · `clamp(2.25rem, 5vw, 4.5rem)` · `line-height 1.05` · `letter-spacing -0.02em` · `--blue-deep` |
| H2 | Montserrat 600 · `--blue-primary` |
| H3 | Montserrat 600 · `--indigo` |
| Cuerpo | Montserrat 400 · `1.0625rem / 1.6` · `--ink` |
| Caption | `0.875rem` · `--ink-2` · tracking `+0.04em` |
| Eyebrow | Montserrat 700 · `0.75rem` · `--blue-primary` · mayúsculas · tracking `+0.08–0.10em` |

Jerarquía por **peso + tamaño + interlineado como conjunto**, nunca por color solo. Espaciado en
`rem`, para respetar el tamaño de texto que el usuario haya elegido.

Las **cifras grandes** (las 11 dimensiones de `SLG_Readiness`, "3 versiones Phoenix") se componen en
`--blue-deep` como elemento gráfico: **sustituyen a la fotografía**.

## 4. Prohibiciones duras del kit — no son preferencias

Estas son reglas del Kit de Marca que la web hereda tal cual. El gate **D2b** las verifica por
revisión, y una pieza que las incumpla se rechaza aunque funcione y aunque guste.

1. **No usar verde, amarillo ni naranja.** Ningún tono, en ningún estado, en ninguna superficie.
2. **El rojo nunca es decorativo ni de relleno.** Máximo **1–2 instancias por viewport**, y su
   significado es detención: el CTA de descarga y las alertas críticas de HQ. Un rojo de fondo es un
   defecto de marca.
3. **Máximo 3 colores de marca por elemento gráfico.**
4. **El logo nunca sobre fondo oscuro**, nunca deformado, con **margen de respeto = 1 altura de la
   "S"**, y solo sobre `--paper` / `--paper-2`. Por eso no hay logo dentro de las secciones oscuras.
5. **Nada de tipografías serif ni decorativas para el nombre de marca.**
6. **Cyan (`#50B4DC`) y tinte (`#78B4DC`) nunca como texto sobre claro** (gate D2). `#2878B4` sobre
   blanco roto, solo en tamaño grande.

## 5. Activos que faltan

- `[PENDIENTE: logo de SLG Agency en SVG y PNG]` — el kit entrega `SLGA-Horizontal-A.png`, que es de
  *Softlanding Global Academy*, y esta web es de **SLG Agency**. Mientras tanto: wordmark tipográfico
  "SLG Agency" en Montserrat 700 sobre `--blue-deep`.
- `[PENDIENTE: favicon]`
- `[PENDIENTE: imagen Open Graph de marca]`
- `[PENDIENTE: archivos woff2 de Montserrat]`
- `[PENDIENTE: confirmar si el tagline "The discipline of going global" se usa en SLG_Holdings]`

## Enlaces

- Sistema de diseño completo, componentes y estados → [../design_docs/style_guide.md](../design_docs/style_guide.md)
- Dónde se aplica cada token, pantalla por pantalla → [../design_docs/ui_wireframes.md](../design_docs/ui_wireframes.md)
- Cómo se escriben los nombres que estos tokens visten → [naming-rules](naming-rules.md)
- Qué compuerta hay que pasar antes de construir con esto → [method-sdd-icm](method-sdd-icm.md)
