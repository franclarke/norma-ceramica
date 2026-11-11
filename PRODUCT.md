# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) en Vercel. Aprobado por el usuario en el plan inicial (2026-11-11).

## Users

- **Compradores:** gente de unos 70 años, conocidos de Norma y conocidos de conocidos, que entran casi siempre desde el celular, muchas veces con la letra del teléfono agrandada y poca paciencia con las interfaces. Quieren ver qué piezas hay, cuánto salen y saber cómo pedir una.
- **Norma (la que carga):** ceramista de 70 años, ex profesora de plástica. No ve bien, no tiene compu ni mail y solo usa WhatsApp. Nunca abre un panel: actualiza su página conversando por WhatsApp con un bot.
- **Evaluador:** Goncy, que juzga el challenge. Prueba la página y un simulador del WhatsApp de Norma.

## Product Purpose

Una página de una sola grilla con las piezas del taller de Norma: una foto, un título y un precio por pieza. No hay carrito, checkout ni login: el que quiere una pieza le escribe a Norma y arreglan. El éxito es que un comprador de 70 años entienda en segundos qué hay, cuánto sale y cómo pedirlo, y que Norma pueda agregar, sacar o cambiar piezas sin ayuda.

## Positioning

La página la mantiene Norma desde su WhatsApp, conversando, sin aprender nada nuevo. Cada pieza tiene un número que funciona como idioma en común entre Norma, sus compradores y el bot ("me gusta la 14", "vendí la 14").

## Operating Context

- Los compradores miran la página en celulares Android de gama baja, a veces con conexión lenta.
- Norma saca las fotos con su celular, en su taller: van a llegar torcidas, oscuras y con fondos desprolijos.
- El contacto pasa fuera de la página: el comprador le escribe a Norma por WhatsApp a su número personal.
- Entrega del challenge: hilo público en X con link a la página y a una ruta `/simulador`. Cierra el martes 2026-11-17 a las 19:00 ART.

## Capabilities and Constraints

- Una sola página pública. Cada pieza: una imagen, título, precio y número.
- Sin carrito, sin checkout, sin cuentas para compradores.
- Panel de Norma = conversación de WhatsApp (Cloud API de Meta) + `/simulador` con el mismo motor.
- La consigna pide creatividad propia: lo que se note hecho por IA resta.
- Sin decidir: si las piezas vendidas desaparecen o quedan marcadas; el número de teléfono real de demo.

## Brand Commitments

- Voz: los textos los "dice" Norma, en primera persona, rioplatense, con calidez de señora de 70 ("numerito", "así no nos confundimos"). Nunca tono de instrucción de interfaz.
- Ningún asset visual previo es obligatorio: el usuario dio libertad total para reemplazar logo, sellos, cinta y estilo.
- Lo que el usuario descarta explícitamente: que parezca hecho por IA, que parezca una tienda (Shopify, Tiendanube), que sea kitsch artesanal (scrapbook recargado), y cualquier cosa que cueste leer.

## Evidence on Hand

- Assets generados con Codex en `assets/` (logo a pincel, sellos, cinta, trazos, papel); son opcionales.
- No hay fotos reales de piezas todavía: las de la demo tienen que ser fotos reales (propias o de stock con licencia), nunca generadas por IA, y estar marcadas como de ejemplo.
- No hay testimonios, ventas ni precios reales: los precios de la demo son de ejemplo.

## Product Principles

1. Leer primero: ninguna decisión visual se paga con legibilidad.
2. Que Norma no aprenda nada: todo lo que ella hace pasa por WhatsApp.
3. El número de pieza es el idioma en común entre ella, sus compradores y el bot.
4. Hecho por personas: la página tiene que sentirse de Norma, no de una plantilla ni de una IA.
5. Funciona todo: cada flujo se puede probar, y si no se puede, tiene su simulador.

## Accessibility & Inclusion

Público principal de ~70 años con baja visión: texto base grande, contraste AAA (7:1) en el texto, objetivos táctiles grandes, nada que dependa de hover, zoom del navegador siempre habilitado, `prefers-reduced-motion` respetado, y carga rápida en Android de gama baja.
