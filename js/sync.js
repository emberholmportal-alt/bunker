// EL BÚNKER — SYNC con el backend. Detrás de FEATURE FLAGS, APAGADOS por defecto.
//
//   Con TODO apagado (default): no toca el backend. El búnker corre 100% local, idéntico a antes → stream en vivo intacto.
//
//   FASE 1 (reloj):   OP.backend('https://TU-BACKEND.onrender.com')  conecta + reloj del server   ·  OP.backend(false) desconecta todo
//   FASE 2 (agenda):  OP.serverAgenda(true)  el tramo de rutina (carga/colmena/...) sale del server  ·  OP.serverAgenda(false) vuelve local
//   ESTADO:           OP.backend()           (muestra reloj + agenda)
//   Todo se guarda por navegador (localStorage) y sobrevive recargas.
//
//   FALLBACK: si el server no responde ~3 polls seguidos → modo DEGRADADO: el frontend vuelve a la lógica LOCAL
//             (agenda local; el reloj sigue avanzando solo) aunque el flag esté ON. Al volver el server, retoma.
//
// Carga DESPUÉS de stream.js (usa STREAM/streamResync) y ANTES de game.js (para envolver/exponer antes del sello).
  (function(){
    const LS = 'refugio_backend';
    const DEGRADE_FAILS = 3;                                   // polls fallidos seguidos para entrar en modo degradado (~12 s)
    const SYNC = { on:false, agenda:false, events:false, counters:false, awakening:false, url:'', token:'', timer:null, fails:0 };
    const _cfg = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : ''; // default opcional desde config.js (vacío = off)
    const _base = () => SYNC.url.replace(/\/+$/,'');
    const degraded = () => SYNC.fails >= DEGRADE_FAILS;
    const agendaActive = () => SYNC.on && SYNC.agenda && !degraded();   // ¿la agenda sale del server AHORA?
    const eventsActive = () => SYNC.on && SYNC.events && !degraded();   // ¿los eventos salen del server AHORA?
    const countersActive = () => SYNC.on && SYNC.counters && !degraded(); // ¿los contadores salen del server AHORA?
    const awakeningActive = () => SYNC.on && SYNC.awakening && !degraded(); // ¿el despertar lo manda el server AHORA?

    function save(){ try{ localStorage.setItem(LS, JSON.stringify({on:SYNC.on, agenda:SYNC.agenda, events:SYNC.events, counters:SYNC.counters, awakening:SYNC.awakening, url:SYNC.url, token:SYNC.token})); }catch(e){} }
    function apply(st){
      if(!st) return;
      // reloj (cuando hay conexión): siempre — conectar = reloj del server (Fase 1)
      if(typeof st.now_ms === 'number') STREAM.now = st.now_ms;
      if(typeof st.day === 'number')   STREAM.day = st.day;
      if(typeof st.speed === 'number') STREAM.speed = st.speed;
      // agenda (sólo si el flag está ON): string = tramo · null = deambular
      if(SYNC.agenda && ('segment' in st)) STREAM.segment = st.segment;
      // eventos (sólo si el flag está ON): el arco visual del frontend sigue a STREAM.event
      if(SYNC.events && ('event' in st)){
        STREAM.event = st.event || '';
        STREAM.eventElapsed = st.event_elapsed_ms || 0;
        STREAM.eventDur = st.event_dur_ms || 0;
        STREAM.eventsEnabled = !!st.events_enabled;
      }
      // contadores (sólo si el flag está ON): charge directo, beesReleased redondeado para el overlay;
      // bees/print van a _beesTarget/_printTarget — el loop los sigue y detecta el salto para el surge / cambio de pieza
      if(SYNC.counters){
        if(typeof st.charge === 'number')        STREAM.charge = st.charge;
        if(typeof st.bees_released === 'number') STREAM.beesReleased = Math.round(st.bees_released);
        if(typeof st.bees === 'number')          STREAM._beesTarget = st.bees;
        if(typeof st.print === 'number')         STREAM._printTarget = st.print;
      }
      // despertar (sólo si el flag está ON): el frontend usa la etapa para modular los pensamientos awakening
      if(SYNC.awakening){
        if(typeof st.awakening_stage === 'number')    STREAM.awakeningStage = st.awakening_stage;
        if(typeof st.awakening_progress === 'number') STREAM.awakeningProgress = st.awakening_progress;
      }
    }
    async function poll(){
      if(!SYNC.on) return;
      try{ const r = await fetch(_base()+'/state', {cache:'no-store'}); if(!r.ok) throw new Error(r.status); apply(await r.json()); SYNC.fails = 0; }
      catch(e){ SYNC.fails++; if(SYNC.fails === DEGRADE_FAILS) console.warn('[sync] backend no responde: paso a modo LOCAL (degradado) hasta que vuelva', e+''); }
    }
    async function post(path, body){ // escrituras del operador. Devuelve el nuevo estado para aplicarlo al toque.
      const r = await fetch(_base()+path, {
        method:'POST',
        headers: Object.assign({'Content-Type':'application/json'}, SYNC.token ? {'X-Operator-Token':SYNC.token} : {}),
        body: JSON.stringify(body||{})
      });
      if(!r.ok) throw new Error('op '+r.status);
      return r.json();
    }
    function start(){ SYNC.on = true; STREAM.serverMode = true; SYNC.fails = 0; poll(); if(SYNC.timer) clearInterval(SYNC.timer); SYNC.timer = setInterval(poll, 4000); }
    function stop(){ SYNC.on = false; SYNC.agenda = false; SYNC.events = false; SYNC.counters = false; SYNC.awakening = false; STREAM.serverMode = false; STREAM.segment = undefined; STREAM.event = ''; STREAM._beesTarget = undefined; STREAM._printTarget = undefined; STREAM.awakeningStage = undefined; if(SYNC.timer){ clearInterval(SYNC.timer); SYNC.timer = null; } if(typeof streamResync === 'function') streamResync(); } // vuelve a TODO local

    // restaurar estado guardado (por navegador)
    try{ const s = JSON.parse(localStorage.getItem(LS) || 'null'); if(s){ SYNC.url = s.url || _cfg; SYNC.token = s.token || ''; SYNC.agenda = !!s.agenda; SYNC.events = !!s.events; SYNC.counters = !!s.counters; SYNC.awakening = !!s.awakening; if(s.on && SYNC.url) start(); } }catch(e){}
    if(!SYNC.url && _cfg) SYNC.url = _cfg;

    // ---- hooks internos que consulta game.js (routineSegment / forceSegment / eventTick / OP.quake...) ----
    window.__SYNC = {
      agendaActive: agendaActive,
      eventsActive: eventsActive,
      countersActive: countersActive,
      awakeningActive: awakeningActive,
      // OP.forceSegment en modo server: '__auto__'=liberar(a la hora) · null=deambular · 'ronda'/...=forzar
      postSegment: function(v){
        const seg = (v === '__auto__') ? 'auto' : v;
        post('/op/segment', {segment: seg}).then(apply).catch(e=>console.warn('[sync] segment', e+''));
        return 'segment → ' + (v === '__auto__' ? 'auto' : (v === null ? 'off (deambular)' : v)) + ' (server)';
      },
      // OP.quake/blackout en modo server → fuerza el evento en el backend (lo ven todos)
      postEvent: function(kind){ post('/op/event', {kind: kind}).then(apply).catch(e=>console.warn('[sync] event', e+'')); return kind + ' (server)'; },
      // OP.events(on/off) en modo server → togglea el dado automático del server
      postEvents: function(v){ const en = (v === undefined) ? !STREAM.eventsEnabled : !!v; post('/op/events', {enabled: en}).then(apply).catch(e=>console.warn('[sync] events', e+'')); return 'dado automático del server → ' + (en ? 'ON' : 'OFF'); }
    };

    // ---- comandos de operador (se enganchan a __REFUGIO antes de que game.js lo selle en OP) ----
    if(window.__REFUGIO){
      window.__REFUGIO.backend = function(a, b){
        if(a === undefined) return { on:SYNC.on, agenda:SYNC.agenda, events:SYNC.events, counters:SYNC.counters, awakening:SYNC.awakening, degraded:degraded(), url:SYNC.url||'(sin URL)', hasToken:!!SYNC.token };
        if(a === false){ stop(); save(); return 'backend OFF — TODO local (stream en vivo intacto)'; }
        if(a === true){ if(!SYNC.url) return 'falta la URL: OP.backend("https://TU-BACKEND.onrender.com")'; start(); save(); return 'backend ON — reloj desde '+SYNC.url; }
        if(typeof a === 'string'){ SYNC.url = a; if(typeof b === 'string') SYNC.token = b; start(); save(); return 'backend ON — reloj desde '+SYNC.url; }
        return 'uso: OP.backend("https://url"[, "token"])  |  OP.backend(false)  |  OP.backend()';
      };
      // FASE 2 — flag de AGENDA (requiere estar conectado)
      window.__REFUGIO.serverAgenda = function(on){
        const want = (on === undefined) ? !SYNC.agenda : !!on;
        if(want && !SYNC.on) return 'conectá primero: OP.backend("https://TU-BACKEND.onrender.com")';
        SYNC.agenda = want; if(!want) STREAM.segment = undefined; // off → routineSegment vuelve a lo local
        save(); if(want) poll();                                  // poll inmediato para sembrar el tramo
        return 'agenda ' + (want ? 'ON (desde el server)' : 'OFF (local)');
      };
      // FASE 2 — flag de EVENTOS (requiere estar conectado)
      window.__REFUGIO.serverEvents = function(on){
        const want = (on === undefined) ? !SYNC.events : !!on;
        if(want && !SYNC.on) return 'conectá primero: OP.backend("https://TU-BACKEND.onrender.com")';
        SYNC.events = want; if(!want) STREAM.event = '';          // off → el badge/arco vuelven a lo local
        save(); if(want) poll();                                  // poll inmediato para sembrar el evento activo
        return 'eventos ' + (want ? 'ON (desde el server)' : 'OFF (local)');
      };
      // FASE 3 — flag de CONTADORES (requiere estar conectado)
      window.__REFUGIO.serverCounters = function(on){
        const want = (on === undefined) ? !SYNC.counters : !!on;
        if(want && !SYNC.on) return 'conectá primero: OP.backend("https://TU-BACKEND.onrender.com")';
        SYNC.counters = want; if(!want){ STREAM._beesTarget = undefined; STREAM._printTarget = undefined; } // off → los contadores vuelven a lo local
        save(); if(want) poll();                                  // poll inmediato para sembrar los contadores
        return 'contadores ' + (want ? 'ON (desde el server)' : 'OFF (local)');
      };
      // comandos de CONTADORES (Fase 3): en modo server escriben al backend; en local, como siempre.
      const _setCharge = window.__REFUGIO.setCharge, _setBees = window.__REFUGIO.setBees, _setBeesReleased = window.__REFUGIO.setBeesReleased, _setPrint = window.__REFUGIO.setPrint;
      function _opCounter(name, v, localFn){ if(countersActive()){ post('/op/counter', {counter:name, value:+v}).then(apply).catch(e=>console.warn('[sync] counter', e+'')); return name+' → '+v+' (server)'; } return localFn(v); }
      window.__REFUGIO.setCharge = function(n){ return _opCounter('charge', n, _setCharge); };
      window.__REFUGIO.setBees = function(n){ return _opCounter('bees', n, _setBees); };
      window.__REFUGIO.setBeesReleased = function(n){ return _opCounter('beesReleased', n, _setBeesReleased); };
      window.__REFUGIO.setPrint = function(n){ return _opCounter('print', n, _setPrint); };
      // FASE 4 — flag del DESPERTAR (requiere estar conectado)
      window.__REFUGIO.serverAwakening = function(on){
        const want = (on === undefined) ? !SYNC.awakening : !!on;
        if(want && !SYNC.on) return 'conectá primero: OP.backend("https://TU-BACKEND.onrender.com")';
        SYNC.awakening = want; if(!want) STREAM.awakeningStage = undefined; // off → los pensamientos awakening vuelven a la lógica local (1/6)
        save(); if(want) poll();                                            // poll inmediato para sembrar la etapa
        return 'despertar ' + (want ? 'ON (etapa desde el server)' : 'OFF (local, 1/6 fijo)');
      };
      // saltar a una etapa para testear: OP.setAwakening(0.10/0.30/0.55/0.85) fuerza · OP.setAwakening('auto') libera (vuelve a la curva)
      window.__REFUGIO.setAwakening = function(x){
        if(!awakeningActive()) return 'activá primero: OP.serverAwakening(true)';
        const v = (x === 'auto' || x === undefined || x === null) ? null : Math.max(0, Math.min(1, +x));
        post('/op/awakening', {progress: v}).then(apply).catch(e=>console.warn('[sync] awakening', e+''));
        return 'awakening → ' + (v === null ? 'auto (curva)' : v) + ' (server)';
      };
      // RESET DESTRUCTIVO del mundo COMPARTIDO (escritura al backend blindado → exige token). Devuelve el estado a CERO:
      // día 0 + reloj a tiempo real, contadores charge/bees/beesReleased/print en 0, despertar en auto (curva), eventos forzados
      // limpiados + dado automático ON, segmento en auto. Lo ven TODOS los espectadores al instante. DOBLE PASO: sin 'CONFIRM' sólo
      // explica y NO toca nada; OP.resetWorld('CONFIRM') ejecuta. Requiere estar conectado como operador (OP.backend(url, token)).
      window.__REFUGIO.resetWorld = function(confirm){
        if(!SYNC.on) return 'conectá primero como operador: OP.backend("https://TU-BACKEND.onrender.com", "TOKEN")';
        if(!SYNC.token) return 'falta el TOKEN de operador (el reset es una ESCRITURA al backend blindado). Reconectá: OP.backend("https://TU-BACKEND.onrender.com", "TOKEN")';
        if(confirm !== 'CONFIRM') return [
          '⚠ DESTRUCTIVO — OP.resetWorld() borra el estado COMPARTIDO del livestream en el BACKEND y lo devuelve a CERO:',
          '   · día → 0 + reloj a tiempo real (speed 1)',
          '   · contadores charge / bees / beesReleased / print → 0',
          '   · despertar → auto (override liberado, vuelve a la curva)',
          '   · eventos → forzados limpiados + dado automático ON · segmento → auto (por hora)',
          '   (no borra el historial de eventos del backend; sí limpia el evento en curso)',
          'Lo ven TODOS los espectadores al instante. Para confirmar:  OP.resetWorld("CONFIRM")'
        ].join('\n');
        post('/op/reset', {}).then(apply).catch(e=>console.warn('[sync] reset', e+''));
        return 'RESET enviado al backend — el mundo compartido vuelve a CERO (día 0, contadores 0, despertar auto, eventos limpios, segmento auto). Verificá con OP.backend() y OP.state.';
      };
      // comandos de TIEMPO (Fase 1): en modo server escriben al backend; en local, como siempre.
      const _setDay = window.__REFUGIO.setDay, _setSpeed = window.__REFUGIO.setSpeed, _resync = window.__REFUGIO.resync;
      window.__REFUGIO.setDay = function(d){ if(SYNC.on){ post('/op/clock/setDay', {day:+d}).then(apply).catch(e=>console.warn('[sync] setDay', e+'')); return 'day → '+d+' (server)'; } return _setDay(d); };
      window.__REFUGIO.setSpeed = function(m){ if(SYNC.on){ post('/op/clock/setSpeed', {speed:+m}).then(apply).catch(e=>console.warn('[sync] setSpeed', e+'')); return 'speed → '+m+' (server)'; } return _setSpeed(m); };
      window.__REFUGIO.resync = function(){ if(SYNC.on){ post('/op/clock/resync', {}).then(apply).catch(e=>console.warn('[sync] resync', e+'')); return 'resync (server)'; } return _resync(); };
    }
  })();
