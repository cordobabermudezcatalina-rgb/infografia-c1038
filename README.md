# Infografía interactiva · Sentencia C-1038/02

Sitio estático (HTML, CSS y JavaScript, sin dependencias ni compilación). Elaborado por Catalina Córdoba, Mariana Urbano, Sara Vivas y Alejandro Hurtado. El diseño se basa en el Manual de identidad de marca de la Universidad Icesi (2026): paleta azul, morado, verde, naranja, amarillo, negro y grises; tipografía Plus Jakarta Sans; retícula, bloques de color y cenefa.

## Qué incluye

- **Recorrido guiado de 8 pantallas** (00 a 07): portada, el caso, las voces, el marco, la pregunta clave, quién designa a los árbitros, la decisión y votos.
- **Todo se mueve:** las tarjetas se arrastran y se acomodan solas sobre la retícula. En celular se arrastran desde la agarradera (los seis puntos). El navegador recuerda dónde las dejaste. «Reordenar» o «Reordenar todo» las devuelve a su lugar.
- **Juegos:** normas demandadas contra el art. 116, balanza de las voces, ¿quién puede hacerlo? (árbitros o centro), camino de quién designa, y antes/después del trámite.
- **Código de color de la decisión:** verde = exequible, amarillo = exequible condicionado, naranja = inexequible, gris = estarse a lo resuelto.
- **Atajos:** ← y → pasan de sección (útil al proyectar). Esc cancela una selección. Todo funciona también con teclado (Enter para elegir y soltar).

## Estructura

```
infografia-c1038/
├── index.html      contenido (cada sección está marcada con un comentario)
├── styles.css      colores, tipografía y diseño
├── app.js          arrastrar y soltar, juegos y navegación
├── vercel.json     configuración para Vercel
└── assets/         favicon
```

## Verla en tu computador

Abre `index.html` con doble clic. Funciona sin servidor; solo necesita internet para cargar la fuente Plus Jakarta Sans.

## Publicarla en Vercel

**Opción A: con GitHub (recomendada, cada cambio se publica solo)**

1. Este repositorio ya tiene `index.html` en la raíz, listo para Vercel.
2. En [vercel.com](https://vercel.com), entra a **Add New… → Project** e importa este repositorio.
3. En *Framework Preset* elige **Other**. Deja vacíos *Build Command* y *Output Directory*. Pulsa **Deploy**.

**Opción B: desde la terminal**

```bash
npm i -g vercel
cd infografia-c1038
vercel          # la primera vez crea el proyecto y una vista previa
vercel --prod   # publica la versión final
```

## Cambiar textos o respuestas

- **Textos de las pantallas:** `index.html`.
- **Textos que aparecen al jugar** (qué decía cada norma, argumento de cada interviniente, tareas del juego clave, camino de designación y antes/después): objetos `NORMAS`, `VOCES`, `TAREAS`, `TREE` y `FLOW` en `app.js`.
- **Colores:** variables al inicio de `styles.css`.

## Fuente y notas

- Corte Constitucional de Colombia, Sentencia C-1038 de 2002 (expediente D-4066), M.P. Eduardo Montealegre Lynett. Hoy el arbitraje en Colombia se rige por la Ley 1563 de 2012.
- El Resuelve «Tercero» dice «numeral 3°», pero la expresión que condiciona («El Centro hará las designaciones que no hagan las partes») está en el numeral 4° del art. 15. La infografía lo señala con una nota.
