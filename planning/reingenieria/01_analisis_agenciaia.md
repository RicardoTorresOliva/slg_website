---
type: planning
title: 01_analisis_agenciaia
project: slg_website
description: Ingeniería inversa (método REA) del sitio de referencia agenciaia.com.pe (Automaxia), centrada en qué hacen y cómo lo presentan, con ledger de evidencia e ideas transferibles a Soft Landing Global.
tags: [slg, slg_website, planning, reingenieria, benchmark, rea]
status: planning
timestamp: 2026-10-27
sources:
  - https://agenciaia.com.pe/ (markdown + links + html)
  - https://agenciaia.com.pe/somos-automaxia/
  - https://agenciaia.com.pe/consultoria-en-inteligencia-artificial-peru/
  - https://agenciaia.com.pe/agentes-ia-peru/
  - https://agenciaia.com.pe/automatizacion-con-ia-peru/
  - https://agenciaia.com.pe/inteligencia-artificial-para-empresas/cuanto-cuesta-implementar-ia-en-una-empresa-peruana-analisis-de-roi/
  - https://agenciaia.com.pe/blog/
  - https://agenciaia.com.pe/preguntas-frecuentes/
capture: /tmp/claude-0/-home-user-slg-website/8fe25825-a3b4-59ab-9308-a5e90ec3f395/scratchpad/captures/agenciaia.md
---

# Análisis de referencia — agenciaia.com.pe (Automaxia)

> **Método.** REA (Reverse Engineer Anything), flujo «Plan broader investigations»: checklist de preguntas → captura
> mínima útil → ledger de hallazgos con Evidence ID → revisión final del checklist. Cada hallazgo se clasifica como
> **OBS** (observado en la captura), **INF** (inferido de observaciones) o **UNK** (no establecido).
>
> **Captura.** Apify `apify/web-fetch` con render JS (`wait: 3000`), 2026-10-27. Home en markdown + links y una vez
> en HTML (solo para extraer señales de presentación). Seis subpáginas en markdown. La copia condensada que permite
> reproducir la evidencia está en `scratchpad/captures/agenciaia.md` (ruta completa en el frontmatter).
>
> **Límites duros de la captura** (detalle en la última sección): no hay capturas de pantalla. El markdown excluye
> header y footer. El HTML llegó **sin `<head>`, sin `<style>` y sin `<script>`**. Por eso tipografías, paleta completa,
> fondos, widgets de chat y el aspecto visual real son **UNK** salvo que se diga lo contrario.

---

## Resumen ejecutivo

1. **Qué son.** Automaxia es una agencia peruana de «automatización con IA» y «agentes IA» (WordPress + Elementor Pro)
   que vende cuatro cosas a la vez: automatización de procesos, agentes conversacionales con marca propia (Maxia, Max y
   15 agentes «Max*» por sector), consultoría/estrategia en IA y formación. Su home está escrita **primero para SEO**
   (H1 = «Agencia de IA en Perú») y después para el comprador (E-AIA-01, E-AIA-02, E-AIA-53).
2. **Propuesta de valor débil en el hero.** El hero dice la categoría («automatización con IA hecha a la medida») y un
   resultado abstracto («agilidad»). No dice qué problema concreto resuelve, no pone ninguna prueba y, en el cuerpo
   capturado, **no tiene botón** (E-AIA-02, E-AIA-04). El visitante entiende al instante *qué tipo de empresa es*, pero
   no *por qué elegirla*.
3. **Mucha prueba aparente, poca verificable.** Hay contadores animados (3 años, 43 profesionales, 130 clientes,
   23 países), 48 logos de tecnología, una tabla contra «Consultorías Grandes» y «Freelancers IA» y estadísticas de
   mercado sin fuente. **No hay ni un caso con nombre, logo de cliente, testimonio ni fundador identificado** (E-AIA-11,
   E-AIA-12, E-AIA-15, E-AIA-35, E-AIA-41). Las únicas cifras de caso concretas (payback de 3,2 a 11 meses) están
   enterradas en un artículo del blog y son anónimas (E-AIA-29).
4. **Los mejores activos están escondidos.** El artículo de ROI tiene lo más valioso del sitio: precios en soles por
   tipo de proyecto, una auditoría gratuita de 5 días, un MVP en 30–60 días, financiación y revenue share, y una sección
   «¿Cuándo No Invertir en IA?» (E-AIA-28 a E-AIA-32). La página de consultoría añade criterios de salida de pilotos
   («escalar, ajustar o descartar») y ROI por caso de uso (E-AIA-36, E-AIA-37). Nada de eso sale en la home.
5. **Método inconsistente.** El sitio muestra **cuatro procesos distintos**: 4 fases en la home, otras 4 en consultoría,
   4 pasos en agentes y 5 en automatización, más 3 fases en el blog. Ninguno tiene nombre propio (E-AIA-10, E-AIA-39,
   E-AIA-44).
6. **Higiene que destruye confianza.** Hay tres nombres de marca (Automaxia, AgenciaIA, AMD). El FAQ está relleno de
   keywords y menciona «agencia SEO Bogotá» y «Colombia». Aparecen herramientas que parecen placeholders («toolchatbot,
   tooltodo y tooltoget»), un WhatsApp con patrón de número ficticio (+51 999 888 777) y erratas en titulares
   (E-AIA-21 a E-AIA-23, E-AIA-34, E-AIA-52).
7. **Para SLG.** Conviene copiar la *sustancia* de sus páginas profundas: criterios de salida, ROI por caso de uso,
   «cuándo no invertir», entregables explícitos, diagnóstico acotado en tiempo y rangos de inversión. También la
   costumbre de nombrar a quién va dirigido cada servicio. Hay que rechazar su *forma*: catálogo de avatares, muro de
   logos, contadores sin fuente, flip-boxes, titulares rotativos, FAQ SEO y video de fondo. El contraste es la
   oportunidad: SLG puede ganar mostrando **menos cosas, todas verificables y con un solo método con nombre**.

---

## Checklist de preguntas (estado)

| # | Pregunta | Evidencia necesaria | Estado | Evidence IDs |
|---|---|---|---|---|
| 1 | Propuesta de valor: hero literal, rapidez para entender para quién, qué problema y qué resultado | H1/H2/párrafo del hero, widgets del hero, primera mención de audiencia y de problema | **Respondida** | E-AIA-01…05, 53 |
| 2 | Arquitectura de oferta: nombres, agrupación, paquetes, precios | Bloques de soluciones, menú/footer de servicios, catálogo de agentes, señales de precio | **Respondida** | E-AIA-07, 09, 28, 40, 55, 56 |
| 3 | Prueba: casos, métricas, logos, testimonios, certificaciones, fundadores, cifras (concreción y ubicación) | Contadores, logos, casos, página «Somos», autoría | **Respondida** (la prueba es débil) | E-AIA-11…16, 29, 33, 35, 41, 43 |
| 4 | Método: ¿proceso con nombre? ¿cómo se muestra? | Secciones de metodología en home y subpáginas, widget usado | **Respondida** | E-AIA-10, 30, 36, 39, 44 |
| 5 | Arco narrativo de la home sección a sección | Orden de contenedores Elementor y su contenido | **Respondida** | E-AIA-48 + tabla de arquitectura |
| 6 | CTAs: texto, cantidad, ubicación, fricción | Botones, formularios, enlaces wa/tel/mail, popups, ofertas gratuitas | **Parcial**: falta el texto del CTA del header (popup) y los campos del formulario | E-AIA-18…20, 25, 30, 34 |
| 7 | Tono y vocabulario | Titulares, cuerpo, FAQ | **Respondida** | E-AIA-06, 09, 21, 31, 32, 57 |
| 8 | Presentación: tipografía, color, densidad, espacio en blanco, imágenes, iconos, movimiento, componentes | HTML (widgets, settings de animación, colores inline), nombres de archivo de imagen | **Parcial**: fuentes, paleta completa, fondos y aspecto real son UNK | E-AIA-46…50 |
| 9 | Dispositivos de confianza y conversión (FAQ, garantías, reversión de riesgo, urgencia, chat) | FAQ, ofertas gratuitas, revenue share, widgets de chat | **Parcial**: la existencia de chat flotante es UNK | E-AIA-21, 25, 30, 31, 32, 49 |
| 10 | Debilidades: genérico, saturado, sin probar, inconsistente | Todo lo anterior | **Respondida** | ver sección Debilidades |
| 11 | Ideas transferibles a SLG (tal cual / adaptar / rechazar) | Síntesis | **Respondida** | ver tabla final |

---

## Ledger de evidencia

Fuentes abreviadas: **H** = home `https://agenciaia.com.pe/` · **HH** = HTML de la home · **S** = `/somos-automaxia/`
· **C** = `/consultoria-en-inteligencia-artificial-peru/` · **A** = `/agentes-ia-peru/` · **AU** = `/automatizacion-con-ia-peru/`
· **R** = artículo ROI · **B** = `/blog/` · **F** = `/preguntas-frecuentes/`.

| ID | Tipo | Fuente (página · sección) | Cita (≤25 palabras) | Hallazgo |
|---|---|---|---|---|
| E-AIA-01 | OBS | H · `<title>` | «Agencia de IA en Perú ✔️ Automatización IA» | El título de la pestaña está escrito para el buscador (keyword + emoji check), no para la marca. |
| E-AIA-02 | OBS | H · hero (H1/H2) | «Agencia de IA en Perú» / «Automatización con IA hecha a la medida que potencia la agilidad de las empresas» | El H1 es la keyword geográfica. El H2 da categoría y un resultado abstracto («agilidad»). |
| E-AIA-03 | OBS | H · párrafo del hero | «diseñamos soluciones que optimizan tus operaciones de marketing, ventas, atención al cliente y gestión interna» | El alcance arranca amplísimo: cuatro áreas funcionales a la vez. |
| E-AIA-04 | OBS | HH · contenedor 0 | widgets: heading×2, text-editor×1; `background_video_link: youtu.be/xVRuojSad7M` | El hero tiene video de YouTube de fondo y **ningún botón ni formulario** en el cuerpo capturado. |
| E-AIA-05 | OBS | H · «Una Agencia de IA con Soluciones Estratégicas» | «ayudando a **CEOs, Directores de Tecnología y Empresarios** a identificar y ejecutar estrategias» | La audiencia aparece en la 2.ª sección, no en el hero. |
| E-AIA-06 | OBS | H · sección 3 | «La IA ya no es una opción es el ecosistema donde compites y ganas» | Titular de urgencia o miedo a quedarse fuera, acompañado de un widget de video (YouTube 85muQFDxlSc). |
| E-AIA-07 | OBS | H · «Soluciones de IA Diseñadas…» | «Automatización Inteligente de Marketing y Ventas» · «Optimización de Operaciones con IA» · «IA para una Experiencia de Cliente Superior» · «Análisis Avanzado…» | La oferta se agrupa en 4 áreas funcionales, sin paquetes ni niveles. |
| E-AIA-08 | OBS | H · «Ventajas Estratégicas…» | «Mayor Eficiencia Operativa — Automatiza tareas, reduce errores.» | Hay 6 icon-boxes con beneficios de 3–4 palabras, intercambiables con los de cualquier agencia. |
| E-AIA-09 | OBS | H · «Implementacion de Agentes IA» | «Olvídate de los bots genéricos… desplegamos avatares inteligentes como Maxia y Max» | El producto se presenta como avatar con nombre propio («Fuerza de Trabajo Digital»). |
| E-AIA-10 | OBS | H/HH · «¿Cómo Hacemos Inteligencia Artificial En 4 Fases?» | «Diagnóstico y Entendimiento… · Desarrollo, implementación e Integración · Entrenamiento, Optimización y Despliegue · Validación, Ajustes y Acompañamiento» | El método son 4 fases sin nombre propio, presentadas en **flip-box×4**: la descripción solo se ve al pasar el cursor o tocar (los títulos salen duplicados en el markdown). |
| E-AIA-11 | OBS | H · «Confianza Basada en Experiencia…» + HH `data-to-value` | markdown: «Años de experiencia + 0»; HTML: 3 · 43 · 130 · 13 · 23 | Los contadores se animan por JS (2000 ms) desde 0. Sin JS se ven como «+ 0». |
| E-AIA-12 | INF | HH · counters (orden de widgets) | Años 3 · Profesionales 43 · Clientes 130 · Mentorías/Consultorías/Cursos 13 · Países 23 | Asignación por orden de widget, con confianza media. «23 países con casos de éxito» con «3 años» y 43 profesionales es una combinación poco creíble, y además no tiene fuente. |
| E-AIA-13 | OBS | H · «10 Razones Por Que Elegirnos…» | columnas «Aspecto · Automaxia Agencia IA · Consultorías Grandes · Freelancers IA»; «Cotizaciones complejas y arandelas» | Tabla de posicionamiento de 10 filas contra dos competidores caricaturizados. |
| E-AIA-14 | OBS | H · secciones 8 y 10 | «Casos de uso de IA Probados en Mas de10 Sectores Clave» (2 veces) | El mismo subtítulo aparece dos veces. La sección «Distintas Industrias» es una sola infografía PNG, sin casos. |
| E-AIA-15 | OBS | H/HH · «Dominamos las Herramientas…» | 8 pestañas (`nested-tabs`), 48 logos; alt: «Consultoría en IA Anthropic» | Muro de logos de tecnología enlazados a los sitios de los proveedores. Los alt-text están escritos para SEO. |
| E-AIA-16 | INF | H · misma sección | No hay textos «partner», «certificado» ni «cliente» junto a los logos | Los logos demuestran *stack*, no relación comercial ni clientes. Al lector no técnico le puede parecer una prueba de clientes, pero no lo es. |
| E-AIA-17 | OBS | HH · contenedor 12 | `jet-image-comparison`; «Antes» / «Después» | Usa un comparador deslizante antes/después con fotos (`antes-agencia-ia-2.jpg`), junto a dolores y logros en listas. |
| E-AIA-18 | OBS | H/HH · «¡Agendemos una reunión pronto!» | «Asesoría Consultiva» · animated-headline «¡ESCRÍBENOS! / Déjanos tus datos»; iframe `api.leadconnectorhq.com/widget/form/…` «Automaxia Home» | El único punto de conversión del cuerpo es un formulario embebido de LeadConnector (CRM de terceros) en la sección 14 de 16. |
| E-AIA-19 | OBS | HH · cuerpo | botones `elementor-button`: 3, todos «Leer más»; 0 `wa.me`, 0 `tel:`, 0 `mailto:` | En el cuerpo no hay CTA de reunión clicable. Solo están el formulario y los enlaces al blog. |
| E-AIA-20 | OBS / UNK | H · links (antes del cuerpo) + HH CSS | `#elementor-action:…popup:open…` (popup 3524); `slideInRight.min.css` | En el header hay un disparador de popup que posiblemente entra deslizándose desde la derecha. **Su texto y contenido son UNK.** |
| E-AIA-21 | OBS | H · FAQ «¿Qué costos debo considerar…?» | «Como agencia SEO Bogotá y agencia de IA, estamos listos para llevar tu empresa al siguiente nivel» | El FAQ (10 preguntas en `nested-accordion`) es relleno SEO reciclado de otro país: 3–5 párrafos por respuesta. |
| E-AIA-22 | OBS | H · FAQ «¿Qué tecnologías usan…?» | «herramientas como toolchatbot, tooltodo y tooltoget» | Nombres que parecen placeholders publicados como si fueran tecnología real. |
| E-AIA-23 | OBS | H · FAQ «¿Cuánto tiempo toma…?» / R | «En AMD Con indicadores claros (KPIs)» · «Director de Soluciones Tecnológicas de AgenciaIA Perú» | Tres nombres de marca conviven: Automaxia, AMD y AgenciaIA. |
| E-AIA-24 | OBS | H · FAQ | «nuestros clientes suelen ver beneficios concretos entre las primeras 4 y 12 semanas» | La única promesa de plazo de la home está dentro de un acordeón. |
| E-AIA-25 | OBS | H · FAQ | «diseñar un piloto de bajo riesgo» · «Agendamos una reunión exploratoria gratuita» | Hay reversión de riesgo (piloto y reunión gratuita), pero solo dentro del FAQ. |
| E-AIA-26 | OBS / UNK | F | markdown vacío: solo «Ir al contenido» | La página de FAQ dedicada no devolvió contenido. Si existe contenido real o se carga por JS es UNK. |
| E-AIA-27 | OBS | B | 3 entradas, categoría única «Inteligencia Artificial para Empresas» | El blog tiene 3 artículos en total. La home muestra esos mismos 3. |
| E-AIA-28 | OBS | R · «Proyectos de Menor Escala» | «Chatbot Inteligente: S/ 8,000 – S/ 15,000» | Rangos de precio públicos en soles por tipo de proyecto, en 3 escalas (MYPE, mediana, empresarial). |
| E-AIA-29 | OBS | R · «Casos Reales» | «Caso 1: Agroexportadora en Ica… Recuperación de inversión: **8 meses**» | Tres casos anónimos con inversión, métricas y payback (8, 3,2 y 11 meses). Están en el blog, no en la home. |
| E-AIA-30 | OBS | R · «Metodología AgenciaIA» | «Fase 1: Auditoría Gratuita (5 días)… Sin costo, sin compromiso» · «prueba de concepto en 30-60 días» | Escalera de entrada clara y acotada en tiempo. No aparece en la home. |
| E-AIA-31 | OBS | R · «¿Cómo Financiamos la IA?» | «Opción 3: Modelo de Revenue Share — Solo pagas cuando generas resultados» | Cuatro modalidades de pago, incluido revenue share como reversión de riesgo fuerte. |
| E-AIA-32 | OBS | R · «¿Cuándo No Invertir en IA?» | «Sé transparente contigo: No todos los proyectos IA tienen sentido financiero» | Lista de *red flags* para no invertir: es el dispositivo de credibilidad más maduro del sitio. |
| E-AIA-33 | OBS | R · intro y autoría | «he evaluado más de 150 proyectos» · autor publicado «automaxia web» | Habla un «Director» sin nombre y el autor es un usuario genérico. «150 proyectos» no cuadra con «130 clientes» ni con «3 años». |
| E-AIA-34 | OBS / INF | R · cierre | «WhatsApp: +51 999 888 777» · «Te espero en mi oficina en San Isidro» | El número sigue un patrón típico de placeholder (INF). La invitación a la oficina no lleva dirección en la captura. |
| E-AIA-35 | OBS | S · página completa | valores: «Innovación Aplicada · Colaboración Humano-IA · Enfoque en Resultados · Evolución Continua · Inclusión y Talento» | La página «Somos» no tiene fundadores, equipo, fotos, historia ni año de fundación. Repite contadores y logos. |
| E-AIA-36 | OBS | C · «Planificación Detallada de Implementación» | «pruebas de concepto de alto impacto con criterios de salida claros (escalar, ajustar o descartar)» | Criterio de salida explícito para pilotos. Es una idea fuerte que no se aprovecha. |
| E-AIA-37 | OBS | C · «Creación de un Roadmap…» | «cuantificamos el impacto económico por caso de uso (ROI) con métricas de éxito para decidir qué escalar» | Priorización por ROI por caso de uso. |
| E-AIA-38 | OBS | C · «Asesoramiento en Selección de Proveedores» | «te guían con criterio independiente… comparamos riesgos y costo total» | Afirma independencia frente a proveedores, lo que contrasta con el muro de 48 logos. |
| E-AIA-39 | OBS | C · «Así Articulamos tu consultoría…» | «Inmersión y Diagnóstico Profundo · Co-creación de la Estrategia y Hoja de Ruta · Guía Tecnológica… · Medición de Avance…» | Otro proceso de 4 pasos, distinto al de la home, en carrusel en bucle (el markdown lo repite 3-4-1-2-3-4-1-2). Incluye «Data First» y «Seguridad por diseño». |
| E-AIA-40 | OBS | A · «Tenemos un Agente de IA Listo para Ayudarte» | «MaxHealth · MaxShopper · MaxLegal · … · MaxAgro» | Catálogo de 15 agentes con marca «Max*», uno por sector, cada uno con su landing («Conoce más»). |
| E-AIA-41 | OBS | A · «Resultados Reales del Uso de asistentes…» | «El 84 % de los vendedores encuestados que usan IA generativa ha logrado incrementar sus ventas» | Estadísticas de mercado sin fuente, presentadas bajo el titular «Resultados Reales». |
| E-AIA-42 | OBS | A · «Resultados que Obtendrás…» | «Automatización de hasta el 60% de Tareas Repetitivas» | Promesa cuantitativa genérica sin línea base ni caso. |
| E-AIA-43 | OBS | AU · «Experiencia Demostrada…» | «Casos de Éxito que Avalan Nuestra Capacidad…» → solo los 5 contadores | El titular promete casos y lo que sigue son contadores. |
| E-AIA-44 | OBS / INF | AU · «Así Implementamos…» | 5 pasos: «Análisis y Diagnóstico · Diseño de Estrategia · Desarrollo y Pruebas · Despliegue… · Capacitación y Soporte» | Es el cuarto método diferente del sitio. INF: no hay un marco propio. Cada landing tiene su propio proceso de plantilla. |
| E-AIA-45 | OBS / INF | H · links (después del cuerpo) | `agenciaia.com.co` · `agenciaia.us` · `agenciaia.com.es` · `agenciaia.com.ec` · `agenciaia.com.pa` | Red de dominios por país en el footer. INF: plantilla SEO replicada en varios países, lo que explica el texto colombiano en el FAQ. |
| E-AIA-46 | OBS | HH · settings | `_animation: fadeIn` ×37 · `fadeInUp` ×4 · `fadeInLeft` ×6 · `motion_fx_scrolling` ×3 · `motion_fx_mouse` ×1 · `sticky: top` ×1 | Mucho movimiento de entrada por scroll, parallax y efecto de ratón. Lo que dice la evidencia es la configuración, no cómo se ve renderizado. |
| E-AIA-47 | OBS | HH · H2 inline | `<span style="color: #FF8800">Agencia de IA</span>` (×14) · `#0F172A` en flechas SVG | Acento naranja sobre una parte de cada H2. El color del resto de la paleta es UNK. |
| E-AIA-48 | OBS | HH · recuento de widgets | image 60 · heading 49 · text-editor 20 · icon-box 6 · counter 5 · flip-box 4 | 16 secciones y 60 imágenes en la home: densidad alta. |
| E-AIA-49 | UNK | HH · `<head>` / `<script>` ausentes | — | Fuentes, CSS global, fondos, chat flotante, WhatsApp flotante, analítica y rendimiento: **no establecidos**. |
| E-AIA-50 | OBS / INF | H · nombres de archivo | `feliz-mujer-morena-camisa-sentada-suelo-computadora-portatil-…png` · `Group-2297.png` · `cifras-3.png` | INF por el nombre de archivo: foto de stock y gráficos exportados de un diseño. El contenido real de las imágenes es UNK. |
| E-AIA-51 | OBS | H · meta description | «empresa de agentes de voz y texto, automatización IA de procesos operativos, marketing y ventas» | La meta habla de «agentes de voz», algo que el cuerpo apenas menciona («Call Center con IA»). |
| E-AIA-52 | OBS | H / AU / A | «Mas de10» · «Implementacion de Agentes IA» · «Aautomatización» · «ma0keting» | Erratas en titulares y listas. |
| E-AIA-53 | INF | H · hero + `<title>` | — | La home prioriza el posicionamiento para «agencia de IA Perú» frente a la claridad comercial. Se ve en el H1, el title, los alt-text y el FAQ. |
| E-AIA-54 | OBS | C · FAQ «¿Qué entregables concretos…?» | «diagnósticos de procesos, mapas de implementación, modelos de IA personalizados, capacitación del equipo y métricas» | Entregables explícitos, pero solo en el FAQ de una subpágina. |
| E-AIA-55 | OBS | C · «Desarrollamos el Capital Humano…» | «IA para Líderes Ejecutivos — Sesiones de alto nivel… oportunidades, riesgos y gobernanza de la IA» | La formación ejecutiva es una línea de oferta. |
| E-AIA-56 | OBS / INF | H · links (después del cuerpo) | `/consultoria-…`, `/desarrollo-de-ia-modelos-…`, `/sistemas-multiagentes-…`, `/ia-para-analisis-de-datos-…`, `/automatizacion-…`, `/automatizacion-rpa-…`, `/…-para-ventas-…`, `/ia-para-atencion-al-cliente-…`, `/mantenimiento-de-agentes-…` | 9 servicios, previsiblemente en el footer (INF por su posición en la lista). Junto a los 15 agentes suman unas 24 landings de oferta. No hay URL de casos, precios ni contacto. |
| E-AIA-57 | OBS | S · «Enfoque en Resultados» | «No implementamos tecnología por sí misma» | Frase sobria y bien orientada, rodeada de mensajes de hype. |

---

## Arquitectura de la home (sección a sección)

El orden y los widgets salen del HTML (contenedores Elementor `e-parent`). Lo que cada sección «hace» es INF.

| # | Sección (titular literal) | Componentes | Trabajo que intenta hacer | Valoración |
|---|---|---|---|---|
| 0 | «Agencia de IA en Perú» / «Automatización con IA hecha a la medida…» | H1, H2, párrafo, **video de fondo** | Categoría + geografía para SEO | Sin problema concreto, sin prueba y sin CTA (E-AIA-02, 04) |
| 1 | «Una Agencia de IA con Soluciones Estratégicas» | texto + 4 imágenes PNG | Identidad y audiencia (CEOs, CTOs, empresarios) | La audiencia llega tarde y es amplia (E-AIA-05) |
| 2 | «La IA ya no es una opción es el ecosistema donde compites y ganas» | titular + video YouTube | Urgencia / FOMO | Hype; el contenido del video es UNK (E-AIA-06) |
| 3 | «Soluciones de IA Diseñadas para tus Desafíos Empresariales» | 4 bloques de texto | Mapa de oferta por área funcional | Claro pero genérico (E-AIA-07) |
| 4 | «Ventajas Estratégicas…» | icon-box×6 | Beneficios | Intercambiables (E-AIA-08) |
| 5 | «Implementacion de Agentes IA / Creamos tu Fuerza de Trabajo Digital a Medida» | texto + 3 imágenes | Producto estrella: avatares Maxia y Max | Diferenciador «de marca», no de resultado (E-AIA-09) |
| 6 | «¿Cómo Hacemos Inteligencia Artificial En 4 Fases?» | flip-box×4 | Método | El contenido queda oculto tras la interacción (E-AIA-10) |
| 7 | «Algunos equipos que ya optimizan sus procesos…» + «Confianza Basada en Experiencia…» | 3 áreas + counter×5 | Prueba social cuantitativa | Cifras sin fuente y poco coherentes (E-AIA-11, 12) |
| 8–9 | «10 Razones Por Que Elegirnos…» | tabla de 4 columnas (icon-list×4) | Posicionamiento comparativo | Útil como idea, pero con *strawman* (E-AIA-13) |
| 10 | «Empresa De Inteligencia Artificial Con Experiencia En Distintas Industrias» | 1 infografía | Amplitud sectorial | Subtítulo repetido, sin casos (E-AIA-14) |
| 11 | «Dominamos las Herramientas y Plataformas Líderes…» | nested-tabs (8) + 48 logos | Competencia técnica | Se puede confundir con clientes o partners (E-AIA-15, 16) |
| 12 | «Automatización Inteligente de Procesos con IA» | 2 listas dolor/logro + comparador Antes/Después | Problema → resultado | **El problema llega en la sección 12 de 16** (E-AIA-17) |
| 13 | «¡Agendemos una reunión pronto!» / «¡ESCRÍBENOS! Déjanos tus datos» | titular rotativo + iframe LeadConnector | Conversión | Único CTA real, al ~80 % del scroll (E-AIA-18) |
| 14 | «Preguntas Frecuentes sobre la Implementación de IA con Automaxia» | nested-accordion, 10 respuestas largas | SEO / objeciones | Relleno de keywords; esconde lo valioso (E-AIA-21…25) |
| 15 | «Explora el Mundo de la IA Aplicada a los Negocios» | loop-grid de 3 posts | Autoridad y contenido | Solo hay 3 artículos (E-AIA-27) |

**Lectura del arco (INF).** El orden es *categoría → identidad → urgencia → oferta → beneficios → producto → método →
cifras → comparación → stack → problema → formulario → FAQ → blog*. Está invertido respecto a un arco consultivo
(*problema → resultado → prueba → método → oferta → siguiente paso*): el **problema aparece casi al final** y la
**prueba concreta no aparece nunca** en la home.

---

## Propuesta de valor

- **Hero literal (OBS, E-AIA-02, E-AIA-03).**
  H1: «Agencia de IA en Perú». H2: «Automatización con IA hecha a la medida que potencia la agilidad de las empresas».
  Párrafo: «En agencia de ia Automaxia diseñamos soluciones que optimizan tus operaciones de marketing, ventas, atención
  al cliente y gestión interna…».
- **¿Para quién?** El hero dice «las empresas». La audiencia aparece en la sección 1 («CEOs, Directores de Tecnología
  y Empresarios») y luego cambia en cada landing: directores de marketing y gerentes de ventas en agentes; COO, CFO,
  logística y RR. HH. en automatización; directivos e innovación en consultoría (E-AIA-05; capturas A, AU, C).
  *Tiempo para entenderlo:* lento; hay que leer la segunda sección.
- **¿Qué problema?** El hero no lo dice. El primer dolor explícito de la home («Pérdida de clientes y oportunidades por
  respuestas lentas e impersonales») está en la sección 12 (E-AIA-17).
- **¿Qué resultado?** «agilidad», «resultados tangibles, eficiencia, mejores decisiones y crecimiento sostenible»:
  abstracto y sin cuantificar. El único plazo (4–12 semanas) está en el FAQ (E-AIA-24).
- **Diagnóstico (INF).** En dos segundos el visitante sabe que es una *agencia peruana de automatización con IA*. No
  sabe qué la distingue, qué gana ni qué tiene que hacer a continuación. La diferenciación que el sitio cree tener
  (agentes con personalidad, Maxia y Max) es de producto y de marca, no de resultado.

---

## Oferta

- **Agrupación en home (OBS, E-AIA-07).** Cuatro áreas funcionales: Marketing y Ventas · Operaciones · Experiencia
  de Cliente · Análisis y Decisiones. Sin paquetes, niveles ni fases comerciales.
- **Árbol real del sitio (OBS/INF, E-AIA-40, E-AIA-56).** Unas 24 landings de oferta:
  - **9 servicios** (consultoría, desarrollo de modelos, sistemas multiagente, análisis de datos, automatización,
    RPA + IA, IA para ventas, IA para atención al cliente, mantenimiento de agentes).
  - **15 agentes «Max*» por sector** (MaxHealth, MaxShopper, MaxLegal, MaxFinance, MaxVox, MaxTutor, MaxDrive,
    MaxMarket, MaxTalent, MaxTravel, MaxSecure, MaxProtect, MaxPharma, MaxAdmin, MaxAgro).
  - **Formación** («Programas de Formación», «Talleres Prácticos», «Cursos Avanzados», «IA para Líderes Ejecutivos»,
    E-AIA-55).
- **Nombres.** Hay dos registros mezclados: descriptivos SEO («Consultoría en inteligencia artificial», «Automatización
  con IA para empresas») y de producto-mascota («Maxia», «Max», «MaxAgro»). INF: el catálogo de 15 agentes es
  sobre todo una estrategia de captura SEO por vertical. Cada ficha es una frase de capacidad, no una oferta con alcance.
- **Señales de precio (OBS, E-AIA-28, E-AIA-30, E-AIA-31).** Solo en el blog: rangos en soles por tipo de proyecto
  (S/ 8.000 a S/ 150.000), auditoría gratuita de 5 días, MVP en 30–60 días, implementación escalonada, financiación a
  12–24 meses y revenue share. La home se limita a decir «Precios claros y contratos simples» en la tabla comparativa
  (E-AIA-13), sin enlazar a ningún precio.
- **Lectura (INF).** La oferta es ancha y está poco empaquetada. El comprador no puede responder «¿qué compro
  primero, cuánto dura y cuánto cuesta?» desde la home, aunque el sitio tiene la respuesta en un artículo.

---

## Prueba

| Tipo de prueba | ¿Existe? | Concreción | Ubicación | IDs |
|---|---|---|---|---|
| Casos con cliente identificado | No | — | — | E-AIA-14, 43 |
| Casos anónimos con cifras | Sí (3) | Alta: inversión, % y payback | Blog (artículo ROI) | E-AIA-29 |
| Contadores (años, profesionales, clientes, países) | Sí | Baja: sin fuente, coherencia dudosa | Home y todas las landings | E-AIA-11, 12 |
| Logos de clientes | No | — | — | E-AIA-16 |
| Logos de tecnología | Sí (48) | Media: muestran stack, no relación | Home, agentes, somos | E-AIA-15 |
| Testimonios | No observados | — | — | — |
| Certificaciones / partnerships | No observadas | — | — | E-AIA-16 |
| Fundadores / equipo | No | Un «Director» sin nombre en el blog | Blog | E-AIA-33, 35 |
| Estadísticas de mercado | Sí | Baja: sin fuente | Agentes | E-AIA-41 |
| Comparativa competitiva | Sí | Media: argumentativa | Home y agentes | E-AIA-13 |

**Conclusión (INF).** El sitio sustituye la prueba por *volumen de señales*. Los únicos datos que un comprador
analítico tomaría en serio (los payback de 3,2, 8 y 11 meses) son anónimos, están en el blog y los firma un autor
genérico. Hay incoherencias internas (150 proyectos frente a 130 clientes, 23 países en 3 años) que un lector atento
detecta y que restan confianza a todo lo demás.

---

## Método

- **¿Tiene nombre?** No. La palabra «Metodología» aparece como título genérico («Nuestra Metodología Detallada…»,
  «Metodología AgenciaIA»), no como marco propio.
- **Cinco versiones (OBS, E-AIA-10, E-AIA-30, E-AIA-39, E-AIA-44).**

| Página | Pasos | Nombres |
|---|---|---|
| Home | 4 | Diagnóstico → Desarrollo/Integración → Entrenamiento/Despliegue → Validación/Acompañamiento |
| Consultoría | 4 | Inmersión y Diagnóstico → Co-creación de Estrategia y Hoja de Ruta → Guía Tecnológica y Adaptación → Medición y Optimización |
| Agentes | 4 | Análisis y Estrategia → Diseño y Entrenamiento → Integración y Pruebas → Lanzamiento y Optimización |
| Automatización | 5 | Análisis y Diagnóstico → Diseño de Estrategia → Desarrollo y Pruebas → Despliegue Controlado → Capacitación y Soporte |
| Blog ROI | 3 | Auditoría Gratuita (5 días) → MVP (30–60 días) → Implementación Escalonada |

- **Cómo se muestra.** En la home, flip-boxes donde la descripción queda tras la interacción. En consultoría y
  automatización, carruseles numerados en bucle. En agentes, una lista con imagen. Solo el blog pone **duración** a
  las fases.
- **Contenido rescatable (OBS).** Dentro de esas descripciones hay buen material de oficio: «liberando por fases para
  reducir riesgos», «pruebas A/B y control de costos», «Data First: Control de calidad de datos…», «Pilotos con línea
  base y métricas de negocio antes/después», «Seguridad por diseño», «criterios de salida claros (escalar, ajustar o
  descartar)».
- **Lectura (INF).** Hay sustancia metodológica, pero está fragmentada y sin marca. Esa fragmentación sugiere
  plantillas por landing más que una práctica unificada.

---

## CTAs

| Elemento | Texto | Ubicación | Tipo / fricción | IDs |
|---|---|---|---|---|
| Disparador de popup en el header | **UNK** | Header (antes del cuerpo en `links`) | Popup Elementor 3524, posiblemente con entrada lateral; contenido UNK | E-AIA-20 |
| Formulario embebido | «¡Agendemos una reunión pronto!» · «Asesoría Consultiva» · «¡ESCRÍBENOS! Déjanos tus datos» (rotativo) | Home, sección 13 de 16 | iframe LeadConnector; campos UNK; sin calendario visible | E-AIA-18 |
| «Leer más» ×3 | «Leer más» | Final de la home | Navegación al blog | E-AIA-19 |
| «Contáctanos» | «Contáctanos» → `#` | Somos | Ancla vacía en el markdown (destino UNK) | captura S |
| «Conoce más» ×15 | «Conoce más» | Agentes | Navegación a fichas por sector | E-AIA-40 |
| Oferta gratuita en FAQ | «reunión exploratoria gratuita», «piloto de bajo riesgo» | Acordeón FAQ | Sin botón asociado | E-AIA-25 |
| Oferta gratuita en blog | «Agenda tu auditoría gratuita»: email + WhatsApp | Final del artículo ROI | Texto, WhatsApp con patrón de placeholder | E-AIA-30, 34 |
| Calculadora de ROI | «Tu Siguiente Paso: Calculadora Personalizada de ROI» | Artículo ROI | En la captura no hay enlace ni herramienta | captura R |

**Lectura (INF).** El cuerpo de la home tiene un único CTA real, tarde y con un microcopy («Déjanos tus datos»)
centrado en lo que pide la agencia y no en lo que recibe el visitante. Las ofertas de entrada atractivas (auditoría de
5 días, piloto de bajo riesgo, reunión exploratoria gratuita) no tienen botón ni ubicación prominente. En el cuerpo
capturado no hay WhatsApp ni calendario. Si existen como elementos flotantes o en el header es **UNK**.

---

## Tono

- **Registro dominante: comercial-aspiracional con hype moderado-alto (INF a partir de OBS).** Frases tipo: «La IA ya
  no es una opción es el ecosistema donde compites y ganas», «te ayudan a dominar el mercado», «No solo creamos
  inteligencia artificial; le damos vida», «Fuerza de Trabajo Digital», «¿Puedes permitirte NO invertir?» (E-AIA-06,
  E-AIA-09; capturas A y R).
- **Vocabulario.** Mezcla jerga técnica (pipelines, SSO, RAG, latencia, umbrales, QA, A/B) con lugares comunes de
  agencia («ventaja competitiva», «siguiente nivel», «resultados tangibles»). Tutea al lector.
- **Islas consultivas.** Hay pasajes sobrios y honestos: «No implementamos tecnología por sí misma» (E-AIA-57), «Sé
  transparente contigo: No todos los proyectos IA tienen sentido financiero» (E-AIA-32), «criterios de salida claros»
  (E-AIA-36). Prueban que el registro consultivo existe en la organización, pero no domina.
- **FAQ.** Prosa de relleno SEO con keywords repetidas («web con inteligencia artificial», «call center con
  inteligencia», «crear facturas», «automatizaciones con make») y errores («earning deep learning»). El tono se rompe
  del todo (E-AIA-21, E-AIA-22).
- **Localización.** El artículo ROI habla «en soles» porque «así es como piensa y toma decisiones el empresario
  peruano»: un acierto de empatía con el comprador (E-AIA-28).

---

## Presentación visual

> Base de evidencia: settings y widgets del HTML de Elementor y nombres de archivo. **No hay render ni captura de
> pantalla.** Todo lo que no se pueda deducir de la configuración se marca UNK.

| Dimensión | Hallazgo | Tipo | IDs |
|---|---|---|---|
| Plataforma | WordPress + Elementor / Elementor Pro + JetElements (comparador, parallax) | OBS | E-AIA-46 |
| Tipografía | **UNK**: `<head>` y CSS ausentes; no hay `font-family` en el HTML capturado | UNK | E-AIA-49 |
| Color | Acento `#FF8800` en un fragmento de cada H2 (×14); `#0F172A` en flechas SVG. Fondos y texto base UNK | OBS / UNK | E-AIA-47 |
| Densidad | 16 secciones, 60 imágenes, 49 headings, 20 bloques de texto, 10 respuestas FAQ de 3–5 párrafos | OBS | E-AIA-48 |
| Espacio en blanco | **UNK** (no hay render). INF: con esa densidad, el ritmo vertical es muy cargado | UNK / INF | E-AIA-48 |
| Imágenes | PNG/JPG con nombres de stock y de exportación de diseño («feliz-mujer-morena…», «Group-2297», «cifras-3», «Agentes-IA-automaxia-ia.jpg»); fotos antes/después; 48 logos | OBS / INF | E-AIA-17, 50 |
| Iconografía | icon-box×6, icon-list×6; SVGs de valores («robotic_7406523.svg»: nombre típico de pack de iconos) | OBS / INF | captura S |
| Video | Fondo YouTube en el hero + widget de video en la sección 2 | OBS | E-AIA-04, 06 |
| Movimiento | fadeIn ×37, fadeInUp/Left/Right, motion_fx de scroll, opacidad y ratón, contadores animados a 2000 ms, titular rotativo «wave», 1 elemento sticky | OBS (configuración) | E-AIA-11, 18, 46 |
| Componentes | flip-boxes, nested-tabs (8), nested-accordion (FAQ), carruseles en bucle (subpáginas), comparador de imágenes, loop-grid de posts, popup | OBS | E-AIA-10, 15, 17, 21, 39 |
| Rendimiento / accesibilidad | **UNK**. INF de riesgo: dos iframes de YouTube, un iframe de CRM, 60 imágenes, contenido detrás de hover (flip) y carruseles en bucle; `<html lang="">` vacío | INF / OBS | HH |

---

## Debilidades

1. **Hero orientado a SEO, no a comprador.** Keyword en el H1, sin problema, sin prueba y sin CTA (E-AIA-01, 02, 04, 53).
2. **Problema tardío.** El dolor aparece en la sección 12 de 16 (E-AIA-17).
3. **Prueba no verificable.** No hay ningún cliente nombrado, ni testimonio, ni fundador. Hay contadores incoherentes y
   estadísticas sin fuente bajo «Resultados Reales» (E-AIA-11, 12, 33, 35, 41, 43).
4. **Los mejores argumentos están enterrados.** Precios, payback, auditoría gratuita, MVP, revenue share y «cuándo no
   invertir» viven en un único post. Criterios de salida y ROI por caso viven en una subpágina (E-AIA-28…32, 36, 37).
5. **Método sin nombre y contradictorio.** Cinco procesos distintos (E-AIA-44).
6. **Oferta inflada.** Unas 24 landings, 15 mascotas, 4 áreas funcionales, formación y desarrollo de modelos. El
   comprador no sabe qué comprar primero (E-AIA-40, 56).
7. **Contradicción de posicionamiento.** Dice tener «criterio independiente» frente a proveedores (E-AIA-38) y muestra
   48 logos de proveedores como trofeo (E-AIA-15).
8. **Comparativa con *strawman*.** «Consultorías Grandes: Metas poco claras… Solo tecnicismos» no resiste a un
   comprador de gran empresa (E-AIA-13).
9. **Higiene y coherencia de marca.** Tres nombres de marca, texto colombiano en un sitio peruano, placeholders,
   WhatsApp sospechoso, erratas en titulares y subtítulo duplicado (E-AIA-14, 21, 22, 23, 34, 45, 52).
10. **FAQ relleno SEO.** Mina la credibilidad justo en la sección pensada para resolver objeciones (E-AIA-21).
11. **CTA único, tardío y centrado en la agencia.** «Déjanos tus datos», sin calendario ni oferta clara (E-AIA-18, 19).
12. **Contenido tras la interacción.** Flip-boxes y carruseles esconden el método. Exceso de animación configurada
    (E-AIA-10, 39, 46).
13. **Blog mínimo.** 3 artículos y autor genérico: la «autoridad» que se promete no está respaldada (E-AIA-27, 33).
14. **Incoherencia entre meta y cuerpo.** «Agentes de voz» en la meta, casi ausente en el contenido (E-AIA-51).

---

## Ideas transferibles a SLG

Contexto: Soft Landing Global es una consultora de **estrategia e implementación de IA** con estética **sobria,
nórdico-minimalista**, que necesita mostrar su propuesta de valor con más fuerza. Criterio: copiar la *sustancia*
consultiva y rechazar el *ruido* de agencia.

| Idea (origen) | Tal cual / Adaptar / Rechazar | Por qué |
|---|---|---|
| Criterios de salida explícitos en pilotos: «escalar, ajustar o descartar» (E-AIA-36) | **Tal cual** | Es exactamente el tipo de rigor que diferencia una consultora estratégica. Comunica disciplina y control del riesgo en tres palabras. |
| Priorizar casos de uso por ROI cuantificado antes de escalar (E-AIA-37) | **Tal cual** | Responde la pregunta del comité («¿por qué este caso primero?») y encaja con la estrategia como entrada. |
| Sección «Cuándo no conviene invertir en IA», con *red flags* (E-AIA-32) | **Adaptar**: subirla a la home o a la página de método, con 3–4 criterios propios de SLG | Es el dispositivo de confianza más potente y más coherente con un tono sobrio. Ellos lo esconden en el blog. |
| Un único método con nombre, fases fijas y duración por fase (contraste con E-AIA-44; duraciones de E-AIA-30) | **Adaptar** | Su punto débil es la oportunidad de SLG: un marco con nombre, idéntico en todas las páginas y con plazos indicativos. |
| Diagnóstico de entrada acotado en tiempo y sin compromiso (auditoría de 5 días, E-AIA-30) | **Adaptar**: diagnóstico con alcance, duración y entregable definidos como CTA primario | Baja la fricción de la primera compra. SLG debe decidir si es gratuito o de pago; un diagnóstico de pago con entregable claro puede reforzar el posicionamiento premium. |
| Entregables explícitos por fase (E-AIA-54) | **Tal cual** | El comprador de consultoría compra entregables. Ellos los tienen solo en un FAQ. |
| Rangos de inversión orientativos por tipo de encargo (E-AIA-28) | **Adaptar**: rangos o «desde» por formato de encargo, en la moneda del comprador | La transparencia de precio es un diferenciador real. Hablar en la moneda del cliente es empatía («prefiero hablar en soles»). |
| Casos con inversión, métrica y payback (E-AIA-29) | **Adaptar**: casos reales, con contexto, línea base y resultado, en la home y no en el blog; anonimizados con permiso si hace falta | La estructura situación → solución → resultado con payback es la correcta. La ejecución anónima y escondida no lo es. |
| Nombrar al lector por rol en cada servicio (E-AIA-05; capturas AU, C) | **Tal cual** | Ayuda a autoseleccionarse rápido. SLG debería decirlo ya en el hero o en la primera pantalla. |
| Listas de problemas en lenguaje del comprador («Incertidumbre sobre por dónde comenzar…», «Temor a invertir sin estrategia…», captura C) | **Adaptar**: 3 problemas, arriba en la página | Las de consultoría son buenas y específicas de un directivo. Hay que subirlas antes de la oferta. |
| Pasajes de oficio: «Data First», «Seguridad por diseño», «liberando por fases para reducir riesgos», «línea base antes/después» (E-AIA-39, E-AIA-10) | **Adaptar** como principios de trabajo de SLG | Muestran competencia sin hype. En SLG irían como principios breves y verificables, no como texto de relleno. |
| Formación ejecutiva y gestión del cambio como parte de la adopción (E-AIA-55) | **Adaptar** | Encaja con un aterrizaje («soft landing») de la IA en la organización, como componente del método y no como catálogo de cursos. |
| Comparativa de posicionamiento contra alternativas (E-AIA-13) | **Adaptar**: 3–4 filas honestas (p. ej. frente a gran consultora, integrador de software y hacerlo internamente), sin caricaturas | La idea de anclar contra alternativas ayuda. El *strawman* resta credibilidad ante directivos. |
| Fase explícita de acompañamiento posterior (Customer Success, playbooks; E-AIA-10) | **Adaptar** | Resuelve la objeción de que «implementan y se van». En SLG, formulado como fase del método con alcance definido. |
| Comparador antes/después (E-AIA-17) | **Adaptar**: diagrama estático de un proceso antes y después, no fotos de stock | El concepto visual de transformación es útil. El slider con fotos genéricas no aporta. |
| Acento de color sobre una parte del titular (E-AIA-47) | **Adaptar**: un único acento, muy dosificado | Compatible con el minimalismo nórdico si se usa en uno o dos puntos por página, no en cada H2. |
| Catálogo de agentes-mascota con marca propia (Maxia, Max, 15 «Max*»; E-AIA-09, 40) | **Rechazar** | Trivializa la oferta, la convierte en producto de agencia y diluye el posicionamiento estratégico. |
| Muro de 48 logos de tecnología (E-AIA-15) | **Rechazar** (sustituir por una declaración de independencia tecnológica y criterio de selección) | Se puede leer como prueba falsa de clientes y contradice la independencia frente a proveedores (E-AIA-38). |
| Contadores animados sin fuente (E-AIA-11, 12) | **Rechazar** | Si las cifras no son verificables y coherentes, restan. Solo cifras con contexto, o ninguna. |
| Estadísticas de mercado sin fuente bajo «Resultados Reales» (E-AIA-41) | **Rechazar** | Mezclar datos de terceros con resultados propios es engañoso para un comprador analítico. |
| FAQ largo escrito para SEO (E-AIA-21) | **Rechazar**; **adaptar** el formato FAQ corto, con respuestas reales y datos estructurados | Las objeciones se responden en 2–3 frases. El relleno destruye la confianza en la sección que debía generarla. |
| Flip-boxes y carruseles en bucle para el método (E-AIA-10, 39) | **Rechazar** | Ocultan contenido clave, perjudican la accesibilidad y contradicen la claridad nórdica. Mejor pasos visibles y numerados. |
| Titular rotativo animado en el CTA (E-AIA-18) | **Rechazar** | Es movimiento gratuito. Un CTA sobrio debe nombrar lo que recibe el visitante. |
| Video de fondo en el hero y animación por scroll generalizada (E-AIA-04, 46) | **Rechazar** | Peso, distracción y estética de agencia. SLG gana con tipografía, espacio y una frase fuerte. |
| Revenue share o financiación en la web pública (E-AIA-31) | **Rechazar** en la web (puede usarse en la conversación comercial) | Añade complejidad y puede sonar desesperado en una consultora estratégica. Mejor como opción en la propuesta. |
| Red de dominios por país con plantilla replicada (E-AIA-45) | **Rechazar** | Es la causa probable del texto colombiano en el sitio peruano. Si SLG necesita varios mercados, mejor un único sitio ES/EN cuidado. |
| Formulario de un CRM de terceros embebido como único CTA (E-AIA-18) | **Adaptar**: un CTA primario con nombre de oferta (p. ej. «Solicitar diagnóstico») y presente desde la primera pantalla | Lo que falla no es la tecnología del formulario, sino la ubicación, el microcopy y la ausencia de una oferta concreta. |

---

## Desconocidos y límites de la captura

- **No hay evidencia visual.** No se obtuvieron capturas de pantalla; las herramientas CDP de REA no pueden llegar al
  host por la política de red del contenedor. Lo dicho sobre animación describe la **configuración** de Elementor, no
  el comportamiento renderizado (E-AIA-46).
- **HTML sin `<head>`, `<style>` ni `<script>`.** Desconocidos: familias tipográficas, escala tipográfica, paleta
  completa, colores de fondo, uso de espacio en blanco, librerías JS de terceros, widget de chat o WhatsApp flotante,
  analítica y rendimiento (E-AIA-49).
- **Header y footer no están en el markdown.** Su contenido se infiere solo por la posición de los enlaces en la
  lista `links`. Desconocidos: etiquetas del menú, **texto del CTA del header**, contenido del popup 3524 (E-AIA-20,
  E-AIA-56).
- **Formulario en iframe de terceros (LeadConnector).** Campos, número de pasos y si incluye agenda: **UNK** (E-AIA-18).
- **Contenido multimedia.** No se sabe qué muestran los dos videos de YouTube (xVRuojSad7M y 85muQFDxlSc), la
  infografía «Distintas Industrias», las imágenes del hero ni las fotos antes/después; solo se conocen sus nombres de
  archivo (E-AIA-04, 06, 14, 17, 50).
- **Valores de los contadores.** Asignados por orden de widget (3, 43, 130, 13, 23), con confianza media (E-AIA-12).
- **Página `/preguntas-frecuentes/`.** Devolvió el cuerpo vacío. No se sabe si hay contenido cargado por JS
  (E-AIA-26).
- **JSON-LD.** El dataset expone campos de esquema (Organization con dirección, FAQ `mainEntity/acceptedAnswer`), pero
  la proyección anidada no devolvió valores. Contenido exacto **UNK**.
- **Páginas no capturadas.** No se revisaron las 15 fichas de agentes ni las landings de desarrollo de modelos,
  multiagentes, análisis de datos, RPA, ventas, atención al cliente y mantenimiento. En la lista de enlaces de la home
  **no aparece** ninguna URL de casos, precios o contacto (búsqueda acotada a esa lista).
- **El WhatsApp «+51 999 888 777».** Que sea un placeholder es una **inferencia** por patrón, no está verificado
  (E-AIA-34).
- **Responsive y móvil.** No evaluados.
