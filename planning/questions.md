---
type: planning
title: questions
project: slg_website
status: answered
timestamp: 2026-09-08
source: START_PROJECT.md v1.1 (Anexo I) + exploración de repo y fuentes externas
---

# Preguntas de planificación — slg_website

Generado por `init-project` (paso 3). El brief `START_PROJECT.md` v1.1 responde la gran mayoría de
lo que la planificación necesita. Aquí quedan **solo** los huecos, clasificados por si bloquean el
plan o no.

> Criterio: *bloquea el plan* = si se responde distinto, cambia la arquitectura, el stack o la
> descomposición en FU/DU. *No bloquea* = es un insumo de ejecución; el plan lo contempla como
> hueco con estado.

---

## A. Bloqueantes — deben responderse antes de cerrar el plan

Todas son decisiones de stack o de arquitectura que el brief deja **explícitamente abiertas**
(§7 "si falla" / Anexo I). AGENTS.md Regla 7 y paso 5 del playbook exigen que las elija Ricardo,
no el agente.

| # | Pregunta | Por qué bloquea | Ref. |
|---|---|---|---|
| A1 ✅ | **RESUELTA (D-15): servicio transaccional dedicado.** Proveedor concreto se elige en el paso 5. — *Proveedor de correo transaccional* (invitaciones, recuperación de contraseña, avisos a `support@`). | Es una FU de M0 y una dependencia dura de M3/M4 (invitaciones). Cambia variables de entorno, adaptador de envío y el pre-requisito DNS (SPF/DKIM/DMARC). Sin elección no se puede cerrar M0. | §7, F.2-4, Anexo I-8 |
| A2 ✅ | **RESUELTA (D-19): adaptador de dos modos.** — *Endpoint de admisión `POST /api/v1/leads` en el CRM: ¿se ejecuta el `/iterate` del repo CRM antes de M2, o la v1 entrega solo contacto + nota? | Cambia el diseño del DU de captura (M2), el `api_contracts`, el modelo de `lead_capture` y si aparece una dependencia cruzada entre repos en el plan. Es la diferencia entre "un DU" y "un DU + un contrato externo bloqueante". | B.6, Anexo I-9 |
| A3 ✅ | **RESUELTA (D-16): sin desafío de terceros en v1.** — *Desafío anti-bot en formularios*: ¿límite + honeypot + lista de dominios gratuitos es suficiente para v1, o se añade un desafío de terceros? | El brief lo marca literal como "decidir en plan". Un desafío de terceros añade un producto al stack, un script de terceros a la capa pública (gate D1 de rendimiento) y una variable de entorno. | §7, Anexo I-13 |
| A4 ✅ | **RESUELTA (D-20): object storage S3-compatible externo con tramo gratuito.** — *Destino externo de los backups* (base de datos + volúmenes MinIO). | El DoD #8 exige backup *restaurado*. Es una FU de M0/M5 y no se puede escribir sin saber el destino. | §5.1 Operación, Anexo I-11 |
| A5 ✅ | **RESUELTA (D-17): 11 documentos.** — *Descargas: ¿9 u 11?* ¿Customize Programs (D-04) y AI Coaching for Directors (D-05) llevan documento propio? | Dimensiona el DU de descargas de M2 y el número de registros de contenido ES/EN a producir. | A.2, A.4, Anexo I-2 |

---

## B. Asumibles — asumo, lo registro, sigo

Se planifica con estas asunciones. Si alguna es falsa, se corrige con un spec-delta sin rehacer nada.

| # | Hueco | Asunción con la que planifico | Ref. |
|---|---|---|---|
| B1 | Fecha de go-live | No hay fecha fija: criterio "lo antes posible". Los milestones se ordenan por valor comercial (M0→M1→M2 a producción antes de M3). No se estima en fechas, sino en unidades y en orden. | §0, Anexo I-1 |
| B2 | Logo SLG Agency, favicon, imagen OG, Montserrat woff2 | Se construye con el **respaldo que el propio brief define**: wordmark tipográfico "SLG Agency" en Montserrat 700 `--blue-deep`. Los activos entran después sin tocar componentes (son tokens/archivos). | C.3, Anexo I-5 |
| B3 | Texto legal (privacidad, términos) | Es un DU de contenido dentro de M1 con texto `[PENDIENTE]` visible en staging; bloquea el *go-live* y las pantallas OAuth, no la planificación. | F.2-1, Anexo I-6 |
| B4 | URL del calendario de Sesión Cero | Campo en `content/ui/<lang>.json`. El paso existe en el portal (M4) y muestra estado "próximamente" hasta que haya URL. | F.2-6, Anexo I-10 |
| B5 | Credenciales OAuth Google / registro Entra | Pre-requisitos externos en paralelo a M0 (Anexo F.2). El login por contraseña no depende de ellos, así que M0 puede cerrarse con contraseña y los proveedores se activan al llegar las credenciales. | F.2-2/3, Anexo I-7 |
| B6 | Ruta de la ficha de contacto en el frontend del CRM | El enlace profundo se implementa como plantilla configurable por variable de entorno, no hardcodeada. Se confirma en ejecución sin cambiar código. | B.6, Anexo I-9 |
| B7 | Tagline "The discipline of going global" | No se usa en v1 salvo confirmación; el copy maestro (FU-01) lo decide en su compuerta. | Anexo I-5 |
| B8 | Registros DNS del raíz, `www` y `staging` | Se planifican como paso de ejecución de M0 (staging) y M5 (raíz a producción), con la restricción dura de no tocar `crm`, `n8n`, `evolution`, `academy` ni MX. | §7, Anexo I-12 |
| B9 | 11 PDFs de descarga | Se producen fuera de este repo (proyecto SLG_Overhauling). El sistema admite alta sin código y muestra "disponible próximamente" mientras falten. No bloquea ningún DU. | A.4, Anexo I-3 |
| B10 | Spec de copy bilingüe | No es un hueco: **es FU-01 de M1**, con compuerta de aprobación propia antes de construir páginas. | A.3, §9 |

---

## C. Verificado durante la planificación (no son preguntas)

- `~/Dev/SLG_Overhauling/` existe con `SLG Overhauling.md`, `assets/Kit_Marca_SLG_Rojo.md` y `web/`.
- `~/Dev/crm_slg/` existe con `docs/integrations.md` y `design/api_contracts.md` (fuentes de B.6).
- El repo `slg_website` está en el commit inicial `23e893f` con la plantilla APP_Builder v4.1 intacta.
- Perfil `software-app` presente en `profiles/software-app/profile.md`.

---

## Registro

- `2026-09-08` — Generado por `init-project` paso 3 sobre `START_PROJECT.md` v1.1.
- `2026-09-08` — A1, A3 y A5 respondidas por Ricardo → `docs/decision_log.md` D-15, D-16, D-17. A2 y A4 respondidas → D-19, D-20. **Compuerta de preguntas cerrada.**
- `2026-09-08` — Verificación de higiene de credenciales (S-01) anotada como previa a la ejecución. Ver `planning/risks.md` R-08.
