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
