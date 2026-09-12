// FIXTURE NEGATIVO — ninguno de estos valores es real ni funciona en ningún
// sitio. Existen para que check-secrets.ts demuestre que sabe ponerse rojo.
export const accessKeyId = "AKIAIOSFODNN7EXAMPLE";
export const cadena = "postgresql://usuario:contrasena-de-mentira@localhost:5432/x";
export const API_KEY = "re_0123456789abcdefghijklmnop";
export const config = {
  // Literal pegado en el código, que es exactamente lo que la regla busca.
  MAIL_SMTP_PASSWORD: "contrasena-pegada-en-el-codigo",
};
