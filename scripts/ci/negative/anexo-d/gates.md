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
