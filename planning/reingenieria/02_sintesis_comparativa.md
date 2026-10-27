---
type: planning
title: 02_sintesis_comparativa
project: slg_website
description: Síntesis cruzada de los tres análisis REA (agenciaia.com.pe, prayaga.biz y el SLG publicado). Contiene la matriz comparativa, los mecanismos que convencen en cada referencia, el filtro de identidad de SLG, las brechas ordenadas por impacto y los principios de la reingeniería.
tags: [slg, slg_website, planning, reingenieria, benchmark, sintesis]
status: planning
timestamp: 2026-10-27
inputs:
  - planning/reingenieria/01_analisis_agenciaia.md   # ledger E-AIA-01…57
  - planning/reingenieria/01_analisis_prayaga.md     # ledger E-PRY-01…60
  - planning/reingenieria/01_analisis_slg_actual.md  # ledger E-SLG-01…84 (estado = origin/develop)
---

# 02 — Síntesis comparativa: agenciaia · prayaga · SLG actual

> **Cómo leer este documento.**
>
> - Todas las afirmaciones remiten a los ledgers de los tres análisis: **E-AIA** (agenciaia.com.pe / Automaxia),
>   **E-PRY** (prayaga.biz) y **E-SLG** (softlandingglobal.com publicado = `origin/develop`). Esta síntesis no añade
>   capturas nuevas.
> - Se mantiene la separación del método REA. **OBS** es lo observado en una captura o en el código, con su Evidence ID.
>   **INF** es lo inferido a partir de observaciones; aquí lo son todas las comparaciones, valoraciones, rankings y
>   recomendaciones. **UNK** es lo no establecido.
> - **Límite común a los tres sitios.** No hay ninguna captura de pantalla ni vista renderizada (CDP bloqueado, HTML
>   saneado). La «claridad en 5 segundos» se juzga **sobre el texto de la primera pantalla**, no sobre el render. La
>   presentación visual de las referencias se conoce por la configuración de Elementor, y la de SLG por su código
>   (E-AIA-49, E-PRY-58, E-SLG-80).
> - Condición previa heredada del análisis de SLG: **toda reingeniería parte de `origin/develop`**, que es lo que está
>   publicado (167 commits por delante de `main`), y no de la copia local (E-SLG-41, E-SLG-71, §0 de `01_analisis_slg_actual.md`).

---

## 1. Resumen ejecutivo (INF)

1. **SLG tiene la propuesta de valor más diferenciada de las tres, pero no la tiene en la portada.** Ayuda a
   directorios y comités a decidir sobre IA sin depender de la información del vendedor, sin lock-in y sin comisiones
   (E-SLG-04, 12, 16, 17). Las dos referencias tienen propuestas genéricas («agilidad», «decisiones accionables»)
   pero visibles (E-AIA-02, E-PRY-01). La portada de SLG es un mapa del sitio (E-SLG-01).
2. **Ninguno de los tres sitios pasa la prueba de los 5 segundos** (para quién + problema + resultado + siguiente
   paso). Prayaga es el que más se acerca, porque su H1 es un dolor (E-PRY-05).
3. **Las referencias convencen en sus páginas profundas, no en la home.** Lo mejor de agenciaia está en un post del
   blog y en la página de consultoría: precios, escalera de entrada, «cuándo no invertir» y criterios de salida
   (E-AIA-28…32, 36). Lo mejor de Prayaga está en la plantilla de servicio: dolores, escena, tipología y método
   01–04 (E-PRY-26…31). La lección es estructural: **subir la sustancia a la primera pantalla y al primer scroll**.
4. **La prueba incoherente resta más que la ausencia de prueba.** Contadores que no cuadran (23 países en 3 años;
   2001 / 2009 / +20 años) y cifras sin fuente debilitan todo lo demás (E-AIA-12, 33; E-PRY-11, 28, 36). SLG no
   puede ni debe competir en volumen de prueba (E-SLG-12, 56). Sí puede competir en **especificidad verificable y
   coherencia**.
5. **El método es el hueco más fácil de ocupar.** Agenciaia tiene cinco métodos sin nombre (E-AIA-44). Prayaga
   tiene uno sin nombre, sin duración y ausente de la home (E-PRY-31). SLG tiene las piezas (secuencia, compuertas,
   reglas) pero no las ha nombrado ni dibujado (E-SLG-10, 16, 17). Además, la secuencia de SLG coincide con sus tres
   líneas de oferta (ver §4, M-SLG-05), así que **el método puede ser la columna que ordene toda la oferta**.
6. **El sistema visual de SLG está mejor gobernado que el de ambas referencias** (tokens, reglas y frenos leídos en
   el código, E-SLG-48…51, frente a configuración de Elementor). *Corregido tras crítica (05, C-03):* esto compara
   **sistema**, no percepción; cómo se ve cada sitio renderizado es UNK (E-AIA-49, E-PRY-58, E-SLG-80). De ellas no hay que adoptar
   nada visual, salvo el número grande como encabezado de fase y la idea de un antes/después estático. Hay que
   rechazar su forma de agencia: sliders, flip-boxes, carruseles autoplay, contadores, muros de logos y vídeo de fondo.

---

## 2. Matriz comparativa

### 2.1 Valoración sintética (INF)

Escala: **Fuerte / Media / Débil**. Es un juicio comparativo que se apoya en la matriz 2.2. Ninguna celda se
apoya en un render.

| Dimensión | agenciaia | prayaga | SLG actual |
|---|---|---|---|
| Propuesta de valor | Débil | Media-débil | **Fuerte en contenido, débil en ubicación** |
| Claridad en 5 segundos | Media (solo la categoría) | Media (problema sí, destinatario no) | **Débil** (la portada es un mapa) |
| Oferta / empaquetado | Débil (inflada; fuerte solo en el post) | Débil-media | Media (estructurada, nombres internos) |
| Prueba | Débil (abundante, no verificable) | Media (nombres sin cifras) | Débil (ausente por política) |
| Método | Débil (5 versiones) | Media (1 versión, incompleta) | Media-débil (piezas sin nombre) |
| CTAs | Débil (único y tardío) | Débil (≥12 en 5 canales) | Media (sana, pero falta en la portada) |
| Tono | Débil (hype con islas sobrias) | Media | **Fuerte** (con huecos de hype y jerga) |
| Presentación visual *(sistema, no render; corregido tras crítica)* | Débil (configuración) | Débil (configuración) | **Fuerte** (código, con deriva) |
| Confianza | Débil (la higiene la destruye) | Media | Media (contenido fuerte pero disperso) |

### 2.2 Matriz detallada

| Dimensión | agenciaia (Automaxia) | prayaga | SLG actual (`develop` publicado) | Lectura cruzada (INF) |
|---|---|---|---|---|
| **Propuesta de valor** | OBS: H1 «Agencia de IA en Perú»; H2 «Automatización con IA hecha a la medida que potencia la agilidad de las empresas» (E-AIA-02). La audiencia (CEOs, CTOs, empresarios) aparece en la 2.ª sección (E-AIA-05). INF: escrita para SEO (E-AIA-53). | OBS: hero en slider de 2 mensajes, «Datos en decisiones accionables» / «Datos conectados, sin fricción» (E-PRY-01, 04). El `<title>` habla de «automatización» (E-PRY-48). El H1 real es el dolor «¿Tus datos están frenando tus decisiones?» (E-PRY-05). INF: no dice para quién (E-PRY-50). La FAQ incluye la pregunta «No termino de entender lo que ofrecen» (E-PRY-21). | OBS: en `/`, «Empieza aquí», mapa del sitio (E-SLG-01). La propuesta real está en `/servicios`: «No vendemos inteligencia artificial. Construimos juntos tu futuro con ella.» + «directorios y comités de dirección que… no quieren hacerlo con la información que da quien vende» (E-SLG-04). Antes era «Ayudamos a comprarla» (E-SLG-40). La meta de `/servicios` es la frase más concreta: «qué preguntar, qué exigir y qué no comprar». | SLG es la única con un **diferenciador de posición** (independencia frente al vendedor). Las referencias solo declaran una categoría. El problema de SLG es de **ubicación y de nitidez del resultado** («tu futuro»), no de idea. |
| **Claridad en 5 segundos** (sobre el texto, sin render) | INF: se entiende *qué tipo de empresa es* (agencia peruana de automatización). No se entiende por qué elegirla ni qué hacer después: el hero no tiene botón (E-AIA-04). | INF: se entiende el problema (datos fragmentados) y hay CTA de diagnóstico (E-PRY-02, 03). No se entiende para quién. El mensaje cambia cada 5 s (E-PRY-51). | INF: en `/` no se entiende qué hace SLG, solo qué contiene el sitio (E-SLG-70). En `/servicios` se entiende para quién y el problema implícito; el resultado queda vago. | Nadie reúne las cuatro piezas. Prayaga demuestra que **un dolor en el H1** basta para que el lector se reconozca. SLG puede llegar a las cuatro con texto que ya tiene. |
| **Oferta / empaquetado** | OBS: home con 4 áreas funcionales (E-AIA-07). Unas 24 landings: 9 servicios + 15 agentes «Max*» (E-AIA-40, 56). Rangos en soles, auditoría de 5 días y MVP en 30–60 días **solo en un post** (E-AIA-28, 30). | OBS: 6 «líneas de negocio» por disciplina técnica, IoT incluido (E-PRY-07, 08). Sin paquetes, plazos ni precio. Modularidad explicada en la FAQ (E-PRY-22). El «diagnóstico» se menciona pero no se define (E-PRY-03). | OBS: 1 eje VoltAi (Academy 5, Enterprise 2, Factory 3) + Holdings como servicio suelto (E-SLG-44). Un documento descargable por servicio (E-SLG-09). Sin precio, niveles ni duración visibles. Nombres internos: `SLG_Readiness`, PEEx/TEAx/RETx, «Army of Agents» (E-SLG-46). | Las tres ordenan la oferta **desde dentro** (área, disciplina, línea) y no desde la decisión del comprador. Solo agenciaia responde «qué compro primero, cuánto dura y cuánto cuesta», y lo hace en el blog. |
| **Prueba** | OBS: contadores sin fuente (3 / 43 / 130 / 13 / 23) (E-AIA-11, 12). 48 logos de tecnología (E-AIA-15). Estadísticas de mercado bajo «Resultados Reales» (E-AIA-41). 3 casos anónimos con payback, en el blog (E-AIA-29). Sin clientes, testimonios ni fundadores (E-AIA-35). INF: incoherencias internas (150 proyectos frente a 130 clientes) (E-AIA-33). | OBS: 5 casos con cliente nombrado, sector y país, sin cifra de resultado (E-PRY-13, 16). Contadores +20 / +80 / +250 en contradicción con «Desde 2009» y «En el 2001» (E-PRY-09, 11, 17, 36). «Hasta 40%» sin fuente (E-PRY-28). Equipo con nombre y cargo (E-PRY-12). Logos con identidad UNK (E-PRY-18). | OBS: ninguna, por política («no publicamos una cifra, un caso ni un nombre de cliente sin autorización escrita») y por freno de CI (E-SLG-12, 56). Sustitutos: doctrina escrita, «Cliente Cero», «once dimensiones… se entregan las once» y el fundador al final de `/nosotros` (E-SLG-13, 14, 15, 20). | Las referencias muestran que **la prueba incoherente resta**. SLG no tiene prueba que mostrar, pero tiene **especificidad** (entregables, reglas, doctrina) y una postura que explica la ausencia. Ambas están escondidas. |
| **Método** | OBS: cinco versiones distintas y sin nombre (home 4, consultoría 4, agentes 4, automatización 5, blog 3) (E-AIA-44). Presentado en flip-boxes y carruseles (E-AIA-10, 39). Duración solo en el blog (E-AIA-30). Criterios de salida «escalar, ajustar o descartar» en consultoría (E-AIA-36). | OBS: 01 Evalúa y Planifica → 02 Construye e Inicia → 03 Accede y Automatiza → 04 Soporte Continuo, idéntico en todas las páginas de servicio. Sin nombre, duración, entregable ni criterio de salida. Ausente de la home. Orden en el DOM 01-02-04-03 (E-PRY-31, 32). | OBS: piezas sin nombre. Secuencia «criterio → diagnóstico/arquitectura → construcción» (E-SLG-10), «compuerta de aprobación tuya» por fase (E-SLG-16), cuatro reglas (E-SLG-17). La misma regla aparece redactada de dos maneras (E-SLG-16 frente a 17). No está dibujado. | Nadie tiene un método **con nombre, fases fijas, entregable, compuerta y la misma forma en todas las páginas**. Es el hueco competitivo más barato de ocupar. |
| **CTAs** | OBS: un único CTA real, un formulario de LeadConnector en la sección 14 de 16 con el texto «Déjanos tus datos» (E-AIA-18). Los botones del cuerpo son «Leer más» (E-AIA-19). Las ofertas de entrada (piloto, reunión gratuita, auditoría) no tienen botón (E-AIA-25, 30). Popup del header: UNK (E-AIA-20). | OBS: ≥12 CTA con 5 mecanismos: formulario de 5 campos + reCAPTCHA, chat HubSpot, chat IA «Gloria», WhatsApp y «Agenda» que apunta a `#` (E-PRY-20, 37, 39, 40, 41; recuento INF E-PRY-43). El formulario está antes que la prueba (§4 del análisis). | OBS: descarga a cambio de correo corporativo, en botón rojo, único uso del rojo (E-SLG-09). «Escríbenos», «Pedir el documento». `/` no tiene CTA de conversión (E-SLG-03). Calendarios y «Sesión Cero» prohibidos por freno (E-SLG-56). | SLG tiene la **disciplina de CTA más sana**: uno por página y valor a cambio. Le falta en la portada y le falta que la oferta de entrada tenga nombre. Las referencias fallan por tardanza (agenciaia) o por dispersión (Prayaga). |
| **Tono** | OBS: comercial-aspiracional: «La IA ya no es una opción…», «Fuerza de Trabajo Digital» (E-AIA-06, 09). Islas sobrias: «No implementamos tecnología por sí misma», «No todos los proyectos IA tienen sentido financiero» (E-AIA-57, 32). FAQ de relleno SEO (E-AIA-21). | OBS: tuteo comercial. Consultivo en los dolores y genérico en lo institucional («la mejor empresa consultora») (E-PRY-06, 35). Jerga en inglés y erratas (E-PRY-23, 27). | OBS: consultivo, anti-venta, aforístico: «Publicamos criterio, no novedades», «Empezar por el final (la IA) es la forma más cara de descubrir que no hacía falta» (E-SLG-24, 10). Hype puntual: Volta, «poner la inteligencia en movimiento», «Construimos juntos tu futuro» (E-SLG-11, 04, 47). Jerga propia y Spanglish (E-SLG-46). Reglas internas en el copy público (E-SLG-06). | SLG tiene **la mejor voz** de las tres. Sus fallos son de **vocabulario interno**, no de registro. Las mejores frases de agenciaia son justo las que suenan como SLG. |
| **Presentación visual** | OBS (configuración): Elementor, 16 secciones, 60 imágenes, vídeo de YouTube de fondo, `fadeIn` ×37, flip-boxes, tabs, comparador antes/después, acento `#FF8800` en 14 H2 (E-AIA-04, 17, 46, 47, 48). Tipografía UNK (E-AIA-49). | OBS (configuración): Elementor, 14 secciones, 17 flip-boxes, 4 carruseles en autoplay de 5 s, 2 mapas, vídeo. Solo se conocen azules inline (E-PRY-51…57). Tipografía UNK (E-PRY-58). | OBS (código): Montserrat autoalojada, 9 colores tokenizados, rojo solo para la descarga, radios 12/16/24, reveal de 8 px una sola vez, tres preferencias del sistema respetadas, sin carruseles, tabs ni acordeones (E-SLG-48…51). Deriva: foto de cabecera en cada página frente a la guía («las cifras sustituyen a la fotografía») y escala del hero distinta de la guía (E-SLG-52, 53, 54, 60). Render: UNK (E-SLG-80). | SLG está muy por encima en sistema. Las referencias solo aportan **dos ideas visuales**: número grande como encabezado de fase (E-PRY-31) y antes/después como concepto (E-AIA-17), este último en forma de diagrama estático. |
| **Confianza** | OBS: reversión de riesgo enterrada (piloto de bajo riesgo, reunión exploratoria gratuita, auditoría gratuita, revenue share) (E-AIA-25, 30, 31). «¿Cuándo No Invertir en IA?» (E-AIA-32). Higiene que destruye: tres marcas, «agencia SEO Bogotá», placeholders, WhatsApp +51 999 888 777 (E-AIA-21, 22, 23, 34). | OBS: doble presencia física con dirección y horario (E-PRY-42). Fundadores e historia de origen (E-PRY-11, 12). FAQ de modularidad (E-PRY-22). Descuidos: meta copiadas, «siete» frente a seis líneas, blog parado desde 2022 (E-PRY-44…47). | OBS: reversión de riesgo fuerte (sin lock-in, stack del cliente, compuertas, capacidad transferida, sin licencias ni comisiones), repartida entre `/nosotros` y cada servicio, nunca en la portada (E-SLG-12, 16, 17). Defectos: «Sin formulario» encima de un formulario, backticks literales, etiqueta «empresa_web», tres marcas (E-SLG-06, 18, 19, 25, 45). | El patrón común es que **la confianza se pierde por incoherencias pequeñas**. SLG tiene el mejor contenido de confianza de las tres y corre el mismo riesgo de higiene (marca, nomenclatura, artefactos de render). |

---

## 3. Lo mejor de cada una: mecanismos, no adjetivos

Cada mecanismo dice **qué hace** en la página y **por qué convence** (INF). La evidencia es OBS salvo que se indique
otra cosa. El ID `M-…` se usa en el filtro de §4.

### 3.1 agenciaia.com.pe

Observación transversal (INF): casi todos sus mecanismos fuertes viven en **una subpágina o un post**, no en la home.
Su poder de convicción es latente.

| ID | Mecanismo | Cómo funciona | Por qué convence (INF) | Evidencia |
|---|---|---|---|---|
| M-AIA-01 | **Ancla de inversión en la moneda del comprador** | Rangos por tipo de proyecto y escala (p. ej. chatbot S/ 8.000–15.000; supply chain S/ 80.000–150.000) | Quita la incertidumbre más fuerte antes del contacto y habla «en soles» porque así decide el empresario local | E-AIA-28 |
| M-AIA-02 | **Escalera de entrada acotada en tiempo** | Auditoría gratuita de 5 días → MVP en 30–60 días → implementación escalonada | Cada peldaño es pequeño, tiene plazo y deja salir; baja el coste de decir «sí» la primera vez | E-AIA-30 |
| M-AIA-03 | **Renuncia explícita: «¿Cuándo No Invertir en IA?»** | Lista de red flags en la que la agencia desaconseja comprar | Quien dice cuándo no comprarle gana credibilidad sobre todo lo demás que dice | E-AIA-32 |
| M-AIA-04 | **Criterio de salida de piloto con tres resultados** | «escalar, ajustar o descartar» como cierre definido de cada prueba de concepto | Convierte el piloto en una decisión gobernada, no en un gasto abierto | E-AIA-36 |
| M-AIA-05 | **Priorización por ROI por caso de uso** | Se cuantifica el impacto de cada caso antes de decidir qué escalar | Responde la pregunta del comité («¿por qué este primero?») | E-AIA-37 |
| M-AIA-06 | **Ficha de caso con línea base y payback** | Situación → inversión → métrica → recuperación (3,2, 8 y 11 meses), aunque anónima | La estructura cierra el círculo problema → intervención → número | E-AIA-29 |
| M-AIA-07 | **El lector nombrado por rol** | Cada landing nombra COO, CFO, RR. HH. o directores de marketing | Permite autoseleccionarse sin interpretar | E-AIA-05; capturas AU y C |
| M-AIA-08 | **Entregables enumerados** | «diagnósticos de procesos, mapas de implementación, modelos…, capacitación y métricas» | El comprador de consultoría compra entregables, no horas | E-AIA-54 |
| M-AIA-09 | **Principios de oficio** | «Data First», «Seguridad por diseño», «liberando por fases», «línea base antes/después» | Demuestran competencia sin adjetivos | E-AIA-39, E-AIA-10 |
| M-AIA-10 | **Comparativa frente a alternativas** | Tabla contra «Consultorías Grandes» y «Freelancers IA» | Ancla la oferta contra lo que el comprador ya considera. **En su forma actual es un strawman** (E-AIA-13) | E-AIA-13 |
| M-AIA-11 | **Reversión de riesgo con nombre** | «piloto de bajo riesgo», «reunión exploratoria gratuita», revenue share | Transfiere el riesgo del cliente a la agencia | E-AIA-25, E-AIA-31 |
| M-AIA-12 | **Fase posterior al despliegue** | «Validación, Ajustes y Acompañamiento» como fase del método | Responde la objeción «implementan y se van» | E-AIA-10 |

### 3.2 prayaga.biz

Observación transversal (INF): su fuerza es la **plantilla repetible** de las páginas de servicio y la
**identificación por dolor**. Su debilidad es que nunca nombra al destinatario.

| ID | Mecanismo | Cómo funciona | Por qué convence (INF) | Evidencia |
|---|---|---|---|---|
| M-PRY-01 | **Dolor como H1, justo después del hero** | «¿Tus datos están frenando tus decisiones?» + 4 dolores en lenguaje de cliente | El lector se reconoce antes de que le vendan nada | E-PRY-05, 06 |
| M-PRY-02 | **Dolor-escena** | «Ventas dice 100, finanzas dice 90» | Una escena verificable de la vida del comprador vale más que cinco abstracciones | E-PRY-27 |
| M-PRY-03 | **Plantilla fija de página de servicio** | desafíos → por qué → beneficios → tipología → método → casos → cierre | El lector aprende a leer el sitio una vez, y la repetición transmite método | E-PRY-26…31 |
| M-PRY-04 | **Tipología en escalera de madurez** | Descriptiva → Diagnóstica → Predictiva → Prescriptiva | Funciona como autodiagnóstico: el lector se ubica solo | E-PRY-29 |
| M-PRY-05 | **Método único con números grandes** | 01–04 con H3 numérico, idéntico en todas las páginas de servicio | La consistencia transmite práctica real, justo lo contrario que E-AIA-44 | E-PRY-31 |
| M-PRY-06 | **Ficha de caso con identidad** | Cliente nombrado + sector + país + resultado narrado | Es verificable por terceros, algo que un contador no permite | E-PRY-13 |
| M-PRY-07 | **Rostro y origen** | Fundadores con nombre, «¿Cómo nació PRAYAGA?», metáfora «conexión de ríos» | Humaniza y da un relato que se recuerda | E-PRY-10, 11, 12 |
| M-PRY-08 | **FAQ que desactiva el miedo a la compra grande** | «¿Es necesario adquirir la totalidad…?» — «Cada línea de negocio es independiente» | Reduce el tamaño percibido de la primera decisión | E-PRY-22 |
| M-PRY-09 | **Presencia física verificable** | Lima + Coral Gables, dirección, teléfonos y horario | Da solidez y la hace comprobable | E-PRY-42 |
| M-PRY-10 | **CTA que nombra un producto de entrada** | «Inicia tu diagnóstico de Data & AI» | Da algo concreto que pedir. **El producto, sin embargo, no se define** (E-PRY-03) | E-PRY-03 |
| M-PRY-11 | **Casos de uso por área funcional** | «¿Dónde genera más impacto la IA en tu negocio?» → 4 áreas | Lleva la IA a lugares que el comprador reconoce en su organigrama | E-PRY-30 |

### 3.3 Activos propios de SLG que ya convencen (base que se conserva)

No proceden de las referencias, pero el filtro y los principios dependen de ellos.

| ID | Activo | Evidencia |
|---|---|---|
| M-SLG-01 | Posición de independencia: decidir sobre IA sin la información del vendedor | E-SLG-04 |
| M-SLG-02 | Cuatro reglas no negociables (sin lock-in, agnósticos, compuertas, capacidad dentro) + sin licencias ni comisiones | E-SLG-12, 16, 17 |
| M-SLG-03 | Voz aforística anti-venta («Publicamos criterio, no novedades»; «Lo que hay que dejar de hacer pesa más…») | E-SLG-08, 10, 24 |
| M-SLG-04 | Entregable con integridad: «once dimensiones, y se entregan las once» | E-SLG-15 |
| M-SLG-05 | Secuencia «criterio → diagnóstico/arquitectura → construcción». INF: coincide con las tres líneas (Academy «formar criterio» → Enterprise/Readiness, que es el diagnóstico → Factory, que es la construcción) (E-SLG-25, 44) | E-SLG-10, 25, 44 |
| M-SLG-06 | Holdings: «un punto único de responsabilidad… la diferencia con contratar cinco asesorías» (una comparativa honesta en germen) | E-SLG-07 |
| M-SLG-07 | Un CTA por página, documento a cambio de correo corporativo; el rojo reservado para él | E-SLG-09, 56, 58 |
| M-SLG-08 | Sistema sobrio y accesible: tokens, foco de dos capas, reveal de 8 px una vez, preferencias del sistema | E-SLG-48…51 |
| M-SLG-09 | Información generada desde la ficha (`site.config.ts`) y ~40 frenos de CI (copy, contraste, motion, JS, SEO) | E-SLG-43, 56, 61 |
| M-SLG-10 | «Cliente Cero»: lo construyeron para sí mismos antes de venderlo | E-SLG-13 |

---

## 4. Filtro SLG

**Criterio del filtro.** Cada mecanismo se juzga contra cuatro cosas:
(a) la **identidad sobria nórdico-minimalista**: una idea por viewport, contenido visible, sin movimiento automático ni
clichés de IA (RNF-44, E-SLG-55);
(b) el **posicionamiento consultivo e independiente** (E-SLG-04, 12);
(c) las **restricciones técnicas y de copy vigentes**: `check:copy` sin cifras, importes ni casos sin respaldo, sin
agenda ni «Sesión Cero», CTA único de servicio = descarga, rojo solo para la descarga, `check:motion`, sin terceros
(E-SLG-56, 58, 61; §16 del análisis SLG);
(d) la **coherencia con lo que SLG ya tiene**.

**Veredictos.** **Integrar**: el mecanismo entra con su lógica intacta y redacción propia de SLG. **Adaptar**: entra
con cambios sustanciales de forma o de alcance. **Descartar**: no entra; algunos quedan **condicionados** a una
decisión o a un dato que hoy no existe.

### 4.1 Mecanismos de las referencias

| Mecanismo | Veredicto | Forma en SLG | Razón |
|---|---|---|---|
| M-AIA-04 Criterio de salida «escalar / ajustar / descartar» | **Integrar** | Cada compuerta de aprobación (E-SLG-16) cierra con tres salidas explícitas, redactadas por SLG | Lleva a la práctica una regla que SLG ya tiene y añade disciplina sin cifras. Compatible con `check:copy`. |
| M-AIA-03 «Cuándo no invertir» | **Integrar** | Bloque «Cuándo no te conviene comprar IA (todavía)» con 3–4 criterios, sembrado con frases propias (E-SLG-08, 10) y la meta «qué no comprar» | Es el mecanismo más coherente con la voz anti-venta de SLG. En agenciaia está escondido; en SLG iría en la home o en el método. |
| M-PRY-05 Método único con números grandes | **Integrar** | Un componente de método, fuente única, idéntico en home, `/ai` y servicios. Número grande como encabezado (la guía lo permite). Orden del DOM igual al de lectura | Cierra la brecha del método disperso (E-SLG-16, 17) y evita el fallo 01-02-04-03 (E-PRY-32). |
| M-AIA-07 Lector nombrado por rol | **Integrar** | Primera pantalla de cada servicio: «Para [rol] que tiene que [decisión]». Audiencia primaria: directorios y comités | Corrige la audiencia dispersa (E-SLG-46). Las *taglines* ya intentan hacerlo, pero con Spanglish e incoherencias. |
| M-AIA-08 Entregables enumerados | **Integrar** | Bloque «Qué recibes», que ya existe en Readiness (E-SLG-15), extendido a cada fase del método | Es especificidad verificable que sustituye a la prueba y pasa `check:copy`. |
| M-PRY-02 Dolor-escena | **Integrar** (el patrón, no la frase) | Una escena por línea. Ejemplo de registro: «el piloto que funcionó en la demo y nunca llegó a producción» | Una escena concreta no necesita cifra para convencer. Encaja con «una idea por viewport». |
| M-PRY-01 Dolor justo después del hero | **Adaptar** | 3 dolores del comprador nombrado (directorio/comité), solo tipografía: sin icon-box ni tarjetas decorativas | El mecanismo es válido. La forma de Prayaga (icon-boxes) choca con RNF-44. |
| M-PRY-03 Plantilla fija de servicio | **Adaptar** | Verificar el contrato A.3 de seis secciones contra este orden: dolor → para quién → qué recibes → cómo (método) → por qué sin dependencia → descarga | SLG ya tiene contrato de secciones (`planning/scope.md`). Se adapta el orden, no se añade un «por qué nosotros» genérico. |
| M-PRY-04 Escalera de madurez | **Adaptar** | Escalera de 4 niveles con criterios observables, ligada a SLG_Readiness y, si se publica, a `/assessment` (E-SLG-59; publicación UNK, E-SLG-83) | Da autodiagnóstico sin cifras. Debe usar criterios, no adjetivos, para no sonar a marketing. |
| M-AIA-02 / M-PRY-10 Producto de entrada definido | **Adaptar** | Presentar **SLG_Readiness** (con nombre público legible) como puerta de entrada: alcance (11 dimensiones) + entregable. El CTA sigue siendo **su descarga**, no una agenda | El CTA de servicio = descarga y la prohibición de calendarios y «Sesión Cero» (E-SLG-56) impiden copiar «auditoría gratuita / agenda». **Duración: decisión abierta** (ver §7); toda cifra pasa por `check:copy`. |
| M-AIA-10 Comparativa frente a alternativas | **Adaptar** | 3–4 filas honestas: gran consultora · integrador o vendedor · hacerlo internamente · SLG. Criterio de comparación: de quién es la información y quién se queda con la capacidad. Base en E-SLG-07 | El strawman de agenciaia restaría credibilidad ante un comité. `check:copy` vigila los superlativos. |
| M-AIA-09 Principios de oficio | **Adaptar** | Ya existen: son las cuatro reglas (M-SLG-02). Se suben a la home como dispositivo principal de confianza, con una sola redacción | Unifica E-SLG-16/17 y aprovecha el mejor activo de confianza que hoy está disperso. |
| M-AIA-12 Fase posterior al despliegue | **Adaptar** | Fase final del método = **transferencia de capacidad** con criterio de cierre: «si sigues dependiendo de nosotros, el trabajo no está hecho» (E-SLG-17) | En SLG el acompañamiento no puede leerse como dependencia: tiene que leerse como salida. |
| M-PRY-07 Rostro y origen | **Adaptar** | Ricardo Torres Oliva visible antes del cierre de home y servicios, con trayectoria verificable (E-SLG-14). Historia del nombre «Soft Landing» **una sola vez**, en `/nosotros` o `/doctrina` | El fundador es el único activo humano de confianza. Antes hay que resolver la marca maestra (§5, B-09) para no contar una historia sobre un nombre que el sitio no usa. |
| M-PRY-08 FAQ de modularidad | **Adaptar** | 3–4 preguntas reales al final de los servicios, visibles, sin acordeón (la capa pública no los tiene): «¿tengo que contratar todo?», «¿trabajáis con nuestro stack?» | Útil para objeciones. Nunca como relleno SEO (E-AIA-21) ni para confesar que no se entiende la oferta (E-PRY-21). |
| M-PRY-09 Presencia física verificable | **Adaptar** | Razón social y jurisdicción (SLG Agency Inc., Florida) en el pie y en el contacto, en texto. Sin mapas | Los iframes de mapas son peso y rastreo, y chocan con `check:terceros`. |
| M-PRY-11 Casos de uso por área | **Adaptar** | Solo dentro de Enterprise/Readiness, como dimensiones del diagnóstico, no como catálogo | Evita reproducir el catálogo inflado (E-AIA-40, 56). |
| M-AIA-05 ROI por caso de uso | **Adaptar** | Como **criterio** del método («priorizamos por impacto medido en tu línea base»), sin publicar cifras | Responde la pregunta del comité sin chocar con `check:copy`. |
| M-AIA-06 / M-PRY-06 Fichas de caso | **Descartar (condicionado)** | La plantilla (situación → línea base → intervención → resultado → plazo) queda preparada, pero no se publica ningún caso sin autorización escrita | Política explícita y freno de CI (E-SLG-12, 56). Mientras tanto, la ausencia se convierte en postura visible (principio P3). |
| M-AIA-01 Rangos de inversión | **Descartar en v1 (condicionado)** | Alternativa compatible: describir el **formato** de cada encargo (alcance, entregable, quién participa) sin importes | Los importes bloquean `check:copy`. Publicar precios es una decisión comercial de Ricardo, no de diseño (§7). |
| M-AIA-11 Revenue share / gratuidad | **Descartar** en la web | Puede vivir en la propuesta comercial | En una consultora estratégica puede sonar a necesidad, y añade complejidad a la primera pantalla. |

### 4.2 Formas de agencia que se descartan sin condiciones

| Forma (origen) | Razón |
|---|---|
| Slider o titular rotativo en el hero o en el CTA (E-PRY-01, 51; E-AIA-18) | Una sola propuesta fija. El autoplay viola `check:motion` y la idea por viewport. |
| Flip-boxes, tabs y carruseles autoplay para método, servicios, equipo, casos o logos (E-AIA-10, 39; E-PRY-52, 53) | Esconden el contenido clave, no funcionan en táctil y la capa pública de SLG no los tiene (E-SLG §11.2). |
| Contadores animados y cifras agregadas (E-AIA-11; E-PRY-17) | Sin respaldo resultan incoherentes. Bloqueados por `check:copy`. |
| Estadísticas de terceros presentadas como resultados (E-AIA-41; E-PRY-28) | Engañan al comprador analítico. Bloqueadas por `check:copy`. |
| Muro de logos de tecnología o de partners (E-AIA-15; E-PRY-18) | Contradice la independencia frente al vendedor (E-AIA-38 frente a 15; M-SLG-01). |
| Agentes-mascota y catálogo por sector (E-AIA-09, 40) | Trivializan la oferta y la convierten en producto de agencia. |
| Vídeo de fondo, vídeo de caso y animación generalizada por scroll (E-AIA-04, 46; E-PRY-14) | Peso, distracción y terceros. SLG ya tiene un único reveal de 8 px. |
| Varios canales de conversión: chats, chat de IA de terceros, WhatsApp, agenda (E-PRY-39, 40, 41, 43) | CTA único por página. La agenda está prohibida por freno (E-SLG-56). |
| Formulario de 5 campos con cargo y teléfono (E-PRY-20) | SLG pide solo el correo corporativo a cambio de valor (E-SLG-09). |
| FAQ largo escrito para SEO (E-AIA-21) | Destruye la confianza justo donde debía construirla. |
| Red de dominios por país con plantilla replicada (E-AIA-45) | Causa probable del texto colombiano en un sitio peruano. SLG mantiene un único sitio ES/EN con paridad. |
| Acento de color en cada H2 (E-AIA-47) | SLG ya tiene la regla: el rojo, solo para la descarga, y el cian, solo como acento sobre fondo oscuro (E-SLG-48). |

---

## 5. Brechas de SLG ordenadas por impacto en la contundencia de la propuesta de valor

**Criterio de orden (INF).**
(1) Posición en el recorrido: cuanto antes la ve el visitante, más pesa.
(2) Si la brecha **impide** entender el valor o solo lo **debilita**.
(3) Lo que las referencias muestran que pasa cuando falta.
La deriva de ramas (§0 del análisis SLG) no es una brecha de propuesta: es una **precondición** y va antes de todo.

**Precondición P0.** Partir de `origin/develop`. Sin eso, cualquier cambio reescribe un sitio que ya no existe
(E-SLG-41, 71).

| # | Brecha | Tipo | Por qué ocupa esta posición (INF) | Evidencia | Mecanismos que la cierran |
|---|---|---|---|---|---|
| **B-01** | La portada no dice qué hace SLG: es un mapa del sitio, sin para quién, problema, resultado ni CTA | Impide | Es lo primero que ve todo visitante. Las dos referencias, con todas sus debilidades, al menos dicen qué son en el H1 | E-SLG-01, 03, 70; contraste E-AIA-02, E-PRY-05 | P1; M-PRY-01 |
| **B-02** | El resultado prometido es difuso («Construimos juntos tu futuro»); la promesa concreta («qué preguntar, qué exigir y qué no comprar») vive en la meta-description | Debilita (en la 1.ª pantalla) | Aunque se mueva la propuesta a `/`, sin un resultado nítido la primera pantalla sigue siendo genérica. La versión anterior («Ayudamos a comprarla») era más nítida | E-SLG-04, 40 | P1 |
| **B-03** | El diferenciador (independencia, sin lock-in, sin comisiones, capacidad dentro) está disperso entre Nosotros y el pie de cada servicio | Debilita | Es lo único que ninguna referencia puede igualar, y hoy no está donde se decide | E-SLG-12, 16, 17 | P3; M-AIA-09 adaptado |
| **B-04** | No hay sección de dolor: el arco de `/servicios` va valor → ejes → oferta → doctrina → artículos → descargas | Debilita | Prayaga demuestra que el dolor tras el hero es lo que más identifica. Agenciaia muestra lo que pasa cuando el problema llega en la sección 12 de 16 | E-SLG §4.2; E-PRY-05, 06; E-AIA-17 | P2; M-PRY-01, M-PRY-02 |
| **B-05** | La audiencia se dispersa: directorios, C-suite, gerentes, investigadores, estudiantes y fundadores; TEAx dice «para C-suite» y su descarga se dirige a gerentes | Debilita | Una propuesta para todos no es contundente para nadie (E-PRY-50 es el caso extremo) | E-SLG-46; §14 del análisis SLG | M-AIA-07 |
| **B-06** | El método no tiene nombre ni dibujo; la regla de la compuerta aparece redactada de dos maneras | Debilita | Es el hueco que ninguna referencia ocupa (E-AIA-44, E-PRY-31). Sin método visible, la secuencia «criterio primero» queda como opinión | E-SLG-10, 16, 17 | P4; M-PRY-05, M-AIA-04 |
| **B-07** | El producto de entrada (Readiness, once dimensiones) no se presenta como entrada; está a tres niveles de profundidad | Debilita | Ambas referencias proponen un «diagnóstico» como primer paso (E-AIA-30, E-PRY-03). SLG lo tiene y lo tiene mejor definido, pero escondido | E-SLG-15, 44 | P6; M-AIA-02 adaptado |
| **B-08** | No hay prueba, y la explicación (la postura) está escondida en `/nosotros`; el fundador aparece al final de Nosotros | Debilita | Sin prueba y sin explicar por qué, el lector supone que no la hay. Con la postura visible, la ausencia se lee como rigor | E-SLG-12, 14, 56 | P3; M-PRY-07 adaptado |
| **B-09** | Tres marcas (SLG Agency / Softlanding Global / VoltAi by SLG) y nombres internos (guiones bajos, siglas, Spanglish, «CoO» con dos significados) | Fricción | Agenciaia muestra que varias marcas a la vez restan confianza (E-AIA-23). En SLG obliga a leer las *taglines* para entender | E-SLG-06, 45, 46, 62 | P8 |
| **B-10** | «Dos ejes» asimétricos: piden «elegir antes de seguir leyendo» entre un eje de 10 servicios y un servicio suelto | Fricción | Pide al visitante una decisión antes de que entienda la diferencia | E-SLG-05, 44 | P4 (el método como columna), P8 |
| **B-11** | Huecos de hype en una voz sobria: Volta, «poner la inteligencia en movimiento», *taglines* de Factory genéricas | Fricción | Cada frase genérica pone en duda las frases precisas | E-SLG-11, 47 | P5 |
| **B-12** | Defectos de copy y render: reglas internas en el copy público, backticks literales, «Sin formulario» encima de un formulario, «empresa_web» en el texto extraído | Higiene | Lo que más castiga a las referencias (E-AIA-22, E-PRY-45) | E-SLG-06, 18, 19, 25 | P8 |
| **B-13** | Deriva guía/código: escala del hero, foto de cabecera en cada página frente a «las cifras sustituyen a la fotografía», sin escala de espaciado tokenizada | Higiene (visual) | No resta a la propuesta, pero la reingeniería tiene que decidir qué manda, la guía o el código | E-SLG-52, 53, 54, 60 | P7 |

---

## 6. Principios de la reingeniería

Cada principio tiene evidencia trazable, nombra las brechas que cierra y tiene una **prueba de cumplimiento**
verificable en revisión o en CI.

### P1 — La primera pantalla vende, no orienta

**Enunciado.** La primera pantalla de `/` dice, en una formulación fija y sin rotación, **para quién** (directorios y
comités), **qué problema** (decidir sobre IA con la información de quien vende) y **qué resultado** (saber qué
preguntar, qué exigir y qué no comprar), y ofrece **un** siguiente paso. El mapa del sitio pasa a ser secundario.
**Evidencia.** E-SLG-01, 04, 40, 70. Contraejemplos: E-AIA-02, 04 (hero SEO sin CTA); E-PRY-01, 04, 51 (mensaje
rotativo); E-PRY-21, 50 (sin destinatario).
**Cierra.** B-01, B-02.
**Prueba.** Un solo H1 fijo; el texto de la primera pantalla contiene las tres piezas y el CTA; ningún componente
rota. Revisión: un lector que no conoce SLG repite las tres piezas tras 5 segundos.
**Atención.** Que la portada sea el mapa fue **decisión de Ricardo del 2026-09-18** (E-SLG-41). Revertirla
requiere su aprobación (§7, D-1).

### P2 — El problema antes que la oferta, con la escena del comprador

**Enunciado.** Justo después del hero vienen 3 dolores del comprador nombrado, en su lenguaje, y cada línea tiene
**una escena** reconocible. La oferta aparece después.
**Evidencia.** E-PRY-05, 06, 27 (funciona). E-AIA-17 (el problema en la sección 12 de 16 no funciona). E-SLG §4.2
(SLG no tiene esta sección).
**Cierra.** B-04, y en parte B-05.
**Prueba.** En `/` y en cada página de línea, la sección de dolor es la segunda. Cada línea tiene una escena; ninguna
escena contiene cifras sin respaldo (`check:copy`).

### P3 — La independencia es la prueba

**Enunciado.** Como SLG no publica casos ni cifras, la confianza se construye con dos cosas, ambas en la home y cerca
del CTA. Primero, **las cuatro reglas** y «sin licencias ni comisiones» como dispositivo principal, con una sola
redacción. Segundo, **la postura sobre la prueba** dicha en voz alta («no publicamos clientes sin autorización
escrita; por eso aquí no hay logos»). La prueba se sustituye por **especificidad verificable**: entregables
enumerados, once dimensiones y doctrina escrita.
**Evidencia.** E-SLG-12, 13, 15, 16, 17, 56. Contraejemplos de prueba que resta: E-AIA-11, 12, 33, 41; E-PRY-11,
17, 28, 36.
**Cierra.** B-03, B-08.
**Prueba.** Las cuatro reglas aparecen en `/` con el mismo texto que en `/nosotros` (una fuente en `content/`).
`check:copy` pasa sin excepciones nuevas. No hay contadores ni logos.

### P4 — Un solo método, con nombre, la misma forma en todas partes y compuertas con tres salidas

**Enunciado.** Se nombra y se dibuja la secuencia que SLG ya tiene: **criterio → diagnóstico/arquitectura →
construcción → transferencia**. Cada fase tiene entregable y compuerta de aprobación del cliente, y la compuerta
tiene tres salidas: escalar, ajustar o descartar (*corregido tras crítica, 05 C-08:* el plan de contenidos propone
«avanzar, ajustar o descartar», porque no todas las fases son pilotos; esa es la redacción de trabajo única para
03 y 04 hasta FU-RC02). INF: las fases coinciden con Academy, Enterprise y Factory
(M-SLG-05), así que el método puede **ordenar la oferta** en lugar de los «dos ejes». El nombre debe ser legible en
español; no se añade otra sigla.
**Evidencia.** E-SLG-10, 16, 17, 25, 44. Referencias: E-AIA-36 (salidas); E-PRY-31 (consistencia); E-AIA-44 y
E-PRY-32 (lo que hay que evitar).
**Cierra.** B-06, B-10, y en parte B-07.
**Prueba.** Un único componente de método alimentado desde `content/` y usado en `/`, `/ai` y los servicios. El
orden del DOM es igual al orden de lectura. Cada fase declara su entregable. La regla de la compuerta tiene una
sola redacción en todo el sitio.

### P5 — Decir cuándo no comprar

**Enunciado.** La credibilidad se gana renunciando. Un bloque breve con 3–4 criterios de «cuándo no te conviene
(todavía) invertir en IA» se coloca en la home o en el método, escrito con la voz aforística de SLG. Las frases de
hype se eliminan o se reescriben con el mismo criterio.
**Evidencia.** E-AIA-32 (el mejor dispositivo de agenciaia, escondido). E-SLG-08, 10 (las semillas ya existen) y la
meta «qué no comprar». Contraejemplos de tono: E-SLG-04, 11, 47.
**Cierra.** B-11, y refuerza B-02.
**Prueba.** El bloque existe y está enlazado desde la primera pantalla o desde el método. No queda ninguna de las
frases de E-SLG-11 y E-SLG-47 sin reescribir.

### P6 — Una puerta de entrada definida y un único siguiente paso por página

**Enunciado.** El primer paso tiene nombre, alcance y entregable: el diagnóstico (Readiness) se presenta como
entrada desde la home. Cada página mantiene **un** CTA primario. En servicio es su descarga, en rojo, y nunca una
agenda.
**Evidencia.** E-SLG-09, 15, 56, 58. Referencias: E-AIA-30 (la escalera funciona), E-AIA-18 y 19 (CTA tardío),
E-PRY-03 (diagnóstico sin definir) y E-PRY-43 (dispersión).
**Cierra.** B-07, y el CTA que falta en B-01.
**Prueba.** Un CTA primario por página (revisión + `check:copy`). Cero calendarios. El rojo aparece 1–2 veces por
viewport y solo en la descarga. El producto de entrada declara alcance y entregable.

### P7 — Menos cosas, todas visibles; el sistema actual manda

**Enunciado.** No hay contenido detrás de una interacción (flip, tab, carrusel) ni movimiento automático. Se
conservan los tokens, el reveal de 8 px una sola vez y las tres preferencias del sistema. Donde la guía y el código
difieren (escala del hero, fotografía de cabecera), se decide una vez y se escribe en la guía. Solo se toman dos
préstamos visuales: el número grande como encabezado de fase y un antes/después como **diagrama estático**.
**Evidencia.** E-SLG-43, 48…55, 60. Contraejemplos: E-AIA-04, 10, 46, 48; E-PRY-51, 52, 53.
**Cierra.** B-13.
**Prueba.** `check:motion`, `check:contraste`, `check:js-budget` y `check:terceros` en verde. Cero componentes de
carrusel, tab o flip. La guía y el código coinciden en la escala del hero y en la política de fotografía.

### P8 — Una marca pública y nombres que se entienden sin glosario

**Enunciado.** Una marca maestra pública. Los nombres de servicio se escriben por resultado, en español o en inglés
según el idioma de la página, sin guiones bajos. Las siglas solo aparecen con su traducción, y ninguna regla
interna de marca llega al copy público.
**Evidencia.** E-SLG-06, 25, 45, 46, 62. Referencias: E-AIA-23 (tres marcas restan confianza); E-PRY-07, 49
(prefijo por servicio y dos árboles de URL).
**Cierra.** B-09, B-12, y en parte B-05 y B-10.
**Prueba.** `check:nomenclature` actualizado con la marca maestra. Ninguna etiqueta pública con `_`. Ninguna sigla
sin expandir en su primera aparición. Los artefactos de E-SLG-18, 19 y 25 están corregidos.

---

## 7. Decisiones abiertas (requieren a Ricardo; no son de diseño)

| ID | Decisión | Por qué no la puede tomar la reingeniería | Evidencia |
|---|---|---|---|
| D-1 | Devolver la propuesta de valor a `/` y llevar el mapa a una posición secundaria | Revierte su decisión del 2026-09-18 | E-SLG-41, 42 |
| D-2 | Marca maestra pública (SLG Agency / Soft Landing Global / VoltAi by SLG) | Es arquitectura de marca y afecta a la razón social, al dominio y a `check:nomenclature` | E-SLG-06, 45 |
| D-3 | Nombre público del método | Debe ligarse a la Doctrina y no añadir jerga | E-SLG-20; P4 |
| D-4 | Publicar duraciones por fase o del diagnóstico | Son cifras: hace falta un dato real y pasarlas por `check:copy` | E-SLG-56; E-AIA-30 |
| D-5 | Publicar rangos de inversión o formatos de encargo | Es una decisión comercial; los importes están bloqueados por freno | E-SLG-56; E-AIA-28 |
| D-6 | Audiencia primaria única (directorios y comités) y qué pasa con investigadores y estudiantes (RETx) | Reordena la oferta Academy | E-SLG-46 |
| D-7 | Fotografía de cabecera: se mantiene (y entonces hay que confirmar que no es de stock) o se retira según la guía | Contradicción entre la guía, el código y RNF-44; la naturaleza de las fotos es UNK | E-SLG-52, 54, 55, 82 |
| D-8 | Objetivo de accesibilidad 100 frente al gate de 95 | Exige subir `LH_MIN_ACCESSIBILITY` o tratarlo como objetivo de revisión | E-SLG-57 |

---

## 8. Integraciones prioritarias (INF, ordenadas por impacto/esfuerzo)

1. **Primera pantalla de `/` con propuesta fija** (para quién + problema + resultado + CTA), a partir del texto
   existente (E-SLG-04, 40 y la meta-description). Depende de D-1. → P1, B-01/B-02.
2. **Cuatro reglas + «sin licencias ni comisiones» + postura sobre la prueba** en la home, con una sola redacción
   (E-SLG-12, 16, 17). → P3, B-03/B-08.
3. **Sección de dolor con escena** tras el hero, en la home y en cada línea (patrón E-PRY-05, 27). → P2, B-04.
4. **Método nombrado y dibujado**, fuente única y con compuertas de tres salidas (E-SLG-10, 16; E-AIA-36; E-PRY-31).
   → P4, B-06/B-10.
5. **Readiness como puerta de entrada** visible desde la home, con alcance y entregable; el CTA sigue siendo la
   descarga (E-SLG-15; E-AIA-30). → P6, B-07.
6. **Bloque «Cuándo no conviene comprar IA (todavía)»** (E-AIA-32; E-SLG-08, 10). → P5.
7. **Lector nombrado por rol y entregables enumerados** en cada servicio (E-AIA-05, 54; E-SLG-46). → B-05.
8. **Limpieza de nomenclatura y de artefactos** (E-SLG-06, 18, 19, 25, 46, 62). Depende de D-2. → P8, B-09/B-12.

---

## 9. Límites de esta síntesis

- **No hay evidencia visual renderizada de ningún sitio.** Las comparaciones de presentación comparan configuración
  (referencias) con código (SLG), no lo que ve el usuario (E-AIA-49, E-PRY-58, E-SLG-80, 81).
- **La claridad en 5 segundos es una inferencia sobre el texto.** No hay prueba con usuarios.
- **Valores con confianza media heredados**: la asignación de los contadores de agenciaia (E-AIA-12), el recuento de
  CTA de Prayaga (E-PRY-43) y la rama exacta de despliegue de SLG (E-SLG-71).
- **No capturado** (heredado): `/en`, `/holdings`, `/descargas`, `/blog` y `/assessment` de SLG; las fichas de agentes
  y siete landings de agenciaia; cuatro líneas y la versión EN de Prayaga. Los veredictos sobre esas páginas
  extrapolan desde las capturadas.
- **El contrato A.3 de seis secciones** de SLG se cita a través de `01_analisis_prayaga.md` (§13) y de
  `planning/scope.md`. Esta síntesis no lo ha releído; M-PRY-03 pide verificar el orden propuesto contra él.
