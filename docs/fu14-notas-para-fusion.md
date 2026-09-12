# FU-14 — notas para fusionar

> **Por qué este archivo existe y no una entrada en `work_log.md`.** FU-14 se construyó en paralelo
> con DU-02, que tocaba los mismos archivos de seguimiento. Todo lo que habría ido a
> `implementation/task_tracker.md`, `docs/decision_log.md`, `docs/project_memory.md` y
> `docs/work_log.md` está aquí, en secciones que se corresponden con esos cuatro destinos. Ninguno de
> los cuatro se ha tocado. **Este archivo se borra al fusionarlo.**

---

## 1. Para `work_log.md` — qué se construyó y qué se verificó

### Qué se construyó

| Archivo | Qué es |
|---|---|
| `lib/backups/config.ts` | Tres lectores de configuración, uno por proceso: copia, purga y restauración. Cada uno lee SOLO sus credenciales |
| `lib/backups/destination.ts` | El puerto de `architecture` §8.3: `depositar(clave, contenido)` y nada más |
| `lib/backups/encryption.ts` | AES-256-GCM en flujo, cifrado en el VPS antes de subir |
| `lib/backups/generations.ts` | Claves por generación y cálculo de qué purgar |
| `lib/backups/index.ts` | Fachada. La restauración y la purga NO están: no son parte del puerto |
| `scripts/backups/run-backup.ts` | El proceso de copia: `pg_dump` → gzip → cifra → deposita. También `--pre-migration` |
| `scripts/backups/prune-backups.ts` | La purga, proceso aparte con su propia credencial |
| `scripts/backups/restore-backup.ts` | Los pasos 0–7 de §9.3, ejecutables |
| `scripts/backups/inventory.ts` | Recuentos por tabla, compartidos por copia y restauración |
| `scripts/backups/check-backup-encapsulado.ts` | Las mitigaciones 1 y 2 de R-37, vigiladas en CI |
| `scripts/backups/test-backups.ts` | 25 comprobaciones contra MinIO y PostgreSQL reales |
| `ops/backups/copia/{Dockerfile,crontab}` | El servicio App de copia de D-66 |
| `ops/backups/purga/{Dockerfile,crontab}` | El **segundo** servicio App, el de purga |

Modificados: `.env.example` (nombres nuevos, ningún valor), `package.json` (`backup:*`, `test:backups`,
`check:backup-encapsulado`, y `check:backup-encapsulado` dentro de `verify`),
`.github/workflows/ci.yml` (dos pasos nuevos), `scripts/files/check-files-encapsulado.ts`
(`lib/backups/destination.ts` añadido a la lista de permitidos, con el motivo escrito).

### Cómo se verificó — piezas reales, no argumentos

**Entorno**: PostgreSQL 16.15 real (`slg-db`, puerto 5434) · MinIO local (binario Homebrew, puerto
9500, precedente de FU-09 y D-51) haciendo de R2, que es exactamente lo que D-20/D-21 permiten porque
los dos hablan API S3 · clave de cifrado **de prueba**, generada en la sesión con `randomBytes(32)`;
la real de D-66 no se pidió ni se vio · imágenes Docker construidas y ejecutadas de verdad.

En esta máquina no hay cliente de PostgreSQL instalado, así que `pg_dump` y `psql` se invocaron con un
shim `docker exec -i slg-db …` a través de `BACKUP_PG_DUMP_BIN`/`BACKUP_PSQL_BIN`. Ese punto de
extensión existe precisamente para esto y no cambia una línea de código, que es el mismo principio de
D-21 aplicado a las herramientas locales. En Easypanel las variables van vacías: la imagen lleva
`postgresql16-client`.

| Qué | Resultado |
|---|---|
| `npm run test:backups` (25 comprobaciones) | **verde** |
| `npm run verify` completo | **verde** (secretos, lint, dos pasadas de `tsc`, cuatro comprobaciones de encapsulación, gates de contenido, pruebas negativas, build standalone, Lighthouse 100/100/100/100) |
| `npm run test:db`, `npm run test:files` | **verde** — nada de lo anterior se rompió |
| `docker build` de las dos imágenes | **verde**; `pg_dump 16.15`, `tar (GNU tar) 1.35`, `node v22.23.2` dentro de la de copia |
| La imagen de purga **no** lleva `pg_dump` | comprobado: `command -v pg_dump` no encuentra nada |
| **El mecanismo de D-66, de punta a punta** | contenedor real con el crontab horneado y `crond -f`, con el crontab sustituido por uno de cada minuto para no esperar a las 02:15. A las 01:52:00 el cron disparó solo y dejó en el destino los tres objetos de la copia: `db/daily/20260912T015200Z-cf2b87.sql.gz.enc` (10.044 bytes), `files/daily/…tar.gz.enc` (309) y `db/daily/…manifiesto.json.gz.enc` (468), con su línea JSON `{"ok":true,…,"duracionMs":183}` en el registro del contenedor |

**La restauración se ejecutó de verdad y desde una copia ANTIGUA** (criterio 6, mitigación 4 de R-37).
La prueba fabrica dos copias con datos distintos —la vieja con dos empresas, la reciente con una
tercera—, promueve ambas a generación semanal, restaura **la más antigua** en una base limpia aparte y
comprueba las dos caras: que vuelven las dos filas de la copia vieja **y** que la tercera fila de la
reciente no aparece. Igual con los archivos: vuelve `org-1/entregable-antiguo.html` con su clave
exacta y no vuelve el reciente. Sin la segunda mitad, la prueba pasaría restaurando cualquier cosa.

---

## 2. Hallazgos propios — los cuatro los encontró la ejecución, no el razonamiento

**1. Dos copias en el mismo segundo compartían clave y una pisaba a la otra.** La marca de tiempo de
la clave tiene resolución de segundo. La primera versión de la suite encadenó dos copias seguidas y
esperaba seis objetos en el destino: había tres. El criterio 5 dice literalmente «ninguna copia pisa a
otra», y con el cron diario eso no puede pasar — pero con `--pre-migration` en un despliegue que
aplica dos migraciones seguidas, sí. **Corregido**: cada ejecución genera un identificador propio de
seis caracteres hexadecimales que va en la clave (`…T015200Z-cf2b87.sql.gz.enc`) y es el mismo en los
tres objetos de esa copia. La purga y el listado de restauración agrupan por marca **+** identificador,
no solo por marca. Sin la prueba encadenada esto habría llegado a producción como una promesa.

**2. Restaurar en staging podía escribir en los cubos de PRODUCCIÓN.** El paquete de volúmenes
guardaba cada objeto como `<nombre-del-cubo>/<clave>`, y la restauración leía ese primer segmento como
el cubo de destino. Un paquete hecho en producción lleva dentro los nombres de producción: restaurar
en staging habría subido los objetos de vuelta a producción, que es el peor fallo posible en un
procedimiento de emergencia. **Corregido**: el paquete guarda el **papel** (`downloads` /
`deliverables`), nunca el nombre del cubo, y cada entorno lo traduce a los cubos que diga **su**
configuración. Ahora el nombre de producción no está escrito en ninguna parte del paquete, así que no
hay forma de acabar allí ni por descuido. La prueba usa cuatro cubos con nombres distintos justamente
para que esto no pueda pasar desapercibido.

**3. Una copia que fallaba a mitad registraba `depositos: []` como si no hubiera subido nada.** Salió
en la primera ejecución del cron real: el volcado subió, el paso de volúmenes falló porque los cubos
de origen no existían, y la línea de registro no mencionaba el objeto que sí estaba en el destino.
**Corregido**: cada depósito se anota en cuanto ocurre. El registro de un fallo parcial ahora dice qué
llegó a subir, que es exactamente el dato que hace falta cuando hay que decidir si se reintenta.

**4. `crond` de busybox SÍ propaga el entorno del contenedor a las tareas.** Es lo contrario del cron
de Debian/cronie, que construye un entorno limpio y obliga a volcar las variables a un archivo dentro
de la imagen — donde acabarían los secretos. Se comprobó con `alpine:3.20`, `crond -f` y una variable
pasada por `-e`: la tarea la recibió intacta. Por eso **no** hay ningún `.env` dentro de las imágenes
de `ops/backups/`. Si alguna vez se cambia la imagen base a una Debian, hay que revisar esto.

### Una corrección al contexto de partida

El encargo decía que `lib/files/` tiene «un cliente S3 firmando SigV4 a mano». No lo tiene: FU-09 usa
`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `@aws-sdk/s3-presigned-post` (ver
`lib/files/client.ts` y `signed-urls.ts`). Eso **cumple** D-21 igualmente — el SDK de AWS es un
cliente de API S3 genérica, no el SDK propietario de Cloudflare, y ya está probado contra MinIO —, así
que FU-14 lo reutiliza en vez de escribir un firmador nuevo. Ninguna línea del código de copias
menciona Cloudflare: cambiar de proveedor es `R2_ENDPOINT` + credenciales.

---

## 3. Para `decision_log.md` — decisiones nuevas que merecen número

### D-67 · Tercera credencial de R2, de solo lectura, para restaurar

`architecture` §8.3 dice que «restaurar exige leer, y purgar exige borrar; **ambas** son procesos
distintos con credenciales distintas», y §9.3 paso 1 manda listar «con la credencial de **LECTURA**
(distinta de la de copia)». Hoy existen dos tokens (D-65): `slg-backup-write` y `slg-backup-purge`.
Ninguno es el de lectura que el diseño pide: el de copia no debe servir para restaurar, y el de purga
**puede borrar**, que es justo lo que una restauración no necesita.

**Decidido**: el código lee `R2_ACCESS_KEY_ID_RESTORE`/`R2_SECRET_ACCESS_KEY_RESTORE`, sin recurso ni
valor por defecto a los otros dos. **Falta crear el token** `slg-backup-restore` (paso manual 3 de la
sección 5). Alternativa descartada: reutilizar el de escritura, que en R2 sí puede leer (D-65: no
existe un nivel «escribe pero no borra»). Se descarta porque entonces el token que corre a diario en
un servicio desatendido sería también el que abre las copias, y una filtración valdría para las dos
cosas.

### D-68 · Dos servicios App en Easypanel, no uno con dos entradas de cron

D-66 fija «un servicio App aparte con su propio `Dockerfile`». Al construirlo se ve que tienen que ser
**dos**: un solo contenedor con dos entradas de crontab llevaría en su entorno las dos credenciales,
y la mitigación 2 de R-37 dice que la purga la hace «un proceso distinto con **otras** credenciales».
Con las dos juntas, quien comprometa el VPS puede borrar los backups además de los datos — el
escenario exacto que R-37 describe.

Además, cada imagen instala solo lo que su proceso usa: la de purga no lleva `postgresql16-client` ni
`tar`, y **no lleva la clave de cifrado**. Lo que no está instalado no se puede usar, y sin la clave
la purga no puede abrir un backup ni comprometida.

Esto no contradice D-66, lo concreta: donde dice «un servicio App aparte», son dos.

### D-69 · El paquete de volúmenes guarda el PAPEL del cubo, no su nombre

Ver hallazgo 2. Es una decisión de diseño con consecuencia de seguridad, no un detalle de formato: es
lo que hace imposible que una restauración en staging escriba en producción. Consecuencia: el orden de
`FILES_BUCKET_DOWNLOADS` y `FILES_BUCKET_DELIVERABLES` es **significativo** (primero descargas, luego
entregables); está escrito en `lib/backups/config.ts` y en `.env.example`.

### D-70 · La retención cuenta EJECUCIONES, no objetos, y nunca borra por antigüedad

Una ejecución deposita tres objetos y los tres se conservan o se van juntos: un volcado sin sus
archivos, o sin el manifiesto con el que comparar los recuentos (§9.3 paso 6), es media copia. Contar
objetos habría dejado «14 diarias» en cuatro días y medio de historia.

Y se borra **por conteo, nunca por antigüedad**: si el proceso de copia lleva un mes caído, la purga
no vacía el destino por «caducidad» — las N últimas siguen siendo las N últimas. Un borrado que
depende del reloj es exactamente el mecanismo que R-37 teme. La purga tampoco borra jamás una clave
que no reconoce: las enumera en su salida para que alguien decida a mano.

---

## 4. Para `task_tracker.md` — estado de los ocho criterios

| # | Criterio | Estado |
|---|---|---|
| 1 | Copia diaria de base de datos **y** volúmenes, sin intervención, con resultado registrado; un fallo avisa | ✅ construido y verificado. Cron real disparando dentro del contenedor, línea JSON por ejecución, salida distinta de cero en fallo. El aviso por SMTP usa el **transporte** de FU-08 directamente, no `enviarCorreo()`: esa función escribe en `email_delivery` antes de enviar, y el fallo que más falta hace avisar es «no he podido hablar con la base de datos» — un aviso que necesita la pieza averiada no es un aviso. **Sin probar contra un buzón real**: depende de que FU-08 cierre su criterio 3 |
| 2 | Destino fuera del proveedor del VPS | ✅ por construcción (R2, D-20/D-21). Verificado contra MinIO, que habla la misma API; **no contra R2 real** — hacen falta los tokens que Ricardo custodia |
| 3 | Se cifra antes de salir de la máquina; la clave no vive en el VPS ni en el repositorio | ✅ AES-256-GCM en flujo; el texto claro nunca toca el disco. Probado: el objeto no contiene el volcado, un objeto manipulado no se descifra, una clave equivocada tampoco. El **manifiesto también va cifrado**: sus claves de objeto llevan el identificador de la empresa cliente, y una lista en claro diría quién tiene qué sin descifrar nada |
| 4 | Credencial de copia sin borrado; la purga, proceso distinto con otras credenciales | ⚠️ **construido al máximo que R2 permite, y la diferencia queda declarada.** Lo que está: dos procesos, dos servicios, dos entornos, y `leerConfigDeCopia()` **lanza** si ve una variable `_PRUNE` — probado ejecutando el proceso real. El puerto de §8.3 solo expone `depositar`, vigilado en CI. Lo que **no** se puede: D-65 ya registró que R2 no ofrece «escribe pero no borra»; el token `slg-backup-write` es `Object Read & Write` y técnicamente puede borrar. La separación es de proceso y de código, no de permiso del proveedor. Esto ya estaba asumido en D-65, no es nuevo |
| 5 | Al menos tres generaciones, ninguna copia sobrescrita | ✅ cuatro: `daily`, `weekly`, `monthly` y `pre-migration`. Verificado que 30 días producen 30 claves distintas y que dos copias seguidas no se pisan (ver hallazgo 1) |
| 6 | Restauración ejecutada y verificada en staging, desde una copia ANTIGUA | ⚠️ **el mecanismo está probado; el ensayo en el staging real, no.** Probado de verdad contra PostgreSQL y MinIO: restaura la copia vieja, los datos y los archivos vuelven íntegros con su clave exacta, y los de la copia reciente no aparecen. Lo que **falta** es el ensayo del paso 6 completo de §9.3 sobre `slgweb-staging` con datos reales: tres métodos de inicio de sesión, visor aislado, batería de FU-13 y **cuánto tarda**. `restore-backup.ts` imprime esa lista en su salida para que no se olvide. Es una tarea de operación con el staging desplegado, no de código |
| 7 | Backup automático antes de cualquier migración de esquema | ✅ `npm run db:deploy` ejecuta `backup:pre-migration` **antes** de `db:migrate`. Se puso en `db:deploy` y no en `db:migrate` a secas a propósito: `db:migrate` es el atajo de desarrollo local contra una base de juguete, y hacerlo depender de credenciales de R2 lo habría roto para todo el mundo sin proteger nada. CI llama a `npx drizzle-kit migrate` directamente y no se ve afectada. **Pendiente**: que el paso de despliegue de Easypanel use `db:deploy` (paso manual 6) |
| 8 | Cero valores de credencial en el repositorio; solo nombres de variable | ✅ `npm run check:secrets` en verde. `.env.example` solo lleva nombres. Ninguna imagen de `ops/backups/` hornea un valor |

**Propuesta de estado: `in_progress`**, no `done`. Lo que falta no es código: son los dos criterios con
⚠️ y los pasos manuales de abajo. En cuanto el token de lectura exista y el ensayo de restauración se
corra sobre el staging real con su cronómetro, FU-14 cierra.

---

## 5. Pasos manuales que le quedan a Ricardo

**En Cloudflare**

1. Confirmar que el bucket `slg-backups` existe en la cuenta `b1e37064c773099db5e12fbaa6134a55`.
2. Anotar el endpoint S3 para `R2_ENDPOINT`:
   `https://b1e37064c773099db5e12fbaa6134a55.r2.cloudflarestorage.com`. `R2_REGION` en R2 es `auto`.
3. **Crear un tercer token, `slg-backup-restore`** (D-67 arriba): mismo patrón que D-65 — acotado al
   bucket `slg-backups`, nunca «apply to all buckets», TTL `Forever` — pero con permiso **`Object Read
   only`**. Guardarlo por separado, como los otros dos. Sin él, `restore-backup.ts` no arranca: no hay
   recurso a los otros tokens, a propósito.

**En Easypanel**

4. **Servicio App `slg-backup`** — repositorio del proyecto, `Dockerfile` en
   `ops/backups/copia/Dockerfile`, contexto de build la raíz. Variables de entorno:
   `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET`, `R2_ACCESS_KEY_ID_WRITE`, `R2_SECRET_ACCESS_KEY_WRITE`,
   `BACKUP_ENCRYPTION_KEY` (la de D-66), `BACKUP_DATABASE_URL` (**el rol dueño**, no `slg_app`: con el
   rol de aplicación el RLS está activo y el volcado saldría con la mitad de las filas),
   `FILES_S3_*` y `FILES_BUCKET_*`, y las `MAIL_SMTP_*` + `MAIL_ALERTS_TO` para el aviso de fallo.
   **Ninguna variable `_PRUNE`**: si aparece, el servicio no arranca, y eso es deliberado.
5. **Servicio App `slg-backup-purga`** — `Dockerfile` en `ops/backups/purga/Dockerfile`. Variables:
   `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET`, `R2_ACCESS_KEY_ID_PRUNE`, `R2_SECRET_ACCESS_KEY_PRUNE` y
   las cuatro `BACKUP_RETENTION_*`. **Ni la clave de cifrado, ni la base de datos, ni `FILES_*`**:
   este proceso no tiene por qué poder abrir un backup.
   Valores de retención sugeridos, si no hay otro criterio: 14 diarias, 8 semanales, 12 mensuales,
   30 pre-migración. Son ~34 copias completas; con el volumen de la v1 cabe de sobra en los 10 GB del
   tramo gratuito.
6. Cambiar el paso de despliegue a `npm run db:deploy` (que ya incluye la copia previa a la migración)
   donde hoy llame a `db:migrate` o a `drizzle-kit migrate`.
7. **Confirmar el timezone del servidor** — lo único que D-66 dejaba anotado para el momento de
   construir. El cron sigue la hora de la máquina, no UTC. Los crontabs están puestos a las 02:15
   (copia) y los lunes a las 04:30 (purga), separados ocho horas para que una copia a medio subir no
   pueda entrar en el listado de la purga. Si el servidor no va en la zona que se espera, hay que
   ajustar las horas o fijar `TZ` en el servicio. La elección de generaciones (`generacionesDeFecha`)
   sí se calcula en UTC a propósito, para que un cambio de zona no mueva el día de la copia mensual.
8. Arrancar `slg-backup` y comprobar en sus registros la primera línea JSON con `"ok":true`.

**El ensayo de restauración (criterio 6, DoD #8)** — con el token de lectura ya creado:

```
npm run backup:restore -- --listar
npm run backup:restore -- --staging --generacion weekly
```

Sin `--indice`, coge la **más antigua** de esa generación, que es lo que R-37 quiere probar.
`RESTORE_DATABASE_URL` debe apuntar a la base de staging: el script se niega a arrancar si coincide
con `DATABASE_URL`, y también si falta `--staging`. Después quedan a mano las cuatro comprobaciones
que el propio script enumera en su salida (los tres métodos de inicio de sesión, el visor aislado, la
batería de FU-13 y devolver staging a su estado normal) y **anotar la duración total** — que es, dice
§9.3, el dato que falta cuando llega la emergencia.

---

## 6. Para `project_memory.md` — lo que conviene no volver a explorar

- Las copias se escriben contra **API S3 genérica** con `@aws-sdk/client-s3`, el mismo cliente de
  FU-09. Cero líneas específicas de Cloudflare.
- `lib/backups/` es código puro y sin listados; los tres ejecutables viven en `scripts/backups/`.
  La separación no es estética: `check-files-encapsulado.ts` prohíbe listar cubos en `app/` y `lib/`
  (RF-123, gate D10), y la copia de volúmenes necesita listar. Es una tarea de operación, no una ruta.
- `BACKUP_PG_DUMP_BIN`/`BACKUP_PSQL_BIN` son la costura para máquinas sin cliente de PostgreSQL. En
  producción van vacías.
- Para reproducir la verificación local: MinIO en 9500 con las credenciales de `FILES_S3_*`, `slg-db`
  en 5434, y los dos shims `docker exec -i slg-db pg_dump|psql` que traducen `127.0.0.1:5434` →
  `127.0.0.1:5432`. El detalle está en la sección 1.
- R-41 (D-51, credencial de administrador de MinIO) **sigue abierto** y ahora pesa un poco más: el
  proceso de copia lee los dos cubos de `slg-files` con esa misma credencial de administrador. No lo
  empeora —ya era así para la aplicación— pero es un consumidor más a revisar cuando se rote.
