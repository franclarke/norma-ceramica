# Assets: dirección de arte

Todo tiene que parecer hecho por Norma: una profesora de plástica jubilada de 70 años que hace cerámica.
Mano experta y suelta, trabaja rápido y no se preocupa por la perfección.

## Reglas

- **Un solo material:** tinta china con pincel redondo gastado. Trazos con presión variable, pincel seco donde se acaba la tinta, bordes irregulares y formas que no cierran del todo.
- **Dos tintas:** negro tinta (trazos, logo, dibujos) y terracota (los sellos con el número de cada pieza).
- **Fondo blanco plano** en los originales, para sacar la tinta limpia. La textura de papel va aparte.
- **La decoración nunca tapa ni compite con la lectura.** El número de cada pieza es texto real (Atkinson Hyperlegible) dentro de un sello dibujado, nunca una imagen.
- **Si algo se nota "de IA"** (simetría perfecta, curvas de vector, letras que parecen tipografía), se descarta y se dibuja a mano.

## Proceso

1. `prompts/*.md`: un prompt por hoja, generado con Codex CLI (`image_generation`).
2. `raw/`: las hojas tal como salen, sin tocar.
3. `node scripts/extract.mjs`: pasa el blanco a transparencia (algoritmo *color to alpha*) y recorta cada dibujo suelto.
4. `out/`: PNG/WebP transparentes listos para usar como `mask-image`, así se pintan con los colores del tema por CSS.
