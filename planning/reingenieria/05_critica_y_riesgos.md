---
type: planning
title: 05_critica_y_riesgos
project: slg_website
description: Revisión independiente y escéptica de la síntesis (02), el plan de contenidos (03) y el plan de diseño (04) de la reingeniería. Lista cada problema con su severidad, dónde está y cómo se corrige, deja constancia de lo que se intentó refutar y resistió, y registra las correcciones aplicadas en los planes.
tags: [slg, slg_website, planning, reingenieria, revision, riesgos]
status: planning
timestamp: 2026-10-27
inputs:
  - planning/reingenieria/01_analisis_agenciaia.md
  - planning/reingenieria/01_analisis_prayaga.md
  - planning/reingenieria/01_analisis_slg_actual.md
  - planning/reingenieria/02_sintesis_comparativa.md
  - planning/reingenieria/03_plan_contenidos.md
  - planning/reingenieria/04_plan_diseno_apple_nordico.md
---

# 05 — Crítica y riesgos de la reingeniería

> **Método.** Revisión adversarial: para cada documento intenté refutar (a) hallazgos sin Evidence ID o que piden
> a una captura de texto más de lo que puede dar sobre lo visual; (b) ideas que rompen el estilo nórdico-minimalista
> o meten hype de agencia; (c) `apple-design` como decoración y no como función; (d) datos inventados en lugar de
> `[PENDIENTE]`; (e) alcance que va más allá del encargo; (f) choques entre el plan de contenidos y el de diseño;
> (g) choques con el código: bilingüe, prerender, accesibilidad 100 y los frenos de CI.
>
> Contrasté las afirmaciones con los ledgers `01_*` y con el repositorio (`origin/develop`, `c0ba87c`, y la rama de
> trabajo, que parte de `c89cec3`).
>
> **Severidad.** **Alta**: puede publicar algo incorrecto o saltarse una compuerta. **Media**: contradicción o
> hueco que haría fallar una unidad o confundiría la ejecución. **Baja**: mejora o riesgo menor.
>
> **Estado.** «Corregido» significa que el plan se editó en el sitio, con la nota «Corregido tras crítica (C-NN)».
> «Abierto» significa que la corrección no es de los planes: la tiene que hacer Ricardo o quien ejecute.

---

## 1. Problemas encontrados

| ID | Sev. | Dónde | Problema | Evidencia | Corrección | Estado |
|---|---|---|---|---|---|---|
| **C-01** | **Alta** | 03 §9.0, FU-RC04, DU-RC03/04; 04 §8 | Los dos planes se protegen con «`[PENDIENTE]` visible en staging, prohibido en `main`» (RNF-18). Pero **el sitio publicado se compila desde `develop`** (E-SLG-71), y en `develop` `check:pending` solo **avisa**: sin `--strict` o `CONTENT_STRICT=1` pasa en verde. Un `[PENDIENTE]` mergeado a `develop` llegaría al sitio real | `scripts/content/check-pending.ts` (modo no estricto por defecto); E-SLG-71 | Regla nueva en los dos planes: el `[PENDIENTE]` vive solo en la rama de trabajo y su vista previa. Ningún merge a `develop` sin `CONTENT_STRICT=1 npm run check:pending` en verde y sin la aprobación de FU-RC02 en `decision_log`. FU-RC01 confirma qué rama despliega y que existe vista previa | Corregido (03, 04) |
| **C-02** | **Alta** | Árbol de trabajo (fuera de los planes) | **Hay implementación en curso antes de la compuerta de planificación.** Mientras se revisaba, el árbol de trabajo pasó de 8 a 17 archivos modificados y 4 nuevos: `app/(public)/page.tsx` sirve ya `Propuesta` en vez del mapa, existen `content/pages/es/inicio.md` y `en/home.md` (`copy: temporal`), y cambiaron `SheetMovil`, `BarraDeNavegacion`, `apple.css`, `motion.css`, `tokens.css` y `site.config.ts`. Eso revierte la decisión de Ricardo del 2026-09-18 (D-1) y usa copy no aprobado (FU-RC02), cuando los planes dicen «ninguna unidad se ejecuta hasta la aprobación» | `git status` de la rama `claude/gifted-mccarthy-uz6d54`; 03 cabecera; 04 cabecera; AGENTS.md (Planning Gate) | No se toca código desde esta revisión. Recomendación: que esos cambios **no se mergeen a `develop`** hasta que Ricardo cierre D-1 y apruebe FU-RC02. Si los quiere ver, que sea en una vista previa. Nota a favor: la implementación ya reutiliza `/empieza-aqui` para el mapa (C-06) y amplía `check:cadenas` en vez de relajarlo | **Abierto** (decisión de Ricardo) |
| C-03 | Media | 02 §1 punto 6 y matriz 2.1 | «El sistema visual de SLG ya es superior» compara código de SLG con configuración de Elementor de las referencias. Sin ningún render, eso es superioridad de **sistema**, no de percepción. La frase pedía al texto más de lo que puede dar | E-AIA-49, E-PRY-58, E-SLG-80 | Reformulado como «mejor gobernado (tokens, reglas, frenos)», con la percepción marcada UNK. La fila «Presentación visual» de la matriz se etiqueta «sistema, no render» | Corregido (02) |
| C-04 | Media | 03 DU-RC01 crit. 8, DU-RC06; 04 §6, A1, DU-47 | El encargo pide **mantener la accesibilidad 100**. Los dos planes la dejaban como opción («≥ 95, o 100 si D-8»). Se mezclaban dos cosas: el objetivo de la unidad y el umbral del freno | `check-lighthouse.ts:62-65` (95 por defecto); `01_analisis_slg_actual.md` §16.5; 04 §6 («El encargo pide que el 100 actual se mantenga») | El 100 en las páginas tocadas pasa a ser criterio de aceptación. D-8 queda solo para decidir si `LH_MIN_ACCESSIBILITY` sube a 100 en CI. Si la línea base de FU-20 no da 100, se corrige antes | Corregido (03, 04) |
| C-05 | Media | 03 y 04 (ausente) | Ninguno de los dos planes nombraba el **prerender**. Las páginas públicas son estáticas (`x-nextjs-prerender: 1`) y una portada que lea `cookies()`, `headers()` o `searchParams`, o un escuchador que convierta `ArmazonPublico` en componente de cliente, lo rompería sin que ningún criterio lo detectara | E-SLG-21; `01_analisis_slg_actual.md` §16.6 | Criterio nuevo en 03 (§7.6 punto 9 y DU-RC01) y en 04 (A13): la portada y las páginas tocadas siguen prerenderizadas, y el press delegado es una isla mínima dentro de un `ArmazonPublico` de servidor | Corregido (03, 04) |
| C-06 | Media | 03 §2.2, §7.6, FU-RC01, DU-RC02 | 03 inventaba rutas nuevas (`/mapa`, `/en/site-map`) y redirigía solo `/en/start-here`. Olvidaba el ES `/empieza-aqui`. Además, **las dos rutas ya existen**: en `develop` hacen `permanentRedirect` a `/` y a `/en`. Crear rutas nuevas suma redirecciones y deja huérfano un slug | `develop:app/(public)/en/start-here/page.tsx`; `develop:app/(public)/empieza-aqui/page.tsx` | El mapa vuelve a `/empieza-aqui` y `/en/start-here`: se retira la redirección y no se crea ninguna nueva. `nav.start` conserva el rótulo y cambia de destino | Corregido (03) |
| C-07 | Media | 04 §5 (orden), §5.10, DU-47 | **Choque 03↔04.** 04 dejaba el mapa «Empieza aquí» dentro de la portada, en posición secundaria. 03 lo saca a su ruta | 03 §2.1, §2.2; 04 §5.10 | 04 se alinea con 03: el mapa sale de la portada y se enlaza desde el menú y el pie | Corregido (04) |
| C-08 | Media | 02 P4; 04 §5.5, DU-45 | **Choque 03↔04.** Salidas de la compuerta: 04 decía «Escalar · Ajustar · Descartar» y 03 propone «Avanzar · Ajustar · Descartar». Eso viola el principio de «una sola redacción» (P4) | 03 §5.2; 04 §5.5 | Redacción de trabajo única, «Avanzar · Ajustar · Descartar», leída del registro `metodo`. El texto final lo fija FU-RC02 | Corregido (02, 04) |
| C-09 | Media | 03 §2.1 bloque 9 | **Choque 03↔04.** 03 ponía la Doctrina en «franja oscura» y las reglas aparte. 04 fija **una** franja oscura por página, la de independencia (DD-6). El resultado habrían sido dos bandas oscuras: menos sobrio y la jerarquía diluida | 03 §2.1; 04 §3.4, DD-6 | Doctrina en banda clara (`paper`). Única franja oscura: reglas y postura (bloque 6) | Corregido (03) |
| C-10 | Media | 04 §5.8, DU-47 | **Choque 03↔04 y error de datos.** 04 metía tres tarjetas de línea en la portada, que 03 no tiene: las líneas ya van bajo cada fase del método. Eso duplica la oferta y gasta un viewport. Además, el eyebrow «Fase 0N» es falso para Enterprise, que cubre las fases 02 y 03 | 03 §2.1 bloques 4 y 10, §2.3 | Las tarjetas salen de la portada y se usan en `/servicios` (DU-RC02). Enterprise lleva «Fases 02–03» | Corregido (04) |
| C-11 | Media | 04 §5, §5.5 | **Choque 03↔04.** El orden de 04 (independencia antes del método, antes/después dentro del método) no era el de 03. 04 no trataba tres bloques de 03: quién responde, Doctrina y Holdings. Las filas del antes/después de 04 eran en realidad las columnas de la comparativa de Nosotros | 03 §2.1, §7.4; 04 §5 | 04 adopta el orden de 03. El antes/después es una sección propia con las filas de 03. Se añade 04 §5.11 (quién responde sin foto mientras D-7/P-04 sigan abiertas; Doctrina clara; Holdings en una línea) | Corregido (04) |
| C-12 | Media | 04 §0, §3.6, §4.1, §4.4, DU-45, DU-47 | **Choque 03↔04 y riesgo de decoración.** 03 §5.4 pide «sin animación por fase» y 04 metía un escalonado de 60 ms por fase. El orden ya lo dan los numerales y el `<ol>`. El escalonado era el único movimiento de la página que no hacía falta | 03 §5.4; 04 §4.1 | Sin escalonado por defecto (`--slg-stagger` = 0). Decisión nueva DD-7: solo entra si el prototipo demuestra que ayuda | Corregido (04) |
| C-13 | Media | 04 §5.2, DD-1; 03 §1 | **Choque 03↔04 y supuesto falso.** (1) 04 trataba el eyebrow como etiqueta «para quién» en MAYÚSCULAS +0.08em, y 03 recomienda una frase («No vendemos inteligencia artificial.»): una frase en versalitas espaciadas grita. (2) 04 dimensionaba el hero para «unos 60 caracteres», pero el H1 recomendado tiene unos 82 en ES y el subtítulo unos 170. DD-1 y la condición de 360×740 se apoyaban en ese supuesto | 03 §1 alternativa A; 04 §5.2, DD-1 | El eyebrow-frase va en caja normal y peso 600, y las mayúsculas quedan para etiquetas de 1–3 palabras. El prototipo se hace con el texto real; si no cabe, se acorta el subtítulo en 03, no la escala | Corregido (03, 04) |
| C-14 | Media | 03 §9; 04 §8 | **Doble propiedad de la misma entrega.** DU-RC01 (03) y DU-47 (04) montaban las dos la portada, con criterios distintos. FU-RC01 y FU-20 eran dos «líneas base» sin orden entre sí | 03 DU-RC01; 04 DU-47, FU-20 | Una sola unidad de montaje (DU-RC01 = DU-47), que cierra con los criterios de ambas. Orden: FU-RC01 → FU-20. DU-42…46 producen componentes y DU-RC01 los consume | Corregido (03, 04) |
| C-15 | Media | 03 FU-RC04 crit. 2 frente a §10 | Contradicción interna. FU-RC04 decía que una fase sin entregable no se publica; §10 decía que se publica sin entregable | 03 FU-RC04; 03 §10 | Tres estados del campo: aprobado, `[PENDIENTE]` (bloquea el merge) u omitido de forma explícita (`entregable: null`, se publica sin esa línea) | Corregido (03) |
| C-16 | Baja-media | 03 §2.1 bloque 2 | «Tres situaciones **que vemos** en comités» afirma una práctica observada que nadie ha confirmado. Es una forma suave de prueba inventada. Las escenas son buenas como patrón (E-PRY-27), pero el verbo afirma experiencia | 03 §2.1; P3 | `[PENDIENTE: Ricardo confirma]`. Si no se confirma, el titular no dice «vemos». Ojo: el borrador en curso `content/pages/es/inicio.md` ya usa «que vemos» | Corregido (03); el borrador de código queda abierto |
| C-17 | Baja | 03 §2.1 bloque 0 | 03 cambiaba el menú (quitaba Blog y añadía Inicio y Doctrina) sin evidencia, en contra de 04 §5.1 («cinco destinos»). Es alcance de arquitectura de información que no pide el encargo | `develop:site.config.ts` (menú: start, services, blog, about) | Los destinos no cambian; solo cambia el destino de `nav.start`. Blog→Doctrina queda como decisión aparte | Corregido (03) |
| C-18 | Baja | 03 §9 y 04 §8 en conjunto | **Alcance amplio.** Además de la portada: 22 páginas de servicio, Nosotros, Contacto, Gracias, `/servicios`, `/ai` y tres overviews, sheet v2, barra v2 y frenos endurecidos. Casi todo está justificado (el foco del sheet es un fallo WCAG real), pero es más de lo que hace falta para cerrar B-01…B-08 | 03 §9.5; 04 §8 | No se recorta. Se propone **fasear** (ver el resumen ejecutivo): fase 1 = portada y registros compartidos; fase 2 = servicios y páginas interiores; fase 3 = pulido de interacción. Lo decide Ricardo | Abierto |
| C-19 | Baja | 03 §2.1 | La portada tiene 12 bloques. Con «una idea por viewport» son unos 11 viewports en móvil, una portada larga que bordea el *long-scroll* de agencia | 03 §2.1; 03 §10 | La mitigación de 03 §10 vale (fusionar 7–10 o moverlos a `/ai`). La prueba de 5 s y el recorrido de DU-RC06 deciden | Abierto (se decide con datos) |
| C-20 | Baja | 04 FU-20 | La línea base exige un navegador real (Lighthouse, capturas, grabación a 60 fps). El entorno de los análisis tenía el CDP bloqueado (E-SLG-80), así que la medición tiene que correr en CI o en la máquina de Ricardo | E-SLG-80, 81 | Anotarlo en FU-20 al ejecutarla. No cambia el plan | Abierto |
| C-21 | Baja | 03 §2.4, D-9 | Fase 1 de D-9 (b): titular por resultado y literal con guion bajo como etiqueta. Respeta el freno, pero el visitante sigue viendo `SLG_Readiness` en la página. P8 se cumple a medias hasta la fase 2 | `develop:site.config.ts:149-224` (`nomenclatura`) | Ninguna; es el compromiso correcto mientras Ricardo no decida. Que conste en el resumen | Abierto (D-9) |

---

## 2. Lo que intenté refutar y resistió

- **Datos inventados (d).** No encontré ninguna cifra, cliente, precio ni duración inventados en 03 ni en 04.
  Todo hueco va como `[PENDIENTE: Ricardo, P-NN]` (03 §4). La frase «Descartar no es un fracaso: lo entregado es
  tuyo» ya estaba marcada para confirmación contractual. «SLG Agency Inc., Florida» procede del ledger
  (`01_analisis_slg_actual.md` §14).
- **Afirmaciones sobre el código de 04.** Comprobadas en `origin/develop`: `fontWeight: 500` con solo
  400/600/700 cargados (`BarraDeNavegacion.tsx:101`); `transition` de `color` en varias líneas que el freno no ve
  (`apple.css:118-120`, `check-motion.ts:124`); `will-change: transform` permanente en tarjetas; `:hover` sin
  condición de puntero; `:active` con `scale`; el sheet con `aria-modal` y sin gestión de foco; las «79 páginas»
  del `!important`; contrastes 11,9:1, 5,0:1 y 4,4:1 (`style_guide.md`); umbrales de Lighthouse 90/95/90/90. El
  documento `d-06` existe en ES y EN.
- **Afirmación de 03 sobre D-9.** `check:nomenclature` sí exige los literales con guion bajo y prohíbe
  traducciones (`site.config.ts`, `nomenclatura`).
- **Hype de agencia (b).** Las ideas de las referencias pasan por el filtro de 02 §4 con criterio: se descartan
  sliders, contadores, logos, chats, agenda y vídeo. El hero recomendado es afirmativo y sin superlativos. La
  alternativa C (titular-pregunta) se descarta precisamente por sonar a agencia.
- **`apple-design` como decoración (c).** Fuera del escalonado (C-12), el uso es funcional: press en
  `pointerdown`, simetría del sheet, gestión del foco, sin rebote, sin hápticos, sin parallax, sin librería de
  animación y hero sin animar por ser el LCP. 04 §2.3 rechaza seis apartados de la skill con su motivo. El
  *scroll edge* (DD-5) es opcional y se descarta si el freno no lo acepta sin excepción.
- **Límite de captura (a).** 02 y 04 declaran que no hay render y separan OBS/INF/UNK. La prueba de los 5
  segundos se juzga sobre texto y se traslada a DU-RC06 con lectores reales. La única extralimitación era C-03.

---

## 3. Riesgos residuales (después de las correcciones)

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Ricardo no reabre su decisión del 2026-09-18 (D-1 = no) | Media | Alto: B-01 sigue abierta | 03 §10: se aplica a `/servicios` como destino. La implementación en curso (C-02) tendría que deshacerse |
| Los `[PENDIENTE]` críticos (P-03, P-06, P-07) no llegan | Media | Medio | La portada se publica solo con la prueba disponible hoy (03 §4); los bloques sin dato se omiten, no se rellenan |
| La línea base no da accesibilidad 100 | Desconocida (UNK) | Medio | FU-20 la mide; se corrige antes de cualquier DU visual (C-04) |
| La prueba de 5 s no pasa con el hero A | Media | Medio | Volver a FU-RC02 y probar B; no maquillar (DU-RC06) |
| El trabajo en curso se mergea a `develop` sin compuertas | Media | **Alto** (publicación) | C-01 y C-02: merge solo con `check:pending` estricto y la aprobación de FU-RC02 registrada |
