// EL BÚNKER — SYNC con el backend (FASE 1: RELOJ CENTRAL). Detrás de un FEATURE FLAG, APAGADO por defecto.
//
//   FLAG APAGADO (default): no toca el backend. El búnker corre 100% local, idéntico a antes → el stream en vivo
//                           queda intacto. No hay ni una request al servidor.
//   FLAG PRENDIDO:          el reloj (now/day/speed) viene del backend. Entre polls (cada 4 s) el reloj avanza
//                           local (suave) y se re-sincroniza con el server en cada poll.
//
//   PRENDER:  OP.backend('https://TU-BACKEND.onrender.com')        (token opcional: OP.backend(url, 'token'))
//   APAGAR:   OP.backend(false)
//   ESTADO:   OP.backend()
//   El estado queda guardado por navegador (localStorage), así que sobrevive recargas.
//
// Carga DESPUÉS de stream.js (usa STREAM/streamResync) y ANTES de game.js (para envolver __REFUGIO antes del sello).
  (function(){
    const LS = 'refugio_backend';
    const SYNC = { on:false, url:'', token:'', timer:null, fails:0 };
    const _cfg = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : ''; // default opcional desde config.js (vacío = off)
    const _base = () => SYNC.url.replace(/\/+$/,'');

    function save(){ try{ localStorage.setItem(LS, JSON.stringify({on:SYNC.on, url:SYNC.url, token:SYNC.token})); }catch(e){} }
    function apply(st){ // siembra el reloj del STREAM desde el server
      if(!st) return;
      if(typeof st.now_ms === 'number') STREAM.now = st.now_ms;
      if(typeof st.day === 'number')   STREAM.day = st.day;
      if(typeof st.speed === 'number') STREAM.speed = st.speed;
    }
    async function poll(){
      if(!SYNC.on) return;
      try{ const r = await fetch(_base()+'/state', {cache:'no-store'}); if(!r.ok) throw new Error(r.status); apply(await r.json()); SYNC.fails = 0; }
      catch(e){ SYNC.fails++; if(SYNC.fails === 1) console.warn('[sync] backend no responde; el reloj sigue avanzando local hasta que vuelva', e+''); }
    }
    async function post(path, body){ // escrituras del operador (reloj). Devuelve el nuevo estado para aplicarlo al toque.
      const r = await fetch(_base()+path, {
        method:'POST',
        headers: Object.assign({'Content-Type':'application/json'}, SYNC.token ? {'X-Operator-Token':SYNC.token} : {}),
        body: JSON.stringify(body||{})
      });
      if(!r.ok) throw new Error('op '+r.status);
      return r.json();
    }
    function start(){ SYNC.on = true; STREAM.serverMode = true; poll(); if(SYNC.timer) clearInterval(SYNC.timer); SYNC.timer = setInterval(poll, 4000); }
    function stop(){ SYNC.on = false; STREAM.serverMode = false; if(SYNC.timer){ clearInterval(SYNC.timer); SYNC.timer = null; } if(typeof streamResync === 'function') streamResync(); } // vuelve al reloj local

    // restaurar estado guardado (por navegador)
    try{ const s = JSON.parse(localStorage.getItem(LS) || 'null'); if(s){ SYNC.url = s.url || _cfg; SYNC.token = s.token || ''; if(s.on && SYNC.url) start(); } }catch(e){}
    if(!SYNC.url && _cfg) SYNC.url = _cfg;

    // ---- comandos de operador (se enganchan a __REFUGIO antes de que game.js lo selle en OP) ----
    if(window.__REFUGIO){
      window.__REFUGIO.backend = function(a, b){
        if(a === undefined) return { on:SYNC.on, url:SYNC.url||'(sin URL)', hasToken:!!SYNC.token };
        if(a === false){ stop(); save(); return 'backend OFF — reloj LOCAL (stream en vivo intacto)'; }
        if(a === true){ if(!SYNC.url) return 'falta la URL: OP.backend("https://TU-BACKEND.onrender.com")'; start(); save(); return 'backend ON — reloj desde '+SYNC.url; }
        if(typeof a === 'string'){ SYNC.url = a; if(typeof b === 'string') SYNC.token = b; start(); save(); return 'backend ON — reloj desde '+SYNC.url; }
        return 'uso: OP.backend("https://url"[, "token"])  |  OP.backend(false)  |  OP.backend()';
      };
      // comandos de TIEMPO: en modo server escriben al backend (lo ven todos los espectadores); en local, como siempre.
      const _setDay = window.__REFUGIO.setDay, _setSpeed = window.__REFUGIO.setSpeed, _resync = window.__REFUGIO.resync;
      window.__REFUGIO.setDay = function(d){ if(SYNC.on){ post('/op/clock/setDay', {day:+d}).then(apply).catch(e=>console.warn('[sync] setDay', e+'')); return 'day → '+d+' (server)'; } return _setDay(d); };
      window.__REFUGIO.setSpeed = function(m){ if(SYNC.on){ post('/op/clock/setSpeed', {speed:+m}).then(apply).catch(e=>console.warn('[sync] setSpeed', e+'')); return 'speed → '+m+' (server)'; } return _setSpeed(m); };
      window.__REFUGIO.resync = function(){ if(SYNC.on){ post('/op/clock/resync', {}).then(apply).catch(e=>console.warn('[sync] resync', e+'')); return 'resync (server)'; } return _resync(); };
    }
  })();
