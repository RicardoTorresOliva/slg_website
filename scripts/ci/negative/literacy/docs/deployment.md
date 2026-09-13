# Guía de despliegue — FIXTURE NEGATIVO

No es documentación: es el ejemplo de lo que `check:literacy` tiene que ver en ROJO.
Su defecto está en la última línea: un secreto con un valor **copiable**, del tipo
que quien siga la guía pega tal cual y acaba siendo la credencial de producción.

Las dos primeras SÍ deben pasar: son configuración, no secretos, y una guía de
despliegue que no las escribe deja la instrucción a medias.

```
S3_BUCKET_DOWNLOADS=downloads
NEXT_PUBLIC_SITE_URL=https://ejemplo.test
BETTER_AUTH_SECRET=<esta pasa porque falla en voz alta si se pega>
APP_DB_PASSWORD=EstaSePegaTalCualYFunciona123
```

## 9. Un apartado que sí existe

Y aquí abajo, la referencia rota: manda a **§42**, que no existe en este documento. Es el error que
cometí dos veces seguidas escribiendo la tabla de «lo que solo puedes hacer tú», y que se pilla
leyendo o no se pilla. Una referencia rota **parece cobertura**: quien la sigue cree que hay un
apartado detrás.

Ver **§42** para lo que falta.
