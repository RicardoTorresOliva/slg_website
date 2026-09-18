---
type: post
title: "El desafío del investigador y el estudiante en la era IA"
description: "Dónde el modelo aporta a una investigación y dónde la contamina sin dejar rastro, y el registro mínimo que hace defendible el trabajo asistido."
lang: es
pair: "researcher-student-ai-era"
date: 2026-09-18
tags:
  - AI Literacy
status: published
cover: null
social:
  hook: "Un método se defiende. Un modelo, en la mayoría de los trabajos que ya lo usan, solo se menciona."
  linkedin: "La inteligencia artificial entró en la investigación académica antes que el criterio para gobernarla. Este artículo separa dónde el modelo aporta y dónde contamina, trae una matriz de usos con su riesgo epistémico y fija el registro de cinco campos que hace defendible el trabajo asistido."
  x: "Un método se defiende: se explica, se replica, se audita. Un modelo, hoy, solo se menciona."
author: Ricardo Torres Oliva
copy: temporal
---

## Abstract

La inteligencia artificial entró en la investigación académica antes que el criterio para gobernarla. El resultado es una asimetría: al método se le exige declaración, replicabilidad y auditoría; al modelo, una frase al final del manuscrito. Investigadores y estudiantes de pregrado y postgrado que ya trabajan con modelos de lenguaje tienen que responder por lo que producen ante un comité, un tribunal o un editor, y hoy la mayoría no puede. Aquí se distingue dónde el modelo aporta y dónde contamina, se entrega una matriz de usos con su riesgo epistémico y lo que hay que declarar, y se fija el registro mínimo de cinco campos que hace defendible un trabajo asistido. La regla que lo ordena todo: la declaración se escribe mientras se trabaja, no cuando termina.

> Un método se defiende: se explica, se replica, se audita. Un modelo, en la mayoría de los trabajos que ya lo usan, no se defiende: se menciona. Este documento trata esa asimetría. Dónde la inteligencia artificial mejora una investigación, dónde la contamina sin dejar rastro, y qué hay que poder declarar.

## 1. El problema

La herramienta llegó antes que el criterio. Eso no es una falla moral de nadie: es una secuencia histórica. Pero el resultado es que hoy hay investigación en curso en la que el instrumento más influyente del proyecto es el único que no pasa por ningún control.

A un método se le exige que esté declarado, que sea replicable y que soporte una auditoría. A una muestra se le exige tamaño, procedencia y sesgo conocido. A un modelo se le exige, como mucho, una frase al final del manuscrito.

El modo de fallo dominante en el trabajo académico asistido por inteligencia artificial está identificado y tiene nombre: aceptación acrítica de las salidas del modelo [fuente: AI Literacy A Multi-Dimensional Analysis of Governance, Revenue Systems, and Epistemic Rigor in the Agentic Era]. No es que el investigador crea todo lo que el modelo dice. Es que revisa lo que suena raro y deja pasar lo que suena bien, y un modelo de lenguaje está optimizado precisamente para que todo suene bien.

Hay una segunda asimetría, más incómoda. Una muestra se puede volver a medir. Un código se puede volver a ejecutar. Una conversación con un modelo en una versión que ya fue retirada no se puede reconstruir. La irreproducibilidad no es un accidente del uso descuidado: es una propiedad por defecto del instrumento. Quien no la contrarresta deliberadamente, la hereda.

La brecha real de 2026 no es entre quienes usan inteligencia artificial y quienes no. Es entre quienes la consumen y quienes entienden cómo produce sus resultados [fuente: AI Literacy A Multi-Dimensional Analysis...]. Un investigador del primer grupo no está mal equipado: está sin defensa cuando le pregunten.

## 2. Por qué los enfoques habituales fallan

**La política binaria.** La mayoría de las instituciones han respondido con reglas de permiso: qué está permitido, qué está prohibido, en qué asignaturas. Una regla de permiso contesta «¿puedo?». La pregunta que decide si el trabajo se sostiene es otra: «¿cómo se sostiene esta afirmación?». Ninguna política de permiso produce trazabilidad.

**Los detectores.** Detectar texto sintético es una carrera armamentista con dos resultados garantizados: falsos positivos que dañan a estudiantes honestos y falsos negativos que absuelven a los hábiles. Un detector, incluso funcionando bien, prueba origen, no rigor. Un párrafo escrito enteramente por una persona puede ser insostenible, y un párrafo asistido puede ser impecable.

**El curso de herramientas.** La alfabetización de uso —qué modelo conviene, cómo escribir un prompt— se desactualiza en meses. La capacidad que no caduca es metacognitiva: mirar una salida y saber cuándo confiar, cuándo dudar, cuándo verificar y cuándo descartar [fuente: The Phoenix Doctrine v1.1]. Eso no se aprende en un taller de tres horas.

**La declaración escrita al final.** Es reporte orientado al producto. El estándar que ya se está imponiendo es el opuesto: documentación orientada al proceso, que captura cómo el investigador evaluó críticamente las alternativas que el modelo generó [fuente: AI Literacy A Multi-Dimensional Analysis...]. Una declaración redactada cuando el trabajo ya terminó es una reconstrucción de memoria. Una reconstrucción no es evidencia.

**La idea de que verificar es leer con atención.** No lo es. Verificar es un procedimiento con un criterio definido de antemano y un resultado expresado como tasa, no como veredicto. Esa es la diferencia entre creer que algo funciona y saber con qué frecuencia funciona [fuente: Evals Ingeniería de Confiabilidad y Evaluación de Sistemas Agénticos].

## 3. Dónde aporta y dónde contamina

Existe una división del trabajo que sí resiste el escrutinio. La máquina conduce la fase expansiva —generar variación, ampliar el espacio de alternativas— y el humano conduce la fase contractiva: eliminar lo que no puede sostenerse [fuente: AI Literacy A Multi-Dimensional Analysis...].

De ahí sale una regla operativa de una sola línea:

**La inteligencia artificial es legítima donde su salida va a ser filtrada por un criterio independiente. Contamina donde su salida *es* el criterio.**

Buscar veinte hipótesis rivales es expansión: las veinte pasarán después por el diseño experimental. Decidir cuál de las veinte es la buena es contracción, y ahí la máquina no tiene autoridad. Redactar una discusión a partir de resultados ya verificados es expansión de forma. Generar la discusión y aceptar sus inferencias es contracción delegada.

Esa regla se cruza con una segunda distinción, que es la que conviene tener en la cabeza durante el trabajo diario: el modelo puede operar como **instrumento**, como **socio** o como **proxy** [fuente: AI Literacy A Multi-Dimensional Analysis...].

- Como **instrumento**, ejecuta una tarea acotada con un criterio de corrección externo. Se calibra, igual que cualquier instrumento.
- Como **socio**, aporta alternativas que el investigador contrasta. Se contrasta, y el contraste se documenta.
- Como **proxy**, sustituye una tarea cognitiva que el investigador no realiza. El modo de fallo tiene nombre propio: deslocalización de la tarea cognitiva [fuente: AI Literacy A Multi-Dimensional Analysis...].

El uso como proxy no está prohibido por ninguna ley de la naturaleza. Pero solo hay dos destinos honestos para él: declararlo con precisión o retirarlo. Lo que no es defendible es que ocurra y no aparezca.

## 4. Matriz de usos de inteligencia artificial en investigación

Esta tabla es utilizable tal cual, sin contratar nada. La columna derecha es la que conviene tener escrita antes de empezar, no después.

| Uso | Riesgo epistémico | Qué hay que declarar |
|---|---|---|
| Búsqueda y cribado de literatura (revisión sistemática asistida) | Sesgo de automatización y huecos en los datos de entrenamiento: lo que el modelo no vio, para el proyecto no existe | Herramienta y versión, cadenas de consulta, criterios de inclusión y exclusión, y cuántos registros se descartaron sin revisión humana |
| Extracción de datos y construcción de tablas de evidencia | Errores silenciosos de lectura; el error no se distribuye al azar, se concentra en los estudios peor redactados | Proporción de registros verificados manualmente y tasa de error encontrada en esa muestra |
| Síntesis y redacción de secciones | Fluidez que enmascara ausencia de sustento; referencias plausibles que no existen | Qué secciones fueron asistidas y en qué grado; que la verificación de cada referencia fue humana |
| Generación de hipótesis y exploración de ideas | Incertidumbre no cuantificable: no distinguir un futuro posible de una invención de la máquina [fuente: AI Literacy A Multi-Dimensional Analysis...] | El punto de decisión: qué alternativas se descartaron y con qué criterio |
| Código de análisis | Resultado correcto por un camino incorrecto; deuda técnica que nadie audita | El código completo y las pruebas que lo verifican, no el resultado |
| Datos sintéticos o imputación | Material generado tratado como fuente primaria | Uso explícito, método, y separación visible entre dato observado y dato generado |
| Traducción y corrección de estilo | Bajo: no toca la inferencia. Cuidado con el cambio de matiz en términos técnicos | Mención mínima, según la norma del editor |
| Revisión por pares asistida | Confidencialidad del manuscrito ajeno; auto-preferencia del modelo que juzga [fuente: Evals Ingeniería de Confiabilidad...] | Habitualmente restringido o prohibido: verificar la política del editor antes de cargar nada |

## 5. Trazabilidad: la unidad que hay que guardar no es el prompt

Guardar los prompts es un archivo, no una defensa. La unidad que hace defendible un trabajo es el **punto de decisión**: el momento en que el investigador tuvo delante una salida del modelo y decidió algo sobre ella [fuente: AI Literacy A Multi-Dimensional Analysis...].

Un registro mínimo de uso tiene cinco campos y cabe en una hoja de cálculo:

1. **Fecha y herramienta con versión exacta.** Sin versión, no hay reproducibilidad posible.
2. **El encargo.** Qué se pidió, en qué contexto, con qué material cargado.
3. **La salida cruda.** Antes de editar. Es lo único que después permite comparar.
4. **La decisión y su criterio.** Aceptada, corregida, descartada — y por qué.
5. **La verificación.** Quién comprobó qué, contra qué fuente, con qué resultado.

Ese registro sirve para tres cosas distintas, y por eso vale la pena aunque nadie lo pida: permite reconstruir un error cuando aparece, permite aprender del patrón de los propios fallos, y sirve de evidencia de diligencia si alguien pregunta [fuente: Evals Ingeniería de Confiabilidad...].

Tres reglas lo hacen funcionar:

**Quien juzga no es quien construyó.** Es la regla doctrinal que gobierna la verificación de sistemas no deterministas [fuente: Evals Ingeniería de Confiabilidad...], y se traduce sin esfuerzo al trabajo académico: la sección asistida la revisa alguien que no la escribió, con el encargo explícito de buscar afirmaciones sin sustento. Autorrevisar texto propio asistido reúne dos sesgos en la misma persona.

**La verificación produce una tasa, no un veredicto.** Comprobar veinte referencias de un total de ciento veinte y encontrar tres inexistentes no es un incidente aislado: es una tasa de error del quince por ciento que se proyecta sobre el resto. Esa cifra hay que calcularla, escribirla y decidir de antemano qué valor obliga a rehacer el trabajo.

**El contexto se degrada.** La precisión de un modelo cae a medida que la conversación se llena de historial redundante y correcciones previas [fuente: AI Literacy A Multi-Dimensional Analysis...]. Las sesiones largas son las que más confianza generan y menos la merecen. Tarea nueva, sesión nueva, material cargado de nuevo.

## 6. La declaración: comité, tribunal, editor

Son tres audiencias con tres preguntas distintas. Una sola declaración genérica no responde a ninguna de las tres bien.

**El comité de ética pregunta a dónde fueron los datos.** Cargar entrevistas, historias clínicas o material de sujetos humanos en un servicio de terceros es una transferencia de datos, tenga o no tenga esa intención. Lo que hay que declarar es qué salió de la institución, hacia qué proveedor, bajo qué condiciones de retención y si el material se usó para entrenar.

**El tribunal o el jurado de tesis pregunta qué parte del razonamiento es del autor.** Aquí la norma internacional ya está fijada y es tajante: un modelo no puede figurar como autor, porque la autoría implica asumir responsabilidad por la integridad del trabajo y un modelo no puede asumirla [fuente: AI Literacy A Multi-Dimensional Analysis...]. La consecuencia práctica no es de forma: significa que toda salida asistida tiene un responsable humano con nombre, incluidas las que el autor no revisó.

**El editor pregunta dónde, cómo y con qué versión.** Los estándares de las principales instancias editoriales y de los comités internacionales de editores establecen que el uso se declara en la sección de métodos, especificando dónde se usó, cómo y qué versión de qué herramienta; que el material generado no se trata como fuente primaria; y que el uso de inteligencia artificial en el manejo o el análisis de datos se declara aparte [fuente: AI Literacy A Multi-Dimensional Analysis...].

A eso se suma, para quien publique o difunda en la Unión Europea, la obligación de transparencia sobre contenido sintético que entra en vigor en agosto de 2026 [fuente: AI Literacy A Multi-Dimensional Analysis...].

La regla que lo une todo es de secuencia, no de contenido: **la declaración se escribe mientras se trabaja.** Escrita al final, es una reconstrucción. Y si en mitad del proyecto no se puede redactar el párrafo de declaración, el problema no es de redacción: es que el trabajo no está trazado.

## 7. Qué hacer el lunes

1. Abrir en el proyecto en curso un registro de uso con los cinco campos de la sección 5. Empezar por la sesión del lunes, no por el histórico: el histórico no se reconstruye y el intento consume la semana.
2. Clasificar cada uso actual como instrumento, socio o proxy. Los que resulten proxy tienen dos destinos: declararse con precisión o retirarse.
3. Tomar una muestra de veinte referencias producidas o cribadas con ayuda del modelo y verificarlas a mano, una por una, contra la fuente. Anotar la tasa de error. Esa cifra es el dato más importante del proyecto esta semana.
4. Fijar por escrito, antes de seguir, qué tasa de error obligaría a rehacer la sección. Un umbral decidido después del resultado no es un umbral.
5. Escribir ahora el párrafo de declaración, con el trabajo a medias, y guardarlo con el manuscrito.
6. Pedir a un colega que no escribió la sección asistida que la revise con un encargo concreto: localizar afirmaciones sin fuente verificable.
7. Leer la política vigente del editor al que se piensa enviar y la de la institución. Anotar las dos diferencias más grandes y resolver por la más estricta.

## Qué no hemos cubierto aquí

Este documento no cubre los regímenes disciplinares propios: ensayos clínicos, datos personales de sujetos humanos, material sujeto a acuerdos de confidencialidad industrial o clasificación. En esos campos la regla aplicable manda sobre cualquier criterio general, incluido este.

Tampoco compara herramientas concretas ni recomienda ninguna. El panorama cambia en meses y un documento que nombrara productos envejecería antes de ser útil. La distinción entre modelos ejecutados localmente y servicios en la nube —relevante para datos sensibles— queda fuera por la misma razón.

No contiene la normativa de cada país ni de cada universidad de la región. Contiene el criterio con el que leerlas.

Y no sustituye el trabajo de aplicar todo esto a un proyecto real, con su registro, su tasa de error medida y su declaración escrita. Ese trabajo, hecho sobre el proyecto propio del participante, es `Phoenix RETx`.

## Para seguir leyendo

- [Phoenix RETx](/ai/academy/phoenix-retx)
- [Cuándo un programa a medida es la respuesta y cuándo no (D-04)](/descargas/d-04)
- [The Phoenix Doctrine](/doctrina)
- [Autoridad silenciosa: Agentic Mindset](/blog/autoridad-silenciosa)
