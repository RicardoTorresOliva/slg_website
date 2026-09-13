/**
 * test-aprovisionar.ts — **Los botones de puesta en marcha de `/api/ops`**,
 * contra un servidor S3 que responde de verdad.
 *
 * POR QUÉ SE PRUEBA ESTO Y NO SE DA POR HECHO. Estas dos funciones existen
 * justo para el momento en el que la infraestructura **está a medias**: la
 * primera vez que alguien pulsa el botón, puede que no haya buckets, puede que
 * falten variables y puede que MinIO conteste algo raro. Una acción de puesta en
 * marcha que se cae con un 500 cuando encuentra el problema **no sirve para
 * arreglarlo**, y ese es el fallo que esta prueba impide.
 *
 * Lo que se comprueba:
 *   · sin variables de S3, **cuenta cuál falta** en vez de lanzar;
 *   · crea los dos buckets cuando no existen;
 *   · **es idempotente**: la segunda vez dice «ya existía» y no falla — un botón
 *     que falla la segunda vez es un botón que la gente teme pulsar;
 *   · un error del servidor se cuenta como fila roja, no como excepción.
 */
import http from "node:http";

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

/** Un MinIO de mentira: sabe si un bucket existe, y sabe crearlo. */
function crearDoble() {
  const buckets = new Set<string>();
  let roto = false;
  const peticiones: string[] = [];

  const servidor = http.createServer((req, res) => {
    const ruta = (req.url ?? "/").split("?")[0];
    const nombre = ruta.split("/").filter(Boolean)[0] ?? "";
    peticiones.push(`${req.method} ${ruta}`);

    if (roto) {
      res.writeHead(500);
      res.end();
      return;
    }
    if (req.method === "HEAD") {
      res.writeHead(buckets.has(nombre) ? 200 : 404);
      res.end();
      return;
    }
    // El bloqueo va como `PUT /bucket?publicAccessBlock`: la marca está en la
    // CONSULTA, no en la ruta. Mirando `ruta` —ya sin consulta— no se veía, y
    // la petición caía en la rama de «crear bucket».
    if (req.method === "PUT" && (req.url ?? "").includes("publicAccessBlock")) {
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === "PUT") {
      if (buckets.has(nombre)) {
        res.writeHead(409, { "content-type": "application/xml" });
        res.end("<Error><Code>BucketAlreadyOwnedByYou</Code></Error>");
        return;
      }
      buckets.add(nombre);
      res.writeHead(200);
      res.end();
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return { servidor, buckets, peticiones, romper: () => (roto = true), arreglar: () => (roto = false) };
}

function apuntarA(base: string) {
  process.env.S3_ENDPOINT = base;
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY_ID = ["clave", "de", "prueba", "aprov"].join("");
  process.env.S3_SECRET_ACCESS_KEY = ["secreta", "de", "prueba", "aprov"].join("");
  process.env.S3_BUCKET_DOWNLOADS = "downloads";
  process.env.S3_BUCKET_DELIVERABLES = "deliverables";
}

async function main() {
  console.log("\nSin variables de S3, la acción CUENTA el problema en vez de romperse:\n");
  for (const v of ["S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET_DOWNLOADS", "S3_BUCKET_DELIVERABLES", "S3_REGION"]) {
    delete process.env[v];
  }
  const { asegurarBuckets, cerrarAccesoPublico } = await import("../../lib/files/aprovisionar.ts");
  const sinNada = await asegurarBuckets();
  check("devuelve una fila por bucket, ninguna excepción", sinNada.length === 2, `${sinNada.length}`);
  check(
    "y dice exactamente qué variable falta",
    sinNada.every((r) => !r.ok && r.detalle.includes("S3_ENDPOINT")),
    JSON.stringify(sinNada.map((r) => r.detalle)),
  );

  const doble = crearDoble();
  await new Promise<void>((r) => doble.servidor.listen(0, "127.0.0.1", r));
  const dir = doble.servidor.address();
  const base = typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";
  apuntarA(base);

  try {
    console.log("\nLa primera vez crea los dos buckets:\n");
    const primera = await asegurarBuckets();
    check("los dos salen en verde", primera.every((r) => r.ok), JSON.stringify(primera));
    check("y los dos dicen «creado»", primera.every((r) => r.detalle === "creado"), JSON.stringify(primera.map((r) => r.detalle)));
    check(
      "el servidor tiene ahora «downloads» y «deliverables»",
      doble.buckets.has("downloads") && doble.buckets.has("deliverables"),
      [...doble.buckets].join(" · "),
    );

    console.log("\nLa segunda vez NO falla: es idempotente:\n");
    const segunda = await asegurarBuckets();
    check("siguen en verde", segunda.every((r) => r.ok), JSON.stringify(segunda));
    check("y ahora dicen «ya existía»", segunda.every((r) => r.detalle === "ya existía"), JSON.stringify(segunda.map((r) => r.detalle)));

    console.log("\nEl bloqueo de acceso anónimo se pide para los dos:\n");
    const cerrados = await cerrarAccesoPublico();
    check("dos resultados", cerrados.length === 2);
    check("los dos aceptados por el servidor", cerrados.every((r) => r.ok), JSON.stringify(cerrados));

    console.log("\nY si el servidor se rompe, sale fila roja, no excepción:\n");
    doble.romper();
    const rotos = await asegurarBuckets();
    check("devuelve filas en vez de lanzar", rotos.length === 2);
    check("y las marca en rojo", rotos.every((r) => !r.ok), JSON.stringify(rotos.map((r) => r.detalle)));
    const cerradosRotos = await cerrarAccesoPublico();
    check("el bloqueo también se degrada", cerradosRotos.every((r) => !r.ok));
    doble.arreglar();
  } finally {
    doble.servidor.close();
  }

  if (fallos > 0) {
    console.error(`\n✗ aprovisionar: ${fallos} de ${comprobaciones} comprobaciones fallaron.\n`);
    process.exit(1);
  }
  console.log(`\n✓ aprovisionar: ${comprobaciones} comprobaciones contra un servidor S3 real, sin fallos.`);
  process.exit(0);
}

await main();
