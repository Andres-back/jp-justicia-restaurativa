# Bibliotecas y datos de terceros del kit común (10/11/2026)

Copias locales para que los recursos funcionen sin CDN y también con `file://`. Nada de esta carpeta se edita a mano: si se actualiza, se reemplaza el archivo completo y se anota aquí.

## Leaflet 1.9.4 (`leaflet/`)
- **Qué es:** biblioteca de mapas interactivos en JavaScript (zoom, desplazamiento, marcadores y capas vectoriales).
- **Origen:** paquete oficial `leaflet@1.9.4` (archivos `dist/leaflet.js` y `dist/leaflet.css`), descargado el 10/11/2026 con autorización de Esteban.
- **Licencia:** BSD de 2 cláusulas. El texto está en `leaflet/LICENSE.txt` y el encabezado de copyright de `leaflet.js` se conserva («(c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade»).
- **Comprobación (SHA-256):**
  - `leaflet.js`: `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a`;
  - `leaflet.css`: `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6`.
  Coinciden con los valores de integridad (SRI) publicados para la 1.9.4.
- **Sin imágenes:** no se copió la carpeta `images/` de Leaflet. Los recursos usan marcadores propios (`L.divIcon`) y no usan el control de capas, así que esas imágenes no se piden.
- **Dónde se usa:** `u2-dimension-territorial` (mapa de Colombia con los tres territorios).

## Contorno de Colombia (`colombia-ne110m.geojson` y `colombia-ne110m.js`)
- **Origen:** Natural Earth, «Admin 0 – Countries», escala 1:110m (`ne_110m_admin_0_countries.geojson`), descargado el 10/11/2026 con autorización de Esteban.
- **Licencia:** dominio público (condiciones de uso de Natural Earth). Se cita como «Natural Earth» por cortesía.
- **Extracción:** solo la entidad con `ADM0_A3 == "COL"`: un polígono de 100 puntos, en longitud y latitud (WGS 84), redondeados a 3 decimales. Extensión: longitud −78,991 a −66,876; latitud −4,298 a 12,437.
- **Alcance:** es el contorno general del país a escala 1:110m. A esta escala no aparecen las islas pequeñas (San Andrés y Providencia). No es la cartografía oficial del IGAC; si la Fiscalía la exige, se reemplaza este archivo por la geometría oficial con el mismo formato.
- **Dos formatos, los mismos datos:**
  - `colombia-ne110m.geojson`: el dato de referencia;
  - `colombia-ne110m.js`: la misma colección asignada a `window.COLOMBIA_NE110M`, para cargarla con `<script>` también desde `file://`, donde el navegador no deja leer archivos con `fetch`.
- **Dónde se usa:**
  - `u2-dimension-territorial`: contorno del país sobre las teselas y mapa de respaldo cuando las teselas no cargan;
  - `u2-extraccion-ilicita`: silueta del ícono «Impacto en el territorio nacional».
