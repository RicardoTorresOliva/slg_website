/**
 * Armazón del grupo `(auth)` — las pantallas SIN sesión previa.
 *
 * El middleware ya marca todo este grupo como `noindex` (architecture §2.3): una
 * pantalla de acceso indexada es una invitación a probar correos.
 *
 * Deliberadamente austero. El sistema de componentes es de FU-10 y este grupo
 * llega antes: lo que hay aquí son los tokens de FU-02 y HTML nativo. Un
 * formulario de acceso que necesita JavaScript para enviarse es un formulario
 * que falla en el peor momento.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "26rem" }}>{children}</div>
    </main>
  );
}
