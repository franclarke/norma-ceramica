---
target: la tienda de Norma
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\franc\\Documents\\Proyectos\\goncychallenge\\src\\app\\page.tsx"
target_fingerprint: "sha256:b596b72f90793efe79c3e8af34927ea52f249bd1cf9832d3f060109e02d10a66"
target_path: "C:\\Users\\franc\\Documents\\Proyectos\\goncychallenge\\src\\app\\page.tsx"
timestamp: 2026-11-12T15-12-02Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# Crítica de la tienda de Norma (/, /14) — 2026-11-12

## Salud del diseño (Nielsen)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | El balanceo de la tablilla se cortaba al tocar en celular |
| 2 | Coincidencia con el mundo real | 3 | "Actualizado el…" y "Te compartieron la pieza" sonaban a sistema; 404 en inglés |
| 3 | Control y libertad | 3 | Sin trampas; zoom permitido |
| 4 | Consistencia y estándares | 2 | Los links del pie no tenían subrayado |
| 5 | Prevención de errores | 3 | Fotos verticales recortadas; nombres largos apretados |
| 6 | Reconocer antes que recordar | 3 | Número en cada tablilla; contacto repetido al final |
| 7 | Flexibilidad y eficiencia | n/a | Superficie Experience sin flujo repetido |
| 8 | Estética y minimalismo | 3 | Apertura con mucho texto en celular; contacto duplicado en escritorio |
| 9 | Recuperación de errores | 3 | /999 resuelto en la voz de Norma; /abc mostraba el 404 de Next |
| 10 | Ayuda y documentación | n/a | La página se explica sola |
| **Total** | | **23/32** | **Bueno** |

## Veredicto de especificidad
Autoral, no intercambiable: la tablilla en su clavo, el número en el barro y el trazo bajo el teléfono son de una ceramista. Detector: sin hallazgos en el código ni a 1280 px; a 375 px, un aviso de jerarquía tipográfica plana (h2 24 px contra cuerpo 20 px), en parte falso positivo (el h1 es el logo).

## Qué funciona
- La jerarquía de la etiqueta: número, precio y nombre en texto real, en cqw, de 277 a 1920 px sin desborde.
- La voz: "numerito", "La lista, por si es más fácil", "seguro se vendió".
- Contraste del blanco sobre la textura real: 8,3:1 en el peor píxel.

## Problemas prioritarios
- **[P1] En el celular objetivo no asomaba ninguna tablilla al abrir** (a 360 px el clavo estaba a 657 px). Corregido: 473 px.
- **[P1] La columna fija era más alta que la pantalla de una notebook** y se cortaba. Corregido: fija solo desde 700 px de alto.
- **[P1] Los links del pie no se distinguían del texto.** Corregido: subrayados.
- **[P1, verificar en un teléfono real] La franja de barro no tiene lugar para crecer** con letra del sistema muy agrandada. Mitigado: nombres largos un punto más chicos y tope de 40 caracteres.
- **[P2] Las fotos verticales perdían la mitad** en la ventana apaisada. Corregido: van casi enteras, con bordes fundidos.
- **[P2] El balanceo no se completaba al tocar.** Corregido con tabindex="-1".

## Personas
- Compradora de 70 años con baja visión: sin pieza en la primera pantalla (corregido); número de pieza a 5:1 sobre el barro real (oscurecido a #36200f).
- Lector de pantalla: la etiqueta visible era aria-hidden y el número y el precio no se leían al deslizar (corregido).

## Observaciones menores
Contacto duplicado en escritorio, doble filete al final de la lista, título flotante en /14, 404 por defecto: corregidos. El logo se bajaba dos veces por un preload sin crossOrigin: corregido.
