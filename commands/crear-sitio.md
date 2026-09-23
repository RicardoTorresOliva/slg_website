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

> **Verificado en la prueba en frío del 22-09 («Cliente Demo», `web_demo`).** Los pasos 2, 3, 5 y 7
> describen el camino que **funcionó**, no el que se había previsto: el conector MCP de Supabase no
> puede confirmar costes (sus parámetros llegan como texto y `confirm_cost` exige un número), el de
> Vercel no ve los proyectos del equipo, y `apply_migration` metería 144 KB de SQL en la conversación.
> Todo lo que sigue va por las CLI de Supabase y de Vercel, con la sesión del Mac de Ricardo.

## Paso 0 · Comprobaciones previas (1 min)

| Herramienta | Qué | Qué tiene que salir | Si falla |
|---|---|---|---|
| `gh auth status` | Sesión de GitHub | Cuenta `RicardoTorresOliva`, *scopes* con `repo` y `workflow` | Ricardo pega en Terminal `gh auth refresh -h github.com -s repo,workflow` y autoriza en el navegador |
| `gh repo view RicardoTorresOliva/website_template --json defaultBranchRef` | La plantilla | rama por defecto `develop` | Parar: la plantilla no está lista (§3 pasos 13–14) |
| Supabase MCP `list_organizations` | Conector | Aparece `isojilkgmlbhvfwxiflj` | El conector cayó: pedir a Ricardo que lo reconecte en la configuración de conectores de claude.ai |
| Vercel MCP `list_teams` | Conector | Aparece `team_NVmg2F1svT5W7CKrSInHh5VD` | Igual que el anterior |

El conector MCP de GitHub **no se usa** (falla con error 400 de autorización); `gh` hace lo mismo.

## Paso 1 · Repositorio `web_<cliente>` (2 min)

**Con el historial de la plantilla, no con «Use this template»** (D-167): `--template` aplana todo
en un commit sin historia común, y después ninguna corrección del motor se puede traer con una
fusión. Con el historial, actualizar el sitio es `npm run sitio:actualizar` (paso 1b).

1. Repositorio vacío: `gh repo create RicardoTorresOliva/web_<cliente> --private`
2. Copia de la plantilla con su historial, apuntando al repositorio nuevo:
   - `git clone --branch develop https://github.com/RicardoTorresOliva/website_template.git ~/Dev/web_<cliente>`
   - `git -C ~/Dev/web_<cliente> remote rename origin plantilla`
   - `git -C ~/Dev/web_<cliente> remote add origin https://github.com/RicardoTorresOliva/web_<cliente>.git`
3. Empujar `develop` y, del mismo commit, `main`, y hacer `main` la rama por defecto. **Por qué**:
   Vercel toma como rama de producción la rama por defecto del repositorio al conectarlo; con `main`
   por defecto, producción sale de `main` y cada rama (`develop` incluida) da una vista previa, igual
   que SLG. (La `main` de la plantilla va muy por detrás: no se usa.)
   - `git -C ~/Dev/web_<cliente> push -u origin develop develop:main`
   - `gh repo edit RicardoTorresOliva/web_<cliente> --default-branch main`
4. Configurar el driver de la piel una vez: `git -C ~/Dev/web_<cliente> config merge.ours.driver true`
   (`sitio:actualizar` lo repite; es para quien fusione a mano).

**Comprobar**: `gh repo view RicardoTorresOliva/web_<cliente> --json isPrivate,defaultBranchRef` →
`isPrivate: true`, `main`; `gh api repos/RicardoTorresOliva/web_<cliente>/branches --jq '.[].name'` →
`develop` y `main`.

**Si falla**: «name already exists» → el repositorio ya está: **parar** y preguntar a Ricardo si es de
un intento anterior (no se borra nada). 403 → falta el permiso `repo`: ver Paso 0.

## Paso 1b · Actualizar un sitio desde la plantilla (cuando la plantilla cambie)

Los cambios de motor se hacen en `website_template`; cada cliente los trae así, desde su copia:
`cd ~/Dev/web_<cliente> && git checkout develop && git pull && npm run sitio:actualizar`

Qué hace: añade el remoto `plantilla` si falta, fusiona `plantilla/develop`, deja la piel del cliente
(`site.config.ts`, `content/`, `public/marca/`, `public/fotos/`, iconos de `app/`, `README.md` y la
memoria de `docs/`) **exactamente como estaba**, corre los frenos rápidos y empuja a `develop` → vista
previa. Producción, solo con el «sí» de Ricardo (pasar `develop` a `main`).

- «Ya al día» → nada que hacer.
- «Conflictos en el motor» → el cliente tocó un archivo del motor que la plantilla también cambió.
  La fusión queda deshecha; se resuelve a mano (`git merge plantilla/develop`) llevando el ajuste
  del cliente a la ficha o a la plantilla, no dejándolo en el motor.
- «Los frenos fallaron» → fusión deshecha, `develop` intacto. Casi siempre, la plantilla espera un
  archivo de piel nuevo (una página) que el cliente no tiene: escribirlo en su `content/`.
- Repositorio creado antes del 23-09 con «Use this template» (sin historial común): la primera vez,
  `npm run sitio:actualizar -- --primera-vez`.

## Paso 2 · Proyecto Supabase (3 min)

1. Coste: `get_cost` del conector MCP con `type: "project"` y `organization_id: "isojilkgmlbhvfwxiflj"`.
   **Si es mayor que 0 → parar**: es una compra. Escribir a Ricardo, literal: «Crear la base de
   <cliente> cuesta <importe> USD/<recurrencia>. ¿La creo? Responde sí o no.» Solo con su «sí» se sigue.
2. Crear por la CLI, con una contraseña generada en la propia orden que nadie ve (el comando de
   secretos del paso 6 no la necesita):
   `cd ~/Dev/slg_website && npx --no-install supabase projects create web-<cliente> --org-id isojilkgmlbhvfwxiflj --region us-east-1 --db-password "$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 40)" --agent no`
   La salida trae la **referencia** (20 letras): se usa en los pasos 3, 4 y 6.
3. `get_project` del conector MCP con esa referencia → `status: ACTIVE_HEALTHY`.

**Si falla**: «Access token not provided» → Ricardo pega en Terminal `npx --yes supabase login`.
Nombre repetido → parar y preguntar.

## Paso 3 · Migraciones por la API de Supabase (5 min)

1. Aplicar las migraciones en orden por la CLI (va por la API de gestión: sin contraseña, sin IPv6 y
   sin cargar el SQL en la conversación). Se para en la primera que falle:

   ```bash
   cd ~/Dev/web_<cliente> && python3 -c "import json;[print(e['tag']) for e in sorted(json.load(open('drizzle/meta/_journal.json'))['entries'],key=lambda e:e['idx'])]" | while read tag; do npx --no-install supabase db query --linked --project-ref <ref> --file "drizzle/$tag.sql" --agent no --output-format json >/tmp/m.out 2>&1 && ! grep -qiE '"error"|ERROR:' /tmp/m.out && echo "✓ $tag" || { echo "✗ $tag"; tail -5 /tmp/m.out; break; }; done
   ```
2. Si una falla: **parar**. Se corrige la causa y se repite esa misma, nunca se salta.

**Por qué funcionan tal cual (revisado el 22-09 sobre 0000–0023):**

| Cuestión | Veredicto |
|---|---|
| `--> statement-breakpoint` | Es un comentario SQL (`--`): el archivo entero se ejecuta como un bloque. Drizzle también ejecuta todas en una sola transacción, así que no hay nada que exija ir fuera de ella (ni `CONCURRENTLY` ni `ALTER TYPE … ADD VALUE`) |
| Roles (0001 `CREATE ROLE slg_app`, 0002 `ALTER ROLE … NOBYPASSRLS`) | Exigen `CREATEROLE` y `BYPASSRLS` en quien ejecuta. El rol `postgres` de Supabase tiene los dos; así se migró producción de SLG. Confirmado en la prueba en frío: las 27 pasaron y la comprobación **b** dio `postgres` |
| `COMMENT ON` (0004, 0006, 0008–0011, 0013, 0015) | Válido para el dueño del objeto; sin tratamiento |
| **El diario de Drizzle** | **Necesita tratamiento.** Aplicarlas por la API no anota nada en `drizzle.__drizzle_migrations`. Sin filas ahí, `scripts/db/migrar.ts` y `/api/ops` creerían la base vacía y volverían a lanzar la 0000 (que falla con «ya existe»). Se rellena en el punto 3 |
| Datos de SLG en migraciones (0021 vocabulario, 0023 dominios desechables) | No bloquean: el vocabulario de servicios lo vacía el §3 paso 12; los dominios desechables sirven a cualquier cliente |

3. Rellenar el diario de Drizzle. Generar la orden (hash = SHA-256 del archivo, `created_at` = su
   `when` del diario, exactamente como lo calcula `drizzle-orm/migrator`):

   ```bash
   cd ~/Dev/web_<cliente> && node -e 'const fs=require("fs"),c=require("crypto");const j=JSON.parse(fs.readFileSync("drizzle/meta/_journal.json","utf8"));const h=t=>c.createHash("sha256").update(fs.readFileSync("drizzle/"+t+".sql").toString()).digest("hex");console.log("CREATE SCHEMA IF NOT EXISTS drizzle;\nCREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);\nINSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES\n"+j.entries.map(e=>"  (\x27"+h(e.tag)+"\x27, "+e.when+")").join(",\n")+";")'
   ```

   guardar su salida en un archivo y pasarlo con `npx --no-install supabase db query --linked --project-ref <ref> --file <archivo> --agent no`. Las comprobaciones de abajo van por la misma vía.

4. **La API de datos sobre `public` ya queda cerrada**: lo hace la migración `0026_cerrar_la_api_rest`
   (hallazgo del 22-09 — Supabase publica `public` por su API REST a `anon` y `authenticated`, y el
   sitio no la usa). Aquí solo se comprueba: es la consulta **d** de abajo. `slg_app` conserva su
   `USAGE` explícito, y **no** se revoca `EXECUTE` de las funciones a `PUBLIC`: las políticas de fila
   llaman a `app_organization_id()` y otras con el permiso de `slg_app`, que lo hereda de `PUBLIC`.

**Comprobar** (por la CLI, como el punto 3, o `execute_sql` del conector, cada una por separado):

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
Se crean por SQL (CLI o `execute_sql` del conector):

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

1. Crear, enlazar y conectar a GitHub por la CLI de Vercel, desde el clon del paso 1:
   `cd ~/Dev/web_<cliente> && vercel project add web-<cliente> --scope ricardotorresolivas-projects && vercel link --yes --project web-<cliente> --scope ricardotorresolivas-projects && vercel git connect https://github.com/RicardoTorresOliva/web_<cliente>.git --yes --scope ricardotorresolivas-projects`
2. **`vercel project add` crea el proyecto con el preset «Other»** (sirve `public/` como estático, no
   la aplicación). Fijar Next.js por la API:
   `vercel api "/v9/projects/web-<cliente>?teamId=team_NVmg2F1svT5W7CKrSInHh5VD" -X PATCH --input <(echo '{"framework":"nextjs"}')`
   y comprobar con un GET a la misma ruta: `framework: nextjs` y `link.productionBranch: main`.
   **`vercel link` añade `.env*` al `.gitignore`**, que ignoraría también `.env.example`: cambiar esa
   línea por `.env.local` antes del primer commit.
3. Variables **no secretas**, destino **Production y Preview**, legibles, con
   `printf '%s' "<valor>" | vercel env add <NOMBRE> production,preview --project web-<cliente> --scope team_NVmg2F1svT5W7CKrSInHh5VD --no-sensitive --force --yes --non-interactive`:

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
`APP_DB_PASSWORD`, `BETTER_AUTH_SECRET`, `DELIVERABLE_VIEWER_SECRET`,
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

   **Sitio sin dominio real todavía** (la demo de la plantilla, o un cliente que aún no delegó su DNS):
   añadir `--sin-correo --sin-monitor` al final de la línea. Salta Resend y UptimeRobot y no pide sus
   claves; el día que el dominio exista se pega la línea sin esas dos opciones y completa lo que falta.
3. Lo que pega Ricardo son nombres de variables y registros DNS: **no son secretos**. Los registros
   DNS se guardan para el paso 13 del §5 (DNS).

## Paso 7 · Comprobación de la vista previa (3 min)

1. Las variables solo entran en despliegues **nuevos**: provocar uno de `develop`
   (`git -C ~/Dev/web_<cliente> commit --allow-empty -m "Arranque: variables cargadas"` y
   `git -C ~/Dev/web_<cliente> push origin develop`), o el primer cambio real de contenido.
2. `vercel api "/v6/deployments?projectId=<id>&teamId=team_NVmg2F1svT5W7CKrSInHh5VD&limit=1"` → el último de `develop` en `READY`. Si sale `ERROR`: leer su
   registro de compilación (`get_deployment` / eventos). El caso típico es una variable del paso 5 mal
   escrita.
3. `vercel curl https://<url del despliegue>/api/health --scope ricardotorresolivas-projects` (las
   vistas previas están protegidas; `vercel curl` entra con la sesión del equipo). Tiene que devolver
   `"status":"ok"`, `"app":"slg_website"`, `"migraciones"` igual al número del paso 3 a, y
   `"faltan":[]`.
4. Si `faltan` nombra variables: las de la tabla del paso 5 las añade Claude; las secretas, Ricardo
   vuelve a pegar la misma línea del paso 6 (solo añade lo que falte).
5. Dejar en el chat el resumen: repositorio, referencia de Supabase, proyecto de Vercel, URL de la
   vista previa, número de migraciones, resultado de `get_advisors`, y los registros DNS pendientes.
