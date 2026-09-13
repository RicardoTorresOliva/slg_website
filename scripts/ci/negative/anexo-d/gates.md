# FIXTURE NEGATIVO de `check:anexo-d` (R-26)

No es el documento de gates del proyecto. Es lo que pasa cuando los gates se escriben deprisa: faltan
gates, uno se queda en prosa, otro apunta a un script que no existe y ninguno declara su estado.

Ninguno de esos cuatro fallos se comete a mala idea: se escriben doce y nadie cuenta; se nombra un
script que «seguro que existe»; y el estado se deja para después.

## D1 · Rendimiento público

**Exige.** Lighthouse ≥ 90.

**Comprueba.** `npm run check:lighthouse`

## D2 · Accesibilidad

**Exige.** Contraste AA y teclado.

**Comprueba.** `npm run check:accesibilidad-completa`

## D3 · Motion

**Exige.** Se revisa que el movimiento se vea bien y que no moleste. Hay que mirarlo con atención
antes de publicar, y si algo chirría, se corrige.

## D4 · i18n

**Exige.** Paridad ES/EN.

**Comprueba.** `npm run check:pairs`

**Estado.** ✅ verde.

La checklist de este gate es el ejemplo de lo que D-149 prohibió y `check:anexo-d` no comprobaba:

**Checklist manual:**

1. Abrir las dos versiones y revisar que se ve bien.
2. Dar el visto bueno.

## D5 · Contenido

**Exige.** Nada sin fuente.

**Comprueba.** `npm run check:copy`

**Estado.** ✅ verde. Este gate tiene parte manual declarada en la tabla y **ninguna checklist**: el
comando lo salvaba y pasaba en verde.

## Resumen

| Gate | Automático | Manual pendiente | Estado |
|---|---|---|---|
| D1 Rendimiento | `check:lighthouse` | — | ✅ |
| D4 i18n | `check:pairs` | una pasada por pantalla | ✅ |
| D5 Contenido | `check:copy` | leer los textos con alguien | ✅ |
