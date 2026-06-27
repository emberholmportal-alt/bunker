# REFUGIO 404 — ARQUITECTURA DEL BACKEND (CEREBRO CENTRAL)

> Documento de arquitectura **para revisar antes de construir**. NO hay código del backend todavía.
> Esto es el plano: costo, stack, flujo, esquema de DB, cambios en el búnker actual, seguridad y plan por fases.
> Pricing de Render verificado en junio 2026 (ver fuentes al final). Lo revisamos, lo ajustamos, y recién
> después arrancamos la Fase 1.

---

## 0. Resumen ejecutivo (TL;DR)

- **Costo recomendado para producción 24/7: ~US$13/mes** = Web Service *Starter* ($7) + Postgres *Basic-256mb* ($6).
- **Se puede arrancar gratis ($0)** para construir y probar, pero el plan gratis **no sirve para el stream 24/7**
  (el web service se duerme a los 15 min → cold start de 30–60 s; la DB gratis se borra a los 30 días).
- **El frontend (el búnker) ya está casi listo para esto.** Todo el estado vive en un objeto único, `STREAM`,
  diseñado a propósito como "el reloj es el driver por defecto, **no la única fuente**". Migrar = **cambiar el
  driver** de "reloj local del navegador" a "estado del backend". El render 3D y el overlay **no se tocan**.
- **Stack recomendado: FastAPI (Python) + PostgreSQL + SQLAlchemy**, desplegado como Web Service en Render,
  con un tick de simulación adentro del mismo servicio (no hace falta un cron aparte al inicio).
- **Comunicación: REST con polling cada ~4 s**, respuesta `/state` cacheada 1–2 s en el CDN → 1 o 1000
  espectadores cuestan casi lo mismo. WebSockets quedan como mejora futura, no son necesarios para arrancar.
- **Seguridad:** el frontend público **solo LEE** (`GET /state`). Escribir/forzar es **solo tuyo**, vía
  `POST /op/*` protegido con un **token de operador** que vive en una variable de entorno del backend y
  **nunca** está en el bundle público.

---

## 1. COSTO EN RENDER (lo primero)

### Servicios que hacen falta

| Servicio | Para qué | Plan | Costo/mes |
|---|---|---|---|
| **Static Site** (ya existe) | servir el búnker (`index.html`, `js/`, `css/`, `vendor/`, assets) | Free | **$0** |
| **Web Service** (nuevo) | el backend: API REST + tick de simulación (reloj/eventos/contadores/abejas) | **Starter** | **$7** |
| **PostgreSQL** (nuevo) | persistir el estado del mundo y el progreso de las abejas | **Basic-256mb** | **$6** |
| | | **TOTAL** | **≈ $13/mes** |

> El **Static Site** del búnker es gratis y global (CDN). Los **únicos costos nuevos** son el web service + la DB.

### Especificaciones y por qué esos planes

- **Web Service Starter — $7/mes:** 512 MB RAM, 0.5 vCPU, **always-on (no se duerme)**. Esto es lo crítico:
  un livestream 24/7 **no puede** tolerar el cold start de 30–60 s del plan Free. Nuestro backend es liviano
  (un tick por segundo + servir JSON chico), así que 512 MB/0.5 vCPU sobran.
- **Postgres Basic-256mb — $6/mes:** mínimo de producción. Incluye almacenamiento base; el extra cuesta
  **$0.30/GB/mes**. Nuestro dataset es minúsculo (unas pocas filas + un log de eventos), nunca vamos a pasar
  el incluido en años.

### Opción de arranque GRATIS (para construir, NO para producción)

| Recurso | Free | Limitación que nos importa |
|---|---|---|
| Web Service Free | $0 | **Se duerme a los 15 min de inactividad**, cold start 30–60 s. 750 horas/mes. Mata el stream continuo. |
| Postgres Free | $0 | **Expira 30 días** tras crearse (14 días de gracia, después se **borra con todos los datos**). 1 GB. |
| Bandwidth | 100 GB/mes incluidos | después **$15 por 100 GB** extra. |

**Recomendación:** construir y testear las Fases 1–4 en **Free** ($0), y **subir a Starter+Basic ($13/mes) antes
de poner el stream en vivo permanente**. La migración de Free→pago en Render es un clic, sin cambiar código.

### Bandwidth (importante para un stream con muchos espectadores)

El backend solo sirve un JSON chico (`/state`, ~1–2 KB). Con polling cada 4 s:

- 1 espectador ≈ 2 KB × 15/min × 60 × 24 ≈ **~40 MB/día**.
- **El truco:** cacheamos `/state` **1–2 s en el CDN de Render** (`Cache-Control: public, max-age=2`).
  Así **N espectadores comparten 1 sola lectura al origen cada 2 s**. 1 o 5.000 espectadores → el origen
  sirve lo mismo (~1 req cada 2 s = ~43.000/día), y el CDN absorbe el resto **gratis** dentro del bandwidth.
- Conclusión: con caching, el bandwidth se mantiene **muy por debajo** de los 100 GB incluidos, casi sin
  importar la audiencia. Sin caching, 1.000 espectadores te comerían el free tier rápido → **el caching es
  parte de la arquitectura, no un extra.**

### Costo a futuro si escala

- Si el backend necesitara más músculo (no al inicio): **Standard $25/mes** (2 GB/1 vCPU). No hace falta para esto.
- Cron Jobs de Render existen y se facturan por uso (segundos de cómputo). **No los necesitamos**: el tick va
  adentro del web service. Quedan como opción si algún día querés separar el "scheduler".

**Número para decidir: ~$13/mes** (o $0 mientras construimos). Si esto cierra, seguimos.

---

## 2. ARQUITECTURA GENERAL

### Stack del backend

**FastAPI (Python) + PostgreSQL + SQLAlchemy.** Por qué:

- Estás cómodo con **Python/Flask/FastAPI + PostgreSQL** → cero curva nueva.
- **FastAPI** sobre Flask: async nativo (maneja muchos polls concurrentes mejor), validación con Pydantic
  (los comandos del operador se validan solos), docs automáticas (`/docs`) que te sirven de panel de pruebas.
- **SQLAlchemy** para el ORM + **Alembic** para migraciones de esquema.
- Servidor: **Uvicorn**. Un solo proceso, un tick de fondo (asyncio task) que avanza la simulación.

### Cómo se comunica el búnker con el backend

**REST + polling**, no WebSockets (al inicio):

```
  Espectador (browser, búnker estático)
        │  GET /state   cada ~4 s   (solo LEE)
        ▼
   CDN de Render  ──(cache 1–2 s)──►  Web Service (FastAPI)  ◄──►  Postgres
        ▲                                   ▲
        │                                   │  POST /op/*  (solo VOS, con token)
   Operador (vos) ───────────────────────────┘
```

- **Por qué polling y no WebSockets:** para un livestream contemplativo (el reloj corre, un evento cada varios
  minutos, las abejas avanzan lentísimo) **no necesitás push instantáneo**. Polling cada 4 s + interpolación
  local es más simple, más barato, más robusto (reconecta solo) y cachea trivial. WebSockets agregan estado
  de conexión, escalado más caro y complejidad que no rinde acá. **Quedan como mejora futura** si algún día
  querés reacciones sub-segundo.
- **Interpolación local (clave para que se vea fluido):** el frontend **no** pollea 60 veces por segundo. Pollea
  cada 4 s y **entre polls avanza solo** lo continuo (el reloj tickea localmente con `dt*speed`, el robot camina,
  el head-bob). En cada poll **re-sincroniza** con el servidor (corrige drift). Es exactamente lo que hoy hace
  `streamTick`, pero sembrado desde el server en vez de `Date.now()`.

### El reloj y los eventos: ¿quién calcula qué?

- **El backend es la fuente de verdad.** Calcula y persiste: tiempo central, qué evento está activo (y cuándo
  empieza/termina), los contadores canónicos y el progreso de las abejas.
- **El frontend solo muestra.** Lee `/state`, lo refleja en `STREAM`, y deja que el render 3D/overlay (que ya
  leen de `STREAM`) hagan lo suyo. Lo "cosmético y rápido" (posición exacta del robot, ripple del medidor de
  carga, partículas) lo sigue calculando el browser para que se vea suave — pero **lo compartido y persistente
  lo dicta el server**, así **todos los espectadores ven lo mismo, sincronizado**.

Flujo de un evento (temblor), por ejemplo:
1. El tick del backend decide "temblor ahora", escribe en DB `current_event=quake`, `event_ends_at=now+13s`.
2. `/state` empieza a devolver `event:"quake"` con su ventana de tiempo.
3. Cada frontend, al pollear, ve `STREAM.event` cambiar a `"quake"` → dispara **el arco visual local** que ya
   existe (luces rojas, shake, audio, badge `⚠ SEISMIC EVENT`, reacción de Beeko).
4. El backend, cuando `now > event_ends_at`, limpia el evento. El próximo `/state` trae `event:""` → cada
   frontend cierra el arco. **Todos ven el mismo temblor, al mismo tiempo, con el mismo largo.**

---

## 3. QUÉ MANEJA EL BACKEND (detallado)

### 3.1 El TIEMPO (reloj/día central)

- La DB guarda un **`lore_epoch`** (timestamp UTC del lanzamiento) + **`speed`** + **`offset_ms`** (acumulado por
  fast-forwards/saltos del operador). Es **idéntico al modelo de hoy** (`LORE_EPOCH`, `speed`, `offsetMs`), pero
  movido al server.
- El backend computa `now = lore_epoch + tiempo_real_transcurrido*speed + offset_ms` y `day = floor((now-epoch)/día)`.
- `/state` devuelve `now_ms`, `day`, `speed`. El frontend **siembra** `STREAM.now` con eso y **avanza local**
  entre polls; en cada poll corrige el drift contra `now_ms` del server.
- **Resultado:** todos los espectadores ven el **mismo reloj y el mismo día**, sincronizados al server (con
  tolerancia de unos pocos segundos de skew, imperceptible para este reloj). Hoy cada browser arranca su propio
  `Date.now()` → cada uno ve un día distinto. Esto lo arregla.

### 3.2 Los EVENTOS (temblores / fallos)

- **El backend decide.** Un scheduler en el tick elige el próximo evento con un gap aleatorio
  (hoy `EV_GAP_MIN/MAX = 180/360 s`) y, al dispararlo, persiste `current_event`, `event_started_at`,
  `event_ends_at` en DB y lo agrega a `events_log`.
- `/state` expone el evento activo. El frontend lo refleja en `STREAM.event` y **dispara el arco visual que ya
  está cableado a `STREAM.event`** (no cambia la parte visual; ya la hicimos así).
- El operador puede **forzar** un evento (`POST /op/event quake`) → el server lo activa para **todos**.
- **Por qué centralizado:** hoy cada browser tira sus propios `Math.random()` → dos espectadores ven temblores
  en momentos distintos. Centralizar = un solo temblor compartido.

### 3.3 Los CONTADORES (charge / bees / beesReleased / print)

- **El backend los calcula y persiste** como estado canónico (los que importan para que todos coincidan).
- Matiz importante de diseño — **dos velocidades**:
  - **Canónico/persistente (server):** `bees_released` (motor del despertar), `bees` (cría), y el macro de
    `charge`/`print` (el valor "oficial").
  - **Cosmético/rápido (browser):** el ripple del medidor, la animación de la pieza imprimiéndose, la barra
    que sube suave. El frontend interpola entre los checkpoints del server para que se vea vivo sin pollear 60 fps.
- La **rutina del robot** (cuándo carga, cuándo cosecha, cuándo libera un enjambre) pasa a ser **decidida por el
  server** (es parte de la simulación compartida). El frontend anima al robot, pero los **contadores** los dicta
  el backend. Así dos espectadores ven a Beeko liberando el **mismo** enjambre número 47 al mismo tiempo.

### 3.4 EL OBJETIVO DE LAS ABEJAS (el despertar del mundo) — lo más importante

**Qué es:** un progreso **persistente y lentísimo** que avanza con cada enjambre liberado y representa que el
mundo de afuera "revive de a poco". Se acumula a lo largo de **semanas/meses reales** y **sobrevive reinicios**
(vive en la DB). Es la semilla del misterio central (ya plantada en las frases `awakening` de Beeko).

**Modelo en la base de datos:**
- `bees_released` (entero, **monotónico**, persistente): total de enjambres liberados desde el día 0. Lo
  incrementa la rutina (el server agenda liberaciones, p. ej. +1 cada ~N horas de stream) y/o el operador.
- `awakening_progress` (numérico `0.0 → 1.0`): el progreso del despertar. **Derivado** de `bees_released` con una
  **curva de rendimientos decrecientes**, calibrada para que llegar "lejos" lleve el tiempo objetivo (semanas).
  Ejemplo de mecánica (a calibrar): `p = 1 − exp(−bees_released / K)` — cada enjambre suma, pero cada vez menos,
  así nunca "se termina" de golpe y el avance se siente perpetuo.
- `awakening_milestones` (tabla/log): cada vez que `p` cruza un umbral (0.1, 0.25, 0.5, …) se registra el hito
  **con su timestamp** (irreversible). Los hitos son lo que va **desbloqueando señales** sin revelar nada.

**Qué representa el progreso (mecánica, sin spoilear el misterio):**
- `p` es una **variable oculta** que **modula la frecuencia y el contenido de las pistas** del despertar:
  - Con `p` bajo: las transmisiones/pensamientos `awakening` salen rarísimo (como ahora, ~1/6 al deambular),
    todas en tono "probably nothing".
  - A medida que `p` sube: las pistas `awakening` salen un poco más seguido y se habilitan frases nuevas
    (cada hito desbloquea un sub-set), pero **Beeko las sigue descartando** — el espectador conecta los puntos,
    no se revela nada explícito.
- **En el frontend se ve como:** nada de barras de progreso ni números. El despertar se "siente" en la
  **atmósfera** — la cadencia y el contenido de las pistas, quizá un matiz sutil (un grado más de algo) que
  el server modula. La **mecánica** está definida (p gobierna las pistas); **el reveal** se diseña aparte, más
  adelante. Por ahora: `p` persiste, sube con `bees_released`, gobierna el "dial" de las pistas.

**Por qué en DB y no determinístico:** podría calcularse como función pura del tiempo (barato, sin escrituras),
pero perdería (a) que las acciones del operador queden grabadas y acumulen de verdad, (b) la posibilidad de que
el progreso no sea perfectamente predecible, (c) un log de hitos con fechas reales. Persistirlo en Postgres da
**acumulación real a lo largo de semanas, a prueba de reinicios** — que es exactamente lo que pediste.

---

## 4. CAMBIOS NECESARIOS EN EL BÚNKER ACTUAL

**La buena noticia:** el frontend ya está estructurado para esto. Todo pasa por `STREAM`, y el diseño dice
explícito *"el reloj es el DRIVER POR DEFECTO, no la única fuente"*. Migrar = **cambiar el driver**, no reescribir.

| Parte actual | Hoy hace | Cambio | Tamaño |
|---|---|---|---|
| **`js/sync.js`** (nuevo) | — | Pollea `GET /state` cada ~4 s y aplica los campos del server a `STREAM` (un `streamApplyServer(state)`). Maneja reintentos/offline. | **Nuevo, chico** (S) |
| **`js/stream.js`** → `streamTick` | deriva el tiempo de `Date.now()+offset` local | Sembrar `STREAM.now/day/speed` desde el server; seguir avanzando local entre polls y re-sincronizar en cada poll. `driveFromClock` pasa a "drive desde server". | **Editar, chico** (S) |
| **`game.js` — scheduler de eventos** (`eventTick`/`startEvent`/`EV_GAP_*`) | el browser tira `Math.random()` y decide eventos | **Sacar el scheduler local.** El arco visual (luces/shake/audio/badge) **se queda igual**, disparado por el cambio de `STREAM.event` (ya está así). | **Editar, medio** (M) — es sacar, no agregar |
| **`game.js` — contadores** (carga/cría/liberación/print en la rutina) | la rutina local escribe `charge/bees/beesReleased/print` vía `streamDrive` | Los **valores canónicos** vienen del server (sync los escribe en `STREAM`). La rutina local deja de ser la fuente; la animación del robot se mantiene. | **Editar, medio** (M) |
| **`__REFUGIO` / `OP.*`** (override del operador) | `streamForce` local (solo en tu browser) | Cada `OP.setX/forceSegment/quake/...` hace `POST /op/*` con token → el server aplica el override para **todos**. Se mantiene un **fallback local** para dev/offline. | **Editar, medio** (M) |
| **`config.js` / nuevo** | — | Una constante `BACKEND_URL` + el modo (local vs server) detrás de un **feature flag** para poder volver a modo local si el backend se cae. | **Nuevo, chico** (S) |

**Lo que NO se toca:** todo el render 3D, las texturas, el overlay (CRT/CAM/STATUS/transmisión), el robot, las
poses, el crafteo (código muerto), la herramienta `OP.arm`. Leen de `STREAM` y siguen igual.

**Convivencia con tus comandos `OP.*` (importante):** seguís pudiendo forzar todo. El override **se mueve al
server**: hoy `OP.setDay(120)` cambia solo tu pantalla; con el backend, `OP.setDay(120)` hace `POST /op/force
{field:"day", value:120}` y **todos los espectadores** ven el día 120. El mecanismo `_force` por campo que ya
existe se replica en el server (un campo forzado por el operador no lo pisa el tick) — el modelo conceptual es
**idéntico**, solo cambia dónde vive. Además: un **modo local de respaldo** (sin token / backend caído) deja que
`OP.*` siga forzando tu browser para debug, como hoy.

**Estimación total del trabajo de migración del frontend:** chico-a-medio. Es **1 archivo nuevo (`sync.js`) +
ediciones quirúrgicas** en `stream.js`, `game.js` y el bloque `__REFUGIO`. Nada de reescribir el motor.

---

## 5. SEGURIDAD

**Principio:** el público **solo lee**; **solo vos** escribís/forzás.

- **Lectura (pública):** `GET /state` es abierto, read-only, cacheado. No expone ninguna vía de escritura.
- **Escritura (solo operador):** todos los `POST /op/*` exigen un header `Authorization: Bearer <OPERATOR_TOKEN>`.
  - El **`OPERATOR_TOKEN`** vive en una **variable de entorno del backend en Render** (Secret). **Nunca** está en
    el bundle público ni en el repo. El frontend público **no lo tiene** → no puede escribir aunque alguien lea
    todo el JS.
  - Vos lo usás desde tu lado: o un **panel de operador separado** (una página privada que te pide el token una
    vez y lo guarda en *tu* `localStorage`), o pegándolo una vez en la consola (`OP.auth('…')`) en tu máquina.
    El token **solo existe en tu cliente**, nunca se publica.
- **El sello actual `__r01('colmena-404')` es solo UX.** Hoy "esconde" `OP` en el cliente, pero cualquiera que
  lea el JS encuentra la llave → **no es seguridad real**. Con el backend, la seguridad de verdad es el **token
  del server**: aunque alguien encuentre `OP`, sin el token sus `POST /op/*` rebotan con `401`. La llave cliente
  queda como gesto estético; el guardia real está en el server.
- **Endurecimiento:**
  - **HTTPS** siempre (Render lo da gratis con TLS).
  - **CORS:** `GET /state` permitido desde el origen del búnker; `/op/*` gateado por token (y opcionalmente
    restringido por origen/IP).
  - **Rate limiting** en `/op/*` (anti fuerza bruta del token).
  - **Audit log** (`op_audit`): cada comando del operador se registra (qué, cuándo, desde dónde).
  - **Token largo y aleatorio** (>32 bytes), rotable cambiando la env var (sin deploy de código).

---

## 6. ESQUEMA DE BASE DE DATOS

Minimalista (el estado es chico). Postgres.

```
─ world  (singleton: el estado del mundo, una sola fila id=1) ──────────────
  id              int  PK  (siempre 1)
  lore_epoch      timestamptz   -- día 0 del lore
  speed           int           -- 1 / 800 / 6000 (multiplicador del operador)
  offset_ms       bigint        -- acumulado por fast-forwards/saltos
  current_event   text          -- '' | 'quake' | 'blackout'
  event_started_at timestamptz  -- null si no hay evento
  event_ends_at   timestamptz
  bees            int           -- cría (brood) actual
  bees_released   int           -- enjambres liberados (monotónico)
  charge          numeric        -- 0..100 (macro)
  print           numeric        -- 0..100 (macro)
  zone            text          -- sala/cámara activa (rutina del robot)
  action          text          -- qué hace el robot
  broadcasting    bool          -- radio transmitiendo
  updated_at      timestamptz

─ overrides  (qué campos forzó el operador, equivalente al _force) ─────────
  field           text PK       -- 'day','event','charge',...
  value           jsonb         -- valor forzado
  set_at          timestamptz
  -- presencia de fila = campo forzado; el tick no lo pisa hasta que se borra (release)

─ bee_progress  (el despertar — persistente, acumula por semanas) ──────────
  id              int PK (=1)
  progress        numeric       -- 0.0 .. 1.0 (variable oculta del despertar)
  updated_at      timestamptz

─ awakening_milestones  (hitos cruzados, irreversibles, con fecha) ─────────
  threshold       numeric PK    -- 0.1, 0.25, 0.5, ...
  reached_at      timestamptz

─ events_log  (historial de eventos, para auditoría/analytics) ────────────
  id              bigserial PK
  kind            text          -- 'quake' | 'blackout'
  started_at      timestamptz
  ended_at        timestamptz
  forced          bool          -- ¿lo disparó el operador?

─ op_audit  (log de comandos del operador — seguridad) ────────────────────
  id              bigserial PK
  at              timestamptz
  action          text          -- 'force','release','event','releaseSwarm',...
  payload         jsonb
  source_ip       text
```

> `bees_released` está en `world` (es estado vivo) y `progress` se deriva de él en `bee_progress` (separado para
> dejar claro qué es "el motor" vs "el objetivo"). Se puede unificar; lo separo para que el modelo se lea solo.

---

## 7. PLAN DE CONSTRUCCIÓN POR FASES

Cada fase es **desplegable y verificable sola**, detrás de un **feature flag** en el frontend (`USE_BACKEND`)
para que el búnker en vivo **siga andando en modo local** mientras construimos.

### Fase 0 — Infra y esqueleto
- Crear el Web Service (FastAPI) + Postgres en Render (Free para empezar). `GET /health`. `GET /state` devolviendo
  un stub con los campos que hoy tiene `STREAM`. Conexión a DB + Alembic con la tabla `world`.
- **Verificación:** `/health` responde en producción; `/state` devuelve JSON; la DB conecta y persiste una fila.

### Fase 1 — Reloj central
- `world` guarda `lore_epoch/speed/offset_ms`. El tick computa `now/day`. `/state` los expone. `js/sync.js`
  siembra `STREAM.now/day` y `streamTick` re-sincroniza. `POST /op/setDay` y `/op/setSpeed`.
- **Verificación:** abrir el búnker en **dos browsers** → muestran el **mismo día/hora**. `OP.setDay(120)` cambia
  **los dos** (no solo el tuyo). Cerrar y reabrir → el tiempo siguió corriendo en el server.

### Fase 2 — Eventos
- Scheduler de eventos en el tick (gap 180–360 s), persiste en `world` + `events_log`. `/state` expone el evento
  activo. El arco visual del frontend (ya cableado a `STREAM.event`) lo refleja. `POST /op/event`.
- **Verificación:** en dos browsers, el **mismo temblor aparece al mismo tiempo** y dura lo mismo. `OP.quake()`
  lo fuerza para ambos. Tras el evento, los dos vuelven a la normalidad limpios.

### Fase 3 — Contadores
- El server vuelve canónicos `charge/bees/bees_released/print` (+ `zone/action/broadcasting`). `sync.js` los
  escribe en `STREAM`; el frontend interpola lo cosmético. `POST /op/setCharge`, etc.
- **Verificación:** los contadores coinciden entre espectadores; `OP.setBeesReleased(50)` se ve en todos;
  los valores persisten al reiniciar el server.

### Fase 4 — Objetivo de las abejas (el despertar)
- `bee_progress.progress` derivado de `bees_released` con la curva (a calibrar); `awakening_milestones` al cruzar
  umbrales. El frontend usa `progress` (vía `/state`) para **modular la frecuencia/contenido de las pistas
  `awakening`** (sin revelar nada). `POST /op/releaseSwarm` incrementa y avanza el progreso.
- **Verificación:** liberar enjambres **sube `progress`**; **reiniciar el server NO lo resetea** (persiste en DB);
  al cruzar un umbral queda registrado el hito con fecha; las pistas `awakening` salen un toque más seguido a
  mayor `progress`. Probar la persistencia a lo largo de varios días/reinicios.

### Fase 5 — Seguridad y hardening (antes del vivo permanente)
- Token de operador en `/op/*` (env var), `op_audit`, rate limiting, CORS, `Cache-Control` en `/state` (CDN 1–2 s).
  Subir de Free → **Starter + Basic ($13/mes)**.
- **Verificación:** un cliente sin token recibe `401` en cualquier `/op/*`; con token, OK; `/state` se sirve
  cacheado (mismo `ETag`/edad → 1 fetch al origen para muchos espectadores); el audit log registra tus comandos.

### (Futuro, opcional) Fase 6 — Mejoras
- WebSockets para reacciones sub-segundo, panel de operador web dedicado, analytics del despertar, el **reveal**
  del misterio cuando `progress` llegue al final.

---

## Notas finales para la revisión

- **Decisión abierta 1 — granularidad de la rutina del robot:** ¿el server decide cada micro-acción del robot
  (caminar a tal nodo) o solo el macro (qué tramo: carga/colmena/...) y el frontend resuelve el detalle? Propongo
  **macro en el server, detalle en el browser** (más barato, igual de sincronizado para lo que importa). A definir.
- **Decisión abierta 2 — `LORE_EPOCH`:** hoy es `Date.now()` (placeholder). Al activar el backend hay que **fijar
  el epoch real del lanzamiento** una sola vez en la DB (no backdatear). Lo coordinamos en la Fase 1.
- **Decisión abierta 3 — curva del despertar (`K`):** definir cuántos enjambres = cuánto progreso, para que
  "semanas reales" dé el ritmo que querés. Es un número a calibrar en la Fase 4.

---

### Fuentes (pricing Render, junio 2026)
- [Render — Pricing](https://render.com/pricing)
- [Render Docs — Deploy for Free (límites del free tier)](https://render.com/docs/free)
- [Render Docs — Flexible Plans for Render Postgres](https://render.com/docs/postgresql-refresh)
- [Costbench — Render plans & specs 2026](https://costbench.com/software/developer-tools/render/)
- [Costbench — Render free plan / paid starts $7](https://costbench.com/software/developer-tools/render/free-plan/)
