---
type: Convención
title: Compuertas del método que este proyecto respeta
description: Las cuatro compuertas vinculantes — Planning Gate, compuerta de copy (FU-01), compuerta de prototipo (C.5) y revisión independiente por milestone — con qué las cierra y qué se rechaza por saltárselas.
tags: [metodo, sdd, icm, compuertas, planning-gate, copy, prototipo, revision]
timestamp: 2026-09-08
sources:
  - "AGENTS.md — Reglas 1, 3, 4, 5, 6; Workflow; Quality Gate"
  - "START_PROJECT.md §1 Constraints, A.3, C.5, C.6, Anexo D, Anexo E, §6"
  - "planning/requirements.md RF-132, RF-133, RF-134, RF-148"
  - "profiles/software-app/profile.md — deliverable_unit_completeness, quality_gate"
---

# Compuertas del método que este proyecto respeta

Este proyecto se produce con especificación primero: **la especificación es el contrato y el código es
su realización**. De ahí salen cuatro compuertas. Ninguna es una buena práctica de trabajo: son
**condiciones de entrada**. Una unidad construida antes de su compuerta **se rechaza aunque funcione**.

---

## 1. Planning Gate — nada se produce antes de aprobar el plan

**Regla 1 de [AGENTS.md](../AGENTS.md): nunca se produce un entregable antes de que el usuario apruebe
el plan.**

- Las decisiones ya tomadas por Ricardo (§10 del brief, 13 filas) **no se re-exploran**.
- Las decisiones de planificación se registran en [decision_log](../docs/decision_log.md), desde
  `D-14`. Una desviación del plan **se documenta antes** de ejecutarse (Identidad, AGENTS.md).
- Corolario de la Regla 4 (control de alcance): se construye **solo** lo pedido. Algo que "parece
  útil" no se añade — se para y se pregunta. En este proyecto eso tiene una traducción concreta y
  frecuente: la web **no** gestiona pipeline, ni añade un segundo CTA, ni guarda estado comercial.
- Corolario de la Regla 7 (sin lock-in de producto): donde Ricardo aún no ha elegido producto, la
  documentación nombra la **categoría** — "el proveedor de correo transaccional", "object storage
  S3-compatible externo, en proveedor distinto del de hosting" — y el sistema se diseña **detrás de un
  adaptador con variables de entorno**, para que la elección sea reversible sin tocar código.

## 2. Compuerta de copy — FU-01, y una sola vez

**El copy maestro bilingüe se produce como una única Foundation Unit (FU-01) y se aprueba en una única
compuerta, antes de construir cualquier unidad de página** (RF-132).

| | |
|---|---|
| **Qué la cierra** | La aprobación de Ricardo sobre el copy maestro ES+EN completo. |
| **Qué se puede hacer antes** | Construir las páginas **contra el esquema de contenido** ([content-schema](content-schema.md)) con el texto marcado `[PENDIENTE: …]`: visible en staging, **prohibido en producción**. |
| **Qué se rechaza** | Una página con copy propio inventado por el agente. Y **una segunda ronda de aprobación de copy**: eso es un cambio de alcance, no un paso del plan. |
| **Por qué existe** | El copy nuevo es el riesgo de calendario más alto del proyecto (§9: probabilidad alta, impacto alto). Concentrarlo en una compuerta evita que cada página abra su propia negociación. |

El copy se redacta desde la fuente de la oferta y del tono; ver [offer-structure](offer-structure.md)
y [doctrine-summary](doctrine-summary.md).

## 3. Compuerta de prototipo — los nueve componentes de C.5, en orden

**Los nueve componentes se diseñan primero y en este orden, y cada uno pasa por prototipo interactivo
aprobado antes de construir ninguna unidad de página** (RF-133).

1. Barra de navegación translúcida + sheet móvil
2. Hero tipográfico
3. Tarjeta de rama/servicio
4. Bloque "Qué incluye" (lista con cifra)
5. **Formulario de descarga**
6. Tarjeta de artículo
7. Pie
8. Shell de app (HQ/portal: barra lateral, tabla, ficha, estado vacío, estado de error)
9. Visor de entregables

**Qué cuenta como prototipo**: un **componente real, navegable con teclado y con gesto**. Una imagen
**no** cierra esta compuerta.

**Excepción de orden dentro del orden** (RF-134): el **formulario de descarga se prototipa y se valida
antes que cualquier otro componente**. Es "el componente que paga el proyecto" y el CTA único de toda
página de servicio. Su prototipo demuestra el camino completo del visitante: validación de correo
corporativo con mensaje **en el idioma de la página**, error en línea, estado de envío, estado
"disponible próximamente" y estado de error del servidor.

Los tokens con que se prototipa están en [brand-tokens](brand-tokens.md); las reglas de motion y las
disposiciones, en [../design_docs/style_guide.md](../design_docs/style_guide.md) y
[../design_docs/ui_wireframes.md](../design_docs/ui_wireframes.md).

## 4. Revisión por milestone — contexto limpio, revisor independiente

Después de cada milestone se ejecuta una revisión con **sesión nueva y contexto limpio** (Workflow de
AGENTS.md). El revisor verifica tres cosas:

- ¿Las unidades entregables completadas funcionan **de extremo a extremo**?
- ¿Se aplicó el quality gate?
- ¿Hay huecos entre el plan y lo producido?

Se registra el uso de tokens del milestone en `docs/run_metadata.md`.

**Cautela vigente**: los scripts de verificación pueden dar falsos verdes (§9). Hasta que estén
corregidos, la revisión **comprueba la completitud a mano** y lo deja registrado.

Los milestones son M0 Fundaciones → M1 Capa pública núcleo → M2 Conversión y contenido → M3 HQ →
M4 Portal → M5 API y go-live. **Orden comercial**: M0→M1→M2 salen a producción **antes** de empezar
M3 — la web vende mientras se construyen las intranets, y `/hq` y `/portal` permanecen ocultos tras
login hasta su milestone.

## 5. Qué se comprueba en cada unidad

- **Quality gate del perfil activo** ([software-app](../profiles/software-app/profile.md)), aplicado
  después de cada FU/DU y otra vez, holísticamente, antes de entregar.
- **Doce gates adicionales del Anexo D** (`D1`…`D12`, más `D2b`): rendimiento público, accesibilidad,
  marca, motion, i18n, fidelidad de contenido, SEO técnico, conversión E2E, identidad E2E,
  aislamiento entre empresas, archivos, operación y literacy. Cada uno se escribe como **checklist
  verificable o script, nunca como prosa** (RF-148).
- **Definición de "hecho" del perfil**: el backend lo soporta, el frontend lo expone, el consumidor lo
  puede hacer de extremo a extremo, hay estados vacíos y de error, y existen pruebas automatizadas en
  los caminos críticos.
- **Lente de revisión de interfaz** (C.6), ocho principios: Propósito · Agencia · Responsabilidad ·
  Familiaridad · Flexibilidad · Simplicidad · Craft · Deleite. Más wayfinding en cada pantalla: dónde
  estoy, a dónde puedo ir, cómo salgo.

## 6. Disciplina de registro y de contexto

- **Documentar sobre la marcha** (Regla 6): `task_tracker` y `work_log` después de **cada** unidad;
  `project_memory` al final de la sesión. No después, no en lotes.
- **Una unidad a la vez.** Terminar la actual antes de empezar otra.
- **Divulgación progresiva**: se carga [index](index.md) primero y se abre un design doc completo solo
  para la sección que hace falta.
- **Modelo por tarea** (§6): razonamiento capaz para planificación, arquitectura y revisión por
  milestone; modelo económico para construir, subiendo de modelo solo si una unidad falla dos veces.
- **Señales de presión de contexto**: 4+ unidades en la sesión, más de 8 archivos leídos, sesión
  compactada, o estar tirando de memoria en vez de releer. Ante cualquiera: terminar la unidad y
  cerrar la sesión.

## Enlaces

- Gobernanza completa → [../AGENTS.md](../AGENTS.md)
- Perfil activo y su quality gate → [../profiles/software-app/profile.md](../profiles/software-app/profile.md)
- Decisiones registradas → [../docs/decision_log.md](../docs/decision_log.md)
- Qué se aprueba en la compuerta de copy → [offer-structure](offer-structure.md), [doctrine-summary](doctrine-summary.md)
- Con qué se prototipa → [brand-tokens](brand-tokens.md)
