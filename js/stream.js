// REFUGIO 404 — ESTADO CENTRAL DEL STREAM (backbone)
  // Objeto ÚNICO de estado del que se derivan overlay, split-flap, cámara y (a futuro)
  // la rutina del robot y los contadores de abejas. Por defecto AVANZA con el reloj real
  // (UTC), pero está EXPUESTO y es modificable desde afuera: la futura PÁGINA ADMIN puede
  // forzar la zona, saltar una acción o cambiar un contador en vivo.
  //
  // PRINCIPIO: el reloj es el DRIVER POR DEFECTO, no la única fuente.
  // REGLA DE ORO: el resto del código lee de STREAM.*, NUNCA de Date.now() directo.

  const DAY_MS = 86400000;

  // Epoch del lore en UTC. Arranca en CERO el día del lanzamiento: día 0 ese día y sube en
  // tiempo real. NO backdatear.
  // TODO LANZAMIENTO: reemplazar el placeholder por el timestamp UTC exacto del lanzamiento,
  // p.ej.:  const LORE_EPOCH = Date.UTC(2026, 0, 1, 0, 0, 0);  // (año, mes 0-11, día, h, m, s) en UTC
  const LORE_EPOCH = Date.now(); // PLACEHOLDER: hoy => arranca en día 0. Cambiar al lanzar.

  const STREAM = {
    // --- driver del tiempo ---
    driveFromClock: true, // false = congelado / bajo control de la admin (el driver no toca nada)
    speed: 1,             // multiplicador de OPERADOR (1 / 800 / 6000) para testear la rutina sin esperar horas reales
    offsetMs: 0,          // tiempo extra acumulado por fast-forward o por saltos de la admin

    // --- tiempo derivado (no escribir a mano; sale del driver) ---
    now: Date.now(),      // ms UTC efectivos del stream  (base = Date.now() + offsetMs)
    day: 0,               // DÍAS SOLO = floor((now - LORE_EPOCH) / DAY_MS)

    // --- mundo del robot ---
    zone: 'observatorio', // cámara/sala activa. F1: la reporta game.js según el robot. F2: la fija la rutina.
    action: 'idle',       // qué está haciendo el robot (se usa en F2)

    // --- contadores (se usan en F3) ---
    bees: 0,              // abejas en cría
    beesReleased: 0,      // enjambres liberados (acumulado)

    // --- sector de carga ---
    charge: 0,            // nivel de carga del robot 0..100 (lo alimenta la rutina en F2; el medidor de la sala lo LEE)

    // --- sala de fabricación (impresoras 3D) ---
    print: 0,             // progreso de la pieza en impresión 0..100 (auto-cicla en F1; lo manejará la rutina en F2; la pieza lo LEE)

    // --- override por campo: si un campo está forzado, el driver NO lo pisa ---
    _force: { day:false, zone:false, action:false, bees:false, beesReleased:false, charge:false, print:false }
  };

  // El driver escribe un campo SOLO si nadie lo forzó desde afuera (admin).
  function streamDrive(field, val){ if(!STREAM._force[field]) STREAM[field] = val; }

  // Tick del driver. Lo llama el loop una vez por frame con el delta real en segundos.
  // Avanza el tiempo (UTC real con speed=1; acelerado para testear con speed>1) y deriva el día.
  // zone/action/bees los escriben sus dueños (game.js / rutina / F3), no este tick.
  function streamTick(dtSec){
    if(!STREAM.driveFromClock) return;                                   // la admin tomó control: no piso nada
    if(STREAM.speed !== 1 && dtSec > 0) STREAM.offsetMs += dtSec * 1000 * (STREAM.speed - 1); // acumula SOLO el extra
    STREAM.now = Date.now() + STREAM.offsetMs;                           // speed=1 y offset=0 => UTC real exacto, sin drift
    streamDrive('day', Math.max(0, Math.floor((STREAM.now - LORE_EPOCH) / DAY_MS)));
  }

  // --- Lecturas derivadas (todas en UTC, desde STREAM.now) ---
  // Hora del día UTC como fracción 0..24 (driver de la rutina determinística en F2).
  function streamHourUTC(){ const d = new Date(STREAM.now); return d.getUTCHours() + d.getUTCMinutes()/60 + d.getUTCSeconds()/3600; }
  // Timestamp HH:MM:SS UTC para el overlay (corrección #4: horas y minutos corren en el overlay).
  function streamClock(){ const d = new Date(STREAM.now);
    return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+':'+String(d.getUTCSeconds()).padStart(2,'0'); }
  // Cronómetro del LIVE: ms transcurridos desde el inicio (now - LORE_EPOCH). MISMO origen que día/timestamp,
  // así responde igual a la velocidad de testeo y a los overrides de consola. DISTINTO del reloj UTC del overlay.
  function streamUptime(){ return Math.max(0, STREAM.now - LORE_EPOCH); }

  // --- API de OPERADOR / ADMIN (los primeros controles de operador; los hereda la admin) ---
  // Forzar un campo lo SACA del control del driver hasta streamRelease(campo).
  function streamForce(field, val){ if(!(field in STREAM)) return; STREAM[field] = val; if(field in STREAM._force) STREAM._force[field] = true; }
  function streamRelease(field){ if(field in STREAM._force) STREAM._force[field] = false; } // devuelve el campo al driver
  function streamSetSpeed(mult){ STREAM.speed = (mult > 0) ? mult : 1; }                    // velocidad (operador / testeo de rutina)
  function streamFreeze(){ STREAM.driveFromClock = false; }                                 // congela el tiempo
  function streamResume(){ STREAM.driveFromClock = true; }                                  // reanuda desde el reloj
  function streamResync(){ STREAM.offsetMs = 0; STREAM.speed = 1; STREAM.driveFromClock = true; } // vuelve a UTC real puro

  // game.js (F1) y la rutina (F2) reportan zona/acción del robot SIN pisar un override de admin.
  function streamReportZone(z){ streamDrive('zone', z); }
  function streamReportAction(a){ streamDrive('action', a); }

  // Hook único para la futura PÁGINA ADMIN:  window.__REFUGIO.setZone('taller'), .setDay(120), etc.
  window.__REFUGIO = {
    state: STREAM,
    force: streamForce, release: streamRelease,
    setSpeed: streamSetSpeed, freeze: streamFreeze, resume: streamResume, resync: streamResync,
    setZone: z => streamForce('zone', z),
    setAction: a => streamForce('action', a),
    setDay: d => streamForce('day', d),
    setBees: n => streamForce('bees', n),
    setBeesReleased: n => streamForce('beesReleased', n),
    setCharge: n => streamForce('charge', Math.max(0, Math.min(100, n))), // medidor del sector de carga (0..100)
    setPrint: n => streamForce('print', Math.max(0, Math.min(100, n))),   // progreso de impresión de la sala de fabricación (0..100)
    // Encendido de audio del operador. sound(true)/sound(false) o toggle sound(). OJO: por la política de autoplay del navegador,
    // resume() desde la CONSOLA suele NO contar como gesto válido → ceba el AudioContext pero puede quedar 'suspended' (sin sonido)
    // hasta el 1er click/tecla en la página (que sí lo desbloquea, vía el listener global). Por eso van las dos vías.
    sound: on => { if(typeof startAudio!=='function') return false; const cur=(typeof audioOn!=='undefined')&&audioOn;
      const want=(on===undefined)?!cur:!!on; if(want)startAudio(); else if(typeof stopAudio==='function')stopAudio();
      return (typeof audioOn!=='undefined')&&audioOn; },
    clock: streamClock, hourUTC: streamHourUTC
  };
