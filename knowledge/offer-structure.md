---
type: Concepto
title: Estructura de la oferta SLG
description: Las dos ramas (SLG_AI y SLG_Holdings), las tres líneas de SLG_AI y las páginas de servicio con su documento de descarga. Es la fuente de la navegación, del mapa de rutas y de la nomenclatura.
tags: [slg, oferta, navegacion, nomenclatura, paginas, descargas]
timestamp: 2026-09-08
sources:
  - "START_PROJECT.md §1 (Description, Key elements), A.1, A.2, A.3, A.4"
  - "docs/decision_log.md D-17"
  - "planning/requirements.md RF-01, RF-02, RF-06, RF-07, RF-28"
---

# Estructura de la oferta SLG

**Regla que gobierna todo este concepto: el menú *es* la estructura de la oferta** (§A.1). La
navegación no es una decisión de diseño: es la traducción literal de cómo SLG vende. Si la oferta
cambia, cambia el menú; nunca al revés.

La nomenclatura de esta página es **literal e intraducible** en los dos idiomas. Las reglas de
escritura completas están en [naming-rules](naming-rules.md); aquí se usan ya aplicadas.

---

## 1. Dos ramas, no una

| Rama | Ruta ES | Ruta EN | Qué es |
|---|---|---|---|
| `SLG_AI` | `/ai` | `/en/ai` | La rama de servicios de IA. Se despliega en tres líneas. |
| `SLG_Holdings` | `/holdings` | `/en/holdings` | La otra rama. Único contexto en el que la marca pública se escribe "Softlanding Global". Tiene **tres líneas**: `[PENDIENTE: los nombres de las tres líneas de SLG_Holdings — A.3-3 las exige listar "tal cual la fuente", pero el brief no las enumera]` |

En Home las dos ramas se presentan como **dos puertas**, no como una lista de servicios (§A.3, bloque
Home). El visitante elige rama antes de ver nada más.

## 2. Las tres líneas de `SLG_AI`

| Línea | Ruta ES | Ruta EN | Contiene |
|---|---|---|---|
| `SLG_Academy` | `/ai/academy` | `/en/ai/academy` | 5 servicios (formación y acompañamiento de directivos) |
| `SLG_Enterprise` | `/ai/enterprise` | `/en/ai/enterprise` | 2 servicios (diagnóstico e implementación) |
| `SLG_Factory` | `/ai/factory` | `/en/ai/factory` | 3 servicios (construcción de activos) |

Las tres aparecen en Home como tres tarjetas, después de las dos puertas.

## 3. Los servicios y su documento

Cada fila de esta tabla es **una página de servicio** con **un documento de descarga** (`D-NN`) como
CTA único. Los `D-NN` son documentos, no decisiones: no confundir con `D-14`…`D-20` del
[decision_log](../docs/decision_log.md) ni con los gates `D1`…`D12` del Anexo D.

| Doc | Servicio (nomenclatura literal) | Línea | Ruta ES | Ruta EN |
|---|---|---|---|---|
| D-01 | `Phoenix PEEx` | `SLG_Academy` | `/ai/academy/phoenix-peex` | `/en/ai/academy/phoenix-peex` |
| D-02 | `Phoenix TEAx` | `SLG_Academy` | `/ai/academy/phoenix-teax` | `/en/ai/academy/phoenix-teax` |
| D-03 | `Phoenix RETx` | `SLG_Academy` | `/ai/academy/phoenix-retx` | `/en/ai/academy/phoenix-retx` |
| D-04 | Customize Programs | `SLG_Academy` | `/ai/academy/customize-programs` | `/en/ai/academy/customize-programs` |
| D-05 | AI Coaching for Directors | `SLG_Academy` | `/ai/academy/ai-coaching` | `/en/ai/academy/ai-coaching` |
| D-06 | `SLG_Readiness` | `SLG_Enterprise` | `/ai/enterprise/readiness` | `/en/ai/enterprise/readiness` |
| D-07 | `SLG_Implement` | `SLG_Enterprise` | `/ai/enterprise/implement` | `/en/ai/enterprise/implement` |
| D-08 | `APP_Building` | `SLG_Factory` | `/ai/factory/app-building` | `/en/ai/factory/app-building` |
| D-09 | `AGE_Building` | `SLG_Factory` | `/ai/factory/age-building` | `/en/ai/factory/age-building` |
| D-10 | `CoO as a Service` | `SLG_Factory` | `/ai/factory/coo-as-a-service` | `/en/ai/factory/coo-as-a-service` |
| D-11 | `SLG_Holdings` | — (rama) | `/holdings` | `/en/holdings` |

**La aritmética, dicha sin ambigüedad** (porque el brief la deja abierta en A.2 y `D-17` la cierra):
son **11 documentos**, uno por página con CTA de descarga. De esas 11 páginas, **10 son servicios de
las tres líneas de `SLG_AI`** y la undécima es la rama `SLG_Holdings`. `D-17` resolvió la
contradicción entre §10-12 ("9 descargas") y A.2/A.4 ("11"): son 11, incluidos D-04 y D-05.
Motivo: el contrato A.3 exige la descarga como CTA único de cada página de servicio; con 9, dos
páginas quedarían sin llamado a la acción.

Los títulos de D-02…D-11 y el propio archivo PDF de los once son `[PENDIENTE: A.4 y Anexo I-2/I-3]`.
D-01 sí tiene título dado por Ricardo. Mientras falte el archivo, la página muestra "disponible
próximamente" y **captura el correo igual** (RF-40).

## 4. El resto del mapa público

Fuera de la oferta hay seis destinos más, con la misma exigencia de paridad ES/EN: Home · Doctrina
(`/doctrina` · `/en/doctrine`, ver [doctrine-summary](doctrine-summary.md)) · Blog (índice, etiqueta,
artículo) · Nosotros · Descargas (biblioteca, documento, gracias) · Contacto · Legal (privacidad y
términos — son un pre-requisito de las pantallas de consentimiento OAuth, F.2-1).

La navegación principal expone **exactamente cinco destinos** (`SLG_AI`, `SLG_Holdings`, Doctrina,
Blog, Nosotros) más el botón "Acceder" (RF-01). Nunca una etiqueta genérica tipo "Inicio/Home" como
destino de menú: el logo lleva a Home.

## 5. El contrato de página de servicio (seis secciones, orden fijo)

Toda página de servicio renderiza estas seis secciones **en este orden**. Falta o desorden de una
sección = página rechazada (RF-06).

1. **Para quién y qué problema** — el comprador se reconoce en dos frases, sin alarmismo.
2. **Qué es** — definición literal desde la fuente de la oferta.
3. **Qué incluye** — la lista tal cual la fuente (p. ej. las 11 dimensiones de `SLG_Readiness`, las
   tres promesas de `CoO as a Service`, las tres líneas de `SLG_Holdings`).
4. **Cómo trabajamos** — una frase por principio aplicable: sin lock-in, elección del stack por el
   cliente, compuertas de aprobación, capacidad transferible.
5. **Descarga** — el documento de ese servicio. **Único CTA de la página** (RF-07): no hay segundo
   CTA, ni agenda embebida, ni formulario de contacto en la misma página.
6. **Siguiente paso** — sin venta: "si después de leerlo quieres conversar, escríbenos" → `/contacto`.

El copy de las seis secciones es `[PENDIENTE: FU-01, compuerta de copy]`. La forma en que ese
contrato se persiste como dato está en [content-schema](content-schema.md) (RF-135: las seis
secciones son bloques con encabezado fijo dentro del registro, y el script de CI las verifica).

---

## Consecuencias que no son negociables

- **Una idea por viewport y CTA único**: el modelo comercial es informativo ("no vendemos, ayudamos a
  comprar", §0). Añadir un segundo CTA a una página de servicio contradice §10-8, no solo el diseño.
- **La Sesión Cero no es CTA público**: se ofrece al ingresar o enrolar, dentro del portal.
- **`Phoenix Academy` (academy.softlandingglobal.com) está fuera de alcance**: solo enlace desde
  `SLG_Academy` mientras siga vivo (§10-7).
- **Añadir un servicio** = añadir su registro de contenido ES+EN y su documento. No es un cambio de
  código (RF-27).

## Enlaces

- Cómo se escribe cada nombre y qué está prohibido traducir → [naming-rules](naming-rules.md)
- Cómo se persisten estas páginas como datos → [content-schema](content-schema.md)
- Qué pasa cuando alguien pide un documento → [crm-integration](crm-integration.md)
- Colores y tipografía con que se pintan → [brand-tokens](brand-tokens.md)
- Compuertas que ninguna página puede saltarse → [method-sdd-icm](method-sdd-icm.md)
- Disposición concreta de cada pantalla → [../design_docs/ui_wireframes.md](../design_docs/ui_wireframes.md)
