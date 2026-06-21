# CLAUDE.md — EL BÚNKER (REFUGIO 048)

Guía para trabajar en este repo. Leer antes de tocar nada.

## Qué es el proyecto

Trailer 3D **jugable** de una memecoin, presentado como una experiencia "found footage"
de un búnker post-apocalíptico (REFUGIO 048). El gancho narrativo: una IA/"enjambre"
asimiló al mundo y el búnker tiene **capacidad 100**. La métrica de la memecoin —
**HOLDERS** — se traduce a personas que entran al refugio: los primeros 100 holders
se salvan adentro; el excedente queda **afuera con la infección**. Es a la vez demo
de marketing y mini-juego de supervivencia.

- **Estética:** CRT verde fósforo (monitor de tubo), tipografías `Anton` (titulares) y
  `VT323` (monoespaciada retro), grano de película, scanlines, RGB-shift, bloom,
  viñeta, baliza de emergencia, polvo y temblores. Paleta en variables CSS `:root`
  (`--screen` verde, `--amber`, `--enj` rosa "enjambre", `--cyan`, `--void`).
- **Motor:** Three.js **r128 (0.128.0)** + sus ejemplos (postprocesado, GLTFLoader,
  shaders). Todo en **un solo archivo HTML** (`index.html`).
- **Idioma:** toda la UI y narrativa están en **español rioplatense** (voseo). Mantenerlo.

## La mecánica del slider HOLDERS (es el corazón del trailer)

- Slider `#holders` (rango 0–400) + botón `AUTO ▲` que sube holders solo, y velocidades
  de reloj `x1 / x800 / x6k`.
- `CAP = 100`. En el loop:
  - `inside  = min(round(holders), CAP)` → refugiados salvados.
  - El excedente (`holders - CAP`) se reparte entre **consumidos** por el enjambre
    (depende de `asim`, el % de mundo asimilado) y **outside** (almas afuera).
  - Subir `inside` dispara un `blip()`; subir `outside` dispara `thud()` + temblor.
- Hay un reloj de cuenta regresiva `clock` (arranca en `FULL ≈ 71:58:42`). Cuando llega
  a 0 → `conclude()` (final "BÚNKER SELLADO" si `inside>0`, si no "EXTINCIÓN").
- `asim` (asimilación del mundo) crece a medida que baja el reloj y modula el enjambre
  exterior (luz, partículas, color del cielo, cuántas siluetas `outside` se renderizan).

## Stack y restricciones (NO romper)

- **Single-file primero, ahora multi-archivo plano.** Objetivo del repo: separar el
  HTML monolítico en `index.html` (shell liviano) + `css/`, `js/`, `assets/`, `vendor/`.
- **Sin build tools, sin bundler, sin npm en runtime.** Se deploya en **Render** como
  sitio estático. No introducir Webpack/Vite/Rollup ni pasos de compilación.
- **Scripts clásicos `<script src>` en orden de dependencia. NO ES modules**
  (`type="module"`). Tiene que andar igual servido por Render y abierto con `file://`.
- **Three.js vendorizado en `vendor/` (NO CDN).** El trailer debe funcionar aunque
  jsDelivr se caiga. Mantener la versión **exactamente r128** (la API cambió después).
- **No frameworks de UI.** La UI es DOM + CSS a mano. Mantener ese estilo.
- Todo el render 3D es **procedural** (texturas dibujadas en `<canvas>`, geometría
  generada por código). El único asset binario es el **modelo GLB del robot**.

## Anatomía del `index.html` (bloques grandes)

El `<script>` principal es una IIFE `(function(){ ... })()`. Bloques, marcados con
comentarios `// ---- ... ----`:

1. **Helpers / formato** — `SMALL` (detección mobile), `clamp`, `fmt` (reloj), `$`.
2. **Texturas procedurales** (`// ---- texturas ----`) — `concrete`, `rust`, `bump`,
   `floorTiles`, `wallPanels`, `metalHeight`, `grime`, `signTex`, `crackTex`,
   `heightToNormal` (genera normal maps desde height maps). Producen los
   `MeshStandardMaterial` (`concreteMat`, `floorMat`, `steelMat`, `rustMat`, etc.).
3. **Escena** (`// ---- escena ----`) — `scene`, `camera` (FOV 62, altura ojo `EYEH=1.5`),
   `renderer` (sRGB + ACES tone mapping + sombras PCF). Helpers `box`/`meshBox`/`place`.
4. **Construcción del refugio** — paredes, puerta blast, cartel, cajas, barriles, sacos,
   compuerta del robot (`hatchDoor`), generador a combustible (`genGrp`), bidones,
   estantes, radio, ventilador, CRT, cámara CCTV que te sigue, cultivo hidropónico,
   rack de servidores, tira LED, panel eléctrico, mobiliario. Coordenadas a mano
   (`RX`, `RZ0`, `RZ1`, `CH` definen el hub principal).
5. **Pantalla CRT** (`// ---- CRT ----`) — `drawCRT()` redibuja el monitor con el estado
   (reloj, refugiados inside/outside, % asimilado, alertas).
6. **Postprocesado** (`// ---- post ----`) — `EffectComposer`: `RenderPass`,
   `UnrealBloomPass`, `RGBShiftShader` (`rgbPass`), `FilmShader` (`filmPass`, grano +
   scanlines). El RGB-shift y el grano se intensifican cuando baja la **cordura**.
7. **Audio** (`// ---- AUDIO ----`) — WebAudio puro (sin archivos): zumbido del generador,
   aire, susurros; SFX `alarm`/`rumble`/`thud`/`blip`. Arranca con el botón ♪ SONIDO.
8. **Stats e inventario** — `stats` (hambre, sed, energía, cordura), `res` (fuel, food,
   water, mats, med), `nucleo` (% generador). `renderStats`/`renderRes`/`renderHotbar`.
9. **Mapa** (`// ---- MAPA ----`) — `drawMapPlan()` dibuja el plano blueprint con la
   posición/orientación del jugador.
10. **Estado del juego** — `holders`, `clock`, `speed`, `auto`, `asim`, banderas de
    eventos. Eventos aleatorios `fireEvent()` (golpe del enjambre, falla eléctrica,
    sobrecarga). Decisiones morales `openDecision()` (dejar entrar a un desconocido).
11. **Controles** — look con drag (mouse/touch), movimiento WASD/flechas + joystick
    virtual (`#joy`), colisiones contra `COLLIDERS` y `inArea()`.
12. **Expansión de salas** — pasillo, biblioteca, cultivo, taller, sala de descanso, con
    sus props.
13. **Zonas de interacción** (`zones[]`) — alimentar generador, cosechar, juntar agua,
    sacar combustible, materiales, reparar, descansar, leer, radio, **banco de crafteo**.
    Cada zona tiene radio, cooldown y un `fn`. `#prompt` muestra la acción disponible.
14. **Loop principal** (`function loop()`) — `requestAnimationFrame`; integra delta time,
    decaimiento de stats/nucleo, eventos, lógica de holders, animación de luces/props,
    enjambre exterior, movimiento + cámara (head-bob, shake), y `composer.render()`.
15. **Finales** — `conclude()`, `loseGame('apagon'|'conversion')`, pantalla `#end`, `rst()`.
16. **Cel-shading** (`// ====== CEL-SHADING ======`) — toggle CEL/REAL: intercambia
    `MeshStandardMaterial` ↔ `MeshToonMaterial` (con outline `_outMat`, `BackSide`).
17. **Unidad R-01 (robot)** — modelo **GLB embebido en base64** dentro de
    `<script id="robotdata" type="text/plain">` (≈600 KB, el grueso del archivo). Se
    decodifica con `atob` → `GLTFLoader().parse()`. Tiene `AnimationMixer` (Idle, Walking,
    Wave, Death, etc.), batería/HP/temp/carga, y una mini-IA: deambula, lo enviás a
    misión por la compuerta, vuelve con recursos, se puede cargar/reparar.
18. **Banco de crafteo** — `CRAFT_BASES` / `CRAFT_COMP` / `CRAFT_PROD`: elegís una base
    (agua/comida/chatarra) y aplicás procesos **en orden** (el orden importa) para
    transformar el estado hasta un producto con efectos sobre stats.

## Convenciones a mantener

- **Español rioplatense (voseo)** en toda la UI y textos.
- **CSS muy compacto** (muchas reglas por línea); variables de color en `:root`.
- **JS denso de una sola línea por bloque lógico** es el estilo existente — al separar a
  archivos, conservar el código tal cual; no reformatear ni "modernizar" porque sí.
- Respetar `body.motion` y `prefers-reduced-motion`: las animaciones se apagan si el
  usuario pide menos movimiento (`mv = motion()`).
- Caminos de degradación: `try/catch` alrededor del postprocesado y del GLB; si algo
  falla el juego sigue. Mantener esos fallbacks.
- Detección `SMALL` (ancho < 760) baja pixelRatio, resolución de sombras y bloom para
  mobile. Mantener el rendimiento en mobile como objetivo.
- Naming en español para gameplay (`nucleo`, `cordura`, `enjambre`, `asim`).

## Deploy

Sitio estático en **Render**. La raíz del repo se sirve tal cual; `index.html` es el
punto de entrada. Cualquier asset nuevo debe referenciarse por **ruta relativa**
(`vendor/...`, `js/...`, `assets/...`) para que ande tanto en Render como por `file://`.

## Estado actual del repo (ya separado)

El monolito original se separó en un shell liviano + archivos planos (sin bundler):

```
index.html        shell ~6 KB: <head>, body HTML y <script src> en orden de dependencia
css/style.css     todo el CSS
vendor/           Three.js r128 + ejemplos (12 archivos locales, no CDN)
assets/robot.glb  modelo del robot (binario real, ~464 KB)
js/
  config.js       constantes y helpers (SMALL, CAP, FULL, clamp, fmt, $)
  textures.js     texturas procedurales y materiales
  scene.js        escena, render, geometría estática, CRT y postprocesado (init)
  audio.js        WebAudio
  hud.js          stats, recursos, inventario, mapa
  game.js         lógica de juego: estado, slider HOLDERS, eventos, zonas, loop,
                  cel-shading, robot R-01 y crafteo, + kickoff final
```

Notas importantes para mantener:

- **No hay IIFE.** Los `<script>` son clásicos y comparten el scope global léxico. Las
  declaraciones top-level (`const`/`let`/`function`) de un archivo son visibles para los
  que cargan después. **El orden de los `<script>` importa** y debe respetar dependencias.
- **El hoisting de `function` NO cruza archivos.** Por eso todo el cluster con referencias
  cruzadas hacia adelante (estado → zonas → `openCraft`/robot/cel → kickoff) vive junto en
  `game.js`. Si vas a partir `game.js`, cuidá que ninguna ejecución inmediata referencie una
  función declarada en un archivo posterior.
- **Fuentes (Google Fonts) siguen por CDN** en `index.html`. Si fallan, la página degrada a
  `monospace`/`sans-serif` (definido en el CSS). Three.js sí está vendorizado.
- Para verificar cambios: servir la raíz por HTTP (no `file://`, por el fetch del `.glb`)
  y abrir `index.html`. El robot carga vía `GLTFLoader.load('assets/robot.glb')`.
</content>
</invoke>
