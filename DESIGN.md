---
name: Norma · cerámica
description: La pared esmaltada del taller donde Norma cuelga sus tablillas de prueba, cada una con su número en el barro.
colors:
  cobalt: "#0e2189"
  cobalt-deep: "#091862"
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
  phone:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.6rem + 1.6vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "0.01em"
    fontFeature: "tnum"
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
    fontSize: "clamp(2.8rem, 15cqw, 4.4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  tile-price:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.55rem, 8.5cqw, 2.1rem)"
    fontWeight: 800
    lineHeight: 1.1
    fontFeature: "tnum"
  tile-title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 7cqw, 1.7rem)"
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
    typography: "{typography.phone}"
  button-amber:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "44px"
  badge-flash:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Norma · cerámica

## Overview

**Creative North Star: "La pared del taller"**

La página es la pared de esmalte cobalto del taller de Norma, y cada pieza es una tablilla de prueba de gres colgada de un clavo: arriba el esmalte (celadón, rojo hierro, shino o ceniza) con la foto embutida como una ventanita, abajo la franja de barro crudo con el número de la pieza en tinta de sello, al lado del nombre y el precio. Los materiales son raster reales (`public/plates/`), no dibujos de vector: el cobalto es una textura craquelada con brillo suave que repite, las tablillas son losas fotográficas, y el logo (sólo la palabra a pincel) y el trazo de pincel son máscaras que se pintan con el color del tema.

Está pensada para compradores de unos 70 años en el celular. Por eso todo es grande, en una sola familia tipográfica hiperlegible, con contraste alto y números enormes; la decoración nunca le compite a la lectura. Rechaza la grilla de tienda (card blanca, foto, título, botón) y el crema-serif-terracota genérico.

**Key Characteristics:**
- Fondo de esmalte cobalto craquelado, con rango tonal comprimido para que el texto blanco nunca baje de 7:1.
- Tablillas verticales, levemente torcidas sobre su clavo, que se hamacan al tocarlas.
- Número de pieza en tinta de barro como dato principal de cada tablilla.
- Una sola tipografía (Atkinson Hyperlegible Next) en 400, 700 y 800.
- Un dorso en texto llano: la misma lista como tabla, por si es más fácil.

## Colors

Un mundo de dos materiales: esmalte cobalto profundo para el fondo y barro crudo para las etiquetas, con un único acento ámbar reservado para foco, novedad y la acción de ver el cambio.

### Primary
- **Esmalte Cobalto** (cobalt): color base bajo la textura `glaze-cobalt.webp` (una sola imagen de 1600px, fija detrás del contenido con `body::before`, sin mosaico) y `theme-color` del navegador. Contra el color plano, el blanco da 13.1:1; contra la textura, 8.6:1 en su punto más claro.
- **Cobalto de Horno** (cobalt-deep): fondo del `html` (se ve en el overscroll) y texto sobre la pestaña seleccionada (15.9:1 sobre blanco).

### Secondary
- **Ámbar de Foco** (amber): anillo de foco (3px, offset 4px), selección de texto, aviso "cambió" y el botón "Ver cómo quedó la página". Nunca decorativo.
- **Tinta Ámbar** (amber-ink): texto sobre ámbar (13.1:1).

### Neutral
- **Blanco Esmalte** (glaze-white): texto principal, logo y trazo de pincel.
- **Esmalte Lavado** (glaze-soft): texto secundario (fecha, explicación, encabezados de tabla, pie). 10.5:1 sobre el cobalto plano, no menos de 6:1 en el punto más claro de la textura.
- **Línea de Esmalte** (glaze-line): filetes de la tabla y separador del bloque de contacto (1–2px).
- **Bizcocho** (bisque): referencia del barro crudo de las losas; la franja real es raster, el token fija contra qué se mide el contraste.
- **Tinta de Barro** (clay-ink): nombre y precio sobre el barro, 9.3:1.
- **Tinta de Sello** (clay-groove): el número de pieza, 7.0:1 sobre el barro.

### Named Rules
**The Un Solo Acento Rule.** El ámbar significa "acá estás", "esto cambió" o "mirá el cambio": foco, selección, aviso y su botón. Si no es estado, no es ámbar.

**The Esmalte Real Rule.** El cobalto, las tablillas y el barro vienen de las plates raster. No se reemplazan por degradés ni por colores planos que imiten el material, y una plate nueva de fondo tiene que dejar el texto blanco por encima de 7:1 en su punto más claro.

## Typography

**Body Font:** Atkinson Hyperlegible Next (vía `next/font`, pesos 400/700/800; con system-ui, sans-serif)

**Character:** Una sola familia, diseñada para baja visión; la jerarquía sale de tamaño y peso, nunca de una segunda tipografía. El logo no es tipografía: es una palabra a pincel usada como máscara.

### Hierarchy
- **Headline** (800, `--step-2`, 1.08, -0.015em): el título del simulador. En celular baja a 1.75rem.
- **Teléfono** (800, `--step-2`, 1.15, tabular): en su propia línea, subrayado a pincel.
- **Title** (800, `--step-1`, 1.2): "¿Te gustó alguna?" y el título de la lista.
- **Lead** (400, `--step-1`, 1.35): el saludo de Norma, `text-wrap: pretty`.
- **Body** (400, `--step-0` = 20–22px, 1.5): texto corrido, tabla y sus encabezados, fecha de actualización y pie. Ancho máximo de 34–44rem.
- **Label** (700, 1.05rem): pestañas y leyendas del simulador.
- **Número de tablilla** (800, `clamp(2.8rem, 15cqw, 4.4rem)`, 1, -0.03em, tabular): el dato más grande de la pieza, tinta plana sin relieve simulado.
- **Precio** (800, `clamp(1.55rem, 8.5cqw, 2.1rem)`, tabular) y **nombre** (700, `clamp(1.3rem, 7cqw, 1.7rem)`, 1.06, `text-wrap: balance`, corte de seguridad a 3 líneas).

### Named Rules
**The Números Enormes Rule.** El número y el precio de cada pieza son siempre más grandes que su nombre, y siempre en cifras tabulares.

**The Piso de Cuerpo Rule.** En el mundo de Norma el texto que se lee va a `--step-0` (20px como mínimo), los datos de la tablilla no bajan de 1.3rem y nada baja de 1rem.

## Layout

Una pared, no una grilla de tienda. Margen lateral `--gutter`.

- **Celular (<640px):** una columna. Logo (min(62vw, 270px), proporción 698 / 333), saludo, bloque de contacto con el teléfono en su propia línea, fecha; la primera tablilla asoma en la primera pantalla. Las tablillas siguen verticales en celular: la variante apaisada se descartó porque achicaba la foto de la pieza.
- **≥640px:** tablillas en 2 columnas.
- **≥1024px:** columna izquierda de clamp(330px, 26vw, 420px) con el encabezado `sticky` (top 48px) y el logo a min(100%, 280px); la pared a la derecha, todavía en 2 columnas.
- **≥1360px:** 3 columnas de tablillas.
- Espacio entre tablillas: `tile-row-gap` vertical y `tile-col-gap` horizontal (el vertical es mayor: hay lugar para que se hamaquen). El dorso arranca a `section-break` y el pie a 56px.
- **Simulador:** máximo 1180px centrado; dos celulares lado a lado desde 1024px. Debajo de eso, una pestaña "chat / página" y el botón ámbar "Ver cómo quedó la página" dentro del hilo cuando hay un cambio.

## Elevation & Depth

La profundidad es física: las tablillas cuelgan delante de la pared y la foto está embutida en el esmalte. El número de pieza es tinta sobre el barro, plano. No hay sombras de interfaz en el mundo de Norma.

### Shadow Vocabulary
- **Tablilla colgada** (`filter: drop-shadow(0 14px 14px rgb(2 6 40 / 0.55)) drop-shadow(0 2px 3px rgb(2 6 40 / 0.45))`): sigue la silueta irregular de la losa.
- **Ventana embutida** (`box-shadow: inset 0 3px 8px rgb(20 10 0 / 0.45), inset 0 -1px 2px rgb(255 255 255 / 0.25)` más un borde `0 0 0 2px rgb(255 255 255 / 0.18)`): la foto metida en el esmalte.
- **Celular del simulador** (`box-shadow: 0 30px 50px -20px rgb(0 0 20 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.08)`).
- **Botón ámbar** (`box-shadow: 0 2px 6px rgb(0 0 0 / 0.18)`): lo despega apenas del fondo del chat.

### Named Rules
**The Luz de Arriba Rule.** Toda sombra cae hacia abajo: una sola luz, cenital, en toda la pared.

## Shapes

Las siluetas las ponen las losas raster: bordes irregulares, proporción 1 / 1.14 (720 × 821), con el barro crudo siempre en el 30% inferior para que el texto nunca pise el esmalte. La interfaz casi no redondea: ventana de la foto 4px, anillo de foco 6px. Las píldoras (999px) quedan para controles del simulador. Cada tablilla rota `--tilt` (entre -0.8° y +0.8°, fijo por número de pieza) desde su clavo (`transform-origin: 50% 1.5%`).

## Components

### Tablilla (componente firma)
- **Estructura:** losa raster (`tile-{celadon|ironred|shino|ash}.webp`, elegida por número de pieza) a 100% × 100%. Foto en ventana: 9.5% a los costados, 10.5% arriba, 34.5% abajo. Franja de etiqueta: 6.5% / 6% a los costados, 4.5% abajo, 25.5% de alto, con el contenido centrado en vertical: número, filete de 2px (`rgb(74 44 23 / 0.4)`, margen vertical del 8%) y, al lado, nombre y precio.
- **Tamaños:** usa `container-type: inline-size`; número, nombre y precio escalan en `cqw`.
- **Accesibilidad:** el `article` lleva todo en el `aria-label` ("Pieza número N: nombre, precio"); la etiqueta visual es `aria-hidden`.
- **Movimiento:** la tablilla se hamaca sobre su clavo. Keyframes `swing`, 1.8s, `cubic-bezier(0.22, 1, 0.36, 1)`: rotación base, +3.2°, -2.2°, +1.3°, -0.7°, +0.3°, base (en 0/14/32/50/68/84/100%). Se dispara con `:hover` sólo si `(hover: hover)`, y con `:active` y `:focus-within` en táctil. Es un adorno: nada depende de él.

### Teléfono con trazo de pincel
- `--step-2` en 800, en blanco, en su propia línea (`display: block; width: fit-content`), tabular. Debajo, un trazo de pincel (`stroke.webp` como máscara, 16px de alto, 92% de opacidad) que se pasa un poco de los bordes (-4% / -6%).
- El bloque de contacto aparece dos veces: en el encabezado y después de la lista. Separador superior de 2px en glaze-line.

### Lista en texto llano (el dorso)
- Tabla a todo el ancho hasta 40rem, cuerpo y encabezados a `--step-0`, tabular. Encabezados en 700 y glaze-soft, con filete de 2px; filas con 10px de padding vertical y filete de 1px. Número en 800, precio a la derecha en 700.

### Pestañas del simulador
- Carril píldora `rgb(4 10 50 / 0.55)` con borde interno de glaze-line; botones de 48px de alto mínimo. Seleccionada: blanco esmalte con texto cobalt-deep. Un punto ámbar de 10px marca "cambió". Sólo en <1024px.

### Botón "Ver cómo quedó la página"
- Píldora ámbar, 1rem/800, texto amber-ink, 44px de alto mínimo, padding 8px 18px. Aparece en el hilo después de un cambio y lleva a la pestaña de la página. Sólo en <1024px, donde las dos pantallas no se ven a la vez.

### Aviso "cambió"
- Píldora ámbar, 1rem/800, entra con `flash` (2.4s, `cubic-bezier(0.16, 1, 0.3, 1)`: escala 0.6 → 1.08 → 1).

### Logo
- `logo.webp` como máscara (`.brush`): sólo la palabra a pincel, proporción 698 / 333, pintada con `currentColor` en blanco esmalte. En el `h1`, con el nombre real en `sr-only`. En el simulador vuelve al inicio (clamp(120px, 16vw, 190px)).

### Chat de WhatsApp (excepción autorizada)
El chat del simulador usa los colores reales de WhatsApp a propósito, para que quien lo evalúa lo reconozca al instante. **No son parte de la paleta de la marca** y no se usan fuera del marco del celular: encabezado #008069, fondo del hilo #efeae2, burbuja recibida #fff, enviada #d9fdd3, texto #111b21, metadatos e íconos #54656f (5.1:1 sobre el hilo), tildes de leído #53bdeb, aviso del sistema #fff6c5, barra de escritura #f0f2f5, borde de sugerencias #b8c1c6.
- Arranca con una burbuja de bienvenida del bot que explica qué escribir.
- Burbujas de 8px de radio con la esquina del lado del emisor en 0; mensajes que entran con `pop` (0.32s) y hojas que suben con `rise` (0.35s).
- Pisos dentro del chat: texto de mensaje 1.05rem, sugerencias 1rem con 44px de alto, botón de reinicio 0.95rem con 44px de alto, controles de redacción de 48px, metadatos 0.8rem.
- Íconos SVG de Lucide. El avatar lleva el logo de Norma sobre cobalto.

## Do's and Don'ts

### Do:
- **Do** mantener el texto principal en glaze-white y el secundario en glaze-soft sobre el cobalto; sobre barro, clay-ink (9.3:1) y clay-groove (7.0:1). Cualquier texto nuevo necesita como mínimo 4.5:1 contra el punto más claro de su fondo, y conviene apuntar a 7:1.
- **Do** usar `--step-0` (20–22px) para todo texto que se lee, incluidas la fecha, el pie y los encabezados de tabla; nada del mundo de Norma baja de 1rem.
- **Do** dar a todo control al menos 44px de alto (48px en el mundo de Norma) y foco visible ámbar (3px, offset 4px).
- **Do** que toda acción y todo dato funcione sin hover: el hover sólo agrega el balanceo, que también responde al toque.
- **Do** cortar todo movimiento con `prefers-reduced-motion: reduce` (animaciones y transiciones en `none`); las tablillas quedan quietas en su inclinación.
- **Do** producir plates nuevas con `assets/scripts/plates.mjs`: losas de 720 × 821 con el barro en el 30% inferior; cobalto con rango tonal comprimido (×0.36 hacia rgb(10 28 140)) en una sola imagen grande: nunca en mosaico, porque las manchas repetidas delatan el empapelado.
- **Do** escribir en castellano rioplatense, con la voz de Norma.

### Don't:
- **Don't** volver a la grilla de tienda: card blanca, foto, título, botón.
- **Don't** usar crema, serif y terracota como identidad.
- **Don't** usar una segunda tipografía.
- **Don't** usar los verdes y beiges de WhatsApp fuera del marco del chat del simulador.
- **Don't** poner el número o el precio de una pieza como imagen: siempre texto real.
- **Don't** marcar estado sólo con color: también con forma (punto, píldora, pestaña llena).

## Agregados después de la revisión

- **Pieza compartida (`/14`).** La página abre con un bloque de la pieza: el título "Te compartieron la pieza Nº 14" (step-1, 800), la misma tablilla del sistema (no una variante), y el pedido en la voz de Norma con el teléfono en negrita. En pantallas de menos de 1024px, la columna de presentación muestra solo el logo, para que la pieza entre en la primera pantalla. Si la pieza ya no está, se dice en una línea y sigue la pared.
- **Imagen de la tablilla (`/api/tablilla/[store]/[n]`, 1200×630).** Se genera con `next/og`: la pared cobalto, la tablilla con su losa y su foto a la izquierda, y a la derecha el logo blanco, "Pieza Nº", el nombre (64px, 800) y el precio (72px, 800). Usa las mismas plates, convertidas a PNG porque Satori no lee WebP, y Atkinson Hyperlegible Next en TTF (`src/assets/fonts`). Es la vista previa de los links y la respuesta "Así quedó en tu página" del bot.
- **Audio en el simulador (excepción WhatsApp).** El micrófono reemplaza al botón de enviar cuando el campo está vacío. Mientras graba, muestra un punto rojo #e53935 que late cada 1,2s, el tiempo en cifras tabulares y dos botones: Cancelar y Mandar. La burbuja de un audio arranca con "Audio · lo que entendí:" en el verde #008069 de WhatsApp, a 0.95rem.
- **Las tablillas son imágenes optimizadas** (`next/image` con `fill`, AVIF y tamaños por pantalla), no fondos CSS. La primera carga con prioridad.
