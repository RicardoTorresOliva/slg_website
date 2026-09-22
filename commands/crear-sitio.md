# Playbook: crear-sitio — la infraestructura de un sitio de cliente

Monta, con las herramientas de Claude, todo lo que un sitio de cliente necesita **antes** de tener
contenido: repositorio, base de datos, archivos, proyecto de Vercel y variables. Es el paso 7 del §3
de `docs/PLAYBOOK_REPLICACION.md` y cubre los pasos 4–8 del §5 (día 1). `AGENTS.md` gobierna.

**Principio rector: Claude no maneja contraseñas, claves de API ni testigos.** Todo valor secreto lo
genera `npm run sitio:secretos` en el Mac de Ricardo y lo entrega directo a su plataforma (paso 6).
Si en algún paso una herramienta devuelve un valor secreto —una clave, una cadena con contraseña—,
no se copia a ningún sitio, no se repite en el chat y se sigue.

**Se para y se pide el «sí» de Ricardo** cuando algo cuesta dinero (paso 2 con coste > 0, un plan
de Resend) o cuando un nombre ya existe (nunca se borra ni se reutiliza nada sin preguntar).

## Datos de partida

Salen del intake (hoja de respuestas, §4 del playbook). Se fijan una vez y se usan igual en todos los
pasos.

| Dato | Forma | Ejemplo |
|---|---|---|
| `<cliente>` | minúsculas, números y guiones; corto | `acme-legal` |
| Repositorio | `RicardoTorresOliva/web_<cliente>` (guion bajo: convención de GitHub del playbook) | `web_acme-legal` |
| Proyecto Supabase | `web-<cliente>` | `web-acme-legal` |
| Proyecto Vercel | `web-<cliente>` (guion: va en la URL `…vercel.app`, donde el guion bajo no vale) | `web-acme-legal` |
| `<dominio>` | sin `https://` ni barras | `acmelegal.com` |
| Correo de contactos | intake ítem 9 | `hola@acmelegal.com` |

Constantes: organización Supabase **Softlanding Global** `isojilkgmlbhvfwxiflj`, región `us-east-1`;
equipo Vercel `team_NVmg2F1svT5W7CKrSInHh5VD` (`ricardotorresolivas-projects`); plantilla
`RicardoTorresOliva/website_template`.

## Paso 0 · Comprobaciones previas (1 min)

| Herramienta | Qué | Qué tiene que salir | Si falla |
|---|---|---|---|
| `gh auth status` | Sesión de GitHub | Cuenta `RicardoTorresOliva`, *scopes* con `repo` y `workflow` | Ricardo pega en Terminal `gh auth refresh -h github.com -s repo,workflow` y autoriza en el navegador |
| `gh repo view RicardoTorresOliva/website_template --json isTemplate,defaultBranchRef` | La plantilla | `isTemplate: true`, rama por defecto `develop` | Parar: la plantilla no está lista (§3 pasos 13–14) |
| Supabase MCP `list_organizations` | Conector | Aparece `isojilkgmlbhvfwxiflj` | El conector cayó: pedir a Ricardo que lo reconecte en la configuración de conectores de claude.ai |
| Vercel MCP `list_teams` | Conector | Aparece `team_NVmg2F1svT5W7CKrSInHh5VD` | Igual que el anterior |

El conector MCP de GitHub **no se usa** (falla con error 400 de autorización); `gh` hace lo mismo.

## Paso 1 · Repositorio `web_<cliente>` (2 min)

1. Crear desde la plantilla:
   `gh repo create RicardoTorresOliva/web_<cliente> --private --template RicardoTorresOliva/website_template`
2. GitHub genera el repositorio en segundo plano. Consultar hasta que exista la rama (unos segundos):
   `gh api repos/RicardoTorresOliva/web_<cliente>/branches/develop --jq .commit.sha`
   — un 404 los primeros segundos es normal; repetir con la herramienta de espera, no con `sleep`.
3. Crear `main` en el mismo commit y hacerla la rama por defecto. **Por qué**: Vercel toma como rama
   de producción la rama por defecto del repositorio al conectarlo; con `main` por defecto,
   producción sale de `main` y cada rama (`develop` incluida) da una vista previa, igual que SLG.
   - `gh api -X POST repos/RicardoTorresOliva/web_<cliente>/git/refs -f ref=refs/heads/main -f sha=<el SHA del punto 2>`
   - `gh repo edit RicardoTorresOliva/web_<cliente> --default-branch main`
4. Clonar para trabajar: `gh repo clone RicardoTorresOliva/web_<cliente> ~/Dev/web_<cliente>` y
   `git -C ~/Dev/web_<cliente> checkout develop`.

**Comprobar**: `gh repo view RicardoTorresOliva/web_<cliente> --json isPrivate,defaultBranchRef` →
`isPrivate: true`, `main`; `gh api repos/RicardoTorresOliva/web_<cliente>/branches --jq '.[].name'` →
`develop` y `main`.

**Si falla**: «name already exists» → el repositorio ya está: **parar** y preguntar a Ricardo si es de
un intento anterior (no se borra nada). 403 → falta el permiso `repo`: ver Paso 0.

## Paso 2 · Proyecto Supabase (3 min)

1. `get_cost` con `type: "project"` y `organization_id: "isojilkgmlbhvfwxiflj"`.
2. **Si el importe es 0** → `confirm_cost` con el mismo tipo, la recurrencia que devolvió y
   `amount: 0`; guardar el id de confirmación.
   **Si es mayor que 0** → **parar**. Es una compra. Escribir a Ricardo, literal: «Crear la base de
   <cliente> cuesta <importe> USD/<recurrencia>. ¿La creo? Responde sí o no.» Solo con un «sí» suyo en
   el chat se sigue con `confirm_cost`.
3. `create_project` con `name: "web-<cliente>"`, `region: "us-east-1"`,
   `organization_id: "isojilkgmlbhvfwxiflj"` y el id de confirmación.
4. `get_project` cada poco hasta `status: ACTIVE_HEALTHY` (2–3 min). El `id` es la **referencia**
   (20 letras): se usa en los pasos 3, 4 y 6.

**Comprobar**: `get_project_url` → `https://<ref>.supabase.co`.

**Si falla**: límite de proyectos gratuitos de la organización → es el caso «coste > 0» del punto 2.
Nombre repetido → parar y preguntar.

## Paso 3 · Migraciones por la API de Supabase (5 min)

Sin contraseña y sin el problema de IPv6 del host directo: `apply_migration` va por la API de
gestión.

1. Leer `~/Dev/web_<cliente>/drizzle/meta/_journal.json`. Para **cada** entrada, en el orden de
   `idx`: `apply_migration` con `project_id: <ref>`, `name: <tag>` y `query:` **el archivo
   `drizzle/<tag>.sql` entero, sin tocar**.
2. Si una falla: **parar**. Cada `apply_migration` es una transacción, así que la que falló no dejó
   nada a medias; se corrige la causa y se repite esa misma, nunca se salta.

**Por qué funcionan tal cual (revisado el 22-09 sobre 0000–0023):**

| Cuestión | Veredicto |
|---|---|
| `--> statement-breakpoint` | Es un comentario SQL (`--`): el archivo entero se ejecuta como un bloque. Drizzle también ejecuta todas en una sola transacción, así que no hay nada que exija ir fuera de ella (ni `CONCURRENTLY` ni `ALTER TYPE … ADD VALUE`) |
| Roles (0001 `CREATE ROLE slg_app`, 0002 `ALTER ROLE … NOBYPASSRLS`) | Exigen `CREATEROLE` y `BYPASSRLS` en quien ejecuta. El rol `postgres` de Supabase tiene los dos; así se migró producción de SLG. La comprobación **b** de abajo confirma que `apply_migration` corre como `postgres` [POR CONFIRMAR en la prueba en frío, §3 paso 16] |
| `COMMENT ON` (0004, 0006, 0008–0011, 0013, 0015) | Válido para el dueño del objeto; sin tratamiento |
| **El diario de Drizzle** | **Necesita tratamiento.** `apply_migration` anota en `supabase_migrations.schema_migrations`, no en `drizzle.__drizzle_migrations`. Sin filas ahí, `scripts/db/migrar.ts` y `/api/ops` creerían la base vacía y volverían a lanzar la 0000 (que falla con «ya existe»). Se rellena en el punto 3 |
| Datos de SLG en migraciones (0021 vocabulario, 0023 dominios desechables) | No bloquean: el vocabulario de servicios lo vacía el §3 paso 12; los dominios desechables sirven a cualquier cliente |

3. Rellenar el diario de Drizzle. Generar la orden (hash = SHA-256 del archivo, `created_at` = su
   `when` del diario, exactamente como lo calcula `drizzle-orm/migrator`):

   ```bash
   cd ~/Dev/web_<cliente> && node -e 'const fs=require("fs"),c=require("crypto");const j=JSON.parse(fs.readFileSync("drizzle/meta/_journal.json","utf8"));const h=t=>c.createHash("sha256").update(fs.readFileSync("drizzle/"+t+".sql").toString()).digest("hex");console.log("CREATE SCHEMA IF NOT EXISTS drizzle;\nCREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);\nINSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES\n"+j.entries.map(e=>"  (\x27"+h(e.tag)+"\x27, "+e.when+")").join(",\n")+";")'
   ```

   y pasar su salida a `execute_sql`.

4. **Cerrar la API de datos sobre `public`** (hallazgo del 22-09). Supabase publica el esquema
   `public` por su API REST y da a `anon` y `authenticated` permiso de uso: con la clave anónima
   —que es pública— se leerían las tablas sin RLS y se podrían llamar por RPC las funciones
   `SECURITY DEFINER`. El sitio **no usa** esa API (entra como `slg_app` y usa Storage por su REST), así
   que se cierra. `execute_sql`:

   ```sql
   REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon, authenticated;
   ```

   `slg_app` no se ve afectado: las migraciones 0001 y 0002 le dan `USAGE` explícito. **No** se
   revoca `EXECUTE` de las funciones a `PUBLIC`: las políticas de fila llaman a `app_organization_id()`
   y otras con el permiso de `slg_app`, que lo hereda de `PUBLIC`.

**Comprobar** (`execute_sql`, cada una por separado):

| | Consulta | Tiene que salir |
|---|---|---|
| a | `select count(*) from drizzle.__drizzle_migrations;` | Tantas como entradas del diario (24 el 22-09) |
| b | `select distinct tableowner from pg_tables where schemaname = 'public';` | Solo `postgres`. Si sale `supabase_admin`, **parar**: las migraciones futuras con el rol dueño fallarían por no ser dueño |
| c | `select rolcanlogin, rolbypassrls, rolsuper from pg_roles where rolname = 'slg_app';` | `true`, `false`, `false` |
| d | `select has_schema_privilege('anon','public','USAGE'), has_schema_privilege('slg_app','public','USAGE');` | `false`, `true` |

Y `get_advisors` con `type: "security"`: anotar lo que diga en el resumen del paso 7 (el aviso de
«RLS desactivado» en tablas de `public` queda sin efecto con la comprobación **d** en `false`).

## Paso 4 · Buckets privados (1 min)

`lib/files/aprovisionar.ts` crea buckets por la API S3 (MinIO); con `FILES_DRIVER=supabase` no hay
ruta de código que los cree, y la REST de Storage exige la clave de servicio, que Claude no maneja.
Se crean por SQL. `execute_sql`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('downloads', 'downloads', false), ('deliverables', 'deliverables', false)
ON CONFLICT (id) DO NOTHING;
```

**Comprobar**: `select id, public from storage.buckets order by id;` → `deliverables | false` y
`downloads | false`. Los nombres tienen que coincidir con `S3_BUCKET_DOWNLOADS` y
`S3_BUCKET_DELIVERABLES` del paso 5.

**Si falla**: si `public` sale `true` en alguno, `update storage.buckets set public = false where id in ('downloads','deliverables');`
y repetir la comprobación. Un bucket público sirve los entregables de un cliente a cualquiera.

## Paso 5 · Proyecto Vercel y variables no secretas (3 min)

1. `create_project` en el equipo `team_NVmg2F1svT5W7CKrSInHh5VD`: nombre `web-<cliente>`, *framework*
   `nextjs`, repositorio Git `RicardoTorresOliva/web_<cliente>` (GitHub).
2. `get_project` → la rama de producción tiene que ser `main` y el repositorio tiene que figurar como
   conectado. Si la rama no es `main`: `update_project` para fijarla; si la herramienta no lo admite,
   pedir a Ricardo: vercel.com → proyecto `web-<cliente>` → **Settings** → **Environments** →
   **Production** → **Branch Tracking** → `main` → **Save**.
3. Variables **no secretas** con `create_project_env`, destino **Production y Preview**, tipo legible
   (`encrypted`, no `sensitive`: se tienen que poder revisar en el panel):

| Variable | Valor | Por qué / cuándo |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio>` | Obligatoria: sin ella no compila |
| `FILES_DRIVER` | `supabase` | Archivos en Supabase Storage |
| `S3_BUCKET_DOWNLOADS` | `downloads` | El adaptador de Supabase lo exige (paso 4) |
| `S3_BUCKET_DELIVERABLES` | `deliverables` | Igual |
| `MAIL_SMTP_HOST` | `smtp.resend.com` | Transporte (D-36) |
| `MAIL_SMTP_PORT` | `587` | Igual que SLG |
| `MAIL_FROM_ADDRESS` | `noreply@mailweb.<dominio>` | Subdominio de envío (D-24); lo da de alta el paso 6 |
| `MAIL_FROM_NAME` | Nombre comercial del intake | — |
| `MAIL_REPLY_TO` | Correo de contactos del intake | — |
| `MAIL_ALERTS_TO` | Correo de contactos del intake | Avisos de captura y de fallo |
| `OPS_MAIL_TO` | Correo de contactos del intake | Obligatoria para `/api/health` |
| `PRIVACY_POLICY_VERSION` | Fecha de los legales, `AAAA-MM-DD` | Consentimiento (RF-36) |
| `DELIVERABLE_VIEWER_ORIGIN` | `https://visor.<dominio>` | **Solo** si el cliente tiene portal |
| `CRM_BASE_URL`, `CRM_MODE` (`contact_note`), `CRM_CONTACT_URL_TEMPLATE`, `CRM_APP_URL` | Del CRM del cliente | **Solo** con CRM |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | De Umami | **Solo** si el cliente aceptó analítica |

**Secretas — NO las carga Claude**; las carga el comando del paso 6: `DATABASE_URL`,
`DATABASE_URL_MIGRATIONS`, `APP_DB_PASSWORD`, `BETTER_AUTH_SECRET`, `DELIVERABLE_VIEWER_SECRET`,
`CRON_SECRET`, `WEBHOOK_SIGNING_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `MAIL_SMTP_USERNAME`,
`MAIL_SMTP_PASSWORD`, y `SUPABASE_URL` (esta no es secreta, pero el comando ya tiene la referencia).

**No se ponen** en un sitio de cliente: `POSTGRES_*` (solo local) · `STAGING_BASIC_AUTH_*` y
`SUPERFICIES_EN_REVISION` (las vistas previas ya van tras la protección de Vercel) · `BETTER_AUTH_URL`
(cae a `NEXT_PUBLIC_SITE_URL`) · `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` (son de MinIO) · `SIGNED_URL_TTL_*`, `PUBLIC_FORM_RATE_LIMIT_*`, `WEBHOOK_QUEUE_*`,
`CRM_QUEUE_*`, `CRM_TIMEOUT_MS`, `CRM_METRICS_CACHE_SECONDS` (los defectos sirven) · `N8N_WEBHOOK_URL`,
`WEBHOOK_SUBSCRIBERS`, `WEBHOOK_ANNOUNCE_POSTS`, `UPTIME_WEBHOOK_SECRET` (sin n8n) · `OPS_TOKEN` (solo
para una comprobación puntual, y se borra) · `BACKUP_*`, `PG_DUMP_BIN`, `PG_RESTORE_BIN` (copias de
Supabase). **Pendientes sin resolver**: `GOOGLE_*`/`MICROSOFT_*` (solo si el cliente pide inicio de
sesión social) y `CRM_API_KEY_CAPTURE`/`CRM_API_KEY_READ` (solo con CRM) son secretas y el comando del
paso 6 todavía no las carga.

**Si falla**: «repository not found» o sin acceso al repositorio → Vercel no ve los repositorios
nuevos: Ricardo hace el §7.3 punto 2 del playbook (Vercel con acceso a **All repositories**) y se
repite el punto 1.

## Paso 6 · El comando de secretos (Ricardo, 5 min)

1. Claude lo prueba antes en seco, con los datos reales:
   `cd ~/Dev/slg_website && npm run sitio:secretos -- --simular --cliente <cliente> --supabase <ref> --vercel web-<cliente> --dominio <dominio>`
   Tiene que terminar con «SIMULACIÓN terminada: no se ha tocado nada.». Si dice «Los datos del
   comando no son válidos», corregir el dato que nombra.
2. Claude escribe a Ricardo, **con los cuatro valores ya puestos** (nunca con marcadores):

   > Abre **Terminal** (Aplicaciones → Utilidades → Terminal), pega esta línea y pulsa Enter:
   > `cd ~/Dev/slg_website && npm run sitio:secretos -- --cliente acme-legal --supabase <la referencia real> --vercel web-acme-legal --dominio acmelegal.com`
   > Verás ocho pasos con ✓. La primera vez te pedirá las claves de Resend y UptimeRobot: pégalas
   > cuando las pida (no se ve nada al pegar) y pulsa Enter. Al final, selecciona desde
   > «── Resumen» hasta el final, cópialo y pégalo aquí. Si sale una línea con ✗, haz lo que dice
   > «Qué hacer»; si dice que me lo pegues, pégamelo.

3. Lo que pega Ricardo son nombres de variables y registros DNS: **no son secretos**. Los registros
   DNS se guardan para el paso 13 del §5 (DNS).

## Paso 7 · Comprobación de la vista previa (3 min)

1. Las variables solo entran en despliegues **nuevos**: provocar uno de `develop`
   (`git -C ~/Dev/web_<cliente> commit --allow-empty -m "Arranque: variables cargadas"` y
   `git -C ~/Dev/web_<cliente> push origin develop`), o el primer cambio real de contenido.
2. `list_deployments` del proyecto → el último de `develop` en `READY`. Si sale `ERROR`: leer su
   registro de compilación (`get_deployment` / eventos). El caso típico es una variable del paso 5 mal
   escrita.
3. `web_fetch_vercel_url` sobre `https://<url del despliegue>/api/health` (las vistas previas están
   protegidas; esta herramienta entra con la sesión del equipo). Tiene que devolver
   `"status":"ok"`, `"app":"slg_website"`, `"migraciones"` igual al número del paso 3 a, y
   `"faltan":[]`.
4. Si `faltan` nombra variables: las de la tabla del paso 5 las añade Claude; las secretas, Ricardo
   vuelve a pegar la misma línea del paso 6 (solo añade lo que falte).
5. Dejar en el chat el resumen: repositorio, referencia de Supabase, proyecto de Vercel, URL de la
   vista previa, número de migraciones, resultado de `get_advisors`, y los registros DNS pendientes.
