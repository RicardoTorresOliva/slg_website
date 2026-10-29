---
type: planning
title: 00_resumen_ejecutivo
project: slg_website
description: Resumen de una página para Ricardo de la reingeniería del sitio público de SLG. Recoge qué se analizó y cómo, los cinco hallazgos clave, el hero recomendado, el plan por fases con sus unidades, las decisiones pendientes y los datos que tiene que aportar.
tags: [slg, slg_website, planning, reingenieria, resumen]
status: planning
timestamp: 2026-10-27
---

# Reingeniería del sitio de SLG — resumen ejecutivo

**Estado: plan pendiente de tu aprobación.** Detalle en `02` (síntesis), `03` (contenidos), `04` (diseño) y
`05` (crítica, ya aplicada a los planes).

## Qué se analizó y cómo

Se analizaron tres sitios: agenciaia.com.pe, prayaga.biz y el SLG publicado (`origin/develop`, no `main`). Se usó
el método **REA**: cada afirmación es **OBS** (observada, con su Evidence ID), **INF** (inferida) o **UNK** (no
establecida). Hay 201 evidencias en los ledgers `01_*`.

**Límites de la captura.** No hubo ninguna vista renderizada (CDP bloqueado, HTML saneado). La «claridad en 5
segundos» se juzgó **sobre el texto**. Lo visual de las referencias se conoce por su configuración de Elementor y
lo de SLG por su código, así que cómo se ve cada sitio es UNK. Quedaron sin capturar algunas páginas
(`/en`, `/holdings`, `/blog` y `/assessment` de SLG, entre otras). Por eso el plan **mide antes de tocar** y
termina con una prueba con lectores reales.

## Cinco hallazgos

1. **SLG tiene la propuesta más diferenciada de las tres** (decidir sobre IA sin la información de quien vende,
   sin lock-in ni comisiones), **pero no está en la portada**: hoy la portada es el mapa del sitio.
2. **Ninguno de los tres sitios pasa la prueba de 5 segundos** (para quién + problema + resultado + siguiente
   paso). SLG puede pasarla con texto que ya tiene.
3. **Las referencias convencen en sus páginas profundas**, no en la home: precios, «cuándo no invertir», método
   y dolores. La lección es subir la sustancia al primer scroll.
4. **La prueba incoherente resta más que no tener prueba.** SLG no debe competir en volumen. Compite en
   especificidad verificable: las cuatro reglas, las once dimensiones y una postura explícita («por eso aquí no
   hay logos»).
5. **Nadie tiene un método con nombre, fases fijas y compuertas.** Las piezas de SLG coinciden con sus tres
   líneas (Academy → Enterprise → Factory), así que el método puede ordenar toda la oferta. En lo visual no hay
   nada que copiar de las referencias: el sistema de SLG está mejor gobernado y solo necesita coherencia.

## Hero recomendado (borrador; lo apruebas en FU-RC02)

| | ES | EN |
|---|---|---|
| Antetítulo | No vendemos inteligencia artificial. | We do not sell artificial intelligence. |
| H1 | Decide sobre inteligencia artificial con tu información, no con la de quien vende. | Decide on artificial intelligence with your own information, not the seller's. |
| Subtítulo | Trabajamos con directorios y comités de dirección. Te ayudamos a saber qué preguntar, qué exigir y qué no comprar, y la capacidad se queda dentro de tu empresa. | We work with boards and executive committees… and the capability stays inside your company. |
| CTA (único, rojo) | Descargar el documento del diagnóstico (`d-06`, Readiness) | Download the diagnosis briefing |

La alternativa válida, si prefieres tu frase entera como H1: «No vendemos IA. Te ayudamos a decidir cuál comprar,
cuál construir y cuál no.»

## Plan por fases

| Fase | Qué cierra | Unidades |
|---|---|---|
| **0 · Preparar** | Base y medición | Tus decisiones · FU-RC01 (rama desde `develop`, inventario, rama de despliegue) · FU-20 (Lighthouse, capturas y sheet medidos) |
| **1 · Portada** | B-01…B-08: la propuesta en `/` | FU-RC02 (**compuerta de copy**) · FU-RC03 (nomenclatura) · FU-RC04 (registros únicos: método, reglas, postura) · FU-21…23 (tokens, frenos, press) · DU-40/41 (sheet con foco, barra) · DU-42…46 (hero, dolor, independencia, método, entrada) · **DU-RC01 = DU-47** (montaje) · DU-RC02 (mapa en `/empieza-aqui`, `/servicios` por fase) |
| **2 · Interiores** | Método y servicios coherentes | DU-RC03 (`/ai` como método, overviews) · DU-RC04 (22 páginas de servicio en el contrato A.3) · DU-RC05 (Nosotros, Contacto, Gracias) |
| **3 · Verificar** | La propuesta llega | DU-RC06 (prueba de 5 s con 5 lectores por idioma, recorrido completo, accesibilidad 100) |
| Condicionadas | Solo con dato real | DU-RC07 (casos, si hay autorización escrita) · DU-RC08 (duraciones o formatos) |

Reglas fijas: bilingüe con paridad, páginas prerenderizadas, **accesibilidad 100 en lo que se toque**, un CTA por
página, cero carruseles, contadores, logos o agenda, y **ningún `[PENDIENTE]` llega a `develop`, que es
producción** (C-01).

## Decisiones que tienes que tomar

- **Bloquean la fase 1:** **D-1** (devolver la propuesta a `/` y revertir tu decisión del 2026-09-18) · **D-2**
  (marca maestra: SLG Agency, Soft Landing Global o VoltAi by SLG) · **D-3** (nombre del método; de trabajo,
  «Criterio primero») · **D-6** (audiencia primaria: directorios y comités; dónde va RETx) · **D-9** (renombrar
  `SLG_Readiness` y similares o conservar el literal como etiqueta).
- **Pueden esperar:** D-4 (duraciones) · D-5 (precios o formatos) · D-7 (fotografía de cabecera) · D-8 (subir el
  freno de CI a 100).
- **De diseño, con recomendación:** DD-1 hero a 4rem · DD-2 H2 700 `blue-deep` · DD-3 sin rebote · DD-4 tarjetas
  de 16 px · DD-5 *scroll edge* solo si pasa el freno · DD-6 franja oscura para las reglas · DD-7 sin escalonado.
- **Urgente (C-02):** en la rama de trabajo **ya hay implementación sin commit** (portada nueva, copy
  «temporal», sheet, barra y tokens), hecha antes de tu aprobación. Decide si se conserva como vista previa.
  Recomendación: no mergear a `develop` hasta cerrar D-1 y FU-RC02.
- **Alcance (C-18):** confirma si quieres las tres fases o solo la 1 por ahora.

## Datos `[PENDIENTE]` que solo tú puedes aportar

**Mínimo para la fase 1:** **P-03** (trayectoria verificable en 2–3 líneas, con ACP y SelectUSA/SGWIT
desarrollados) · **P-06** (si se pueden publicar los nombres de las once dimensiones) · **P-07** (entregable de
las fases 01, 03 y 04).

**Confirmaciones:** que las tres escenas de dolor salen de tu práctica, porque el titular dice «que vemos» (C-16) ·
que «descartar no es un fracaso: lo entregado es tuyo» es cierto en contrato · el desarrollo de la sigla DAL OS ·
el lector de TEAx (alta dirección o gerentes) · el servicio de entrada de Academy y el de Factory · el lector de
CoO as a Service.

**Opcionales o condicionados:** P-01 (casos autorizados) · P-02 (métricas con fuente) · P-04 (foto propia) · P-05
(clientes publicables) · P-08 (índice de muestra de Readiness) · P-09 (qué construyó SLG para sí misma) · P-10
(quién es el soporte de terceros) · P-11 (duraciones) · P-12 (formato de encargo) · P-13 (si existen en ES y EN las
descargas D-04 y D-05).
