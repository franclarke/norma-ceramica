# Norma · cerámica

La página de la tía Norma: una pared de su taller donde cuelga sus piezas como **tablillas de prueba de esmalte**, cada una con su número grabado en el barro. Norma la actualiza **desde WhatsApp**, conversando, sin aprender nada nuevo.

- **Página:** https://norma-ceramica.vercel.app
- **Simulador (hacé de Norma):** https://norma-ceramica.vercel.app/simulador

Respuesta al [challenge de Goncy](https://x.com/goncy/status/2120275311028011449).

## Cómo funciona

**Para los compradores** (gente de ~70, en el celular): una sola página, letra grande, contraste alto y nada de carrito, botones raros ni popups. Cada pieza tiene foto, nombre, precio y un **numerito**. Para pedir una, le escriben a Norma y le dicen el número, como dice la página: *"¿Te gustó alguna? Escribime y contame cuál. Cada pieza tiene su numerito, así no nos confundimos."* Al final hay una lista en texto llano por si es más fácil.

**Para Norma**, que no tiene compu ni mail y solo usa WhatsApp: le escribe a un contacto que se llama "Mi página".

| Quiere… | Le escribe |
|---|---|
| Agregar una pieza | Una foto, y si quiere el nombre y el precio abajo ("Jarra blanca 12000"). Si no, el bot se los pregunta de a uno. |
| Sacar una vendida | "vendí la 14" |
| Cambiar un precio | "la 14 ahora sale 9 mil" |
| Cambiar una foto | La foto nueva con el número abajo ("la 14") |
| Volver a poner una | "volví a tener la 14" |
| Arreglar un error | "deshacer" o "me equivoqué" |
| Ver qué tiene | "lista" |

Cada cambio se confirma con botones grandes ("Sí, publicar", "Cambiar algo", "Cancelar") y una vista previa de cómo va a quedar. Entiende precios como los escribe cualquiera: "12 mil", "12.000", "$12000", "doce mil", "15 lucas". Si la foto salió oscura, se lo avisa. Los números de pieza no se reutilizan nunca.

No usa IA: el bot es determinístico, así cada respuesta es predecible y siempre pasa por una confirmación.

## Probarlo

`/simulador` tiene a la izquierda el WhatsApp de Norma y a la derecha su página en el celular de un comprador. Cada visitante recibe **su propia tienda de prueba**, así nadie rompe la página real. Hay fotos de ejemplo y se puede subir una propia. El simulador usa exactamente el mismo motor que el webhook de WhatsApp real.

## Stack

- **Next.js 16** (App Router, Cache Components) en **Vercel**.
- **Vercel Blob** para fotos y datos. Cada guardado es una versión nueva e inmutable, porque sobrescribir el mismo archivo devolvía lecturas viejas durante minutos.
- La página de Norma se cachea con `'use cache: remote'` y un tag que se invalida cuando ella cambia algo.
- **WhatsApp Cloud API** (`/api/whatsapp`): webhook con verificación de firma, botones interactivos, descarga de fotos y deduplicación de reintentos. Ver [docs/whatsapp.md](docs/whatsapp.md).
- `sharp` endereza, achica y mide la luz de las fotos de Norma.
- Tests del bot con Vitest: `npm test`.

## Diseño

La dirección visual salió de explorar tres mundos con composiciones generadas (una lámina escolar, un sobre de molde de costura y las tablillas de esmalte) y quedarse con el que mejor contaba el producto: los ceramistas numeran sus pruebas de esmalte grabando el número en el barro, igual que el "numerito" de Norma. Todo el proceso está en [`assets/`](assets/README.md) y [`.impeccable/`](.impeccable/).

- Fondo de esmalte cobalto, con el texto blanco a más de 8:1 de contraste en cualquier punto del esmalte.
- Tipografía **Atkinson Hyperlegible Next**, del Braille Institute, pensada para baja visión.
- Logo y subrayado a pincel.
- Las tablillas se hamacan sobre su clavo cuando las tocás.

Fotos de ejemplo: Unsplash y Pexels ([créditos](assets/photos/CREDITS.md)). Nombres y precios inventados.

## Desarrollo

```bash
npm install
npm run dev     # usa almacenamiento local en .data/ (STORAGE=fs en .env.development.local)
npm test
```

Variables de entorno: `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NORMA_CONTACT_PHONE`, `CRON_SECRET`, y las de WhatsApp de [docs/whatsapp.md](docs/whatsapp.md).
