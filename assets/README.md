# Assets: de dónde sale cada imagen

## El mundo final: la pared de tablillas

La página es la pared del taller de Norma. Cada pieza cuelga en una **tablilla de prueba de esmalte**, como las que hacen los ceramistas para probar esmaltes, con el número en la franja de barro crudo.

| Archivo en `public/plates/` | Origen | Proceso |
|---|---|---|
| `glaze-cobalt.webp` | `raw/glaze-cobalt-v2.png` (Codex, prompt `prompts/glaze-cobalt-v2.md`) | Se comprime el rango tonal para que el texto blanco quede siempre por encima de 7:1, y se espeja 2×2 para que repita sin costuras. |
| `tile-{celadon,ironred,shino,ash}.webp` | `raw/tile-*.png` (Codex, `prompts/tile-*.md`) | Fondo negro a transparente con relleno desde los bordes. Se recompone cada tablilla para que el barro sea siempre el 30% inferior y el texto nunca pise el esmalte. |
| `logo.webp`, `stroke.webp` | `raw/logo-v2.png` y `raw/strokes.png` (Codex, pincel y tinta) | Blanco a transparente (`scripts/extract.mjs`). Se usan como `mask-image` y toman el color del tema. Al logo se le sacó la jarrita porque se leía como un "3". |

`node scripts/plates.mjs` regenera todo `public/plates/`.

## Fotos de las piezas

Las fotos son reales, de Unsplash y Pexels, con su licencia verificada en [`photos/CREDITS.md`](photos/CREDITS.md). No hay fotos generadas con IA. Nombres y precios son de ejemplo.

## Exploración (no se usa en la página)

- `prompts/{logo,doodles,strokes,stamps,tape,paper}.md`: la primera exploración, en tinta china sobre papel crema. Se descartó por caer en el look crema de las IAs.
- `prompts/tile-*-wide.md`: tablillas apaisadas para mobile, descartadas porque achicaban la foto de la pieza.
- `lamina.html`: lámina de revisión de esa primera exploración (`node scripts/serve.mjs`).
- Las composiciones de dirección (lámina escolar, sobre de molde, tablillas) están en `.impeccable/mocks/`.

## Herramientas

- `scripts/gen.sh <prompt> [ink]`: genera una hoja con Codex CLI.
- `scripts/comp.sh <prompt.md> <salida.png> [referencias…]`: genera una composición de página.
- `scripts/extract.mjs`: recorta y pasa a transparente las hojas de tinta.
- `scripts/plates.mjs`: produce las plates finales.
