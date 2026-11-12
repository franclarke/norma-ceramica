# Hilo para la entrega (borrador)

Cada bloque es un tweet. Adjuntos sugeridos entre corchetes.

---

**1/**
Mi entrega para el challenge de la tía Norma, @goncy.

La página: https://norma-ceramica.vercel.app
Para hacer de Norma: https://norma-ceramica.vercel.app/simulador

[video: Norma manda un audio por WhatsApp y la pieza aparece en la página]

**2/**
Lo primero que entendí: hay dos usuarios y ninguno quiere aprender nada.

Norma solo usa WhatsApp, no ve bien y no tiene compu ni mail. Sus compradores tienen su edad.

Así que Norma no tiene panel: le escribe a su página por WhatsApp, como a cualquier persona.

**3/**
Le manda una foto, el bot le propone un nombre, le pregunta cuánto sale, le muestra cómo va a quedar y ella toca "Sí, publicar". Al toque le llega la imagen de cómo quedó.

Si la vende: "vendí la 14", o "vendí la jarrita blanca". Si dice "la taza" y tiene tres, le pregunta cuál. Si se equivoca: "deshacer".

[captura del chat]

**4/**
Como no ve bien, también le puede mandar un audio: "la catorce ahora sale nueve mil".

Los números, los precios y los nombres de sus piezas los entiende el bot solo. La IA (AI SDK + AI Gateway) transcribe el audio y ayuda cuando el bot no entiende, pero nunca toca la página: siempre le muestra la foto y le pregunta antes. Si la IA no está, el bot anda igual.

**4b/** (opcional, si entra)
Lo que más trabajo llevó no se ve:
- "no sé" no es un no: no cancela nada
- si manda 3 fotos juntas, las carga de a una
- "no, la 16" corrige sin empezar de nuevo
- si se le rompió una pieza, no la felicita por la venta
- "no me acuerdo el número" le manda la lista

**5/**
El detalle que ordena todo es el numerito. Cada pieza tiene un número que nunca se repite.

El comprador le escribe "me gustó la 14" y Norma sabe cuál es. Respeté el boceto: no hay carrito ni link, el que quiere algo le escribe.

**6/**
Y como sus compradores se mueven por WhatsApp, cada pieza tiene su link. Si alguien reenvía "mirá la 14", la vista previa ya muestra la tablilla con foto, número y precio, y la página abre con esa pieza primero.

[captura de la vista previa en WhatsApp]

**7/**
Para el diseño no quería una tienda ni el look de siempre.

Los ceramistas hacen tablillas de prueba de esmalte y les ponen un número en el barro. La página es esa pared del taller: cada pieza es una tablilla colgada de un clavo, con su número.

[captura de escritorio]

**8/**
Pensado para leer a los 70:
- Atkinson Hyperlegible, la tipografía del Braille Institute para baja visión
- letra grande, con el blanco sobre el cobalto a más de 8:1 en cualquier punto
- nada de hover, popups ni carruseles
- al final, la lista en texto llano, por si es más fácil

Lighthouse: accesibilidad 100.

[captura del celular]

**9/**
Para probarlo: /simulador tiene el chat de un lado y la página del otro, con el mismo motor que el WhatsApp real (Cloud API). Cada visitante tiene su propia tienda de prueba, así que rompé lo que quieras.

Goncy, si lo querés probar en tu WhatsApp, pasame tu número por DM y te habilito: te va a armar tu propia tienda de prueba.

**10/**
Y lo probé con [nombre], que tiene [edad]. [Qué pasó: qué entendió sola, qué cambiamos después de verla usarlo.]

Gracias por el challenge, Goncy. A la tía Norma de verdad le armo una cuando la encontremos.
