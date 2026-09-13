---
type: post
title: "El mes cuatro"
description: "El piloto funcionó y el despliegue no avanza. No es falta de presupuesto: es que nadie presupuestó la diferencia."
lang: es
pair: null
date: 2026-09-11
tags:
  - Antifragilidad
  - Hyperflexibility
status: published
cover: null
social:
  hook: "El piloto funcionó y el despliegue no avanza. Casi siempre es el mes cuatro."
  linkedin: "Un piloto demuestra que algo puede funcionar. Un despliegue exige que funcione cuando el que lo montó está de vacaciones, los datos llegan sucios y alguien pregunta quién responde si se equivoca. Son dos proyectos distintos, y casi nadie presupuesta el segundo."
  x: "Un piloto demuestra que puede funcionar. Un despliegue exige que funcione sin ti."
author: Ricardo Torres Oliva
copy: temporal
---

Los proyectos de inteligencia artificial rara vez se abandonan en el mes uno. Se abandonan en el
cuatro, y casi siempre por el mismo motivo.

Un piloto demuestra que algo **puede** funcionar: con datos elegidos, con el equipo que lo montó
delante y con permiso implícito para que falle. Un despliegue exige que funcione cuando el que lo
montó está de vacaciones, cuando los datos llegan como llegan de verdad, y cuando alguien de
cumplimiento pregunta quién responde si se equivoca.

Son dos proyectos distintos. El segundo cuesta más que el primero y casi nadie lo presupuesta.

## Las tres cosas que aparecen en el mes cuatro

**Los datos reales.** El piloto usó una extracción limpia. La operación usa lo que hay, con los
campos vacíos, los duplicados y las excepciones que alguien resolvía a mano sin decírselo a nadie.

**La responsabilidad.** Mientras es piloto, si se equivoca no pasa nada. En producción, alguien tiene
que poder decir qué se hace cuando el sistema falla, quién lo detecta y en cuánto tiempo. Si esa
respuesta no existe, el despliegue se para ahí — y hace bien en pararse.

**La dependencia.** El piloto lo sostiene quien lo construyó. Si al llegar a producción sigue
dependiendo de esa persona, no se ha implementado un sistema: se ha contratado a alguien de forma
indirecta.

## Cómo se evita

No prometiendo menos, sino **escribiendo antes los criterios de salida de cada fase**: qué tiene que
ser cierto para que esta fase se dé por cerrada, y quién lo verifica. Una fase que no puede enunciar
su criterio de salida no está lista para empezar.

Es la parte aburrida. También es la que separa un piloto de un sistema.
