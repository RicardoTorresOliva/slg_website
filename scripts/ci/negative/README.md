# Fixtures negativos de FU-05

Archivos **rotos a propósito**. Su única razón de ser es que los frenos de CI los
encuentren cuando `verify-brakes.ts` les apunta aquí (FU-05 criterio 5, R-26):
*un script que nunca se ha visto en rojo no se acepta como gate verde*.

- **Ninguna credencial de aquí es real.** Son cadenas sintéticas que solo imitan
  la FORMA de un secreto, que es lo que el escáner reconoce.
- `scripts/ci/check-secrets.ts` salta el directorio `negative/` en su barrido
  normal, y `.gitleaks.toml` lo excluye también. Si no lo hicieran, el gate
  estaría permanentemente rojo contra su propio material de prueba.
