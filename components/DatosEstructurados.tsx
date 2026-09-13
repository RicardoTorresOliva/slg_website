/**
 * `schema.org` en JSON-LD (RNF-17).
 *
 * **`JSON.stringify` y no una plantilla de texto**: un `<` dentro de un valor
 * cerraría el `<script>` y lo que viene detrás se interpretaría como HTML. Se
 * escapa además el cierre de etiqueta, que es el único caso que `stringify` no
 * cubre por sí solo.
 *
 * Lo que va aquí son **hechos verificables**. Los datos estructurados son
 * afirmaciones legibles por máquina, y RF-11 no distingue entre una cifra en
 * una página y una en un `ld+json`.
 */
export function DatosEstructurados({ datos }: { datos: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(datos).replace(/</g, "\\u003c"),
      }}
    />
  );
}
