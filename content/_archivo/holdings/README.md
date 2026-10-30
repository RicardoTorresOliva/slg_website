# Holdings by SLG — archivado (2026-10-29)

Ricardo archivó Holdings by SLG porque distrae la atención del negocio principal
(D-174). Nada de esto se publica: el cargador de contenido no lee `content/_archivo/`.

Para restaurarlo:

1. Mover los cuatro `.md` de aquí a `content/services/{es,en}/` y `content/downloads/{es,en}/`.
2. En `site.config.ts`: volver a poner `servicio("slg-holdings", "Holdings by SLG", "/holdings", "holdings")`
   en `oferta.sueltos`, el bloque `{ id: "holdings", suelto: "slg-holdings", etiqueta: "home.seeHoldings" }`
   en `bloquesDeServicios`, y `"Holdings by SLG"` (más su variante prohibida) en `nomenclatura`.
3. Devolver las claves `nav.holdings` y `home.seeHoldings` a `content/ui/{es,en}.json`, la sección
   «Holdings by SLG» a `inicio.md` / `home.md` / `servicios.md` / `services.md`, y el bloque
   `holdings` a `components/Propuesta.tsx` (la posición N+1 del registro).
