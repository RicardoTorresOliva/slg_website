// FIXTURE NEGATIVO — cuatro formas de saltarse los módulos encapsulados.
// Ninguna de estas importaciones existe: el archivo está aquí para que
// `check-fronteras` demuestre que sabe ponerse rojo (FU-06 y FU-08, criterio 1).
import { betterAuth } from "better-auth";
import nodemailer from "nodemailer";
// Relativo SIN prefijo `lib/`: desde `lib/algo/` entra igual de dentro, y el
// gate no lo veía hasta FU-07.
import { conexionDeAuth } from "../auth/db.ts";
import { adaptadorSmtp } from "../mail/smtp.ts";
import { S3Client } from "@aws-sdk/client-s3";
import { validarSubida } from "../files/validation.ts";

export const cruza = [betterAuth, nodemailer, conexionDeAuth, adaptadorSmtp, S3Client, validarSubida];
