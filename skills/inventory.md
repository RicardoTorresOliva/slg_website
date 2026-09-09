---
type: tooling
title: Skills inventory
project: slg_website
description: Skills evaluadas en la planificacion (init-project, paso 8). Solo se instala lo que ahorra mas contexto del que cuesta.
tags: [tooling, skills, planning]
timestamp: 2026-09-08
---

# Inventario de skills — slg_website

Criterio de AGENTS.md: *instalar solo lo que ahorre más contexto/tokens del que cuesta; documentar
cada rechazo en una línea*. Fuente de partida: `START_PROJECT.md` Anexo G y `tooling_candidates`
del perfil `software-app`.

## Aprobadas en el brief — instalación pendiente

| Skill | Uso | Cuándo instalar | Justificación de coste |
|---|---|---|---|
| **`apple-design`** (`emilkowalski/skills`) | Reglas de motion físico, materiales translúcidos, tipografía y accesibilidad; checklist de revisión de los 8 principios (Anexo C.6). Es la base del sistema de diseño sobre el Kit de Marca SLG. | **M0**, antes del primer componente | Ahorra: el Anexo C ya destila sus reglas duras, pero la skill íntegra aporta el checklist de revisión que los gates D2b y D3 exigen aplicar por DU. Sin ella, cada revisión de interfaz reconstruye el criterio a mano. |
| **`review-animations`** (`emilkowalski/skills`) | Revisión cuadro a cuadro del sheet móvil y del hero (gate D3 del Anexo D). | M1, al construir nav + sheet | Coste bajo, uso concentrado en 2–3 DUs. Alternativa: revisión manual, que el gate D3 exige igualmente. |
| **`prototype`** (`emilkowalski/skills`) | Prototipo interactivo de los componentes de C.5 antes de construir el resto. | M1, FU de sistema de diseño | El brief lo exige explícitamente: *"con prototipo interactivo antes de construir el resto"* (C.5). |

**Comando de instalación** (Anexo G): `npx skills@latest add emilkowalski/skills`

> ⚠️ **No se ejecuta durante la planificación.** Escribe archivos de terceros en un repo **público** y
> la Compuerta de Planificación (AGENTS.md Regla 1) sigue cerrada. Se instala como primer paso de M0,
> tras la aprobación del plan, verificando qué archivos añade antes de commitear.

## Evaluadas y descartadas del mismo paquete

| Skill | Razón (una línea) |
|---|---|
| **`emil-design-eng`** | Se solapa con `apple-design` sobre un activo cuyo sistema de diseño ya está fijado por el Kit de Marca SLG (Anexo C); coste de contexto sin criterio nuevo. |
| **`pick-ui-library`** | La decisión ya está tomada en HITL (§7): Tailwind + Motion, sin librería de componentes. Una skill para decidir lo ya decidido es coste puro. |

## Ya disponibles en la sesión — no requieren instalación

| Skill | Uso en este proyecto |
|---|---|
| `vercel:nextjs`, `vercel:react-best-practices` | Guía de App Router, Server Components y rendering. **Solo la parte de framework**: el hosting es Easypanel (§10-1), no Vercel; se ignora todo lo específico de esa plataforma. |
| `superpowers:test-driven-development` | Pruebas de los caminos críticos que exige `deliverable_unit_completeness`: auth, mutaciones, integración con el CRM, aislamiento entre empresas (DoD #5). |
| `superpowers:systematic-debugging` | Depuración durante la ejecución. |
| `superpowers:verification-before-completion` | Compuerta previa a cerrar cada DU; complementa el `quality_gate` del perfil. |
| `artifact-design`, `artifact-diagramming` | Presentación del plan y diagramas de arquitectura para revisión. |
| `dataviz` | Tablero de HQ (métricas del pipeline leídas del CRM, M3). |
| `security-review` | Apoyo al gate D9 (aislamiento) y a B.8. |
| `code-review` | Revisión por milestone, complementaria a `/review`. |
| `graphify` | Consulta del propio código y sus relaciones cuando el repo crezca. |

## Rechazadas

| Skill | Razón (una línea) |
|---|---|
| `anthropic-skills:docx` / `pptx` / `xlsx` | Los entregables de este activo son un repo desplegable, no documentos ofimáticos. |
| `anthropic-skills:pdf` | Los 11 PDFs de descarga se producen en el proyecto SLG_Overhauling, fuera de este repo (Anexo H-10). |
| `figma:*` | Mockups solo si el prototipo en código no basta (Anexo G); hoy el MCP de Figma ni siquiera está autorizado. |
| `stripe:*` | Sin pagos ni facturación en v1 (§5.2). |
| `supabase:*` | Datos e identidad en PostgreSQL propio (§7). |
| `design` (canvas) | El sistema de diseño se define en código sobre tokens del Kit de Marca; un canvas visual duplicaría la fuente de verdad. |

## Registro

- `2026-09-08` — Inventario inicial derivado del Anexo G y del `tooling_candidates` del perfil. 3 aprobadas para instalar en M0, 2 descartadas del mismo paquete, 9 disponibles sin instalar, 6 rechazadas.
