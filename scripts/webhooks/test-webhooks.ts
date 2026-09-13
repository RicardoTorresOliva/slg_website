/**
 * test-webhooks.ts — Los webhooks salientes, contra **receptores reales** y
 * PostgreSQL real (DU-12).
 *
 * Los criterios que solo se comprueban así:
 *
 *   · **criterio 1** — los **nueve** eventos de B.7 se emiten y quedan
 *     registrados. Se emiten los nueve, no una muestra: el que falta siempre es
 *     el que nadie probó.
 *   · **criterio 2** — la firma se verifica **en el receptor**, sobre el texto
 *     crudo del cuerpo; **un cuerpo alterado la invalida**; y el secreto es
 *     **por suscriptor** —la firma de uno no vale para el otro—.
 *   · **criterio 3** — un destino que falla se reintenta con espera creciente y
 *     cada intento deja estado, número de intentos y último error en
 *     `webhook_delivery`; al quinto pasa a `failed`.
 *   · **criterio 4** — **sin suscriptor configurado el sistema funciona igual**
 *     y el evento queda registrado.
 *   · **criterio 5** — `post.published` transporta los tres extractos de redes
 *     **y el enlace canónico**, de modo que el receptor puede publicar sin leer
 *     de vuelta el repositorio.
 *   · **criterio 7** — el secreto de firma **no aparece en la base de datos**:
 *     ni en el payload, ni en la URL de destino, ni en el último error.
 *
 * Y lo que ninguna de esas prueba por sí sola: que los eventos salgan **desde
 * los sitios donde ocurren las cosas**. Un `emitir` que funciona y que nadie
 * llama es el fallo más fácil de esconder detrás de una prueba verde, así que
 * la última sección llama a `registrarCaptura` —la función real de la capa
 * pública— y comprueba qué eventos aparecen. Incluye el caso que RF-40 obliga a
 * distinguir: el documento «próximamente» captura y **no** dispara
 * `download.completed`.
 *
 * Necesita `bash scripts/db/local-pg.sh up`.
 */
import http from "node:http";

import postgres from "postgres";

import { CABECERA_EVENTO, CABECERA_FIRMA, CABECERA_MARCA, firmaValida } from "../../lib/webhooks/firma.ts";

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

/**
 * Secretos inventados para la prueba, en piezas. El escáner de secretos no
 * distingue una clave de prueba de una real —y hace bien—, así que aquí no hay
 * ninguna cadena que parezca una.
 */
const SECRETO_A = ["secreto", "del", "suscriptor", "a", "solo", "en", "memoria"].join("-");
const SECRETO_B = ["secreto", "del", "suscriptor", "b", "solo", "en", "memoria"].join("-");

const URL_DUENO = process.env.DATABASE_URL_MIGRATIONS;
if (!URL_DUENO) throw new Error("Falta DATABASE_URL_MIGRATIONS.");
const dueno = postgres(URL_DUENO, { max: 3 });

/* ── El receptor ──────────────────────────────────────────────────────────── */

type Recibido = {
  evento: string;
  marca: string;
  firma: string;
  /** El texto CRUDO, sin volver a serializar: es lo que se firma. */
  crudo: string;
};

function crearReceptor(secreto: string) {
  const recibidos: Recibido[] = [];
  let caido = false;

  const servidor = http.createServer((req, res) => {
    let crudo = "";
    req.on("data", (c) => (crudo += c));
    req.on("end", () => {
      recibidos.push({
        evento: String(req.headers[CABECERA_EVENTO] ?? ""),
        marca: String(req.headers[CABECERA_MARCA] ?? ""),
        firma: String(req.headers[CABECERA_FIRMA] ?? ""),
        crudo,
      });
      if (caido) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end('{"error":"el receptor está caído"}');
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });

  return {
    servidor,
    recibidos,
    secreto,
    tirar: () => (caido = true),
    levantar: () => (caido = false),
    async escuchar(): Promise<string> {
      await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
      const dir = servidor.address();
      return typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";
    },
  };
}

/* ── Ayudas sobre la tabla ────────────────────────────────────────────────── */

const MARCA = "evento-de-prueba-du12";

const filasDe = async (evento: string) =>
  await dueno`select id, event, payload, target_url, status, attempts, last_error, next_attempt_at
                from webhook_delivery where event = ${evento} order by target_url`;

async function limpiar() {
  await dueno`delete from webhook_delivery where payload->>'marca' = ${MARCA}
              or payload->>'slug' like 'du12-%'`;
}

/** Adelanta el reloj de la cola: la reserva de 5 minutos no se espera de verdad. */
async function vencerReserva() {
  await dueno`update webhook_delivery set next_attempt_at = now() - interval '1 minute'
               where status = 'pending' and payload->>'marca' = ${MARCA}`;
}

async function main() {
  const a = crearReceptor(SECRETO_A);
  const b = crearReceptor(SECRETO_B);
  const urlA = await a.escuchar();
  const urlB = await b.escuchar();

  // El barrendero automático APAGADO: esta prueba barre a mano para poder
  // observar cada intento. Con él encendido, los intentos ocurrirían entre dos
  // comprobaciones y el resultado dependería del reloj.
  process.env.CRM_QUEUE_DISABLED = "1";

  const { EVENTOS, barrerUnaVez, emitir } = await import("../../lib/webhooks/index.ts");

  await limpiar();

  try {
    /* ── Criterio 4 · sin suscriptor ────────────────────────────────────── */
    console.log("\nCriterio 4 — sin suscriptor configurado, el evento queda registrado igual:\n");
    delete process.env.WEBHOOK_SUBSCRIBERS;
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.WEBHOOK_SIGNING_SECRET;

    await emitir("contact.submitted", {
      leadId: MARCA,
      emailDomain: "sin-suscriptor.test",
      locale: "es",
      // Marca de la prueba: viaja en el payload para poder limpiar después sin
      // tocar filas de verdad.
      marca: MARCA,
    } as never);

    const sinSuscriptor = await filasDe("contact.submitted");
    const fila = sinSuscriptor.find((f) => f.payload?.marca === MARCA);
    check("el evento se registra aunque no haya nadie escuchando", Boolean(fila), `${sinSuscriptor.length} filas`);
    check(
      "queda marcado como entregado y sin destino, no como pendiente eterno",
      fila?.status === "delivered" && fila?.target_url === "(sin suscriptor)" && fila?.attempts === 0,
      JSON.stringify(fila),
    );
    const barridos = await barrerUnaVez();
    check("el barrendero no tiene nada que hacer con él", barridos === 0, `${barridos} filas reclamadas`);

    /* ── Criterio 2 · firma y secreto por suscriptor ────────────────────── */
    console.log("\nCriterio 2 — firma HMAC-SHA256 verificada en el receptor, secreto por suscriptor:\n");
    process.env.WEBHOOK_SUBSCRIBERS = JSON.stringify([
      { nombre: "a", url: urlA, secreto: SECRETO_A },
      { nombre: "b", url: urlB, secreto: SECRETO_B },
    ]);

    await emitir("lead.captured", {
      leadId: MARCA,
      source: "download",
      emailDomain: "prueba.test",
      locale: "es",
      page: "/descargas",
      marca: MARCA,
    } as never);

    const dos = (await filasDe("lead.captured")).filter((f) => f.payload?.marca === MARCA);
    check("dos suscriptores son DOS filas, cada una con su estado", dos.length === 2, `${dos.length}`);

    await barrerUnaVez();
    check("los dos receptores recibieron el evento", a.recibidos.length === 1 && b.recibidos.length === 1);

    const rA = a.recibidos[0];
    const rB = b.recibidos[0];
    check(
      "la firma verifica en el receptor sobre el texto crudo del cuerpo",
      firmaValida(rA.crudo, rA.marca, SECRETO_A, rA.firma) && firmaValida(rB.crudo, rB.marca, SECRETO_B, rB.firma),
    );
    check(
      "UN CUERPO ALTERADO INVALIDA LA FIRMA",
      !firmaValida(rA.crudo.replace("download", "contact"), rA.marca, SECRETO_A, rA.firma),
    );
    check(
      "una marca de tiempo alterada invalida la firma: la firma prueba origen Y momento",
      !firmaValida(rA.crudo, String(Number(rA.marca) + 1), SECRETO_A, rA.firma),
    );
    check(
      "EL SECRETO ES POR SUSCRIPTOR: la firma de A no vale con el secreto de B",
      !firmaValida(rA.crudo, rA.marca, SECRETO_B, rA.firma) &&
        !firmaValida(rB.crudo, rB.marca, SECRETO_A, rB.firma),
    );
    check(
      "la cabecera del evento coincide con lo firmado",
      rA.evento === "lead.captured" && JSON.parse(rA.crudo).event === "lead.captured",
    );
    check(
      "el cuerpo lleva el evento y sus datos, y NADA del secreto",
      !rA.crudo.includes(SECRETO_A) && !rA.crudo.includes(SECRETO_B),
    );

    const entregadas = (await filasDe("lead.captured")).filter((f) => f.payload?.marca === MARCA);
    check(
      "las dos filas quedan entregadas, con un intento cada una",
      entregadas.every((f) => f.status === "delivered" && f.attempts === 1 && f.last_error === null),
      JSON.stringify(entregadas.map((f) => [f.status, f.attempts])),
    );

    /* ── Criterio 3 · reintentos con espera creciente ───────────────────── */
    console.log("\nCriterio 3 — el destino que falla se reintenta con espera creciente y deja traza:\n");
    process.env.WEBHOOK_SUBSCRIBERS = JSON.stringify([{ nombre: "a", url: urlA, secreto: SECRETO_A }]);
    a.tirar();

    await emitir("doctrine.requested", {
      leadId: MARCA,
      emailDomain: "prueba.test",
      locale: "es",
      marca: MARCA,
    } as never);

    const { ESCALERA_MINUTOS, MAX_INTENTOS } = await import("../../lib/webhooks/index.ts");
    check("la escalera tiene cinco escalones, como la del CRM", MAX_INTENTOS === 5 && ESCALERA_MINUTOS.length === 5);

    await barrerUnaVez();
    const tras1 = (await filasDe("doctrine.requested")).find((f) => f.payload?.marca === MARCA);
    check(
      "tras el primer fallo sigue pendiente, con un intento y el error guardado",
      tras1?.status === "pending" && tras1?.attempts === 1 && String(tras1?.last_error).includes("503"),
      JSON.stringify(tras1),
    );
    check(
      "y con una próxima cita en el futuro: la espera es real, no un bucle",
      tras1?.next_attempt_at instanceof Date && tras1.next_attempt_at.getTime() > Date.now(),
      String(tras1?.next_attempt_at),
    );

    // Los cuatro intentos restantes, venciendo la cita cada vez.
    for (let i = 2; i <= MAX_INTENTOS; i++) {
      await vencerReserva();
      await barrerUnaVez();
    }
    const agotada = (await filasDe("doctrine.requested")).find((f) => f.payload?.marca === MARCA);
    check(
      "al quinto intento pasa a `failed` y deja de reintentarse",
      agotada?.status === "failed" && agotada?.attempts === MAX_INTENTOS && agotada?.next_attempt_at === null,
      JSON.stringify(agotada),
    );
    check("el receptor recibió los cinco intentos", a.recibidos.length === 1 + MAX_INTENTOS, `${a.recibidos.length}`);

    a.levantar();

    /* ── Criterio 5 · el payload de post.published ──────────────────────── */
    console.log("\nCriterio 5 — `post.published` se puede publicar sin leer de vuelta el repositorio:\n");
    process.env.NEXT_PUBLIC_SITE_URL = "https://softlandingglobal.com";
    const { urlDelArticulo } = await import("../../lib/webhooks/index.ts");
    const { articulos } = await import("../../lib/content/blog.ts");
    const muestra = articulos("es")[0];
    check("hay al menos un artículo publicado con el que probar", Boolean(muestra), "0 artículos");

    if (muestra) {
      await emitir("post.published", {
        slug: `du12-${muestra.slug}`,
        locale: "es",
        title: muestra.titulo,
        url: urlDelArticulo("es", muestra.slug),
        tags: muestra.etiquetas,
        social: muestra.social,
      });
      await barrerUnaVez();
      const recibido = a.recibidos.at(-1);
      const datos = JSON.parse(recibido?.crudo ?? "{}").data as {
        url?: string;
        social?: { hook?: string; linkedin?: string; x?: string };
        tags?: string[];
      };
      check(
        "lleva el ENLACE CANÓNICO en su idioma, no un identificador",
        datos.url === `https://softlandingglobal.com/blog/${muestra.slug}`,
        String(datos.url),
      );
      check(
        "lleva los tres extractos de redes rellenos",
        Boolean(datos.social?.hook && datos.social?.linkedin && datos.social?.x),
        JSON.stringify(datos.social),
      );
      check("lleva las etiquetas del artículo", Array.isArray(datos.tags) && datos.tags.length > 0);
      check(
        "el enlace del inglés apunta a /en/blog/, no al español",
        urlDelArticulo("en", "silent-authority") === "https://softlandingglobal.com/en/blog/silent-authority",
        urlDelArticulo("en", "silent-authority"),
      );
    }

    /* ── Criterio 1 · los nueve eventos ─────────────────────────────────── */
    console.log("\nCriterio 1 — los NUEVE eventos de B.7 se emiten y quedan registrados:\n");
    check("la lista es de nueve y está cerrada", EVENTOS.length === 9, EVENTOS.join(" · "));

    // Payload mínimo por evento: lo que importa aquí es que cada nombre recorre
    // la cola entera, no la forma, que la comprueba el compilador.
    for (const evento of EVENTOS) {
      await emitir(evento, { marca: MARCA, slug: `du12-${evento}` } as never);
    }
    await barrerUnaVez(50);
    const registrados = await dueno`select distinct event from webhook_delivery
                                     where payload->>'marca' = ${MARCA}`;
    const nombres = new Set(registrados.map((f) => f.event as string));
    check(
      "los nueve quedan registrados en webhook_delivery",
      EVENTOS.every((e) => nombres.has(e)),
      `faltan: ${EVENTOS.filter((e) => !nombres.has(e)).join(", ") || "ninguno"}`,
    );

    /* ── El cableado · los eventos salen de donde ocurren las cosas ─────── */
    console.log("\nCableado — `registrarCaptura` dispara los eventos de su origen:\n");
    // Presigna en local, sin red: basta con que las variables existan. Son
    // credenciales inventadas, en piezas, por la misma razón que arriba.
    process.env.S3_ENDPOINT = "http://127.0.0.1:1";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = ["clave", "de", "acceso", "de", "prueba"].join("");
    process.env.S3_SECRET_ACCESS_KEY = ["clave", "secreta", "de", "prueba"].join("");
    process.env.S3_BUCKET_DOWNLOADS = "downloads";
    delete process.env.WEBHOOK_SUBSCRIBERS;

    const { registrarCaptura } = await import("../../lib/descargas/service.ts");

    const formulario = (email: string) => {
      const f = new FormData();
      f.set("email", email);
      return f;
    };

    const antesDeTodo = await dueno`select count(*)::int as n from webhook_delivery`;

    const conArchivo = await registrarCaptura({
      documento: {
        slug: "du12-con-archivo",
        titulo: "Documento con archivo",
        audiencia: "prueba",
        aprende: [],
        estado: "available",
        claveDeArchivo: "du12/con-archivo.pdf",
      },
      origen: "download",
      datos: formulario("director@du12-cableado.test"),
      email: "director@du12-cableado.test",
      pagina: "/descargas/du12",
      locale: "es",
    });
    check("la descarga con archivo se completa", conArchivo.ok && !("veredicto" in conArchivo), JSON.stringify(conArchivo).slice(0, 160));

    const proximamente = await registrarCaptura({
      documento: {
        slug: "du12-sin-archivo",
        titulo: "Documento sin archivo",
        audiencia: "prueba",
        aprende: [],
        estado: "coming_soon",
      },
      origen: "download",
      datos: formulario("otra@du12-cableado.test"),
      email: "otra@du12-cableado.test",
      pagina: "/descargas/du12",
      locale: "es",
    });
    check("el documento «próximamente» captura igual", proximamente.ok === true);

    await registrarCaptura({
      origen: "contact",
      datos: formulario("tercera@du12-cableado.test"),
      email: "tercera@du12-cableado.test",
      mensaje: "un mensaje de prueba",
      pagina: "/contacto",
      locale: "es",
    });

    const delCableado = await dueno`
      select event, payload->>'downloadSlug' as slug
        from webhook_delivery
       where payload->>'leadId' in (select id::text from lead_capture where email like '%@du12-cableado.test')
       order by event`;
    const eventos = delCableado.map((f) => f.event as string);
    const cuantos = (e: string) => eventos.filter((x) => x === e).length;

    check("las TRES capturas disparan `lead.captured`", cuantos("lead.captured") === 3, eventos.join(" · "));
    check("el contacto dispara además `contact.submitted`", cuantos("contact.submitted") === 1, eventos.join(" · "));
    check(
      "la descarga CON archivo dispara `download.completed`",
      cuantos("download.completed") === 1,
      eventos.join(" · "),
    );
    check(
      "y el «próximamente» NO lo dispara (RF-40): el único `download.completed` es el del documento con archivo",
      delCableado.find((f) => f.event === "download.completed")?.slug === "du12-con-archivo",
      JSON.stringify(delCableado.filter((f) => f.event === "download.completed")),
    );
    check(
      "sin suscriptor, todo esto queda registrado y nada se pierde",
      (await dueno`select count(*)::int as n from webhook_delivery`)[0]!.n > antesDeTodo[0]!.n,
    );

    await dueno`delete from webhook_delivery where payload->>'leadId' in
                (select id::text from lead_capture where email like '%@du12-cableado.test')`;
    await dueno`delete from download_event where lead_capture_id in
                (select id from lead_capture where email like '%@du12-cableado.test')`;
    await dueno`delete from lead_capture where email like '%@du12-cableado.test'`;

    /* ── Criterio 7 · los secretos solo en variables de entorno ─────────── */
    console.log("\nCriterio 7 — el secreto de firma no aparece en la base de datos:\n");
    const rastro = await dueno`select count(*)::int as n from webhook_delivery
                                where payload::text like ${"%" + SECRETO_A + "%"}
                                   or target_url like ${"%" + SECRETO_A + "%"}
                                   or coalesce(last_error,'') like ${"%" + SECRETO_A + "%"}`;
    check("ni en el payload, ni en la URL de destino, ni en el último error", rastro[0]?.n === 0, JSON.stringify(rastro[0]));

    await limpiar();
  } finally {
    a.servidor.close();
    b.servidor.close();
    await dueno.end({ timeout: 5 });
  }

  if (fallos > 0) {
    console.error(`\n✗ webhooks: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(
    `\n✓ webhooks: ${comprobaciones} comprobaciones contra receptores reales y PostgreSQL real, sin fallos.`,
  );
  // Como en `test-crm.ts`: importar `lib/webhooks` abre el pool de PostgreSQL de
  // la aplicación, y el pool mantiene el proceso vivo para siempre.
  process.exit(0);
}

await main();
