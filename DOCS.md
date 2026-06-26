# DOCS — REFUGIO 404 · Manual técnico

Manual práctico para **operar y entender** el proyecto. (La parte narrativa/lore se maneja aparte — esto es puramente técnico.)

> Stack: Three.js **r128** vendorizado, sin build tools, sin módulos. Scripts clásicos `<script src>` en orden de dependencia, todos comparten **un único scope global**. Se sirve como sitio estático. Funciona por HTTP y, salvo los `.glb`, también por `file://`.

---

## 1. Arquitectura — qué archivo hace qué

| Archivo | Rol |
|---|---|
| `index.html` | Shell: `<head>`, DOM del overlay (`#camhud`, `#beeko`, `#alert`, `#panel`…) y los `<script src>` en orden de dependencia. |
| `css/style.css` | Todo el CSS (overlay CCTV, cuadro de Beeko, panel oculto, flash, badges). |
| `vendor/` | Three.js r128 + ejemplos (EffectComposer, GLTFLoader, shaders). **No CDN.** |
| `js/config.js` | Constantes base y helpers: `SMALL` (mobile), `motion()` (reduced-motion), `CAP`, `FULL`, `clamp`, `fmt`, `$`. |
| `js/textures.js` | Texturas procedurales en `<canvas>` y materiales (`concrete`, `rust`, `floorTiles`, `grime`, `heightToNormal`, etc.). |
| `js/scene.js` | Escena, cámara, renderer (sRGB + ACES + sombras PCF), geometría estática base, luces globales (hemisférica, `emer`, `sealLight`, `lamp`, `refugioLight`), tablero split-flap, postprocesado. |
| `js/audio.js` | WebAudio puro (sin archivos). Zumbido del generador, aire, susurros + SFX. |
| `js/hud.js` | Stats/recursos (mayormente jubilados), inventario, **minimapa** (`drawMapPlan`). |
| `js/stream.js` | **STREAM**: objeto central de estado + driver del reloj + API `__REFUGIO`. |
| `js/i18n.js` | Diccionarios `en`/`es` y `T(key)`. **`LANG` está fijo en `'en'`** (no hay toggle de idioma activo). |
| `js/game.js` | El grueso (~1640 líneas): construcción de las salas, props GLB, cámaras de seguridad, navegación del robot, rutina del día, eventos, pensamientos de Beeko, crafteo, loop principal y kickoff. |
| `assets/` | `robot.glb` (R-01), `miku.png` (póster), `props/*.glb` (Quaternius CC0 + cash/gold/dollar). |

**Orden de carga importa** (scope global compartido, sin IIFE): config → textures → scene → audio → hud → stream → i18n → game.

---

## 2. Las 10 salas (zonas)

Eje **z** = norte-sur (la espina del búnker). `RX=3.2, RZ0=-5.4, RZ1=3.2, CH=2.65` (alto de techo).

| # | Zona (`ZONES`) | CAM | Nombre overlay | AABB aprox (x / z) | Contenido principal |
|---|---|---|---|---|---|
| 0 | `observatorio` | 01 | OBSERVATORY | x[-3.2,3.2] z[-5.4,3.2] (hub) | Entrada/blast door, generador, compuerta del robot, **TV CRT** (tramo ocio), tablero split-flap, suministros. |
| 1 | `pasillo` | 02 | HALLWAY | x[-1.3,1.3] z[3.2,5.2] | Conector hub→biblioteca. |
| 2 | `biblioteca` | 03 | LIBRARY | x[-3.4,3.4] z[5.2,8.2] | Junction central; estanterías, cajas. |
| 3 | `cultivo` | 04 | GROW | x[-3.4,3.4] z[8.2,11.8] | Racks hidropónicos (luz magenta), plantas. CAM fov 82. |
| 4 | `taller` | 05 | WORKSHOP | x[3.4,7.4] z[5.5,8.5] | Banco, herramientas, fabricadora, amoladora, estantería de componentes. |
| 5 | `descanso` | 06 | REST | x[-7.4,-3.4] z[5.5,8.5] | **Estación de cómputo** (admin), mobiliario. |
| 6 | `carga` | 07 | CHARGING | x[-6.45,-2.7] z[-0.8,3.05] | **Dock de carga**, medidor (lee `STREAM.charge`), **pantalla de diagnóstico** (RTT del robot girando). 100% procedural. |
| 7 | `colmena` | 08 | HIVE | x[-3.25,3.25] z[11.55,15.25] | La colmena (centerpiece), enjambre (`STREAM.bees`), contador "LIBERADAS", incubadora. CAM fov 74. |
| 8 | `fab` | 09 | FABRICATION | x[-7.2,-3.15] z[8.45,11.55] | **Impresora 3D** animada (lee `STREAM.print`), panel CRT, estantes. CAM fov 72. |
| 9 | `vault` | 10 | VAULT | x[3.4,7.2] z[11.8,15.4] | **Bóveda sellada**: montañas de oro/monedas/fajos (GLB clonados + procedural), strongbox, guante/casco humano, haz cálido por la puerta. CAM fov 70. |

Cada sala tiene su entrada con **hueco de 1.7 m** y cruce de navegación limpio. Estado: **todas cargan y renderizan OK**, geometría/cámaras/colliders consistentes (auditado).

---

## 3. Rutina del robot (R-01 "Beeko") — día completo

Driver: `routineSegment()` lee `streamHourUTC()` (hora UTC del stream). Tramos por hora:

| Hora UTC | Tramo | Zona | Qué hace |
|---|---|---|---|
| 00–06 | `carga` | carga | Duerme en el dock; `STREAM.charge` sube hacia 100, batería full. |
| 06–10 | `colmena` | colmena | Atiende la colmena; micro-hops entre stations (incubadora, estación apícola, jardinera). |
| 10–13 | `admin` | descanso | Se sienta en la estación de cómputo; **pose de tecleo** (ver §10). |
| 13–17 | `fabricacion` | fab | Frente a la impresora; gestos hacia la pieza/estante. |
| 17–20 | `ronda` | multi | Patrulla: **hub → cultivo → colmena → bóveda → fab → loop**. Chequea cada parada (Yes/ThumbsUp, a veces No). |
| 20–21 | `ocio` | observatorio | Camina al TV, **lo prende** al plantarse, lo mira casi quieto; al salir lo apaga y va a cargar. |
| 21–00 | `carga` | carga | Vuelve al dock. |

**Mecánica de tramos** (`SEG_CFG`): cada tramo define `{zone, node, action, stations[]}`. Cada station tiene `{p:[x,z], look:[x,z], g:[gestos], dwell:[min,max], w:peso}`. El robot viaja al nodo de la zona (`travelTo` → BFS sobre `NAV`/`ADJ`), elige una station por peso (`pickStation`), se orienta (`_faceXZ`), reproduce un gesto y espera (`dwell`). `ronda` usa `RONDA_STOPS` (patrulla en orden). `admin` no tiene stations: se planta en el escritorio con la pose de tecleo.

**Navegación**: grafo `NAV` (25 nodos) + `ADJ` (adyacencia) + `DEST` (nodos "centro de sala" donde puede plantarse). Cruces de puerta colineales. **Verificado**: grafo conectado, los 25 nodos alcanzables desde el nodo 0, ningún `DEST` bloqueado por un collider. Histéresis `HYST=0.6` para reportar zona sin parpadeo en puertas.

**Eventos** pueden interrumpir cualquier tramo (ver §4): congelan a Beeko unos segundos (`evHoldT`) sin tocar su rutina, que retoma idéntica.

---

## 4. Eventos aleatorios (temblor / fallo eléctrico)

Controlador único `eventTick(dt,t,mv)`. **Un solo evento a la vez**, arco inicio→pico→fin, en **tiempo real**.

- **Scheduler**: cuando no hay evento, descuenta `evT`; al llegar a 0 dispara `quake` o `blackout` al azar y reprograma `evT` a `[EV_GAP_MIN, EV_GAP_MAX]`.
- **TEMBLOR** (`quake`): shake de cámara (arco) + luces de sala teñidas a **rojo** + `alarm()` + `rumble()` intermitente + alerta de sistema + pensamiento de Beeko + **badge "⚠ SEISMIC EVENT"**.
- **FALLO** (`blackout`): luces principales parpadean y se cortan (~5%) + **luces de emergencia** ámbar/rojas + *duck* del zumbido del generador (`genDuck`) + clic (`eclick`) + alerta + pensamiento + **badge "⚠ POWER FAILURE"**.
- **Blindaje de normalidad** (crítico): registro `EV_LIGHTS` de las luces de sala con su **base** (intensidad+color); modulación **pura desde base** (`color = lerp(base, rojo, k)`, `int = base*(1-cut)`) + restauración explícita en `endEvent()`. **Verificado**: tras cada evento los colores vuelven exactos a base y la emergencia a 0.
- **Reacción de Beeko**: 3 modos al azar — leve (0.5s) / mira `No` (1.6s) / melancólico `Idle` (2.6s) — vía `evHoldT`, sin romper la rutina.
- **Badge**: `#ch-event`, atado a `STREAM.event` (no a un timer); aparece al empezar, dura todo el evento, se va limpio al terminar.

---

## 5. Sistema STREAM (estado central)

Objeto único `STREAM` (en `stream.js`). **Regla de oro**: el resto del código lee de `STREAM.*`, nunca de `Date.now()` directo. El driver (`streamTick`) avanza el tiempo; los "dueños" reportan su campo con `streamDrive(campo, val)` (que respeta el override del operador).

| Campo | Tipo | Lo alimenta | Lo lee |
|---|---|---|---|
| `driveFromClock` | bool | `freeze()`/`resume()` | el driver del tiempo |
| `speed` | 1/800/6000 | `setSpeed()` / botones | `streamTick` (acelera el reloj) |
| `offsetMs` | ms | fast-forward / saltos admin | `streamTick` |
| `now` | ms UTC | `streamTick` | overlay, día, uptime, rutina (hora) |
| `day` | int | driver (`floor((now-LORE_EPOCH)/DÍA)`) | overlay (DAY) |
| `zone` | string | `robotRoomReport()` / rutina / `setZone()` | cámara activa, overlay (CAM) |
| `action` | string | rutina (`streamReportAction`) | (telemetría) |
| `bees` | 0..60 | rutina colmena | enjambre (cantidad visible) |
| `beesReleased` | int | `triggerRelease()` | overlay (BEES RELEASED), contador colmena |
| `charge` | 0..100 | rutina (sube en el dock / drena a 50) | medidor de la sala de carga |
| `print` | 0..100 | rutina fab (auto-cicla) | pieza de la impresora |
| `tv` | bool | rutina (tramo ocio) / `setTV()` | TV del observatorio (estática + glow) |
| `event` | ''/quake/blackout | controlador de eventos | badge `#ch-event`, FX |
| `_force` | obj | `force()`/`set*()` | `streamDrive` (si forzado, el driver no pisa) |

Override: `force(campo,val)` saca el campo del control del driver hasta `release(campo)`. Cada `set*()` del operador es un `force` de su campo.

---

## 6. Comandos `__REFUGIO` (tu tablero de control · consola del navegador)

Todos en `window.__REFUGIO`. Abrí la consola del navegador y tipeá `__REFUGIO.<comando>()`.

### Tiempo / velocidad
| Comando | Qué hace |
|---|---|
| `setSpeed(n)` | Multiplicador del reloj del stream (1 / 800 / 6000). |
| `freeze()` | Congela el tiempo (el driver no avanza). |
| `resume()` | Reanuda el tiempo desde el reloj real. |
| `resync()` | Vuelve a UTC real puro (offset 0, speed 1, driver on). |
| `setDay(n)` | Fuerza el número de día. |
| `clock()` | Devuelve el timestamp HH:MM:SS UTC actual. |
| `hourUTC()` | Devuelve la hora del día UTC (0–24, fracción) — la que usa la rutina. |

### Robot / rutina
| Comando | Qué hace |
|---|---|
| `forceSegment(s)` | Fuerza el tramo: `'carga'`/`'colmena'`/`'admin'`/`'fabricacion'`/`'ronda'`/`'ocio'`. `forceSegment(null)` = deambula. `forceSegment()` = vuelve a auto (por hora). |
| `restart()` | Reinicia el robot a su base + resync del reloj. |
| `setAction(a)` | Fuerza `STREAM.action`. |

### Cámara / zona
| Comando | Qué hace |
|---|---|
| `setZone(z)` | Corta a la cámara de esa sala (`observatorio`…`vault`). Fuerza `STREAM.zone`. |

### Salas / contadores
| Comando | Qué hace |
|---|---|
| `setCharge(n)` | Medidor de la sala de carga (0–100). |
| `setPrint(n)` | Progreso de la impresora 3D (0–100). |
| `setTV(on)` | Prende/apaga el TV del observatorio. `setTV()` alterna. |
| `setBees(n)` | Abejas en cría (0–60). |
| `setBeesReleased(n)` | Acumulado de enjambres liberados. |
| `releaseSwarm()` | Dispara una liberación de enjambre a mano. |

### Eventos
| Comando | Qué hace |
|---|---|
| `quake()` | Dispara un temblor ya (no-op si hay un evento en curso). |
| `blackout()` | Dispara un fallo eléctrico ya. |
| `events(on)` | Enciende/apaga el scheduler automático. `events()` alterna. |

### Pensamientos de Beeko
| Comando | Qué hace |
|---|---|
| `say(cat)` | Dispara un pensamiento de la categoría: `hive`·`charging`·`admin`·`fab`·`grow`·`observatory`·`transit`·`quake`·`blackout`·`vault`·`generic`. |
| `thoughts(on)` | Enciende/apaga el cuadro de pensamientos. `thoughts()` alterna. |

### Estilo / audio / bajo nivel
| Comando | Qué hace |
|---|---|
| `style(on)` | Cel-shading: `style(true)`=CEL · `style(false)`=REAL · `style()` alterna. |
| `sound(on)` | Enciende/apaga el audio. `sound(true)` ceba el AudioContext (ver §8). |
| `vol(name, v)` | Volumen de un sonido (`'master'`,`'step'`,`'creak'`,`'alarm'`,`'rumble'`,`'thud'`,`'blip'`,`'flap'`,`'camclick'`). `vol()` lista todos. |
| `volumes()` | (alias) devuelve el mapa de volúmenes. |
| `state` | Referencia directa al objeto `STREAM` (lectura/inspección). |
| `force(campo,val)` / `release(campo)` | Forzar/liberar un campo de STREAM. |

---

## 7. Constantes ajustables

Todas son `const` en la parte de arriba de su bloque, fáciles de encontrar.

### Eventos (`js/game.js` ~1512)
| Constante | Default | Controla |
|---|---|---|
| `EV_GAP_MIN`, `EV_GAP_MAX` | 180, 360 | Segundos entre eventos (frecuencia, tiempo real). |
| `EV_QUAKE_DUR`, `EV_BLACKOUT_DUR` | 13.0, 14.0 | Duración de cada evento (s). |
| `EV_ARC_UP`, `EV_ARC_HOLD` | 0.28, 0.18 | Forma del arco: sube 28% · pico 18% · baja 54%. |
| `EV_SHAKE_MAX` | 1.0 | Intensidad del shake de cámara en el pico. |
| `EV_QUAKE_RED` | 0.7 | Cuánto rojo en el pico (0–1). |
| `EV_BLACKOUT_CUT` | 0.95 | Cuánto bajan las luces en el corte (0–1). |
| `EV_REACT_HOLD` | [0.5,1.6,2.6] | Pausa de Beeko: leve / mira / melancólico. |

### Pensamientos de Beeko (`js/game.js` ~1171)
| Constante | Default | Controla |
|---|---|---|
| `BEEKO_WANDER_MIN`, `_MAX` | 34, 58 | Segundos entre pensamientos genéricos al deambular. |
| `BEEKO_HOLD` | 4.6 | Segundos que el cuadro se queda tras tipear. |
| `BEEKO_FADE` | 0.55 | Segundos del fade (coincide con la transición CSS). |
| `BEEKO_TYPE_CPS` | 45 | Velocidad del typewriter (chars/seg). |
| `BEEKO_MIN_GAP` | 11 | Segundos mínimos entre pensamientos (anti-spam en la ronda). |

### Rutina / salas (`js/game.js`)
| Constante | Default | Controla |
|---|---|---|
| `CHARGE_UP`, `CHARGE_DOWN` | 0.5, 0.08 | Carga sube en el dock / drena el resto (piso 50). |
| `BEE_CAP`, `BEE_RATE`, `BEE_RELEASE_DUR` | 60, 0.5, 3.6 | Cría tope, crecimiento/seg, duración del surge. |
| `BEES_MAX` | 80 | Pool del enjambre (Points). |
| `PRINT_SECS`, `PRINT_LAYERS` | 50, 24 | Ciclo de impresión y capas. |
| `HYST` | 0.6 | Histéresis de reporte de zona (anti-parpadeo en puertas). |

### Base (`js/config.js`)
| Constante | Default | Controla |
|---|---|---|
| `CAP` | 100 | Capacidad del refugio (métrica). |
| `FULL` | 71:58:42 | Cuenta regresiva inicial. |
| `SMALL` | `width<760` | Modo mobile (baja pixelRatio/sombras/cantidad). |

---

## 8. Audio — cómo se enciende y qué suena

WebAudio puro (sin archivos). Persistente: **zumbido del generador** (osciladores 55/82.5 Hz lowpass), **aire** (ruido lowpass), **susurros** (banda). SFX:

| SFX | Cuándo |
|---|---|
| `step()` | Pasos de Beeko al caminar. |
| `creak()` | Crujidos de metal viejo (timer aleatorio). |
| `camClick()` | "Chunk" del relé al cortar de cámara. |
| `flap()` | Tick del tablero split-flap. |
| `blip()` | Chispa eléctrica, soldadura, blips varios. |
| `alarm()` | Inicio del temblor. |
| `rumble()` | Retumbo grave (temblor, intermitente). |
| `genDuck()` | *Duck* del generador en el fallo eléctrico. |
| `eclick()` | Clic eléctrico (corte/reencendido). |
| `thud()` | (definido, sin uso actual — ver auditoría). |

**Encendido**: botón `♪ SOUND` en el panel, o `__REFUGIO.sound(true)` desde consola. ⚠ Por la política de autoplay del navegador, `sound(true)` desde consola ceba el `AudioContext` pero puede quedar `suspended` hasta el primer click/tecla en la página. Si está apagado, **todo degrada en silencio** (cada SFX chequea `audioOn`).

---

## 9. Cómo operar el stream (flujo típico)

1. Servir la raíz por HTTP (`python3 -m http.server`) y abrir `index.html`. (Por `file://` anda todo salvo los `.glb`.)
2. `__REFUGIO.sound(true)` + un click en la página para desbloquear el audio.
3. Mirar la rutina: dejar correr (auto por hora) o `__REFUGIO.forceSegment('ocio')` para saltar a un tramo. `__REFUGIO.setSpeed(800)` para acelerar el día.
4. Cortar de cámara a mano: `__REFUGIO.setZone('vault')`.
5. Disparar eventos: `__REFUGIO.quake()` / `__REFUGIO.blackout()`. Pausar el scheduler: `__REFUGIO.events(false)`.
6. Pensamientos: `__REFUGIO.say('hive')`.

---

## 10. Notas técnicas / estado conocido

- **Render-to-texture** (3, todos gateados): diagnóstico del robot → solo en `carga`; dashboard admin → solo en `descanso`; retrato de Beeko → solo mientras hay un pensamiento activo. El retrato usa un **2º WebGLRenderer** (contexto aparte) con `preserveDrawingBuffer`.
- **Pose de tecleo del admin** (`ADMIN_POSE`): está en **1ª pasada de calibración** — el typing-bob está en 0 (estático) y la dirección de los brazos puede necesitar ajuste (ver auditoría). Constantes en `js/game.js` ~1318.
- **`LORE_EPOCH`** (`stream.js:16`) es un **placeholder** (`Date.now()`): hoy "día 0" = cuando carga la página. Cambiar al timestamp UTC del lanzamiento antes de lanzar.
- **Degradación**: `try/catch` alrededor del GLB y del postprocesado; si algo falla el stream sigue. Fuentes (Google Fonts) por CDN; si fallan degrada a monospace.
- **Mobile** (`SMALL`): baja pixelRatio, resolución de sombras, bloom y cantidad de props clonados (montañas de la bóveda).
