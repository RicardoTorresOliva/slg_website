/**
 * test-entregables.ts — Entregables y avisos (DU-15), contra PostgreSQL real.
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **1** — los **cinco** tipos, por archivo y por enlace, con las dos
 *     visibilidades.
 *   · **2** — **reemitir crea una versión nueva y NO destruye la anterior**: las
 *     dos quedan consultables y con objetos distintos en el bucket (RF-143).
 *   · **3** — el tipo y el tamaño se validan **en el servidor y ANTES de
 *     firmar**: sin firma no hay escritura posible (RNF-25).
 *   · **4** — el aviso va a **una empresa**, y su Markdown se sanea al
 *     renderizarse: un `<script>` sale como texto y un `javascript:` deja de
 *     ser enlace (RNF-31).
 *   · **5** — un entregable `internal` **no sale** por la puerta del cliente,
 *     ni pidiéndolo (RF-89).
 *   · **6** — la atribución distingue **persona** de **clave de API** (RF-111).
 *   · **7** — proyecto sin entregables · empresa sin avisos · enlace inválido.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import postgres from "postgres";

import { contextoDeClaveApi, contextoDeSesion } from "../../lib/db/context.ts";
import type { UserRole } from "../../lib/db/schema.ts";

let fallos = 0;
let comprobaciones = 0;

function check(caso: string, ok: boolean, detalle = "") {
  comprobaciones++;
  if (ok) console.log(`  ✓ ${caso}`);
  else {
    fallos++;
    console.error(`  ✗ ${caso}${detalle ? `\n      ${detalle}` : ""}`);
  }
}

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

const ORG = "org-du15";
const PROYECTO = "p-du15";
const ADMIN = "u-admin-du15";
const SLUG = "cliente-du15";

const admin = () =>
  contextoDeSesion({ userId: ADMIN, userName: "Admin DU15", role: "slg_admin" as UserRole, organizationId: null });

/** Una clave de API con alcance de escritura de entregables, para RF-111. */
const comoClave = () =>
  contextoDeClaveApi({
    apiKeyId: "k-du15",
    name: "Agente DU15",
    organizationId: ORG,
    scopes: ["deliverables:write", "announcements:write"],
  });

async function limpiar() {
  await dueno`delete from announcement where organization_id = ${ORG}`;
  await dueno`delete from deliverable where organization_id = ${ORG}`;
  await dueno`delete from project where id = ${PROYECTO}`;
  await dueno`delete from membership where organization_id = ${ORG}`;
  await dueno`delete from organization where id = ${ORG} or slug = ${SLUG}`;
  await dueno`delete from "user" where id = ${ADMIN}`;
}

async function sembrar() {
  await limpiar();
  await dueno`insert into organization (id, name, slug, type, status)
              values (${ORG}, 'Cliente DU15', ${SLUG}, 'client', 'active')`;
  await dueno`insert into "user" (id, name, email, email_verified, role, locale)
              values (${ADMIN}, 'Admin DU15', 'admin@du15.test', true, 'slg_admin', 'es')`;
  await dueno`insert into project (id, organization_id, name, service, status)
              values (${PROYECTO}, ${ORG}, 'Proyecto DU15', 'Phoenix PEEx', 'active')`;
}

/** Apunta el adaptador de S3 a un endpoint que no existe: aquí solo se FIRMA. */
function apuntarS3() {
  process.env.S3_ENDPOINT = "http://127.0.0.1:1";
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY_ID = ["clave", "de", "acceso", "du15"].join("");
  process.env.S3_SECRET_ACCESS_KEY = ["clave", "secreta", "du15"].join("");
  process.env.S3_BUCKET_DOWNLOADS = "downloads";
  process.env.S3_BUCKET_DELIVERABLES = "deliverables";
}

async function main() {
  process.env.CRM_QUEUE_DISABLED = "1";
  apuntarS3();

  const { entregables, entregablesDelCliente, publicarEntregable, versionesDe } = await import(
    "../../lib/hq/entregables.ts"
  );
  const { avisos, publicarAviso } = await import("../../lib/hq/avisos.ts");

  await sembrar();

  try {
    /* ── Criterio 7 · vacíos ────────────────────────────────────────────── */
    console.log("\nCriterio 7 — un proyecto sin entregables y una empresa sin avisos:\n");
    check("la lista de entregables puede venir vacía", (await entregables(admin(), PROYECTO)).length === 0);
    check("la de avisos también", (await avisos(admin(), ORG)).length === 0);

    /* ── Criterio 1 · los cinco tipos ───────────────────────────────────── */
    console.log("\nCriterio 1 — los cinco tipos, por archivo y por enlace (RF-80):\n");
    const base = {
      projectId: PROYECTO,
      organizationId: ORG,
      visibilidad: "client",
    };
    const porArchivo = async (tipo: string, nombre: string, mime: string) =>
      publicarEntregable(admin(), {
        ...base,
        titulo: `Entregable ${tipo}`,
        tipo,
        archivo: { nombre, mime, bytes: 1024 },
      });

    const pdf = await porArchivo("pdf", "informe.pdf", "application/pdf");
    check("`pdf` por archivo se publica y devuelve URL de subida", Boolean(pdf.subida?.url), JSON.stringify(pdf.subida));
    check("y la clave del objeto lleva la versión", Boolean(pdf.subida?.url.includes("/v1/")), pdf.subida?.url?.slice(0, 120) ?? "");

    await porArchivo("html", "informe.html", "text/html");
    await porArchivo("md", "notas.md", "text/markdown");
    await porArchivo("material", "anexo.png", "image/png");
    const enlace = await publicarEntregable(admin(), {
      ...base,
      titulo: "Entregable link",
      tipo: "link",
      url: "https://ejemplo.test/informe",
    });
    check("`link` por enlace se publica y NO pide subida", enlace.subida === null);

    const todos = await entregables(admin(), PROYECTO);
    check(
      "están los cinco tipos",
      new Set(todos.map((e) => e.tipo)).size === 5,
      todos.map((e) => e.tipo).join(" · "),
    );

    /* ── Criterio 3 · validación antes de firmar ────────────────────────── */
    console.log("\nCriterio 3 — tipo y tamaño se validan EN EL SERVIDOR y ANTES de firmar (RNF-25):\n");
    const intentar = async (parche: Record<string, unknown>) => {
      try {
        await publicarEntregable(admin(), {
          ...base,
          titulo: "Roto",
          tipo: "pdf",
          archivo: { nombre: "x.pdf", mime: "application/pdf", bytes: 1024 },
          ...parche,
        });
        return "(publicado)";
      } catch (e) {
        return (e as Error & { campo?: string }).campo ?? (e as Error).name;
      }
    };
    check(
      "un MIME que no corresponde al tipo se rechaza",
      (await intentar({ archivo: { nombre: "x.pdf", mime: "application/x-msdownload", bytes: 1024 } })).startsWith("archivo"),
    );
    check(
      "un archivo por encima del tope se rechaza",
      (await intentar({ archivo: { nombre: "x.pdf", mime: "application/pdf", bytes: 5_000_000_000 } })).startsWith("archivo"),
    );
    check("un tipo de archivo sin archivo se rechaza", (await intentar({ archivo: null })) === "archivo");
    check(
      "un `link` con esquema que no es http(s) se rechaza",
      (await intentar({ tipo: "link", archivo: null, url: "javascript:alert(1)" })) === "url",
    );
    check("y un `link` sin enlace también (criterio 7)", (await intentar({ tipo: "link", archivo: null, url: "" })) === "url");
    check(
      "ninguno de los rechazados llegó a escribirse",
      (await entregables(admin(), PROYECTO)).every((e) => e.titulo !== "Roto"),
    );

    /* ── Criterio 2 · versiones ─────────────────────────────────────────── */
    console.log("\nCriterio 2 — reemitir crea una versión nueva y NO destruye la anterior (RF-143):\n");
    const v2 = await publicarEntregable(admin(), {
      ...base,
      titulo: "Entregable pdf",
      tipo: "pdf",
      archivo: { nombre: "informe.pdf", mime: "application/pdf", bytes: 2048 },
      familyId: (await entregables(admin(), PROYECTO)).find((e) => e.tipo === "pdf")!.familyId,
    });
    check("la versión nueva es la 2", v2.version === 2, String(v2.version));

    const versiones = await versionesDe(admin(), v2.familyId);
    check("las DOS versiones siguen consultables", versiones.length === 2, `${versiones.length}`);
    check("y la anterior conserva su versión 1", versiones.some((v) => v.version === 1));
    check(
      "cada versión tiene su PROPIO objeto: ninguna pisa a la otra en el bucket",
      new Set(versiones.map((v) => v.claveDeArchivo)).size === 2,
      versiones.map((v) => v.claveDeArchivo).join(" · "),
    );

    /* ── Criterio 5 · `internal` no sale por la puerta del cliente ──────── */
    console.log("\nCriterio 5 — un `internal` no sale por la puerta del cliente (RF-89):\n");
    await publicarEntregable(admin(), {
      ...base,
      visibilidad: "internal",
      titulo: "Notas internas",
      tipo: "md",
      archivo: { nombre: "notas.md", mime: "text/markdown", bytes: 512 },
    });
    const deHq = await entregables(admin(), PROYECTO);
    const deCliente = await entregablesDelCliente(admin(), PROYECTO);
    check("HQ lo ve", deHq.some((e) => e.titulo === "Notas internas"));
    check("EL CLIENTE NO", !deCliente.some((e) => e.titulo === "Notas internas"));
    check(
      "y la puerta del cliente no devuelve NINGÚN `internal`, sea cual sea",
      deCliente.every((e) => e.visibilidad === "client"),
      deCliente.map((e) => e.visibilidad).join(" · "),
    );

    /* ── Criterio 6 · atribución ────────────────────────────────────────── */
    console.log("\nCriterio 6 — la atribución distingue persona de clave de API (RF-111):\n");
    const porPersona = deHq.find((e) => e.titulo === "Entregable link");
    check("lo publicado por una persona se atribuye a `user`", porPersona?.publicadoPorTipo === "user", String(porPersona?.publicadoPorTipo));

    const porAgente = await publicarEntregable(comoClave(), {
      ...base,
      titulo: "Entregable de agente",
      tipo: "link",
      url: "https://ejemplo.test/agente",
    });
    const fila = (await entregables(admin(), PROYECTO)).find((e) => e.id === porAgente.id);
    check("y lo publicado por una clave, a `api_key`", fila?.publicadoPorTipo === "api_key", String(fila?.publicadoPorTipo));
    check("con su nombre, no el de una persona", fila?.publicadoPor === "Agente DU15", String(fila?.publicadoPor));

    /* ── Criterio 4 · avisos y saneado ──────────────────────────────────── */
    console.log("\nCriterio 4 — el aviso va a UNA empresa y su Markdown se sanea (RF-81, RNF-31):\n");
    const idAviso = await publicarAviso(admin(), {
      organizationId: ORG,
      titulo: "Primer aviso",
      idioma: "es",
      cuerpoMd: "## Hola\n\nUn <script>alert(1)</script> y un [enlace](javascript:alert(2)) y uno [bueno](https://ejemplo.test).",
    });
    check("el aviso se publica", Boolean(idAviso));
    const losAvisos = await avisos(admin(), ORG);
    check("y queda ligado a su empresa", losAvisos[0]?.organizationId === ORG);
    check(
      "se guarda el texto TAL COMO se escribió: sanear al guardar lo perdería para siempre",
      losAvisos[0]?.cuerpoMd.includes("<script>"),
    );

    /**
     * El saneado se comprueba sobre **la decisión**, no sobre el HTML pintado:
     * vive en `lib/content/markdown-seguro.ts` justamente para poder probarlo
     * caso a caso sin navegador. El componente solo pinta lo que esto decide, y
     * **nunca produce HTML arbitrario**: construye elementos de React.
     */
    const { enlaceSeguro, trozosDeLinea } = await import("../../lib/content/markdown-seguro.ts");

    const trozos = trozosDeLinea(losAvisos[0]!.cuerpoMd.split("\n\n")[1] ?? "");
    check(
      "el `<script>` NO es ninguna marca: sale como texto, que es como se pinta",
      trozos.filter((t) => t.texto.includes("<script>")).every((t) => t.tipo === "texto"),
      JSON.stringify(trozos.map((t) => t.tipo)),
    );
    check(
      "el enlace `javascript:` deja de ser enlace y se conserva como texto",
      !trozos.some((t) => t.tipo === "enlace" && t.href?.startsWith("javascript:")) &&
        trozos.some((t) => t.tipo === "texto" && t.texto.includes("javascript:")),
      JSON.stringify(trozos),
    );
    check(
      "mientras que el enlace bueno sí se pinta",
      trozos.some((t) => t.tipo === "enlace" && t.href === "https://ejemplo.test"),
      JSON.stringify(trozos.filter((t) => t.tipo === "enlace")),
    );

    console.log("\nY las variantes con las que se salta una lista negra escrita a mano:\n");
    for (const malo of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox",
      "file:///etc/passwd",
    ]) {
      check(`«${malo.trim().slice(0, 28)}» NO se pinta`, !enlaceSeguro(malo));
    }
    for (const bueno of ["https://ejemplo.test", "http://ejemplo.test", "mailto:hola@ejemplo.test", "/interno", "#ancla"]) {
      check(`«${bueno}» sí se pinta`, enlaceSeguro(bueno));
    }

    let campoAviso = "";
    try {
      await publicarAviso(admin(), { organizationId: "", titulo: "Sin empresa", cuerpoMd: "x", idioma: "es" });
    } catch (e) {
      campoAviso = (e as Error & { campo?: string }).campo ?? "";
    }
    check("un aviso SIN empresa no se publica: no hay aviso global", campoAviso === "empresa", campoAviso);

    console.log("\nEl aviso guarda EN QUÉ IDIOMA se escribió, no el de quien lo publica (RF-72):\n");
    await publicarAviso(admin(), {
      organizationId: ORG,
      titulo: "Second announcement",
      cuerpoMd: "Written in English on purpose.",
      idioma: "en",
    });
    const enIngles = (await avisos(admin(), ORG)).find((a) => a.titulo === "Second announcement");
    check("se guarda como inglés aunque quien lo publica tenga la interfaz en español", enIngles?.idioma === "en", String(enIngles?.idioma));
    check("y el español sigue marcado como español", losAvisos[0]?.idioma === "es", String(losAvisos[0]?.idioma));

    let campoIdioma = "";
    try {
      await publicarAviso(admin(), { organizationId: ORG, titulo: "Roto", cuerpoMd: "x", idioma: "pt" });
    } catch (e) {
      campoIdioma = (e as Error & { campo?: string }).campo ?? "";
    }
    check("un idioma fuera del vocabulario se rechaza", campoIdioma === "idioma", campoIdioma);

    await limpiar();
  } finally {
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ entregables: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ entregables: ${comprobaciones} comprobaciones contra PostgreSQL real, sin fallos.`);
  process.exit(0);
}

await main();
