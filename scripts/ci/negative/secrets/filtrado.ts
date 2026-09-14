// FIXTURE NEGATIVO — ninguno de estos valores es real ni funciona en ningún
// sitio. Existen para que check-secrets.ts demuestre que sabe ponerse rojo.
//
// `gitleaks:allow` EN CADA LÍNEA, y no por comodidad. Este archivo ya está en
// la lista de exclusión de `.gitleaks.toml` por ruta, pero esa exclusión
// depende de que gitleaks CARGUE nuestra configuración — y el primer empuje a
// `main` demostró que no siempre lo hace: escaneó el historial entero, no
// encontró la exclusión y marcó este archivo como filtración. El marcador en
// línea lo entiende gitleaks aunque corra con su configuración por defecto.
//
// Y la de `check-secrets.ts` sigue en pie: nuestro escáner tiene sus propios
// patrones y este comentario no los desactiva. Lo comprueba `check:brakes`.
export const accessKeyId = "AKIAIOSFODNN7EXAMPLE"; // gitleaks:allow
export const cadena = "postgresql://usuario:contrasena-de-mentira@localhost:5432/x"; // gitleaks:allow
export const API_KEY = "re_0123456789abcdefghijklmnop"; // gitleaks:allow
export const config = {
  // Literal pegado en el código, que es exactamente lo que la regla busca.
  MAIL_SMTP_PASSWORD: "contrasena-pegada-en-el-codigo", // gitleaks:allow
};
