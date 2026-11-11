# Norma · cerámica

La página de la tía Norma: una pared de su taller donde cuelga sus piezas como **tablillas de prueba de esmalte**, cada una con su número en la franja de barro. Norma la actualiza **desde WhatsApp**, conversando, sin aprender nada nuevo.

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

Cada cambio se confirma con botones grandes ("Sí, publicar", "Cambiar algo", "Cancelar") y una vista previa de cómo va a quedar. Entiende precios como los escribe cualquiera: "12 mil", "12.000", "$12000", "doce mil", "15 lucas". Si la foto salió oscura, se lo avisa. Los números de pieza no se reutilizan nunca. Después de cada cambio le manda **una imagen de cómo quedó la tablilla**, así lo ve sin abrir la página.

### La IA ayuda a Norma, nunca decide por ella

Norma no ve bien, y a los 70 lo natural en WhatsApp es mandar un audio. Con el **AI SDK** y el **AI Gateway** de Vercel:

- **Audios:** "che, la jarrita blanca ya la vendí" se transcribe y se entiende.
- **Con sus palabras:** cuando el bot determinístico no entiende ("bajale dos mil a la tetera", "la verde ya no la tengo"), un modelo lo traduce a uno de los comandos de siempre, buscando la pieza por nombre en su catálogo.
- **Foto sola:** el bot le propone un nombre ("¿Le pongo «Taza celeste»?") y ella acepta con un toque.

La IA nunca toca la página: solo propone. Toda acción sigue pasando por la confirmación con foto, y los números que inventa un modelo se descartan. Si la IA no está disponible (sin crédito, caída o lenta), el bot sigue funcionando igual, sin ella. Se prende sola cuando el AI Gateway tiene saldo.

### Los links viajan por WhatsApp

Cada pieza tiene su link (`/14`). Si un comprador se lo reenvía a alguien, la vista previa ya muestra la tablilla con foto, número y precio, y la página abre con esa pieza primero y grande.

## Probarlo

`/simulador` tiene a la izquierda el WhatsApp de Norma y a la derecha su página en el celular de un comprador. Cada visitante recibe **su propia tienda de prueba**, así nadie rompe la página real. Hay fotos de ejemplo, se puede subir una propia y, con la IA activa, grabar un audio con el micrófono. El simulador usa exactamente el mismo motor que el webhook de WhatsApp real.

**Para correrlo local** no hace falta configurar nada: sin variables de entorno guarda todo en `.data/`.

```bash
npm install && npm run dev
```

**Para tener tu propia copia andando en Vercel** en un clic (crea el Blob solo):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffranclarke%2Fnorma-ceramica&project-name=norma-ceramica&stores=%5B%7B%22type%22%3A%22blob%22%7D%5D)

## Stack

- **Next.js 16** (App Router, Cache Components) en **Vercel**.
- **Vercel Blob** para las fotos. Los datos van en **Upstash Redis** (Marketplace de Vercel) cuando está conectado; si no, en Blob, donde cada guardado es una versión nueva e inmutable, porque sobrescribir el mismo archivo devolvía lecturas viejas durante minutos.
- La página de Norma y las de cada pieza son estáticas: se cachean con `'use cache: remote'` y un tag que se invalida cuando ella cambia algo.
- **AI SDK 7 + AI Gateway**: transcripción, salida estructurada validada con Zod y visión. Tests con `MockLanguageModelV4`.
- Las imágenes de cada tablilla (vista previa de los links y "así quedó") se generan con `next/og`.
- Speed Insights para medir en usuarios reales.
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

Variables de entorno (todas opcionales en local): `BLOB_READ_WRITE_TOKEN`, `KV_REST_API_URL` y `KV_REST_API_TOKEN` (Upstash), `AI_GATEWAY_API_KEY` (en Vercel se usa OIDC solo; `AI=off` la apaga), `NEXT_PUBLIC_SITE_URL`, `NORMA_CONTACT_PHONE`, `CRON_SECRET`, y las de WhatsApp de [docs/whatsapp.md](docs/whatsapp.md).
