---
name: Norma · cerámica
description: La pared esmaltada del taller donde Norma cuelga sus tablillas de prueba, cada una con su número grabado en el barro.
colors:
  cobalt: "#0b1a6e"
  cobalt-deep: "#071150"
  glaze-white: "#ffffff"
  glaze-soft: "#dfe5ff"
  glaze-line: "rgb(223 229 255 / 0.28)"
  bisque: "#d9bd93"
  clay-ink: "#2b1a0e"
  clay-groove: "#4a2c17"
  amber: "#ffd36e"
  amber-ink: "#1b1200"
typography:
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.6vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3rem + 0.8vw, 1.85rem)"
    fontWeight: 800
    lineHeight: 1.2
  lead:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3rem + 0.8vw, 1.85rem)"
    fontWeight: 400
    lineHeight: 1.35
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.15rem + 0.4vw, 1.4rem)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.3
  tile-number:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 13.5cqw, 4.2rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  tile-price:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.4rem, 7.8cqw, 2rem)"
    fontWeight: 800
    lineHeight: 1.1
    fontFeature: "tnum"
  tile-title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.12rem, 6.2cqw, 1.6rem)"
    fontWeight: 700
    lineHeight: 1.06
rounded:
  window: "4px"
  focus: "6px"
  pill: "999px"
  device: "38px"
spacing:
  gutter: "clamp(16px, 4.5vw, 56px)"
  intro-gap: "22px"
  tile-row-gap: "clamp(40px, 6vw, 56px)"
  tile-col-gap: "clamp(24px, 3vw, 40px)"
  section-break: "clamp(56px, 9vw, 96px)"
components:
  tab:
    textColor: "{colors.glaze-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "48px"
  tab-selected:
    backgroundColor: "{colors.glaze-white}"
    textColor: "{colors.cobalt-deep}"
    rounded: "{rounded.pill}"
  tile-label:
    backgroundColor: "{colors.bisque}"
    textColor: "{colors.clay-ink}"
  tile-window:
    rounded: "{rounded.window}"
  phone-number:
    textColor: "{colors.glaze-white}"
    typography: "{typography.title}"
  badge-flash:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Norma · cerámica

## Overview

**Creative North Star: "La pared del taller"**

La página es la pared de esmalte cobalto del taller de Norma, y cada pieza es una tablilla de prueba de gres colgada de un clavo: arriba el esmalte (celadón, rojo hierro, shino o ceniza) con la foto embutida como una ventanita, abajo la franja de barro crudo donde el número está grabado, hundido, al lado del nombre y el precio. Los materiales son raster reales (`public/plates/`), no dibujos de vector: el cobalto es una textura que repite, las tablillas son losas fotográficas, y el logo y el trazo de pincel son máscaras que se pintan con el color del tema.

Está pensada para compradores de unos 70 años en el celular. Por eso todo es grande, en una sola familia tipográfica hiperlegible, con contraste alto y números enormes; la decoración nunca le compite a la lectura. Rechaza la grilla de tienda (card blanca, foto, título, botón) y el crema-serif-terracota genérico.

**Key Characteristics:**
- Fondo de esmalte cobalto texturado, texto blanco y blanco-esmalte.
- Tablillas levemente torcidas sobre su clavo que se hamacan al tocarlas.
- Número grabado en barro crudo como dato principal de cada pieza.
- Una sola tipografía (Atkinson Hyperlegible Next) en 400, 700 y 800.
- Un dorso en texto llano: la misma lista como tabla, por si es más fácil.

## Colors

Un mundo de dos materiales: esmalte cobalto profundo para el fondo y barro crudo para las etiquetas, con un único acento ámbar reservado para foco y novedad.

### Primary
- **Esmalte Cobalto** (cobalt): el color del fondo bajo la textura `glaze-cobalt.webp` (720px, repetida) y el `theme-color` del navegador. Todo el texto del mundo se lee sobre él.
- **Cobalto de Horno** (cobalt-deep): el fondo del `html` (se ve en el overscroll) y el texto sobre la pestaña seleccionada.

### Secondary
- **Ámbar de Foco** (amber): anillo de foco (3px, offset 4px), selección de texto y el aviso de "cambió" en el simulador. Nunca decorativo.
- **Tinta Ámbar** (amber-ink): texto sobre ámbar (13.1:1).

### Neutral
- **Blanco Esmalte** (glaze-white): texto principal, logo y trazo de pincel. 15.1:1 sobre cobalto.
- **Esmalte Lavado** (glaze-soft): texto secundario (fecha, explicación, encabezados de tabla, pie). 12.1:1 sobre cobalto.
- **Línea de Esmalte** (glaze-line): filetes de la tabla y separador del bloque de contacto (1–2px).
- **Bizcocho** (bisque): referencia del barro crudo de las losas; la franja real es raster, el token fija contra qué se mide el contraste.
- **Tinta de Barro** (clay-ink): nombre y precio sobre el barro, 9.3:1.
- **Surco** (clay-groove): el número grabado, 7.0:1 sobre el barro.

### Named Rules
**The Un Solo Acento Rule.** El ámbar significa "acá estás" o "esto cambió": foco, selección, aviso. Si no es estado, no es ámbar.

**The Esmalte Real Rule.** El cobalto, las tablillas y el barro vienen de las plates raster. No se reemplazan por degradés ni por colores planos que imiten el material.

## Typography

**Body Font:** Atkinson Hyperlegible Next (vía `next/font`, pesos 400/700/800; con system-ui, sans-serif)

**Character:** Una sola familia, diseñada para baja visión; la jerarquía sale de tamaño y peso, nunca de una segunda tipografía. El logo no es tipografía: es una máscara a pincel.

### Hierarchy
- **Headline** (800, `--step-2`, 1.08, -0.015em): el título del simulador. En celular baja a 1.75rem.
- **Title** (800, `--step-1`, 1.2): "¿Te gustó alguna?", el teléfono, el título de la lista.
- **Lead** (400, `--step-1`, 1.35): el saludo de Norma, `text-wrap: pretty`.
- **Body** (400, `--step-0` = 20–22px, 1.5): todo el texto corrido y la tabla; máximo 34–44rem de ancho.
- **Label** (700, 1.05rem): pestañas, leyendas. La fecha y el pie usan 400 a 1.05rem/1rem en glaze-soft.
- **Número de tablilla** (800, clamp(2.4rem, 13.5cqw, 4.2rem), 1, -0.03em, tabular): el dato más grande de la pieza.
- **Precio** (800, clamp(1.4rem, 7.8cqw, 2rem), tabular) y **nombre** (700, clamp(1.12rem, 6.2cqw, 1.6rem), 1.06, máximo 2 líneas, balance).

### Named Rules
**The Números Enormes Rule.** El número y el precio de cada pieza son siempre más grandes que su nombre, y siempre en cifras tabulares.

**The Piso de 1rem Rule.** En el mundo de Norma nada baja de 1rem (16px), y el cuerpo nunca de 1.25rem (20px).

## Layout

Una pared, no una grilla de tienda. Margen lateral `--gutter` (clamp(16px, 4.5vw, 56px)).

- **Celular (<640px):** una columna. Logo (min(78vw, 360px)), saludo, bloque de contacto con el teléfono, fecha; la primera tablilla asoma en la primera pantalla.
- **≥640px:** tablillas en 2 columnas.
- **≥1024px:** columna izquierda de clamp(360px, 31vw, 470px) con el encabezado `sticky` (top 48px); la pared a la derecha.
- **≥1360px:** 3 columnas de tablillas.
- Espacio entre tablillas: clamp(40px, 6vw, 56px) vertical, clamp(24px, 3vw, 40px) horizontal (el vertical es mayor: hay lugar para que se hamaquen). El dorso arranca a clamp(56px, 9vw, 96px) y el pie a 56px.
- **Simulador:** máximo 1180px centrado; dos celulares lado a lado desde 1024px, una pestaña "chat / página" debajo.

## Elevation & Depth

La profundidad es física: las tablillas cuelgan delante de la pared y la foto está hundida en el esmalte. No hay sombras de interfaz.

### Shadow Vocabulary
- **Tablilla colgada** (`filter: drop-shadow(0 14px 14px rgb(2 6 40 / 0.55)) drop-shadow(0 2px 3px rgb(2 6 40 / 0.45))`): sigue la silueta irregular de la losa.
- **Ventana hundida** (`box-shadow: inset 0 3px 8px rgb(20 10 0 / 0.45), inset 0 -1px 2px rgb(255 255 255 / 0.25)` más un borde `0 0 0 2px rgb(255 255 255 / 0.18)`): la foto embutida.
- **Grabado** (`text-shadow: 0 1.5px 0 rgb(255 240 215 / 0.6), 0 -1px 1px rgb(40 20 5 / 0.45)`): número hundido en el barro; el surco separador usa el mismo par de luz y sombra.
- **Celular del simulador** (`box-shadow: 0 30px 50px -20px rgb(0 0 20 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.08)`).

### Named Rules
**The Luz de Arriba Rule.** Toda sombra cae hacia abajo y todo grabado tiene su brillo debajo: una sola luz, cenital, en toda la pared.

## Shapes

Las siluetas las ponen las losas raster (bordes irregulares, proporción 1 / 1.14, con la franja de barro siempre en el 30% inferior). La interfaz casi no redondea: ventana de foto 4px, anillo de foco 6px. Las píldoras (999px) quedan para controles del simulador. Cada tablilla rota `--tilt` (entre -0.8° y +0.8°, fijo por número de pieza) desde su clavo (`transform-origin: 50% 1.5%`).

## Components

### Tablilla (componente firma)
- **Estructura:** losa raster (`tile-{celadon|ironred|shino|ash}.webp`, elegida por número de pieza) a 100% × 100%; foto en ventana (9.5% laterales, 10.5% arriba, 34.5% abajo); franja de etiqueta (6.5% / 6% laterales, 4.5% abajo, 25.5% de alto) con número, surco de 3px y, al lado, nombre y precio.
- **Tamaños:** usa `container-type: inline-size`; número, nombre y precio escalan en `cqw`.
- **Accesibilidad:** el `article` lleva todo en el `aria-label` ("Pieza número N: nombre, precio"); la etiqueta visual es `aria-hidden`.
- **Movimiento:** la tablilla se hamaca sobre su clavo. Keyframes `swing`, 1.8s, `cubic-bezier(0.22, 1, 0.36, 1)`: rotación base, +3.2°, -2.2°, +1.3°, -0.7°, +0.3°, base (en 0/14/32/50/68/84/100%). Se dispara con `:hover` sólo si `(hover: hover)`, y con `:active` y `:focus-within` en táctil. Es un adorno: nada depende de él.

### Teléfono con trazo de pincel
- Title (800) en blanco, `nowrap`, tabular; debajo un trazo de pincel (`stroke.webp` como máscara, 14px de alto, 92% de opacidad) que se pasa un poco de los bordes (-4% / -6%).
- El bloque de contacto aparece dos veces: en el encabezado y después de la lista. Separador superior de 2px en glaze-line.

### Lista en texto llano (el dorso)
- Tabla de ancho completo hasta 40rem, cuerpo a `--step-0`, tabular. Encabezados 1rem/700 en glaze-soft con filete de 2px; filas de 10px de alto de padding con filete de 1px. Número en 800, precio a la derecha en 700.

### Pestañas del simulador
- Carril píldora `rgb(4 10 50 / 0.55)` con borde interno de glaze-line; botones de 48px de alto mínimo. Seleccionada: blanco esmalte con texto cobalt-deep. Un punto ámbar de 10px marca "cambió". Sólo en <1024px.

### Aviso "cambió"
- Píldora ámbar, 0.9rem/800, entra con `flash` (2.4s, `cubic-bezier(0.16, 1, 0.3, 1)`: escala 0.6 → 1.08 → 1).

### Logo
- `logo.webp` como máscara (`.brush`), pintado con `currentColor` en blanco esmalte; proporción 1024 / 365. En el `h1`, con el nombre real en `sr-only`.

### Chat de WhatsApp (excepción autorizada)
El chat del simulador usa los colores reales de WhatsApp a propósito, para que quien lo evalúa lo reconozca al instante. **No son parte de la paleta de la marca** y no se usan fuera del marco del celular: encabezado #008069, fondo del hilo #efeae2, burbuja recibida #fff, enviada #d9fdd3, texto #111b21, metadatos #667781, tildes leídas #53bdeb, aviso del sistema #fff6c5, barra de escritura #f0f2f5. Burbujas de 8px de radio con la esquina del lado del emisor en 0, mensajes que entran con `pop` (0.32s), hojas que suben con `rise` (0.35s). Íconos SVG de Lucide. El encabezado y el avatar sí llevan el logo de Norma sobre cobalto.

## Do's and Don'ts

### Do:
- **Do** mantener el texto principal en glaze-white (15.1:1) y el secundario en glaze-soft (12.1:1) sobre cobalto; sobre barro, clay-ink (9.3:1) y clay-groove (7.0:1). Mínimo AA 4.5:1 para cualquier texto nuevo, apuntando a 7:1.
- **Do** usar `--step-0` (20–22px) para el cuerpo y nunca menos de 1rem para texto del mundo de Norma.
- **Do** dar a todo control al menos 48px de alto y foco visible ámbar (3px, offset 4px).
- **Do** que toda acción y todo dato funcione sin hover: el hover sólo agrega el balanceo, que también responde al toque.
- **Do** cortar todo movimiento con `prefers-reduced-motion: reduce` (animaciones y transiciones en `none`); las tablillas quedan quietas en su inclinación.
- **Do** producir plates nuevas con `assets/scripts/plates.mjs`: losas de 720 × 821 con la franja de barro en el 30% inferior, cobalto espejado 2×2 para repetir sin costura.
- **Do** escribir en castellano rioplatense, con la voz de Norma.

### Don't:
- **Don't** volver a la grilla de tienda: card blanca, foto, título, botón.
- **Don't** usar crema, serif y terracota como identidad.
- **Don't** usar una segunda tipografía ni un peso menor a 400.
- **Don't** usar los verdes y beiges de WhatsApp fuera del marco del chat del simulador.
- **Don't** poner el número o el precio de una pieza como imagen: siempre texto real.
- **Don't** marcar estado sólo con color: también con forma (punto, píldora, pestaña llena).
