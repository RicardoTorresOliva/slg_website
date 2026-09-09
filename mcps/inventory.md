---
type: tooling
title: MCP inventory
project: slg_website
description: Servidores MCP evaluados en la planificacion (init-project, paso 8). Solo se instala lo que ahorra mas contexto del que cuesta.
tags: [tooling, mcp, planning]
timestamp: 2026-09-08
---

# Inventario de MCPs — slg_website

Criterio de AGENTS.md: *instalar solo herramientas que ahorren más contexto/tokens del que cuestan;
documentar cada rechazo en una línea*. Fuente de partida: `START_PROJECT.md` Anexo G.

**Distinción del método (§7 del brief).** MCP = para que el agente **construya**.
API + clave en variables de entorno = para que el sitio **opere en producción**. No se mezclan.
Un MCP nunca es una dependencia de runtime del sitio.

## Instalados

| MCP | Ámbito | Uso en construcción | Coste de contexto | Estado |
|---|---|---|---|---|
| **crm** — CRM Softlanding Global<br>`crm.softlandingglobal.com/api/v1/mcp` | `local` (`~/.claude.json`) | Inspeccionar contactos, etapas, campos y payloads reales para el mapeo de la captura (Anexo B.6) y validar el flujo E2E del DoD #1. 25 herramientas. | Alto si se cargan las 25 a la vez; se cargan bajo demanda vía `ToolSearch`. Ahorra más de lo que cuesta: la alternativa es leer el código del CRM en `~/Dev/crm_slg`. | ✅ Registrado y conectado 2026-09-08 (D-18). **Requiere reinicio de sesión** para que sus herramientas entren en contexto. |

> **Alcance de la credencial.** El Anexo G del brief exige que este MCP use una credencial de
> **solo lectura**: es una herramienta de inspección durante la construcción, no de escritura.
>
> **Regla permanente:** este MCP se registra siempre con `--scope local`, nunca `--scope project`.
> El repo es público; el scope de proyecto escribiría la credencial en `.mcp.json` dentro del repo.

## Aprobados en el brief, pendientes de instalar

| MCP / herramienta | Uso previsto | Cuándo | Nota |
|---|---|---|---|
| **Claude in Chrome** | Configurar Easypanel, DNS Hostinger, Google Cloud, Entra y las claves del CRM junto a Ricardo; verificación visual de páginas. | Pre-requisitos F.2, en paralelo a M0 | Ya disponible en la sesión (`mcp__claude-in-chrome__*`). No requiere instalación. |
| **Browser/automation** (`tooling_candidates` del perfil) | Verificación visual y Lighthouse en staging (gates D1, D2, D3). | M1 en adelante | Ya disponible (`mcp__Claude_Browser__*`). No requiere instalación. |
| **Google Drive** | Traer activos puntuales (logo SLG Agency, PDFs de descarga) al repo o al bucket. | Cuando existan los activos (Anexo I-3, I-5) | Ya disponible. Uso puntual, no continuo. |
| **Gmail / Microsoft 365** | Enviar accesos y avisos a Ricardo durante el proyecto. | Puntual | Ya disponible. No es el correo transaccional del sitio (eso es D-15). |
| **n8n** | Flujos opcionales sobre los webhooks salientes (B.7). | v1.1 — no es requisito de v1 | El MCP `N8N_Cloud` es **otra instancia** y hoy no conecta. La instancia real es `n8n.softlandingglobal.com`. |
| **Figma** | Mockups de hero/nav/sheet **solo si** el prototipo en código no basta. | Condicional, M1 | Requiere autenticación (hoy sin autorizar). No se instala hasta que se demuestre necesario. |

## Rechazados

| MCP | Razón (una línea) |
|---|---|
| **Airtable** | Los leads y el pipeline viven en el CRM propio (§10-13); las bases Airtable quedan como histórico. |
| **Supabase** | La identidad y los datos viven en PostgreSQL propio en Easypanel (§7); los proyectos Supabase actuales están pausados. |
| **Vercel** | Hosting decidido en Easypanel (§10-1). Nota aparte para Ricardo: revisar si conviene mantener el plan Pro sin proyectos. |
| **Gamma** | Sin aporte a este activo: no se producen presentaciones. |
| **Firecrawl** | Sin aporte: no hay scraping ni investigación web recurrente en el producto. |
| **Apify** | Ídem Firecrawl. |
| **NotebookLM** | El conocimiento del proyecto vive en `knowledge/` (OKF), no en un cuaderno externo. |
| **Obsidian** (`obsidian_local`, `obsidian_personal`, `obsidian_biblioteca`, `megamem`) | El vault es la fuente de las specs, pero se leen por sistema de archivos (`~/Dev/SLG_Overhauling/`); el MCP añadiría superficie sin ahorrar contexto. |
| **Stripe** | No hay pagos ni facturación en v1 (§5.2). |
| **Notion** | La operación se centraliza en este sitio y en el CRM; no se añade una tercera fuente. |
| **GitHub** (MCP) | Hoy falla al conectar (`Authorization header is badly formatted`). El trabajo con Git se hace por CLI, que basta. |

## Registro

- `2026-09-08` — Inventario inicial derivado del Anexo G del brief. `crm` registrado (D-18). 11 rechazos documentados.
