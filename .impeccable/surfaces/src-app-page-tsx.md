---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Tienda pública de Norma (/)

Modo: Experience. Visitantes: compradores de ~70 años en el celular; evaluador en escritorio. Tarea: ver piezas, precio y número, y saber cómo pedir (escribirle a Norma con el número). Sin carrito ni link de WhatsApp (respeta el boceto de Norma).

Comps: decisión en .impeccable/mocks/decision/ (a-lamina, b-tablillas, c-molde). Elegida b-tablillas; composición aprobada (elección delegada por el usuario): .impeccable/mocks/b2-mobile.png (mobile) + .impeccable/mocks/b3-desktop.png (escritorio).

## Direction contract

THESIS: La página es la pared del taller donde Norma cuelga sus tablillas de prueba de esmalte: cada pieza es una tablilla con su número grabado en el barro. Rechaza la grilla de tienda (card blanca, foto, título, botón) y el crema-serif-terracota de la IA.

OWN-WORLD: Fondo de esmalte cobalto real (textura), texto blanco y blanco-esmalte. Tablillas de gres con esmaltes celadón, rojo hierro, shino y ceniza, colgadas de un clavo, con franja de barro crudo. Números grabados (hundidos) en el barro, Atkinson Hyperlegible Next. Logo a pincel en blanco. Un único trazo de pincel blanco subraya el teléfono.

STORY: Ve en segundos quién es Norma, que cada pieza tiene número y precio, y que para pedir le escribe con el número.

FIRST VIEWPORT: Mobile: logo a pincel arriba a la izquierda, saludo de Norma en 1.4rem, bloque "¿Te gustó alguna?" con el teléfono grande subrayado a pincel, y la primera tablilla ya asomando (foto grande, número grabado ~3rem, nombre y precio ≥1.25rem). Escritorio: columna izquierda fija con logo, saludo y teléfono; a la derecha la pared de tablillas en 3 columnas, ligeramente torcidas sobre sus clavos.

FORM: tablillas de prueba de esmalte (candidato 1 de 7 en la lista propia, IMPECCABLE'S PICK), seed:e1d86e7a1deaa8a5. Préstamos: de la lámina, compromiso total con números y precios enormes; del molde, una lista de precios en texto llano al final; del jackfield, el estado se marca con forma y no con color. Interacción firma: la tablilla se balancea sobre su clavo al tocarla o al pasar el mouse (amortiguado, sin movimiento con prefers-reduced-motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
