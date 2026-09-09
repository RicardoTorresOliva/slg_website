---
type: Índice
title: Índice del conocimiento — slg_website
description: Punto de entrada de divulgación progresiva. Qué abrir, cuándo abrirlo y qué no hace falta abrir. Se carga en todas las sesiones.
tags: [okf, indice, divulgacion-progresiva, slg_website]
timestamp: 2026-09-08
---

# Índice del conocimiento — slg_website

**Cómo se usa este archivo.** Se carga en **todas** las sesiones; el resto **no**. Abre un concepto
cuando su columna "cuándo" describa lo que estás a punto de hacer, y abre un design doc **solo por la
sección que necesitas**. Si terminas una sesión habiendo leído más de 8 archivos, la disciplina de
contexto se rompió: cierra la unidad y termina.

**Antes de producir cualquier cosa**, lee [method-sdd-icm](method-sdd-icm.md): dice qué compuerta
tienes que haber pasado. Es el único que se lee "por si acaso".

---

## Los siete conceptos

| Concepto | Para qué sirve | Cuándo se necesita |
|---|---|---|
| [method-sdd-icm](method-sdd-icm.md) | Las cuatro compuertas vinculantes: Planning Gate, copy (FU-01), prototipo (C.5) y revisión por milestone; qué se rechaza por saltárselas | **Siempre, antes de empezar cualquier unidad.** Y otra vez al cerrar un milestone |
| [naming-rules](naming-rules.md) | Nombres literales e intraducibles, `SLG Agency` vs "Softlanding Global", la "D" de DAL OS, tono y notación de origen | Cada vez que escribas **texto visible** o el nombre de una ruta, colección o etiqueta |
| [offer-structure](offer-structure.md) | Las dos ramas, las tres líneas de `SLG_AI`, las 11 páginas con documento y el contrato de seis secciones | Al construir navegación, cualquier página pública o el mapa de rutas |
| [content-schema](content-schema.md) | Las seis colecciones de `content/` con su ruta y frontmatter mínimo, y las cuatro reglas del script de CI | Al crear o validar cualquier registro de contenido; al escribir el script de CI |
| [brand-tokens](brand-tokens.md) | Tokens de color con contraste medido, tipografía, materiales y las **prohibiciones duras** del kit | Al pintar cualquier interfaz, prototipar un componente o revisar el gate de marca |
| [crm-integration](crm-integration.md) | El adaptador de dos modos web → CRM, la cola de reintentos y la lectura del tablero | Al construir el formulario de descarga, la entrega al CRM o el tablero de HQ |
| [doctrine-summary](doctrine-summary.md) | Qué dice el brief de The Phoenix Doctrine y DAL OS, y el tono que imponen | Al escribir la página Doctrina o cualquier copy con voz de marca |

## Los cinco design docs

Los cinco están escritos, más un consolidado que los indexa. Se abren **por sección**, nunca enteros: entre los cinco suman más de
6.400 líneas y leerlos completos rompe la disciplina de contexto de `AGENTS.md`.

| Design doc | Para qué sirve | Cuándo se necesita | Estado |
|---|---|---|---|
| [ui_wireframes](../design_docs/ui_wireframes.md) | Navegación, disposición de las pantallas clave y flujos de las tres superficies, con wayfinding, estados vacíos y de error | Antes de construir una pantalla: mira **solo** la de esa pantalla | Escrito (MEDIUM) |
| [data_model](../design_docs/data_model.md) | Entidades, campos, relaciones, índices y el **modelo de aislamiento en seis capas** | Al crear una migración o cualquier consulta con datos de cliente | Escrito (HIGH) |
| [api_contracts](../design_docs/api_contracts.md) | Endpoints, métodos, formas de petición/respuesta y autenticación — incluidos los **dos modos** del adaptador del CRM y los 9 webhooks | Al implementar un endpoint, el cliente del CRM o un webhook | Escrito (HIGH) |
| [architecture](../design_docs/architecture.md) | Superficies, middleware, renderizado, colas, servicios de Easypanel, backups y restauración | Al montar fundaciones, enchufar una integración o tocar despliegue | Escrito (MEDIUM) |
| [style_guide](../design_docs/style_guide.md) | Sistema de diseño: tokens con contraste medido, tipografía, materiales, motion y la lente de revisión C.6 | Al construir un componente, después de leer los tokens | Escrito (LIGHT) |
| [design_summary](../design_docs/design_summary.md) | **Consolidado**: las decisiones que tomaron los cinco documentos, los conflictos entre ellos con su resolución, y todos los huecos `[PENDIENTE]` con dueño y milestone | **Antes que los cinco**, cuando no sepas cuál abrir o creas haber encontrado una contradicción | Escrito |

## Fuera de este bundle (no lo dupliques aquí)

| Dónde | Qué |
|---|---|
| [../AGENTS.md](../AGENTS.md) | **Gobernanza.** Las 8 reglas. Vive ahí y solo ahí |
| [../START_PROJECT.md](../START_PROJECT.md) | El contrato (brief v1.1). Fuente de verdad de todo este bundle. Se abre por anexo, no entero |
| [../docs/decision_log.md](../docs/decision_log.md) | Decisiones de planificación desde `D-14`, e incidencias de seguridad |
| [../planning/requirements.md](../planning/requirements.md) | Los requisitos `RF-*` / `RNF-*`. Se abre por sección |
| [../planning/scope.md](../planning/scope.md) · [../planning/risks.md](../planning/risks.md) | Dentro/fuera/previsto; riesgos y mitigaciones |
| [../profiles/software-app/profile.md](../profiles/software-app/profile.md) | Perfil activo: qué es "hecho" y qué comprueba el quality gate |
| Docs_MD (fuera del repo) | Resumen público completo de The Phoenix Doctrine y DAL OS |

## Cuatro cosas que ahorran una lectura entera

1. **La web no gestiona pipeline.** Captura, entrega al CRM, guarda evidencia y reintenta. Nada más.
2. **Son 11 documentos de descarga** (`D-01`…`D-11`), uno por página con CTA. No 9.
3. **Ningún texto visible vive en un componente.** Si lo escribes en código, es un defecto.
4. **En producción no puede quedar ni un `[PENDIENTE]`.** En staging son obligatorios donde falte dato.

---

Cada escritura en este bundle deja una entrada en [log](log.md). Añadir un concepto obliga a
actualizar este índice en el mismo cambio.
