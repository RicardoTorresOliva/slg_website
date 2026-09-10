/**
 * fake-smtp-server.ts — Captador SMTP en proceso, solo para `test-email.ts`.
 *
 * No es Docker ni un servicio externo: nace y muere con la propia suite, en
 * un puerto que el sistema operativo asigna (`listen(0, ...)`), así que dos
 * instancias en el mismo proceso son dos destinos de verdad — exactamente lo
 * que el criterio 2 de FU-08 pide demostrar ("un segundo destino configurado
 * solo por variables de entorno"), sin depender de una segunda cuenta
 * comercial real ni de que el registro de un tercero (Docker Hub) responda.
 *
 * `smtp-server` es una herramienta de PRUEBA, no un proveedor: no cuenta como
 * la excepción que `check-email-encapsulado.ts` vigila (esa vigila
 * `nodemailer`, el cliente que SÍ habla con un proveedor real).
 */
import { SMTPServer } from "smtp-server";

export type MensajeCapturado = {
  from: string;
  to: string[];
  subject: string;
};

export type ServidorFalso = {
  puerto: number;
  mensajesPara(destinatario: string): MensajeCapturado[];
  detener(): Promise<void>;
};

function extraerAsunto(crudo: Buffer): string {
  const texto = crudo.toString("utf8");
  const fin = texto.indexOf("\r\n\r\n");
  const cabeceras = fin === -1 ? texto : texto.slice(0, fin);
  const m = /^subject:\s*(.*)$/im.exec(cabeceras);
  return m ? m[1].trim() : "";
}

export async function iniciarServidorSmtpFalso(): Promise<ServidorFalso> {
  const mensajes: MensajeCapturado[] = [];

  const server = new SMTPServer({
    // Acepta cualquier credencial: esto prueba EL ADAPTADOR, no la seguridad
    // de un proveedor real, que ni siquiera es este código.
    onAuth(auth, _session, callback) {
      callback(null, { user: auth.username });
    },
    onData(stream, session, callback) {
      const trozos: Buffer[] = [];
      stream.on("data", (t) => trozos.push(t));
      stream.on("end", () => {
        mensajes.push({
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : "",
          to: session.envelope.rcptTo.map((r) => r.address),
          subject: extraerAsunto(Buffer.concat(trozos)),
        });
        callback();
      });
    },
    disabledCommands: ["STARTTLS"],
    logger: false,
  });

  const puerto = await new Promise<number>((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const dir = server.server.address();
      if (typeof dir === "object" && dir) resolve(dir.port);
      else reject(new Error("no se pudo obtener el puerto del captador SMTP falso"));
    });
  });

  return {
    puerto,
    mensajesPara: (destinatario) =>
      mensajes.filter((m) => m.to.includes(destinatario)),
    detener: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
