# Hilo para la entrega (borrador)

Cada bloque es un tweet. Adjuntos sugeridos entre corchetes.

---

**1/**
Mi entrega para el challenge de la tía Norma, @goncy.

La página: https://norma-ceramica.vercel.app
Para hacer de Norma: https://norma-ceramica.vercel.app/simulador

[video: mandar una foto por "WhatsApp" y verla aparecer en la página]

**2/**
Lo primero que entendí: hay dos usuarios y ninguno quiere aprender nada.

Norma solo usa WhatsApp, no ve bien y no tiene compu ni mail. Sus compradores tienen su edad.

Así que Norma no tiene panel: le escribe a su página por WhatsApp, como a cualquier persona.

**3/**
Le manda una foto, el bot le pregunta cómo se llama y cuánto sale, le muestra cómo va a quedar y ella toca "Sí, publicar".

Si la vende: "vendí la 14". Si cambia el precio: "la 14 ahora sale 9 mil". Si se equivoca: "deshacer".

Entiende "12 mil", "12.000", "doce mil" y "15 lucas".

[captura del chat]

**4/**
El detalle que ordena todo es el numerito. Cada pieza tiene un número que nunca se repite.

El comprador le escribe "me gustó la 14", Norma sabe cuál es, y al bot le dice "vendí la 14". Es el mismo idioma para los tres.

Respeté el boceto: no hay carrito ni link, el que quiere algo le escribe.

**5/**
Para el diseño no quería una tienda ni el look de siempre.

Los ceramistas hacen tablillas de prueba de esmalte y les graban un número en el barro. La página es esa pared del taller: cada pieza es una tablilla colgada de un clavo, con su número en el barro.

[captura de escritorio]

**6/**
Pensado para leer a los 70:
- Atkinson Hyperlegible, la tipografía del Braille Institute para baja visión
- letra grande, con el blanco sobre el cobalto a más de 8:1 en cualquier punto
- nada de hover, popups ni carruseles
- al final, la lista en texto llano, por si es más fácil

[captura del celular]

**7/**
Lo que no se puede probar sin el WhatsApp de Norma está en /simulador: el chat de un lado, la página del otro, con el mismo motor que el webhook real de la Cloud API.

Cada visitante tiene su propia tienda de prueba, así que rompé lo que quieras.

**8/**
Detrás: Next.js 16 en Vercel, fotos y datos en Blob, WhatsApp Cloud API y sharp para enderezar las fotos de Norma (y avisarle si salieron oscuras).

El bot no usa IA: cada respuesta es predecible y siempre confirma antes de tocar la página.

**9/**
Y lo probé con [nombre], que tiene [edad]. [Qué pasó: qué entendió solo, qué cambié después de verla usarlo.]

Gracias por el challenge, Goncy. A la tía Norma de verdad le armo una cuando la encontremos.
