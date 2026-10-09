---
type: planning
title: Spec Delta — Página pública del Assessment (PEEx / TEAx / RETx)
project: slg_website
status: APROBADA por Ricardo 2026-10-08 21:30 (D-A1..D-A4 sí; Planning Gate cumplido)
timestamp: 2026-10-08
sources:
  - "HERMES_OVHA/H1_BRIEF_PAGINA_ASSESSMENT.md (hallazgo H-1 del Piloto F1: el agente slg_onboarding exige un enlace de Assessment real y hoy no existe página)"
  - "Ricardo, 2026-10-08: «Assessment sin página» → opción A: Claude lo construye si puede hacerlo al 100 %"
  - "Ricardo, 2026-10-08: D-01 opción B (aprobada con condiciones); C1 = esta página"
---

## Spec Delta v1 — 2026-10-08 — new feature (Assessment público)

### Problema
El onboarding de Hermes envía al participante un enlace al Assessment. Hoy `/empieza-aqui` redirige a la portada y los formularios de n8n responden 401. Sin enlace real, ONB-01 se detiene en G-planning paso 6.

### Alcance
- Rutas: `/assessment` (ES) y `/en/assessment` (EN), pública, HTTP 200, sin redirección.
- Parámetro `?programa=peex|teax|retx` elige el cuestionario. Sin parámetro o con valor desconocido: se muestra PEEx (por defecto) con un selector visible de programa. (Decisión D-A1.)
- Duración visible: 15–25 minutos.
- Envío: reutiliza la máquina existente `registrarCaptura` (honeypot, correo corporativo, privacidad) con un nuevo `Origen` = `assessment`; las respuestas viajan en el campo de datos y llegan al CRM por la cola existente (`lib/crm/cola.ts`). Destino: CRM `clientes`/servicio `slg`. (Decisión D-A2.)
- Después del envío: `/gracias?estado=assessment`.

### Conflictos a resolver (requieren decisión de Ricardo)
1. **DU-10 / página Contacto.** `content/pages/es/contacto.md` dice «No hay formulario de calificación». El Assessment es un cuestionario largo. Propuesta: el Assessment **no califica ni filtra**: es opcional, nadie queda excluido por sus respuestas, y se declara así en el texto de la página. La página de Contacto no cambia.
2. **CTA único.** La página tiene un solo botón: «Enviar mi Assessment».
3. **Datos personales.** Nombre, apellido, correo corporativo obligatorios (como hoy); el resto de campos no es obligatorio, para respetar «comodidad, no filtro».

### Cuestionarios (borrador para aprobar; 10 preguntas por programa, escala 1–5 salvo indicación)
Comunes: pregunta 0 (texto libre, opcional) «¿Qué te gustaría resolver con este programa?».

**PEEx (Phoenix Executive Experience)**
1. ¿Cuánto del trabajo diario de tu equipo ya usa IA de forma habitual? (1 nada – 5 casi todo)
2. ¿Cuántas iniciativas de IA siguen vivas en tu organización y cuántas se pararon? (números)
3. ¿Tu equipo usa herramientas de IA que la empresa no autorizó? (no / algunas / muchas / no sé)
4. ¿Qué tan clara es hoy la política de datos para usar IA? (1–5)
5. ¿Qué proceso crítico se rompería si una persona clave se fuera mañana? (texto)
6. ¿Cuánta autonomía darías hoy a un agente de IA sin supervisión? (ninguna / borradores / acciones reversibles / acciones con dinero)
7. ¿Quién decide hoy sobre inversión en IA? (cargo)
8. ¿Cuál es tu mayor fragilidad operativa actual? (texto)
9. ¿Con qué frecuencia revisas resultados de IA antes de actuar? (1–5)
10. ¿Qué resultado concreto esperas en 90 días? (texto)

**TEAx (Versión Gerencia)**
1. Horas por informe periódico que produce tu área (número)
2. Días de ciclo desde el cierre hasta la entrega del informe (número)
3. Costo aproximado mensual de reporting (número y moneda)
4. Pilotos de IA o automatización activos hoy (número)
5. Urgencias recurrentes que se repiten cada mes (texto)
6. Herramientas contratadas que usa el área (texto)
7. Qué parte del reporting es copiar y pegar (1–5)
8. Quién revisa los informes antes de salir (cargo)
9. Qué error de datos te ha costado más en el último año (texto)
10. Qué informe eliminarías mañana si pudieras (texto)

**RETx (investigar y estudiar con IA)**
1. Fuentes que consultas por tema (número)
2. Cómo sintetizas hoy lo que lees (texto)
3. Cómo verificas una afirmación antes de usarla (texto)
4. Horas semanales de investigación (número)
5. Tasa de error que has detectado en tus entregas (1–5)
6. Cómo entregas lo investigado (texto)
7. Herramientas de IA que usas hoy para investigar (texto)
8. Qué parte de tu flujo es la más lenta (texto)
9. Qué parte quieres conservar sin IA (texto)
10. Qué tema concreto quieres dominar primero (texto)

(Las versiones EN se redactan al aprobar el ES, para pasar `check:pairs`.)

### Tareas de construcción (cuando se apruebe)
1. Contenido: `content/pages/{es,en}/assessment.md` (par `assessment`) y cadenas de UI en `content/ui`.
2. Componente `PaginaDelAssessment` + variantes por programa (datos, no código duplicado).
3. Rutas `app/(public)/assessment/page.tsx` y `app/(public)/en/assessment/page.tsx`.
4. `lib/descargas/service.ts`: añadir `assessment` a `ORIGENES`; `app/api/contacto/route.ts`: admitir y guardar las respuestas.
5. `/gracias`: variante `estado=assessment`.
6. Pruebas: `check:content`, `check:pairs`, `check:paginas`, `check:seo`, `test:capturas`, `check:armazon`.
7. `task_tracker.md` + `work_log.md` + `docs/project_memory.md`.

### Aceptación
1. `/assessment?programa=peex` se ve un formulario, no la portada, con 200.
2. Un envío de prueba llega al CRM como captura con las respuestas.
3. `npm run check:ci` en verde.
4. Piloto: nuevo negocio PEEx pasa G-planning paso 6 con el enlace real.

### Decisiones para Ricardo
- D-A1: parámetro por programa con PEEx por defecto y selector visible (propuesto).
- D-A2: respuestas al CRM `clientes`/`slg` por la cola existente (propuesto), no a n8n.
- D-A3: textos de las 30 preguntas (borrador arriba): aprobar o corregir.
- D-A4: aceptar que el Assessment es opcional y no filtra (compatible con DU-10).
