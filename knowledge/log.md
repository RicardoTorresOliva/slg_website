---
type: Registro
title: Registro del bundle de conocimiento
description: Cronología de altas, cambios y bajas en knowledge/. Una entrada por cada escritura en el bundle.
tags: [okf, log, registro, slg_website]
timestamp: 2026-09-08
---

# Registro del bundle

Formato: fecha · concepto · acción · motivo. Lo más reciente arriba. Obligatorio en **cada** escritura
en `knowledge/` (convención OKF, [README](README.md)).

| Fecha | Concepto | Acción | Motivo |
|---|---|---|---|
| 2026-09-08 | `log.md` | cambiado | Sustituida la fila de ejemplo del template por el registro real. `type` migrado de `log` a `Registro`, uno de los seis tipos permitidos para este proyecto (§8 del brief) |
| 2026-09-08 | `index.md` | cambiado | Sustituido el stub del template por el índice real de divulgación progresiva: siete conceptos y cinco design docs, cada uno con para qué sirve y en qué momento de la producción se necesita. `type` migrado de `knowledge-index` a `Índice` (§8) |
| 2026-09-08 | `naming-rules` | añadido | Nomenclatura literal e intraducible, marca pública (`SLG Agency` vs "Softlanding Global" en contexto `SLG_Holdings`), regla dura de la "D" de DAL OS, tono y notación de origen. Fuente: §1 Constraints, A.1, gate D5 |
| 2026-09-08 | `method-sdd-icm` | añadido | Las cuatro compuertas vinculantes: Planning Gate, compuerta de copy (FU-01), compuerta de prototipo (C.5, con el formulario de descarga primero) y revisión independiente por milestone. Fuente: AGENTS.md, C.5, C.6, Anexos D y E, RF-132…RF-134 |
| 2026-09-08 | `doctrine-summary` | añadido | Lo que el brief afirma de The Phoenix Doctrine y DAL OS, y el tono que imponen. El resumen público completo vive en Docs_MD, fuera de este repositorio: queda marcado `[PENDIENTE]` en vez de inferirse. Fuente: §1 Constraints, §5.1, A.3 |
| 2026-09-08 | `crm-integration` | añadido | Contrato de captura web → CRM: adaptador de dos modos (`contact_note` / `lead_admission`) por variable de entorno, cola de reintentos 1 min→24 h, lectura del tablero con clave de solo lectura y caché de 5 minutos. Fuente: B.6, B.2, D-19, RF-46…RF-57 |
| 2026-09-08 | `content-schema` | añadido | Las seis colecciones de `content/` con ruta y frontmatter mínimo, la regla de paridad ES/EN y su única excepción (`post`), y las cuatro comprobaciones del script de CI. Fuente: B.4, A.5, RF-18…RF-27, RF-128, RF-135…RF-141 |
| 2026-09-08 | `brand-tokens` | añadido | Tokens de color con contraste medido, tipografía Montserrat, materiales y las seis prohibiciones duras del kit que verifica el gate D2b. Fuente: Anexo C (C.1–C.3), §10-4, gates D2 y D2b |
| 2026-09-08 | `offer-structure` | añadido | Las dos ramas, las tres líneas de `SLG_AI`, las 11 páginas con documento `D-01`…`D-11` y el contrato de seis secciones de la página de servicio. Fuente: §1, A.1, A.2, A.3, A.4, D-17 |
| 2026-09-08 | (bundle) | montado | Paso 9 del playbook `init-project`: montaje inicial del bundle OKF de `slg_website`. Siete conceptos destilados del brief v1.1 (no copiados), más índice y registro. Tipos usados, todos dentro de los permitidos por §8: `Concepto` (3), `Convención` (4), `Índice` (1), `Registro` (1) |

## Notas de este montaje

- **Nada inventado.** Lo que el brief no dice quedó marcado `[PENDIENTE: …]` en el concepto que
  corresponde, con la referencia de dónde debería venir el dato.
- **Cuatro de los cinco design docs no existen todavía** (solo `ui_wireframes.md`). El índice los
  enlaza igual, con su estado declarado, para que el enlace funcione en cuanto se escriban y para que
  ninguna sesión futura los busque a ciegas.
- **Categorías, no productos** (AGENTS.md Regla 7) para el proveedor de correo transaccional (`D-15`)
  y para el object storage de backups (`D-20`), ambos diseñados detrás de un adaptador con variables
  de entorno.

## 2026-09-08 — Cierre de la fase de diseño

- Los **cinco** `design_docs` del perfil `software-app` quedan escritos: `data_model` (HIGH),
  `api_contracts` (HIGH), `ui_wireframes` (MEDIUM), `architecture` (MEDIUM), `style_guide` (LIGHT).
  `index.md` actualizado: las cuatro filas que decían `[PENDIENTE: no existe todavía]` ahora
  declaran el estado real y para qué sirve cada uno.
- **Corrección a la entrada anterior de este log.** Decía "categorías, no productos" para el correo
  transaccional (`D-15`) y el object storage de backups (`D-20`). Era cierto al escribirla y dejó de
  serlo el mismo día: Ricardo eligió **Resend** (`D-22`) y **Cloudflare R2** (`D-21`) en HITL.
  Nombrarlos **no** viola la Regla 7 — esa regla prohíbe nombrar productos que el usuario no haya
  elegido. Ambos siguen diseñados detrás de un adaptador con variables de entorno, que era el punto.
- Decisiones posteriores que corrigen el brief y que cualquier sesión futura debe conocer antes de
  producir: `D-23` (el correo corporativo permanece en Microsoft 365; no hay migración) y `D-24`
  (subdominio de envío dedicado; el SPF de la raíz no se toca). Consecuencia: todo texto que afirme
  que el remitente es exactamente `support@softlandingglobal.com` está desactualizado.

## 2026-09-08 — Decisiones D-43, D-44 y D-45

- **`brand-tokens.md` editado** por **D-44**: la fila de `--cyan` deja de admitir el anillo de foco de
  una sola capa. El anillo pasa a ser de **dos capas** — exterior `--cyan` (#50B4DC), interior
  `--blue-primary` (#2878B4) o `--ink`. Motivo: el cyan sobre `--paper` mide 2,4:1 y no cumple RNF-05
  ni el gate D2, pese a que el Anexo C.1 del brief lo lista entre los usos de anillo de foco. Las dos
  capas conservan la intención cromática del kit y añaden el contraste que faltaba: es una precisión
  del kit, no una contradicción con él.
- **`index.md` actualizado**: ahora enlaza `design_docs/design_summary.md`, que faltaba. Es el
  documento que consolida decisiones, conflictos y huecos de los cinco design docs; sin ese enlace era
  invisible para el índice que se carga en todas las sesiones.
- Sin efecto sobre este bundle, pero deben conocerse antes de producir: **D-43** (monitorización
  externa fuera del VPS; n8n queda como señal secundaria) y **D-45** (el visor de entregables HTML se
  sirve desde un **origen separado**, con `iframe sandbox` y CSP estricta como defensa en profundidad).
