---
type: Plantilla
title: Qué es motor y qué es herencia en esta plantilla
description: Qué partes del repositorio son el motor que usa todo sitio, qué es el ejemplo «Cliente Demo» que se reescribe, y qué documentación es herencia del primer sitio (SLG Agency) y se puede ignorar.
tags: [plantilla, clientes, motor, herencia]
timestamp: 2026-09-22
lang: es
---

# Qué es motor y qué es herencia

Este repositorio nació como la web de SLG Agency y se convirtió en plantilla (D-165, pasos 1–12 de
[`PLAYBOOK_REPLICACION.md`](PLAYBOOK_REPLICACION.md) §3). Lo que sirve hoy es **«Cliente Demo»**: una
consultora inventada. Nada de lo que se publica nombra a SLG; lo que queda de SLG está en la
documentación de trabajo, y este archivo dice qué es cada cosa.

## 1. El motor — se usa tal cual

Todo lo que un sitio nuevo hereda sin tocar. Lee la ficha y no nombra a ningún cliente.

| Qué | Dónde |
|---|---|
| Las páginas, componentes y rutas | `app/`, `components/`, `middleware.ts` |
| La lógica: contenido, identidad, datos, correo, archivos, colas, API | `lib/` |
| Los frenos y sus pruebas negativas | `scripts/ci/`, `scripts/content/`, `.github/workflows/ci.yml` |
| Las migraciones de la base | `drizzle/` — **no se tocan** por cliente |
| La gobernanza y los perfiles | `AGENTS.md`, `profiles/`, `commands/`, `skills/` |
| El aprovisionamiento de un sitio nuevo | `commands/crear-sitio.md`, `scripts/sitio/` |
| El manual de operación | `README.md` |

**El vocabulario técnico que dice «slg» NO es marca**, y no se renombra: los roles `slg_admin` y
`slg_operator`, el tipo de organización `slg`, el rol de base `slg_app`, el agente `agent_slg`, las
variables CSS `--slg-*`, los atributos `data-slg-*`, la cabecera `SLGBK1` de las copias y los nombres
de servicio `slg-web` del panel de despliegue. Es espacio de nombres del motor
([`plantilla-de-sitios.md`](plantilla-de-sitios.md) §1): cambiarlo exigiría migraciones y no se ve en
ninguna página.

## 2. El ejemplo — se reescribe entero por cliente

| Qué | Dónde | Cómo |
|---|---|---|
| La ficha: marca, dominio, idiomas, módulos, menú, oferta, nomenclatura | `site.config.ts` | Desde el intake (`commands/leer-intake.md`) |
| Las páginas, servicios, descargas y artículos | `content/pages`, `content/services`, `content/downloads`, `content/blog` | Se borran los de la demo y se escriben los del cliente |
| El lanzador de HQ | `content/conexiones.json` | Las herramientas del cliente |
| Logo e isotipo | `public/marca/` | Los del cliente; la ficha apunta a ellos |
| Iconos del navegador | `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` | El isotipo del cliente, rasterizado |
| Fotografías | `public/fotos/` (vacía en la demo) | Opcionales: `foto` en la ficha |
| Las cadenas de interfaz | `content/ui/*.json` | Casi nunca: no nombran a nadie. La marca, la razón social y el correo los pone la ficha (`{marca}`, `{razonSocial}`, `{correo}`) |

Tres detalles de la demo que un cliente debe conocer:

- **El blog trae tres artículos en español y uno en inglés**, y cada uno está por un freno: el
  bilingüe es el caso normal; el publicado solo en español (`pair: null`) lo exige `check:blog`
  (RF-26), para que ese caso esté probado de verdad; y el **borrador** (`status: draft`) lo necesita
  la prueba negativa de `check:blog` en `check:brakes`, que comprueba que un borrador no se sirve en
  ninguna parte. Un cliente puede borrar los tres, pero conserva un publicado solo en español y un
  borrador mientras tenga el blog encendido.
- **Los tres servicios apuntan al mismo documento**, que está en `coming-soon`: así se ve el estado
  «próximamente» sin subir ningún PDF.
- **Los nombres de la oferta son literales** también en inglés: en `/en` se lee «Diagnóstico». Si el
  cliente quiere un nombre por idioma, es una decisión de intake (`commands/leer-intake.md` §8.7,
  pendiente 6).

## 3. La herencia de SLG — se puede ignorar

Documentación de cómo se construyó el primer sitio. **No describe a Cliente Demo** y no la lee nadie
que monte un cliente, pero **varios frenos la leen**, y por eso sigue aquí.

| Qué | Por qué sigue |
|---|---|
| `planning/` (requisitos, riesgos, alcance) | Referencias de los comentarios del motor (RF-…, R-…) |
| `design_docs/` | `check:literacy` y `check:playbook` exigen que cada uno esté enlazado en `knowledge/index.md` |
| `knowledge/` (marca, nomenclatura, doctrina, CRM de SLG) | `knowledge/index.md` lo leen `check:literacy` y `check:playbook` |
| `implementation/task_tracker.md` | `check:playbook`: cada unidad `completed` necesita su entrada en `docs/work_log.md` |
| `docs/work_log.md`, `docs/decision_log.md`, `docs/project_memory.md` | El registro de trabajo y decisiones (D-…) que citan los comentarios; `check:playbook` lee `work_log.md` |
| `docs/gates.md` | `check:anexo-d` exige sus trece gates |
| `docs/deployment.md` | `check:literacy` comprueba las variables y los `§…` que cita el README |
| `docs/MANUAL_DEL_SISTEMA.md`, `docs/handoff*.md`, `docs/run_metadata.md` | Estado del primer sitio; nadie los lee |
| `docs/dns_baseline.txt` | `check:dns` (la lista de nombres protegidos es la de SLG) |
| `deliverables/`, `examples/`, `adapters/`, `mcps/` | Material del marco de trabajo, no del sitio |

**Operación de SLG que sí vale para la plantilla**: `scripts/sitio/` nombra el equipo de Vercel y la
organización de Supabase de Softlanding Global porque **es quien aprovisiona** los sitios de sus
clientes. Si la plantilla la usara otra agencia, cambian esas dos constantes (`scripts/sitio/nucleo.ts`).

## 4. Vaciar la herencia sin romper frenos

Si algún día se quiere un repositorio sin rastro del primer sitio, este es el orden. Ninguno de
estos pasos se hizo en el paso 12.

1. **`implementation/task_tracker.md` y `docs/work_log.md`**: sustituirlos por un tracker y un
   registro nuevos, vacíos o con las unidades de la plantilla. `check:playbook` pasa con un tracker
   sin unidades `completed`.
2. **`design_docs/` y `knowledge/`**: borrar lo que sea de SLG (`doctrine-summary.md`,
   `naming-rules.md`, `offer-structure.md`, `brand-tokens.md`, `crm-integration.md`, `style_guide.md`)
   y **quitar sus enlaces de `knowledge/index.md` en el mismo cambio**; lo que quede tiene que seguir
   enlazado.
3. **`docs/gates.md`**: se queda (es del motor); revisar solo que su texto no cite ejemplos de SLG.
4. **`docs/deployment.md`**: reescribirlo para el camino de clientes (Vercel + Supabase) manteniendo
   cada variable de `.env.example` y los apartados que el README cita por `§`.
5. **`docs/decision_log.md`**: conservar las decisiones del motor (D-…) que citan los comentarios del
   código; las de negocio de SLG se pueden archivar.
6. **`check:dns`**: sustituir su lista de nombres protegidos (`crm`, `n8n`, `evolution`, `academy`)
   por los del cliente, o dejarlo fuera de los clientes que no gestionan su DNS aquí.
7. **`planning/`**: archivarlo en otro repositorio; hoy solo lo citan comentarios.

Después de cada paso: `npm run check:ci`.
