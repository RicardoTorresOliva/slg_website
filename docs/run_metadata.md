---
type: docs
title: Run metadata
project: slg_website
status: active
timestamp: 2026-09-13
---

# Run metadata — slg_website

Consumo de tokens por milestone (AGENTS.md — *Context & Token Management*). Un cambio que sube el
coste de tokens sin beneficio claro se rechaza.

Se anota **al cerrar cada milestone**, junto con la ejecución del playbook `review`.

| Milestone | Fecha | Tokens (aprox.) | Modelo(s) | Notas |
|---|---|---:|---|---|
| Planificación (`init-project`) | 2026-09-08 | **no medido** | — | Se anota para que conste el hueco, no para rellenarlo |
| **M0** — Fundaciones: plataforma, contenido, datos, identidad, correo, archivos y despliegue | 2026-09-12 | **no medido** | — | FU-02…FU-04, FU-06…FU-11 cerradas. **FU-05 sigue `in_progress`**: su mitad de repositorio está verificada y la de infraestructura espera al VPS |
| **M1** — Capa pública núcleo | 2026-09-12 | **no medido** | — | DU-02…DU-06 y FU-01. Gates D1, D3, D4, D5 y D6 en verde |
| **M2** — Conversión y contenido | 2026-09-12 | **no medido** | — | DU-07…DU-12. Gate D7 verde contra dobles; la prueba con el CRM real espera al despliegue |
| **M3** — HQ | 2026-09-13 | **no medido** | — | FU-12, DU-13…DU-17, FU-13. Gates D9 y D10 en verde |
| **M4** — Portal | 2026-09-13 | **no medido** | — | DU-18…DU-21. **No cierra**: el DoD #5 pide aceptar una invitación con Microsoft 365 (F.2-3) |
| **M5** — API y go-live | *en curso* | **no medido** | — | DU-22 y DU-23 cerradas; FU-14 y DU-24 con su parte de código verificada; DU-25 en curso |

## Por qué todas las filas dicen «no medido», y qué hacer con eso

**No se midió, y decirlo es más útil que inventarlo.** El consumo real de tokens de cada sesión lo
conoce la plataforma que la ejecuta, no el proceso que corre dentro: desde aquí no hay forma de leer
el total de una sesión, y menos el de un milestone que abarcó varias. Escribir una estimación habría
sido poner un número que nadie puede comprobar en el documento cuyo propósito es **rechazar gastos que
no se justifican** — exactamente el uso que lo invalidaría.

**Lo que sí se puede hacer, y es de Ricardo:** el panel de facturación de la cuenta da el consumo por
día. Con las fechas de la tabla de arriba —que sí son exactas— el reparto por milestone es una suma.
Cuando tengas esos números, dímelos y los anoto.

**Lo que se mide a cambio, y está en `docs/work_log.md`:** el **coste de contexto** de cada unidad, que
es lo que de verdad se puede controlar desde dentro —cuántos archivos hay que abrir para construir
algo, y si un cambio obliga a leer más que antes—. El `AGENTS.md` mide esa disciplina con el tope de
ocho archivos por sesión, y ese sí se ha respetado.

## Cómo se anota

1. Al cerrar el milestone, ejecuta el playbook `review`.
2. Añade una fila con el total aproximado de tokens de las sesiones de ese milestone.
3. Si el número sube respecto al milestone anterior sin que haya crecido el alcance, la fila lleva
   una nota que lo explique o el gasto se rechaza.
