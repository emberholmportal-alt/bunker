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
    const SYNC = { on:false, agenda:false, url:'', token:'', timer:null, fails:0 };
    const _cfg = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : ''; // default opcional desde config.js (vacío = off)
    const _base = () => SYNC.url.replace(/\/+$/,'');
    const degraded = () => SYNC.fails >= DEGRADE_FAILS;
    const agendaActive = () => SYNC.on && SYNC.agenda && !degraded(); // ¿la agenda sale del server AHORA?

    function save(){ try{ localStorage.setItem(LS, JSON.stringify({on:SYNC.on, agenda:SYNC.agenda, url:SYNC.url, token:SYNC.token})); }catch(e){} }
    function apply(st){
      if(!st) return;
      // reloj (cuando hay conexión): siempre — conectar = reloj del server (Fase 1)
      if(typeof st.now_ms === 'number') STREAM.now = st.now_ms;
      if(typeof st.day === 'number')   STREAM.day = st.day;
      if(typeof st.speed === 'number') STREAM.speed = st.speed;
      // agenda (sólo si el flag está ON): string = tramo · null = deambular
      if(SYNC.agenda && ('segment' in st)) STREAM.segment = st.segment;
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
    function stop(){ SYNC.on = false; SYNC.agenda = false; STREAM.serverMode = false; STREAM.segment = undefined; if(SYNC.timer){ clearInterval(SYNC.timer); SYNC.timer = null; } if(typeof streamResync === 'function') streamResync(); } // vuelve a TODO local

    // restaurar estado guardado (por navegador)
    try{ const s = JSON.parse(localStorage.getItem(LS) || 'null'); if(s){ SYNC.url = s.url || _cfg; SYNC.token = s.token || ''; SYNC.agenda = !!s.agenda; if(s.on && SYNC.url) start(); } }catch(e){}
    if(!SYNC.url && _cfg) SYNC.url = _cfg;

    // ---- hooks internos que consulta game.js (routineSegment / forceSegment) ----
    window.__SYNC = {
      agendaActive: agendaActive,
      // OP.forceSegment en modo server: '__auto__'=liberar(a la hora) · null=deambular · 'ronda'/...=forzar
      postSegment: function(v){
        const seg = (v === '__auto__') ? 'auto' : v;
        post('/op/segment', {segment: seg}).then(apply).catch(e=>console.warn('[sync] segment', e+''));
        return 'segment → ' + (v === '__auto__' ? 'auto' : (v === null ? 'off (deambular)' : v)) + ' (server)';
      }
    };

    // ---- comandos de operador (se enganchan a __REFUGIO antes de que game.js lo selle en OP) ----
    if(window.__REFUGIO){
      window.__REFUGIO.backend = function(a, b){
        if(a === undefined) return { on:SYNC.on, agenda:SYNC.agenda, degraded:degraded(), url:SYNC.url||'(sin URL)', hasToken:!!SYNC.token };
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
      // comandos de TIEMPO (Fase 1): en modo server escriben al backend; en local, como siempre.
      const _setDay = window.__REFUGIO.setDay, _setSpeed = window.__REFUGIO.setSpeed, _resync = window.__REFUGIO.resync;
      window.__REFUGIO.setDay = function(d){ if(SYNC.on){ post('/op/clock/setDay', {day:+d}).then(apply).catch(e=>console.warn('[sync] setDay', e+'')); return 'day → '+d+' (server)'; } return _setDay(d); };
      window.__REFUGIO.setSpeed = function(m){ if(SYNC.on){ post('/op/clock/setSpeed', {speed:+m}).then(apply).catch(e=>console.warn('[sync] setSpeed', e+'')); return 'speed → '+m+' (server)'; } return _setSpeed(m); };
      window.__REFUGIO.resync = function(){ if(SYNC.on){ post('/op/clock/resync', {}).then(apply).catch(e=>console.warn('[sync] resync', e+'')); return 'resync (server)'; } return _resync(); };
    }
  })();
