---
type: docs
title: Run metadata
project: slg_website
status: active
timestamp: 2026-09-12
---

# Run metadata — slg_website

Consumo de tokens por milestone (AGENTS.md — *Context & Token Management*). Un cambio que sube el
coste de tokens sin beneficio claro se rechaza.

Se anota **al cerrar cada milestone**, junto con la ejecución del playbook `review`.

| Milestone | Fecha | Tokens (aprox.) | Modelo(s) | Notas |
|---|---|---:|---|---|
| Planificación (`init-project`) | 2026-09-08 | — | — | No se midió; se anota aquí para que conste el hueco |
| **M0-A** — Fundaciones: plataforma, contenido y despliegue | *en curso* | — | — | FU-02, FU-03, FU-04 `done`; FU-05 `in_progress`. Se cierra cuando FU-05 esté desplegada |

## Cómo se anota

1. Al cerrar el milestone, ejecuta el playbook `review`.
2. Añade una fila con el total aproximado de tokens de las sesiones de ese milestone.
3. Si el número sube respecto al milestone anterior sin que haya crecido el alcance, la fila lleva
   una nota que lo explique o el gasto se rechaza.
