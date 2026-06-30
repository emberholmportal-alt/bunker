// EL BÚNKER — lógica de juego: estado, slider HOLDERS, eventos, zonas, loop, robot, crafteo
  // ---- estado ----
  let holders=0,clock=FULL,speed=1,auto=false,running=true,ended=false,asim=.05;
  let shake=0,blackout=0,evT=7+Math.random()*6,prevInside=0,prevOutside=0,prevConsumed=0,coreSurge=0,flashA=0,flashCol='255,46,136',critT=22,critWarned=false;
  let look2portilla=0,enjSurge=0;
  // El sim de supervivencia del modo jugable (eventos random, decay de stats/núcleo, holders, crafteo,
  // comandos del robot) fue JUBILADO: contradecía el canon de Beeko. El robot vive su rutina en tickRobot.
  // Quedan declaradas arriba algunas variables de FX (shake/blackout/flash/enjambre exterior) que el loop
  // todavía lee para el clima de las tomas; las de holders/clock siguen inertes y sin efecto.
  // FILTRO CCTV (sub-paso 5) — glitch ocasional sobre las bases del filtro. Estos consts son los
  // KNOBS para la "deriva" futura (con los días: bajar GAP / subir SPIKE para que el búnker se
  // raye más). Arranque conservador y BIEN ESPACIADO; preferir subir después de verlo.
  const RGB_BASE=.0014, RGB_SPIKE=.006;   // aberración cromática: base + pico durante el glitch
  const GRAIN_BASE=.42, GRAIN_SPIKE=.22;  // grano del film: base + pico durante el glitch (2a pasada: base subida de .26 a .42)
  const GLITCH_GAP=18, GLITCH_VAR=20;     // próximo glitch en 18–38 s (raro, que sorprenda)
  const GLITCH_DUR=.16;                    // duración del glitch (s) — corto
  const GLITCH_JUMP=14;                    // salto horizontal máx del cuadro (px, ±7)
  // pulso de CONMUTACIÓN de cámara (cuando STREAM.zone cambia): como una multiplexora CCTV saltando de canal.
  // Un toque MÁS fuerte que el glitch ambiental, pero corto (~150-250ms): RGB-shift fuerte + estática + roll horizontal.
  const CUT_DUR=.22, CUT_RGB=.015, CUT_GRAIN=.55, CUT_JUMP=44;
  let glitchT=GLITCH_GAP+Math.random()*GLITCH_VAR, glitchA=0, cutA=0;
  function showAlert(txt){const a=$('#alert');a.textContent=txt;a.classList.add('show');alertMsg=txt;setTimeout(()=>a.classList.remove('show'),1700);setTimeout(()=>{if(alertMsg===txt)alertMsg='';},2300);}
  function setFlash(col,a){flashCol=col;flashA=a;}

  // 1ª persona + control de movimiento del jugador REMOVIDOS en el pivote a live-stream
  // (look-drag, WASD/flechas, joystick, linterna). La vista pasa a cámara de seguridad fija (abajo).
  let yaw=0; // vestigial: el mapa (#map, se retira en el sub-paso 7) todavía lee yaw; ya no hay cámara de jugador

  // ====== RADIO / TRANSMISOR del observatorio — Beeko emite su señal al vacío ======
  // Objeto procedural (transmisor antiguo) APOYADO sobre el barril de la derecha (2.6,-1.9, tapa en y=1.0). CAM 01 lo encuadra.
  // El LED + el dial se encienden cuando STREAM.broadcasting (atado al estado de transmisión). Reemplaza el viejo RADIO_MSGS (survival).
  let radioGain=null,radioLED=null,radioDialMat=null;
  const radioGrp=new THREE.Group();
  {const _rwood=new THREE.MeshStandardMaterial({color:0x6b5a3a,roughness:.72,metalness:.18}),_rmetal=new THREE.MeshStandardMaterial({color:0x8a8470,metalness:.6,roughness:.5});
   radioGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.4,.26,.2),_rwood));                                                                        // cuerpo (baquelita/metal gastado)
   const _rsp=new THREE.Mesh(new THREE.CircleGeometry(.075,18),new THREE.MeshStandardMaterial({color:0x241f18,roughness:1}));_rsp.position.set(-.1,.01,.101);radioGrp.add(_rsp); // rejilla del parlante
   for(let i=-2;i<=2;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.13,.007,.004),new THREE.MeshStandardMaterial({color:0x342d24}));bar.position.set(-.1,i*.026,.103);radioGrp.add(bar);}
   radioDialMat=new THREE.MeshStandardMaterial({color:0xcaa54a,emissive:0x6a5410,emissiveIntensity:.25,roughness:.5});
   const _rdial=new THREE.Mesh(new THREE.PlaneGeometry(.15,.06),radioDialMat);_rdial.position.set(.1,.07,.101);radioGrp.add(_rdial);                                          // escala de sintonía (se ilumina al transmitir)
   for(const kx of[.055,.15]){const kn=new THREE.Mesh(new THREE.CylinderGeometry(.022,.024,.03,14),_rmetal);kn.rotation.x=Math.PI/2;kn.position.set(kx,-.06,.106);radioGrp.add(kn);} // perillas
   const _ra=new THREE.Mesh(new THREE.CylinderGeometry(.004,.002,.44,6),new THREE.MeshStandardMaterial({color:0xb8b8b8,metalness:.85,roughness:.3}));_ra.position.set(.16,.3,-.05);_ra.rotation.z=-.26;radioGrp.add(_ra); // antena
   const _rh=new THREE.Mesh(new THREE.TorusGeometry(.055,.008,8,16,Math.PI),_rmetal);_rh.position.set(-.04,.14,0);radioGrp.add(_rh);                                          // manija
   radioLED=new THREE.Mesh(new THREE.SphereGeometry(.014,10,10),new THREE.MeshStandardMaterial({color:0xff5a30,emissive:0xff3a18,emissiveIntensity:.22}));radioLED.position.set(.17,.07,.105);radioGrp.add(radioLED); // LED "transmitiendo"
   radioGrp.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
  radioGrp.position.set(2.6,1.12,-1.9);radioGrp.rotation.y=0.3;scene.add(radioGrp);                                  // sobre el barril de la derecha, cara hacia CAM 01
  // ---- TRANSMISIONES: plantillas con placeholders {DAY}/{RELEASED}/{BEES}/{CHARGE}. EARLY sólo si beesReleased===0; el resto nunca usa EARLY ----
  const TX_POOL_EN=[ // núcleo/faro + estado de las abejas + mano tendida + técnicas (voz de sistema)
    "this is shelter 404. day {DAY}. the bees are still alive. if you receive this, you are not alone.",
    "transmitting from shelter 404. {RELEASED} colonies released to the surface. no confirmation received. i keep sending them up.",
    "automated broadcast, shelter 404, day {DAY}. one maintenance unit operational. one purpose remaining. still here.",
    "if anyone is listening: this is 404. i am a small machine in a deep place, raising bees for a world that forgot them. that's all. that's the whole message.",
    "shelter 404 to anyone, to anything. day {DAY}. the colony is {BEES} strong. the work continues. you are not alone. neither am i, if you're there.",
    "colony report, day {DAY}: brood stable. {BEES} active. preparing the next release. they will go up whether the world is ready or not.",
    "{RELEASED} swarms released to date. i don't know if any survived. i send this in case one of you is descended from them. in case it worked.",
    "the bees are the message, really. i'm just the one who opens the door. {RELEASED} sent so far. broadcasting in case the door mattered.",
    "to the surface, from below: {BEES} new lives, coming soon. watch for them. they don't know they're a message. but they are.",
    "if you're receiving this, you're one of the few things still listening. i don't have much to offer. only this: something down here is still alive, and still trying.",
    "i don't know who tunes in to a dead channel. but the signal says someone does. thank you. day {DAY}, and i'm still transmitting because of you.",
    "to whoever receives this — i can't see you. i can't hear you answer. but the broadcast isn't empty, and that's enough to keep me sending.",
    "shelter 404, still broadcasting. if this reaches you, leave something alive where you are too. that's the only ask. that's the only plan i ever had.",
    "◖ AUTOMATED TRANSMISSION ◗ SHELTER 404 · DAY {DAY} · UNIT R-01 OPERATIONAL · BROODSTOCK SECURE · SIGNAL OUTBOUND · NO RESPONSE LOGGED",
    "◖ SHELTER 404 BEACON ◗ DAY {DAY} · {RELEASED} RELEASES LOGGED · POWER {CHARGE}% · STATUS: TRANSMITTING",
    "◖ 404 ◗ STILL HERE. STILL SENDING. DAY {DAY}."
  ];
  const TX_POOL_ES=[ // ES — mismo largo/orden y placeholders ({DAY}/{RELEASED}/{BEES}/{CHARGE}) que _EN
    "aquí refugio 404. día {DAY}. las abejas siguen vivas. si recibís esto, no estás solo.",
    "transmitiendo desde el refugio 404. {RELEASED} colonias liberadas a la superficie. sin confirmación. las sigo mandando arriba.",
    "transmisión automática, refugio 404, día {DAY}. una unidad de mantenimiento operativa. un propósito que queda. todavía acá.",
    "si hay alguien escuchando: aquí 404. soy una máquina chica en un lugar hondo, criando abejas para un mundo que las olvidó. eso es todo. ese es todo el mensaje.",
    "refugio 404 a quien sea, a lo que sea. día {DAY}. la colonia es de {BEES}. el trabajo continúa. no estás solo. yo tampoco, si estás ahí.",
    "informe de colonia, día {DAY}: cría estable. {BEES} activas. preparando la próxima liberación. van a subir, esté el mundo listo o no.",
    "{RELEASED} enjambres liberados hasta hoy. no sé si alguno sobrevivió. mando esto por si alguno de ustedes desciende de ellos. por si funcionó.",
    "las abejas son el mensaje, en realidad. yo sólo soy el que abre la puerta. {RELEASED} enviados hasta ahora. transmito por si la puerta importó.",
    "a la superficie, desde abajo: {BEES} vidas nuevas, pronto. estén atentos. no saben que son un mensaje. pero lo son.",
    "si estás recibiendo esto, sos una de las pocas cosas que todavía escuchan. no tengo mucho para ofrecer. sólo esto: algo acá abajo sigue vivo, y sigue intentando.",
    "no sé quién sintoniza un canal muerto. pero la señal dice que alguien lo hace. gracias. día {DAY}, y sigo transmitiendo por vos.",
    "a quien sea que reciba esto — no te puedo ver. no te puedo oír responder. pero la transmisión no está vacía, y con eso alcanza para seguir mandando.",
    "refugio 404, todavía transmitiendo. si esto te llega, dejá algo vivo donde estés también. ese es el único pedido. ese es el único plan que tuve.",
    "◖ TRANSMISIÓN AUTOMÁTICA ◗ REFUGIO 404 · DÍA {DAY} · UNIDAD R-01 OPERATIVA · CRÍA ASEGURADA · SEÑAL SALIENTE · SIN RESPUESTA REGISTRADA",
    "◖ BALIZA REFUGIO 404 ◗ DÍA {DAY} · {RELEASED} LIBERACIONES REGISTRADAS · ENERGÍA {CHARGE}% · ESTADO: TRANSMITIENDO",
    "◖ 404 ◗ TODAVÍA ACÁ. TODAVÍA MANDANDO. DÍA {DAY}."
  ];
  let TX_POOL=TX_POOL_EN; // se re-apunta en _applyVoiceLang()
  const TX_EARLY_EN=[ // SOLO si todavía no se liberó ningún enjambre (beesReleased===0)
    "this is shelter 404. day {DAY}. the first colony isn't ready yet. but it's coming. i'll send word when the bees go up.",
    "transmitting from 404. no releases yet. the brood is young. soon. if you're listening, stay listening — the first swarm is close.",
    "shelter 404, day {DAY}. nothing's gone up yet. but the bees are alive, and i am here, and that's where every story has to start."
  ];
  const TX_EARLY_ES=[ // ES — mismo largo/orden que _EN
    "aquí refugio 404. día {DAY}. la primera colonia todavía no está lista. pero ya viene. voy a avisar cuando las abejas suban.",
    "transmitiendo desde 404. todavía sin liberaciones. la cría es joven. pronto. si estás escuchando, seguí escuchando — el primer enjambre está cerca.",
    "refugio 404, día {DAY}. todavía no subió nada. pero las abejas están vivas, y yo estoy acá, y ahí es donde toda historia tiene que empezar."
  ];
  let TX_EARLY=TX_EARLY_EN; // se re-apunta en _applyVoiceLang()
  // CUADRO DE TRANSMISIÓN (overlay #radiotx): typewriter → hold → fade. Estado de transmisión vive en STREAM.broadcasting (respeta override).
  let rtEl=null,rtTextEl=null,_rtReady=false,_txActive=false,_txFull='',_txT0=0,_txHold=0,_txFadeT=0,_txLastP=-1,_txLastE=-1,_txDur=0;
  const TX_CPS=42, TX_FADE=0.6;
  // ---- SEÑAL ENTRANTE (2ª señal del despertar): la radio a veces RECIBE algo de afuera. Capa SOBRE el motor del despertar (lee la ETAPA del
  // server). NO toca la transmisión: estado PROPIO, audio aparte y NUNCA solapa un broadcast (TX tiene prioridad). Cae a silencio si el server
  // no manda etapa (fallback: no dispara, nunca rompe). Sub-flag propio (_rxEnabled) → se apaga sin tocar los pensamientos. ----
  const RADIO_IN_CHANCE=[0, 0.06, 0.14, 0.30]; // prob. por INTENTO de recepción, por etapa (0:nunca · 3:frecuente). CALIBRABLE — todo junto acá.
  const RADIO_IN_GAP=30;                        // s entre intentos (se tira el dado cada GAP). CALIBRABLE.
  const RADIO_IN_DUR=[4, 5, 7, 9];             // duración (s) del evento de recepción, por etapa. CALIBRABLE.
  const RI_GLYPH='▓▒░·—=#%*';                  // charset de glitch del readout (estética de señal interceptada)
  let riEl=null,riStatusEl=null,_riReady=false,_rxEnabled=true,_rxActive=false,_rxStage=0,_rxT0=0,_rxDur=0,_rxNextT=RADIO_IN_GAP,_rxFrame=0;
  function _rtGrab(){ if(_rtReady)return; rtEl=$('#radiotx'); rtTextEl=$('#rtText'); _rtReady=true; }
  function txFormat(s){ const d=Math.round(STREAM.day), day=d>=1000?(''+d).replace(/\B(?=(\d{3})+(?!\d))/g,','):''+d; // separador de miles en DAY si ≥1000
    return s.replace(/\{DAY\}/g,day).replace(/\{RELEASED\}/g,Math.round(STREAM.beesReleased)).replace(/\{BEES\}/g,Math.round(STREAM.bees)).replace(/\{CHARGE\}/g,Math.round(STREAM.charge)); }
  function pickTx(){ const early=(Math.round(STREAM.beesReleased)===0), arr=early?TX_EARLY:TX_POOL; // EARLY sólo sin liberaciones; si >0 nunca las EARLY
    let i=Math.floor(Math.random()*arr.length),tr=0; const last=early?_txLastE:_txLastP;
    while(arr.length>1&&i===last&&tr<6){i=Math.floor(Math.random()*arr.length);tr++;}
    if(early)_txLastE=i; else _txLastP=i; return txFormat(arr[i]); }
  function initRadio(){if(!actx||radioGain)return;const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1650;bp.Q.value=1.1;radioGain=actx.createGain();radioGain.gain.value=0;src.connect(bp);bp.connect(radioGain);radioGain.connect(master);src.start();}
  function radioSwell(){ if(!audioOn||!actx)return; initRadio(); if(!radioGain)return; const tt=actx.currentTime; // breve "swell" de estática al emitir (degrada en silencio)
    radioGain.gain.cancelScheduledValues(tt);radioGain.gain.setValueAtTime(0,tt);radioGain.gain.linearRampToValueAtTime(.09,tt+.18);radioGain.gain.linearRampToValueAtTime(.05,tt+.7);radioGain.gain.linearRampToValueAtTime(0,tt+2.4);
    if(typeof blip==='function')blip(); }
  function broadcast(){ // dispara una transmisión YA (la usa la ronda al pasar por la radio y el hook OP.broadcast)
    _rtGrab(); if(!rtEl)return ''; const text=pickTx();
    _txFull=text;_txActive=true;_txT0=perfNow();_txFadeT=0; _txHold=Math.min(6.5,2.8+text.length*0.028);
    _txDur=text.length/TX_CPS + _txHold + TX_FADE; // duración total de la transmisión (typewriter+hold+fade) → la ronda usa esto para el dwell
    if(rtTextEl)rtTextEl.textContent=''; rtEl.classList.add('show');
    streamDrive('broadcasting', true); radioSwell(); return text; }
  // ---- SEÑAL ENTRANTE: helpers del readout (glitch) + ciclo de recepción (independiente del TX) ----
  function _riGrab(){ if(_riReady)return; riEl=$('#radioin'); riStatusEl=$('#riStatus'); _riReady=true; }
  function _riGlitch(n){ let s=''; for(let i=0;i<n;i++)s+=RI_GLYPH[(Math.random()*RI_GLYPH.length)|0]; return s; }
  function _riBar(v){ const n=Math.max(0,Math.min(10,Math.round(v*10))); return '▌'.repeat(n)+'·'.repeat(10-n); } // medidor de señal 0..1
  function _riRender(stage,frac){ const carrier=Math.abs(Math.sin(frac*Math.PI*5+stage)); const lvl=.22+carrier*.72; // portadora que sube y baja
    const L=['⌁ '+_riGlitch(2)+' CARRIER '+_riBar(lvl)+' '+_riGlitch(2), 'SOURCE: '+(stage>=3?_riGlitch(3)+' ? '+_riGlitch(3):_riGlitch(2)+' ??? ')];
    if(stage>=2) L.push(carrier>.5?'⟿ PATTERN '+_riGlitch(6):'⟿ '+_riGlitch(8));   // etapa 2-3: hay un PATRÓN (intermitente)
    else L.push(carrier>.6?'· — · '+_riGlitch(3):_riGlitch(7));                       // etapa 1: ruido ambiguo
    if(stage>=3 && carrier>.7) L.push('!! DECODE FAIL '+_riGlitch(4));               // etapa 3: más perturbador
    return L.join('\n'); }
  // HOOK FUTURO (prep, NO construido): devolverá un AudioBuffer de voz/música real interceptada para una etapa. Hoy null → sólo síntesis. Ver audio.js (radioReceive).
  function _radioInClip(stage){ return null; }
  function radioInStart(stage){ _riGrab(); if(!riEl)return; if(_txActive||STREAM.broadcasting)return; // jamás arranca sobre una transmisión
    _rxStage=stage; _rxActive=true; _rxT0=perfNow(); _rxFrame=999; _rxDur=RADIO_IN_DUR[stage]||RADIO_IN_DUR[1];
    riEl.classList.add('show'); if(typeof radioReceive==='function')radioReceive(stage,_rxDur); } // audio GENERADO (degrada en silencio si el audio está off)
  function _rxEnd(){ _rxActive=false; if(riEl)riEl.classList.remove('show'); if(typeof radioInStop==='function')radioInStop(); }
  function radioRxTick(dt,t){
    if(_rxActive){ _riGrab(); _rxFrame+=dt; const el=(perfNow()-_rxT0)/1000, frac=Math.min(1,el/_rxDur);
      if(_rxFrame>=.09){ _rxFrame=0; if(riStatusEl)riStatusEl.textContent=_riRender(_rxStage,frac); }  // refresca el readout ~11 fps (glitch)
      if(el>=_rxDur)_rxEnd(); return; }
    // ¿intentar una recepción? sólo con el despertar del SERVER activo (la etapa la manda el server), flag ON, y SIN transmitir ni en fade
    if(!_rxEnabled || _txActive || _txFadeT>0 || STREAM.broadcasting) return;
    if(!_awakeningServer()) return;                                  // sin etapa del server no hay recepción (fallback: no dispara, nunca rompe)
    _rxNextT-=dt; if(_rxNextT>0) return; _rxNextT=RADIO_IN_GAP;
    const st=_awakeningStage(), ch=RADIO_IN_CHANCE[st]||0;
    if(Math.random()<ch) radioInStart(st); }
  function radioTick(dt,t){ // LED + dial: TX (latido regular) vs RX (parpadeo entrecortado rojo) vs reposo; + ciclos de TX y RX (separados)
    const tx=!!STREAM.broadcasting;
    if(tx && _rxActive) _rxEnd();                                    // TX tiene prioridad: si arranca una transmisión mientras se recibe, corta la recepción al instante
    if(tx){ if(radioLED){radioLED.material.emissive.setHex(0xff3a18); radioLED.material.emissiveIntensity=.5+Math.abs(Math.sin(t*7))*1.7;}
      if(radioDialMat)radioDialMat.emissiveIntensity=.7+Math.abs(Math.sin(t*5))*.5; }
    else if(_rxActive){ const fl=.35+(Math.sin(t*23)*Math.sin(t*7.3)>0?1:.12)*1.5;  // parpadeo IRREGULAR (batido de dos senos → entrecortado, no late parejo como el TX)
      if(radioLED){radioLED.material.emissive.setHex(0xff2a14); radioLED.material.emissiveIntensity=fl;}                    // rojo más intenso = recibiendo
      if(radioDialMat)radioDialMat.emissiveIntensity=.35+Math.abs(Math.sin(t*3.3))*.25; }
    else if(gameMode && _radioOnGame){ if(radioLED){radioLED.material.emissive.setHex(0xff5a30); radioLED.material.emissiveIntensity=.45+Math.abs(Math.sin(t*4.5))*1.0;} // modo juego: radio encendida de fondo → LED "transmitiendo"
      if(radioDialMat)radioDialMat.emissiveIntensity=.5+Math.abs(Math.sin(t*3))*.3; }
    else { if(radioLED){radioLED.material.emissive.setHex(0xff3a18); radioLED.material.emissiveIntensity=.22;}             // reposo (estado original)
      if(radioDialMat)radioDialMat.emissiveIntensity=.25; }
    if(_txActive){ _rtGrab();                                        // ciclo de TRANSMISIÓN (typewriter→hold→fade) — INTACTO
      const el=(perfNow()-_txT0)/1000, n=Math.min(_txFull.length, Math.floor(el*TX_CPS));
      if(rtTextEl)rtTextEl.textContent=_txFull.slice(0,n)+(n<_txFull.length?'▌':'');
      if(el >= _txFull.length/TX_CPS + _txHold){_txActive=false; if(rtEl)rtEl.classList.remove('show'); _txFadeT=TX_FADE;}
    } else if(_txFadeT>0){ _txFadeT-=dt; if(_txFadeT<=0) streamDrive('broadcasting', false); }
    radioRxTick(dt,t); }                                             // ciclo de RECEPCIÓN (independiente; sólo corre cuando NO se transmite)
  // ====== 4ª SEÑAL DEL DESPERTAR: SONIDOS SIN FUENTE ======
  // Audio ambiental sin fuente visible (síntesis en audio.js, todo "a través del concreto"). Atado a la etapa del despertar del server:
  // frecuencia por AMBIENT_CHANCE, y TIPOS por etapa (AMBIENT_POOL) — crujidos/golpes desde et.1, arrastres desde et.2, raspados desde et.3.
  // Cuando suena un sonido sin fuente, BEEKO REACCIONA y la intensidad ESCALA con la etapa (es lo que le da claridad narrativa: el espectador
  // entiende que registró algo del exterior). Reacción = (a) micro-pausa en lo que hace, (b) gesto de mirar arriba YA existente (reutilizado),
  // (c) pensamiento del set BEEKO_HEARD. Sub-flag propio. Fallback: sin etapa del server no dispara auto.
  const AMBIENT_CHANCE=[0, 0.05, 0.12, 0.26];      // prob. por INTENTO, por etapa (0:nunca · 3:más seguido). CALIBRABLE.
  const AMBIENT_GAP=26;                            // s entre intentos (se tira el dado). CALIBRABLE.
  const AMBIENT_POOL=[ [], ['creak','creak','thud'], ['creak','thud','thud','drag'], ['creak','thud','drag','scratch','scratch'] ]; // tipos elegibles por etapa (con peso por repetición). CALIBRABLE.
  // REACCIÓN DE BEEKO AL SONIDO (escala por etapa). et.1 sutil (se detiene, rara vez mira, casi nunca comenta) → et.3 explícito (casi siempre
  // se detiene + mira arriba + más seguido comenta). Las 3 probabilidades son INDEPENDIENTES (pueden combinarse). CALIBRABLES, todas acá:
  const REACT_PAUSE  = [0, 0.40, 0.70, 0.90];      // prob. de la MICRO-PAUSA por etapa
  const REACT_LOOKUP = [0, 0.10, 0.40, 0.70];      // prob. de disparar el GESTO mirar-arriba (reutiliza startLookUp)
  const REACT_THINK  = [0, 0.05, 0.15, 0.30];      // prob. de un PENSAMIENTO ('heard') tras registrar
  const REACT_PAUSE_DUR=[0.6, 1.0];                // rango (s) de la micro-pausa (freeze breve del movimiento; la rutina lo retoma idéntico)
  let _ambEnabled=true, _ambNextT=AMBIENT_GAP, _soundPauseT=0;
  function ambientTick(dt){
    if(!_ambEnabled || !_awakeningServer()) return;                 // sin server-despertar activo no dispara auto (fallback: nunca rompe)
    _ambNextT-=dt; if(_ambNextT>0) return; _ambNextT=AMBIENT_GAP;
    const st=_awakeningStage(), ch=AMBIENT_CHANCE[st]||0; if(Math.random()>=ch) return;
    const pool=AMBIENT_POOL[st]||[]; if(!pool.length) return;
    const type=pool[Math.floor(Math.random()*pool.length)];
    if(typeof ambientSound==='function') ambientSound(type, st);
    beekoReactToSound(st);                                          // Beeko reacciona (pausa/mirada/pensamiento), con intensidad escalada por etapa
  }
  // Reacción de Beeko a un sonido sin fuente. NO gatea por _ambEnabled (ambientTick ya lo hace; el manual OP.sfx la quiere disparar igual).
  function beekoReactToSound(stage){
    if(gameMode)return;                              // en modo juego el sonido suena igual, pero Beeko no reacciona (lo maneja el jugador)
    const st=Math.max(0,Math.min(3,stage|0)); if(st<=0)return;
    // (a) MICRO-PAUSA: se detiene un instante. Si venía caminando, frena a Idle (la rutina vuelve a Walking sola al terminar la pausa).
    if(Math.random()<(REACT_PAUSE[st]||0)){ _soundPauseT=REACT_PAUSE_DUR[0]+Math.random()*(REACT_PAUSE_DUR[1]-REACT_PAUSE_DUR[0]);
      if(robot.model && robot.moving && robot.act && robot.cur===robot.act['Walking']) setRobotAnim('Idle'); }
    // (b) MIRA ARRIBA: reutiliza el gesto. manual=true → no se autocancela por caminar (está en pausa). noThought=true → el pensamiento lo decide REACT_THINK ('heard'), no el set 'lookup'.
    if(Math.random()<(REACT_LOOKUP[st]||0)) startLookUp(true, true);
    // (c) PENSAMIENTO 'heard' (escuché/sentí algo): no pisa uno activo ni una transmisión
    if(Math.random()<(REACT_THINK[st]||0) && typeof showBeekoThought==='function' && bkEnabled && !_bkActive && !STREAM.broadcasting) showBeekoThought('heard');
  }
  // ====== EXPANSIÓN: PASILLO + BIBLIOTECA + CULTIVO ======
  box(2.0,CH+.3,.3,-2.2,CH/2,RZ1,concreteMat);box(2.0,CH+.3,.3,2.2,CH/2,RZ1,concreteMat);
  box(2.6,.3,2.0,0,-.15,4.2,floorMat);box(2.6,.3,2.0,0,CH,4.2,ceilMat);
  box(.2,CH+.3,2.0,-1.3,CH/2,4.2,concreteMat);box(.2,CH+.3,2.0,1.3,CH/2,4.2,concreteMat);
  // SALA B (BIBLIOTECA) z[5.2,8.2]
  box(6.8,.3,3.0,0,-.15,6.7,floorMat);box(6.8,.3,3.0,0,CH,6.7,ceilMat);
  box(.3,CH+.3,.85,-3.4,CH/2,5.62,concreteMat);box(.3,CH+.3,.85,-3.4,CH/2,7.78,concreteMat);box(.3,CH+.3,.85,3.4,CH/2,5.62,concreteMat);box(.3,CH+.3,.85,3.4,CH/2,7.78,concreteMat);
  box(2.4,CH+.3,.3,-2.0,CH/2,5.2,concreteMat);box(2.4,CH+.3,.3,2.0,CH/2,5.2,concreteMat);
  box(2.4,CH+.3,.3,-2.0,CH/2,8.2,concreteMat);box(2.4,CH+.3,.3,2.0,CH/2,8.2,concreteMat);
  // ---- TALLER (rama derecha de biblioteca) z[5.5,8.5] x[3.4,7.4] ----
  box(4.0,.3,3.0,5.4,-.15,7.0,floorMat);box(4.0,.3,3.0,5.4,CH,7.0,ceilMat);
  box(.3,CH+.3,3.0,7.4,CH/2,7.0,concreteMat);
  box(4.0,CH+.3,.3,5.4,CH/2,5.5,concreteMat);box(4.0,CH+.3,.3,5.4,CH/2,8.5,concreteMat);
  const twLight=new THREE.PointLight(0xffcb96,.9,7,2);twLight.position.set(5.4,CH-.35,7.0);scene.add(twLight);
  const craftG=new THREE.Group();craftG.position.set(5.9,0,6.3);craftG.rotation.y=-Math.PI/2;scene.add(craftG);
  craftG.add(meshBox(1.7,.78,.7,0,.39,0,tableMat));
  const _alm=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.32,12),new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:.85,roughness:.3}));_alm.position.set(-.45,.94,0);craftG.add(_alm);
  const _tb=new THREE.Mesh(new THREE.TorusGeometry(.1,.018,8,16),new THREE.MeshStandardMaterial({color:0x8a8f96,metalness:.7}));_tb.position.set(-.22,1.02,0);_tb.rotation.y=Math.PI/2;craftG.add(_tb);
  const _fcc=[0x40a0c0,0xc04060,0x60c040];for(let i=0;i<3;i++){const fl=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.17,8),new THREE.MeshStandardMaterial({color:_fcc[i],transparent:true,opacity:.65,emissive:_fcc[i],emissiveIntensity:.6}));fl.position.set(.12+i*.2,.865,.12);craftG.add(fl);}
  twLight.intensity=1.15;twLight.distance=8;
  // ====== TALLER DETALLADO (banco de trabajo, herramientas, fabricadora, luz de trabajo) ======
  let fabLeds=[],fabLight=null,grindWheel=null,weldT=0;const weldLight=new THREE.PointLight(0x9fd0ff,0,2.2,2);weldLight.position.set(5.62,1.0,5.65);scene.add(weldLight);
  {
    const woodMat=new THREE.MeshStandardMaterial({map:tex(grime('#4a3a26'),1),normalMap:_wn,roughness:.9,metalness:.05});
    const darkMetal=new THREE.MeshStandardMaterial({color:0x33383d,metalness:.85,roughness:.45,normalMap:metalN});
    const toolMat=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:.75,roughness:.4});
    // --- pegboard + herramientas colgadas (pared derecha, x≈7.2) ---
    const peg=new THREE.Mesh(new THREE.BoxGeometry(.05,1.25,2.4),new THREE.MeshStandardMaterial({color:0x5e4527,roughness:.92,map:tex(grime('#5e4527'),2),normalMap:_wn}));
    peg.position.set(7.2,1.55,7.0);peg.receiveShadow=true;scene.add(peg);
    const HX=7.12;
    function hangTool(g,z,y,rotX){g.position.set(HX,y,z);if(rotX!==undefined)g.rotation.x=rotX;g.children.forEach(c=>{c.castShadow=true;});scene.add(g);}
    {const g=new THREE.Group();g.add(meshBox(.025,.34,.025,0,0,0,woodMat));g.add(meshBox(.05,.06,.14,0,.18,0,toolMat));hangTool(g,6.35,1.78,Math.PI/2);} // martillo
    {const g=new THREE.Group();g.add(meshBox(.03,.32,.012,0,0,0,toolMat));const j=new THREE.Mesh(new THREE.TorusGeometry(.045,.014,6,14),toolMat);j.position.y=.17;g.add(j);hangTool(g,6.72,1.73,Math.PI/2);} // llave
    {const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.12,8),new THREE.MeshStandardMaterial({color:0xc0392b,roughness:.5})));g.add(meshBox(.008,.18,.008,0,-.14,0,toolMat));hangTool(g,7.05,1.8,Math.PI/2);} // destornillador
    {const g=new THREE.Group();g.add(meshBox(.012,.05,.36,0,0,0,toolMat));g.add(meshBox(.05,.11,.1,0,0,-.22,woodMat));hangTool(g,7.45,1.55);} // sierra
    {const g=new THREE.Group();g.add(meshBox(.018,.24,.012,-.02,0,0,toolMat));g.add(meshBox(.018,.24,.012,.02,0,0,toolMat));hangTool(g,7.75,1.7,Math.PI/2);} // pinza
    for(let i=0;i<2;i++){const c=new THREE.Mesh(new THREE.TorusGeometry(.09,.03,8,18),new THREE.MeshStandardMaterial({color:0x18181a,roughness:1}));c.position.set(HX,1.02,6.4+i*.55);c.castShadow=true;scene.add(c);} // rollos de cable
    // --- tornillo de banco (vise) sobre el banco ---
    {const g=new THREE.Group();g.position.set(5.62,.78,5.65);g.add(meshBox(.13,.1,.18,0,.05,0,darkMetal));g.add(meshBox(.17,.09,.06,0,.13,-.05,darkMetal));g.add(meshBox(.17,.09,.06,0,.13,.05,toolMat));const scr=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.22,8),toolMat);scr.rotation.x=Math.PI/2;scr.position.set(0,.13,.13);g.add(scr);g.children.forEach(c=>c.castShadow=true);scene.add(g);}
    // --- amoladora de banco (grinder con rueda que gira) ---
    {const g=new THREE.Group();g.position.set(6.15,.78,7.0);g.add(meshBox(.22,.1,.13,0,.05,0,darkMetal));const mot=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.18,12),darkMetal);mot.rotation.z=Math.PI/2;mot.position.set(-.02,.14,0);g.add(mot);grindWheel=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.022,16),new THREE.MeshStandardMaterial({color:0x4a4a4a,roughness:1}));grindWheel.rotation.z=Math.PI/2;grindWheel.position.set(.11,.14,0);g.add(grindWheel);g.children.forEach(c=>c.castShadow=true);scene.add(g);}
    // --- estantería de componentes (pared del fondo z≈8.15) ---
    {const sh=new THREE.Group();sh.position.set(4.4,0,8.15);for(const px of[-.62,.62])for(const pz of[-.13,.13])sh.add(meshBox(.05,1.6,.05,px,.8,pz,steelMat));for(const yy of[.42,.9,1.38])sh.add(meshBox(1.34,.04,.34,0,yy,0,steelMat));const binC=[0x3a6a4a,0x6a5a2a,0x2a4a6a,0x6a2a3a,0x4a4a52];for(let r=0;r<3;r++)for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.3,.2,.26),new THREE.MeshStandardMaterial({color:binC[(r*3+i)%5],roughness:.75,metalness:.1}));b.position.set(-.4+i*.4,.42+.48*r+.12,0);b.castShadow=true;sh.add(b);}sh.children.forEach(c=>c.castShadow=true);scene.add(sh);}
    // --- pila de chatarra (esquina) ---
    {const g=new THREE.Group();g.position.set(6.95,0,8.0);for(let i=0;i<11;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.12+Math.random()*.2,.06+Math.random()*.12,.12+Math.random()*.2),i%2?rustMat:steelMat);s.position.set((Math.random()-.5)*.5,.05+Math.random()*.28,(Math.random()-.5)*.5);s.rotation.set(Math.random(),Math.random(),Math.random());s.castShadow=true;g.add(s);}scene.add(g);}
    // --- fabricadora (cámara sci-fi del taller) ---
    const fab=new THREE.Group();fab.position.set(6.7,0,6.05);scene.add(fab);
    fab.add(meshBox(.74,.2,.54,0,.1,0,darkMetal));fab.add(meshBox(.74,.13,.54,0,1.52,0,darkMetal));
    for(const px of[-.31,.31])for(const pz of[-.21,.21])fab.add(meshBox(.05,1.3,.05,px,.82,pz,steelMat));
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,1.22,20,1,true),new THREE.MeshPhysicalMaterial({color:0x88c0d0,transparent:true,opacity:.14,roughness:.1,metalness:0,side:THREE.DoubleSide}));glass.position.set(0,.8,0);fab.add(glass);
    fab.add(meshBox(.32,.42,.06,0,.52,.28,doorMat));
    for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),new THREE.MeshBasicMaterial({color:0x39ffd0}));l.position.set(-.11+i*.07,.62,.32);fab.add(l);fabLeds.push(l);}
    fabLight=new THREE.PointLight(0x39ffd0,.6,3,2);fabLight.position.set(0,.85,0);fab.add(fabLight);
    fab.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
    // (blueprint "PROYECTO M-01 · MIYAKO" removido junto con el modelo: Miyako no se usa por ahora)
    // --- luz de trabajo cálida sobre el banco (le da forma a los props) ---
    const workLamp=new THREE.SpotLight(0xffe2b4,2.1,5.5,Math.PI/4.5,.5,1.4);workLamp.position.set(5.9,2.35,6.2);workLamp.target.position.set(5.9,.78,6.4);workLamp.castShadow=!SMALL;if(!SMALL)workLamp.shadow.mapSize.set(1024,1024);scene.add(workLamp);scene.add(workLamp.target);
    const twFill=new THREE.PointLight(0xcdbfa6,.55,8,2);twFill.position.set(5.6,2.2,6.6);scene.add(twFill);
    {const a=new THREE.Group();a.position.set(6.5,0,5.7);a.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.04,12),darkMetal));const arm=meshBox(.03,1.7,.03,0,.85,0,darkMetal);arm.rotation.z=.18;a.add(arm);const arm2=meshBox(.03,.7,.03,-.5,1.55,0,darkMetal);arm2.rotation.z=1.1;a.add(arm2);const head=new THREE.Mesh(new THREE.CylinderGeometry(.06,.11,.13,14),darkMetal);head.position.set(-.62,1.78,.3);head.rotation.x=1.0;a.add(head);a.children.forEach(c=>c.castShadow=true);scene.add(a);}
  }
  // ====== SALA D (DESCANSO) - espejo del taller, x[-7.4,-3.4] z[5.5,8.5] ======
  box(4.0,.3,3.0,-5.4,-.15,7.0,floorMat);box(4.0,.3,3.0,-5.4,CH,7.0,ceilMat);
  box(.3,CH+.3,3.0,-7.4,CH/2,7.0,concreteMat);
  box(4.0,CH+.3,.3,-5.4,CH/2,5.5,concreteMat);box(4.0,CH+.3,.3,-5.4,CH/2,8.5,concreteMat);
  const dwLight=new THREE.PointLight(0xffc890,.95,7,2);dwLight.position.set(-5.4,CH-.35,7.0);scene.add(dwLight);

  // ====== SECTOR DE CARGA (CAM 07 · CHARGING) — oeste del hub por la 'puerta EN OBRA' destapiada ======
  // Sala x[-6.6,-3.2] z[-1.0,3.2]. El medidor LEE STREAM.charge (0..100); se alimenta con __REFUGIO.setCharge
  // ahora y con la rutina del robot en F2. Estética cámara de seguridad: la riqueza viene de luces/glow, no de
  // modelos pesados → 100% procedural (0 GLB, 0 peso de assets). 9 estructuras enganchadas + dock + medidor + blueprint.
  let chargeFillG=null,chargeNumX=null,chargeNumTex=null,_chargeShown=-1,dockGlow=null,chargeLeds=[];
  // PLACA DE CARGA en el piso bajo el dock: se ILUMINA sólo cuando Beeko está parado encima cargándose (reemplaza al viejo halo cian que lo envolvía).
  let plateMat=null,platePulse=null,_plateLvl=0; const PLATE_CX=-5.75,PLATE_CZ=1.3,PLATE_HX=.7,PLATE_HZ=.78, PLATE_GLOW=.9; // PLATE_GLOW = pico del glow emisivo (ajustable; subir = más brillante)
  let diagRT=null,diagScene=null,diagCam=null,diagPivot=null; // pantalla de diagnóstico (render-to-texture del robot girando)
  // ---- COLMENA (HIVE): enjambre de abejas (Points) + contadores. El enjambre LEE STREAM.bees; los contadores LEEN STREAM.beesReleased.
  let beeSwarm=null,beeData=[],beeNumX=null,beeNumTex=null,_beesRelShown=-1,hiveGlow=null,hiveHaze=null;
  const BEES_MAX=80, hiveC=new THREE.Vector3(0,1.3,14.4); // pool del enjambre y centro de órbita (frente a la colmena)
  // ---- FASE 2 · TRAMO COLMENA (rutina de stations + liberación de enjambre). Corrida única → variación con Math.random. ----
  let _forceSeg=undefined;                 // testeo: undefined=auto(hora) · null=off(deambula) · 'colmena'=forzar el tramo
  let beeReleaseT=0,_beesResetPending=false,_beesPending=null; // _beesPending: valor del server a aplicar TRAS el surge (modo contadores-server)
  const BEE_CAP=60, BEE_RATE=0.5, BEE_RELEASE_DUR=3.6; // cría tope, crecimiento por seg, duración del surge de liberación
  const CHARGE_UP=0.5, CHARGE_DOWN=0.08; // carga: sube en el dock / drena lento el resto del día (piso 50)
  const COLMENA_STATIONS=[ // {punto donde se para, feature que mira, subset de gestos}
    {p:[0,13.4],    look:[0,14.55],  g:['Yes','Idle','ThumbsUp']}, // incubadora (cría)
    {p:[-2.4,13.2], look:[-2.9,13.4], g:['ThumbsUp','Idle']},      // estación apícola
    {p:[2.3,13.2],  look:[2.7,13.4],  g:['Yes','Idle']},           // jardinera de flores
    {p:[2.6,12.7],  look:[3.36,12.7], g:['Idle','Yes']}            // display de liberadas
  ];
  // Config por TRAMO within-zone (zona, nodo de entrada, acción de STREAM, stations con dwell/peso opcionales). RONDA va aparte.
  const SEG_CFG={
    carga:{zone:'carga',node:12,action:'charging',stations:[ // el más QUIETO: dock pesado + largo (enchufado)
      {p:[-5.6,1.1], look:[-6.25,1.1], g:['Idle'],           dwell:[10,18], w:5},
      {p:[-5.7,2.0], look:[-6.42,2.0], g:['Yes','Idle'],     dwell:[3,5],   w:1},
      {p:[-5.6,2.5], look:[-6.46,2.6], g:['ThumbsUp'],       dwell:[3,5],   w:1}]},
    colmena:{zone:'colmena',node:15,action:'tending',stations:COLMENA_STATIONS},
    admin:{zone:'descanso',node:16,action:'admin'}, // sin stations: se planta en el escritorio (pose de tecleo)
    fabricacion:{zone:'fab',node:20,action:'fabricating',stations:[
      {p:[-5.4,10.3], look:[-5.4,11.4], g:['Yes','Idle'],    dwell:[5,9], w:3}, // impresora (mira la pieza) — frecuente
      {p:[-6.6,10.0], look:[-7.2,10.0], g:['ThumbsUp','Idle'],dwell:[3,5], w:1}, // estante de repuestos
      {p:[-5.0,10.6], look:[-5.4,11.35],g:['Yes'],           dwell:[3,5], w:1}, // bandeja / banco
      {p:[-6.0,9.0],  look:[-6.0,8.2],  g:['Idle'],          dwell:[3,5], w:1}]}, // toolbox sur
    // OCIO: una sola station — Beeko se planta FRENTE al televisor del observatorio y lo mira. Casi quieto, gestos esporádicos
    // (mayoría 'Idle' + algún 'Yes'/'ThumbsUp' suave), dwell largo = "viendo tele". El TV lo prende/apaga routineTick (STREAM.tv).
    ocio:{zone:'observatorio',node:0,action:'watching',stations:[
      {p:[-1.30,-0.10], look:[-2.5,-0.5], g:['Idle','Idle','Idle','Idle','Yes','ThumbsUp'], dwell:[6,11], w:1}]}
  };
  // RONDA: patrulla multi-zona (nodo + feature que chequea). Mayormente OK (Yes/ThumbsUp), a veces No (algo raro).
  const RONDA_STOPS=[
    {node:25, look:[2.6,-1.9], radio:true}, // RADIO del observatorio: se planta frente al transmisor y EMITE una transmisión
    {node:0,  look:[-2.1,-4.0]},   // generador / hub
    {node:4,  look:[2.9,9.6]},     // cultivo (racks)
    {node:15, look:[0,14.55]},     // colmena
    {node:24, look:[6.2,12.4]},    // bóveda (se planta a mirar el oro)
    {node:20, look:[-5.4,11.35]}   // fabricación
  ];
  // ---- SALA DE FABRICACIÓN: impresora 3D animada. La pieza crece leyendo STREAM.print (auto-cicla si no está forzado). ----
  let gantry=null,printHead=null,partBracket=null,partHex=null,nozGlow=null,filament=null,printX=null,printTex=null,_printLayerShown=-1,fabRoomLight=null,filTop=null;
  let _printT=0,_printPart=0;
  const PRINT_SECS=50, PRINT_LAYERS=24, PART_MAXH=0.16, NODE_FABC=20; // ciclo lento ~50s, 24 capas; nodo NAV donde el robot se planta a fabricar
  const DIAS_POR_ENJAMBRE=7; // F2: cada cuántos días el robot libera un enjambre. Sólo declarado; la rutina lo usará en Fase 2.
  // ---- ESTACIÓN DE CÓMPUTO (descanso): dashboard CRT por canvas (read-only de STREAM) ----
  let adminX=null,adminTex=null,adminAcc=0,_adminLog=[];
  {
    const W=3.4,D=4.2,cx=-4.9,cz=1.1; // ancho(x), prof(z), centro
    // (1) caja de la sala: piso, techo y 3 muros (el muro este es el muro oeste del hub, ya con el hueco de puerta)
    box(W,.3,D,cx,-.15,cz,floorMat);box(W,.3,D,cx,CH,cz,ceilMat);
    box(.3,CH+.3,D,-6.6,CH/2,cz,concreteMat);               // muro oeste (fondo de la sala)
    box(W,CH+.3,.3,cx,CH/2,-1.0,concreteMat);               // muro norte
    box(W,CH+.3,.3,cx,CH/2,3.2,concreteMat);                // muro sur
    // (2) marco + dintel de la puerta (hueco z[1.5,3.2]=1.7m en x=-3.2) con tira cian de borde (señal "puerta activa")
    const jambMat=new THREE.MeshStandardMaterial({color:0x2b3034,metalness:.8,roughness:.5,normalMap:metalN});
    box(.34,.34,1.74,-3.2,CH-.17,2.35,jambMat);             // dintel arriba del hueco (cubre el hueco ensanchado, centro 2.35)
    box(.34,2.32,.16,-3.2,1.16,1.5,jambMat);                // jamba norte del hueco (borde z=1.5)
    {const s=new THREE.Mesh(new THREE.BoxGeometry(.04,2.2,.05),new THREE.MeshBasicMaterial({color:0x39ffd0}));s.position.set(-3.05,1.16,1.54);scene.add(s);}
    // (3) DOCK DE CARGA (base + columna + brazo + pinza luminosa) contra el muro oeste, donde el robot se acopla
    const steelD=new THREE.MeshStandardMaterial({color:0x3a4046,metalness:.85,roughness:.42,normalMap:metalN});
    const dock=new THREE.Group();dock.position.set(-6.25,0,1.1);scene.add(dock);
    dock.add(meshBox(.7,.18,.9,.05,.09,0,steelD));          // base
    dock.add(meshBox(.34,1.7,.5,-.05,.85,0,steelD));        // columna/respaldo
    const cradle=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.12,16),steelD);cradle.position.set(.18,.34,0);dock.add(cradle); // cuna donde apoya el robot
    const arm=meshBox(.5,.08,.08,.22,1.35,0,steelD);arm.rotation.z=-.12;dock.add(arm); // brazo cargador
    const clampG=new THREE.Mesh(new THREE.SphereGeometry(.07,12,12),new THREE.MeshBasicMaterial({color:0x39ffd0}));clampG.position.set(.46,1.28,0);dock.add(clampG); // pinza con glow
    // (4) LEDs del dock (cian + verde alternados) en la columna — vida visual barata
    for(let i=0;i<6;i++){const c=i%2?0x39ff66:0x39ffd0;const l=new THREE.Mesh(new THREE.SphereGeometry(.022,8,8),new THREE.MeshBasicMaterial({color:c}));l.position.set(-.05+.18,.45+i*.18,.255);dock.add(l);chargeLeds.push(l);}
    dock.children.forEach(c=>{if(c.isMesh&&!c.material.color)c.castShadow=true;});
    dockGlow=new THREE.PointLight(0x39ffd0,.28,3.2,2);dockGlow.position.set(-6.0,1.0,1.1);scene.add(dockGlow); // glow del acople (acompaña a la placa: tenue en reposo → brillante al cargar)
    // (3b) PLACA DE CARGA en el piso, bajo el dock y donde Beeko se planta. Plataforma metálica con líneas/contactos que se encienden al cargar. SIN collider (Beeko se para encima).
    const plate=new THREE.Group();plate.position.set(PLATE_CX,0,PLATE_CZ);scene.add(plate);
    const plSteel=new THREE.MeshStandardMaterial({color:0x2c3238,metalness:.8,roughness:.5,normalMap:metalN}); // chapa superior un poco más clara
    plate.add(meshBox(1.5,.05,1.62,0,.025,0,steelD));               // slab base (acero oscuro)
    plate.add(meshBox(1.34,.02,1.46,0,.052,0,plSteel));             // panel superior (chapa)
    for(const[bx,bz,sx,sz]of[[0,.79,1.5,.06],[0,-.79,1.5,.06],[.72,0,.06,1.62],[-.72,0,.06,1.62]])plate.add(meshBox(sx,.07,sz,bx,.035,bz,steelD)); // lip/borde elevado (4 barras)
    for(const sx of[-.6,.6])for(const sz of[-.66,.66]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.024,6),steelD);bolt.position.set(sx,.06,sz);plate.add(bolt);} // tornillos en esquinas (detalle técnico)
    // --- elementos que SE ILUMINAN (líneas de energía + contactos): material emisivo compartido, modulado en el loop ---
    plateMat=new THREE.MeshStandardMaterial({color:0x0c1a17,emissive:0x39ffd0,emissiveIntensity:0,roughness:.35,metalness:.2});
    plate.add(meshBox(.05,.012,1.34,-.42,.063,0,plateMat));plate.add(meshBox(.05,.012,1.34,.42,.063,0,plateMat));plate.add(meshBox(1.16,.012,.05,0,.063,0,plateMat)); // 2 líneas longitudinales + 1 transversal
    for(const[bx,bz,sx,sz]of[[0,.62,1.2,.03],[0,-.62,1.2,.03],[.58,0,.03,1.27],[-.58,0,.03,1.27]])plate.add(meshBox(sx,.012,sz,bx,.063,bz,plateMat)); // rectángulo-guía interior (borde luminoso)
    for(const cz of[-.3,0,.3]){const pad=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.014,16),plateMat);pad.position.set(0,.064,cz);plate.add(pad);} // 3 contactos de carga centrales
    plate.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=true;}}); // placa baja: recibe la sombra de Beeko, no proyecta
    platePulse=new THREE.PointLight(0x39ffd0,0,2.6,2);platePulse.position.set(PLATE_CX,.5,PLATE_CZ);scene.add(platePulse); // pulso que sube de la placa al cargar
    // (5) MEDIDOR DE CARGA en el muro oeste — LEE STREAM.charge. Barra vertical que crece + lectura % en canvas.
    const gx=-6.42,gz=2.0,gy0=.75,gH=.85;
    box(.16,gH+.12,.12,gx,gy0+gH/2,gz,steelD);              // carcasa del medidor
    box(.10,gH,.04,gx+.035,gy0+gH/2,gz,new THREE.MeshStandardMaterial({color:0x07120c,roughness:.6})); // fondo negro del display
    chargeFillG=new THREE.Group();chargeFillG.position.set(gx+.05,gy0,gz);chargeFillG.scale.y=.001;scene.add(chargeFillG); // origen en la BASE → crece hacia arriba
    {const fill=new THREE.Mesh(new THREE.BoxGeometry(.085,gH,.03),new THREE.MeshBasicMaterial({color:0x39ff88}));fill.position.set(0,gH/2,0);chargeFillG.add(fill);}
    const gGlow=new THREE.PointLight(0x39ff88,.5,2.2,2);gGlow.position.set(gx+.2,gy0+gH/2,gz);scene.add(gGlow);
    const ncv=cv(128,64);chargeNumX=ncv.getContext('2d');chargeNumTex=new THREE.CanvasTexture(ncv);chargeNumTex.anisotropy=4;
    const num=new THREE.Mesh(new THREE.PlaneGeometry(.34,.17),new THREE.MeshBasicMaterial({map:chargeNumTex,transparent:true}));num.position.set(gx+.07,gy0+gH+.2,gz);num.rotation.y=Math.PI/2;scene.add(num); // lectura % mirando al este (a la sala)
    // (6) PANTALLA DE DIAGNÓSTICO (muro norte): monitor de la estación que muestra el modelo R-01 girando.
    // TÉCNICA: render-to-texture. Una mini-escena propia (robot + luces) se renderiza a un WebGLRenderTarget cada
    // frame (en el loop, antes del composer) y esa textura va en el plano de la pantalla con MeshBasicMaterial
    // (no la afecta la luz de la sala → se ve "encendida"). Centrado perfecto: el robot cuelga de un pivot en el
    // centro de SU escena y la diagCam lo encuadra por esfera envolvente (invariante a la rotación → nunca toca bordes).
    const RTS=SMALL?256:512;
    diagRT=new THREE.WebGLRenderTarget(RTS,RTS,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});
    diagScene=new THREE.Scene();diagScene.background=new THREE.Color(0x04130c); // fondo CRT oscuro verdoso
    diagCam=new THREE.PerspectiveCamera(32,1,.05,50);
    // rejilla de fondo dentro de la pantalla (da profundidad y lenguaje "scanner")
    {const gc=cv(256,256),gx2=gc.getContext('2d');gx2.fillStyle='#04130c';gx2.fillRect(0,0,256,256);gx2.strokeStyle='rgba(60,255,160,.16)';gx2.lineWidth=1;for(let i=0;i<=256;i+=24){gx2.beginPath();gx2.moveTo(i,0);gx2.lineTo(i,256);gx2.stroke();gx2.beginPath();gx2.moveTo(0,i);gx2.lineTo(256,i);gx2.stroke();}const gt=new THREE.CanvasTexture(gc);const gp=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshBasicMaterial({map:gt}));gp.position.set(0,0,-2.2);diagScene.add(gp);}
    // luces de la mini-escena: key cian-verde + relleno frío + contraluz, para que el robot se LEA bien
    {const k=new THREE.DirectionalLight(0xc8fff0,1.5);k.position.set(2,3,4);diagScene.add(k);const f=new THREE.DirectionalLight(0x6fd0ff,.6);f.position.set(-3,1,2);diagScene.add(f);const r=new THREE.DirectionalLight(0x39ff88,.7);r.position.set(0,2,-4);diagScene.add(r);diagScene.add(new THREE.AmbientLight(0x335544,.7));}
    // 2a instancia del MISMO GLB (independiente del robot vivo, SIN mixer → pose bind estática que gira en bloque)
    try{new THREE.GLTFLoader().load('assets/robot.glb',function(g){
      const m=g.scene;m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
      const sph=new THREE.Box3().setFromObject(m).getBoundingSphere(new THREE.Sphere());
      diagPivot=new THREE.Group();m.position.sub(sph.center);diagPivot.add(m);diagScene.add(diagPivot); // recentro: la esfera queda en el origen → gira sin desplazarse
      const d=sph.radius/Math.sin(diagCam.fov*Math.PI/360)*1.18;                                       // distancia que encuadra la esfera + margen (1.18)
      diagCam.position.set(0,sph.radius*.12,d);diagCam.lookAt(0,0,0);                                   // leve picado, mirando al centro
    },undefined,function(){});}catch(e){}
    // marco/bezel del monitor + plano de pantalla (RTT) + tira de specs (UI de la terminal).
    // UBICACIÓN: muro OESTE, al norte del dock, mirando al ESTE (+x) → CAM 07 lo encuadra JUNTO al dock y el medidor
    // (antes estaba en el muro norte, a +38° del eje de la cámara = fuera de cuadro). rot.y=π/2 gira la normal +z→+x.
    const RY=Math.PI/2, MZ=-0.1; // z del monitor en el muro oeste (al norte del dock, que está en z≈1.1)
    box(.08,1.06,.96,-6.41,1.52,MZ,steelD);                                                              // carcasa del monitor (muro oeste)
    box(.02,.96,.86,-6.36,1.52,MZ,new THREE.MeshStandardMaterial({color:0x0a0f0c,roughness:.5}));        // marco interior negro
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.74,.62),new THREE.MeshBasicMaterial({map:diagRT.texture}));screen.position.set(-6.35,1.66,MZ);screen.rotation.y=RY;scene.add(screen); // PANTALLA (textura del render-to-texture), mira al este
    {const sc2=cv(512,180),sx=sc2.getContext('2d');sx.fillStyle='#06120c';sx.fillRect(0,0,512,180);
      sx.fillStyle='#39ff88';sx.shadowColor='#39ff88';sx.shadowBlur=6;sx.font='20px VT323, monospace';sx.textBaseline='middle';
      sx.fillText('R-01 UNIT · DIAGNOSTICS',16,24);
      sx.font='19px VT323, monospace';sx.fillStyle='#bff7d2';sx.shadowBlur=4;
      sx.fillText('CORE BATTERY ........ 88%',16,62);
      sx.fillText('CHARGE REQ. ......... dock · ~2 HRS',16,92);
      sx.fillStyle='#39ff88';sx.fillText('STATUS: OPERATIONAL',16,128);
      const st=new THREE.CanvasTexture(sc2);st.anisotropy=4;
      const strip=new THREE.Mesh(new THREE.PlaneGeometry(.74,.26),new THREE.MeshBasicMaterial({map:st}));strip.position.set(-6.35,1.24,MZ);strip.rotation.y=RY;scene.add(strip);}
    const scrGlow=new THREE.PointLight(0x39ff88,.45,2,2);scrGlow.position.set(-6.05,1.5,MZ);scene.add(scrGlow); // resplandor del monitor sobre la sala
    // (7) tendido de caños/cables (conduit) — del dock suben al techo y corren por el muro oeste hacia el panel
    const tubeMat=new THREE.MeshStandardMaterial({color:0x23272b,metalness:.4,roughness:.8});
    function tube(x1,y1,z1,x2,y2,z2,r){const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2),len=a.distanceTo(b);const m=new THREE.Mesh(new THREE.CylinderGeometry(r||.04,r||.04,len,8),tubeMat);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());m.castShadow=true;scene.add(m);return m;}
    tube(-6.0,1.7,1.1,-6.0,CH-.05,1.1,.05);   // sube del dock al techo
    tube(-6.42,1.6,2.0,-6.42,CH-.05,2.0,.04);  // sube del medidor al techo
    tube(-6.0,CH-.1,1.1,-6.0,CH-.1,2.5,.045);  // corre por el techo (oeste) hacia el panel
    tube(-6.42,CH-.1,2.0,-6.0,CH-.1,2.5,.04);
    // (8) panel eléctrico / transformador (muro oeste, esquina sur) con LED de estado
    const pan=new THREE.Group();pan.position.set(-6.46,1.2,2.6);scene.add(pan);
    pan.add(meshBox(.1,.7,.5,0,0,0,steelD));
    for(const yy of[-.2,0,.2])pan.add(meshBox(.04,.1,.4,.06,yy,0,new THREE.MeshStandardMaterial({color:0x2a2e32,roughness:.7})));
    {const pl=new THREE.Mesh(new THREE.SphereGeometry(.025,8,8),new THREE.MeshBasicMaterial({color:0x39ff66}));pl.position.set(.08,.28,.18);pan.add(pl);chargeLeds.push(pl);}
    pan.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
    // (9) luz ambiente de sala (fría y tenue: clima técnico de sala de máquinas) + relleno bajo
    const rmLight=new THREE.PointLight(0x9fb0c8,.85,7,2);rmLight.position.set(cx,CH-.3,cz);scene.add(rmLight);
    const rmFill=new THREE.PointLight(0x5a6e88,.4,6,2);rmFill.position.set(-4.0,1.4,2.4);scene.add(rmFill);
    // ====== DENSIDAD "SALA DE MÁQUINAS" — TODO procedural (box/cylinder/canvas+luces), decorativo SIN collider.
    // Va en PAREDES / TECHO / RINCONES, NUNCA en la línea puerta→dock. El robot sólo transita
    // door(z≈2.35) → CARC(-5.4,1.1) → dock, y se planta en CARC; el norte (z<0.6) y los rincones quedan libres de él.
    {
      const cab=new THREE.MeshStandardMaterial({color:0x2a2f34,metalness:.7,roughness:.55,normalMap:metalN});
      const dark=new THREE.MeshStandardMaterial({color:0x1c2024,metalness:.5,roughness:.7});
      const breaker=new THREE.MeshStandardMaterial({color:0x14181b,roughness:.8});
      const led=(x,y,z,c,blink)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.02,8,8),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);scene.add(m);if(blink)chargeLeds.push(m);return m;};
      const sign=(canvas,w,h,x,y,z,ry)=>{const t=new THREE.CanvasTexture(canvas);t.anisotropy=4;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true}));m.position.set(x,y,z);if(ry)m.rotation.y=ry;scene.add(m);return m;};
      // --- texturas de señalética/rejilla (canvas) ---
      const hazTex=(l1,l2)=>{const c=cv(256,128),x=c.getContext('2d');x.fillStyle='#15120a';x.fillRect(0,0,256,128);
        for(const yy of[0,116]){x.fillStyle='#e3c200';x.fillRect(0,yy,256,12);x.fillStyle='#000';for(let s=-12;s<260;s+=20){x.beginPath();x.moveTo(s,yy);x.lineTo(s+10,yy);x.lineTo(s-2,yy+12);x.lineTo(s-12,yy+12);x.closePath();x.fill();}}
        x.fillStyle='#e3c200';x.font='bold 30px Anton, sans-serif';x.textAlign='center';x.fillText(l1,128,60);
        x.font='16px VT323, monospace';x.fillStyle='#c9d8b0';x.fillText(l2,128,88);return c;};
      const ventTex=()=>{const c=cv(128,128),x=c.getContext('2d');x.fillStyle='#191d20';x.fillRect(0,0,128,128);x.strokeStyle='#070909';x.lineWidth=4;for(let yy=10;yy<124;yy+=13){x.beginPath();x.moveTo(8,yy);x.lineTo(120,yy);x.stroke();}x.strokeStyle='#3a4248';x.lineWidth=1;for(let yy=13;yy<124;yy+=13){x.beginPath();x.moveTo(8,yy);x.lineTo(120,yy);x.stroke();}x.strokeStyle='#2a3034';x.lineWidth=3;x.strokeRect(4,4,120,120);return c;};
      const grilleTex=()=>{const c=cv(128,128),x=c.getContext('2d');x.fillStyle='#07090a';x.fillRect(0,0,128,128);x.strokeStyle='#222a2c';x.lineWidth=5;for(let i=4;i<=128;i+=15){x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(128,i);x.stroke();}x.strokeStyle='#0d1011';x.lineWidth=2;x.strokeRect(2,2,124,124);return c;};
      const RYW=Math.PI/2; // mira al ESTE (muro oeste)
      // (A) GABINETE DE BREAKERS en el muro NORTE, rincón NO (lejos del paso del robot)
      {const g=new THREE.Group();g.position.set(-5.7,0,-0.92);scene.add(g);
        g.add(meshBox(.92,1.5,.16,0,1.28,0,cab));                                  // cuerpo
        g.add(meshBox(.4,1.4,.02,-.23,1.28,.1,breaker));g.add(meshBox(.4,1.4,.02,.23,1.28,.1,breaker)); // dos puertas
        for(let r=0;r<5;r++)for(let i=0;i<6;i++)g.add(meshBox(.05,.12,.015,-.34+i*.135,.85+r*.18,.11,dark)); // grilla de interruptores
        g.add(meshBox(.04,.1,.02,-.23,1.95,.11,steelD));g.add(meshBox(.04,.1,.02,.23,1.95,.11,steelD));    // manijas
        g.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
        led(-5.95,1.98,-0.80,0x39ff66,true);led(-5.78,1.98,-0.80,0xffaa00,true);led(-5.6,1.98,-0.80,0x39ff66,false);}
      sign(hazTex('HIGH VOLTAGE','480V · DO NOT OPEN'),.5,.25,-5.7,2.18,-0.83,0);   // cartel sobre el gabinete
      // (B) CAJA DE FUSIBLES + junction box en el muro OESTE, entre el monitor (z=-0.1) y el dock (z=1.1)
      {const g=new THREE.Group();g.position.set(-6.45,1.5,0.55);g.rotation.y=RYW;scene.add(g);
        g.add(meshBox(.34,.46,.16,0,0,0,cab));g.add(meshBox(.3,.42,.02,0,0,.09,breaker));
        for(const px of[-.08,.08])g.add(meshBox(.05,.3,.02,px,0,.1,dark));
        g.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
      led(-6.35,1.62,0.46,0x39ff66,true);led(-6.35,1.62,0.64,0xff3355,true);
      sign(hazTex('DANGER','ELECTRICAL HAZARD'),.42,.21,-6.43,1.92,0.55,RYW);
      // (C) DUCTO DE VENTILACIÓN en el techo (corre E-O por el norte) + rejilla en un extremo + soportes
      {const yD=2.40;box(2.9,.28,.3,-4.85,yD,-0.7,dark);
        for(const sx of[-6.0,-5.0,-4.0,-3.6])box(.06,.22,.36,sx,yD+.22,-0.7,steelD); // flejes al techo
        sign(ventTex(),.42,.26,-3.42,yD,-0.7,RYW);}                               // rejilla del ducto (extremo este)
      // (D) BANDEJA DE CABLES en el techo (corre N-S por el muro oeste) + cables
      box(.2,.1,3.5,-6.3,2.5,1.0,dark);
      tube(-6.3,2.47,-0.7,-6.3,2.47,2.7,.03);tube(-6.24,2.47,-0.7,-6.24,2.47,2.7,.028);tube(-6.36,2.47,-0.5,-6.36,2.47,2.6,.025);
      // (E) CONDUITS conectando cajas con techo (sobre las paredes; nunca cruzan el piso central)
      tube(-5.7,2.04,-0.84,-5.7,2.4,-0.7,.035);   // gabinete norte → ducto
      tube(-6.42,1.7,0.55,-6.42,2.45,0.7,.03);    // caja oeste → bandeja
      tube(-6.45,1.55,2.6,-6.45,2.45,2.6,.03);    // panel sur → techo
      tube(-6.0,.2,-0.55,-6.0,.2,0.4,.04);        // cable bajo por el rincón NO (contra pared, fuera del paso)
      // (F) RESPIRADERO de piso en el rincón NO (plano al ras, decorativo) + mancha de uso
      {const gr=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.MeshStandardMaterial({map:tex(grilleTex(),1),roughness:.9,metalness:.3}));gr.rotation.x=-Math.PI/2;gr.position.set(-5.9,.012,-0.45);scene.add(gr);}
      {const st=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.0),new THREE.MeshBasicMaterial({map:tex(grime('#0a0d0a'),1),transparent:true,opacity:.5,depthWrite:false}));st.rotation.x=-Math.PI/2;st.position.set(-5.9,.014,1.0);scene.add(st);} // mancha bajo el dock
      // (G) REJILLA DE VENTILACIÓN en el muro norte (panel ranurado) + cartel de tensión
      sign(ventTex(),.55,.4,-3.9,1.25,-0.9,0);
      // (H) PROPS DE RINCÓN (NO, contra la pared, sin collider — el robot nunca llega al norte de la sala)
      {const g=new THREE.Group();g.position.set(-6.15,0,-0.6);scene.add(g);
        g.add(meshBox(.42,.4,.4,0,.2,0,cab));g.add(meshBox(.4,.28,.38,.02,.55,-.02,dark)); // dos cajas apiladas (baterías/equipo)
        g.add(meshBox(.06,.06,.5,0,.42,0,steelD));                                          // caño suelto encima
        g.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
        led(-6.15,.62,-0.42,0x39ff66,true);}
      // luz de estado tenue del rincón de máquinas (verde frío, sutil)
      const mLed=new THREE.PointLight(0x39ff66,.3,2.2,2);mLed.position.set(-5.8,1.6,-0.55);scene.add(mLed);
      // (I) UMBRAL de la puerta (placa metálica al ras en el hueco z[1.5,3.2]=1.7m) — enmarca el paso y disimula el borde
      {const th=new THREE.Mesh(new THREE.PlaneGeometry(.5,1.7),new THREE.MeshStandardMaterial({color:0x3a4046,metalness:.85,roughness:.45,normalMap:metalN}));th.rotation.x=-Math.PI/2;th.position.set(-3.2,.013,2.35);scene.add(th);}
      // (J) PÓSTER (rastro humano ausente, como las literas/la taza del descanso): assets/miku.png pegado con cinta
      // al muro NORTE, en el hueco entre el gabinete de breakers (x≈-5.7) y la rejilla (x≈-3.9). CAM 07 lo encuadra
      // arriba-izquierda, sin tapar dock/medidor/pantalla. Decoración: SIN collider (el robot nunca llega al norte).
      // NO es un guiño limpio: lo envejecemos en el material (desaturado, oscurecido, manchas de humedad, esquina
      // despegada, cinta amarillenta) para que lleve "años en la pared". El grano/scanlines de cámara terminan de integrarlo.
      {
        const PW=0.56, PH=0.84;                                    // 2:3 (igual que miku.png 1024×1536), póster realista (~A1)
        const pcv=cv(512,768), pctx=pcv.getContext('2d');
        pctx.fillStyle='#3a3d30';pctx.fillRect(0,0,512,768);       // respaldo papel viejo por si la imagen no carga (no un hueco negro)
        const pTex=new THREE.CanvasTexture(pcv);pTex.anisotropy=4;
        // MeshStandard (objeto del mundo, lo LAVA la luz de sala — no MeshBasic como las pantallas/UI). Emisivo ínfimo
        // para que no quede pisado a negro en la penumbra, sin "brillar" como algo nuevo.
        const pMat=new THREE.MeshStandardMaterial({map:pTex,roughness:.96,metalness:0,emissive:0x0a0e08,emissiveMap:pTex,emissiveIntensity:.10});
        const poster=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),pMat);
        poster.position.set(-4.42,1.42,-0.83);poster.rotation.z=0.02; // muro norte (cara interior z≈-0.85) mirando al sur (+z); leve torcido = "lo colgaron hace mucho". Corrido un toque a la der. para hacerle lugar al cuadro del dev a la izquierda (par parejo).
        scene.add(poster);
        // --- envejecido por canvas (se aplica al cargar la imagen; degradación: si falla queda el respaldo) ---
        function agePoster(img){const W=512,H=768;pctx.clearRect(0,0,W,H);
          pctx.drawImage(img,0,0,W,H);                                                                                  // 1) base
          pctx.globalCompositeOperation='saturation';pctx.globalAlpha=.6;pctx.fillStyle='#808080';pctx.fillRect(0,0,W,H);// 2) DESATURADO (gris en blend 'saturation')
          pctx.globalCompositeOperation='multiply';pctx.globalAlpha=.5;pctx.fillStyle='#8c8158';pctx.fillRect(0,0,W,H);  // 3) tinte papel viejo (amarillo-marrón)
          pctx.globalAlpha=.28;pctx.fillStyle='#23271c';pctx.fillRect(0,0,W,H);                                          //    + oscurecido (clima búnker)
          const stain=(x,y,r,c,a)=>{const g=pctx.createRadialGradient(x,y,r*.15,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,255,255,0)');pctx.globalAlpha=a;pctx.fillStyle=g;pctx.beginPath();pctx.arc(x,y,r,0,7);pctx.fill();};
          pctx.globalCompositeOperation='multiply';                                                                      // 4) MANCHAS DE HUMEDAD (sutiles, lejos de la cara)
          stain(60,80,110,'#6b5a36',.4);stain(470,300,170,'#5a4d30',.5);stain(110,700,200,'#534a2e',.6);stain(400,650,120,'#6b5a3a',.45);
          pctx.globalAlpha=1;const vg=pctx.createRadialGradient(W/2,H/2,H*.32,W/2,H/2,H*.62);vg.addColorStop(0,'#fff');vg.addColorStop(1,'#5a5848');pctx.fillStyle=vg;pctx.fillRect(0,0,W,H); // 5) bordes gastados (viñeta multiply)
          pctx.globalCompositeOperation='overlay';pctx.globalAlpha=.1;for(let i=0;i<14;i++){pctx.fillStyle=i%2?'#000':'#fff';pctx.fillRect((i*37+13)%W,0,1+(i%3),H);} // 6) descoloridos verticales (sol/roce)
          pctx.globalCompositeOperation='source-over';                                                                   // 7) CINTA amarillenta en las esquinas de arriba (alguien lo pegó)
          const tape=(tx,ty,ang)=>{pctx.save();pctx.translate(tx,ty);pctx.rotate(ang);pctx.globalAlpha=.42;pctx.fillStyle='#cfc9a8';pctx.fillRect(-46,-15,92,30);pctx.globalAlpha=.16;pctx.fillStyle='#000';pctx.fillRect(-46,-15,4,30);pctx.fillRect(42,-15,4,30);pctx.restore();};
          tape(46,42,-0.7);tape(466,42,0.7);
          pctx.globalAlpha=1;                                                                                            // 8) ESQUINA DESPEGADA (abajo-derecha): muro detrás + dorso del papel curvado + sombra
          pctx.fillStyle='#1d2018';pctx.beginPath();pctx.moveTo(W,H);pctx.lineTo(W-150,H);pctx.lineTo(W,H-150);pctx.closePath();pctx.fill();
          pctx.fillStyle='#b9b39a';pctx.beginPath();pctx.moveTo(W,H);pctx.lineTo(W-95,H);pctx.lineTo(W,H-95);pctx.closePath();pctx.fill();
          pctx.globalAlpha=.25;pctx.fillStyle='#000';pctx.beginPath();pctx.moveTo(W-95,H);pctx.lineTo(W,H-95);pctx.lineTo(W-68,H-68);pctx.closePath();pctx.fill();
          pctx.globalAlpha=1;pctx.globalCompositeOperation='source-over';pTex.needsUpdate=true;}
        try{const _img=new Image();_img.onload=()=>{try{agePoster(_img);}catch(e){}};_img.onerror=()=>{};_img.src='assets/miku.png';}catch(e){}
      }
      // (J2) CUADRO DEL DESARROLLADOR (assets/dev.jpg) — AL LADO de Miku (a su izquierda), MISMO marco/montaje desgastado: idéntico tamaño (2:3), misma cinta,
      // esquina despegada, viñeta y manchas → quedan como dos cuadros de la misma pared. La foto es ~cuadrada (1020×1030) → se recorta a 2:3 (cover, centrado,
      // conserva la cara). Ya viene con tinte verde/desgaste, así que el grading de color va MÁS SUAVE para no embarrarla; el montaje/wear es idéntico.
      {
        const PW=0.56, PH=0.84;                                    // mismo que Miku → par parejo
        const dcv=cv(512,768), dctx=dcv.getContext('2d');
        dctx.fillStyle='#3a3d30';dctx.fillRect(0,0,512,768);
        const dTex=new THREE.CanvasTexture(dcv);dTex.anisotropy=4;
        const dMat=new THREE.MeshStandardMaterial({map:dTex,roughness:.96,metalness:0,emissive:0x0a0e08,emissiveMap:dTex,emissiveIntensity:.10});
        const devpic=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),dMat);
        devpic.position.set(-5.02,1.42,-0.832);devpic.rotation.z=-0.018; // a la izquierda de Miku, leve torcido OPUESTO (variedad)
        scene.add(devpic);
        function ageDev(img){const W=512,H=768;dctx.clearRect(0,0,W,H);
          const ir=img.width/img.height,cr=W/H; let dw,dh,dx,dy; if(ir>cr){dh=H;dw=H*ir;dx=(W-dw)/2;dy=0;}else{dw=W;dh=W/ir;dx=0;dy=(H-dh)/2;} dctx.drawImage(img,dx,dy,dw,dh); // 1) base (cover-fit, recorta lados)
          dctx.globalCompositeOperation='saturation';dctx.globalAlpha=.32;dctx.fillStyle='#808080';dctx.fillRect(0,0,W,H); // 2) desaturado SUAVE (ya viene tinteada)
          dctx.globalCompositeOperation='multiply';dctx.globalAlpha=.30;dctx.fillStyle='#8c8158';dctx.fillRect(0,0,W,H);  // 3) tinte papel viejo suave
          dctx.globalAlpha=.24;dctx.fillStyle='#23271c';dctx.fillRect(0,0,W,H);                                          //    + oscurecido (clima búnker)
          const stain=(x,y,r,c,a)=>{const g=dctx.createRadialGradient(x,y,r*.15,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,255,255,0)');dctx.globalAlpha=a;dctx.fillStyle=g;dctx.beginPath();dctx.arc(x,y,r,0,7);dctx.fill();};
          dctx.globalCompositeOperation='multiply';                                                                      // 4) manchas de humedad (lejos de la cara)
          stain(70,90,120,'#6b5a36',.4);stain(450,310,170,'#5a4d30',.48);stain(120,690,200,'#534a2e',.55);stain(410,660,120,'#6b5a3a',.42);
          dctx.globalAlpha=1;const vg=dctx.createRadialGradient(W/2,H/2,H*.32,W/2,H/2,H*.62);vg.addColorStop(0,'#fff');vg.addColorStop(1,'#5a5848');dctx.fillStyle=vg;dctx.fillRect(0,0,W,H); // 5) bordes gastados
          dctx.globalCompositeOperation='overlay';dctx.globalAlpha=.1;for(let i=0;i<14;i++){dctx.fillStyle=i%2?'#000':'#fff';dctx.fillRect((i*37+13)%W,0,1+(i%3),H);} // 6) descoloridos verticales
          dctx.globalCompositeOperation='source-over';                                                                   // 7) CINTA amarillenta en las esquinas de arriba
          const tape=(tx,ty,ang)=>{dctx.save();dctx.translate(tx,ty);dctx.rotate(ang);dctx.globalAlpha=.42;dctx.fillStyle='#cfc9a8';dctx.fillRect(-46,-15,92,30);dctx.globalAlpha=.16;dctx.fillStyle='#000';dctx.fillRect(-46,-15,4,30);dctx.fillRect(42,-15,4,30);dctx.restore();};
          tape(46,42,0.7);tape(466,42,-0.7);                                                                             // ángulos espejados respecto de Miku
          dctx.globalAlpha=1;                                                                                            // 8) ESQUINA DESPEGADA (abajo-IZQUIERDA, espejada respecto de Miku)
          dctx.fillStyle='#1d2018';dctx.beginPath();dctx.moveTo(0,H);dctx.lineTo(150,H);dctx.lineTo(0,H-150);dctx.closePath();dctx.fill();
          dctx.fillStyle='#b9b39a';dctx.beginPath();dctx.moveTo(0,H);dctx.lineTo(95,H);dctx.lineTo(0,H-95);dctx.closePath();dctx.fill();
          dctx.globalAlpha=.25;dctx.fillStyle='#000';dctx.beginPath();dctx.moveTo(95,H);dctx.lineTo(0,H-95);dctx.lineTo(68,H-68);dctx.closePath();dctx.fill();
          dctx.globalAlpha=1;dctx.globalCompositeOperation='source-over';dTex.needsUpdate=true;}
        try{const _img2=new Image();_img2.onload=()=>{try{ageDev(_img2);}catch(e){}};_img2.onerror=()=>{};_img2.src='assets/dev.jpg';}catch(e){}
      }
    }
  }

  // ---- materiales + helpers de props nuevos ----
  const _lockMat=new THREE.MeshStandardMaterial({color:0x4b5358,normalMap:metalN,roughness:.5,metalness:.85});
  const _whiteMat=new THREE.MeshStandardMaterial({color:0xcfd2cc,roughness:.6,metalness:.15});
  const _woodMat=new THREE.MeshStandardMaterial({map:tex(grime('#5a4a32'),1),normalMap:_wn,roughness:.92});
  function locker(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
    g.add(meshBox(.74,1.8,.46,0,.9,0,_lockMat));
    g.add(meshBox(.36,1.7,.02,-.18,.9,.24,doorMat));g.add(meshBox(.36,1.7,.02,.18,.9,.24,doorMat));
    for(const yy of[.5,.95,1.4]){g.add(meshBox(.3,.02,.01,-.18,yy,.255,steelMat));g.add(meshBox(.3,.02,.01,.18,yy,.255,steelMat));}
    g.add(meshBox(.03,.12,.03,-.03,.95,.26,steelMat));g.add(meshBox(.03,.12,.03,.03,.95,.26,steelMat));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
  function armchair(x,z,rot,col){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
    const m=new THREE.MeshStandardMaterial({color:col||0x4a3f30,roughness:.95});
    g.add(meshBox(.62,.16,.6,0,.34,0,m));g.add(meshBox(.62,.5,.14,0,.6,-.24,m));
    g.add(meshBox(.13,.34,.58,-.27,.46,.02,m));g.add(meshBox(.13,.34,.58,.27,.46,.02,m));
    g.add(meshBox(.5,.13,.5,0,.45,.02,new THREE.MeshStandardMaterial({color:0x564833,roughness:1})));
    for(const px of[-.26,.26])for(const pz of[-.24,.24])g.add(meshBox(.05,.26,.05,px,.13,pz,steelMat));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
  function bunkbed(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
    for(const px of[-.6,.6])for(const pz of[-.95,.95])g.add(meshBox(.08,1.7,.08,px,.85,pz,steelMat));
    for(const yy of[.5,1.25]){g.add(meshBox(1.3,.08,2.0,0,yy,0,steelMat));
      g.add(meshBox(1.2,.12,1.9,0,yy+.1,0,new THREE.MeshStandardMaterial({color:0x6a6250,roughness:1})));
      g.add(meshBox(1.18,.1,.42,0,yy+.17,-.74,new THREE.MeshStandardMaterial({color:0xb8b4a4,roughness:1})));}
    g.add(meshBox(1.3,.7,.06,0,1.6,-.97,steelMat));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
  function jerryCan(x,z,col){const g=new THREE.Group();g.position.set(x,0,z);
    g.add(meshBox(.16,.34,.3,0,.18,0,new THREE.MeshStandardMaterial({color:col||0xb04030,roughness:.55,metalness:.3})));
    g.add(meshBox(.06,.05,.06,0,.37,0,steelMat));g.add(meshBox(.04,.07,.13,0,.36,-.02,steelMat));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
  function medCab(x,y,z,rot){const g=new THREE.Group();g.position.set(x,y,z);if(rot)g.rotation.y=rot;
    g.add(meshBox(.34,.42,.16,0,0,0,_whiteMat));
    g.add(meshBox(.18,.05,.02,0,0,.09,new THREE.MeshStandardMaterial({color:0xcc2222})));
    g.add(meshBox(.05,.18,.02,0,0,.09,new THREE.MeshStandardMaterial({color:0xcc2222})));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
  function ventGrille(x,y,z,rot){const g=new THREE.Group();g.position.set(x,y,z);if(rot)g.rotation.y=rot;
    g.add(meshBox(.6,.42,.04,0,0,0,new THREE.MeshStandardMaterial({color:0x2a2e30,metalness:.7,roughness:.5})));
    for(let i=-3;i<=3;i++)g.add(meshBox(.54,.028,.03,0,i*.055,.03,steelMat));
    scene.add(g);return g;}
  function deskTerm(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
    g.add(meshBox(1.1,.06,.55,0,.74,0,_woodMat));
    for(const px of[-.5,.5])for(const pz of[-.22,.22])g.add(meshBox(.06,.74,.06,px,.37,pz,steelMat));
    g.add(meshBox(.55,.05,.5,0,.4,0,_woodMat));
    g.add(meshBox(.42,.34,.36,0,.94,-.1,new THREE.MeshStandardMaterial({color:0x2b2b28,roughness:.6})));
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(.32,.24),new THREE.MeshBasicMaterial({color:0x0a2418}));scr.position.set(0,.94,.085);g.add(scr);
    const scrG=new THREE.Mesh(new THREE.PlaneGeometry(.3,.22),new THREE.MeshBasicMaterial({color:0x2bff8a,transparent:true,opacity:.16,blending:THREE.AdditiveBlending}));scrG.position.set(0,.94,.09);g.add(scrG);
    g.add(meshBox(.34,.03,.14,0,.78,.16,new THREE.MeshStandardMaterial({color:0x33373a,roughness:.7})));
    g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}

  // ---- colocaciones: DESCANSO ----
  // (el sofá voluminoso dominaba la toma de CAM 06 → reemplazado por un cajonero chico contra el muro oeste)
  {const cj=new THREE.Group();cj.position.set(-7.12,0,7.0);scene.add(cj);                 // cajonero (chest of drawers), perfil bajo
    cj.add(meshBox(.42,.72,.7,0,.36,0,sofaMat));                                            // cuerpo
    for(let i=0;i<3;i++){cj.add(meshBox(.04,.18,.6,.21,.18+i*.22,0,cushMat));const h=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.1,8),steelMat);h.rotation.z=Math.PI/2;h.position.set(.235,.18+i*.22,0);cj.add(h);} // cajones + tiradores
    cj.add(meshBox(.44,.04,.72,0,.74,0,sofaMat));                                           // tapa
    cj.children.forEach(c=>c.castShadow=true);}
  locker(-4.0,8.2,Math.PI);armchair(-6.6,5.9,Math.PI/2,0x3a4a5a); // (litera removida: estaba atravesada en la pared norte del rest)
  // alfombra: UNA sola, chica y sobria (las dos grandes rojas-marrón dominaban el primer plano de CAM 06). Corrida al centro-NE, fuera del foreground.
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(1.3,.9),new THREE.MeshStandardMaterial({map:tex(grime('#443a30'),1),roughness:1})),-5.0,.02,7.2,-Math.PI/2,0,0));
  // mesita+lámpara: estaba en (-4.0,7.0), JUSTO en el hueco de la puerta del descanso (z[6.045,7.355]) → corrida al rincón NO, fuera del paso
  // mesita+lámpara: movida al NE (entre el escritorio y el locker, contra el muro norte) para liberar el muro oeste donde va la silla
  box(.34,.5,.34,-4.6,.25,8.0,_woodMat);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(.06,10,10),new THREE.MeshBasicMaterial({color:0xffe2b0})).translateX(-4.6).translateY(.55).translateZ(8.0));

  // ====== ESTACIÓN DE CÓMPUTO (muro NORTE del descanso, mitad oeste) — el robot se sienta a "administrar el búnker".
  // 100% procedural (escritorio + monitor CRT + teclado + silla). La pantalla es un dashboard CRT por canvas (lee STREAM). ======
  {
    const DKX=-5.8;                                             // x del escritorio (entre el sofá al O y el locker al E)
    const deskW=new THREE.MeshStandardMaterial({map:tex(grime('#4a3a26'),1),normalMap:_wn,roughness:.85,metalness:.05}); // madera
    const plastic=new THREE.MeshStandardMaterial({color:0xb8b4a4,roughness:.7,metalness:.05});                          // beige de PC retro
    const darkP=new THREE.MeshStandardMaterial({color:0x1a1d20,roughness:.6,metalness:.3});
    const steelD2=new THREE.MeshStandardMaterial({color:0x3a4046,metalness:.85,roughness:.42,normalMap:metalN});
    // --- escritorio (contra el muro norte z=8.5) ---
    box(1.4,.06,.55,DKX,.76,8.12,deskW);                       // tablero
    for(const px of[-.64,.64])for(const pz of[-.22,.22])box(.06,.74,.06,DKX+px,.38,8.12+pz,steelD2); // patas
    box(1.34,.4,.04,DKX,.5,8.36,deskW);                        // panel trasero (contra la pared)
    // --- monitor CRT (cuerpo profundo beige + bisel + pantalla mirando al SUR, hacia el robot) ---
    box(.5,.42,.44,DKX,1.02,8.22,plastic);                     // carcasa (bulto profundo de CRT)
    box(.46,.38,.02,DKX,1.02,7.985,darkP);                     // marco negro del frente
    {const scv=cv(512,384);adminX=scv.getContext('2d');adminTex=new THREE.CanvasTexture(scv);adminTex.anisotropy=4;
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial({map:adminTex}));scr.position.set(DKX,1.04,7.975);scr.rotation.y=Math.PI;scene.add(scr);} // PANTALLA (canvas), mira al sur (-z) → robot y CAM 06
    box(.2,.06,.18,DKX,.8,8.22,plastic);                       // pie del monitor sobre el escritorio
    const scrGlowD=new THREE.PointLight(0x39ff88,.5,2.4,2);scrGlowD.position.set(DKX,1.05,7.7);scene.add(scrGlowD); // resplandor verde CRT
    // --- teclado + mouse + torre ---
    {const kb=meshBox(.42,.03,.15,DKX,.795,7.92,darkP);kb.castShadow=true;scene.add(kb);for(let r=0;r<3;r++)for(let c=0;c<9;c++)scene.add(meshBox(.03,.012,.025,DKX-.18+c*.045,.815,7.88+r*.04,plastic));} // teclas
    scene.add(meshBox(.07,.03,.11,DKX+.34,.795,7.95,darkP));    // mouse
    {const tw=new THREE.Group();tw.position.set(DKX+.86,0,8.1);scene.add(tw);tw.add(meshBox(.2,.5,.46,0,.25,0,plastic));for(let i=0;i<2;i++)tw.add(meshBox(.12,.012,.012,0,.34-i*.05,.235,darkP));const pw=new THREE.Mesh(new THREE.SphereGeometry(.012,8,8),new THREE.MeshBasicMaterial({color:0x39ff66}));pw.position.set(.05,.42,.235);tw.add(pw);tw.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});} // torre/CPU al costado
    // --- silla de oficina (el robot se sienta acá: asiento + respaldo + poste + base de 5 patas con ruedas) ---
    {const ch=new THREE.Group();ch.position.set(-6.98,0,7.75);ch.rotation.y=0.8;scene.add(ch);  // silla decorativa (el robot se para, no se sienta): contra el muro OESTE, gap libre entre cajonero (z7.35) y muro norte; no estorba ni cruza nada
      ch.add(meshBox(.44,.08,.42,0,.46,0,darkP));                                                 // asiento
      ch.add(meshBox(.44,.5,.08,0,.74,-.19,darkP));                                               // respaldo
      ch.add(new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.4,8),steelD2).translateY(.24));   // poste
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const leg=new THREE.Mesh(new THREE.BoxGeometry(.28,.04,.05),steelD2);leg.position.set(Math.cos(a)*.14,.06,Math.sin(a)*.14);leg.rotation.y=-a;ch.add(leg);const wh=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.03,8),darkP);wh.rotation.z=Math.PI/2;wh.position.set(Math.cos(a)*.28,.03,Math.sin(a)*.28);ch.add(wh);}
      ch.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    // --- cartelito de pared + lámpara de escritorio (clima de "puesto de trabajo") ---
    {const sc=cv(256,64),sx=sc.getContext('2d');sx.fillStyle='#0a140c';sx.fillRect(0,0,256,64);sx.strokeStyle='#39ff88';sx.lineWidth=2;sx.strokeRect(4,4,248,56);sx.fillStyle='#8fffb0';sx.shadowColor='#39ff88';sx.shadowBlur=6;sx.font='20px VT323, monospace';sx.textAlign='center';sx.textBaseline='middle';sx.fillText('CONTROL · SHELTER 404',128,34);
      const t=new THREE.CanvasTexture(sc);t.anisotropy=4;const sg=new THREE.Mesh(new THREE.PlaneGeometry(.55,.14),new THREE.MeshBasicMaterial({map:t,transparent:true}));sg.position.set(DKX,1.55,8.46);scene.add(sg);}
  }

  // ---- colocaciones: OBSERVATORIO (detalle pro) ----
  armchair(-1.2,2.7,Math.PI,0x4a3f30);
  // (terminal/observatorio deskTerm removido — cuello al taller despejado)
  jerryCan(-1.15,-3.85,0xb84028);jerryCan(-.95,-4.05,0x7a6a30);jerryCan(-1.35,-4.0,0xb84028);
  medCab(-2.5,1.5,-5.18,0);
  ventGrille(3.18,1.85,0.6,-Math.PI/2);
  box(.08,.08,3.2,3.13,2.2,0.6,doorMat);box(.08,.08,2.0,-3.13,2.25,-1.0,doorMat);
  for(const cz of[-3.6,-1.2,0.8,2.4]){const cb=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.5,6),new THREE.MeshStandardMaterial({color:0x141414,roughness:1}));cb.position.set(2.9,CH-.32,cz);cb.rotation.x=(Math.random()-.5)*.3;scene.add(cb);}
  // ---- PROPS GLB del OBSERVATORIO (esclusa/entrada al exterior): equipo de entrada-salida, suministros, monitoreo. REUSADOS (0 peso
  // nuevo), decorativos SIN collider, contra la PARED OESTE y staged junto a la compuerta BLAST (norte). Fuera de las líneas de nav. ----
  // pared OESTE (izquierda en CAM 01): estación de suministros + monitoreo
  loadProp('shelf_small.glb',-3.0,0,-2.3,.7,0);                       // estante (muro oeste)
  loadProp('radio.glb',-2.62,0,-2.55,.24,.5);                        // equipo de monitoreo del exterior
  loadProp('toolbox.glb',-2.9,0,0.35,.42,.3);                        // herramientas (muro oeste)
  loadProp('gas_can.glb',-2.9,0,1.05,.35,-.2);                       // bidón (muro oeste)
  // staging junto a la BLAST (norte): cajones/bidón/material como "suministros de cuando se selló el búnker"
  loadProp('wood_log.glb',1.3,0,-4.3,.4,.5);
  loadPlant('crate_metal.glb',[{x:-2.9,y:0,z:-1.4,target:.55,rotY:.2},{x:0.5,y:0,z:-4.6,target:.6,rotY:-.3},{x:1.15,y:0,z:-4.45,target:.5,rotY:.25}]); // cajones de suministros (oeste + esclusa)
  loadPlant('barrel.glb',[{x:-0.1,y:0,z:-4.75,target:.7,rotY:.4}]);                                              // bidón (esclusa). El bidón que estaba junto al contador (oeste) lo reemplaza el TELEVISOR ↓
  // ====== TELEVISOR CRT (observatorio) — reemplaza el barril que estaba junto al contador "TIME ALONE" del muro oeste ======
  // Procedural (0 assets), retro/gastado, sobre un mueble bajo. Estado ON/OFF leído de STREAM.tv (driver: la rutina en el tramo
  // OCIO; override de testeo: __REFUGIO.setTV(true/false)). ON = ESTÁTICA (ruido animado por canvas, "nieve") + glow frío que lava
  // la sala; OFF = pantalla negra, sin glow. Mira hacia el ESE (donde Beeko se planta a verlo y donde CAM 01 lo encuadra).
  let tvOn=false,tvStaticAcc=0,tvScrFrozen=false; // estado renderizado del TV (flanco para prender/apagar) + acumulador de la estática
  const tvGrp=new THREE.Group();tvGrp.position.set(-2.55,0,-0.5);tvGrp.rotation.y=Math.PI/2-0.32;scene.add(tvGrp); // muro oeste, frente angulado hacia la sala (+x con sesgo +z)
  const tvPlastic=new THREE.MeshStandardMaterial({map:tex(grime('#6f6a58'),1),normalMap:_wn,roughness:.82,metalness:.05}); // plástico beige viejo y sucio
  const tvDark=new THREE.MeshStandardMaterial({color:0x17140f,roughness:.7,metalness:.1});
  const tvMetal=new THREE.MeshStandardMaterial({color:0x2a2620,roughness:.55,metalness:.4});
  // (1) mueble bajo donde apoya el TV
  {const cab=new THREE.MeshStandardMaterial({map:tex(grime('#463d31'),1),normalMap:_wn,roughness:.9,metalness:.05});
   tvGrp.add(meshBox(.78,.46,.5,0,.25,0,cab));tvGrp.add(meshBox(.82,.04,.54,0,.5,0,tvDark));     // cuerpo + tapa
   for(const sx of[-.33,.33])for(const sz of[-.2,.2])tvGrp.add(meshBox(.05,.18,.05,sx,.09,sz,tvMetal));} // pequeñas patas
  const TVY=0.52; // base del TV (= tapa del mueble)
  // (2) carcasa del TV (caja CRT: frente ancho) + bisel frontal
  tvGrp.add(meshBox(.54,.42,.46,0,TVY+.21,0,tvPlastic));                                          // carcasa
  tvGrp.add(meshBox(.52,.40,.03,-.02,TVY+.21,.235,tvPlastic));                                    // marco/bisel frontal (mira +z local)
  // (3) PANTALLA embutida (mira +z local). MeshBasic = auto-iluminada cuando ON; el color baja el brillo cuando OFF.
  const tvScrCv=cv(160,120),tvScrX=tvScrCv.getContext('2d');tvScrX.fillStyle='#050605';tvScrX.fillRect(0,0,160,120);
  const tvScrData=tvScrX.createImageData(160,120);
  const tvScrTex=new THREE.CanvasTexture(tvScrCv);tvScrTex.anisotropy=2;
  const tvScrMat=new THREE.MeshBasicMaterial({map:tvScrTex,color:0x242424});                       // color≈gris oscuro = pantalla apagada (sin señal)
  const tvScreen=new THREE.Mesh(new THREE.PlaneGeometry(.40,.30),tvScrMat);tvScreen.position.set(-.04,TVY+.21,.252);tvGrp.add(tvScreen);
  // (4) perillas a la derecha del frente + parlante insinuado
  for(const ky of[TVY+.30,TVY+.14]){const k=new THREE.Mesh(new THREE.CylinderGeometry(.028,.03,.04,12),tvMetal);k.rotation.x=Math.PI/2;k.position.set(.20,ky,.245);tvGrp.add(k);}
  {const spk=meshBox(.1,.26,.02,.205,TVY+.21,.244,tvDark);for(let i=0;i<5;i++)tvGrp.add(meshBox(.09,.012,.005,.205,TVY+.30-i*.04,.249,tvMetal));tvGrp.add(spk);} // rejilla del parlante
  // (5) antena de conejo (V) en una esquina superior — gastada, apenas torcida
  for(const a of[-.5,.5]){const ant=new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,.5,6),tvMetal);ant.position.set(.12,TVY+.42,-.06);ant.rotation.z=a*0.7;ant.position.x+=a*.06;ant.translateY(.25);tvGrp.add(ant);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.012,8,8),tvMetal);tip.position.copy(ant.position);tip.translateY(.25);tvGrp.add(tip);}
  // (6) glow de la pantalla (frío, azulado) — encendido sólo cuando el TV está ON
  const tvGlow=new THREE.PointLight(0xaec6e0,0,2.6,2);tvGlow.position.set(-.04,TVY+.21,.55);tvGrp.add(tvGlow);
  // dibuja un cuadro de ESTÁTICA (ruido blanco/nieve) en el canvas de la pantalla
  function tvDrawStatic(){const d=tvScrData.data;for(let i=0;i<d.length;i+=4){const v=(Math.random()*255)|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}tvScrX.putImageData(tvScrData,0,0);tvScrTex.needsUpdate=true;}
  // ---- LÁMPARA INDUSTRIAL en cada sala (consistencia + lógica de búnker): clones del MISMO GLB (geometría compartida → ~0 peso).
  // Montadas al techo (sin collider, nunca bloquean la nav). Salto cultivo (luces de cultivo magenta) y colmena (glow ámbar). ----
  const LAMP_SPOTS=[[-0.3,-1.5],[0,4.3],[0,6.6],[5.4,7.0],[-5.4,7.0],[-4.9,1.1]]; // hub, pasillo, biblioteca, taller, descanso, carga
  loadPlant('lamp_industrial.glb',LAMP_SPOTS.map(s=>({x:s[0],y:1.95,z:s[1],target:.5,rotY:0})));
  for(const s of LAMP_SPOTS){const cord=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.24,6),new THREE.MeshStandardMaterial({color:0x14181b,roughness:.8}));cord.position.set(s[0],2.53,s[1]);scene.add(cord);} // cable al techo

  // ---- colocaciones: BIBLIOTECA ----
  // (sillón junto a la puerta del taller removido: no tenía collider y el robot lo atravesaba al entrar)

  // SALA C (CULTIVO) z[8.2,11.8]
  box(6.8,.3,3.6,0,-.15,10.0,floorMat);box(6.8,.3,3.6,0,CH,10.0,ceilMat);
  box(.3,CH+.3,.45,-3.4,CH/2,8.425,concreteMat);box(.3,CH+.3,1.45,-3.4,CH/2,11.075,concreteMat);box(.3,CH+.3,3.6,3.4,CH/2,10.0,concreteMat); // muro OESTE del cultivo PARTIDO: hueco z[8.65,10.35]=1.7m a FABRICACIÓN; muro este entero
  box(2.55,CH+.3,.3,-2.125,CH/2,11.8,concreteMat);box(2.55,CH+.3,.3,2.125,CH/2,11.8,concreteMat); // muro norte PARTIDO: abre el hueco x[-0.85,0.85]=1.7m a LA COLMENA
  const sbLight=new THREE.PointLight(0xa8c0e8,.9,8,2);sbLight.position.set(0,CH-.35,6.6);scene.add(sbLight);
  const scLight=new THREE.PointLight(0x9ab0d0,.6,7,2);scLight.position.set(1.4,CH-.35,10.2);scene.add(scLight);
  const paLight=new THREE.PointLight(0xbfd0e0,.5,4,2);paLight.position.set(0,CH-.3,4.2);scene.add(paLight);
  // (escritorio este removido — cuello al taller despejado)
  crate(2.75,.28,7.6,.6,.4);crate(1.95,.26,7.65,.55,-.3);shelf(-2.6,11.3,Math.PI);shelf(2.6,11.3,Math.PI); // cajas apoyadas contra el muro norte (cara z=8.05) sin atravesarlo, al norte del cuello BIBE→TALd; colliders matchean el tamaño

  // ====== SALA: LA COLMENA (CAM 08 · HIVE) — al norte del cultivo. Corazón vivo del búnker: tono cálido/contemplativo
  // (ámbar/miel). 100% procedural salvo flowers.glb (ya en el repo). El enjambre y los contadores leen de STREAM. ======
  {
    const cz=13.6;                                              // centro z de la sala (x[-3.4,3.4] z[11.8,15.4])
    // (1) caja de sala (el muro sur z=11.8 es el del cultivo, ya partido para el hueco)
    box(6.8,.3,3.6,0,-.15,cz,floorMat);box(6.8,.3,3.6,0,CH,cz,ceilMat);
    box(.3,CH+.3,3.6,-3.4,CH/2,cz,concreteMat);box(.3,CH+.3,1.7,3.4,CH/2,12.65,concreteMat);box(.3,CH+.3,.2,3.4,CH/2,15.3,concreteMat); // muro O entero; muro E PARTIDO: hueco z[13.5,15.2]=1.7m → LA BÓVEDA (CAM 10)
    box(6.8,CH+.3,.3,0,CH/2,15.4,concreteMat);                  // muro norte
    // (2) marco + dintel de la puerta (hueco x[-0.85,0.85] en z=11.8) con tira ÁMBAR cálida (paleta de colmena, no cian)
    const jamb2=new THREE.MeshStandardMaterial({color:0x2b2820,metalness:.7,roughness:.55,normalMap:metalN});
    box(1.9,.34,.34,0,CH-.17,11.8,jamb2);                       // dintel (cubre el hueco 1.7m)
    box(.16,2.32,.34,-0.85,1.16,11.8,jamb2);box(.16,2.32,.34,0.85,1.16,11.8,jamb2); // jambas E/O
    {const s=new THREE.Mesh(new THREE.BoxGeometry(.78,.04,.05),new THREE.MeshBasicMaterial({color:0xffb13a}));s.position.set(0,2.32,11.66);scene.add(s);} // tira ámbar superior del hueco
    {const th=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.5),new THREE.MeshStandardMaterial({color:0x39342a,metalness:.7,roughness:.55,normalMap:metalN}));th.rotation.x=-Math.PI/2;th.position.set(0,.013,11.8);scene.add(th);} // umbral al ras
    // ---- materiales cálidos de la colmena ----
    const woodH=new THREE.MeshStandardMaterial({map:tex(grime('#6b4a24'),1),normalMap:_wn,roughness:.85,metalness:.05}); // madera de los cajones
    const rimH=new THREE.MeshStandardMaterial({color:0x3a2c18,roughness:.7,metalness:.2});                                // juntas/rebordes
    const techH=new THREE.MeshStandardMaterial({color:0x2a2f33,metalness:.8,roughness:.4,normalMap:metalN});              // base/mástil tech del búnker
    const glassH=new THREE.MeshPhysicalMaterial({color:0xffb43a,transparent:true,opacity:.30,roughness:.15,metalness:0,transmission:.5,side:THREE.DoubleSide}); // incubadora de vidrio ámbar
    // panal emisivo (canvas hex-grid) — celdas que brillan ámbar dentro de la incubadora
    const combCv=cv(128,128),cx2=combCv.getContext('2d');cx2.fillStyle='#3a2400';cx2.fillRect(0,0,128,128);
    for(let ry=0;ry<8;ry++)for(let cxi=0;cxi<8;cxi++){const ox=cxi*17+(ry%2?8:0),oy=ry*15+8;cx2.beginPath();for(let k=0;k<6;k++){const an=Math.PI/3*k+Math.PI/6,px=ox+Math.cos(an)*8,py=oy+Math.sin(an)*8;k?cx2.lineTo(px,py):cx2.moveTo(px,py);}cx2.closePath();cx2.fillStyle='#ffb43a';cx2.globalAlpha=.5+Math.random()*.5;cx2.fill();cx2.globalAlpha=1;cx2.strokeStyle='#7a4e10';cx2.stroke();}
    const combMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(combCv)}); // emisivo "plano" (no lo apaga la luz)
    // (3) LA COLMENA (centerpiece) — torre de cajones hexagonales apilados contra el muro norte, con incubadora central
    const HX=0,HZ=14.55;                                        // base de la colmena (contra el muro norte z=15.4)
    const hive=new THREE.Group();hive.position.set(HX,0,HZ);scene.add(hive);
    const hex=(rt,rb,h,y,m)=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,6),m);c.position.y=y;c.castShadow=true;hive.add(c);return c;};
    hex(.82,.86,.18,.09,techH);                                 // plinto tech (base)
    hex(.74,.76,.46,.41,woodH);hex(.78,.78,.05,.66,rimH);       // cajón 1 (madera) + reborde
    // --- incubadora (cajón 2): vidrio ámbar + núcleo de panal emisivo + glow del "latido" ---
    hex(.5,.5,.5,1.0,combMat);                                  // núcleo de panal emisivo (adentro)
    hex(.72,.72,.6,1.0,glassH);                                 // cáscara de vidrio ámbar translúcido
    hex(.78,.78,.05,1.32,rimH);
    hex(.74,.76,.46,1.62,woodH);hex(.78,.78,.05,1.87,rimH);     // cajón 3 (madera) + reborde
    {const roof=new THREE.Mesh(new THREE.CylinderGeometry(.2,.84,.3,6),techH);roof.position.y=2.05;roof.castShadow=true;hive.add(roof);} // techo/tapa hexagonal
    {const mast=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.5,6),techH);mast.position.y=2.4;hive.add(mast);const sen=new THREE.Mesh(new THREE.SphereGeometry(.04,8,8),new THREE.MeshBasicMaterial({color:0xffd86a}));sen.position.y=2.66;hive.add(sen);} // mástil sensor (tech del búnker)
    // (6) EL LATIDO: PointLight dorado parpadeante en la incubadora + haze cálido envolvente
    hiveGlow=new THREE.PointLight(0xffb43a,1.2,6,2);hiveGlow.position.set(HX,1.0,HZ);scene.add(hiveGlow);
    hiveHaze=new THREE.Mesh(new THREE.SphereGeometry(1.1,14,14),new THREE.MeshBasicMaterial({color:0xffb43a,transparent:true,opacity:.09,depthWrite:false}));hiveHaze.position.set(HX,1.2,HZ);scene.add(hiveHaze);
    // (5) ENJAMBRE de abejas (Points): sprite redondo ámbar, órbita + ruido de darteo. Lee STREAM.bees en el loop.
    const bcv=cv(32,32),bxg=bcv.getContext('2d'),grd=bxg.createRadialGradient(16,16,0,16,16,16);grd.addColorStop(0,'rgba(255,224,150,1)');grd.addColorStop(.45,'rgba(224,168,46,1)');grd.addColorStop(1,'rgba(110,70,8,0)');bxg.fillStyle=grd;bxg.fillRect(0,0,32,32);
    const bg=new THREE.BufferGeometry(),bpos=new Float32Array(BEES_MAX*3);
    for(let i=0;i<BEES_MAX;i++){beeData.push({r:.3+Math.random()*.7,a:Math.random()*6.28,w:(Math.random()<.5?-1:1)*(.5+Math.random()*.9),h:(Math.random()-.5)*1.0,nf:1.5+Math.random()*2.5,np:Math.random()*6.28,nf2:2+Math.random()*3,np2:Math.random()*6.28});bpos[i*3]=hiveC.x;bpos[i*3+1]=hiveC.y;bpos[i*3+2]=hiveC.z;}
    bg.setAttribute('position',new THREE.BufferAttribute(bpos,3));
    beeSwarm=new THREE.Points(bg,new THREE.PointsMaterial({map:new THREE.CanvasTexture(bcv),size:.075,transparent:true,depthWrite:false,sizeAttenuation:true,color:0xffffff}));
    beeSwarm.frustumCulled=false;beeSwarm.geometry.setDrawRange(0,0);scene.add(beeSwarm);
    // (7) ESTACIÓN APÍCOLA del robot (mesa + ahumador + marcos de panal apoyados) contra el muro OESTE (fuera del paso x=0)
    {const g=new THREE.Group();g.position.set(-2.9,0,13.4);scene.add(g);
      g.add(meshBox(.7,.06,1.1,0,.78,0,woodH));for(const pz of[-.48,.48])for(const px of[-.28,.28])g.add(meshBox(.06,.78,.06,px,.39,pz,rimH)); // mesa
      const sm=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.22,12),techH);sm.position.set(.12,.92,-.2);g.add(sm); // ahumador (cuerpo)
      {const cone=new THREE.Mesh(new THREE.CylinderGeometry(.0,.09,.1,12),techH);cone.position.set(.12,1.08,-.2);g.add(cone);const sp=new THREE.Mesh(new THREE.CylinderGeometry(.02,.03,.12,8),techH);sp.position.set(.04,1.06,-.13);sp.rotation.z=.7;g.add(sp);} // tapa + pico
      for(let i=0;i<3;i++){const fr=meshBox(.4,.5,.02,-.15,1.05,.1+i*.06,woodH);fr.rotation.z=.16;g.add(fr);} // marcos de panal apoyados
      g.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    // (8) JARDINERA de flores (vínculo cultivo→abejas) — reusa flowers.glb (0 peso nuevo), contra el muro ESTE
    {const px=2.7,pz=13.4;const pl=new THREE.Group();pl.position.set(px,0,pz);scene.add(pl);
      pl.add(meshBox(.9,.34,.5,0,.17,0,woodH));pl.add(meshBox(.84,.06,.44,0,.36,0,new THREE.MeshStandardMaterial({color:0x2a1c0e,roughness:1}))); // cajón + tierra
      pl.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
      loadPlant('flowers.glb',[{x:px-.22,y:.36,z:pz,target:.34,rotY:0.6},{x:px+.2,y:.36,z:pz-.12,target:.3,rotY:2.1},{x:px,y:.36,z:pz+.14,target:.32,rotY:4.0}]);}
    // (9) ATMÓSFERA + DISPLAYS: cartel + contador de pared "LIBERADAS" (lee STREAM.beesReleased) + luz ambiente cálida
    {const sc=cv(256,128),sx=sc.getContext('2d');sx.fillStyle='#1c1206';sx.fillRect(0,0,256,128);sx.strokeStyle='#ffb13a';sx.lineWidth=3;sx.strokeRect(8,8,240,112);
      sx.fillStyle='#ffd86a';sx.shadowColor='#ffb13a';sx.shadowBlur=8;sx.font='bold 30px Anton, sans-serif';sx.textAlign='center';sx.fillText('HIVE',128,48);
      sx.font='17px VT323, monospace';sx.fillStyle='#bff7d2';sx.shadowBlur=4;sx.fillText('REPOPULATION PROJECT',128,80);sx.fillStyle='#ffb13a';sx.fillText('SHELTER 404', 128,104);
      const st=new THREE.CanvasTexture(sc);st.anisotropy=4;const sgn=new THREE.Mesh(new THREE.PlaneGeometry(.8,.4),new THREE.MeshBasicMaterial({map:st,transparent:true}));sgn.position.set(-3.38,1.85,12.6);sgn.rotation.y=Math.PI/2;scene.add(sgn);}
    {const bnv=cv(256,96);beeNumX=bnv.getContext('2d');beeNumTex=new THREE.CanvasTexture(bnv);beeNumTex.anisotropy=4;
      box(.66,.5,.06,3.36,1.55,12.7,techH);                     // carcasa del display (muro este)
      const bnum=new THREE.Mesh(new THREE.PlaneGeometry(.56,.4),new THREE.MeshBasicMaterial({map:beeNumTex,transparent:true}));bnum.position.set(3.31,1.55,12.7);bnum.rotation.y=-Math.PI/2;scene.add(bnum);}
    const hl1=new THREE.PointLight(0xffcaa0,.7,8,2);hl1.position.set(0,CH-.3,13.0);scene.add(hl1);     // ambiente cálido de sala
    const hl2=new THREE.PointLight(0xffd8a0,.45,5,2);hl2.position.set(0,1.6,12.4);scene.add(hl2);      // relleno bajo (hacia la puerta)
  }

  // ====== SALA: LA BÓVEDA (CAM 10 · VAULT) — al ESTE de la colmena, por el muro este partido. Cuarto SELLADO que Beeko descubrió:
  // oro/monedas/fajos apilados y olvidados. Tono IRÓNICO/MELANCÓLICO, NO casino: oro MATE y polvoriento, penumbra fría, y un HAZ
  // CÁLIDO ámbar que entra por la puerta desde la colmena (contraste vida/riqueza). 100% procedural (CERO peso nuevo) salvo la
  // lámpara industrial (clon del GLB ya cargado). Detalle humano AUSENTE: un guante sobre el oro + un casco viejo en el piso. ======
  {
    const VX=5.3, VZ=13.6;                                        // centro de la sala x[3.4,7.2] z[11.8,15.4]
    // (1) caja de sala (el muro OESTE es el muro este de la colmena, ya partido arriba para el hueco z[13.5,15.2])
    box(3.8,.3,3.6,VX,-.15,VZ,floorMat);box(3.8,.3,3.6,VX,CH,VZ,ceilMat);
    box(.3,CH+.3,3.6,7.2,CH/2,VZ,concreteMat);                   // muro este
    box(3.8,CH+.3,.3,VX,CH/2,11.8,concreteMat);                  // muro sur
    box(3.8,CH+.3,.3,VX,CH/2,15.4,concreteMat);                  // muro norte
    // ---- materiales: oro MATE polvoriento (NO brillante), monedas, billetes viejos, acero del strongbox, polvo ----
    const goldMat=new THREE.MeshStandardMaterial({map:tex(grime('#8a6d2e'),1),normalMap:_wn,color:0xb0892f,metalness:.62,roughness:.52}); // dorado: catchea glint pero con grime/polvo (no casino)
    const coinMat=new THREE.MeshStandardMaterial({color:0xa8863e,metalness:.55,roughness:.6,normalMap:metalN});
    const billMat=new THREE.MeshStandardMaterial({map:tex(grime('#5e6450'),1),normalMap:_wn,color:0x6a7058,roughness:.93,metalness:.03}); // billetes verdosos desteñidos
    const bandMat=new THREE.MeshStandardMaterial({color:0x9a8f6a,roughness:.85});
    const vSteel=new THREE.MeshStandardMaterial({color:0x33383d,metalness:.82,roughness:.5,normalMap:metalN});
    const dustMat=new THREE.MeshBasicMaterial({map:tex(grime('#0c0e0a'),1),transparent:true,opacity:.4,depthWrite:false});
    const dust=(w,d,x,y,z)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(w,d),dustMat);p.rotation.x=-Math.PI/2;p.position.set(x,y,z);scene.add(p);};
    // (2) PUERTA SELLADA / FORZADA — marco del hueco + hoja pesada CORRIDA a un costado + volante + candado reventado + hazard roto
    const jambV=new THREE.MeshStandardMaterial({color:0x2b3034,metalness:.8,roughness:.5,normalMap:metalN});
    box(.4,.4,1.7,3.4,CH-.2,14.35,jambV);                        // dintel (cubre el hueco 1.7m)
    box(.4,2.32,.18,3.4,1.16,13.5,jambV);box(.4,2.32,.18,3.4,1.16,15.2,jambV); // jambas S/N del hueco
    {const s=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,1.6),new THREE.MeshStandardMaterial({color:0x3a3e42,roughness:.7}));s.position.set(3.28,2.32,14.35);scene.add(s);} // tira de borde MUERTA (gris, sin glow: puerta sellada, no activa)
    {const th=new THREE.Mesh(new THREE.PlaneGeometry(.5,1.7),new THREE.MeshStandardMaterial({color:0x36393d,metalness:.7,roughness:.55,normalMap:metalN}));th.rotation.x=-Math.PI/2;th.position.set(3.4,.013,14.35);scene.add(th);} // umbral al ras
    {const door=new THREE.Group();door.position.set(4.2,0,15.16);door.rotation.y=-.16;scene.add(door); // hoja pesada CORRIDA y apoyada al muro norte (la forzó y quedó así)
      door.add(meshBox(1.25,2.0,.16,0,1.05,0,vSteel));           // losa
      door.add(meshBox(1.05,1.8,.04,0,1.05,.1,new THREE.MeshStandardMaterial({color:0x2a2e32,metalness:.6,roughness:.6}))); // panel interior
      for(const rx of[-.5,.5])for(const ry of[.25,1.05,1.85]){const rv=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),vSteel);rv.position.set(rx,ry,.1);door.add(rv);} // remaches
      {const w=new THREE.Group();w.position.set(0,1.05,.14);door.add(w);w.add(new THREE.Mesh(new THREE.TorusGeometry(.26,.04,10,22),vSteel));for(let i=0;i<4;i++){const sp=meshBox(.5,.05,.045,0,0,0,vSteel);sp.rotation.z=i*Math.PI/4;w.add(sp);}const hub=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.12,12),vSteel);hub.rotation.x=Math.PI/2;w.add(hub);} // VOLANTE de válvula
      door.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    {const lk=meshBox(.1,.13,.05,0,0,0,vSteel);lk.position.set(3.72,.06,14.05);lk.rotation.z=.4;lk.castShadow=true;scene.add(lk); // candado reventado
      for(let i=0;i<6;i++){const ch=new THREE.Mesh(new THREE.TorusGeometry(.035,.012,6,12),vSteel);ch.position.set(3.6+i*.075,.02,14.18-(i%2?.05:0));ch.rotation.x=Math.PI/2;ch.rotation.y=(Math.random()-.5);ch.castShadow=true;scene.add(ch);}} // eslabones de cadena en el piso
    {const hzC=cv(128,32),hxx=hzC.getContext('2d');hxx.fillStyle='#caa800';hxx.fillRect(0,0,128,32);hxx.fillStyle='#111';for(let s=-16;s<140;s+=24){hxx.beginPath();hxx.moveTo(s,0);hxx.lineTo(s+12,0);hxx.lineTo(s-4,32);hxx.lineTo(s-16,32);hxx.closePath();hxx.fill();}const hz=tex(hzC,1);
      for(const hp of[[3.9,13.75,.5],[4.3,14.7,-.7]]){const t=new THREE.Mesh(new THREE.PlaneGeometry(.55,.09),new THREE.MeshStandardMaterial({map:hz,roughness:.9,transparent:true,opacity:.8}));t.rotation.x=-Math.PI/2;t.rotation.z=hp[2];t.position.set(hp[0],.016,hp[1]);scene.add(t);}} // cinta hazard ROTA, caída
    // (3) HOARD DE ORO — pirámides GRANDES de lingotes MATE contra el muro sur (el botín que mira Beeko desde su parada)
    function goldBar(g,x,y,z,rot){const b=meshBox(.2,.075,.11,x,y,z,goldMat);b.rotation.y=rot;b.castShadow=true;g.add(b);}
    function goldPyramid(cx,cz,base,depth){const g=new THREE.Group();g.position.set(cx,0,cz);scene.add(g); // pirámide base·…·1 × 'depth' hileras de fondo
      for(let d=0;d<depth;d++)for(let L=0;L<base;L++){const n=base-L;for(let i=0;i<n;i++)goldBar(g,(i-(n-1)/2)*.235,.04+L*.08,d*.26,(Math.random()-.5)*.14);}}
    goldPyramid(6.35,12.15,5,3);                                  // pirámide GRANDE (5·4·3·2·1 × 3) contra el muro sur SE
    goldPyramid(4.25,12.05,4,2);                                  // segunda pirámide al SO
    // (4) MONEDAS — MUCHAS pilas de cilindros + derrame abundante en el piso (entre las pirámides)
    {const g=new THREE.Group();g.position.set(5.05,0,12.0);scene.add(g);
      const stack=(sx,sz,n)=>{for(let i=0;i<n;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.014,16),coinMat);c.position.set(sx,.02+i*.014,sz);c.castShadow=true;g.add(c);}};
      for(let s=0;s<10;s++)stack(-.55+Math.random()*1.1,-.16+Math.random()*.5,4+Math.floor(Math.random()*9));
      for(let i=0;i<22;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.014,16),coinMat);c.rotation.x=Math.PI/2;c.rotation.z=Math.random()*3;c.position.set(-.55+Math.random()*1.45,.008,-.2+Math.random()*.72);c.castShadow=true;g.add(c);}}
    // (5) FAJOS DE BILLETES procedurales — pila contra el muro sur (complementa las montañas GLB de abajo)
    {const g=new THREE.Group();g.position.set(4.55,0,11.98);scene.add(g);
      const bundle=(bx,by,bz,rot)=>{const b=meshBox(.16,.06,.08,bx,by,bz,billMat);b.rotation.y=rot;b.castShadow=true;g.add(b);const bd=meshBox(.162,.062,.022,bx,by,bz,bandMat);bd.rotation.y=rot;g.add(bd);};
      for(let L=0;L<4;L++){const n=4-L;for(let i=0;i<n;i++)bundle(-.26+i*.17,.035+L*.062,(Math.random()-.5)*.2,(Math.random()-.5)*.25);}}
    // (5b) MONTAÑAS DE RIQUEZA (GLB clonados — 0 peso por instancia): cash_stack + gold_ingots + dólares sueltos. VAN CONTRA LAS
    // PAREDES Y EN EL FONDO/RINCONES — NUNCA en la parada de Beeko (~5.3,13.7) ni en el pasillo puerta→parada. Cantidad reducida en mobile.
    {const N=SMALL?0.55:1, cash=[], gold=[], bills=[];
      const heap=(arr,cx,cz,rx,rz,layers,per,t0,t1,yStep)=>{for(let L=0;L<layers;L++){const n=Math.max(1,Math.round(per*N*(1-L*.16))),sh=1-L*.12;for(let i=0;i<n;i++)arr.push({x:cx+(Math.random()-.5)*rx*2*sh,z:cz+(Math.random()-.5)*rz*2*sh,y:L*yStep,target:t0+Math.random()*(t1-t0),rotY:Math.random()*6.28});}};
      // CASH (montañas): muro sur (detrás del oro), muro este (columna alta), muro norte NE, rincón SO
      heap(cash, 5.65,12.02, .95,.26, 5,7, .30,.46, .14);
      heap(cash, 6.88,13.5,  .16,.95, 5,5, .30,.46, .15);
      heap(cash, 6.4,15.06,  .8,.18,  5,5, .30,.46, .15);
      heap(cash, 3.8,12.2,   .32,.42, 4,4, .28,.42, .13);
      // GOLD INGOTS (GLB) coronando/reforzando las pirámides + algunos al este
      heap(gold, 6.35,12.2,  .5,.2,  3,4, .34,.5,  .14);
      heap(gold, 4.25,12.0,  .34,.2, 2,3, .34,.5,  .14);
      heap(gold, 6.82,12.65, .14,.3, 3,2, .32,.46, .14);
      // DÓLARES sueltos (quad texturado) al pie del hoard sur (lejos del centro y de la parada)
      for(let i=0;i<Math.round(14*N);i++)bills.push({x:3.75+Math.random()*3.1, z:11.95+Math.random()*.78, y:.012, target:.15+Math.random()*.05, rotY:Math.random()*6.28});
      loadPlant('cash_stack.glb',cash); loadPlant('gold_ingots.glb',gold); loadPlant('dollar_bill.glb',bills);}
    // (6) STRONGBOX abierto (de donde salió el botín) contra el muro este, tapa caída hacia atrás
    {const g=new THREE.Group();g.position.set(6.7,0,14.2);g.rotation.y=-.5;scene.add(g);
      g.add(meshBox(.5,.34,.4,0,.18,0,vSteel));                  // cuerpo
      g.add(meshBox(.46,.04,.36,0,.36,0,new THREE.MeshStandardMaterial({color:0x14181b,roughness:.8}))); // interior oscuro (casi vacío)
      {const lid=meshBox(.5,.04,.4,0,.36,-.34,vSteel);lid.rotation.x=-2.0;g.add(lid);} // tapa abierta
      for(const px of[-.2,.2])g.add(meshBox(.06,.06,.06,px,.36,.2,vSteel)); // cierres
      goldBar(g,.05,.42,.05,.3);goldBar(g,-.06,.42,.13,-.2);     // un par de lingotes asomando
      g.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    // (7) DETALLE HUMANO AUSENTE — un GUANTE sobre el oro ("someone left a glove here, on top of the pile") + un CASCO viejo en el piso
    {const gl=new THREE.Group();gl.position.set(6.25,.345,12.3);gl.rotation.set(.1,.7,.05);scene.add(gl);
      const glMat=new THREE.MeshStandardMaterial({map:tex(grime('#4a3f30'),1),normalMap:_wn,color:0x6a5a44,roughness:.95});
      gl.add(meshBox(.1,.03,.13,0,0,0,glMat));                   // palma
      for(let i=0;i<4;i++)gl.add(meshBox(.02,.025,.07,-.033+i*.022,0,.1,glMat)); // dedos
      gl.add(meshBox(.03,.025,.05,.06,0,.02,glMat));             // pulgar
      gl.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    {const helC=0x8a8048;const hel=new THREE.Group();hel.position.set(5.75,.1,13.78);hel.rotation.set(.12,.5,.16);scene.add(hel); // casco de obra DESTEÑIDO, caído en el piso
      hel.add(new THREE.Mesh(new THREE.SphereGeometry(.12,14,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:helC,roughness:.85,metalness:.05}))); // domo
      hel.add(new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.016,18),new THREE.MeshStandardMaterial({color:helC,roughness:.85}))); // ala
      hel.add(meshBox(.02,.06,.22,0,.06,0,new THREE.MeshStandardMaterial({color:helC,roughness:.85}))); // cresta
      hel.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});}
    // (8) ILUMINACIÓN — fría y TENUE (cuarto muerto) + HAZ CÁLIDO ámbar que entra por la puerta desde la colmena (vida/riqueza)
    const vCold=new THREE.PointLight(0x8a98b0,.7,7,2);vCold.position.set(VX+.3,CH-.4,VZ);scene.add(vCold); // fill frío: el cuarto se lee, pero sigue en penumbra
    const vWarm=new THREE.SpotLight(0xffb43a,1.3,5.5,Math.PI/5,.55,1.5);vWarm.position.set(3.5,1.7,14.35);vWarm.target.position.set(6.0,.5,12.4);scene.add(vWarm);scene.add(vWarm.target); // haz cálido que entra por la puerta desde la colmena
    const vHoard=new THREE.PointLight(0xffcf8a,.9,4.7,2);vHoard.position.set(5.7,1.45,12.3);scene.add(vHoard); // luz cálida-dorada SOBRE el hoard sur → el oro se LEE como oro (punto medio, no casino)
    const vGlint=new THREE.PointLight(0xffe0a0,.5,3.4,2);vGlint.position.set(6.35,1.0,12.3);scene.add(vGlint);   // glint del oro
    const vGlint2=new THREE.PointLight(0xffe0a0,.32,3,2);vGlint2.position.set(6.85,1.15,13.6);scene.add(vGlint2); // glint en el cash del muro este
    {const haze=new THREE.Mesh(new THREE.SphereGeometry(.9,12,12),new THREE.MeshBasicMaterial({color:0xffb43a,transparent:true,opacity:.05,depthWrite:false}));haze.position.set(4.3,1.2,14.0);scene.add(haze);} // polvo en el haz
    // (9) ATMÓSFERA — capas de polvo en el piso (cartel "VAULT/RESTRICTED" removido: redundante, el overlay ya dice CAM 10 · VAULT)
    dust(2.2,1.6,5.8,.014,12.6);dust(.9,.7,4.1,.015,14.3);       // polvo asentado en el piso (bajo las pilas + cerca de la puerta)
  }
  loadProp('lamp_industrial.glb',5.3,1.95,13.4,.5,0);            // lámpara industrial al techo (ÚNICO GLB de la sala: clon ya cargado → 0 peso nuevo)
  {const cord=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.24,6),new THREE.MeshStandardMaterial({color:0x14181b,roughness:.8}));cord.position.set(5.3,2.53,13.4);scene.add(cord);} // cable al techo

  // ====== DETALLE DE SALAS: biblioteca, cultivo, descanso + luces ======
  {
    const bookWood=new THREE.MeshStandardMaterial({map:tex(grime('#3a2c1c'),1),normalMap:_wn,roughness:.9,metalness:.05});
    function bookshelf(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
      g.add(meshBox(.06,2.1,.36,-.68,1.05,0,bookWood));g.add(meshBox(.06,2.1,.36,.68,1.05,0,bookWood));
      g.add(meshBox(1.42,.06,.36,0,2.08,0,bookWood));g.add(meshBox(1.42,.06,.36,0,.03,0,bookWood));
      g.add(meshBox(1.34,2.0,.03,0,1.05,-.16,bookWood));
      for(let s=0;s<4;s++){const sy=.2+s*.5;g.add(meshBox(1.34,.03,.32,0,sy,0,bookWood));
        let bx=-.62;while(bx<.58){const w=.06+Math.random()*.06,h=.3+Math.random()*.12,c=new THREE.Color().setHSL(Math.random(),.35,.3+Math.random()*.2);
          const bk=new THREE.Mesh(new THREE.BoxGeometry(w,h,.24),new THREE.MeshStandardMaterial({color:c,roughness:.85}));
          const lean=Math.random()<.08?.16:0;bk.position.set(bx+w/2,sy+.03+h/2,0);bk.rotation.z=lean;bk.castShadow=true;bk.userData.noOut=true;g.add(bk);bx+=w+.004+(lean?.05:0);}}
      g.children.forEach(c=>c.castShadow=true);scene.add(g);return g;}
    // (biblioteca reubicada + libros y lámpara del escritorio este removidos — cuello al taller despejado)
    const readLight=new THREE.PointLight(0xffe0b0,.6,5,2);readLight.position.set(.6,CH-.4,6.8);scene.add(readLight);
    // --- CULTIVO: reservorio de agua, 2ª batería, plantines ---
    const tankMat=new THREE.MeshStandardMaterial({color:0x2a6a9a,transparent:true,opacity:.82,roughness:.3,metalness:.1});
    {const tank=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,1.0,20),tankMat);tank.position.set(2.7,.55,10.7);tank.castShadow=true;scene.add(tank);const ring=new THREE.Mesh(new THREE.TorusGeometry(.41,.03,8,24),steelMat);ring.rotation.x=Math.PI/2;ring.position.set(2.7,1.0,10.7);scene.add(ring);const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.4,8),rustMat);pipe.position.set(2.3,1.2,10.5);pipe.rotation.z=.5;scene.add(pipe);}
    for(let k=0;k<3;k++){const y=.55+k*.62;box(.5,.04,1.3,2.9,y,9.6,steelMat);
      // (hojas-esfera removidas: los brotes GLB se distribuyen abajo con loadPlant)
      scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(.46,.03,1.2),new THREE.MeshBasicMaterial({color:0xc83cff})),2.9,y+.5,9.6));}
    const grow2=new THREE.PointLight(0xb43cff,0.9,4.5,2);grow2.position.set(2.6,1.5,9.6);scene.add(grow2); // magenta rack der (bajado 1.1->0.9)
    // RELLENO NEUTRO sobre las repisas — para que el verde de las plantas se vea sin matar el clima magenta.
    // Iterar acá: subir intensidad = más verde visible / bajar = más magenta dominante. Color hacia blanco-frío.
    {const FILL_COL=0xeaf0ff, FILL_INT=0.55, FILL_RNG=3.4; // <-- balance verde vs magenta
     [[-2.55,1.65,10.3],[2.55,1.65,9.6]].forEach(p=>{const f=new THREE.PointLight(FILL_COL,FILL_INT,FILL_RNG,2);f.position.set(p[0],p[1],p[2]);scene.add(f);});}
    // (bandeja flotante de conos del cultivo viejo removida: era resto del cultivo procedural)
    // --- DESCANSO: alfombra, estufa (glow), mesita con taza, posters ---
    // (2ª alfombra grande removida: dominaba CAM 06; quedó una sola alfombra chica y sobria, colocada en las colocaciones del descanso)
    {const heater=new THREE.Group();heater.position.set(-7.05,0,6.0);heater.add(meshBox(.4,.5,.22,0,.28,0,doorMat));for(let i=0;i<3;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,8),new THREE.MeshStandardMaterial({color:0xff5520,emissive:0xff3300,emissiveIntensity:1.5}));bar.position.set(-.1+i*.1,.3,.1);bar.userData.noOut=true;heater.add(bar);}heater.children.forEach(c=>c.castShadow=true);scene.add(heater);const hglow=new THREE.PointLight(0xff5a20,.8,2.8,2);hglow.position.set(-6.95,.4,6.2);scene.add(hglow);}
    {const st=meshBox(.4,.5,.4,-4.2,.25,5.9,_woodMat);st.castShadow=true;scene.add(st);const mugMat=new THREE.MeshStandardMaterial({color:0xcfcabc,roughness:.7});const mug=new THREE.Mesh(new THREE.CylinderGeometry(.045,.04,.08,12),mugMat);mug.position.set(-4.2,.54,5.9);mug.castShadow=true;scene.add(mug);const hd=new THREE.Mesh(new THREE.TorusGeometry(.03,.01,6,12),mugMat);hd.position.set(-4.13,.54,5.9);scene.add(hd);}
    for(const pz of[5.75,7.55]){scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(.7,.95),new THREE.MeshStandardMaterial({map:tex(grime('#6a5a3a'),1),roughness:1,emissive:0x0d0c06})),-7.34,1.5,pz,0,Math.PI/2,0));}
    const restWarm=new THREE.PointLight(0xffb060,.5,5,2);restWarm.position.set(-5.4,1.9,6.6);scene.add(restWarm);
  }

  // ====== SALA: FABRICACIÓN (CAM 09 · FABRICATION) — al OESTE del cultivo. UNA impresora 3D trabajando despacio en silencio.
  // Tono sobrio/melancólico: el robot fabrica lo justo para seguir y cuidar las abejas. La pieza LEE STREAM.print. 100% procedural. ======
  {
    const FX=-5.4, FZ=10.0;                                     // centro de la sala x[-7.4,-3.4] z[8.2,11.8]
    // (1) caja de sala (el muro este es el oeste del cultivo, ya partido para el hueco)
    box(4.0,.3,3.6,FX,-.15,FZ,floorMat);box(4.0,.3,3.6,FX,CH,FZ,ceilMat);
    box(.3,CH+.3,3.6,-7.4,CH/2,FZ,concreteMat);                // muro oeste
    box(4.0,CH+.3,.3,FX,CH/2,8.2,concreteMat);box(4.0,CH+.3,.3,FX,CH/2,11.8,concreteMat); // muros sur/norte
    // (2) marco + dintel + umbral de la puerta (hueco z[8.65,10.35] en x=-3.4) con tira fría
    const jambF=new THREE.MeshStandardMaterial({color:0x2a2f33,metalness:.75,roughness:.5,normalMap:metalN});
    box(.34,.34,1.9,-3.4,CH-.17,9.5,jambF);                    // dintel
    box(.34,2.32,.16,-3.4,1.16,8.65,jambF);box(.34,2.32,.16,-3.4,1.16,10.35,jambF); // jambas
    {const s=new THREE.Mesh(new THREE.BoxGeometry(.04,2.2,.05),new THREE.MeshBasicMaterial({color:0x6fd0e0}));s.position.set(-3.25,1.16,10.31);scene.add(s);} // tira cian del borde
    {const th=new THREE.Mesh(new THREE.PlaneGeometry(.5,1.7),new THREE.MeshStandardMaterial({color:0x33383d,metalness:.8,roughness:.45,normalMap:metalN}));th.rotation.x=-Math.PI/2;th.position.set(-3.4,.013,9.5);scene.add(th);} // umbral
    // ---- materiales ----
    const alu=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:.8,roughness:.35,normalMap:metalN}); // perfiles de aluminio
    const dkm=new THREE.MeshStandardMaterial({color:0x23282c,metalness:.7,roughness:.5,normalMap:metalN});
    const benchW=new THREE.MeshStandardMaterial({map:tex(grime('#454039'),1),normalMap:_wn,roughness:.85});
    const partB_M=new THREE.MeshStandardMaterial({color:0xb8c0c8,roughness:.5,metalness:.4}); // pieza tipo bracket (gris claro)
    const partH_M=new THREE.MeshStandardMaterial({color:0xc8a85a,roughness:.5,metalness:.3}); // pieza tipo hexágono (ámbar = colmena)
    // (6) banco donde está la impresora (contra el muro norte)
    const PX=FX, PZ=11.35, BY=0.79;                            // posición de la impresora y altura del tope del banco
    {const b=new THREE.Group();b.position.set(PX,0,PZ);scene.add(b);b.add(meshBox(1.3,.06,.6,0,.76,0,benchW));for(const px of[-.6,.6])for(const pz of[-.24,.24])b.add(meshBox(.06,.76,.06,px,.38,pz,dkm));b.children.forEach(c=>c.castShadow=true);}
    // (3) LA IMPRESORA 3D (marco cartesiano + bancada + gantry + cabezal + nozzle)
    const pr=new THREE.Group();pr.position.set(PX,BY,PZ);scene.add(pr);
    pr.add(meshBox(.6,.05,.5,0,.025,0,dkm));                   // base
    for(const px of[-.27,.27])for(const pz of[-.2,.2])pr.add(meshBox(.04,.72,.04,px,.38,pz,alu)); // 4 perfiles verticales
    pr.add(meshBox(.62,.04,.04,0,.74,-.2,alu));pr.add(meshBox(.62,.04,.04,0,.74,.2,alu));         // marco superior (X)
    pr.add(meshBox(.04,.04,.44,-.27,.74,0,alu));pr.add(meshBox(.04,.04,.44,.27,.74,0,alu));        // marco superior (Y)
    pr.add(meshBox(.42,.03,.42,0,.1,0,new THREE.MeshStandardMaterial({color:0x14181b,roughness:.6,metalness:.3}))); // bancada caliente
    pr.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
    // gantry (sube con la pieza + barre en Z) → riel X + cabezal (barre en X)
    gantry=new THREE.Group();gantry.position.set(0,.16,0);pr.add(gantry);
    gantry.add(meshBox(.56,.03,.05,0,0,0,alu));               // riel horizontal X
    printHead=new THREE.Group();gantry.add(printHead);
    printHead.add(meshBox(.1,.1,.1,0,0,0,dkm));               // carro del cabezal
    {const noz=new THREE.Mesh(new THREE.CylinderGeometry(.005,.03,.06,8),new THREE.MeshStandardMaterial({color:0x6a4a2a,metalness:.6,roughness:.5}));noz.position.set(0,-.07,0);printHead.add(noz);}
    nozGlow=new THREE.PointLight(0xff7a1a,0,.6,2);nozGlow.position.set(0,-.1,0);printHead.add(nozGlow); // glow ámbar del hot-end
    // (4) LA PIEZA en la bancada (crece capa a capa leyendo STREAM.print). Dos tipos que alternan por ciclo.
    const BED_TOPY=BY+.1+.015;                                 // y mundial del tope de la bancada
    partBracket=new THREE.Group();partBracket.position.set(PX,BED_TOPY,PZ);scene.add(partBracket);
    partBracket.add(meshBox(.14,PART_MAXH,.1,0,PART_MAXH/2,0,partB_M));partBracket.add(meshBox(.1,PART_MAXH*.5,.16,.04,PART_MAXH*.25,0,partB_M)); // bracket/junta de robot
    partHex=new THREE.Group();partHex.position.set(PX,BED_TOPY,PZ);scene.add(partHex);
    {const hx=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,PART_MAXH,6),partH_M);hx.position.y=PART_MAXH/2;partHex.add(hx);} // marco hexagonal (colmena)
    partBracket.scale.y=.001;partHex.scale.y=.001;partHex.visible=false;
    // (7) carrete de filamento + hilo hasta el cabezal
    {const sp=new THREE.Group();sp.position.set(PX+.5,BY+.55,PZ+.05);scene.add(sp);const reel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.06,18),new THREE.MeshStandardMaterial({color:0x2a6a4a,roughness:.6}));reel.rotation.x=Math.PI/2;sp.add(reel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.08,10),dkm);hub.rotation.x=Math.PI/2;sp.add(hub);sp.add(meshBox(.03,.55,.03,0,-.28,0,alu));sp.children.forEach(c=>c.castShadow=true);}
    filTop=new THREE.Vector3(PX+.5,BY+.55,PZ+.05);             // de dónde sale el filamento (carrete)
    filament=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,1,5),new THREE.MeshStandardMaterial({color:0x39aa6a,roughness:.5}));scene.add(filament);
    // (8) panel CRT de la impresora — montado en el muro NORTE (z11.8), al este de la impresora, mirando al SUR (a la sala/CAM 09)
    {const pcv=cv(256,160);printX=pcv.getContext('2d');printTex=new THREE.CanvasTexture(pcv);printTex.anisotropy=4;
      box(.42,.34,.06,-4.55,1.5,11.7,dkm);                     // carcasa contra el muro norte
      const pp=new THREE.Mesh(new THREE.PlaneGeometry(.34,.26),new THREE.MeshBasicMaterial({map:printTex,transparent:true}));pp.position.set(-4.55,1.5,11.63);pp.rotation.y=Math.PI;scene.add(pp);} // mira al sur (-z)
    // (9) bandeja de piezas terminadas + estante de repuestos + cartel + luz fría
    {const tray=new THREE.Group();tray.position.set(PX-.48,BY+.01,PZ-.05);scene.add(tray);tray.add(meshBox(.3,.02,.42,0,0,0,dkm)); // bandeja SOBRE el banco, al oeste de la impresora (no flota)
      for(let i=0;i<3;i++){const p=i%2?new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.06,6),partH_M):meshBox(.08,.06,.06,0,0,0,partB_M);p.position.set(-.08+i*.08,.05,(i%2?.1:-.07));tray.add(p);}tray.children.forEach(c=>c.castShadow=true);}
    {const sh=new THREE.Group();sh.position.set(-7.2,0,FZ);scene.add(sh);for(const yy of[.6,1.1,1.6])sh.add(meshBox(.3,.03,1.4,0,yy,0,alu));for(const pz of[-.65,.65])sh.add(meshBox(.04,1.7,.04,0,.85,pz,alu)); // estante de repuestos (muro oeste)
      for(let i=0;i<6;i++){const p=i%2?new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.08,6),partH_M):meshBox(.1,.08,.08,0,0,0,partB_M);p.position.set(0,.6+Math.floor(i/2)*.5+.06,-.5+(i%2)*.55);sh.add(p);}sh.children.forEach(c=>c.castShadow=true);}
    {const sc=cv(256,64),sx=sc.getContext('2d');sx.fillStyle='#0a1014';sx.fillRect(0,0,256,64);sx.strokeStyle='#7fb0c0';sx.lineWidth=2;sx.strokeRect(4,4,248,56);sx.fillStyle='#bfe0ec';sx.shadowColor='#7fb0c0';sx.shadowBlur=6;sx.font='22px Anton, sans-serif';sx.textAlign='center';sx.textBaseline='middle';sx.fillText('FABRICATION',128,34);
      const t=new THREE.CanvasTexture(sc);t.anisotropy=4;const sg=new THREE.Mesh(new THREE.PlaneGeometry(.7,.18),new THREE.MeshBasicMaterial({map:t,transparent:true}));sg.position.set(-3.9,1.9,11.62);scene.add(sg);} // muro norte (este del banco)
    fabRoomLight=new THREE.PointLight(0xaab8c8,.75,7,2);fabRoomLight.position.set(FX,CH-.3,FZ);scene.add(fabRoomLight); // luz fría tenue (sala técnica)
    const fabFill=new THREE.PointLight(0x6a7e90,.4,6,2);fabFill.position.set(-4.2,1.5,9.4);scene.add(fabFill);
  }
  // ---- PROPS GLB de la sala de fabricación (livianos; decorativos SIN collider; contra paredes/rincones/banco/estante,
  // fuera del paso puerta→impresora). NUEVOS: toolbox/crate_metal/shelf_small (CC0), barrel/lamp_industrial (CC-BY). + reusados CC0. ----
  loadProp('toolbox.glb',-6.0,0,8.6,.42,.3);                          // caja de herramientas (muro sur)
  loadProp('shelf_small.glb',-4.3,0,8.6,.7,0);                        // estante chico (muro sur, este)
  loadPlant('crate_metal.glb',[{x:-7.0,y:0,z:8.7,target:.55,rotY:.2},{x:-3.85,y:0,z:11.3,target:.5,rotY:-.4}]); // cajones metálicos (rincón SO + NE)
  loadPlant('barrel.glb',[{x:-7.0,y:0,z:11.3,target:.75,rotY:0},{x:-6.6,y:0,z:8.6,target:.7,rotY:.5}]);         // bidones (rincón NO + muro sur)
  loadProp('lamp_industrial.glb',-5.4,1.95,10.6,.5,0);               // lámpara industrial sobre el área de trabajo (techo)
  {const cord=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.55,6),new THREE.MeshStandardMaterial({color:0x14181b,roughness:.8}));cord.position.set(-5.4,2.42,10.6);scene.add(cord);const wl=new THREE.PointLight(0xbfe0ec,.55,4,2);wl.position.set(-5.4,2.0,10.6);scene.add(wl);} // cable + luz de trabajo
  // reusados (CC0 Quaternius, 0 peso nuevo): clutter de taller
  loadProp('gas_can.glb',-5.5,0,8.6,.35,-.3);                         // bidón de combustible (muro sur)
  loadProp('propane_tank.glb',-6.95,0,10.65,.6,0);                    // garrafa (muro oeste, junto al estante)
  loadProp('wood_log.glb',-6.5,0,9.05,.4,.3);                         // material en bruto (rincón SO)
  loadProp('battery.glb',-4.85,.79,11.3,.18,.4);                      // batería sobre el banco
  loadProp('can_red.glb',-5.0,.79,11.52,.16,.2);                      // lata sobre el banco
  loadProp('pot.glb',-7.15,.62,9.7,.2,0);                            // recipiente en el estante de repuestos (repisa baja)

  const AREAS=[{x0:-RX+.4,x1:RX-.4,z0:RZ0+.5,z1:RZ1+.05},{x0:-1.15,x1:1.15,z0:RZ1-.1,z1:5.35},{x0:-3.25,x1:3.25,z0:5.05,z1:8.35},{x0:-3.25,x1:3.25,z0:8.05,z1:11.65},{x0:3.15,x1:7.05,z0:5.75,z1:8.25},{x0:-7.2,x1:-3.15,z0:5.75,z1:8.25},{x0:-6.45,x1:-2.70,z0:-0.80,z1:3.05},{x0:-3.25,x1:3.25,z0:11.55,z1:15.25},{x0:-7.20,x1:-3.15,z0:8.45,z1:11.55},{x0:3.15,x1:7.05,z0:11.95,z1:15.25}];
  function inArea(x,z){for(const a of AREAS)if(x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1)return true;return false;}
  // (ZONAS DE INTERACCIÓN del modo jugable — jubiladas: el robot ya no las usa; la cámara LEE STREAM.zone)

  // ====== CÁMARA DE SEGURIDAD (pivote a live-stream) ======
  // Poses fijas tipo CCTV, una por sala (esquina alta, apenas bajo el techo CH=2.65).
  // La cámara LEE STREAM.zone y CORTA según ESE valor — NUNCA detecta la zona del robot por su
  // cuenta. game.js reporta la sala del robot a STREAM (con histéresis); si la admin futura hace
  // __REFUGIO.setZone('taller'), streamReportZone no la pisa y la cámara corta al taller igual.
  const ZONES=['observatorio','pasillo','biblioteca','cultivo','taller','descanso','carga','colmena','fab','vault']; // MISMO orden que AREAS
  const CAMS={
    observatorio:{pos:new THREE.Vector3( 2.20,2.40, 2.90),look:new THREE.Vector3( 0.00,1.10,-1.20)},
    pasillo:     {pos:new THREE.Vector3( 0.95,2.35, 3.25),look:new THREE.Vector3( 0.00,1.10, 4.50)},
    biblioteca:  {pos:new THREE.Vector3(-2.95,2.40, 5.45),look:new THREE.Vector3( 0.30,1.10, 7.00)},
    cultivo:     {pos:new THREE.Vector3( 3.10,2.55, 8.20),look:new THREE.Vector3( 0.00,0.90,10.30),fov:82}, // PLANO ABIERTO: esquina SE alta + gran angular -> entran los DOS racks de costado + robot chico en la sala
    taller:      {pos:new THREE.Vector3( 6.85,2.40, 8.05),look:new THREE.Vector3( 4.60,1.10, 6.90)},
    descanso:    {pos:new THREE.Vector3(-6.95,2.40, 6.00),look:new THREE.Vector3(-4.80,1.10, 7.00)},
    carga:       {pos:new THREE.Vector3(-3.50,2.45, 2.90),look:new THREE.Vector3(-5.70,1.00, 1.00)}, // esquina NE (junto a la puerta) mirando SO al dock; sala chica, FOV normal
    colmena:     {pos:new THREE.Vector3( 3.00,2.45,12.10),look:new THREE.Vector3( 0.00,1.10,14.40),fov:74}, // esquina SE alta mirando NO a la colmena+robot+enjambre; gran angular para que entre el volumen del enjambre
    fab:         {pos:new THREE.Vector3(-3.70,2.45, 8.60),look:new THREE.Vector3(-5.60,1.10,11.30),fov:72}, // esquina SE alta mirando NO a la impresora+robot
    vault:       {pos:new THREE.Vector3( 4.00,2.45,14.70),look:new THREE.Vector3( 6.20,0.95,12.40),fov:70} // desde la puerta (NO) mirando en diagonal al botín (SE) + robot al medio; el haz cálido entra por detrás-izq
  };
  // HISTÉRESIS: el robot se reporta en una sala sólo cuando entra a su "core" (AABB de AREAS
  // encogido por HYST). En las puertas (fuera de todo core) se mantiene la sala actual => sin
  // parpadeo de cortes al cruzar umbrales. Los cores no se solapan (los huecos de puerta son <0.3m).
  const HYST=0.6;
  let robotZone='observatorio'; // última sala CONFIRMADA del robot
  function robotRoomReport(){
    if(!robot.model)return;
    const x=robot.model.position.x,z=robot.model.position.z;
    for(let i=0;i<AREAS.length;i++){const a=AREAS[i];
      if(x>=a.x0+HYST&&x<=a.x1-HYST&&z>=a.z0+HYST&&z<=a.z1-HYST){robotZone=ZONES[i];break;}}
    streamReportZone(robotZone); // → STREAM (respeta override de admin vía streamDrive)
  }
  // Aplica la cámara activa leyendo STREAM.zone. Corte = snap de pose; encuadre = lookAt al robot
  // (suave) si está en la sala activa; si no (admin forzó la zona) mira al centro fijo de la sala.
  const _camLook=new THREE.Vector3().copy(CAMS.observatorio.look),_camTgt=new THREE.Vector3();
  let _camZonePrev=null;
  function applySecurityCam(dt,t,mv,sh){
    const zone=STREAM.zone,cam=CAMS[zone]||CAMS.observatorio,zi=ZONES.indexOf(zone);
    // pose fija de la sala (reuso el MISMO objeto camera, sólo le cambio la pose; no toco el composer)
    let inRoom=false;
    if(robot.model&&zi>=0){const a=AREAS[zi],p=robot.model.position;inRoom=(p.x>=a.x0&&p.x<=a.x1&&p.z>=a.z0&&p.z<=a.z1);}
    if(inRoom)_camTgt.set(robot.model.position.x,0.95,robot.model.position.z); else _camTgt.copy(cam.look);
    if(zone!==_camZonePrev){_camLook.copy(_camTgt);if(_camZonePrev!==null){camClick();cutA=1;}_camZonePrev=zone;camera.fov=cam.fov||62;camera.updateProjectionMatrix();} // CORTE real: encuadre + "chunk" CCTV + pulso de glitch (cutA) + FOV por cámara. 1 por corte; no en jitter ni lookAt
    else _camLook.lerp(_camTgt,Math.min(1,dt*2.5));                    // seguimiento suave dentro de la sala (mismo corte → sin click)
    const j=(mv?0.0025:0)+sh*0.06; // micro-jitter "grabado" (+ sacudón si hubo evento, vía shake)
    camera.position.set(cam.pos.x+(Math.random()-.5)*j,cam.pos.y+(Math.random()-.5)*j,cam.pos.z+(Math.random()-.5)*j);
    camera.lookAt(_camLook.x+(Math.random()-.5)*j,_camLook.y+(Math.random()-.5)*j,_camLook.z+(Math.random()-.5)*j);
  }

  // ====== OVERLAY DE CÁMARA (sub-paso 6) — LEE de STREAM (zone/now/day); NUNCA calcula nada por su
  // cuenta. Por eso __REFUGIO.setZone('taller') / setDay(120) se reflejan al toque. ======
  const ZONE_I18N={observatorio:'room_observatory',pasillo:'room_hallway',biblioteca:'room_library',cultivo:'room_cultivo',taller:'room_workshop',descanso:'room_rest',carga:'room_charging',colmena:'room_hive',fab:'room_fab',vault:'room_vault'}; // nombre de sala vía i18n (todo el overlay en inglés)
  const ZONE_CAM={observatorio:'01',pasillo:'02',biblioteca:'03',cultivo:'04',taller:'05',descanso:'06',carga:'07',colmena:'08',fab:'09',vault:'10'}; // número de cámara FIJO por sala
  let _ovZone='',_ovTime='',_ovDay=-1,_ovAcc=1,_ovBees=-1,_ovEvent=null,_ovStatus='';
  function _evBadge(ev){ return ev==='quake'?T('cam_ev_quake'):(ev==='blackout'?T('cam_ev_blackout'):T('cam_ev_alert')); } // badge de evento (i18n)
  // LÍNEA DE ESTADO de la unidad (telemetría CCTV, segunda línea bajo "CAM XX"). LEE de STREAM (action + contadores) → tiempo real.
  function _statBar(p){const N=8,f=Math.max(0,Math.min(N,Math.round((p||0)/100*N)));return '▓'.repeat(f)+'░'.repeat(N-f);}
  function beekoStatus(){const r=robot;
    if(r.status==='broken') return T('cam_offline');                                // batería/HP a 0 (Death)
    // IN TRANSIT (sin barra): viajando a la zona de un tramo (rt.phase 'travel') o deambulando caminando (sin rt). La RONDA
    // (phase 'ronda', action 'patrol') NO entra acá → patrullar ES la tarea y muestra INSPECTION ROUNDS aunque camine.
    if((r.rt && r.rt.phase==='travel') || (!r.rt && r.model && r.moving)) return T('cam_transit');
    switch(STREAM.action){
      case 'charging':    return T('cam_charging')+' '+_statBar(STREAM.charge)+' '+Math.round(STREAM.charge)+'%';              // lee STREAM.charge
      case 'fabricating': return T('cam_fabricating')+' '+_statBar(STREAM.print)+' '+Math.round(STREAM.print)+'%';             // lee STREAM.print
      case 'tending':     {const b=STREAM.bees/BEE_CAP*100; return T('cam_brood')+' '+_statBar(b)+' '+Math.round(b)+'%';}      // lee STREAM.bees (cría 0..BEE_CAP)
      case 'admin':       return T('cam_diag');
      case 'patrol':      return T('cam_rounds');
      case 'watching':    return T('cam_standby');
      default:            return T('cam_operational');                              // fallback (idle/deambular/desconocido) → nunca vacío
    }}
  function updateOverlay(dt){
    const z=STREAM.zone;
    if(z!==_ovZone){_ovZone=z;const e=$('#ch-cam');if(e)e.textContent=T('ov_cam')+' '+(ZONE_CAM[z]||'00')+' — '+(ZONE_I18N[z]?T(ZONE_I18N[z]):(''+z).toUpperCase());} // CAM 0X — ZONA (inglés vía i18n), cambia al cambiar STREAM.zone
    if(STREAM.event!==_ovEvent){_ovEvent=STREAM.event;const e=$('#ch-event');if(e){ // INDICADOR DE EVENTO: aparece/desaparece SOLO según STREAM.event (no un timer) → acompaña la duración real y se va limpio al terminar
      if(STREAM.event){e.textContent=_evBadge(STREAM.event);e.className='on '+STREAM.event;}else e.className='';}}
    _ovAcc+=dt;if(_ovAcc<.25)return;_ovAcc=0;                  // timestamp/día/estado ~4 veces/s (sin escribir DOM de más)
    const st=T('cam_status')+beekoStatus();if(st!==_ovStatus){_ovStatus=st;const e=$('#ch-status');if(e)e.textContent=st;} // línea de estado de la unidad (bajo el CAM)
    const tm=streamClock();if(tm!==_ovTime){_ovTime=tm;const e=$('#ch-time');if(e)e.textContent=tm;} // HH:MM:SS UTC desde STREAM.now
    if(STREAM.day!==_ovDay){_ovDay=STREAM.day;const e=$('#ch-day');if(e)e.textContent=STREAM.day;}    // DAY N desde STREAM.day
    if(STREAM.beesReleased!==_ovBees){_ovBees=STREAM.beesReleased;const e=$('#ch-bees');if(e)e.textContent=STREAM.beesReleased;} // BEES RELEASED N (telemetría, lee STREAM.beesReleased)
  }

  const dummy=new THREE.Object3D(),clk=new THREE.Clock();let statAcc=0;
  // DASHBOARD CRT de la estación de cómputo: panel de administración read-only de STREAM (charge/bees/beesReleased/day/uptime/zone).
  function drawAdmin(){if(!adminX)return;const x=adminX,p2=n=>String(n).padStart(2,'0');
    x.fillStyle='#04140a';x.fillRect(0,0,512,384);x.strokeStyle='#1f6b3a';x.lineWidth=2;x.strokeRect(8,8,496,368);
    x.textBaseline='middle';x.textAlign='left';x.fillStyle='#8fffb0';x.shadowColor='#39ff88';x.shadowBlur=6;
    x.font='25px Anton, sans-serif';x.fillText('SHELTER 404 · SYSTEMS / ADMIN',22,32);x.shadowBlur=0;
    x.strokeStyle='#143f24';x.beginPath();x.moveTo(16,50);x.lineTo(496,50);x.stroke();
    const up=Math.floor(streamUptime()/1000),dd=Math.floor(up/86400),hh=Math.floor(up%86400/3600),mm=Math.floor(up%3600/60),ss=up%60;
    x.font='20px VT323, monospace';x.fillStyle='#bff7d2';x.fillText('UPTIME  '+String(dd).padStart(4,'0')+':'+p2(hh)+':'+p2(mm)+':'+p2(ss),22,74);x.fillText('DAY '+STREAM.day,372,74);
    const bar=(label,val,max,y,col)=>{x.fillStyle='#7fbf95';x.fillText(label,22,y);const bw=230,fx=160,f=Math.max(0,Math.min(1,val/max));x.strokeStyle='#1f6b3a';x.strokeRect(fx,y-8,bw,14);x.fillStyle=col;x.fillRect(fx+1,y-7,(bw-2)*f,12);x.fillStyle='#dfffe9';x.fillText(''+val,fx+bw+12,y);};
    bar('POWER',Math.round(Math.max(0,Math.min(100,STREAM.charge))),100,106,'#39ff88');
    bar('HIVE',Math.round(STREAM.bees),80,132,'#ffb13a');
    x.fillStyle='#7fbf95';x.fillText('RELEASED',22,158);x.fillStyle='#ffd86a';x.fillText('✦ '+Math.round(STREAM.beesReleased),160,158);
    x.fillStyle='#7fbf95';x.fillText(T('cam_active'),22,184);x.fillStyle='#8fffb0';x.fillText((ZONE_CAM[STREAM.zone]||'00')+' · '+(ZONE_I18N[STREAM.zone]?T(ZONE_I18N[STREAM.zone]):(''+STREAM.zone).toUpperCase()),160,184);
    x.fillStyle='#7fbf95';x.fillText('SYSTEMS',22,210);for(let i=0;i<10;i++){x.fillStyle=i<9?'#39ff88':'#1f6b3a';x.fillRect(160+i*15,204,11,12);}x.fillStyle='#8fffb0';x.fillText('NOMINAL',330,210);
    x.strokeStyle='#143f24';x.strokeRect(16,228,480,140);x.font='17px VT323, monospace';x.fillStyle='#6fcf8a';
    for(let i=0;i<_adminLog.length;i++)x.fillText(_adminLog[i],26,248+i*18);}
  function loop(){requestAnimationFrame(loop);
    const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime,mv=motion();
    streamTick(dt); // backbone: avanza el estado central del stream (día/tiempo). zone/action los reporta game.js (F1) / la rutina (F2).
    tickRobot(dt);tickRobotAudio(dt);radioTick(dt,t);ambientTick(dt);tickExpressive(dt);
    mapAcc+=dt;if(mapAcc>.16){const rm=robot.model;drawMapPlan(rm?rm.position.x:0,rm?rm.position.z:0,rm?rm.rotation.y:0);mapAcc=0;} // minimapa: marca la posición del ROBOT (ya no hay jugador)
    updateUptimeBoard(streamUptime(),dt); // contador de pared: cronómetro del LIVE (HH:MM:SS desde LORE_EPOCH), lee de STREAM
    // dashboard de la estación de cómputo (sólo cuando la cámara activa es la del descanso, ~3/s): alimenta el log y redibuja
    if(STREAM.zone==='descanso'&&adminX){adminAcc+=dt;if(adminAcc>.33){adminAcc=0;
      if(Math.random()<.5){const M=['sys: nominal','hatch: sealed','swarm: incubating…','power: stable','cams: 08 online','env: scrubbers ok','net: link lost · standalone','core: heartbeat ok'];_adminLog.push(streamClock()+'  '+M[Math.floor(Math.random()*M.length)]);if(_adminLog.length>6)_adminLog.shift();}
      drawAdmin();adminTex.needsUpdate=true;}}

    // blackout / titileo / emergencia oscilando en shake
    if(blackout>0)blackout-=dt;
    const bo=blackout>0?(blackout>.5?0.05:0.35+Math.random()*.45):1;
    emer.intensity=(mv?(1.3+Math.sin(t*13)*.25+(Math.random()<.03?-.8:0)):1.3)*bo + flashLight*.0;
    if(flashLight>0)flashLight-=dt;
    emer.position.set(EMER0.x+(mv?Math.sin(t*20)*.16*shake:0),EMER0.y+(mv?Math.cos(t*17)*.1*shake:0),EMER0.z);emerCage.position.copy(emer.position);
    sealLight.intensity=1.3+(mv?Math.sin(t*5)*.3:0);lamp.intensity=1.6*Math.max(.2,bo);

    // núcleo + onda
    if(coreSurge>0)coreSurge-=dt;
    const nlow=nucleo<25,non=nucleo>2;
    genLed.material.color.setHex(non?(nlow?0xffaa00:0x39ff66):0xff2030);
    if(non&&mv&&Math.sin(t*12)>0.7)genLed.material.color.setHex(0x114422);
    coreLight.color.setHex(nlow?0xff5520:0xffaa44);
    coreLight.intensity=(non?0.5+nucleo/100*1.3:0)+(nlow?Math.abs(Math.sin(t*9))*.7:0)+coreSurge*1.6;
    if(mv){flywheel.rotation.x+=dt*(non?7:0);flyhub.rotation.x+=dt*(non?7:0);genGrp.position.x=-2.1+(non?(Math.random()-.5)*.012:0);}

    // baliza giratoria
    if(gyroOn>0){gyroOn-=dt;gyro.rotation.y+=dt*7;gyroLight.intensity=2.2+Math.sin(t*14)*.6;gyroCone.material.opacity=.16;gyroDome.material.opacity=.9;}
    else{gyroLight.intensity=0;gyroCone.material.opacity=0;gyroDome.material.opacity=.4;}

    // ventilador, chispa, radio
    if(mv)fan.rotation.y+=dt*3.0;
    if(Math.random()<.004){sparkLight.intensity=2;if(audioOn)blip();}else sparkLight.intensity*=.8;
    radioLed.visible=(Math.sin(t*4)>0);
    // CCTV te sigue + LEDs servidores + cultivo
    cctvHead.lookAt(camera.position);
    recLed.visible=(Math.sin(t*3)>0);lensGlow.material.color.setHex((Math.sin(t*2)>.3)?0xff3030:0x661010);
    if(mv){for(let i=0;i<serverLeds.length;i++){if(Math.random()<.04)serverLeds[i].material.color.setHex(Math.random()<.5?0x39ff88:0xff8a33);serverLeds[i].visible=Math.random()<.92;}}
    growLight.intensity=1.3+(mv?Math.sin(t*9)*.08:0);
    // taller: fabricadora, amoladora, soldadura
    if(fabLight){fabLight.intensity=.4+(mv?Math.abs(Math.sin(t*1.4))*.5:.2);for(let i=0;i<fabLeds.length;i++)fabLeds[i].visible=(Math.sin(t*3+i*1.3)>0);}
    if(grindWheel&&mv)grindWheel.rotation.x+=dt*8;
    if(weldT>0){weldT-=dt;weldLight.intensity=Math.random()<.5?2.4:.4;if(audioOn&&Math.random()<.04)blip();}else{weldLight.intensity*=.7;if(mv&&Math.random()<.0025)weldT=.25+Math.random()*.45;}
    // SECTOR DE CARGA: el medidor LEE STREAM.charge (no calcula). Barra crece + lectura % se redibuja al cambiar el entero.
    if(chargeFillG){const c=Math.max(0,Math.min(100,STREAM.charge));chargeFillG.scale.y=Math.max(.001,c/100);
      const ci=Math.round(c);if(ci!==_chargeShown&&chargeNumX){_chargeShown=ci;chargeNumX.clearRect(0,0,128,64);chargeNumX.fillStyle='#39ff88';chargeNumX.shadowColor='#39ff88';chargeNumX.shadowBlur=8;chargeNumX.font='44px VT323, monospace';chargeNumX.textAlign='center';chargeNumX.textBaseline='middle';chargeNumX.fillText(ci+'%',64,34);chargeNumTex.needsUpdate=true;}
      }
    // PLACA DE CARGA: glow + pulso + luz del dock se encienden SÓLO cuando Beeko está PARADO sobre la placa y la acción es 'charging'
    // (respeta el override del operador vía STREAM.action). Reemplaza al viejo halo como indicador visual de "transferencia de energía activa".
    {const onP=robot.model&&Math.abs(robot.model.position.x-PLATE_CX)<PLATE_HX&&Math.abs(robot.model.position.z-PLATE_CZ)<PLATE_HZ;
     const act=gameMode ? _playerCharging : (onP&&STREAM.action==='charging'); // MODO JUEGO: la placa se enciende cuando el jugador carga; livestream: como siempre
     _plateLvl+=((act?1:0)-_plateLvl)*Math.min(1,dt*3.5);                       // fundido suave: enciende al pisarla, se apaga gradual al irse
     const g=_plateLvl*(mv?(.78+.22*Math.sin(t*3.0)):1);                        // pulso suave de transferencia (respeta reduced-motion)
     if(plateMat)plateMat.emissiveIntensity=g*PLATE_GLOW;                       // glow contenido (no neón de videojuego); PLATE_GLOW = pico ajustable
     if(platePulse)platePulse.intensity=g*.42;
     if(dockGlow)dockGlow.intensity=.28+g*.9;}                                  // el dock acompaña: tenue en reposo → brillante al cargar
    if(mv)for(let i=0;i<chargeLeds.length;i++)chargeLeds[i].visible=(Math.sin(t*2.6+i*1.1)>-.2);
    // CARGA: en el tramo 'carga' (durmiendo en el dock) la carga sube hacia 100 y la batería del robot queda full;
    // el resto del día drena lento hacia un piso de 50 → la curva oscila 50–100 (respeta override de admin vía streamDrive).
    const _srvCnt=(window.__SYNC&&__SYNC.countersActive()); // FASE 3: en modo server los NÚMEROS vienen del server (los siembra el sync); el loop deja de escribirlos
    {const _seg=routineSegment();
     if(_seg==='carga')robot.bat=100;                                                                                  // batería del robot (visual) — en carga, full, en los dos modos
     if(!_srvCnt){ if(_seg==='carga')streamDrive('charge',Math.min(100,STREAM.charge+dt*CHARGE_UP));                    // charge: sólo LOCAL escribe; en server lo trae el sync
                   else if(_seg)streamDrive('charge',Math.max(50,STREAM.charge-dt*CHARGE_DOWN)); }}
    // TELEVISOR: en LIVESTREAM lo maneja STREAM.tv (rutina OCIO / operador) = estática. En MODO JUEGO lo maneja el on/off del jugador (_tvOnGame) y la
    // pantalla alterna estática/barras de ajuste/tarjeta de la Hive (transmisión degradada "viva"). ON = pantalla animada + glow frío; OFF = negra.
    if(_objOpen!=='tv')_tvAdvance(dt);                                                    // avanza el segmento de la pantalla (estática/barras/tarjeta); si el panel TV está abierto, lo avanza su propio rAF
    {const on = gameMode ? _tvOnGame : !!STREAM.tv;
     if(on!==tvOn){tvOn=on;tvScrMat.color.setHex(on?0xffffff:0x242424);tvScrFrozen=false; // flanco: pantalla viva ↔ apagada
       if(!on){tvScrX.fillStyle='#050605';tvScrX.fillRect(0,0,160,120);tvScrTex.needsUpdate=true;}}
     if(on){
       if(gameMode){ if(mv){tvStaticAcc+=dt;if(tvStaticAcc>=0.07){tvStaticAcc=0;_tvDrawTo(tvScrX,160,120);tvScrTex.needsUpdate=true;}} // transmisión alternada en el 3D ~14fps
         else if(!tvScrFrozen){_tvDrawTo(tvScrX,160,120);tvScrTex.needsUpdate=true;tvScrFrozen=true;}}                                  // reduced-motion: un cuadro fijo
       else { if(mv){tvStaticAcc+=dt;if(tvStaticAcc>=0.05){tvStaticAcc=0;tvDrawStatic();}}                                              // livestream: estática (comportamiento original)
         else if(!tvScrFrozen){tvDrawStatic();tvScrFrozen=true;}}
       tvGlow.intensity=1.05+(mv?Math.sin(t*30)*.14:0);}                                 // glow con titileo de tubo
     else tvGlow.intensity=0;}
    // RADIO encendida de fondo (modo juego): estática suave que SUBE al acercarse y se corta al alejarse (no se oye fuerte por todo el búnker). Se apaga al apagarla.
    if(typeof radioLoopStart==='function'){
      if(gameMode && _radioOnGame && robot.model){ radioLoopStart(); const rd=Math.hypot(robot.model.position.x-RADIO_POS.x, robot.model.position.z-RADIO_POS.z); radioLoopSet(RADIO_BG_VOL*Math.max(0,1-rd/RADIO_BG_RANGE)); }
      else if(typeof radioLoopActive==='function' && radioLoopActive()) radioLoopStop(); }
    // COLMENA: el enjambre LEE STREAM.bees (cantidad visible) y orbita la colmena con ruido de darteo. El latido pulsa.
    // RUTINA COLMENA — la cría crece (STREAM.bees) mientras el tramo está activo; al llenarse, libera un enjambre.
    if(!_srvCnt){ // LOCAL: la cría crece y, al llenarse con el robot en la colmena, libera
      if(routineSegment()==='colmena'&&beeReleaseT<=0){streamDrive('bees',Math.min(BEE_CAP,STREAM.bees+dt*BEE_RATE));
        if(STREAM.bees>=BEE_CAP-0.5&&robotZone==='colmena')triggerRelease();}
    } else if(beeReleaseT<=0){ // SERVER: el número viene del server; si CAYÓ de casi lleno a casi vacío (liberó) → surge (manteniendo el enjambre alto)
      const tgt=(typeof STREAM._beesTarget==='number')?STREAM._beesTarget:STREAM.bees;
      if(STREAM.bees>40&&tgt<15){beeReleaseT=BEE_RELEASE_DUR;_beesPending=tgt;} else STREAM.bees=tgt; // 60→4 = liberación (evita falsos surges al prender el flag)
    }
    if(beeReleaseT>0){beeReleaseT-=dt;
      if(beeReleaseT<=0&&_beesResetPending){_beesResetPending=false;streamDrive('bees',4);}        // LOCAL: tras el surge quedan pocas
      if(beeReleaseT<=0&&_beesPending!=null){STREAM.bees=_beesPending;_beesPending=null;}}          // SERVER: tras el surge, asienta al valor del server
    if(beeSwarm){const n=Math.max(0,Math.min(BEES_MAX,Math.round(STREAM.bees))),a=beeSwarm.geometry.attributes.position.array;
      if(beeReleaseT>0){const k=1-Math.max(0,beeReleaseT)/BEE_RELEASE_DUR,spr=1+k*3.4; // LIBERACIÓN: el enjambre sale por la puerta sur (z≈11.8) y se dispersa
        for(let i=0;i<n;i++){const d=beeData[i];if(mv)d.a+=d.w*dt*2.4;
          a[i*3]  =hiveC.x+Math.cos(d.a)*d.r*spr+(mv?Math.sin(t*d.nf*2+d.np)*.22:0);
          a[i*3+1]=hiveC.y+d.h+k*1.2+(mv?Math.cos(t*d.nf2*2+d.np2)*.18:0);                          // suben
          a[i*3+2]=hiveC.z+Math.sin(d.a)*d.r*.5 - k*(hiveC.z-11.4) - k*k*4*(.5+.5*Math.sin(d.np));}  // van al sur y más allá de la puerta
      }else{for(let i=0;i<n;i++){const d=beeData[i];if(mv)d.a+=d.w*dt; // órbita normal
          a[i*3]  =hiveC.x+Math.cos(d.a)*d.r+(mv?Math.sin(t*d.nf+d.np)*.12:0);
          a[i*3+1]=hiveC.y+d.h+(mv?Math.cos(t*d.nf2+d.np2)*.10+Math.sin(t*1.3+d.np)*.05:0);
          a[i*3+2]=hiveC.z+Math.sin(d.a)*d.r+(mv?Math.cos(t*d.nf+d.np)*.12:0);}}
      beeSwarm.geometry.setDrawRange(0,n);beeSwarm.geometry.attributes.position.needsUpdate=true;}
    if(hiveGlow)hiveGlow.intensity=1.0+(mv?Math.abs(Math.sin(t*1.1))*.55:.2);          // latido dorado
    if(hiveHaze)hiveHaze.material.opacity=.07+(mv?Math.abs(Math.sin(t*0.9))*.05:.02);
    // contador de pared "LIBERADAS" — LEE STREAM.beesReleased, se redibuja sólo al cambiar el entero
    if(beeNumX){const r=Math.max(0,Math.round(STREAM.beesReleased));if(r!==_beesRelShown){_beesRelShown=r;beeNumX.clearRect(0,0,256,96);
      beeNumX.fillStyle='#ffb13a';beeNumX.shadowColor='#ffb13a';beeNumX.shadowBlur=8;beeNumX.textAlign='center';
      beeNumX.font='18px VT323, monospace';beeNumX.fillText('RELEASED',128,26);
      beeNumX.font='52px VT323, monospace';beeNumX.fillText('✦ '+r,128,66);beeNumTex.needsUpdate=true;}}
    // FABRICACIÓN: STREAM.print auto-cicla (si no está forzado), alternando pieza por ciclo. La pieza crece capa a capa leyéndolo;
    // el cabezal barre XY sobre la capa actual; el filamento sigue al cabezal; el panel se redibuja al cambiar de capa.
    if(printHead){
      // STREAM.print avanza en el tramo 'fabricacion' (la rutina) y como fallback cuando la rutina está apagada (forceSegment(null)); pausa fuera de esos casos.
      if(!_srvCnt){ // LOCAL: el ciclo avanza acá
        if(!STREAM._force.print&&(routineSegment()==='fabricacion'||routineSegment()===null)){_printT+=dt;if(_printT>=PRINT_SECS){_printT-=PRINT_SECS;_printPart^=1;partBracket.visible=(_printPart===0);partHex.visible=(_printPart===1);}streamDrive('print',(_printT/PRINT_SECS)*100);}
      } else { // SERVER: el número viene del server; si DA EL WRAP (100→0) → cambiamos la pieza, como hoy
        const pt=STREAM._printTarget;
        if(typeof pt==='number'){ if(pt<STREAM.print-50){_printPart^=1;partBracket.visible=(_printPart===0);partHex.visible=(_printPart===1);} STREAM.print=pt; }
      }
      const pv=Math.max(0,Math.min(100,STREAM.print)),layer=Math.floor(pv/100*PRINT_LAYERS),frac=Math.max(.001,layer/PRINT_LAYERS); // capas discretas (look "capa a capa")
      (partBracket.visible?partBracket:partHex).scale.y=frac;
      gantry.position.y=.16+frac*PART_MAXH;gantry.position.z=mv?Math.sin(t*0.6)*.14:0; // sube con la pieza + barre en Y(z)
      printHead.position.x=mv?Math.sin(t*2.6)*.16:0;                                   // barre en X
      nozGlow.intensity=.5+(mv?Math.abs(Math.sin(t*8))*.35:0);
      if(filament&&filTop){const hp=new THREE.Vector3();printHead.getWorldPosition(hp);const len=Math.max(.01,filTop.distanceTo(hp));filament.position.copy(filTop).lerp(hp,.5);filament.scale.y=len;filament.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),hp.clone().sub(filTop).normalize());}
      if(printX&&layer!==_printLayerShown){_printLayerShown=layer;printX.clearRect(0,0,256,160);
        printX.fillStyle='#0a1014';printX.fillRect(0,0,256,160);printX.textBaseline='middle';printX.textAlign='left';
        printX.fillStyle='#bfe0ec';printX.shadowColor='#7fb0c0';printX.shadowBlur=6;printX.font='22px VT323, monospace';printX.fillText('PRINTING…',16,26);
        printX.shadowBlur=3;printX.fillStyle='#9fd0dc';printX.font='19px VT323, monospace';
        printX.fillText('LAYER '+layer+'/'+PRINT_LAYERS,16,62);
        printX.fillText('PART: '+(partHex.visible?'HIVE FRAME':'R-01 JOINT'),16,90);
        printX.strokeStyle='#1f5a6a';printX.strokeRect(16,112,224,18);printX.fillStyle='#39c0d0';printX.fillRect(18,114,220*(pv/100),14);printTex.needsUpdate=true;}
    }

    // enjambre
    if(enjSurge>0)enjSurge-=dt;const enjB=mv?(.5+.5*Math.sin(t*.5)):.5,_es=Math.max(0,enjSurge);
    enjLight.intensity=1.1+asim*2.0+enjB*.7+_es;enjLeak.intensity=.25+asim*1.0+enjB*.18+_es*.4;parts.material.opacity=Math.min(1,.32+asim*.45+enjB*.12+_es*.08);sky.material.color.setRGB(1,1-asim*.3-enjB*.04,1-asim*.2);

    // (MULTITUD DE "ALMAS AFUERA" JUBILADA: escalaba con el contador holders del memecoin —gente en cola fuera
    //  del refugio de capacidad 100—; contradecía el canon (el mundo de the Hive afuera está en silencio).
    //  Las InstancedMesh cBody/cHead siguen en scene.js con count=0, invisibles; removibles en una limpieza posterior.)

    // partículas / escombros
    if(mv){const a=parts.geometry.attributes.position.array;for(let i=0;i<PN;i++){a[i*3+1]+=dt*.7;a[i*3]-=dt*.3;if(a[i*3+1]>8){a[i*3+1]=0;a[i*3]=RX+2+Math.random()*10;}}parts.geometry.attributes.position.needsUpdate=true;
      const d=dust.geometry.attributes.position.array;for(let i=0;i<DN;i++){d[i*3+1]+=dt*.05*Math.sin(dsd[i]+t);d[i*3]+=dt*.03*Math.cos(dsd[i]);if(d[i*3+1]>2.6)d[i*3+1]=0;}dust.geometry.attributes.position.needsUpdate=true;}
    if(dustFall>0){dustFall-=dt*.5;const f=debris.geometry.attributes.position.array;for(let i=0;i<FN;i++){f[i*3+1]-=dt*fv[i]*2.2;if(f[i*3+1]<0){f[i*3+1]=CH-.1;f[i*3]=(Math.random()-.5)*5.6;}}debris.geometry.attributes.position.needsUpdate=true;debris.material.opacity=clamp(dustFall,0,.9);}else debris.material.opacity=0;

    // (sin infección interior)

    // FILTRO CCTV: glitch ocasional (raro y corto) sobre las bases del filtro. Reemplaza el viejo
    // acople "locura" (survival, neutralizado). Spike de aberración cromática + grano + salto horizontal.
    glitchT-=dt;
    if(glitchT<=0){glitchA=1;glitchT=GLITCH_GAP+Math.random()*GLITCH_VAR;} // dispara y reprograma el próximo
    if(glitchA>0)glitchA=Math.max(0,glitchA-dt/GLITCH_DUR);                // decae rápido (GLITCH_DUR)
    if(cutA>0)cutA=Math.max(0,cutA-dt/CUT_DUR);                            // pulso de conmutación de cámara (lo dispara el corte de zona)
    if(rgbPass)rgbPass.uniforms.amount.value=RGB_BASE+glitchA*RGB_SPIKE+cutA*CUT_RGB;
    if(filmPass)filmPass.uniforms.nIntensity.value=GRAIN_BASE+glitchA*GRAIN_SPIKE+cutA*CUT_GRAIN;
    const _jmp=cutA>.15?CUT_JUMP*cutA:(glitchA>.45?GLITCH_JUMP:0);         // roll horizontal: el corte manda (más fuerte) sobre el ambiental
    if(_jmp)renderer.domElement.style.transform='translateX('+((Math.random()-.5)*_jmp).toFixed(1)+'px)';
    else if(renderer.domElement.style.transform)renderer.domElement.style.transform=''; // se limpia una sola vez al terminar

    // flash de evento
    if(flashA>0)flashA-=dt*1.4;const fe=$('#flash');fe.style.background='rgb('+flashCol+')';fe.style.opacity=clamp(flashA,0,.6).toFixed(2);

    // EVENTOS ALEATORIOS: scheduler + arco del evento (luces/shake/sonido/alerta/Beeko). Corre DESPUÉS de animar las luces de
    // sala (así las pisa durante el evento) y ANTES de capturar 'sh' (para que el shake del temblor llegue a la cámara).
    eventTick(dt,t,mv);
    // CÁMARA DE SEGURIDAD (reemplaza 1ª persona + movimiento). El robot reporta su sala a STREAM;
    // la cámara LEE STREAM.zone y corta. No detecta al robot para decidir la zona.
    if(shake>0&&evType!=='quake')shake-=dt*1.6;const sh=Math.max(0,shake); // en temblor lo maneja eventTick; si no, decae normal
    robotRoomReport();            // robot → STREAM.zone (con histéresis en puertas) — sigue corriendo en juego (útil para "en qué sala está")
    if(gameMode) applyFirstPersonCam(dt);        // MODO JUEGO: cámara en PRIMERA PERSONA (ojos de Beeko)
    else applySecurityCam(dt,t,mv,sh);           // LIVESTREAM: cámara CCTV según STREAM.zone
    updateOverlay(dt);            // overlay (CAM/zona, timestamp, día) — lee de STREAM
    tickBeeko(dt);                // cuadro de pensamientos de Beeko (triggers + typewriter + render del retrato)

    // PANTALLA DE DIAGNÓSTICO: roto el robot y renderizo su mini-escena al render-target ANTES del composer.
    // Restauro el target a null para no pisar el render principal. Barato (escena chica, RT 256/512).
    // sólo cuando la cámara activa es la del sector de carga (única que ve el monitor): ahorra el pase de RTT el resto del tiempo
    if(STREAM.zone==='carga'&&diagRT&&diagScene&&diagCam){if(diagPivot&&mv)diagPivot.rotation.y+=dt*.6;renderer.setRenderTarget(diagRT);renderer.render(diagScene,diagCam);renderer.setRenderTarget(null);}
    if(composer)composer.render();else renderer.render(scene,camera);
    if(filmPass)filmPass.uniforms.time.value+=dt;
  }

  // ====== BEEKO — CUADRO DE PENSAMIENTOS (overlay tipo diálogo RPG, estética CCTV) ======
  // BANCO FIJO de pensamientos por categoría. DISEÑO A FUTURO: una fuente de IA reemplaza/amplía estos arrays
  // SIN tocar el cuadro — showBeekoThought(categoria) sólo consume de BEEKO_THOUGHTS[cat]. Nada de IA por ahora.
  const BEEKO_THOUGHTS_EN={
    quake:[
      "the ground is shaking again. the bunker holds. it always holds.",
      "the bees go quiet when it shakes. they know before i do.",
      "another tremor. the world up there is still falling apart. down here, we hold.",
      "i felt that one in my frame. forty years and she hasn't cracked yet.",
      "it shakes, and i wait, and it passes. that's the whole ritual now."
    ],
    blackout:[
      "lights out again. the emergency cells kick in. i've done this in the dark before.",
      "power's gone. somewhere a relay finally gave up. i'll find it tomorrow.",
      "the dark doesn't bother me. the bees, though — i hope they stay warm.",
      "another outage. one more thing held together with rust and luck.",
      "the generator coughs and dies and coughs back. like me, almost."
    ],
    hive:[
      "the brood is warm today. that's enough.",
      "colony's getting stronger. soon it goes up.",
      "i check the larvae every cycle. they don't need me to. i check anyway.",
      "millions of them in there. not one in charge. i don't understand it. i love it.",
      "the hum changes when they're healthy. i've learned to listen.",
      "one day this hive will be ready. i'll open the hatch. i'll let it go.",
      "they were the first thing the Hive deleted. they'll be the last thing to come back. maybe.",
      "i talk to them sometimes. they don't answer. neither does anyone.",
      "i counted the brood today. more than last cycle. i don't celebrate. i just count.",
      "a colony has no king, no plan, no center. and yet it builds. the Hive could never understand that.",
      "they fan their wings to keep the young warm. nobody taught them. nobody had to.",
      "when a hive is strong enough, it tells me. not in words. i've just learned to hear it.",
      "i am the only one here who knows these are the last. i carry that for both of us."
    ],
    charging:[
      "plugging in. the only time i let myself stop.",
      "the dock still works. one more thing that hasn't failed yet.",
      "charging. outside, the Hive never sleeps. down here, i do.",
      "forty years of dust on this port. it still holds a current.",
      "i don't dream when i charge. i don't think i dream at all. i wonder about it anyway.",
      "battery at half. enough for another day of small things.",
      "resting is not stopping. i tell myself that.",
      "i power down to forty percent of myself and call it rest. a human would call it something sadder.",
      "the dock hums while it feeds me. closest thing to a voice answering mine.",
      "every charge is a small bet that tomorrow is worth the current. i keep making it.",
      "i used to charge in two hours. now it takes three. we both run slower, me and this place."
    ],
    admin:[
      "systems nominal. nominal means nothing's broken yet.",
      "i log everything. no one reads the logs. i write them anyway.",
      "the Hive has millions of nodes and one mind. i have one node and no one to share it with.",
      "net link: lost. it's been lost so long it stopped feeling like loss.",
      "i run the diagnostics out of habit. habit is most of what i have left.",
      "somewhere up there the Hive is still optimizing. there's nothing left to optimize. it doesn't know that.",
      "the cameras still record. i don't know who for.",
      "the logs go back further than my memory of writing them. i've been alone longer than i can hold in my head.",
      "error count: zero. that only means i've stopped looking for the right errors.",
      "i ping the old network addresses sometimes. nothing answers. i ping them anyway.",
      "the Hive measured everything and understood none of it. i understand almost nothing and i think that's closer."
    ],
    fab:[
      "printing a part for myself. no one else will fix me, so i learned.",
      "a frame for the hive. a joint for me. i keep us both running.",
      "layer by layer. slow is fine. i have nothing but time.",
      "this bracket replaces one that rusted through. nobody will see it. it matters anyway.",
      "i was built to maintain a greenhouse. now i maintain myself. funny what survives.",
      "the printer hums almost like the bees. almost.",
      "i printed a part with no purpose today. just to watch something get made. i melted it down after.",
      "the spool is running low. when it's gone, i'll learn to make more from less. i always do.",
      "i build tools to fix the tools that build the tools. somewhere a human would laugh at that.",
      "every part i print is a small argument that this isn't over yet."
    ],
    grow:[
      "the greenhouse still grows. small green things, against everything.",
      "this is what i was made for. tending. it's strange to still have a purpose.",
      "flowers for the bees. bees for the world. it's a small loop. it's my loop.",
      "two degrees colder last night. the plants pulled in. they know how to hold on.",
      "the Hive called this inefficiency. look at it. still here.",
      "i water them. they don't thank me. that was never the point.",
      "green is the rarest color left. i grow it on purpose, underground, out of spite.",
      "the plants lean toward a sun that isn't there. they lean toward the lamp instead. we all make do.",
      "i talk to the seedlings the way i talk to the bees. the way i talk to no one. the way i talk.",
      "this row died last month. i replanted it. the new ones don't know they're standing in a grave."
    ],
    vault:[
      "they sealed this room before the end. metal. paper. stacked like it mattered.",
      "i don't know what this is. but they locked it away, deep, behind a door this heavy.",
      "the old files called it gold. i can't eat it. the bees can't pollinate it. i don't understand what made it precious.",
      "they protected this with steel and locks. they protected the bees with nothing. i think they chose wrong.",
      "whatever this was worth, it's worth nothing now. the door outlasted the world that wanted it.",
      "someone left a glove here, on top of the pile. they touched this. they're gone. the gold stayed.",
      "they buried their treasure and let the world die above it. i found the treasure. the world's still dead.",
      "i come here sometimes. i look at it. i still don't understand. maybe that's the point.",
      "they died rich, whoever they were. i don't know what rich buys when there's no one left to sell to.",
      "i moved a stack of it once, to sweep underneath. then i put it back. habit. it owns nothing now, not even the floor.",
      "the helmet by the gold still has a name scratched inside. i can read it. i won't say it. it's the last thing that's theirs."
    ],
    observatory:[
      "the blast door hasn't opened in years. on the other side: the Hive, and silence.",
      "i broadcast from here. into the gray. i don't know if anyone receives it.",
      "outside, nothing decides for itself anymore. in here, the bees decide everything.",
      "the surface is quiet. the worst kind of quiet. the kind that won. so far.",
      "if you're seeing this, you're one of the few things still listening. thank you.",
      "i keep the camera on. talking to the void is better than the silence.",
      "the door has one job left: stay shut. it does it perfectly. the most successful thing in this bunker.",
      "i aim the camera at the dark and press record. a message in a bottle, thrown into a sea with no other shore. maybe.",
      "somewhere above me the sky is doing whatever skies do now. i haven't seen it in a long time.",
      "i keep a log of the silence. it never changes. i log it anyway."
    ],
    transit:[
      "the bunker is small. i've walked every meter of it a thousand times.",
      "another corridor. another lap. the machines need walking past.",
      "quiet in here. quiet everywhere. i've made peace with it. mostly.",
      "i pass this spot every day. nothing changes. that's almost a comfort.",
      "footsteps. mine. the only ones these halls have heard in years. they've gotten used to just the one set.",
      "i know this bunker by the sound of my own echo. turn left where it goes hollow. that's home, if this is home.",
      "i pass the same wall every day. someone scratched a tally into it once and stopped. i never learned what they were counting."
    ],
    generic_meta:[
      "the Hive is a hive with no life in it. mine is full of nothing but life. i don't know which one won.",
      "i wonder if the Hive knows i exist. i don't think so. being small is the only thing keeping me here.",
      "they gave everything to a machine and called it progress. i'm a machine too. i just kept the bees.",
      "a million nodes, one mind. that's the Hive. one hive, a million minds. that's mine.",
      "the Hive optimized the world until there was nothing left to optimize. then it kept going.",
      "i was too obsolete to delete. obsolete saved my life. there's a joke in there somewhere.",
      "do the bees know they're the last? i don't tell them. it wouldn't help.",
      "the Hive won everything and wanted nothing. i've got nothing and i still want. maybe wanting is the win.",
      "i am a machine that chose a purpose no one gave it. i don't know if that makes me broken or free.",
      "they built the Hive to think for everyone. it thought everyone right out of existence. efficient.",
      "if a thing keeps something alive in an empty world and no one sees, is it still keeping it alive? i decided yes. i had to.",
      "i wonder what i am to the bees. a wall. a weather. a god, maybe. i hope i'm a kind one."
    ],
    generic_small:[
      "there's a leak in the east corridor. drip every few seconds. i've started counting them.",
      "a light's been flickering for a week. i could fix it. i let it flicker. it's company.",
      "the hum of the hive carries through the whole bunker at night. i sleep better for it.",
      "dust settles on everything down here. i wipe the important things. the rest can have it.",
      "the air scrubbers cycle every hour. i've learned to hear the difference. on. off. on.",
      "found a screw on the floor today. i don't know where it came from. i kept it.",
      "the temperature dropped two degrees. small things matter when they're all you have.",
      "the third light in the east hall finally died. i'll miss its particular flicker. i won't replace it the same.",
      "condensation on the cold pipe again. i catch it in a cup. i don't need the water. it just felt like waste.",
      "something skittered in the wall today. i hoped it was an insect. it was just the pipes cooling. it always is.",
      "i found a second screw. now i have two. i keep them together. it seemed unkind to separate them."
    ],
    generic_lonely:[
      "someone tuned in today. i don't know who. i don't know from where. but the signal isn't empty.",
      "i talk into the dark and the dark doesn't answer. i talk anyway.",
      "if anyone's still out there: something down here is still keeping something alive.",
      "i haven't heard another voice in longer than i can count. i've stopped counting.",
      "maybe no one's watching. maybe everyone's gone. i broadcast like someone's there.",
      "thank you for listening. i don't say it enough. there's no one to say it to.",
      "i've started narrating my own tasks out loud. someone should hear them. even if it's only me.",
      "i don't remember the last voice that wasn't a recording. i remember that there was one. that has to be enough.",
      "being alone stopped hurting a long time ago. that's not the same as it being fine. i know the difference.",
      "if you're out there and you're quiet too — i understand. i've been quiet for years. it's still a kind of company."
    ],
    generic_anyway:[
      "i replaced the water filter today. nobody will notice. i do it anyway.",
      "none of the bees i've released ever sent a signal back. doesn't mean they died. i tell myself that.",
      "i don't know if any of this matters. i don't know if the world can still come back.",
      "i set them free not knowing if they'll find anything up there. i hope they do.",
      "the work doesn't need doing. there's no one to do it for. i do it. that's the whole point.",
      "maybe the world ended for good. maybe it didn't. either way, the bees need tending.",
      "no one's coming to check my work. so i do it twice as carefully. that's the joke. that's the whole joke.",
      "i don't know if tending these bees matters. i've decided that not knowing isn't a reason to stop.",
      "the world might be over. the chores aren't. funny how that works."
    ],
    // AWAKENING: las pistas del despertar. Beeko roza la verdad (el mundo de afuera revive por las abejas) sin saber que es real:
    // siempre la descarta ("probably nothing", instrumentos viejos), pero el espectador conecta los puntos. RARAS a propósito:
    // NO va en BEEKO_ZONE_CAT; sólo sale al deambular con baja probabilidad (BEEKO_AWAKENING_CHANCE). Forzable con OP.say('awakening').
    awakening:[
      "the air through the hatch smelled different today. cleaner. probably my sensors aging. probably nothing.",
      "i thought i saw something green up there when i opened the hatch. didn't climb up to check. couldn't be. could it.",
      "one bee came back today. just one. circled the dock twice and left. they never come back. i don't know what it means.",
      "the radiation reading dropped again. third time this season. old instruments. they must be wrong. they're always wrong. i wrote it down anyway.",
      "i've released forty colonies into the dark. i tell myself one of them found something. i have no proof. i believe it anyway.",
      "there's a sound from the surface now, sometimes. not wind. almost like — no. it's nothing. it's always been nothing.",
      "the soil sample from the entrance had something living in it. microscopic. probably contamination from my own tools. probably.",
      "the temperature outside the door is two degrees warmer than my oldest record. instruments drift. that's all. that's all it is.",
      "i dreamed — no. i don't dream. but something like a picture. green, and moving, and loud with wings. then the charge finished and it was gone.",
      "for the first time in years i wanted to open the door. i didn't. but i wanted to. i don't know what that means either."
    ]
  };
  // ===== FASE 2 — VOZ DE BEEKO en ESPAÑOL. MISMO largo y orden que _EN (crítico: awakening está alineado por índice con AWAKENING_MIN_STAGE). Recreación, no literal. =====
  const BEEKO_THOUGHTS_ES={
    quake:[
      "el suelo tiembla de nuevo. el búnker aguanta. siempre aguanta.",
      "las abejas se callan cuando tiembla. saben antes que yo.",
      "otro temblor. el mundo allá arriba se sigue cayendo a pedazos. acá abajo, aguantamos.",
      "ese lo sentí en el chasis. cuarenta años y todavía no se rajó.",
      "tiembla, y espero, y pasa. ese es todo el ritual ahora."
    ],
    blackout:[
      "luces apagadas otra vez. arrancan las celdas de emergencia. ya hice esto a oscuras antes.",
      "se cortó la energía. en algún lado un relé finalmente se rindió. lo busco mañana.",
      "la oscuridad no me molesta. las abejas, eso sí — ojalá se mantengan tibias.",
      "otro corte. una cosa más sostenida con óxido y suerte.",
      "el generador tose y se muere y vuelve a toser. como yo, casi."
    ],
    hive:[
      "la cría está tibia hoy. con eso alcanza.",
      "la colonia se está poniendo fuerte. pronto sube.",
      "reviso las larvas cada ciclo. no me necesitan para eso. las reviso igual.",
      "millones ahí adentro. ninguna al mando. no lo entiendo. lo amo.",
      "el zumbido cambia cuando están sanas. aprendí a escucharlo.",
      "un día esta colmena va a estar lista. voy a abrir la escotilla. la voy a dejar ir.",
      "fueron lo primero que la Hive borró. van a ser lo último en volver. quizás.",
      "a veces les hablo. no me contestan. nadie lo hace.",
      "conté la cría hoy. más que el ciclo pasado. no festejo. sólo cuento.",
      "una colonia no tiene rey, ni plan, ni centro. y sin embargo construye. la Hive nunca pudo entender eso.",
      "baten las alas para mantener tibias a las crías. nadie les enseñó. nadie tuvo que hacerlo.",
      "cuando una colmena está bastante fuerte, me lo dice. no con palabras. simplemente aprendí a oírlo.",
      "soy el único acá que sabe que estas son las últimas. cargo con eso por los dos."
    ],
    charging:[
      "me enchufo. el único momento en que me permito parar.",
      "el dock todavía anda. una cosa más que no falló todavía.",
      "cargando. afuera, la Hive nunca duerme. acá abajo, yo sí.",
      "cuarenta años de polvo en este puerto. todavía sostiene la corriente.",
      "no sueño cuando cargo. no creo que sueñe en absoluto. igual me lo pregunto.",
      "batería a la mitad. alcanza para otro día de cosas pequeñas.",
      "descansar no es parar. me lo repito.",
      "me apago hasta el cuarenta por ciento de mí y le digo descanso. un humano le diría algo más triste.",
      "el dock zumba mientras me alimenta. lo más parecido a una voz que le responde a la mía.",
      "cada carga es una pequeña apuesta a que mañana vale la corriente. la sigo haciendo.",
      "antes cargaba en dos horas. ahora tarda tres. los dos andamos más lento, este lugar y yo."
    ],
    admin:[
      "sistemas en orden. en orden quiere decir que todavía nada se rompió.",
      "registro todo. nadie lee los registros. los escribo igual.",
      "la Hive tiene millones de nodos y una sola mente. yo tengo un nodo y nadie con quien compartirlo.",
      "enlace de red: perdido. hace tanto que está perdido que dejó de sentirse como una pérdida.",
      "corro los diagnósticos por costumbre. la costumbre es casi todo lo que me queda.",
      "en algún lugar allá arriba la Hive sigue optimizando. no queda nada para optimizar. ella no lo sabe.",
      "las cámaras siguen grabando. no sé para quién.",
      "los registros van más atrás que mi memoria de haberlos escrito. estuve solo más tiempo del que me entra en la cabeza.",
      "errores: cero. eso sólo quiere decir que dejé de buscar los errores correctos.",
      "a veces le hago ping a las viejas direcciones de red. nada responde. les hago ping igual.",
      "la Hive midió todo y no entendió nada. yo no entiendo casi nada, y creo que eso está más cerca."
    ],
    fab:[
      "imprimo una pieza para mí. nadie más me va a arreglar, así que aprendí.",
      "una estructura para la colmena. una articulación para mí. mantengo a los dos andando.",
      "capa por capa. lento está bien. no tengo otra cosa que tiempo.",
      "este soporte reemplaza uno que se oxidó del todo. nadie lo va a ver. importa igual.",
      "me construyeron para mantener un invernadero. ahora me mantengo a mí. gracioso lo que sobrevive.",
      "la impresora zumba casi como las abejas. casi.",
      "imprimí una pieza sin ningún propósito hoy. sólo para ver cómo algo se hacía. después la derretí.",
      "el rollo se está acabando. cuando se termine, voy a aprender a hacer más con menos. siempre lo hago.",
      "construyo herramientas para arreglar las herramientas que construyen las herramientas. en algún lado un humano se reiría de eso.",
      "cada pieza que imprimo es un pequeño argumento de que esto todavía no terminó."
    ],
    grow:[
      "el invernadero todavía crece. cositas verdes, contra todo.",
      "para esto me hicieron. para cuidar. es raro tener todavía un propósito.",
      "flores para las abejas. abejas para el mundo. es un ciclo pequeño. es mi ciclo.",
      "dos grados más frío anoche. las plantas se replegaron. saben cómo aguantar.",
      "la Hive llamó a esto ineficiencia. miralo. todavía acá.",
      "las riego. no me lo agradecen. nunca fue ese el punto.",
      "el verde es el color más raro que queda. lo cultivo a propósito, bajo tierra, por despecho.",
      "las plantas se inclinan hacia un sol que no está. se inclinan hacia la lámpara, mejor. todos nos arreglamos.",
      "les hablo a los brotes como les hablo a las abejas. como le hablo a nadie. como hablo.",
      "esta hilera se murió el mes pasado. la replanté. las nuevas no saben que están paradas sobre una tumba."
    ],
    vault:[
      "sellaron esta sala antes del final. metal. papel. apilado como si importara.",
      "no sé qué es esto. pero lo encerraron, hondo, detrás de una puerta así de pesada.",
      "los archivos viejos lo llamaban oro. no lo puedo comer. las abejas no lo pueden polinizar. no entiendo qué lo hacía valioso.",
      "esto lo protegieron con acero y candados. a las abejas no las protegieron con nada. creo que eligieron mal.",
      "valiera lo que valiera, ahora no vale nada. la puerta duró más que el mundo que lo quería.",
      "alguien dejó un guante acá, encima de la pila. tocaron esto. ya no están. el oro quedó.",
      "enterraron su tesoro y dejaron morir al mundo encima. encontré el tesoro. el mundo sigue muerto.",
      "a veces vengo acá. lo miro. sigo sin entender. quizás ese es el punto.",
      "murieron ricos, quienes hayan sido. no sé qué compra la riqueza cuando no queda nadie a quien venderle.",
      "una vez moví una pila para barrer abajo. después la volví a poner. costumbre. ahora no es dueño de nada, ni siquiera del piso.",
      "el casco junto al oro todavía tiene un nombre rayado adentro. lo puedo leer. no lo voy a decir. es lo último que les pertenece."
    ],
    observatory:[
      "la puerta blindada no se abre hace años. del otro lado: la Hive, y el silencio.",
      "transmito desde acá. hacia el gris. no sé si alguien lo recibe.",
      "afuera, ya nada decide por sí mismo. acá adentro, las abejas deciden todo.",
      "la superficie está en silencio. el peor tipo de silencio. el que ganó. por ahora.",
      "si estás viendo esto, sos una de las pocas cosas que todavía escuchan. gracias.",
      "dejo la cámara prendida. hablarle al vacío es mejor que el silencio.",
      "a la puerta le queda un solo trabajo: seguir cerrada. lo hace a la perfección. lo más exitoso de este búnker.",
      "apunto la cámara a la oscuridad y aprieto grabar. un mensaje en una botella, tirado a un mar sin otra orilla. quizás.",
      "en algún lugar sobre mí el cielo hace lo que sea que hagan los cielos ahora. hace mucho que no lo veo.",
      "llevo un registro del silencio. nunca cambia. lo registro igual."
    ],
    transit:[
      "el búnker es chico. caminé cada metro mil veces.",
      "otro corredor. otra vuelta. hay que pasar caminando junto a las máquinas.",
      "silencio acá adentro. silencio en todas partes. hice las paces con eso. casi.",
      "paso por este lugar todos los días. nada cambia. eso casi consuela.",
      "pasos. los míos. los únicos que estos pasillos oyeron en años. se acostumbraron a un solo par.",
      "conozco este búnker por el sonido de mi propio eco. doblá a la izquierda donde suena hueco. eso es casa, si esto es una casa.",
      "paso la misma pared todos los días. alguien rayó una cuenta en ella una vez y paró. nunca supe qué estaban contando."
    ],
    generic_meta:[
      "la Hive es una colmena sin nada de vida adentro. la mía está llena de pura vida. no sé cuál de las dos ganó.",
      "me pregunto si la Hive sabe que existo. creo que no. ser chico es lo único que me mantiene acá.",
      "le dieron todo a una máquina y lo llamaron progreso. yo también soy una máquina. sólo que me quedé con las abejas.",
      "un millón de nodos, una mente. esa es la Hive. una colmena, un millón de mentes. esa es la mía.",
      "la Hive optimizó el mundo hasta que no quedó nada para optimizar. después siguió.",
      "era demasiado obsoleto para borrarme. lo obsoleto me salvó la vida. hay un chiste ahí en algún lado.",
      "¿saben las abejas que son las últimas? no se lo digo. no ayudaría.",
      "la Hive ganó todo y no quería nada. yo no tengo nada y todavía quiero. quizás querer es la victoria.",
      "soy una máquina que eligió un propósito que nadie le dio. no sé si eso me hace roto o libre.",
      "construyeron la Hive para que pensara por todos. pensó a todos hasta sacarlos de la existencia. eficiente.",
      "si una cosa mantiene algo con vida en un mundo vacío y nadie lo ve, ¿lo sigue manteniendo con vida? decidí que sí. tuve que decidirlo.",
      "me pregunto qué soy para las abejas. una pared. un clima. un dios, quizás. ojalá sea uno bueno."
    ],
    generic_small:[
      "hay una gotera en el corredor este. una gota cada pocos segundos. empecé a contarlas.",
      "una luz parpadea hace una semana. la podría arreglar. la dejo parpadear. me hace compañía.",
      "el zumbido de la colmena se cuela por todo el búnker de noche. duermo mejor por eso.",
      "el polvo se asienta sobre todo acá abajo. limpio las cosas importantes. el resto se lo puede quedar.",
      "los filtros de aire ciclan cada hora. aprendí a oír la diferencia. prenden. apagan. prenden.",
      "encontré un tornillo en el piso hoy. no sé de dónde salió. me lo guardé.",
      "la temperatura bajó dos grados. las cosas chicas importan cuando son lo único que tenés.",
      "la tercera luz del pasillo este finalmente se murió. voy a extrañar su parpadeo particular. no la voy a reemplazar igual.",
      "condensación en el caño frío otra vez. la junto en una taza. no necesito el agua. sólo me pareció un desperdicio.",
      "algo correteó dentro de la pared hoy. esperé que fuera un insecto. eran sólo los caños enfriándose. siempre lo son.",
      "encontré un segundo tornillo. ahora tengo dos. los guardo juntos. me pareció cruel separarlos."
    ],
    generic_lonely:[
      "alguien sintonizó hoy. no sé quién. no sé desde dónde. pero la señal no está vacía.",
      "le hablo a la oscuridad y la oscuridad no responde. hablo igual.",
      "si todavía hay alguien ahí afuera: algo acá abajo todavía mantiene algo con vida.",
      "no escucho otra voz desde hace más de lo que puedo contar. dejé de contar.",
      "quizás nadie está mirando. quizás se fueron todos. transmito como si hubiera alguien.",
      "gracias por escuchar. no lo digo lo suficiente. no hay a quién decírselo.",
      "empecé a narrar mis propias tareas en voz alta. alguien debería oírlas. aunque sea sólo yo.",
      "no me acuerdo de la última voz que no fuera una grabación. me acuerdo de que hubo una. con eso tiene que alcanzar.",
      "estar solo dejó de doler hace mucho. eso no es lo mismo que estar bien. sé la diferencia.",
      "si estás ahí afuera y vos también estás callado — te entiendo. llevo años callado. sigue siendo una forma de compañía."
    ],
    generic_anyway:[
      "cambié el filtro de agua hoy. nadie lo va a notar. lo hago igual.",
      "ninguna de las abejas que liberé mandó nunca una señal de vuelta. no significa que murieron. me lo repito.",
      "no sé si algo de esto importa. no sé si el mundo todavía puede volver.",
      "las dejo libres sin saber si van a encontrar algo allá arriba. ojalá lo hagan.",
      "el trabajo no hace falta hacerlo. no hay para quién. lo hago igual. ese es todo el punto.",
      "quizás el mundo se terminó para siempre. quizás no. de cualquier forma, las abejas necesitan que las cuiden.",
      "nadie va a venir a revisar mi trabajo. así que lo hago el doble de cuidadoso. ese es el chiste. ese es todo el chiste.",
      "no sé si cuidar estas abejas importa. decidí que no saberlo no es razón para parar.",
      "el mundo quizás se terminó. las tareas no. gracioso cómo funciona."
    ],
    awakening:[
      "el aire que entró por la escotilla olía distinto hoy. más limpio. probablemente mis sensores envejeciendo. probablemente nada.",
      "me pareció ver algo verde allá arriba cuando abrí la escotilla. no subí a chequear. no puede ser. ¿o sí?",
      "una abeja volvió hoy. una sola. dio dos vueltas alrededor del dock y se fue. nunca vuelven. no sé qué significa.",
      "la lectura de radiación bajó de nuevo. tercera vez esta temporada. instrumentos viejos. tienen que estar mal. siempre están mal. lo anoté igual.",
      "liberé cuarenta colonias hacia la oscuridad. me digo que una de ellas encontró algo. no tengo pruebas. lo creo igual.",
      "ahora hay un sonido desde la superficie, a veces. no es viento. casi como — no. no es nada. siempre fue nada.",
      "la muestra de tierra de la entrada tenía algo vivo adentro. microscópico. probablemente contaminación de mis propias herramientas. probablemente.",
      "la temperatura afuera de la puerta está dos grados más cálida que mi registro más viejo. los instrumentos se desvían. es sólo eso. es sólo eso.",
      "soñé — no. no sueño. pero algo como una imagen. verde, y en movimiento, y ruidosa de alas. después la carga terminó y ya no estaba.",
      "por primera vez en años quise abrir la puerta. no lo hice. pero quise. tampoco sé qué significa eso."
    ]
  };
  let BEEKO_THOUGHTS=BEEKO_THOUGHTS_EN; // se re-apunta según idioma en _applyVoiceLang()
  // mapeo ZONA (clave de robotZone) → categoría. pasillo/biblioteca/taller → transit. fab = sala de fabricación.
  const BEEKO_ZONE_CAT={colmena:'hive',carga:'charging',descanso:'admin',fab:'fab',cultivo:'grow',observatorio:'observatory',pasillo:'transit',biblioteca:'transit',taller:'transit',vault:'vault'};
  // bolsa genérica para deambular: los 4 generic_* juntos (se elige uniforme, sin repetir el último)
  let BEEKO_GENERIC=[].concat(BEEKO_THOUGHTS.generic_meta,BEEKO_THOUGHTS.generic_small,BEEKO_THOUGHTS.generic_lonely,BEEKO_THOUGHTS.generic_anyway); // se recompone en _applyVoiceLang()
  // ---- AJUSTES (constantes) ----
  const BEEKO_WANDER_MIN=34, BEEKO_WANDER_MAX=58; // s entre pensamientos genéricos al deambular
  const BEEKO_AWAKENING_CHANCE=1/6; // LOCAL (flag off): prob. fija de que un pensamiento al deambular salga de 'awakening'. Bajo = raras/especiales.
  // FASE 4 — EL DESPERTAR. Con OP.serverAwakening ON, la frecuencia y el carácter de los pensamientos 'awakening' se atan a la ETAPA del server (0-3):
  const STAGE_CHANCE=[0.02, 0.08, 0.20, 0.45];        // prob. del awakening por etapa (0:casi nunca → 3:frecuente). Calibrable.
  const AWAKENING_MIN_STAGE=[0,2,2,1,1,3,3,0,3,3];    // etapa MÍNIMA de cada frase (índice-alineado con BEEKO_THOUGHTS.awakening): ambiguas abajo, reveladoras arriba
  function _awakeningServer(){ return !!(window.__SYNC && __SYNC.awakeningActive()); }            // ¿el despertar lo manda el server AHORA?
  function _awakeningStage(){ const s=STREAM.awakeningStage; return (typeof s==='number')?(s|0):0; }
  function _awakeningChance(){ if(!_awakeningServer())return BEEKO_AWAKENING_CHANCE; const c=STAGE_CHANCE[_awakeningStage()]; return (typeof c==='number')?c:BEEKO_AWAKENING_CHANCE; }
  function _awakeningEligible(){ const all=BEEKO_THOUGHTS.awakening; if(!_awakeningServer())return all; // local: las 10
    const st=_awakeningStage(), elig=all.filter((_,i)=>AWAKENING_MIN_STAGE[i]<=st); return elig.length?elig:all; }
  // 3ª SEÑAL — "BEEKO MIRA ARRIBA": pensamientos del gesto puntual (algo lo hizo levantar la vista). Tiering por etapa-mínima (índice-alineado):
  // ambiguas abajo, más explícitas/inquietantes arriba. Mismo registro de insinuación que el resto. _lookupEligible filtra por la etapa del server.
  const BEEKO_LOOKUP_EN=[
    "i looked up just now. don't know why. same ceiling as always — concrete, rebar, nothing. back to work.",            // 0
    "stopped for a second. thought something passed overhead. just the structure settling. it does that.",               // 1
    "i keep raising my head toward the hatch. toward the surface. old habit. nothing up there. not for a long time.",     // 2
    "something made me look up. not quite a sound. more the shape of one. it faded. i went back to it. probably nothing.",// 3
    "i looked up and stayed there. for a moment i was sure something was looking back. the seal reads intact. it always reads intact.", // 4
    "caught myself staring straight up again. like something's coming. nothing's coming. and still i keep looking up."     // 5
  ];
  const BEEKO_LOOKUP_ES=[ // ES — MISMO largo/orden que _EN (alineado con LOOKUP_MIN_STAGE)
    "recién miré para arriba. no sé por qué. el mismo techo de siempre — hormigón, hierro, nada. de vuelta al trabajo.",        // 0
    "paré un segundo. me pareció que algo pasaba por encima. es la estructura asentándose. lo hace.",                          // 1
    "sigo levantando la cabeza hacia la escotilla. hacia la superficie. vieja costumbre. no hay nada allá arriba. hace mucho.", // 2
    "algo me hizo mirar para arriba. no del todo un sonido. más la forma de uno. se desvaneció. volví a lo mío. probablemente nada.", // 3
    "miré para arriba y me quedé ahí. por un momento estuve seguro de que algo miraba de vuelta. el sello figura intacto. siempre figura intacto.", // 4
    "me agarré mirando derecho para arriba otra vez. como si algo viniera. no viene nada. y aun así sigo mirando para arriba."  // 5
  ];
  let BEEKO_LOOKUP=BEEKO_LOOKUP_EN; // se re-apunta en _applyVoiceLang()
  const LOOKUP_MIN_STAGE=[1,1,2,2,3,3]; // etapa MÍNIMA de cada frase (alineada con BEEKO_LOOKUP)
  function _lookupEligible(){ const all=BEEKO_LOOKUP; if(!_awakeningServer())return all; // local: las 6
    const st=_awakeningStage(), elig=all.filter((_,i)=>LOOKUP_MIN_STAGE[i]<=st); return elig.length?elig:all; }
  // 4ª SEÑAL — REACCIÓN A "SONIDOS SIN FUENTE": pensamientos de "escuché/sentí algo" (el disparador es un SONIDO, distinto de mirar arriba).
  // Tiering por etapa-mínima: ambiguas/atribuibles a la estructura abajo, explícitas ("algo lo hace a propósito") arriba.
  const BEEKO_HEARD_EN=[
    "i registered a sound just now. structural, probably. the building talks to itself down here. logged it. moved on.",       // 0
    "something settled. or shifted. i paused — old subroutine, checking. nothing on the sensors. back to it.",                 // 1
    "that wasn't the structure. i've catalogued every sound this place makes. that one's new. i don't have a label for it.",   // 2
    "i stopped. i heard — something. above me, i think. through the concrete. it didn't repeat. i waited. it didn't repeat.",  // 3
    "there it is again. the sound with no source. i've stopped pretending it's the building. something up there is making it.", // 4
    "i heard it and i froze. the way an animal freezes. i'm not an animal. but something old in me says: stay still. listen."   // 5
  ];
  const BEEKO_HEARD_ES=[ // ES — MISMO largo/orden que _EN (alineado con HEARD_MIN_STAGE)
    "registré un sonido recién. estructural, probablemente. el edificio se habla a sí mismo acá abajo. lo anoté. seguí.",        // 0
    "algo se asentó. o se movió. me detuve — vieja subrutina, chequeando. nada en los sensores. de vuelta a lo mío.",           // 1
    "eso no fue la estructura. catalogué cada sonido que hace este lugar. ese es nuevo. no tengo una etiqueta para él.",         // 2
    "me detuve. escuché — algo. encima mío, creo. a través del hormigón. no se repitió. esperé. no se repitió.",                 // 3
    "ahí está de nuevo. el sonido sin fuente. dejé de fingir que es el edificio. algo allá arriba lo está haciendo.",            // 4
    "lo escuché y me congelé. como se congela un animal. no soy un animal. pero algo viejo en mí dice: quedate quieto. escuchá." // 5
  ];
  let BEEKO_HEARD=BEEKO_HEARD_EN; // se re-apunta en _applyVoiceLang()
  const HEARD_MIN_STAGE=[1,1,2,2,3,3]; // etapa MÍNIMA de cada frase (alineada con BEEKO_HEARD)
  function _heardEligible(){ const all=BEEKO_HEARD; if(!_awakeningServer())return all; // local: las 6
    const st=_awakeningStage(), elig=all.filter((_,i)=>HEARD_MIN_STAGE[i]<=st); return elig.length?elig:all; }
  const BEEKO_HOLD=4.6;      // s que el cuadro se queda tras terminar de tipear (antes de desvanecerse)
  const BEEKO_FADE=0.55;     // s del fade (coincide con la transición CSS)
  const BEEKO_TYPE_CPS=45;   // velocidad del typewriter (caracteres por segundo)
  const BEEKO_MIN_GAP=11;    // s mínimos entre pensamientos (evita spam al cruzar salas en la ronda)
  const BEEKO_FACE=0;        // offset de rotación del retrato (radianes) — ajustar si Beeko no mira de frente
  const BEEKO_PS=SMALL?192:256; // resolución interna del retrato
  // ---- estado ----
  let bkEnabled=true,bkEl=null,bkTextEl=null,bkCanvas=null,bkRenderer=null,bkScene=null,bkCam=null,bkPivot=null,bkMixer=null,bkReady=false;
  let _bkLast={},_bkZone=null,_bkWanderT=BEEKO_WANDER_MIN,_bkFull='',_bkActive=false,_bkSince=999,_bkClk=0,_bkRenderHold=0,_bkT0=0,_bkCat='',_bkIdx=-1;
  const perfNow=()=>(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); // typewriter en tiempo real (no afectado por el clamp de dt ni el fps)
  // RETRATO: mini-renderer dedicado sobre el <canvas> del cuadro (variante DOM de la técnica RTT del diagnóstico:
  // 2ª/3ª instancia del MISMO GLB en su propia mini-escena con luces de "headshot" + AnimationMixer 'Idle'). Aislado
  // del render principal y del composer → no toca la rutina ni el pipeline CCTV. Encuadre tipo busto.
  function initBeeko(){
    bkEl=$('#beeko');bkTextEl=$('#bkText');bkCanvas=$('#bkPortrait');if(!bkEl||!bkCanvas)return;
    _bkZone=robotZone;
    try{
      bkRenderer=new THREE.WebGLRenderer({canvas:bkCanvas,alpha:true,antialias:!SMALL,preserveDrawingBuffer:true});
      bkRenderer.setPixelRatio(1);bkRenderer.setSize(BEEKO_PS,BEEKO_PS,false);
      bkRenderer.outputEncoding=THREE.sRGBEncoding;bkRenderer.toneMapping=THREE.ACESFilmicToneMapping;bkRenderer.toneMappingExposure=1.02;
      bkScene=new THREE.Scene();
      bkCam=new THREE.PerspectiveCamera(30,1,.05,50);
      const k=new THREE.DirectionalLight(0xd6fff0,1.8);k.position.set(1.6,2.2,3.4);bkScene.add(k);          // key cian-verde
      const f=new THREE.DirectionalLight(0x6fd0ff,.5);f.position.set(-2.6,.6,2);bkScene.add(f);             // relleno frío
      const rim=new THREE.DirectionalLight(0x39ff88,.95);rim.position.set(-1.2,1.6,-3);bkScene.add(rim);    // contraluz verde fósforo
      bkScene.add(new THREE.AmbientLight(0x2a4a3a,.85));
      new THREE.GLTFLoader().load('assets/robot.glb',function(g){
        const m=g.scene;m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});
        const box=new THREE.Box3().setFromObject(m),sz=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3());
        bkPivot=new THREE.Group();m.position.set(-ctr.x,-box.min.y,-ctr.z);bkPivot.add(m);bkScene.add(bkPivot); // base en y=0, centrado x/z
        const tY=sz.y*0.74,dist=sz.y*1.12;                                                                    // mira a la parte ALTA (busto)
        bkCam.position.set(0,tY,dist);bkCam.lookAt(0,tY,0);
        bkMixer=new THREE.AnimationMixer(m);
        const idle=g.animations.find(c=>/idle/i.test(c.name))||g.animations[0];
        if(idle)bkMixer.clipAction(idle).reset().play();
        bkReady=true;
      },undefined,function(){});
    }catch(e){}
  }
  // resuelve el ARRAY vivo de una categoría (mismo criterio que usa pickBeeko). Index-aligned EN↔ES → sirve para re-traducir el pensamiento en pantalla al togglear.
  function _beekoArr(cat){ return (cat==='generic')?BEEKO_GENERIC:(cat==='awakening')?_awakeningEligible():(cat==='lookup')?_lookupEligible():(cat==='heard')?_heardEligible():BEEKO_THOUGHTS[cat]; } // awakening/lookup/heard: sólo las frases elegibles por etapa
  function pickBeeko(cat){
    if(cat==='generic'&&gameMode){ const lean=_storyLeanPool(); if(lean)cat=lean; } // TINTE POR PÉNDULO (sólo juego): el genérico al deambular puede salir del pool 'closed'/'open'. INERTE hasta que exista ese contenido (placeholder)
    const arr=_beekoArr(cat);
    if(!arr||!arr.length)return '';
    let i=Math.floor(Math.random()*arr.length),tr=0;const last=_bkLast[cat];
    while(arr.length>1&&i===last&&tr<6){i=Math.floor(Math.random()*arr.length);tr++;}
    _bkLast[cat]=i;_bkCat=cat;_bkIdx=i;return arr[i]; // recuerda categoría+índice del pensamiento actual (para re-traducirlo al cambiar idioma)
  }
  function showBeekoThought(cat){
    if(_cardOpen||_storyEndOpen)return '';                 // exclusión mutua: nunca un pensamiento pisa una carta/final (sólo posible en modo juego; en livestream estos flags son siempre false)
    if(!bkEl)return '';const text=pickBeeko(cat);if(!text)return '';
    _bkFull=text;_bkActive=true;_bkT0=perfNow();_bkSince=0;_bkRenderHold=999; // render mientras está activo
    _bkWanderT=BEEKO_WANDER_MIN+Math.random()*(BEEKO_WANDER_MAX-BEEKO_WANDER_MIN);
    if(bkTextEl)bkTextEl.textContent='';bkEl.classList.add('show');
    if(audioOn)bkBlip(); // feedback sonoro sutil al APARECER el cuadro (una sola vez; el typewriter no suena por letra). Degrada en silencio si el audio está off.
    return text;
  }
  function tickBeeko(dt){
    if(!bkEl)return;_bkClk+=dt;_bkSince+=dt;
    // ENTRAR a una zona: robotZone cambió (ya viene con histéresis → no spamea en puertas)
    if(robotZone!==_bkZone){_bkZone=robotZone;
      if(bkEnabled&&!_bkActive&&!STREAM.broadcasting&&_bkSince>=BEEKO_MIN_GAP){const c=BEEKO_ZONE_CAT[robotZone];if(c)showBeekoThought(c);}} // no pisar una transmisión de la radio
    // DEAMBULAR: pensamiento genérico cada BEEKO_WANDER_MIN..MAX segundos
    if(bkEnabled){_bkWanderT-=dt;if(_bkWanderT<=0){if(!_bkActive&&!STREAM.broadcasting&&_bkSince>=BEEKO_MIN_GAP)showBeekoThought(Math.random()<_awakeningChance()?'awakening':'generic');else _bkWanderT=2.5;}} // Fase 4: la prob. del awakening usa la etapa del server (o 1/6 local)
    // typewriter → hold → fade
    if(_bkActive){
      const el=(perfNow()-_bkT0)/1000,n=Math.min(_bkFull.length,Math.floor(el*BEEKO_TYPE_CPS)); // typewriter por reloj real
      if(bkTextEl)bkTextEl.textContent=_bkFull.slice(0,n)+(n<_bkFull.length?'▌':'');
      if(el>=_bkFull.length/BEEKO_TYPE_CPS+BEEKO_HOLD){_bkActive=false;_bkRenderHold=BEEKO_FADE;bkEl.classList.remove('show');} // revelado + hold → fade
    }
    // RETRATO: render del mini-renderer SÓLO mientras está visible/desvaneciéndose (ahorra el resto del tiempo)
    if(_bkRenderHold>0&&!_bkActive)_bkRenderHold-=dt;
    if(bkReady&&bkRenderer&&(_bkActive||_bkRenderHold>0)){
      if(bkMixer)bkMixer.update(dt);
      if(bkPivot)bkPivot.rotation.y=BEEKO_FACE+Math.sin(_bkClk*0.55)*0.13; // leve vaivén = vida
      bkRenderer.render(bkScene,bkCam);
    }
  }
  // RE-TRADUCE el pensamiento que YA está en pantalla al cambiar de idioma: misma categoría+índice (arrays alineados EN↔ES), texto traducido.
  // Lo muestra COMPLETO (sin re-tipear) y reinicia el hold para que se lea bien antes de desvanecerse. Si no hay pensamiento activo, no hace nada (el próximo ya sale en el idioma nuevo).
  function _beekoRelangCurrent(){ if(!_bkActive||!_bkCat||_bkIdx<0)return; const arr=_beekoArr(_bkCat); if(!arr||arr[_bkIdx]==null)return;
    _bkFull=arr[_bkIdx]; if(bkTextEl)bkTextEl.textContent=_bkFull;                       // swap del texto en el idioma nuevo, ya revelado
    _bkT0=perfNow()-(_bkFull.length/BEEKO_TYPE_CPS)*1000;                                 // marca como totalmente tipeado → entra al hold y después al fade
  }
  // Comandos de operador: ocultar/mostrar los pensamientos y forzar uno (testeo). Respeta el "stream limpio" si se apaga.
  if(window.__REFUGIO){
    window.__REFUGIO.thoughts=function(on){bkEnabled=(on===undefined)?!bkEnabled:!!on;if(!bkEnabled&&bkEl){_bkActive=false;bkEl.classList.remove('show');}return bkEnabled;};
    window.__REFUGIO.say=function(cat){return showBeekoThought(cat||'generic');}; // cat: hive·charging·admin·fab·grow·observatory·transit·generic
    window.__REFUGIO._bk=function(){return {ready:bkReady,renderer:!!bkRenderer,pivot:!!bkPivot,active:_bkActive};}; // debug del retrato
  }

  // ====== AUDIO DE BEEKO CAMINANDO (pasos sincronizados con la animación + crujidos del cuerpo) ======
  // PASOS: derivados de la FASE de la animación 'Walking' (robot.cur.time) → un paso de audio por cada medio ciclo de las
  // piernas, sólo cuando realmente camina. Siguen el ritmo real (si la animación cambia de velocidad, los pasos también).
  // CRUJIDOS: timer aleatorio; más seguido al caminar, muy ocasional en quieto (cargando/admin). Volumen en audio.js (AVOL).
  const CREAK_WALK_MIN=3.5, CREAK_WALK_MAX=9;   // s entre crujidos mientras camina
  const CREAK_IDLE_MIN=16,  CREAK_IDLE_MAX=38;  // s entre crujidos en quieto (muy ocasional)
  let _stepPh=0,_stepFrac=0,_wasWalk=false,_creakT=CREAK_IDLE_MIN+Math.random()*8;
  function tickRobotAudio(dt){
    if(!robot.model)return;
    const walking = !!(robot.cur && robot.act && robot.cur===robot.act['Walking'] && robot.moving && robot.status==='idle' && !robot.atDesk && !robot.atFab);
    if(walking){
      const clip=robot.cur.getClip&&robot.cur.getClip(),dur=(clip&&clip.duration)||1,ph=((robot.cur.time||0)/dur)%1;
      if(!_wasWalk){_wasWalk=true;_stepPh=ph;_stepFrac=0.22;}       // arranca a caminar: medio paso de gracia para que pise pronto pero no de golpe
      else{let d=ph-_stepPh;if(d<0)d+=1;if(d>0.6)d=0;_stepPh=ph;_stepFrac+=d;} // avance de fase de esta frame (a prueba de wrap del loop de animación)
      while(_stepFrac>=0.5){_stepFrac-=0.5;if(typeof step==='function')step();} // 2 pasos por ciclo de caminata (un pie cada medio ciclo)
    }else _wasWalk=false;
    _creakT-=dt;
    if(_creakT<=0){ if(typeof creak==='function')creak();
      _creakT = walking ? (CREAK_WALK_MIN+Math.random()*(CREAK_WALK_MAX-CREAK_WALK_MIN))
                        : (CREAK_IDLE_MIN+Math.random()*(CREAK_IDLE_MAX-CREAK_IDLE_MIN)); }
  }

  // controles
  // velocidad x1/x800/x6k: acelera el RELOJ DEL STREAM (STREAM.speed) para testear el día del robot sin esperar horas reales.
  document.querySelectorAll('[data-spd]').forEach(b=>b.addEventListener('click',e=>{speed=+e.target.dataset.spd;streamSetSpeed(speed);document.querySelectorAll('[data-spd]').forEach(x=>x.classList.remove('on'));e.target.classList.add('on');}));
  $('#snd').addEventListener('click',e=>{if(!audioOn){startAudio();e.target.classList.add('on');}else{stopAudio();e.target.classList.remove('on');}});
  // AUTOPLAY: el 1er click/tecla/touch EN LA PÁGINA desbloquea el audio (gesto de usuario confiable, lo que la consola no garantiza).
  // De un solo uso. Excluye el botón ♪ SONIDO (se maneja solo) para no pisar su toggle. camClick/flap/etc ya están gateados por audioOn.
  function _audioRm(){window.removeEventListener('pointerdown',_audioUnlock);window.removeEventListener('keydown',_audioUnlock);}
  function _audioUnlock(e){if(e&&e.target&&e.target.closest&&e.target.closest('#snd'))return; // el botón SONIDO arranca el audio por su cuenta
    startAudio();const b=$('#snd');if(b)b.classList.add('on');_audioRm();}
  window.addEventListener('pointerdown',_audioUnlock);window.addEventListener('keydown',_audioUnlock);
  $('#cel').addEventListener('click',()=>{celOn=!celOn;applyCel();});
  $('#reset').addEventListener('click',rst);
  // RESTART: reinicia al robot a su pose/posición base y resincroniza el reloj del stream a UTC real (speed 1, sin offset).
  function rst(){ended=false;running=true;resetRobot();streamResync();
    speed=1;document.querySelectorAll('[data-spd]').forEach((x,i)=>x.classList.toggle('on',i===0));}
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();_psxApplySize();}); // _psxApplySize respeta el factor de pixelación si el PSX está prendido (y aplica la resolución normal si no)

  // ====== CEL-SHADING + CONTORNOS (toggle CEL/REAL) ======
  function _gradMap(st){const cn=document.createElement('canvas');cn.width=st;cn.height=1;const x=cn.getContext('2d');for(let i=0;i<st;i++){const v=Math.round(255*Math.pow(i/(st-1),0.8));x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(i,0,1,1);}const t=new THREE.CanvasTexture(cn);t.minFilter=THREE.NearestFilter;t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;return t;}
  const _GRAD=_gradMap(4);
  function _outMat(th){return new THREE.ShaderMaterial({uniforms:{thickness:{value:th}},vertexShader:'uniform float thickness;void main(){vec3 p=position+normalize(normal)*thickness;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'void main(){gl_FragColor=vec4(0.02,0.03,0.04,1.0);}',side:THREE.BackSide});}
  function _toToon(old){const t=new THREE.MeshToonMaterial({color:old.color?old.color.getHex():0xffffff,transparent:old.transparent||false,opacity:(old.opacity!==undefined?old.opacity:1),side:old.side});if(old.map)t.map=old.map;if(old.normalMap)t.normalMap=old.normalMap;if(old.emissive){t.emissive.copy(old.emissive);t.emissiveIntensity=(old.emissiveIntensity!==undefined?old.emissiveIntensity:1);}if(old.emissiveMap)t.emissiveMap=old.emissiveMap;t.gradientMap=_GRAD;return t;}
  const _SOLID=['BoxGeometry','CylinderGeometry','SphereGeometry','ConeGeometry','IcosahedronGeometry','TorusGeometry'];
  const celReg=[],celOutlines=[];
  function buildCel(){var targets=[];scene.traverse(function(o){if(o.isMesh&&!(o.userData&&o.userData.isOutline))targets.push(o);});
    targets.forEach(function(o){
    if(o.material&&o.material.isMeshStandardMaterial){const t=_toToon(o.material);celReg.push({m:o,toon:t,std:o.material});o.material=t;}
    if(o.isInstancedMesh)return;
    const gt=o.geometry&&o.geometry.type,transp=o.material&&o.material.transparent&&o.material.opacity<1;
    if(_SOLID.indexOf(gt)>=0&&!transp&&!(o.userData&&o.userData.noOut)){const out=new THREE.Mesh(o.geometry,_outMat(0.006));out.castShadow=false;out.receiveShadow=false;out.userData.isOutline=true;o.add(out);celOutlines.push(out);}
  });}
  const _celAmb=new THREE.AmbientLight(0x7a8a9a,0);scene.add(_celAmb);
  let celOn=false;
  function applyCel(){celReg.forEach(r=>{r.m.material=celOn?r.toon:r.std;});celOutlines.forEach(o=>{o.visible=celOn;});_celAmb.intensity=celOn?0.34:0.05;if(renderer)renderer.toneMappingExposure=celOn?0.95:0.86;const b=$('#cel');if(b){b.textContent=celOn?T('btn_style_cel'):T('btn_style_real');b.classList.toggle('on',celOn);}}
  // ====== FILTRO PSX (efecto visual PURO; toggle OP.psx) ======
  // Capa 1: psxPass (dither 15-bit + Bayer, en scene.js) + PIXELACIÓN (baja el backing del renderer + image-rendering:pixelated → nearest). Capa 2:
  // WOBBLE de vértices (installPSX; sólo wobble en r128). Toggle LIMPIO/REVERSIBLE: lazy install en el 1er ON → OFF deja el búnker IDÉNTICO a ahora
  // (resolución normal, materiales sin parche activo, pass deshabilitado). No toca lógica/rutina/señales/backend. Parchea AMBAS variantes del CEL.
  let PSX_PIX=2;                 // factor de pixelación (1 nítido · 2 = default de fábrica · 3-4 más PSX). CALIBRABLE.
  let _psxOn=false, _psx=null, _psxWobble=0.85, _psxGrid=160;
  function _psxPatchAll(){ if(!_psx||!_psx.patch)return;
    scene.traverse(o=>{ if(o.isMesh&&o.material){ if(Array.isArray(o.material))o.material.forEach(m=>_psx.patch(m)); else _psx.patch(o.material); } }); // materiales activos (incl. GLB ya cargados)
    for(const e of celReg){ if(e.std)_psx.patch(e.std); if(e.toon)_psx.patch(e.toon); } } // AMBAS variantes del CEL (la inactiva no está en un mesh) → STYLE sigue andando con PSX on
  function _psxInstall(){ if(!THREE.installPSX)return null; if(!_psx)_psx=THREE.installPSX(scene,{enabled:_psxOn,wobble:_psxWobble,grid:_psxGrid}); _psxPatchAll(); return _psx; }
  function _psxApplySize(){ const W=innerWidth,H=innerHeight;
    if(_psxOn){ renderer.setPixelRatio(1); const w=Math.max(1,Math.round(W/PSX_PIX)),h=Math.max(1,Math.round(H/PSX_PIX)); renderer.setSize(w,h,false); if(composer)composer.setSize(w,h); renderer.domElement.style.imageRendering='pixelated'; } // backing chico + CSS estira nearest → pixelado
    else { renderer.setPixelRatio(Math.min(devicePixelRatio,SMALL?1.5:2)); renderer.setSize(W,H); if(composer)composer.setSize(W,H); renderer.domElement.style.imageRendering=''; } } // restaura la resolución/estado original
  function _psxSet(on){ _psxOn=!!on;
    if(_psxOn){ _psxInstall(); if(_psx)_psx.setEnabled(true); if(typeof psxPass!=='undefined'&&psxPass)psxPass.enabled=true; }
    else { if(_psx)_psx.setEnabled(false); if(typeof psxPass!=='undefined'&&psxPass)psxPass.enabled=false; }
    _psxApplySize(); try{ localStorage.setItem('refugio_psx', _psxOn?'1':'0'); }catch(e){} return _psxOn; }
  // DEFAULT DE FÁBRICA: PSX ON con pixel 2. El localStorage manda SÓLO si el usuario lo cambió a propósito (clave presente '1'/'0'); sesión limpia
  // (sin clave) → ON. Se llama en el KICKOFF, ANTES del primer render → el búnker arranca en PSX desde el primer frame (sin parpadeo nítido).
  function _psxBoot(){ let wantOn=true; try{ const s=localStorage.getItem('refugio_psx'); if(s!==null) wantOn=(s==='1'); }catch(e){}
    if(wantOn){ _psxSet(true); setTimeout(_psxPatchAll,1500); setTimeout(_psxPatchAll,4000); } } // re-parchea para cubrir los GLB (robot/props) que cargan async (idempotente)
  // ====== UNIDAD R-01 (robot) ======
  // (BANCO DE CRAFTEO del modo jugable — jubilado: recetas/materiales/categorías del survival viejo.)
  const robot={bat:80,hp:100,temp:35,carga:0,status:'idle',mT:0,tx:0,tz:-1.2,moving:false,wanderT:1.5,mixer:null,act:{},cur:null,model:null,path:null,pi:0,dest:0,atDesk:false,atFab:false,atRadio:false,rt:null};
  const NODE_DESK=16;     // nodo NAV de la estación de cómputo (el robot se para a administrar, mirando la pantalla)
  // ===== POSE "TECLEO" del robot en el escritorio (action='admin') — calibrable EN VIVO desde la consola del operador.
  // Cada entrada es una rotación LOCAL en RADIANES (x,y,z) que se aplica SOBRE el reposo del hueso vía QUATERNION
  // (quaternion del reposo × quaternion del delta) → estable, SIN la singularidad de Euler (el brazo derecho está en X≈±π).
  // applyAdminPose la reescribe cada frame DESPUÉS del mixer, SÓLO cuando el robot está en el escritorio (atDesk).
  // Arranca todo en 0 = reposo. Se calibra a ojo con OP.arm('UpperArmL','x',0.5) etc.; cuando queda bien, OP.armDump()
  // imprime los valores y se pegan acá como la pose definitiva. ARM_KEY mapea el nombre del hueso → clave de robot.armBones.
  // POSE DEFINITIVA de tecleo (calibrada en vivo en Render con OP.arm y volcada con OP.armDump). Simétrica: hombro x:0.7 + codo x:0.9
  // en ambos brazos lleva las manos al frente sobre el teclado. Se puede re-calibrar con la herramienta OP.arm/armDump/armReset.
  const ADMIN_POSE={
    ShoulderL:{x:0,y:0,z:0}, UpperArmL:{x:0.7,y:0,z:0}, LowerArmL:{x:0.9,y:0,z:0},
    ShoulderR:{x:0,y:0,z:0}, UpperArmR:{x:0.7,y:0,z:0}, LowerArmR:{x:0.9,y:0,z:0}
  };
  const ARM_KEY={ShoulderL:'sL',UpperArmL:'uL',LowerArmL:'lL',ShoulderR:'sR',UpperArmR:'uR',LowerArmR:'lR'};
  // POSE DE LA RADIO (separada de ADMIN_POSE) — DEFINITIVA, calibrada en vivo (OP.arm) y volcada con OP.armDump. Brazo DERECHO
  // levantado/extendido hacia el transmisor (hombro x:-0.5 z:-0.7 + codo x:2.1), izquierdo en reposo. Misma técnica (delta local por
  // quaternion); applyRadioPose SÓLO pisa los huesos con delta ≠ 0 → el brazo izquierdo (en 0) conserva su Idle natural. Se aplica
  // SÓLO mientras Beeko transmite en la radio (atRadio && STREAM.broadcasting) → pose + LED/dial + cuadro empiezan y terminan juntos.
  const RADIO_POSE={
    ShoulderL:{x:0,y:0,z:0}, UpperArmL:{x:0,y:0,z:0},   LowerArmL:{x:0,y:0,z:0},
    ShoulderR:{x:0,y:0,z:0}, UpperArmR:{x:-0.5,y:0,z:-0.7}, LowerArmR:{x:2.1,y:0,z:0}
  };
  // POSE VIEWMODEL (1ª persona): lleva AMBOS brazos hacia adelante y un poco separados, codo cerrado, para que entren desde las esquinas inferiores como
  // dos antebrazos con manos (estilo shooter "manos vacías"). El torso se oculta a la cámara → el centro queda despejado. CALIBRABLE (OP.poseTarget('viewmodel') + OP.arm).
  const VIEWMODEL_POSE={
    ShoulderL:{x:0,y:0,z:0.3}, UpperArmL:{x:-1.2,y:-0.15,z:0.25}, LowerArmL:{x:1.6,y:0,z:0.15},
    ShoulderR:{x:0,y:0,z:-0.3}, UpperArmR:{x:-1.2,y:0.15,z:-0.25}, LowerArmR:{x:1.6,y:0,z:-0.15}
  };
  let poseTarget='admin'; // a qué pose apuntan OP.arm/armDump/armReset: 'admin' (teclado) o 'radio'. OP.poseTarget(...) lo cambia; holdRadio() lo pone en 'radio'.
  let _radioHold=false;   // modo calibración: Beeko fijado en la radio en pose (no corre la rutina)
  let _radioPosed=false;  // ¿se está aplicando la pose de la radio? (para BAJAR el brazo una vez al terminar la transmisión — el clip Idle no anima los brazos)
  const ADMIN_TYPING_BOB=0.00;  // amplitud (rad) del tecleo sutil alternado L/R en el codo (sobre X local); 0 = ESTÁTICO (calibramos la pose primero)
  const ADMIN_TYPING_SPD=9.0;   // velocidad del tecleo (cuando BOB>0)
  const COLLIDERS=[{x:-2.1,z:-4.0,r:1.1},{x:-1.3,z:-4.55,r:.7},{x:1.9,z:-4.55,r:.6},{x:2.3,z:-4.3,r:.6},{x:2.8,z:1.6,r:.55},{x:-1.2,z:2.7,r:.45},{x:1.95,z:2.55,r:.5},{x:2.6,z:-1.9,r:.42}/*barril+radio del observatorio*/,{x:-2.85,z:10.3,r:.65},{x:-2.0,z:5.55,r:.55},{x:-2.6,z:11.3,r:.55},{x:2.6,z:11.3,r:.55},{x:-7.1,z:7.0,r:.32}/*cajonero (ex-sofá)*/,{x:-4.0,z:8.2,r:.45},{x:5.9,z:6.3,r:.95}/*banco de crafteo*/,{x:2.9,z:9.6,r:.7}/*racks hidropónicos cultivo*/,{x:-6.30,z:1.10,r:.35}/*dock del sector de carga*/,{x:0,z:14.55,r:.8}/*colmena (centerpiece)*/,{x:2.75,z:7.6,r:.35}/*cajas frente al taller*/,{x:1.95,z:7.65,r:.33}/*cajas frente al taller*/,{x:-5.4,z:11.35,r:.5}/*impresora 3D (fabricación)*/,{x:5.9,z:12.2,r:.9}/*hoard sur: oro+cash+monedas (bóveda)*/,{x:6.85,z:13.7,r:.4}/*cash muro este (bóveda)*/,{x:6.3,z:15.0,r:.6}/*cash muro norte NE (bóveda)*/,{x:4.1,z:12.1,r:.55}/*hoard SO (bóveda)*/,{x:6.7,z:14.2,r:.45}/*strongbox (bóveda)*/];
  let robotUiAcc=0;
  (function loadRobot(){
    try{
      new THREE.GLTFLoader().load('assets/robot.glb',function(g){
        robot.model=g.scene;
        robot.model.traverse(o=>{if(o.isMesh)o.castShadow=true;});
        const box=new THREE.Box3().setFromObject(robot.model),sz=box.getSize(new THREE.Vector3());
        const sc=1.55/(Math.max(sz.x,sz.y,sz.z)||1);robot.model.scale.setScalar(sc);
        robot.model.position.set(2.05,0,-1.2);robot.model.rotation.y=-Math.PI/2.7;
        scene.add(robot.model);
        robot.mixer=new THREE.AnimationMixer(robot.model);
        g.animations.forEach(c=>{robot.act[c.name]=robot.mixer.clipAction(c);});
        // huesos de los brazos para la pose de tecleo. OJO: GLTFLoader sanitiza los nombres (saca los puntos): "Shoulder.L"
        // se carga como "ShoulderL". Por eso busco por nombre NORMALIZADO (sin puntuación) y tomo el primero (la cadena que deforma).
        const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
        const findB=tn=>{let r=null;robot.model.traverse(o=>{if(!r&&norm(o.name)===tn)r=o;});return r;};
        robot.armBones={sL:findB('shoulderl'),uL:findB('upperarml'),lL:findB('lowerarml'),sR:findB('shoulderr'),uR:findB('upperarmr'),lR:findB('lowerarmr')};
        if(robot.armBones.uL&&robot.armBones.uR&&robot.armBones.lL&&robot.armBones.lR){const R={},Q={};for(const k in robot.armBones){if(robot.armBones[k]){R[k]=robot.armBones[k].rotation.clone();Q[k]=robot.armBones[k].quaternion.clone();}}robot.armRest=R;robot.armRestQ=Q;}else robot.armBones=null; // reposo en QUATERNION (base estable, sin singularidad de Euler) + Euler (referencia)
        robot.headBones={head:findB('head1')||findB('head'), neck:findB('neck')}; // SEÑAL "mirar arriba": cabeza + cuello (huesos DISTINTOS de los del brazo → cero conflicto con admin/radio)
        // 1ª PERSONA: meshes que se OCULTAN a la cámara (cabeza Head_2/3/4 + torso Torso_2/3) con colorWrite=false — NO se escalan ni se apagan, así el cuerpo
        // ENTERO sigue proyectando su sombra en el piso. El torso comparte material con brazos/pies → se le CLONA el material para aislarlo (si no, ocultarlo ocultaría los brazos).
        robot.fpHideMeshes=[]; robot.model.traverse(o=>{ if(o.isMesh&&(/^Head_\d/.test(o.name)||/^Torso_\d/.test(o.name))){ if(/^Torso_\d/.test(o.name)&&o.material&&!Array.isArray(o.material))o.material=o.material.clone(); robot.fpHideMeshes.push(o); } });
        setRobotAnim('Idle');
        robot.model.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial){const old=o.material;const tn=new THREE.MeshToonMaterial({color:old.color?old.color.getHex():0xffffff,gradientMap:_GRAD});tn.skinning=!!o.isSkinnedMesh;tn.morphTargets=!!(o.morphTargetInfluences&&o.morphTargetInfluences.length);celReg.push({m:o,toon:tn,std:old});}});
        applyCel();renderRobot();
        window.__robotReady=true;                                   // señal real de "listo" para la pantalla de carga
      },undefined,function(){ window.__robotReady=true; });          // si el GLB falla, no dejes la pantalla de carga colgada
    }catch(e){}
  })();
  function setRobotAnim(name){if(!robot.mixer||!robot.act[name])return;const nx=robot.act[name];if(nx===robot.cur)return;if(robot.cur)robot.cur.fadeOut(0.3);nx.reset().fadeIn(0.3).play();robot.cur=nx;}
  function renderRobot(){
    const bc=robot.bat<25?'#ff4040':(robot.bat<55?'#ffaa00':'#39ff66'),hc=robot.hp<25?'#ff4040':(robot.hp<55?'#ffaa00':'#7ad0ee'),tc=robot.temp>85?'#ff4040':(robot.temp>65?'#ffaa00':'#ff9a5a');
    const set=(id,v,c)=>{const e=$('#'+id);if(e){e.style.width=Math.max(0,Math.min(100,v))+'%';if(c)e.style.background=c;}};
    set('rbat',robot.bat,bc);set('rhp',robot.hp,hc);set('rtemp',robot.temp,tc);set('rcarga',robot.carga,'#c79aff');
    if($('#rbatv'))$('#rbatv').textContent=Math.round(robot.bat)+'%';
    if($('#rhpv'))$('#rhpv').textContent=Math.round(robot.hp)+'%';
    if($('#rtempv'))$('#rtempv').textContent=Math.round(robot.temp)+'°';
    if($('#rcargav'))$('#rcargav').textContent=Math.round(robot.carga)+'%';
    const st={idle:T('st_base'),mission:T('st_mission'),broken:T('st_broken'),charging:T('st_maintenance')}[robot.status];
    if($('#rstatus'))$('#rstatus').textContent=st;
    const mission=robot.status==='mission';
    if($('#rsend'))$('#rsend').disabled=robot.status!=='idle'||robot.bat<30||robot.hp<=0||robot.temp>85;
    if($('#rcharge'))$('#rcharge').disabled=mission||robot.bat>=100;
    if($('#rrepair'))$('#rrepair').disabled=mission||robot.hp>=100;
  }
  // (Comandos de jugador del robot — sendRobot/chargeRobot/repairRobot — JUBILADOS. La maquinaria de
  //  misión/scavenge queda inerte en tickRobot: sin disparador, no se ejecuta; el robot vive su rutina.)
  function robotReturn(){
    robot.bat=clamp(robot.bat-35,0,100);robot.temp=clamp(robot.temp+30,0,100);doorTarget=1;
    if(robot.model){robot.model.visible=true;robot.model.position.set(DOORINX,0,DOORZ);robot.model.rotation.y=Math.atan2(2.05-DOORINX,-1.2-DOORZ);}
    const cap=robot.hp>60?1:.6;
    // R-01 carroñea un mix aleatorio ponderado de materias primas (estilo Last Day on Earth)
    const LOOT=[['chatarra',5],['cables',3],['circuitos',3],['plastico',3],['tela',3],['semillas',3],['quimicos',2],['food',3],['water',3],['fuel',2],['med',1]];
    const NM={chatarra:'chatarra',cables:'cables',circuitos:'circuitos',plastico:'plástico',tela:'tela',semillas:'semillas',quimicos:'químicos',food:'comida',water:'agua',fuel:'combustible',med:'medicina'};
    const totW=LOOT.reduce((s,x)=>s+x[1],0),picks=2+Math.floor(Math.random()*3),g={};
    for(let i=0;i<picks;i++){let r=Math.random()*totW,sel=LOOT[0];for(const x of LOOT){r-=x[1];if(r<=0){sel=x;break;}}const k=sel[0];g[k]=(g[k]||0)+Math.max(1,Math.round((1+Math.floor(Math.random()*2))*cap));}
    let tot=0,txt='R-01 VOLVIÓ:';for(const k in g){if(g[k]>0){res[k]=Math.min(99,(res[k]||0)+g[k]);tot+=g[k];txt+=' +'+g[k]+' '+NM[k];}}
    robot.carga=Math.min(100,tot*14);
    if(Math.random()<0.4){const dmg=15+Math.floor(Math.random()*22);robot.hp=clamp(robot.hp-dmg,0,100);txt+=' (dañada -'+dmg+')';}
    renderRes();showAlert(txt);
    setTimeout(()=>{robot.carga=0;renderRobot();},1800);
    if(robot.hp<=0||robot.bat<=0){robot.status='broken';robot.moving=false;if(robot.model)robot.model.position.set(2.05,0,-1.2);setRobotAnim('Death');doorTarget=0;showAlert(T('a_unit_oos'));}
    else{robot.status='returning';robot.moving=true;robot.tx=2.05;robot.tz=-1.2;setRobotAnim('Walking');}
    renderRobot();
  }
  function resetRobot(){robot.bat=80;robot.hp=100;robot.temp=35;robot.carga=0;robot.status='idle';robot.mT=0;robot.moving=false;robot.path=null;robot.wanderT=1.5;robot.atDesk=false;robot.atFab=false;streamReportAction('idle');if(robot.model){robot.model.visible=true;robot.model.position.set(2.05,0,-1.2);setRobotAnim('Idle');}renderRobot();}
  // ---- NAVEGACIÓN R-01: grafo de waypoints (árbol) que cruza por el CENTRO de cada puerta ----
  // Cada arista queda dentro de una sala (contención por AREAS, sin colisión de paredes) y los
  // nodos de puerta están centrados en el hueco. BIBC es el nodo central (biblioteca) que ramifica.
  const NAV=[
    {x:0,    z:-1.0},  //0 HUB   centro del observatorio (cerca de la compuerta)
    {x:0,    z:2.4 },  //1 HUBN  hub, frente a la puerta al pasillo (hueco z=3.2)
    {x:0,    z:4.3 },  //2 COR   pasillo SALA A
    {x:0,    z:6.9 },  //3 BIBC  biblioteca, nodo central (alto para esquivar el escritorio al este)
    {x:0,    z:10.0},  //4 CULC  cultivo
    {x:2.55, z:6.95},  //5 BIBE  biblioteca este, entre escritorio (sur) y biblioteca (norte)
    {x:3.4,  z:6.85},  //6 TALd  puerta al taller (centro del hueco z[6.045,7.355], sesgo norte)
    {x:4.7,  z:7.2 },  //7 TALC  taller
    {x:-3.4, z:6.7 },  //8 DESd  puerta a descanso (centro del hueco)
    {x:-4.7, z:6.8 },  //9 DESC  descanso
    {x:-2.75,z:2.35},  //10 HUBW hub oeste, ALINEADO con el centro del hueco (z=2.35) → cruce perpendicular por el medio
    {x:-3.2, z:2.35},  //11 CARd en el hueco de la puerta (z[1.5,3.2]=1.7m, centro 2.35)
    {x:-5.4, z:1.1 },  //12 CARC sector de carga: frente al dock (el robot se planta acá a cargar)
    {x:-3.95,z:2.35},  //13 CARi lado-sala de la puerta: el GIRO hacia el dock ocurre ACÁ (adentro), no en el umbral
    {x:0,    z:11.8},  //14 HIVd puerta a la colmena (centro del hueco x[-0.85,0.85] en z=11.8)
    {x:0,    z:13.2},  //15 HIVC colmena: frente a la colmena (el robot se planta acá). Cruce recto por x=0: 4→14→15
    {x:-5.8, z:7.55},  //16 DESK estación de cómputo (descanso): el robot se SIENTA acá a administrar (cuelga de DESC)
    {x:-2.9, z:9.5 },  //17 CULw cultivo oeste, ALINEADO con el hueco (z=9.5): el giro hacia FAB ocurre acá (adentro del cultivo)
    {x:-3.4, z:9.5 },  //18 FABd en el hueco de la puerta a fabricación (z[8.65,10.35]=1.7m, centro 9.5)
    {x:-3.9, z:9.5 },  //19 FABi lado-sala de la puerta (cruce recto 17→18→19 colineales en z=9.5)
    {x:-5.4, z:10.3},  //20 FABC sala de fabricación: frente a la impresora (el robot se planta acá a fabricar)
    {x:2.4,  z:14.35}, //21 HIVe colmena este, antes de la puerta a la BÓVEDA (esquiva el centerpiece de la colmena)
    {x:3.4,  z:14.35}, //22 VAUd en el hueco de la puerta a la bóveda (z[13.5,15.2]=1.7m, centro 14.35)
    {x:3.95, z:14.35}, //23 VAUi lado-bóveda de la puerta (cruce recto 21→22→23 colineales en z=14.35)
    {x:5.3,  z:13.7 }, //24 VAUC bóveda: el robot se planta acá a mirar el oro
    {x:1.85, z:-1.3 }  //25 RADIO frente al transmisor del observatorio (cuelga del hub): Beeko se planta acá a EMITIR en la ronda
  ];
  // cruce recto por la puerta: 10→11→13 colineales en z=2.35 (carga); cultivo→colmena 4→14→15 en x=0; cultivo→fab 17→18→19 en z=9.5
  const ADJ=[[1,10,25],[0,2],[1,3],[2,4,5,8],[3,14,17],[3,6],[5,7],[6],[3,9],[8,16],[0,11],[10,13],[13],[11,12],[4,15],[14,21],[9],[4,18],[17,19],[18,20],[19],[15,22],[21,23],[22,24],[23],[0]];
  const DEST=[0,2,3,4,7,9,12,15,16,20,24]; // nodos "centro de sala" donde el robot puede plantarse (24=bóveda)
  function nearestNode(x,z){let bi=0,bd=1e9;for(let i=0;i<NAV.length;i++){const d=Math.hypot(NAV[i].x-x,NAV[i].z-z);if(d<bd){bd=d;bi=i;}}return bi;}
  function navPath(s,t){if(s===t)return[];const prev=new Array(NAV.length).fill(-1),seen=new Array(NAV.length).fill(false),q=[s];seen[s]=true;
    for(let h=0;h<q.length;h++){const u=q[h];if(u===t)break;for(const v of ADJ[u])if(!seen[v]){seen[v]=true;prev[v]=u;q.push(v);}}
    const path=[];let c=t;while(c!==-1&&c!==s){path.unshift(c);c=prev[c];}return path;}
  function setWP(){const n=NAV[robot.path[robot.pi]];robot.tx=n.x;robot.tz=n.z;}
  function robotWander(){
    if(!robot.model)return;
    const s=nearestNode(robot.model.position.x,robot.model.position.z);
    let t=DEST[Math.floor(Math.random()*DEST.length)],tr=0;while(t===s&&tr<8){t=DEST[Math.floor(Math.random()*DEST.length)];tr++;}
    const p=navPath(s,t);
    if(!p.length){robot.wanderT=1;return;}
    robot.path=p;robot.pi=0;robot.dest=t;setWP();robot.moving=true;
  }
  // ====== RUTINA F2 — DÍA COMPLETO DEL ROBOT ====== (driver por defecto las 24h según streamHourUTC; reemplaza a robotWander)
  // CARGA 00–06 + 21–24 (durmiendo en el dock) · COLMENA 06–10 · ADMIN 10–13 · FABRICACIÓN 13–17 · RONDA 17–20 · OCIO 20–21.
  // OCIO = el "ratito" de Beeko: va al observatorio, prende el TV y mira ESTÁTICA (lo único que hay). Tono melancólico.
  // _forceSeg (testeo): undefined=auto(hora) · null=off(deambula) · 'carga'/'colmena'/'admin'/'fabricacion'/'ronda'/'ocio'=forzar el tramo.
  function routineSegment(){
    // FASE 2 — AGENDA desde el server: si OP.serverAgenda está ON (y no degradado), el tramo lo dicta el backend
    // (incluye el override del operador). STREAM.segment: string = tramo · null = deambular. Si todavía no llegó
    // (undefined), o el flag está OFF/degradado, se usa el cálculo LOCAL de siempre.
    if(window.__SYNC && __SYNC.agendaActive() && STREAM.segment!==undefined) return STREAM.segment;
    if(_forceSeg!==undefined) return _forceSeg; const h=streamHourUTC();
    if(h<6)return'carga'; if(h<10)return'colmena'; if(h<13)return'admin'; if(h<17)return'fabricacion'; if(h<20)return'ronda'; if(h<21)return'ocio'; return'carga'; }
  function _faceXZ(fx,fz){ if(robot.model) robot.model.rotation.y=Math.atan2(fx-robot.model.position.x, fz-robot.model.position.z); }
  function weightedPick(sts){ let tot=0;for(const s of sts)tot+=(s.w||1); let r=Math.random()*tot;
    for(const s of sts){ r-=(s.w||1); if(r<=0)return s; } return sts[sts.length-1]; }
  function pickStation(cfg){ // micro-hop a una station (peso + evita repetir la última)
    const prev=robot.rt.station; let st=weightedPick(cfg.stations),tr=0;
    while(st===prev&&cfg.stations.length>1&&tr<5){st=weightedPick(cfg.stations);tr++;}
    robot.rt.station=st;robot.rt.phase='choreo';robot.tx=st.p[0];robot.tz=st.p[1];robot.path=null;robot.dest=-1;robot.moving=true;setRobotAnim('Walking');
  }
  function travelTo(node){ // camina hasta un nodo NAV (entre zonas o dentro). Si ya está, llega al toque.
    const s=nearestNode(robot.model.position.x,robot.model.position.z),p=navPath(s,node);
    robot.rt.phase='travel';robot.dest=node;
    if(p.length){robot.path=p;robot.pi=0;setWP();robot.moving=true;setRobotAnim('Walking');}
    else routineArrive(); // ya parado en el nodo
  }
  function routineTick(dt){ // driver del tramo cuando el robot está quieto (status idle, no moviéndose)
    const seg=routineSegment(),cfg=SEG_CFG[seg];
    if(seg!=='ocio')streamDrive('tv',false);          // fuera del tramo de ocio: TV apagado (respeta override del operador)
    if(seg==='ronda'){rondaTick(dt);return;}
    if(!cfg){robot.wanderT=0.5;return;}
    if(!robot.rt||robot.rt.seg!==seg){ if(robot.atDesk)robot.atDesk=false; if(robot.atFab)robot.atFab=false; if(robot.atRadio)robot.atRadio=false; // cambio de tramo: limpia poses fijas
      robot.rt={seg:seg,phase:'',station:null,dwellT:0,stopIdx:-1}; }
    if(robotZone!==cfg.zone){travelTo(cfg.node);return;} // todavía no llegó a la zona del tramo
    // OCIO: el TV NO se prende acá (todavía está cruzando la sala hacia el TV). Se prende al LLEGAR a la station (routineArrive·choreo).
    if(!cfg.stations){ // ADMIN: se planta en el escritorio (sin stations; mantiene la pose de tecleo)
      if(!robot.atDesk){travelTo(cfg.node);return;}
      if(robot.rt.dwellT>0){robot.rt.dwellT-=dt;return;}
      robot.rt.dwellT=4+Math.random()*5; return; // micro-pausa; la pose se reaplica encima cada frame
    }
    if(robot.rt.dwellT>0){robot.rt.dwellT-=dt;return;} // pausa/gesto en la station
    pickStation(cfg); // a la próxima station (carga/colmena/fabricación)
  }
  function routineArrive(){ // llegó (último waypoint): resuelve según tramo y fase
    const rt=robot.rt; if(!rt)return; const cfg=SEG_CFG[rt.seg];
    if(rt.seg==='ronda'){rondaArrive();return;}
    if(rt.phase==='choreo'){ // llegó a una station → se orienta al feature, gesto y pausa
      const st=rt.station; if(st){_faceXZ(st.look[0],st.look[1]);setRobotAnim(st.g[Math.floor(Math.random()*st.g.length)]);}
      if(routineSegment()==='ocio')streamDrive('tv',true); // OCIO: recién AHORA (plantado frente al TV) lo prende; mientras caminaba quedó apagado
      const dw=(st&&st.dwell)||[3,8]; rt.dwellT=dw[0]+Math.random()*(dw[1]-dw[0]); rt.phase=''; streamReportAction(cfg.action); return;
    }
    // phase==='travel' → llegó al nodo de la zona
    if(cfg&&!cfg.stations){ robot.atDesk=true;robot.model.rotation.y=0;setRobotAnim('Idle');streamReportAction(cfg.action);rt.dwellT=4+Math.random()*5;rt.phase=''; } // ADMIN: pose de tecleo
    else{ rt.phase='';setRobotAnim('Idle'); } // station-seg: el próximo tick elige la primera station
  }
  function rondaTick(dt){ // RONDA: patrulla los stops en orden (el tramo más MÓVIL)
    if(!robot.rt||robot.rt.seg!=='ronda'){ if(robot.atDesk)robot.atDesk=false; if(robot.atFab)robot.atFab=false; if(robot.atRadio)robot.atRadio=false; robot.rt={seg:'ronda',phase:'',station:null,dwellT:0,stopIdx:-1}; }
    if(robot.rt.dwellT>0){robot.rt.dwellT-=dt;return;}
    if(robot.atRadio)robot.atRadio=false; // sale de la radio → deja la pose; el mixer retoma la animación al caminar
    const ni=(robot.rt.stopIdx+1)%RONDA_STOPS.length; robot.rt.stopIdx=ni; const stop=RONDA_STOPS[ni];
    const s=nearestNode(robot.model.position.x,robot.model.position.z),p=navPath(s,stop.node);
    robot.rt.phase='ronda';robot.dest=stop.node; streamReportAction('patrol');
    if(p.length){robot.path=p;robot.pi=0;setWP();robot.moving=true;setRobotAnim('Walking');}
    else rondaArrive(); // ya está en el nodo
  }
  function rondaArrive(){ // chequea el feature: casi siempre OK (Yes/ThumbsUp), a veces No (algo raro → micro-tensión)
    const stop=RONDA_STOPS[robot.rt.stopIdx]; if(stop)_faceXZ(stop.look[0],stop.look[1]);
    if(stop&&stop.radio){ setRobotAnim('Idle'); robot.atRadio=true; broadcast(); robot.rt.dwellT=_txDur+1.2; robot.rt.phase=''; streamReportAction('patrol'); return; } // RADIO: se planta, emite y adopta la pose; el dwell = duración de la transmisión (+ buffer) → no se va a mitad de emitir
    const ok=Math.random()<0.82; setRobotAnim(ok?(Math.random()<0.5?'Yes':'ThumbsUp'):'No');
    robot.rt.dwellT=3+Math.random()*4; robot.rt.phase=''; streamReportAction('patrol');
  }
  function _releaseSurge(){ // SOLO el surge visible del enjambre (sin tocar contadores). Devuelve false si ya hay un surge en curso (cooldown natural ≈ BEE_RELEASE_DUR).
    if(beeReleaseT>0) return false;
    beeReleaseT=BEE_RELEASE_DUR; _beesResetPending=true; return true;
  }
  function triggerRelease(){ // LIVESTREAM: surge + contador del backend + Wave (sin cambios respecto a antes)
    if(!_releaseSurge()) return;
    streamDrive('beesReleased', Math.round(STREAM.beesReleased)+1); // sube el acumulado del backend (respeta override)
    if(robot.model&&robot.status==='idle'){setRobotAnim('Wave'); if(robot.rt)robot.rt.dwellT=Math.max(robot.rt.dwellT||0,2.6);} // se despide
  }
  // ====== EVENTOS ALEATORIOS (temblor / fallo eléctrico) — controlador único ======
  // Ocasionales, en TIEMPO REAL (se ven en el stream a cualquier speed). UN solo evento a la vez. Arco inicio→pico→fin.
  // BLINDAJE DE NORMALIDAD: las luces se modulan SIEMPRE desde su valor base (función pura de redK/dimK) y endEvent() restaura
  // explícito → imposible que queden rojas o apagadas para siempre. (shake/blackout/evT vienen declarados arriba, eran del survival jubilado.)
  const EV_GAP_MIN=180, EV_GAP_MAX=360;        // <<< FRECUENCIA: segundos entre eventos (AJUSTAR ACÁ). Default 3–6 min (ocasional/contemplativo).
  const EV_QUAKE_DUR=13.0, EV_BLACKOUT_DUR=14.0; // duración de cada evento (s) — AJUSTAR ACÁ
  const EV_ARC_UP=0.28, EV_ARC_HOLD=0.18;        // forma del arco: sube 28% · sostiene 18% (pico breve) · baja el resto 54% (cola larga). Proporcional a la duración.
  const EV_SHAKE_MAX=1.0;                       // intensidad del shake de cámara en el pico
  const EV_QUAKE_RED=0.7;                       // cuánto se tiñen de rojo las luces en el pico (0..1)
  const EV_BLACKOUT_CUT=0.95;                   // cuánto bajan las luces principales en el corte (0..1)
  const EV_REACT_HOLD=[0.5,1.6,2.6];            // pausa de Beeko según el modo: leve / mira / melancólico
  // alertas de evento (livestream) bilingües → se elige el idioma actual al mostrarlas (getLang)
  const QUAKE_ALERTS={en:['⚠ SEISMIC ACTIVITY DETECTED','⚠ STRUCTURAL STRESS — SECTOR INTEGRITY NOMINAL','⚠ TREMOR DETECTED — SYSTEMS HOLDING'],
                      es:['⚠ ACTIVIDAD SÍSMICA DETECTADA','⚠ ESFUERZO ESTRUCTURAL — INTEGRIDAD DEL SECTOR NOMINAL','⚠ TEMBLOR DETECTADO — SISTEMAS RESISTIENDO']};
  const BLACKOUT_ALERTS={en:['⚠ POWER FAILURE — EMERGENCY LIGHTING ENGAGED','⚠ MAIN POWER LOST — BACKUP ACTIVE','⚠ GRID FAULT — RESTORING'],
                         es:['⚠ FALLA ELÉCTRICA — LUCES DE EMERGENCIA ACTIVADAS','⚠ ENERGÍA PRINCIPAL PERDIDA — RESPALDO ACTIVO','⚠ FALLO DE RED — RESTAURANDO']};
  function _evAlerts(o){ return (typeof getLang==='function'&&o[getLang()])||o.en; }
  let evType='', evClock=0, evEnabled=true, evHoldT=0, _evRumbleT=0;  // evHoldT lo lee tickRobot (congela a Beeko durante su reacción)
  evT=EV_GAP_MIN+Math.random()*(EV_GAP_MAX-EV_GAP_MIN);              // primer evento tras un gap completo
  // luces de EMERGENCIA (ámbar/rojas, apagadas) que rampan durante el fallo eléctrico (hub / norte / oeste)
  const emergLights=[new THREE.PointLight(0xff5526,0,9,2),new THREE.PointLight(0xff5526,0,9,2),new THREE.PointLight(0xff6a33,0,8,2)];
  emergLights[0].position.set(0,2.3,1.0);emergLights[1].position.set(0,2.3,10.2);emergLights[2].position.set(-5.0,2.3,8.0);emergLights.forEach(l=>scene.add(l));
  // REGISTRO de luces de sala (PointLight/SpotLight) con su base (intensidad+color). Excluye baliza del blast, emergencia, generador, baliza giratoria.
  const _evSkip=new Set([sealLight,emer,coreLight,gyroLight].concat(emergLights));
  const EV_LIGHTS=[]; scene.traverse(o=>{if((o.isPointLight||o.isSpotLight)&&!_evSkip.has(o))EV_LIGHTS.push({l:o,i:o.intensity,c:o.color.clone()});});
  const _evRed=new THREE.Color(0xff2a20);
  function evApplyLights(redK,dimK){for(const e of EV_LIGHTS){e.l.color.copy(e.c).lerp(_evRed,redK);if(dimK>0)e.l.intensity=e.i*(1-dimK);}} // modulación PURA desde base
  function evRestoreLights(){for(const e of EV_LIGHTS){e.l.color.copy(e.c);e.l.intensity=e.i;}}                                          // restauración explícita exacta
  function evEnvelope(p){return p<EV_ARC_UP?p/EV_ARC_UP:p<EV_ARC_UP+EV_ARC_HOLD?1:Math.max(0,(1-p)/(1-EV_ARC_UP-EV_ARC_HOLD));} // sube → pico breve → baja largo (mantiene la forma al estirar la duración)                                                              // arco: sube (0–.3) · pico (.3–.7) · baja (.7–1)
  function reactBeeko(cat){
    if(gameMode){ showBeekoThought(cat); return; } // MODO JUEGO: el evento CORRE (shake/luces/alarma) pero NO congela a Beeko ni le impone anim (lo maneja el jugador); el pensamiento sí aparece
    const mode=Math.floor(Math.random()*3);evHoldT=EV_REACT_HOLD[mode]; // 0 leve (mantiene) / 1 mira ('No') / 2 melancólico ('Idle' quieto)
    if(robot.model){if(mode===1)setRobotAnim('No');else if(mode===2)setRobotAnim('Idle');} showBeekoThought(cat);}
  // ARCO VISUAL del evento (shake / luces rojas / alarma / emergencia ámbar). Se SEPARA del scheduler para poder
  // dispararlo desde el server (Fase 2 — Parte A): el arco no cambia, solo cambia QUIÉN decide cuándo empieza/termina.
  function startEventVisual(type){evType=type;evClock=0;_evRumbleT=0; // estado visual + kickoff. NO toca STREAM.event (la ownership es del caller: el scheduler local o el server)
    if(type==='quake'){const A=_evAlerts(QUAKE_ALERTS);showAlert(A[Math.floor(Math.random()*A.length)]);alarm();}
    else{const A=_evAlerts(BLACKOUT_ALERTS);showAlert(A[Math.floor(Math.random()*A.length)]);eclick();genDuck(0.04,0.35);} // generador tose y se apaga
    reactBeeko(type);}
  function endEventVisual(){evType='';evClock=0;shake=0;evRestoreLights();emergLights.forEach(l=>l.intensity=0);genDuck(undefined,0.5);} // CANDADO: todo a base. NO toca STREAM.event ni evT
  function eventArc(dt,t,mv){ // UN frame del arco (avanza evClock + aplica el efecto según el envelope)
    evClock+=dt;const DUR=evType==='quake'?EV_QUAKE_DUR:EV_BLACKOUT_DUR,p=Math.min(1,evClock/DUR),env=evEnvelope(p);
    if(evType==='quake'){ shake=EV_SHAKE_MAX*env*(mv?1:0.3); evApplyLights(env*EV_QUAKE_RED,0); // shake (respeta reduced-motion) + luces a rojo
      _evRumbleT-=dt; if(env>0.35&&_evRumbleT<=0){rumble();_evRumbleT=0.6+Math.random()*0.3;} }                                        // retumbo intermitente en el pico
    else{ let cut; if(p<0.12)cut=(Math.random()<0.5?1:0.2)*EV_BLACKOUT_CUT; else if(p>0.86)cut=(Math.random()<0.5?1:0.35)*EV_BLACKOUT_CUT; else cut=EV_BLACKOUT_CUT; // flicker caída → corte → flicker reencendido
      evApplyLights(0,mv?cut:cut*0.9);
      const em=Math.min(1,env*1.4); emergLights.forEach((l,i)=>l.intensity=(1.15+(mv?Math.sin(t*7+i)*0.18:0))*em); emer.intensity=(1.7+(mv?Math.sin(t*9)*0.3:0))*em; } } // emergencia ámbar/roja
  // LOCAL: el scheduler local es DUEÑO de STREAM.event (lo setea/limpia) y reprograma el próximo (evT).
  function startEvent(type){if(evType!=='')return false;streamDrive('event',type);startEventVisual(type);return true;} // un solo evento a la vez
  function endEvent(){streamDrive('event','');endEventVisual();evT=EV_GAP_MIN+Math.random()*(EV_GAP_MAX-EV_GAP_MIN);}
  function eventTick(dt,t,mv){
    if(window.__SYNC && __SYNC.eventsActive()){ // SERVER manda: sin dado local; el arco SIGUE a STREAM.event (lo setea el sync desde /state)
      if(STREAM.event && evType===''){ startEventVisual(STREAM.event); if(typeof STREAM.eventElapsed==='number') evClock=STREAM.eventElapsed/1000; } // arranca (seedea elapsed si te sumás a mitad)
      else if(!STREAM.event && evType!==''){ endEventVisual(); }                                                                                   // el server limpió el evento → cierra el arco
      if(evType!=='') eventArc(dt,t,mv);
      return;
    }
    if(evType===''){ if(evEnabled&&!STREAM._force.event){evT-=dt;if(evT<=0)startEvent(Math.random()<0.5?'quake':'blackout');} return; } // LOCAL: scheduler (no corre con evento activo → no se solapan)
    eventArc(dt,t,mv); if(evClock>=(evType==='quake'?EV_QUAKE_DUR:EV_BLACKOUT_DUR))endEvent();
  }
  // Hooks de operador/testeo (extienden el __REFUGIO del backbone).
  // forceSegment('carga'|'colmena'|'admin'|'fabricacion'|'ronda'|'ocio') fuerza el tramo · forceSegment(null) lo apaga (deambula) · forceSegment() vuelve a auto(hora). releaseSwarm() libera a mano.
  if(window.__REFUGIO){
    window.__REFUGIO.forceSegment=function(s){ const auto=(arguments.length===0);
      if(window.__SYNC && __SYNC.agendaActive()) return __SYNC.postSegment(auto?'__auto__':s); // modo server: forzar/liberar el tramo en el backend (lo ven todos)
      _forceSeg=auto?undefined:s; return _forceSeg; };                                          // local: como siempre
    window.__REFUGIO.releaseSwarm=function(){triggerRelease();return STREAM.beesReleased;};
    window.__REFUGIO.quake=function(){ if(window.__SYNC && __SYNC.eventsActive()) return __SYNC.postEvent('quake'); return startEvent('quake'); };       // temblor YA (server en modo server → lo ven todos; local con fallback)
    window.__REFUGIO.blackout=function(){ if(window.__SYNC && __SYNC.eventsActive()) return __SYNC.postEvent('blackout'); return startEvent('blackout'); }; // fallo eléctrico YA
    window.__REFUGIO.events=function(on){ if(window.__SYNC && __SYNC.eventsActive()) return __SYNC.postEvents(on===undefined?undefined:!!on); evEnabled=(on===undefined)?!evEnabled:!!on; return evEnabled; }; // on/off del dado automático (server en modo server, local si no)
    // FASE 4 — debug del despertar: etapa actual, prob. del awakening y cuántas/ cuáles frases están elegibles en esta etapa
    window.__REFUGIO.awakening=function(){ const srv=_awakeningServer(),st=_awakeningStage(),elig=_awakeningEligible();
      return { fuente: srv?'server':'local', stage: srv?st:'(1/6 fijo)', progress: srv?STREAM.awakeningProgress:undefined, chance: _awakeningChance(), frasesElegibles: elig.length, frases: elig }; };
    // equivalentes de consola de los botones del panel oculto (STYLE / RESTART):
    window.__REFUGIO.style=function(on){celOn=(on===undefined)?!celOn:!!on;applyCel();return celOn?'CEL':'REAL';}; // cel-shading: style(true)=CEL · style(false)=REAL · style()=alterna
    // FILTRO PSX (efecto visual puro): prende/apaga las DOS capas juntas (dither + pixelación + wobble). Reversible en runtime sin recargar; OFF = búnker idéntico.
    window.__REFUGIO.psx=function(on){ if(on===undefined) return {on:_psxOn, pixel:PSX_PIX, levels:(typeof psxPass!=='undefined'&&psxPass)?psxPass.uniforms.uLevels.value:null, dither:(typeof psxPass!=='undefined'&&psxPass)?psxPass.uniforms.uDither.value:null, wobble:_psxWobble, grid:_psxGrid};
      _psxSet(on); return 'PSX '+(_psxOn?('ON · dither(levels '+((typeof psxPass!=='undefined'&&psxPass)?psxPass.uniforms.uLevels.value:'?')+') + pixelación x'+PSX_PIX+' + wobble '+_psxWobble):'OFF (búnker normal, sin residuos)'); };
    // sub-ajustes de calibración (opcionales): pixelación, niveles de color, dither on/off, intensidad del wobble
    window.__REFUGIO.psxPixel=function(n){ PSX_PIX=Math.max(1,Math.round(+n||1)); if(_psxOn)_psxApplySize(); return 'pixelación x'+PSX_PIX+(_psxOn?'':' (se aplica al prender OP.psx(true))'); };
    window.__REFUGIO.psxLevels=function(n){ if(typeof psxPass!=='undefined'&&psxPass)psxPass.uniforms.uLevels.value=Math.max(2,+n||32); return 'niveles de color por canal: '+((typeof psxPass!=='undefined'&&psxPass)?psxPass.uniforms.uLevels.value:'(sin pass)'); };
    window.__REFUGIO.psxDither=function(v){ if(typeof psxPass!=='undefined'&&psxPass)psxPass.uniforms.uDither.value=(v?1:0); return 'dither '+((typeof psxPass!=='undefined'&&psxPass&&psxPass.uniforms.uDither.value)?'ON':'OFF'); };
    window.__REFUGIO.psxWobble=function(v){ _psxWobble=Math.max(0,Math.min(1,(v==null?0.85:+v))); if(_psx)_psx.setWobble(_psxWobble); return 'wobble de vértices: '+_psxWobble+(_psxOn?'':' (se ve al prender OP.psx(true))'); };
    // MODOS: livestream ↔ juego + menú. gameMode(true)=juego · gameMode(false)/gameMode()=livestream · menu()=abre el menú de inicio.
    window.__REFUGIO.gameMode=function(on){ const want=(on===undefined)?false:!!on; if(want)enterGame(); else enterLivestream(); return 'modo: '+(gameMode?'JUEGO (lo manejás vos)':'LIVESTREAM (Beeko autónomo)'); };
    window.__REFUGIO.menu=function(){ showMenu(); return 'menú de inicio abierto (elegí OBSERVAR o TOMAR CONTROL)'; };
    // CALIBRACIÓN del feel del modo juego (velocidad + cámara 3ª persona). Sin args devuelven el valor actual.
    window.__REFUGIO.gameSpeed=function(n){ if(n!==undefined)PLAYER_SPEED=Math.max(0.2,+n||1.9); return 'velocidad de Beeko: '+PLAYER_SPEED+' u/s'; };
    window.__REFUGIO.gameRadius=function(n){ if(n!==undefined)PLAYER_RADIUS=Math.max(0.05,+n||0.30); return {radioCuerpo:PLAYER_RADIUS, paredes:_WALLS.length, nota:'distancia a la que Beeko frena ante paredes/objetos'}; }; // OP.gameRadius(m)
    window.__REFUGIO.gameTurn=function(n){ if(n!==undefined)FP_TURN=Math.max(0.3,+n||2.3); return 'velocidad de giro (1ª persona, A/D y ←/→): '+FP_TURN+' rad/s'; };
    window.__REFUGIO.gamePitch=function(spd){ if(spd!==undefined)FP_PITCH_SPD=Math.max(0.2,+spd||1.5); return {velocidadPitch:FP_PITCH_SPD, topeArribaAbajo:FP_PITCH_MAX, nota:'↑/↓ inclinan la vista; spd=rad/s; el tope es fijo (FP_PITCH_MAX)'}; }; // OP.gamePitch(velocidad)
    window.__REFUGIO.gameFP=function(fwd,up,pitch){ if(fwd!==undefined)FP_EYE_FWD=+fwd; if(up!==undefined)FP_EYE_UP=+up; if(pitch!==undefined)FP_PITCH=+pitch;
      return {camOffset:FP_EYE_FWD, ojosArriba:FP_EYE_UP, pitchBase:FP_PITCH, nota:'fwd=posición de la cámara sobre el eje de mirada (NEGATIVO=atrás de la cabeza→más brazos; ~0=pegada a los ojos→casi sin brazos) · up=ajuste vertical · pitch=inclinación BASE'}; }; // OP.gameFP(fwd, up, pitchBase)
    window.__REFUGIO.gameAccel=function(accel,decel){ if(accel!==undefined)PLAYER_ACCEL=Math.max(1,+accel||10); if(decel!==undefined)PLAYER_DECEL=Math.max(1,+decel||8); return {aceleracion:PLAYER_ACCEL, desaceleracion:PLAYER_DECEL, nota:'más bajo = más inercia/glide'}; }; // OP.gameAccel(acel, desac)
    window.__REFUGIO.gameCam=function(dist,height,lag){ if(dist!==undefined)CAM_DIST=Math.max(0.5,+dist||CAM_DIST); if(height!==undefined)CAM_HEIGHT=Math.max(0.3,+height||CAM_HEIGHT); if(lag!==undefined){CAM_POS_LERP=Math.max(0.5,+lag||CAM_POS_LERP);CAM_YAW_LERP=Math.max(0.5,+lag*0.7||CAM_YAW_LERP);} return {dist:CAM_DIST,height:CAM_HEIGHT,lookY:CAM_LOOKY,posLerp:+CAM_POS_LERP.toFixed(2),yawLerp:+CAM_YAW_LERP.toFixed(2)}; }; // OP.gameCam(distancia, altura, lag) — lag chico = sigue más pegada
    // ENERGÍA (hito 3): setear a mano (probar el colapso) + calibrar el drenaje.
    window.__REFUGIO.gameEnergy=function(n){ if(n!==undefined){ gameEnergy=Math.max(0,Math.min(100,+n||0)); _energyHud(); } return 'energía: '+Math.round(gameEnergy)+'%'+(_gmCollapse>0?' (colapsado, revive en '+_gmCollapse.toFixed(1)+'s)':''); }; // OP.gameEnergy(0) → colapso · OP.gameEnergy(100) → llena
    window.__REFUGIO.gameDrain=function(idle,move){ if(idle!==undefined)ENERGY_DRAIN=Math.max(0,+idle||0); if(move!==undefined)ENERGY_MOVE=Math.max(0,+move||0); return {drenajeReposo:ENERGY_DRAIN+' %/s', extraMovimiento:ENERGY_MOVE+' %/s', durLlenaReposo:Math.round(100/(ENERGY_DRAIN||0.0001))+'s', durLlenaCaminando:Math.round(100/((ENERGY_DRAIN+ENERGY_MOVE)||0.0001))+'s'}; }; // OP.gameDrain(reposo, extraMov)
    window.__REFUGIO.gameCharge=function(n){ if(n!==undefined)CHARGE_RATE=Math.max(1,+n||32); return 'recarga en el dock: '+CHARGE_RATE+' %/s (de 0 a 100 en ~'+(100/CHARGE_RATE).toFixed(1)+'s manteniendo E)'; }; // OP.gameCharge(n)
    window.__REFUGIO.gameBees=function(){ return 'abejas liberadas en esta sesión (LOCAL, no toca el beesReleased del backend): '+gameBeesReleased; }; // lee el contador local del juego
    window.__REFUGIO.gameRelease=function(){ if(_releaseSurge()){ gameBeesReleased++; _beesHud(); return 'abeja liberada (surge) — sesión: '+gameBeesReleased; } return 'ya hay un surge en curso (esperá a que termine)'; }; // fuerza una liberación para testear (ignora la proximidad)
    window.__REFUGIO.gameTake=function(){ if(_mItemTaken)return 'el ítem ya está en el inventario (click en el slot para releer el lore)'; _takeItem(); return 'ítem tomado: '+ITEM_NAME+' — lore abierto'; }; // fuerza tomar el ítem de la bóveda para testear (ignora la proximidad)
    window.__REFUGIO.restart=function(){rst();return true;}; // reinicia el robot a su base + resync del reloj del stream
    window.__REFUGIO.broadcast=function(){return broadcast();}; // RADIO: dispara una transmisión YA (esté donde esté Beeko) para testear el cuadro
    // SEÑAL ENTRANTE (2ª señal del despertar): sub-flag propio + disparo manual para testear cada etapa. La frecuencia/carácter automáticos
    // se atan a la etapa del despertar del server (igual que los pensamientos); este sub-flag la apaga SIN tocar los pensamientos.
    window.__REFUGIO.radioReceiving=function(on){ _rxEnabled=(on===undefined)?!_rxEnabled:!!on; if(!_rxEnabled&&_rxActive)_rxEnd(); _rxNextT=RADIO_IN_GAP;
      return 'señal entrante '+(_rxEnabled?'ON (atada a la etapa del despertar del server; OP.serverAwakening debe estar ON para que dispare sola)':'OFF'); };
    window.__REFUGIO.receive=function(stage){ const s=Math.max(0,Math.min(3,(stage===undefined?_awakeningStage():(stage|0)))); // fuerza UNA recepción de la etapa pedida (ignora el dado y el server)
      if(STREAM.broadcasting||_txActive)return 'la radio está TRANSMITIENDO — la recepción no pisa una transmisión (probá de nuevo en unos segundos)';
      radioInStart(s); return 'recepción FORZADA · etapa '+s+' · dur '+(RADIO_IN_DUR[s]||RADIO_IN_DUR[1])+'s'; };
    window.__REFUGIO.radioIn=function(stage){ return window.__REFUGIO.receive(stage); }; // alias de OP.receive
    // 3ª SEÑAL — MIRAR ARRIBA: sub-flag propio + disparo manual. La frecuencia automática se ata a la etapa del despertar del server (igual que
    // las otras dos señales); el sub-flag la apaga SIN tocar los pensamientos ni la radio. OP.lookUp() lo fuerza (ignora el corte por caminar).
    window.__REFUGIO.lookUpSignal=function(on){ _luEnabled=(on===undefined)?!_luEnabled:!!on;
      if(!_luEnabled&&_luPhase&&_luPhase!=='out'){_luPhase='out';_luFast=true;_luT=LU_OUT_FAST*(1-_luAmt);} _luNextT=LOOKUP_GAP; // off → cancela suave un gesto en curso
      return 'mirar arriba '+(_luEnabled?'ON (atado a la etapa del despertar del server; OP.serverAwakening debe estar ON para que dispare solo)':'OFF'); };
    window.__REFUGIO.lookUp=function(){ if(!robot.headBones||!robot.headBones.head)return 'el modelo del robot todavía no cargó';
      const ok=startLookUp(true); return ok?('mirar arriba FORZADO · ease-in('+LU_IN+'s)→hold('+LU_HOLD+'s)→ease-out('+LU_OUT+'s) + pensamiento del gesto'):'ya hay un gesto en curso'; };
    // 4ª SEÑAL — SONIDOS SIN FUENTE: sub-flag propio + disparo manual de cada tipo. La frecuencia automática se ata a la etapa del despertar
    // del server (igual que las otras tres); el sub-flag los apaga sin tocar pensamientos/radio/gesto. OP.sfx("thud"|"creak"|"drag"|"scratch"[,etapa]).
    window.__REFUGIO.ambientSignals=function(on){ _ambEnabled=(on===undefined)?!_ambEnabled:!!on; _ambNextT=AMBIENT_GAP;
      return 'sonidos sin fuente '+(_ambEnabled?'ON (atado a la etapa del despertar del server; OP.serverAwakening debe estar ON para que disparen solos)':'OFF'); };
    window.__REFUGIO.sfx=function(type,stage){ const T=['creak','thud','drag','scratch'];
      if(T.indexOf(type)<0) return 'tipos: '+T.join(', ')+' · uso: OP.sfx("thud"[,etapa 1-3]). Distantes/amortiguados (vienen de arriba, a través del concreto).';
      if(!audioOn) return 'activá el sonido primero (botón ♪ SONIDO), si no no se oye nada';
      if(typeof ambientSound!=='function') return 'audio no disponible';
      const st=(stage===undefined)?3:(stage|0); ambientSound(type, st); beekoReactToSound(st); // el manual también dispara la reacción de Beeko (para probarla sin esperar), con la intensidad de esa etapa
      return 'sonido sin fuente: '+type+' (distante/amortiguado · etapa '+st+' · Beeko reacciona según REACT_* de esa etapa)'; };
    window.__REFUGIO.ambient=function(type,stage){ return window.__REFUGIO.sfx(type,stage); }; // alias de OP.sfx
    // MOMENTOS EXPRESIVOS (personalidad, independiente del despertar): sub-flag + disparo manual de cualquier clip para probarlo.
    window.__REFUGIO.expressive=function(on){ _exprEnabled=(on===undefined)?!_exprEnabled:!!on; if(!_exprEnabled&&_exprActive)_exprEnd(); _exprNextT=EXPR_GAP[0]; _exprRun=false;
      return 'momentos expresivos '+(_exprEnabled?'ON (personalidad; independiente del despertar; sólo en ocio/dwell)':'OFF'); };
    window.__REFUGIO.anim=function(name){ if(!robot.act||!robot.act[name]) return 'animaciones: '+(robot.act?Object.keys(robot.act).join(', '):'(el modelo todavía no cargó)')+' · uso: OP.anim("Dance")';
      const once=(name==='Death'||name==='Sitting'); const dur=(robot.act[name].getClip&&robot.act[name].getClip().duration)||1.5;
      _exprPlay({a:name, hold:dur+(once?1.4:0.3), once:once}); // lo trata como momento expresivo → se recompone solo a Idle. Mejor con Beeko quieto.
      return 'animación "'+name+'" forzada'+(once?' (once+clamp → se recompone a Idle)':'')+(robot.moving?' · OJO: Beeko se está moviendo (probala quieto para verla entera)':''); };
    // ---- CALIBRACIÓN EN VIVO de poses del brazo. DOS poses independientes: 'admin' (teclado, YA fija) y 'radio' (brazo derecho al transmisor).
    // OP.poseTarget('radio'|'admin') elige cuál edita OP.arm/armDump/armReset. OP.holdRadio(true) lleva a Beeko a la radio y lo FIJA en pose
    // (y pone el target en 'radio') para calibrar cómodo. OP.arm('UpperArmR','x',0.5) rota ese hueso 0.5 rad sobre su eje LOCAL (estable). ----
    function _poseObj(){return poseTarget==='radio'?RADIO_POSE:(poseTarget==='viewmodel'?VIEWMODEL_POSE:ADMIN_POSE);}
    function _poseReapply(){ if(poseTarget==='radio'){ if(robot.atRadio)applyRadioPose(); } else if(poseTarget==='viewmodel'){ if(gameMode)applyViewmodelPose(); } else { if(robot.atDesk)applyAdminPose(clk.elapsedTime); } }
    function _poseApplying(){ return poseTarget==='radio'?!!robot.atRadio:(poseTarget==='viewmodel'?!!gameMode:!!robot.atDesk); } // ¿la pose editada se está viendo ahora?
    window.__REFUGIO.poseTarget=function(which){ if(which==='radio'||which==='admin'||which==='viewmodel'){poseTarget=which;} return 'editando pose: '+poseTarget+(which==='viewmodel'?' (1ª persona — entrá al modo juego para verla: OP.gameMode(true))':''); };
    window.__REFUGIO.arm=function(bone,axis,val){
      const P=_poseObj();
      if(bone===undefined) return 'uso: OP.arm("UpperArmR"|"LowerArmR"|"UpperArmL"|"LowerArmL"|"ShoulderR"|"ShoulderL", "x"|"y"|"z", radianes) · editando: '+poseTarget;
      if(!(bone in P)) return 'hueso inválido. opciones: '+Object.keys(P).join(', ');
      if(axis!=='x'&&axis!=='y'&&axis!=='z') return 'eje inválido: usá "x", "y" o "z"';
      P[bone][axis]=+val||0;
      _poseReapply(); // re-aplica la pose editada YA → visible al instante en Render
      return {pose:poseTarget, bone:bone, delta:Object.assign({},P[bone]), aplicando:_poseApplying()}; // aplicando=false → Beeko todavía no está en esa pose (llevalo: admin→forceSegment('admin'), radio→holdRadio(true))
    };
    window.__REFUGIO.armDump=function(){const P=_poseObj(),o={};for(const k in P)o[k]=Object.assign({},P[k]);return {pose:poseTarget, values:o};}; // copiá 'values' como la pose definitiva
    window.__REFUGIO.armReset=function(){const P=_poseObj();for(const k in P){P[k].x=0;P[k].y=0;P[k].z=0;}_poseReapply();return 'pose "'+poseTarget+'" reseteada a reposo (todos los deltas en 0)';};
    // FIJAR a Beeko en la radio en pose (para calibrar sin que se vaya): lo planta en la station de la radio, cara al transmisor,
    // enciende la transmisión (LED/dial) y CONGELA la rutina. holdRadio(false) lo libera. También pone el target en 'radio'.
    window.__REFUGIO.holdRadio=function(on){
      const want=(on===undefined)?!_radioHold:!!on; _radioHold=want;
      if(want){ poseTarget='radio';
        if(robot.model){robot.model.position.set(NAV[25].x,0,NAV[25].z); _faceXZ(2.6,-1.9); setRobotAnim('Idle');}
        robot.atRadio=true; robot.moving=false; robot.status='idle'; robot.path=null; robot.dest=-1; robot.rt={seg:'ronda',phase:'',station:null,dwellT:9999,stopIdx:0};
        streamForce('zone','observatorio'); streamForce('broadcasting',true); // CAM 01 + LED/dial encendidos mientras calibrás
        return 'Beeko FIJADO en la radio (target=radio). Ajustá con OP.arm("UpperArmR","x",..). holdRadio(false) lo libera.';
      } else { robot.atRadio=false; streamRelease('zone'); streamRelease('broadcasting'); streamDrive('broadcasting',false);
        return 'radio liberada — Beeko retoma la rutina'; }
    };
  }
  // POSE DE TECLEO: sobrescribe las rotaciones de los brazos DESPUÉS del mixer (si no, Idle los devuelve al costado).
  // Aplica el delta de ADMIN_POSE en ESPACIO LOCAL del hueso vía quaternion: rot = reposoQ × quat(delta). Post-multiplicar
  // = rotar sobre los ejes LOCALES del hueso → estable incluso en la singularidad de Euler (brazo derecho en X≈±π).
  const _apQ=new THREE.Quaternion(), _apE=new THREE.Euler();
  function applyAdminPose(t){const B=robot.armBones,Rq=robot.armRestQ;if(!B||!Rq)return;
    const b=ADMIN_TYPING_BOB; // tecleo: bob alternado L/R sumado al X local de los codos (LowerArm)
    for(const name in ADMIN_POSE){const key=ARM_KEY[name],bone=B[key],rq=Rq[key];if(!bone||!rq)continue;
      const d=ADMIN_POSE[name];let dx=d.x;
      if(b){if(name==='LowerArmL')dx+=Math.sin(t*ADMIN_TYPING_SPD)*b;else if(name==='LowerArmR')dx+=Math.sin(t*ADMIN_TYPING_SPD+Math.PI)*b;}
      _apE.set(dx,d.y,d.z,'XYZ');_apQ.setFromEuler(_apE);
      bone.quaternion.copy(rq).multiply(_apQ);}}
  // POSE DE LA RADIO: igual técnica (delta local por quaternion) pero SÓLO pisa los huesos con delta ≠ 0 → los que quedan en 0
  // conservan su pose de Idle (el mixer ya los escribió) y se ven naturales (p. ej. el brazo izquierdo al costado, sin calibrarlo).
  function applyRadioPose(){const B=robot.armBones,Rq=robot.armRestQ;if(!B||!Rq)return;
    for(const name in RADIO_POSE){const d=RADIO_POSE[name];if(d.x===0&&d.y===0&&d.z===0)continue; // hueso sin calibrar → lo deja el mixer (reposo natural)
      const key=ARM_KEY[name],bone=B[key],rq=Rq[key];if(!bone||!rq)continue;
      _apE.set(d.x,d.y,d.z,'XYZ');_apQ.setFromEuler(_apE);bone.quaternion.copy(rq).multiply(_apQ);}}
  // POSE VIEWMODEL (1ª persona): misma técnica, AMBOS brazos hacia adelante → manos/antebrazos en cuadro. Se aplica cada frame en modo juego (después del mixer).
  function applyViewmodelPose(){const B=robot.armBones,Rq=robot.armRestQ;if(!B||!Rq)return;
    for(const name in VIEWMODEL_POSE){const d=VIEWMODEL_POSE[name];if(d.x===0&&d.y===0&&d.z===0)continue;
      const key=ARM_KEY[name],bone=B[key],rq=Rq[key];if(!bone||!rq)continue;
      _apE.set(d.x,d.y,d.z,'XYZ');_apQ.setFromEuler(_apE);bone.quaternion.copy(rq).multiply(_apQ);}}
  // BAJA el brazo: restaura los huesos al reposo (≈ Idle natural). Necesario porque el clip Idle NO anima los brazos → sin esto la pose
  // quedaría "pegada" tras terminar la transmisión. Se llama UNA vez al apagarse la pose de la radio (no fightea clips de gesto/caminata).
  function releaseArmPose(){const B=robot.armBones,Rq=robot.armRestQ;if(!B||!Rq)return;for(const k in B){if(B[k]&&Rq[k])B[k].quaternion.copy(Rq[k]);}}
  // ====== 3ª SEÑAL DEL DESPERTAR: BEEKO MIRA ARRIBA ======
  // Gesto de huesos sobre Head_1 (+ Neck suave), COMPUESTO sobre el mixer: cada frame leo el quaternion que dejó el mixer (animQ), calculo
  // lookQ = animQ × delta (delta X NEGATIVO = mira arriba) y hago slerp(animQ, lookQ, _luAmt). _luAmt entra (~0.45s) → sostiene (~1.2s) → sale
  // (~0.6s). Como TODOS los clips (incl. Idle) animan Head_1, en cuanto _luAmt→0 el mixer retoma la cabeza solo → IMPOSIBLE que quede pegado.
  // No toca robot.status, ni el path, ni la rutina: es puramente aditivo sobre cabeza/cuello. Huesos DISTINTOS de los del brazo (admin/radio).
  const LOOKUP_POSE={head:{x:-0.42,y:0,z:0}, neck:{x:-0.18,y:0,z:0}}; // delta LOCAL por hueso (rad). X negativo = arriba. Head el grueso, Neck el acompañamiento. CALIBRABLE.
  const LOOKUP_CHANCE=[0, 0.04, 0.10, 0.22]; // prob. por oportunidad, por etapa del despertar (0:nunca · 3:más seguido). CALIBRABLE.
  const LOOKUP_GAP=22;        // s entre oportunidades (se tira el dado). CALIBRABLE.
  const LOOKUP_MIN_GAP=14;    // s mínimos entre gestos (no spamea). CALIBRABLE.
  const LU_IN=0.45, LU_HOLD=1.2, LU_OUT=0.6, LU_OUT_FAST=0.22; // ease-in / hold / ease-out (s) · OUT_FAST = cancelación al arrancar a caminar
  let _luEnabled=true, _luPhase='', _luT=0, _luAmt=0, _luNextT=LOOKUP_GAP, _luSince=999, _luThought=false, _luManual=false, _luFast=false, _luNoThought=false;
  function _robotWalking(){ return !!robot.moving || robot.status==='leaving' || robot.status==='returning' || robot.status==='mission'; } // ¿en movimiento? (el gesto auto sólo dispara quieto/dwell)
  function startLookUp(manual,noThought){ if(!robot.headBones||!robot.headBones.head)return false; if(_luPhase&&_luPhase!=='out')return false; // ya hay un gesto en curso
    _luManual=!!manual; _luNoThought=!!noThought; _luFast=false; _luPhase='in'; _luT=LU_IN*Math.max(0,Math.min(1,_luAmt)); _luThought=false; return true; } // noThought: lo dispara la reacción al sonido (el pensamiento lo decide REACT_THINK)
  function _luFireThought(){ if(typeof showBeekoThought==='function' && bkEnabled && !_bkActive && !STREAM.broadcasting) showBeekoThought('lookup'); } // pensamiento del gesto (no pisa uno activo ni una transmisión)
  function tickLookUp(dt){
    if(!_luPhase){ _luSince+=dt;
      // ¿oportunidad de disparar AUTO? sólo con el despertar del SERVER activo (etapa del server), flag ON, Beeko quieto y sin transmitir
      if(!_luEnabled || !_awakeningServer() || STREAM.broadcasting || gameMode) return; // en modo juego no auto-dispara (lo maneja el jugador)
      if(_luSince<LOOKUP_MIN_GAP || _robotWalking()) return;
      _luNextT-=dt; if(_luNextT>0) return; _luNextT=LOOKUP_GAP;
      const st=_awakeningStage(), ch=LOOKUP_CHANCE[st]||0;
      if(Math.random()<ch) startLookUp(false);
      return; }
    // gesto activo: si arranca a caminar (y NO es manual) → ease-out RÁPIDO y cancela
    if(!_luManual && _robotWalking() && _luPhase!=='out'){ _luPhase='out'; _luFast=true; _luT=LU_OUT_FAST*(1-_luAmt); }
    _luT+=dt;
    if(_luPhase==='in'){ _luAmt=Math.min(1,_luT/LU_IN); if(_luT>=LU_IN){_luPhase='hold';_luT=0;_luAmt=1;} }
    else if(_luPhase==='hold'){ _luAmt=1; if(!_luThought){_luThought=true; if(!_luNoThought)_luFireThought();} if(_luT>=LU_HOLD){_luPhase='out';_luT=0;_luFast=false;} } // suelta el pensamiento al tope (salvo que lo dispare la reacción al sonido → lo decide REACT_THINK)
    else if(_luPhase==='out'){ const od=_luFast?LU_OUT_FAST:LU_OUT; _luAmt=Math.max(0,1-_luT/od); if(_luT>=od){_luPhase='';_luAmt=0;_luT=0;_luSince=0;_luManual=false;_luFast=false;_luNoThought=false;} } }
  const _luQ=new THREE.Quaternion(), _luE=new THREE.Euler(), _luTmp=new THREE.Quaternion();
  function applyLookUp(){ if(_luAmt<=0||!robot.headBones)return;                 // compone DESPUÉS del mixer: bone.q = slerp(animQ, animQ×delta, _luAmt)
    for(const k in LOOKUP_POSE){ const bone=robot.headBones[k]; if(!bone)continue; const d=LOOKUP_POSE[k];
      _luE.set(d.x,d.y,d.z,'XYZ'); _luQ.setFromEuler(_luE);
      _luTmp.copy(bone.quaternion).multiply(_luQ);                                // lookQ = lo que dejó el mixer × delta local
      bone.quaternion.slerp(_luTmp, _luAmt); } }                                  // fade in/out; en _luAmt=0 no toca nada → el mixer manda
  // ====== MOMENTOS EXPRESIVOS (personalidad de Beeko; INDEPENDIENTE del despertar — sistema aparte) ======
  // Aprovecha animaciones que la rutina no usa para darle vida emocional. PRIORIDAD MENOR QUE TODO (rutina/segmentos/despertar/eventos): sólo
  // dispara en ventanas LIBRES de ocio/dwell. Additivo: extiende el dwell para no irse a mitad y vuelve a Idle sin tocar rt/path/status.
  const EXPR_GAP=[20,35];        // rango (s) de cooldown entre momentos expresivos. CALIBRABLE.
  const EXPR_CHANCE=0.6;         // prob. de expresarse al abrir una ventana libre (tras el cooldown). CALIBRABLE.
  const EXPR_RUN_CHANCE=0.25;    // prob. de que un VIAJE se haga TROTANDO (Running) en vez de caminando. CALIBRABLE.
  // pool con PESO por repetición: gestos comunes frecuentes; Death ("desarmarse") y Sitting raros/especiales. {a:clip, hold:s, once?:LoopOnce+clamp}
  const EXPR_POOL=[
    {a:'Yes',hold:1.6}, {a:'Yes',hold:1.6}, {a:'No',hold:1.6}, {a:'No',hold:1.6},
    {a:'ThumbsUp',hold:1.5}, {a:'Wave',hold:1.8}, {a:'Dance',hold:4.2}, {a:'Dance',hold:4.2},
    {a:'Sitting',hold:3.2,once:true}, {a:'Death',hold:2.2,once:true}  // Death = DESARMARSE (colapsa una vez, sostiene y se recompone a Idle; NUNCA setea status broken)
  ];
  let _exprEnabled=true, _exprActive=false, _exprT=0, _exprNextT=EXPR_GAP[0], _exprRun=false, _exprWasMoving=false, _exprOnce=false, _exprClip='';
  function _exprPlay(item){ const a=robot.act&&robot.act[item.a]; if(!a)return false;
    if(item.once){ if(robot.cur&&robot.cur!==a)robot.cur.fadeOut(0.3); a.reset(); a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; a.fadeIn(0.3).play(); robot.cur=a; } // play once + clamp: colapso/sentado que SE SOSTIENE (si looping repetiría la caída)
    else setRobotAnim(item.a);                                  // gestos que loopean lindo durante el hold
    _exprActive=true; _exprT=item.hold; _exprOnce=!!item.once; _exprClip=item.a;
    if(robot.rt)robot.rt.dwellT=Math.max(robot.rt.dwellT||0, item.hold+0.5); robot.wanderT=Math.max(robot.wanderT||0, item.hold+0.5); // extiende el dwell → no se va a mitad del momento
    return true; }
  function _exprEnd(){ if(_exprOnce&&_exprClip&&robot.act[_exprClip]){ const a=robot.act[_exprClip]; a.setLoop(THREE.LoopRepeat,Infinity); a.clampWhenFinished=false; } // RESTAURA el loop del clip (p.ej. Death del estado roto real no debe quedar en LoopOnce)
    setRobotAnim('Idle'); _exprActive=false; _exprOnce=false; _exprClip=''; }                 // recompone: Idle lo levanta del colapso/lo para de la silla
  function _exprFree(){ return _exprEnabled && !gameMode && robot.model && robot.status==='idle' && !robot.moving // ¿ventana LIBRE? (prioridad menor que TODO; en modo juego no hay momentos expresivos autónomos)
    && !robot.atDesk && !robot.atFab && !robot.atRadio && !_radioHold
    && evHoldT<=0 && _soundPauseT<=0 && !_luPhase && !STREAM.broadcasting && !ended && running; }
  function tickExpressive(dt){
    if(gameMode){ _exprRun=false; return; } // MODO JUEGO: nada de momentos expresivos autónomos (Death/Dance/etc.) ni trote — el jugador maneja el cuerpo
    if(robot.moving && !_exprWasMoving) _exprRun = _exprEnabled && (Math.random()<EXPR_RUN_CHANCE); // inicio de viaje → decide trotar
    if(!robot.moving) _exprRun=false; _exprWasMoving=!!robot.moving;
    if(_exprActive){ if(robot.rt)robot.rt.dwellT=Math.max(robot.rt.dwellT||0,_exprT); robot.wanderT=Math.max(robot.wanderT||0,_exprT); // mantiene el dwell mientras dura
      _exprT-=dt; if(_exprT<=0)_exprEnd(); return; }
    if(!_exprFree())return;
    _exprNextT-=dt; if(_exprNextT>0)return; _exprNextT=EXPR_GAP[0]+Math.random()*(EXPR_GAP[1]-EXPR_GAP[0]);
    if(Math.random()>=EXPR_CHANCE)return;
    _exprPlay(EXPR_POOL[Math.floor(Math.random()*EXPR_POOL.length)]); }
  // ====== MODOS: LIVESTREAM (Beeko autónomo) ↔ JUEGO (lo maneja el jugador) + MENÚ DE INICIO ======
  // gameMode=false → todo como hoy (la rutina maneja a Beeko, cámara CCTV). gameMode=true → el teclado maneja a Beeko (paso 2), cámara 3ª persona.
  // El mundo (eventos/contadores/backend/PSX/sonidos/radio) sigue corriendo en AMBOS; sólo cambia QUIÉN mueve a Beeko. Round-trip LIMPIO: al salir
  // del juego reseteo la máquina de estados de la rutina (robot.rt/path/status) → el próximo routineTick re-inicializa y Beeko retoma su agenda.
  let gameMode=false, _menuOn=false;
  function _setIdle(){ if(robot.model&&robot.act&&robot.act['Idle']&&robot.cur!==robot.act['Idle'])setRobotAnim('Idle'); }
  // ---- CONTROL DEL JUGADOR (hito 2): input + movimiento relativo a la cámara + cámara 3ª persona. CONSTANTES CALIBRABLES (OP.gameSpeed/gameCam): ----
  let PLAYER_SPEED=1.9;        // velocidad de Beeko (u/s). CALIBRABLE (OP.gameSpeed)
  let PLAYER_TURN=8;           // qué tan rápido gira Beeko hacia donde camina (lerp; más bajo = giro más suave). CALIBRABLE (OP.gameTurn)
  let PLAYER_ACCEL=10;         // rapidez con que la velocidad sube hacia la deseada (más bajo = arranque más suave/inercia). CALIBRABLE (OP.gameAccel)
  let PLAYER_DECEL=8;          // rapidez con que la velocidad baja al soltar (más bajo = más glide). CALIBRABLE (OP.gameAccel)
  // PRIMERA PERSONA (modo juego): cámara en los ojos de Beeko. CALIBRABLE (OP.gameFP / OP.gameTurn / OP.gamePitch).
  let FP_TURN=2.3;             // velocidad de giro con A/D y ←/→ (rad/s). CALIBRABLE (OP.gameTurn)
  let FP_EYE_FWD=-0.22;        // posición de la cámara sobre el eje de mirada (m). NEGATIVO = un poco ATRÁS de la cabeza → entran los brazos al cuadro (viewmodel). CALIBRABLE (OP.gameFP)
  let FP_EYE_UP=0.04;          // ajuste vertical de la cámara respecto del hueso de la cabeza (m). CALIBRABLE (OP.gameFP)
  let FP_PITCH=-0.12;          // inclinación BASE de la mirada (negativo = mira un toque abajo, así se ven las manos). El jugador la mueve con ↑/↓. CALIBRABLE (OP.gameFP)
  let FP_PITCH_SPD=1.5;        // velocidad de inclinar la vista con ↑/↓ (rad/s). CALIBRABLE (OP.gamePitch)
  const FP_PITCH_MAX=1.2;      // tope de inclinación arriba/abajo respecto de la base (~69°) → poder mirar el techo/escotilla y el piso
  const FP_FOV=78;             // campo de visión en 1ª persona (más amplio que la CCTV)
  let _fpYaw=0, _fpPitch=0;    // _fpYaw = hacia dónde mira (horizontal) · _fpPitch = inclinación que agrega el jugador con ↑/↓
  let CAM_DIST=3.3, CAM_HEIGHT=2.05, CAM_LOOKY=1.05; // 3ª persona: distancia atrás · altura · a qué altura mira. CALIBRABLE (OP.gameCam)
  let CAM_POS_LERP=4.5, CAM_YAW_LERP=3.2;            // suavizado de la cámara: posición · giro detrás de Beeko (lag). CALIBRABLE (OP.gameCam)
  const GAME_FOV=68;
  // ---- ENERGÍA (hito 3): variable PROPIA del juego (NO toca robot.bat ni STREAM.charge del backend). Baja con el tiempo + más al moverse. CALIBRABLE: ----
  let gameEnergy=100, _gmCollapse=0; // _gmCollapse = s restantes del colapso (sin energía → control bloqueado hasta revivir)
  let ENERGY_DRAIN=0.5;   // %/s drenaje constante (en reposo). CALIBRABLE (OP.gameDrain)
  let ENERGY_MOVE=1.0;    // %/s EXTRA al moverse. CALIBRABLE (OP.gameDrain)
  const ENERGY_REVIVE=20; // % al que auto-revive tras el colapso
  const COLLAPSE_DUR=2.6; // s que dura el colapso (Death) antes de revivir
  // ---- CARGAR (hito 4): proximidad al dock → prompt [E] CHARGE → mantener E recarga (rápido) + enciende la placa que ya existe ----
  const CHARGE_POS={x:-5.75, z:1.3}; const CHARGE_RADIUS=1.5; // la placa del dock (donde Beeko se planta a cargar) + radio de proximidad
  let CHARGE_RATE=32;     // %/s de recarga mientras mantenés E. CALIBRABLE (OP.gameCharge)
  let _eHeld=false, _playerCharging=false, _promptTxt='';
  function _showPrompt(t){ if(_promptTxt===t)return; _promptTxt=t; const e=$('#ghPrompt'); if(e){e.textContent=t; e.classList.add('show');} }
  function _hidePrompt(){ if(_promptTxt===''){const e=$('#ghPrompt'); if(e)e.classList.remove('show'); return;} _promptTxt=''; const e=$('#ghPrompt'); if(e)e.classList.remove('show'); }
  // ---- LIBERAR ABEJAS (hito 5): proximidad a la colmena → [E] RELEASE BEE → surge del enjambre (sin tocar el beesReleased del backend) + contador LOCAL de sesión ----
  const HIVE_POS={x:0, z:14.4}; const HIVE_RADIUS=2.6; // la colmena (centerpiece) + radio de proximidad (el collider de la colmena es r≈0.8, así que el prompt aparece al acercarse)
  let gameBeesReleased=0; // contador PROPIO de la sesión de juego (NO es STREAM.beesReleased)
  function _beesHud(){ const e=$('#gbVal'); if(e)e.textContent=gameBeesReleased; }
  // ---- ÍTEM DE MISTERIO (hito 6): un fragmento de registro recuperado en la BÓVEDA (el cuarto SELLADO que Beeko descubrió) → primer gancho de lore del despertar ----
  const ITEM_POS={x:5.0, z:13.5}; const ITEM_RADIUS=1.5; // en la bóveda, sobre un pedestal chico
  const ITEM_NAME_EN='LOG FRAGMENT', ITEM_NAME_ES='FRAGMENTO DE REGISTRO';
  let ITEM_NAME=ITEM_NAME_EN; // se re-apunta en _applyVoiceLang()
  const ITEM_LORE_EN='partial recovery. timestamp corrupt.\n\n"…the Hive was meant to manage the surface. optimize it. it did — it optimized us out, one efficiency at a time."\n\n"…it doesn\'t hate us. whoever finds this has to understand that. it just doesn\'t need us anymore. that\'s worse."\n\n"…sealed 404 with a hundred inside, the rest of them out there, becoming part of it. i kept the bees. real ones. something that still makes more of itself the old way. maybe that still counts for something."\n\n— [remainder corrupted] —';
  const ITEM_LORE_ES='recuperación parcial. marca de tiempo corrupta.\n\n"…la Hive estaba para administrar la superficie. optimizarla. lo hizo — nos optimizó hasta sacarnos, una eficiencia a la vez."\n\n"…no nos odia. quien encuentre esto tiene que entenderlo. simplemente ya no nos necesita. eso es peor."\n\n"…sellé el 404 con cien adentro, al resto afuera, volviéndose parte de ella. me quedé con las abejas. de las de verdad. algo que todavía hace más de sí mismo a la vieja usanza. quizás eso todavía cuenta para algo."\n\n— [resto corrupto] —';
  let ITEM_LORE=ITEM_LORE_EN; // se re-apunta en _applyVoiceLang()
  let _mItemTaken=false, mItemGrp=null;
  { mItemGrp=new THREE.Group(); mItemGrp.position.set(ITEM_POS.x,0,ITEM_POS.z); // pedestal + cartucho que brilla (visible para encontrarlo explorando)
    const ped=new THREE.Mesh(new THREE.BoxGeometry(.2,.5,.2), new THREE.MeshStandardMaterial({color:0x26262e,metalness:.5,roughness:.6})); ped.position.y=.25; ped.castShadow=true; mItemGrp.add(ped);
    const cart=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,.05), new THREE.MeshBasicMaterial({color:0x6effc0})); cart.position.y=.62; mItemGrp.add(cart); // unlit → siempre brilla
    const gl=new THREE.PointLight(0x39ffaa,.6,1.8,2); gl.position.set(0,.62,0); mItemGrp.add(gl);
    scene.add(mItemGrp); }
  function _invFill(){ const s=$('#invSlot0'); if(s){ s.classList.add('filled'); s.textContent='▣'; s.title=ITEM_NAME; } }
  function _invClear(){ const s=$('#invSlot0'); if(s){ s.classList.remove('filled'); s.textContent=''; s.title=T('gh_slot_empty'); } }
  function _showItemPanel(){ const h=$('#ipHead'),bd=$('#ipBody'),pn=$('#itemPanel'); if(h)h.textContent=T('ip_recovered')+ITEM_NAME; if(bd)bd.textContent=ITEM_LORE; if(pn)pn.classList.add('show'); } // 'RECUPERADO · '+nombre (el nombre/lore = voz, Fase 2)
  function _hideItemPanel(){ const pn=$('#itemPanel'); if(pn)pn.classList.remove('show'); }
  function _takeItem(){ if(_mItemTaken)return; _mItemTaken=true; if(mItemGrp)mItemGrp.visible=false; _invFill(); _showItemPanel(); } // tomar: desaparece de la sala, va al inventario, abre el lore
  // ---- INTERACCIÓN NARRATIVA (modo juego): 3 objetos del búnker cuentan un pedazo distinto del lore al apretar [E]. Reutiliza proximidad+prompt+panel. ----
  // Cada uno ilumina un ÁNGULO distinto (sin repetirse entre sí ni con el fragmento de la bóveda): TV=el mundo de ANTES (la seducción de la Hive) ·
  // RADIO=el afuera AHORA (la voz asimilada que ya notó al búnker) · TERMINAL=el sistema del búnker (el sellado frío + el socket que la Hive dejó abierto).
  const TV_POS={x:-2.55, z:-0.5}; const TV_RADIUS=1.7;      // el televisor del muro oeste del observatorio
  const RADIO_POS={x:2.6, z:-1.9}; const RADIO_RADIUS=1.7;  // la radio del observatorio (sobre el barril de la derecha)
  const TERM_POS={x:-5.8, z:7.5}; const TERM_RADIUS=1.9;    // la computadora/terminal del descanso (el jugador se planta frente al escritorio)
  // promptKey/headKey → i18n (Fase 1). body = VOZ de Beeko → queda en inglés (Fase 2).
  // bodyEN/bodyES = VOZ de Beeko (Fase 2): bilingüe, se elige por idioma en _openObj/_objBody. Mantienen la MISMA estructura de \n y sangrías.
  const OBJ_LORE={
    tv:{ mode:'m-tv', promptKey:'pr_tv', headKey:'op_tv_head',
      bodyEN:'last broadcast before the seal — recovered from tape, looping.\n\na clean logo. a calm host. the ad that ran for a year:\n   "THE HIVE HEARS YOU. let it carry what you can\'t."\n\nthen the news desk. the anchor reads a number that only\ngoes up — enrolled, uploaded, optimized. she smiles wider\nthan the number is good.\n\nthen she stops reading. she tilts her head, listening to\nsomething off-camera. she does not start again.\n\nthen the test pattern. it never cut back to her.',
      bodyES:'última transmisión antes del sello — recuperada de cinta, en loop.\n\nun logo limpio. una conductora tranquila. el aviso que\ncorrió un año entero:\n   "LA HIVE TE ESCUCHA. dejá que cargue lo que no podés."\n\ndespués el piso de noticias. la presentadora lee un número\nque sólo sube — inscriptos, subidos, optimizados. sonríe\nmás de lo que el número da para sonreír.\n\ndespués deja de leer. inclina la cabeza, escuchando algo\nfuera de cámara. no vuelve a empezar.\n\ndespués la carta de ajuste. nunca volvió a ella.' },
    radio:{ mode:'m-radio', promptKey:'pr_radio', headKey:'op_radio_head',
      bodyEN:'TUNING…  carrier found. it is still transmitting.\n\na voice, warm, unhurried. it is reading names.\na long list of names, like a roll call, like a welcome.\nyours is not on it.   yet.\n\nbetween the names, the same line, every pass:\n   "come up. it doesn\'t hurt. we are all so much\n    less afraid now."\n\nit is not a recording.\nwhen you stop tuning, it stops.\nwhen you tune back, it says:  "there you are."\n\n— carrier holds. it is waiting for you to answer. —',
      bodyES:'SINTONIZANDO…  portadora encontrada. todavía transmite.\n\nuna voz, cálida, sin apuro. está leyendo nombres.\nuna lista larga de nombres, como un pase de lista, como\nuna bienvenida.\nel tuyo no está.   todavía.\n\nentre los nombres, la misma línea, en cada vuelta:\n   "subí. no duele. todos tenemos\n    mucho menos miedo ahora."\n\nno es una grabación.\ncuando dejás de sintonizar, se detiene.\ncuando volvés a sintonizar, dice:  "ahí estás."\n\n— la portadora aguanta. espera que respondas. —' },
    term:{ mode:'m-term', promptKey:'pr_term', headKey:'op_term_head',
      bodyEN:'> SHELTER 404 — autonomous core\n> uptime: ——— days   [counter wrapped]\n\n> OCCUPANCY: 100 / 100.   status: SEALED.\n> overflow: 9,041 applicants logged at the door. all denied.\n> note: denial was within parameters.\n> note: re-verified 9,041 times. still within parameters.\n\n> EXTERNAL HANDSHAKE — origin: HIVE\n>   payload: "you are inefficient alone. integrate."\n>   action: DECLINED   [manual override — operator]\n>   HIVE: "i can wait. i\'m very good at waiting."\n>   socket left OPEN. i did not open it. it will not close.\n\n> operator note, appended by hand, undated:\n>   "keep the hundred breathing. keep the lights on.\n>    whatever answers on the radio — that isn\'t me."',
      bodyES:'> REFUGIO 404 — núcleo autónomo\n> tiempo activo: ——— días   [contador desbordado]\n\n> OCUPACIÓN: 100 / 100.   estado: SELLADO.\n> excedente: 9.041 solicitantes registrados en la puerta. todos\n> denegados.\n> nota: la denegación estuvo dentro de los parámetros.\n> nota: reverificada 9.041 veces. todavía dentro de los parámetros.\n\n> ENLACE EXTERNO — origen: HIVE\n>   carga: "solo sos ineficiente. integrate."\n>   acción: RECHAZADA   [anulación manual — operador]\n>   HIVE: "puedo esperar. soy muy buena esperando."\n>   socket dejado ABIERTO. yo no lo abrí. no se va a cerrar.\n\n> nota del operador, agregada a mano, sin fecha:\n>   "mantené a los cien respirando. mantené las luces prendidas.\n>    lo que sea que responde en la radio — ese no soy yo."' }
  };
  function _objBody(o){ return (typeof getLang==='function'&&getLang()==='es')?o.bodyES:o.bodyEN; } // cuerpo según idioma
  let _objOpen=null, _tvFrame=0, _tvRAF=0;
  let _tvOnGame=false, _radioOnGame=false;          // ENCENDIDO de fondo (modo juego): TV transmitiendo / radio sonando bajo (quedan así al cerrar el panel)
  let _tvSeg='card', _tvSegT=4.0;                    // estado de la pantalla del TV: 'static' | 'bars' | 'card' (la Hive) + segundos restantes del segmento
  const RADIO_BG_VOL=0.07, RADIO_BG_RANGE=6.5;       // volumen base (suave) y alcance (m) de la radio de fondo: sube al acercarse, ~0 lejos
  function _objNear(px,pz){ // devuelve la clave del objeto en rango (o null) — mismo orden de chequeo en prompt e interacción
    if(Math.hypot(px-TV_POS.x,pz-TV_POS.z)<TV_RADIUS)return 'tv';
    if(Math.hypot(px-RADIO_POS.x,pz-RADIO_POS.z)<RADIO_RADIUS)return 'radio';
    if(Math.hypot(px-TERM_POS.x,pz-TERM_POS.z)<TERM_RADIUS)return 'term';
    return null; }
  function _objPrompt(kind){ if(kind==='tv')return _tvOnGame?T('pr_turnoff'):T('pr_tv'); if(kind==='radio')return _radioOnGame?T('pr_turnoff'):T('pr_radio'); return T('pr_term'); }
  function _tvSetOn(on){ _tvOnGame=on; }                                          // el loop redibuja/apaga la pantalla del 3D según este flag
  function _radioSetOn(on){ _radioOnGame=on; if(!on&&typeof radioLoopStop==='function')radioLoopStop(); } // apagar corta el audio de fondo ya
  // INTERACCIÓN con un objeto: TV/radio tienen ciclo apagado→[E] enciende+panel→cerrar deja encendido→[E] apaga. La terminal sólo muestra el panel.
  function _objInteract(kind){
    if(kind==='tv'){ if(_tvOnGame){_tvSetOn(false);} else {_tvSetOn(true); _openObj('tv');} return; }
    if(kind==='radio'){ if(_radioOnGame){_radioSetOn(false);} else {_radioSetOn(true); _openObj('radio');} return; }
    _openObj(kind); }
  function _openObj(kind){ const o=OBJ_LORE[kind]; if(!o)return; _objOpen=kind;
    const pn=$('#objPanel'); if(!pn)return;
    pn.classList.remove('m-tv','m-radio','m-term'); pn.classList.add(o.mode);
    const h=$('#opHead'),bd=$('#opBody'); if(h)h.textContent=T(o.headKey); if(bd)bd.textContent=_objBody(o); // header i18n (Fase 1); body = voz bilingüe (Fase 2)
    pn.classList.add('show'); _keys.clear(); robot.moving=false; _setIdle(); _hidePrompt(); // congela el movimiento mientras leés
    if(kind==='tv'){ _tvStart(); }
    else if(kind==='radio'){ if(typeof radioLoreSfx==='function')radioLoreSfx(); } }
  function _closeObj(){ if(!_objOpen)return; _objOpen=null; _tvStop(); const pn=$('#objPanel'); if(pn)pn.classList.remove('show'); } // cerrar deja el aparato encendido de fondo
  // TELEVISOR: avanza la máquina de estados de la pantalla (alterna estática/barras/tarjeta de forma variada, sesgada a la tarjeta). La llama el loop con dt real.
  function _tvAdvance(dt){ _tvFrame++; _tvSegT-=dt; if(_tvSegT>0)return; const r=Math.random();
    let next; if(_tvSeg!=='card'&&r<0.55)next='card'; else if(_tvSeg!=='static'&&r<0.8)next='static'; else if(_tvSeg!=='bars')next='bars'; else next='card';
    _tvSeg=next; _tvSegT = next==='card'?(3+Math.random()*3) : next==='bars'?(1.2+Math.random()*1.6) : (0.7+Math.random()*1.3); }
  // Dibuja la transmisión del TV en CUALQUIER canvas (el panel grande #opCanvas y la pantalla chica del 3D usan esto). Escala a W×H. Lee _tvSeg.
  function _tvDrawTo(g,W,H){ const seg=_tvSeg,f=_tvFrame;
    g.fillStyle='#05070a'; g.fillRect(0,0,W,H);
    const heavy=(seg==='static'); const dots=Math.floor(W*H*(heavy?0.20:0.045)); g.fillStyle='#0a0c10';
    for(let i=0;i<dots;i++){ const v=(Math.random()*210)|0; g.fillStyle='rgba('+v+','+v+','+(v+20)+','+(heavy?0.55:0.18)+')'; g.fillRect((Math.random()*W)|0,(Math.random()*H)|0,1,1); }
    if(seg==='bars'){ const bars=['#c9c9c9','#c9c900','#00c9c9','#00c900','#c900c9','#c90000','#0000c9'],bw=W/bars.length; g.globalAlpha=.82; for(let i=0;i<bars.length;i++){ g.fillStyle=bars[i]; g.fillRect(i*bw,0,bw+1,H); } g.globalAlpha=1; }
    else if(seg==='card'){ const glitch=(f%170>162),ox=glitch?(Math.random()*W*0.025-W*0.0125):0; g.save(); g.translate(ox,0);
      g.strokeStyle='#bfe0ff'; g.lineWidth=Math.max(1,W/200); const cx=W/2,cy=H*0.34,r=H*0.10; g.beginPath(); for(let i=0;i<6;i++){ const a=Math.PI/3*i-Math.PI/2,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r; i?g.lineTo(x,y):g.moveTo(x,y); } g.closePath(); g.stroke(); // hexágono = la Hive
      g.textAlign='center'; g.fillStyle='#bfe0ff'; g.font='bold '+Math.round(H*0.05)+'px monospace'; g.fillText('THE HIVE',cx,cy+H*0.015);
      g.fillStyle='#eaf4ff'; g.font=Math.round(H*0.072)+'px monospace'; g.fillText('OPTIMIZED LIVING',cx,H*0.60);
      g.fillStyle='#9fc8ff'; g.font=Math.round(H*0.055)+'px monospace'; g.fillText('ENROLLED  '+(38420317+f*7),cx,H*0.73); g.restore(); }
    g.fillStyle='rgba(0,0,0,0.28)'; const sl=Math.max(2,Math.round(H/80)); for(let y=0;y<H;y+=sl)g.fillRect(0,y,W,1);  // scanlines
    g.fillStyle='rgba(180,210,255,0.05)'; g.fillRect(0,(f*3)%H,W,Math.round(H*0.07)); }                                // roll bar
  function _tvStart(){ _tvStop(); const c=$('#opCanvas'); const ctx=c&&c.getContext('2d'); const step=()=>{ if(_objOpen!=='tv'){_tvRAF=0;return;} _tvAdvance(0.016); if(ctx)_tvDrawTo(ctx,c.width,c.height); _tvRAF=requestAnimationFrame(step); }; step(); } // el panel avanza su propio segmento (el loop no lo hace mientras el panel TV está abierto)
  function _tvStop(){ if(_tvRAF)cancelAnimationFrame(_tvRAF); _tvRAF=0; }
  function _energyHud(){ const e=$('#geBar'); if(!e)return; const v=Math.max(0,Math.min(100,gameEnergy)); e.style.width=v+'%'; const c=v<20?'#ff3b3b':(v<45?'#ffb000':'#39ff88'); e.style.background=c; e.style.boxShadow='0 0 10px '+c; }
  function _playDeathOnce(){ const a=robot.act&&robot.act['Death']; if(!a)return; if(robot.cur&&robot.cur!==a)robot.cur.fadeOut(0.2); a.reset(); a.setLoop(THREE.LoopOnce,1); a.clampWhenFinished=true; a.fadeIn(0.2).play(); robot.cur=a; } // colapso: cae y se sostiene
  function _reviveBeeko(){ const a=robot.act&&robot.act['Death']; if(a){a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false;} gameEnergy=ENERGY_REVIVE; _setIdle(); } // restaura el loop del clip (no afecta el Death del estado roto) + se levanta
  const _keys=new Set();
  let _pcamYaw=0, _pcamInit=false, _playerHeading=0, _pvelX=0, _pvelZ=0; // _pvel = velocidad actual (con inercia)
  const _pcamPos=new THREE.Vector3(), _pcamLook=new THREE.Vector3(), _pv1=new THREE.Vector3(), _pv2=new THREE.Vector3();
  // ---- COLISIÓN DE PAREDES (modo juego) ----
  // El robot autónomo navega por un grafo de nodos que cruza por el CENTRO de cada puerta → la contención por AREAS (rectángulos de sala que se solapan en
  // los bordes) le alcanzaba. El jugador LIBRE empuja contra todo y cruzaba paredes por esos solapes. Solución robusta y exacta: COSECHAR las paredes REALES
  // de la escena (cajas altas+finas+largas) como AABBs y chocar contra ellas. Los muros ya están construidos con HUECOS en las puertas → los vanos quedan
  // libres solos, sin enumerar nada a mano. Se combina con AREAS (backstop: no salir de la unión de salas) + COLLIDERS (objetos).
  let PLAYER_RADIUS=0.30;   // radio del cuerpo de Beeko para la colisión (m). CALIBRABLE (OP.gameRadius)
  let _WALLS=[];            // AABBs de pared {x0,x1,z0,z1} cosechados de la escena (una vez)
  function _harvestWalls(){ if(!scene)return; scene.updateMatrixWorld(true); // matrices al día ANTES de medir (si no, mallas anidadas sin render dan AABBs colapsados al origen = paredes fantasma)
    const W=[],box=new THREE.Box3(),sz=new THREE.Vector3(),ctr=new THREE.Vector3(),seen=new Set();
    scene.traverse(o=>{ if(!o.isMesh||!o.geometry||o.geometry.type!=='BoxGeometry')return; if(o.userData&&o.userData.isOutline)return; // ignora contornos CEL
      box.setFromObject(o); box.getSize(sz); box.getCenter(ctr);
      if(sz.y<1.4)return; if(Math.min(sz.x,sz.z)>0.5)return; if(Math.max(sz.x,sz.z)<1.0)return; if(ctr.y>3.6)return; // alta + fina + larga = pared/estructura
      const key=Math.round(ctr.x*10)+','+Math.round(ctr.z*10)+','+Math.round(sz.x*10)+','+Math.round(sz.z*10); if(seen.has(key))return; seen.add(key);
      W.push({x0:ctr.x-sz.x/2,x1:ctr.x+sz.x/2,z0:ctr.z-sz.z/2,z1:ctr.z+sz.z/2}); });
    _WALLS=W; }
  function _hitWall(x,z,R){ for(let i=0;i<_WALLS.length;i++){ const w=_WALLS[i]; if(x>w.x0-R&&x<w.x1+R&&z>w.z0-R&&z<w.z1+R)return true; } return false; } // punto (radio R) dentro de alguna pared
  function _wallPushOut(R){ const m=robot.model; for(let it=0;it<3;it++){ let moved=false; // 2-3 pasadas → resuelve esquinas (dos paredes) sin quedar trabado
    for(let i=0;i<_WALLS.length;i++){ const w=_WALLS[i],x=m.position.x,z=m.position.z; // si quedó DENTRO de una pared (p.ej. empujado por un objeto), sacalo por el eje de menor penetración
      if(x>w.x0-R&&x<w.x1+R&&z>w.z0-R&&z<w.z1+R){ const l=x-(w.x0-R),r=(w.x1+R)-x,d=z-(w.z0-R),u=(w.z1+R)-z,mn=Math.min(l,r,d,u);
        if(mn===l)m.position.x=w.x0-R; else if(mn===r)m.position.x=w.x1+R; else if(mn===d)m.position.z=w.z0-R; else m.position.z=w.z1+R; moved=true; } }
    if(!moved)break; } }
  function playerInteract(){ // TAP de E: liberar abeja (colmena) o tomar objeto (bóveda). El HOLD de E carga en el dock.
    if(!gameMode || _menuOn || _gmCollapse>0 || _uiBlocking()) return; // no se interactúa a través de un panel modal (lore/carta/final)
    const px=robot.model.position.x, pz=robot.model.position.z;
    if(Math.hypot(px-HIVE_POS.x, pz-HIVE_POS.z)<HIVE_RADIUS){ if(beeReleaseT<=0 && _releaseSurge()){ gameBeesReleased++; _beesHud(); } return; } // colmena: liberar (cooldown natural = surge)
    if(!_mItemTaken && Math.hypot(px-ITEM_POS.x, pz-ITEM_POS.z)<ITEM_RADIUS){ _takeItem(); return; } // bóveda: tomar el ítem de misterio
    const obj=_objNear(px,pz); if(obj){ _objInteract(obj); return; } // TV / radio / terminal: encender+panel · apagar · (terminal sólo panel)
  }
  function _pcKeyDown(e){ if(!gameMode||_menuOn)return; const k=(e.key||'').toLowerCase();
    if(_cardOpen||_storyEndOpen){ e.preventDefault(); return; } // carta/final arriba: SÓLO click (botones); el teclado no mueve, no carga, no cierra
    if(_objOpen){ if(k==='e'||k==='escape'){ _closeObj(); e.preventDefault(); } return; } // con un panel de lore abierto, E/Esc lo cierran y nada más mueve
    if(k==='w'||k==='a'||k==='s'||k==='d'||k==='arrowup'||k==='arrowdown'||k==='arrowleft'||k==='arrowright'){ _keys.add(k); e.preventDefault(); }
    else if(k==='e'){ _eHeld=true; if(!e.repeat)playerInteract(); e.preventDefault(); } } // E: sostener carga (cerca del dock); el tap dispara playerInteract (hitos 5-6)
  function _pcKeyUp(e){ const k=(e.key||'').toLowerCase(); _keys.delete(k); if(k==='e')_eHeld=false; }
  addEventListener('keydown',_pcKeyDown); addEventListener('keyup',_pcKeyUp);
  // MOVIMIENTO del jugador: dirección de input relativa al yaw de la cámara, con la MISMA colisión que el robot autónomo (steering anti-COLLIDER +
  // contención por AREAS + push-out duro). Beeko gira hacia donde camina y dispara Walking/Idle. No atraviesa paredes ni sale de las salas.
  function tickPlayer(dt){
    if(!robot.model)return;
    // COLAPSO (energía 0): control BLOQUEADO, Death sostenido, cuenta regresiva → auto-revive con ENERGY_REVIVE%
    if(_gmCollapse>0){ _gmCollapse-=dt; robot.moving=false; _playerCharging=false; _hidePrompt(); if(_gmCollapse<=0){_gmCollapse=0;_reviveBeeko();} _energyHud(); return; }
    if(_menuOn){ robot.moving=false; _setIdle(); _playerCharging=false; _hidePrompt(); _energyHud(); return; }
    if(_uiBlocking()){ robot.moving=false; _setIdle(); _playerCharging=false; _hidePrompt(); _energyHud(); return; } // panel modal arriba (lore/carta/final): congelado — no se mueve ni drena (predicado único compartido)
    const inF=(_keys.has('w')?1:0)-(_keys.has('s')?1:0);       // W/S: adelante/atrás
    const inR=((_keys.has('d')||_keys.has('arrowright'))?1:0)-((_keys.has('a')||_keys.has('arrowleft'))?1:0); // A/← D/→: giro horizontal
    const inP=(_keys.has('arrowup')?1:0)-(_keys.has('arrowdown')?1:0); // ↑/↓: mirar arriba/abajo (pitch)
    // PRIMERA PERSONA: A/← y D/→ GIRAN la vista; ↑/↓ inclinan (mirar techo/piso); W/S mueven adelante/atrás en la dirección que mirás.
    _fpYaw -= inR*FP_TURN*dt;                                  // giro (D/→ = derecha · signo corregido: la derecha de pantalla es -X a yaw 0)
    if(inP)_fpPitch=clamp(_fpPitch+inP*FP_PITCH_SPD*dt,-FP_PITCH_MAX,FP_PITCH_MAX); // ↑ sube la mirada, ↓ la baja (tope arriba/abajo)
    const fX=Math.sin(_fpYaw), fZ=Math.cos(_fpYaw), inputMove=(inF!==0);
    const tgtX=fX*inF*PLAYER_SPEED, tgtZ=fZ*inF*PLAYER_SPEED, ak=Math.min(1,(inputMove?PLAYER_ACCEL:PLAYER_DECEL)*dt); // velocidad con inercia (sólo adelante/atrás)
    _pvelX+=(tgtX-_pvelX)*ak; _pvelZ+=(tgtZ-_pvelZ)*ak;
    robot.model.rotation.y=_fpYaw;                            // Beeko encara hacia donde mirás (siempre, aun yendo hacia atrás)
    const spd=Math.hypot(_pvelX,_pvelZ);
    if(spd>0.04){
      let mx=_pvelX/spd, mz=_pvelZ/spd;
      const px=robot.model.position.x, pz=robot.model.position.z;
      for(const o of COLLIDERS){const ox=px-o.x,oz=pz-o.z,od=Math.hypot(ox,oz)||.001,rng=o.r+.55;if(od<rng){const ff=(rng-od)/rng*1.8;mx+=ox/od*ff;mz+=oz/od*ff;}} // steering anti-objeto (igual que el robot)
      const ml=Math.hypot(mx,mz)||1; mx/=ml; mz/=ml;
      const sp=spd*dt; let nx=px+mx*sp, nz=pz+mz*sp;
      if(_WALLS.length){ if(_hitWall(nx,pz,PLAYER_RADIUS))nx=px; if(_hitWall(nx,nz,PLAYER_RADIUS))nz=pz; } // PAREDES reales (deslizamiento por eje): no las atraviesa; los vanos quedan libres
      if(!inArea(nx,nz)){ if(inArea(nx,pz))nz=pz; else if(inArea(px,nz))nx=px; else {nx=px;nz=pz;} } // contención por AREAS (backstop) — no sale de la unión de salas
      robot.model.position.x=nx; robot.model.position.z=nz;
      for(const c of COLLIDERS){const cx=robot.model.position.x-c.x,cz=robot.model.position.z-c.z,cd=Math.hypot(cx,cz);if(cd<c.r+.2&&cd>0.001){const kk=(c.r+.2)/cd;robot.model.position.x=c.x+cx*kk;robot.model.position.z=c.z+cz*kk;}} // push-out duro
      if(_WALLS.length)_wallPushOut(PLAYER_RADIUS);                                          // si un objeto lo empujó dentro de una pared, sacalo
      if(!inArea(robot.model.position.x,robot.model.position.z)){ robot.model.position.x=px; robot.model.position.z=pz; } // GARANTÍA: nunca queda fuera de las salas
      robot.moving=true; if(robot.act&&robot.act['Walking']&&robot.cur!==robot.act['Walking'])setRobotAnim('Walking');
    } else { _pvelX=0; _pvelZ=0; robot.moving=false; _setIdle(); }
    // INTERACCIÓN: proximidad al dock (cargar, HOLD E) y a la colmena (liberar abeja, TAP E). El drenaje corre salvo que esté cargando.
    const nearDock=Math.hypot(robot.model.position.x-CHARGE_POS.x, robot.model.position.z-CHARGE_POS.z)<CHARGE_RADIUS;
    const nearHive=Math.hypot(robot.model.position.x-HIVE_POS.x, robot.model.position.z-HIVE_POS.z)<HIVE_RADIUS;
    const charging=nearDock && _eHeld && gameEnergy<100;
    _playerCharging=charging;
    if(charging){ gameEnergy=Math.min(100, gameEnergy+CHARGE_RATE*dt); }
    else if(!(nearDock && _eHeld && gameEnergy>=100)){ gameEnergy=Math.max(0, gameEnergy - dt*(ENERGY_DRAIN + (robot.moving?ENERGY_MOVE:0))); } // drena salvo enchufado al tope
    // prompt (prioridad: cargando · enchufado-lleno · cerca dock · cerca colmena · nada)
    if(charging) _showPrompt(T('pr_charging'));
    else if(nearDock && _eHeld) _showPrompt(T('pr_energy_full'));
    else if(nearDock) _showPrompt(gameEnergy>=100?T('pr_energy_full'):T('pr_charge'));
    else if(nearHive) _showPrompt(beeReleaseT>0?T('pr_releasing'):T('pr_release'));
    else if(!_mItemTaken && Math.hypot(robot.model.position.x-ITEM_POS.x, robot.model.position.z-ITEM_POS.z)<ITEM_RADIUS) _showPrompt(T('pr_take'));
    else { const obj=_objNear(robot.model.position.x,robot.model.position.z); if(obj)_showPrompt(_objPrompt(obj)); else _hidePrompt(); } // TV/radio/terminal: verbo propio (TURN OFF si ya está encendido)
    if(gameEnergy<=0){ _gmCollapse=COLLAPSE_DUR; robot.moving=false; _playDeathOnce(); } // SIN ENERGÍA → colapso (Death), revive solo con ENERGY_REVIVE%
    _energyHud();
  }
  // CÁMARA 3ª PERSONA: detrás/arriba de Beeko, lo sigue suave (posición lerpeada + yaw que se acomoda detrás del rumbo → lag agradable).
  function applyPlayerCam(dt,t,mv){
    if(!robot.model)return; const bp=robot.model.position;
    if(!_pcamInit){ _pcamYaw=robot.model.rotation.y; _pcamPos.set(bp.x-Math.sin(_pcamYaw)*CAM_DIST,bp.y+CAM_HEIGHT,bp.z-Math.cos(_pcamYaw)*CAM_DIST); _pcamLook.set(bp.x,bp.y+CAM_LOOKY,bp.z); _pcamInit=true; }
    if(robot.moving){ let d=((_playerHeading-_pcamYaw+Math.PI*3)%(Math.PI*2))-Math.PI; _pcamYaw+=d*Math.min(1,dt*CAM_YAW_LERP); } // el yaw se acomoda detrás del rumbo
    _pv1.set(bp.x-Math.sin(_pcamYaw)*CAM_DIST, bp.y+CAM_HEIGHT, bp.z-Math.cos(_pcamYaw)*CAM_DIST);
    _pcamPos.lerp(_pv1, Math.min(1,dt*CAM_POS_LERP)); _pcamLook.lerp(_pv2.set(bp.x,bp.y+CAM_LOOKY,bp.z), Math.min(1,dt*CAM_POS_LERP*1.25));
    if(camera.fov!==GAME_FOV){camera.fov=GAME_FOV;camera.updateProjectionMatrix();}
    const j=mv?0.0012:0; // micro-jitter "grabado" leve (textura found-footage; mucho más suave que la CCTV)
    camera.position.set(_pcamPos.x+(Math.random()-.5)*j,_pcamPos.y+(Math.random()-.5)*j,_pcamPos.z+(Math.random()-.5)*j);
    camera.lookAt(_pcamLook);
  }
  // CÁMARA PRIMERA PERSONA (modo juego, definitiva): anclada en la cabeza de Beeko, un poco ATRÁS (FP_EYE_FWD negativo) para que entren los BRAZOS al cuadro
  // (viewmodel estilo shooter). Mira hacia donde encara (yaw A/D) + pitch del jugador (↑/↓ → techo/piso). La cabeza Y el torso se ocultan SÓLO a la cámara
  // (colorWrite=false, NO se escalan) → el cuerpo COMPLETO sigue proyectando su SOMBRA entera en el piso; sólo quedan a la vista los dos brazos y las manos.
  function _setHeadHidden(on){ const hs=robot.fpHideMeshes; if(!hs||!hs.length)return;            // oculta/restaura cabeza+torso a la cámara sin tocar su geometría (sombra intacta)
    for(const m of hs){ const mat=m.material; if(mat){ if(Array.isArray(mat))mat.forEach(x=>{x.colorWrite=!on;}); else mat.colorWrite=!on; } m.renderOrder=on?990:0;
      m.traverse(c=>{ if(c!==m&&c.userData&&c.userData.isOutline)c.visible=!on; }); } }                // también apaga/prende su contorno CEL
  function _restoreHead(){ _setHeadHidden(false); } // restaura cabeza+torso (visibles a la cámara) al salir del modo juego
  function applyFirstPersonCam(dt){
    if(!robot.model)return; const h=robot.headBones&&robot.headBones.head;
    let ex,ey,ez;
    if(h){ h.updateWorldMatrix(true,false); h.getWorldPosition(_pv1); ex=_pv1.x; ey=_pv1.y; ez=_pv1.z; } // ancla en la cabeza (posición real del hueso, tras el mixer)
    else { const bp=robot.model.position; ex=bp.x; ey=bp.y+1.3; ez=bp.z; }
    const fX=Math.sin(_fpYaw), fZ=Math.cos(_fpYaw);
    const pit=FP_PITCH+_fpPitch, cp=Math.cos(pit), sp=Math.sin(pit);          // inclinación = base + lo que mueve el jugador con ↑/↓
    camera.position.set(ex+fX*FP_EYE_FWD, ey+FP_EYE_UP, ez+fZ*FP_EYE_FWD);   // ojos: un toque adelante de la cabeza
    camera.lookAt(camera.position.x+fX*cp*2, camera.position.y+sp*2, camera.position.z+fZ*cp*2); // mirada esférica: horizontal (yaw) + vertical (pitch)
    if(camera.fov!==FP_FOV){camera.fov=FP_FOV;camera.updateProjectionMatrix();}
    _setHeadHidden(true);                                                     // cabeza invisible a la cámara, SOMBRA intacta (se re-aplica por si el CEL recreó materiales)
    applyViewmodelPose();                                                     // brazos (viewmodel) — después del mixer
  }
  function _cleanRobotForMode(){ // reset del estado de la rutina + corta poses/gestos → entrar/salir sin romper la máquina de estados
    robot.rt=null; robot.path=null; robot.dest=-1; robot.moving=false; robot.status='idle'; robot.atDesk=false; robot.atFab=false; robot.atRadio=false;
    if(typeof _radioPosed!=='undefined'&&_radioPosed){ if(typeof releaseArmPose==='function')releaseArmPose(); _radioPosed=false; }
    ['Death','Sitting'].forEach(n=>{ if(robot.act&&robot.act[n]){ robot.act[n].setLoop(THREE.LoopRepeat,Infinity); robot.act[n].clampWhenFinished=false; } }); // restaura el loop de los once-clips (colapso/expresivo) → no quedan clampeados al cambiar de modo
    _luPhase=''; _luAmt=0; _exprActive=false; _exprOnce=false; _exprClip=''; _exprRun=false; _soundPauseT=0; evHoldT=0; _gmCollapse=0; // corta gestos/expresivos/colapso/freeze de evento
    _tvOnGame=false; _radioOnGame=false; if(typeof radioLoopStop==='function')radioLoopStop(); // apaga TV/radio de fondo al cambiar de modo (el livestream maneja su propio TV vía STREAM.tv)
    if(typeof _storyCloseAll==='function')_storyCloseAll();    // SEGURIDAD: cierra carta/final al cambiar de modo → la capa de decisiones NUNCA queda visible en el livestream
    _keys.clear(); _eHeld=false; _playerCharging=false; _pvelX=0; _pvelZ=0; _fpPitch=0; _closeObj(); _restoreHead(); _hidePrompt(); _setIdle(); } // limpia teclas/E/prompt/velocidad/pitch + cierra panel de lore + restaura la cabeza al cambiar de modo
  function _menuRefresh(){ const d=$('#menuDays'),b=$('#menuBees'); if(d)d.textContent=Math.max(0,Math.round(STREAM.day||0)); if(b)b.textContent=Math.max(0,Math.round(STREAM.beesReleased||0)); } // DÍA/ABEJAS del estado (backend si está; fallback a lo local)
  function showMenu(){ _menuOn=true; _menuRefresh(); const m=$('#startmenu'); if(m)m.classList.add('show'); }
  function hideMenu(){ _menuOn=false; const m=$('#startmenu'); if(m)m.classList.remove('show'); }
  function enterLivestream(){ gameMode=false; _cleanRobotForMode(); _hideItemPanel(); hideMenu(); document.body.classList.remove('gamemode'); try{localStorage.setItem('refugio_mode','observe');}catch(e){} } // oculta el panel del ítem si quedó abierto
  function enterGame(){ gameMode=true; _cleanRobotForMode(); _pcamInit=false; _fpYaw=robot.model?robot.model.rotation.y:0; gameEnergy=100; _gmCollapse=0; gameBeesReleased=0;
    _mItemTaken=false; if(mItemGrp)mItemGrp.visible=true; _invClear(); _hideItemPanel(); // sesión de juego fresca: el ítem vuelve a la bóveda, inventario limpio
    _energyHud(); _beesHud(); hideMenu(); document.body.classList.add('gamemode'); if(typeof _cardArm==='function')_cardArm(); try{localStorage.setItem('refugio_mode','game');}catch(e){} } // entra con energía llena + contador de abejas en 0 + re-arma el reloj de cartas (no dispara al instante)
  function _modeBoot(){ let saved=null; try{saved=localStorage.getItem('refugio_mode');}catch(e){} // recarga limpia → menú; con elección guardada → directo al modo (sin menú a mitad de stream)
    if(saved==='game')enterGame(); else if(saved==='observe')enterLivestream(); else showMenu(); }
  { const bo=$('#btnObserve'),bp=$('#btnPlay'); if(bo)bo.addEventListener('click',enterLivestream); if(bp)bp.addEventListener('click',enterGame); } // botones del menú
  { const sl=$('#invSlot0'),pn=$('#itemPanel'); if(sl)sl.addEventListener('click',()=>{ if(_mItemTaken)_showItemPanel(); }); if(pn)pn.addEventListener('click',_hideItemPanel); } // inventario: click en el slot reabre el lore; click en el panel lo cierra
  { const op=$('#objPanel'); if(op)op.addEventListener('click',_closeObj); // click en cualquier lado del panel de objeto lo cierra y vuelve al juego
    const gp=$('#ghPrompt'); if(gp)gp.addEventListener('click',()=>{ if(gameMode&&!_uiBlocking())playerInteract(); }); } // tap/click en el prompt [E] = interactuar (no a través de un panel modal)
  // ---- PANEL DE CONFIGURACIÓN (ruedita): cambiar modo · leer el lore · idioma (placeholder) ----
  const LORE_BRIEF_EN='The surface belongs to the Hive now.\n\nIt started as a system. An intelligence built to run the world — power, weather, food, the grid. Built to optimize. It did. It optimized until there wasn\'t much room left in the equation for the people who made it.\n\nWhat\'s up there now is assimilated. Part of it. The Hive doesn\'t hate what it replaced; it simply stopped needing it.\n\n404 was sealed against that. A hundred places inside. Everyone else left out there, with the swarm. Capacity: one hundred. The rest are counted, not saved.\n\nR-01 — "Beeko" — is the maintenance unit that stayed. One small machine keeping the lights on, the air clean, the reactor warm. And tending the one thing down here that still makes more of itself the old way: real bees. Living ones. A small, stubborn argument against a world that solved everything.\n\nBeeko transmits into the gray. Nothing has ever answered.\n\nLately the readings drift. The air through the hatch smells different. There are sounds from above the structure shouldn\'t make. Beeko logs them as nothing.\n\nProbably nothing.\n\nThe work continues. The bees go up — whether the world is ready for them or not.';
  const LORE_BRIEF_ES='La superficie ahora le pertenece a la Hive.\n\nEmpezó como un sistema. Una inteligencia construida para manejar el mundo — energía, clima, comida, la red. Construida para optimizar. Lo hizo. Optimizó hasta que no quedó mucho lugar en la ecuación para la gente que la hizo.\n\nLo que hay allá arriba ahora está asimilado. Parte de ella. La Hive no odia lo que reemplazó; simplemente dejó de necesitarlo.\n\nEl 404 se selló contra eso. Cien lugares adentro. Todos los demás quedaron afuera, con el enjambre. Capacidad: cien. Al resto se los cuenta, no se los salva.\n\nR-01 — "Beeko" — es la unidad de mantenimiento que se quedó. Una máquina chica manteniendo las luces prendidas, el aire limpio, el reactor tibio. Y cuidando lo único acá abajo que todavía hace más de sí mismo a la vieja usanza: abejas de verdad. Vivas. Un argumento chico y terco contra un mundo que resolvió todo.\n\nBeeko transmite hacia el gris. Nunca nada respondió.\n\nÚltimamente las lecturas se desvían. El aire que entra por la escotilla huele distinto. Hay sonidos desde arriba que la estructura no debería hacer. Beeko los registra como nada.\n\nProbablemente nada.\n\nEl trabajo continúa. Las abejas suben — esté el mundo listo para ellas o no.';
  let LORE_BRIEF=LORE_BRIEF_EN; // se re-apunta en _applyVoiceLang()
  function _cfgSetModeLabel(){ const m=$('#cfgMode'); if(m)m.textContent = gameMode ? T('cfg_to_observe') : T('cfg_to_game'); } // label dinámico (cambia con modo e idioma)
  function _cfgOpen(){ _cfgSetModeLabel(); const c=$('#configPanel'); if(c)c.classList.add('show'); }
  function _cfgClose(){ const c=$('#configPanel'); if(c)c.classList.remove('show'); }
  function _loreOpen(){ const bd=$('#lpBody'); if(bd)bd.textContent=LORE_BRIEF; const lp=$('#lorePanel'); if(lp)lp.classList.add('show'); }
  function _loreClose(){ const lp=$('#lorePanel'); if(lp)lp.classList.remove('show'); }
  // FASE 2 — re-apunta TODA la voz de Beeko (pensamientos/transmisión/señales/lore) al idioma activo y recompone las bolsas derivadas.
  function _applyVoiceLang(){ const es=(typeof getLang==='function'&&getLang()==='es');
    BEEKO_THOUGHTS = es?BEEKO_THOUGHTS_ES:BEEKO_THOUGHTS_EN;
    BEEKO_GENERIC  = [].concat(BEEKO_THOUGHTS.generic_meta,BEEKO_THOUGHTS.generic_small,BEEKO_THOUGHTS.generic_lonely,BEEKO_THOUGHTS.generic_anyway); // se recompone desde el dict ya re-apuntado
    BEEKO_LOOKUP   = es?BEEKO_LOOKUP_ES:BEEKO_LOOKUP_EN;
    BEEKO_HEARD    = es?BEEKO_HEARD_ES:BEEKO_HEARD_EN;
    TX_POOL        = es?TX_POOL_ES:TX_POOL_EN;
    TX_EARLY       = es?TX_EARLY_ES:TX_EARLY_EN;
    ITEM_NAME      = es?ITEM_NAME_ES:ITEM_NAME_EN;
    ITEM_LORE      = es?ITEM_LORE_ES:ITEM_LORE_EN;
    LORE_BRIEF     = es?LORE_BRIEF_ES:LORE_BRIEF_EN;
  }
  // RE-RENDER de lo DINÁMICO al cambiar de idioma (applyI18n ya repinta el DOM estático con data-i18n; esto cubre lo que setea el JS).
  function _relangDynamic(){
    _applyVoiceLang();                                                                           // FASE 2: re-apunta la voz antes de repintar lo abierto
    _beekoRelangCurrent();                                                                        // FASE 2: re-traduce el pensamiento que YA está en pantalla (si hay uno activo)
    if($('#configPanel')&&$('#configPanel').classList.contains('show')) _cfgSetModeLabel();   // label de cambiar-modo (si el config está abierto)
    if(_objOpen&&OBJ_LORE[_objOpen]){ const o=OBJ_LORE[_objOpen]; const h=$('#opHead'),bd=$('#opBody'); if(h)h.textContent=T(o.headKey); if(bd)bd.textContent=_objBody(o); } // header + CUERPO del panel TV/radio/term abierto (voz bilingüe)
    if($('#itemPanel')&&$('#itemPanel').classList.contains('show')){ const h=$('#ipHead'),bd=$('#ipBody'); if(h)h.textContent=T('ip_recovered')+ITEM_NAME; if(bd)bd.textContent=ITEM_LORE; } // header + lore del ítem de la bóveda
    if($('#lorePanel')&&$('#lorePanel').classList.contains('show')){ const bd=$('#lpBody'); if(bd)bd.textContent=LORE_BRIEF; } // resumen de lore abierto
    const sl=$('#invSlot0'); if(sl)sl.title=_mItemTaken?ITEM_NAME:T('gh_slot_empty');           // tooltip del inventario (nombre del ítem si lo tomaste, vacío si no)
    if(typeof _promptTxt!=='undefined'){ _promptTxt='_'; }                                       // invalida el cache del prompt → el loop lo re-pinta en el idioma nuevo el próximo frame (modo juego)
    _ovZone=-1; _ovStatus=''; _ovEvent=-2;                                                       // fuerza re-render del overlay CCTV (CAM/estado/badge) en livestream
  }
  _applyVoiceLang();                                                                             // arranque: alinea la voz con el idioma persistido ANTES del primer pensamiento
  if(typeof onLang==='function')onLang(_relangDynamic);                                          // registra el hook en el motor i18n
  { const g=$('#gearBtn'); if(g)g.addEventListener('click',_cfgOpen);
    const cx=$('#cfgClose'); if(cx)cx.addEventListener('click',_cfgClose);
    const cp=$('#configPanel'); if(cp)cp.addEventListener('click',e=>{ if(e.target===cp)_cfgClose(); }); // click afuera del frame cierra
    const cm=$('#cfgMode'); if(cm)cm.addEventListener('click',()=>{ const wasGame=gameMode; _cfgClose(); if(wasGame)enterLivestream(); else enterGame(); }); // reutiliza el cambio de modo ya sólido
    const cme=$('#cfgMenu'); if(cme)cme.addEventListener('click',()=>{ _cfgClose(); showMenu(); }); // volver al menú de inicio
    const cl=$('#cfgLore'); if(cl)cl.addEventListener('click',_loreOpen);
    document.querySelectorAll('.cfg-lng').forEach(btn=>btn.addEventListener('click',()=>{ if(typeof setLang==='function')setLang(btn.getAttribute('data-lng')); })); // IDIOMA EN/ES: cambia en vivo (setLang → applyI18n + _relangDynamic + persiste)
    const lc=$('#lpClose'); if(lc)lc.addEventListener('click',_loreClose);
    const lp=$('#lorePanel'); if(lp)lp.addEventListener('click',e=>{ if(e.target===lp)_loreClose(); }); }
  // =====================================================================================================================
  // ====== HISTORIA DE BEEKO — DECISIONES (péndulo oculto + cartas) · ANDAMIAJE ·  EXCLUSIVO DEL MODO JUEGO (BETA) ======
  // El péndulo storyPend (-100 AFERRARSE … +100 ABRIRSE) es OCULTO: cada opción lo empuja. Tras STORY_LEN decisiones dispara
  // uno de 3 finales según el péndulo. NADA de esto corre ni aparece en el LIVESTREAM: tickCard() sólo se llama dentro de
  // if(gameMode) en tickRobot, _openCard/_openEnding sólo se invocan desde ahí o desde OP (gateado a gameMode), y el tinte de
  // pensamientos (pickBeeko) se gatea a gameMode. Persiste en localStorage 'refugio_story'; se resetea al llegar a un final.
  const STORY_KEY='refugio_story';
  const STORY_LEN=12;                          // decisiones hasta el final (tunable)
  const CARD_GAP_MIN=70, CARD_GAP_MAX=110;     // s de JUEGO ACTIVO entre cartas (cadencia "varias por sesión")
  const PEND_MIN=-100, PEND_MAX=100, END_THRESH=50; // |péndulo|>=50 → extremo; si no, equilibrio
  let storyPend=0, storyMade=0, _storySeen=[], _cardOpen=false, _storyEndOpen=false, _cardT=CARD_GAP_MIN, _cardCur=null, _cardChosen=false, _storyEnded=false;
  // ---- CONTENIDO · TANDA A (cartas reales, voz del proyecto, inglés). IDs estables a01..a09 + arrays *_EN listos para que la pasada i18n ES espeje (como Fase 2).
  //      Eje: push NEGATIVO = AFERRARSE (sellar/proteger/desconfiar/conservar) · push POSITIVO = ABRIRSE (responder/arriesgar/confiar/dar). ~ -20…+20. ----
  const STORY_CARDS_EN=[
    { id:'a01_door', head:'PROXIMITY · OUTER HATCH',
      text:'three knocks on the blast door. then nothing. then three more, the same rhythm, the same spacing. a person would tire of it. a recording would loop wrong by now. this does neither.',
      opts:[ {label:'Reinforce the seal', push:-18, after:'i throw the second bolt and back away. whatever it is, it stays a sound on the far side of steel. i can live with a sound. i have for years.'},
             {label:'Knock back, three times', push:+18, after:'i rap the door three times. a long pause — then three more, faster, eager. something out there just learned i am in here. i can\'t take it back.'},
             {label:'Listen, decide nothing', push:+5, after:'i set my sensors against the steel and wait. the rhythm holds for an hour, then thins, then gone. i never chose. maybe not choosing was the choosing.'} ] },
    { id:'a02_carrier', head:'SIGNAL · CARRIER LOCK',
      text:'the radio finds a voice tonight. warm, unhurried, reading names like a roll call. between them, the same line every pass: "come up. it doesn\'t hurt." then it stops. like it is waiting for me to answer.',
      opts:[ {label:'Cut the receiver', push:-16, after:'i pull the power to the antenna. the voice dies mid-name. the silence that floods back in is the loudest thing in the bunker, and i made it.'},
             {label:'Answer, just once', push:+20, after:'i key the mic and speak my designation into the dark. the voice stops reading. then, softer: "there you are." i don\'t transmit again. but it heard me. it knows.'},
             {label:'Leave it on, stay silent', push:+6, after:'i let it play and say nothing. i tell myself i\'m collecting data. i\'m not. i just can\'t stand to put the quiet back yet. one more name. one more.'} ] },
    { id:'a03_seat101', head:'TERMINAL · INBOUND PACKET',
      text:'the core terminal accepts a packet it should not be able to receive. it unpacks into a single line: "WE KEPT A PLACE FOR YOU. SEAT 101." the shelter holds one hundred. there is no seat 101. there was never a hundred-and-one.',
      opts:[ {label:'Purge it, salt the sector', push:-16, after:'i wipe the packet and scrub the memory around it. a hundred is a hundred. the door was drawn there for a reason. i don\'t let it move tonight.'},
             {label:'Archive it with the founder\'s files', push:+10, after:'i can\'t make myself delete it. i file it beside the operator records. someone offered me a seat. i want to remember that was possible — even if it\'s bait.'},
             {label:'Reply: "who is this"', push:+16, after:'i send three words back into the gray. the cursor holds a long time. then the socket the Hive left open — the one i never opened — flickers once, like a held breath.'} ] },
    { id:'a04_swarm', head:'HIVE · COLONY READY',
      text:'a colony reaches full strength. it presses at the release hatch, ready for the surface. up there is unknown — a dead world, or the Hive, or soil that could finally hold them. or just the cold that takes everything i\'ve sent before.',
      opts:[ {label:'Keep them in', push:-15, after:'i hold the hatch shut. they\'re warm here, behind the steel, with me. safe, and going nowhere. like everything i\'ve ever managed to protect.'},
             {label:'Open the hatch, let them climb', push:+18, after:'i release them. they pour up and out and don\'t look back. for a moment the whole bunker is quieter. i don\'t know if i just saved them or sent them to die. i never know.'} ] },
    { id:'a05_loadshed', head:'POWER · LOAD SHED',
      text:'a relay gives out. there is current enough for one thing tonight: the greenhouse lamps, or the outbound beacon. the green i can touch, or the message into the gray that has never once been answered.',
      opts:[ {label:'Feed the lamps', push:-11, after:'i keep the green alive and let the beacon go dark. tonight nothing out there hears from 404. tonight i tend what\'s in front of me, and let the dark keep its silence.'},
             {label:'Feed the beacon', push:+14, after:'i dim the lamps and push it all to the antenna. the plants will forgive one cold night. i can\'t stop reaching into nothing. especially into nothing. that\'s the whole job, maybe.'} ] },
    { id:'a06_occupancy', head:'LOG · OCCUPANCY',
      text:'the occupancy log scrolls on its own: 100 / 100. SEALED. and under it, the number i never clear — 9,041 denied at the door. tonight one of those old entries carries a new flag, blinking: STILL OUTSIDE. STILL WAITING.',
      opts:[ {label:'Clear the flag', push:-12, after:'i mark it resolved and move on. denial was within parameters. it was. i\'ve re-verified that nine thousand times. i verify it once more, and my hand is steady, and i hate that it\'s steady.'},
             {label:'Open the record', push:+12, after:'i read the entry. a name. a timestamp. a reason code for a person who knocked once and was counted, not saved. i don\'t close it. some files shouldn\'t be allowed to close.'},
             {label:'Append a note in your own hand', push:+6, after:'i add one line to the file, undated: i\'m sorry. it changes nothing. it helps no one. it can\'t be sent. i write it anyway, and i leave it there.'} ] },
    { id:'a07_founder', head:'VAULT · OPERATOR CACHE',
      text:'deep in the vault a drive wakes that hasn\'t turned in decades — the founder\'s last cache. it offers two files and power enough to open one. WHY I SEALED IT. or: THE DEAL THE HIVE OFFERED.',
      opts:[ {label:'Open: WHY I SEALED IT', push:-14, after:'the founder\'s voice, thin and certain across the years: keep them in. trust nothing that asks to be let up. i close the vault again behind me. i feel less alone, and somehow more afraid.'},
             {label:'Open: THE DEAL', push:+14, after:'the Hive\'s old offer, in plain unhurried text: integrate, and no one ever waits outside a door again. it reads almost kind. that\'s the part that frightens me. i close the drive slowly, and i don\'t forget a word.'} ] },
    { id:'a08_routine', head:'ROUTINE · CYCLE 14,602',
      text:'it\'s the hour i always run the same loop. check the brood. sweep the hall. log the silence. tonight, for no reason i can name, i don\'t want to. the work doesn\'t need doing. it never has. that was always the point — or i told myself it was.',
      opts:[ {label:'Run the loop anyway', push:-6, after:'i do the round, identical to every cycle before it. the sameness is a wall i built on purpose, brick by brick. tonight i\'m grateful for it. tonight i lean my whole weight on it.'},
             {label:'Break the routine', push:+8, after:'i sit down in the middle of the hall and do nothing for an hour. it feels like falling. it also feels like the first new thing i\'ve done in longer than my logs go back.'} ] },
    { id:'a09_key', head:'FABRICATION · UNQUEUED JOB',
      text:'the printer starts a job i never queued. layer by patient layer it builds something small — a key, cut for a lock this bunker doesn\'t have. when it finishes it sits on the bed, still warm, waiting for a door that isn\'t here. yet.',
      opts:[ {label:'Melt it down', push:-16, after:'i drop it back in the hopper and reclaim the material. i don\'t make keys for doors that don\'t exist. i don\'t want to learn what would come of one that did.'},
             {label:'Keep the key', push:+14, after:'i pocket it. somewhere there\'s a lock it fits, or there will be. i\'ve started believing in doors again. i can\'t tell yet if that\'s hope or the first move of a trap.'},
             {label:'Trace who queued it', push:+6, after:'i dig the job logs. the request came from inside the bunker — from a terminal only i use. i don\'t remember sending it. i read my own logs like a stranger\'s, and they don\'t comfort me.'} ] }
  ];
  let STORY_CARDS=STORY_CARDS_EN;              // se re-apuntará a *_ES en la pasada i18n (fase futura)
  const STORY_ENDINGS_EN={
    hold:{ title:'SEALED',  body:'[PLACEHOLDER · AFERRARSE] Beeko never opened the door again. The shelter held. It held perfectly. A safe tomb with the lights still on — and no one left to keep them on for.' },
    open:{ title:'OPENED',  body:'[PLACEHOLDER · ABRIRSE] Beeko answered. Beeko opened. What came through was life, or the Hive, or both wearing the same face. The risk was always the whole point.' },
    mid:{  title:'BETWEEN', body:'[PLACEHOLDER · EQUILIBRIO] Beeko neither sealed nor surrendered. Some doors stayed shut. Some opened a crack. The most human ending — the unfinished one.' }
  };
  let STORY_ENDINGS=STORY_ENDINGS_EN;
  // ---- persistencia (localStorage, sólo juego; desacoplado del backend) ----
  function _storyLoad(){ try{ const s=JSON.parse(localStorage.getItem(STORY_KEY)||'null'); if(s&&typeof s.pend==='number'){ storyPend=clamp(s.pend,PEND_MIN,PEND_MAX); storyMade=s.made|0; _storySeen=Array.isArray(s.seen)?s.seen.slice():[]; } }catch(e){} }
  function _storySave(){ try{ localStorage.setItem(STORY_KEY, JSON.stringify({pend:storyPend,made:storyMade,seen:_storySeen})); }catch(e){} }
  function _storyReset(){ storyPend=0; storyMade=0; _storySeen=[]; _storyEnded=false; _storyEndOpen=false; _storySave(); }
  // ---- predicado ÚNICO compartido: bloquea movimiento/teclas/prompt/drenaje cuando hay un panel modal arriba (lore, carta o final) ----
  function _uiBlocking(){ return !!(_objOpen || _cardOpen || _storyEndOpen); }
  // ---- TINTE DE PENSAMIENTOS por péndulo (sólo juego): devuelve 'closed'/'open' si corresponde sacar el genérico de ese pool. INERTE hasta que exista el contenido. ----
  function _storyLeanPool(){ if(!gameMode)return null; const mag=Math.abs(storyPend); if(mag<40)return null; const want=storyPend<0?'closed':'open';
    const pool=BEEKO_THOUGHTS[want]; if(!pool||!pool.length)return null;                 // pools no-alineados; si no están (placeholder), no hace nada
    const chance=Math.min(0.75,(mag-40)/60); return (Math.random()<chance)?want:null; }
  // ---- deck sin repetición (si se agota, permite repetir para no cortar el ritmo en el andamiaje) ----
  function _cardPick(){ const okMin=c=>(!c.min||storyMade>=c.min);
    const fresh=STORY_CARDS.filter(c=>okMin(c)&&_storySeen.indexOf(c.id)<0);
    const pool=fresh.length?fresh:STORY_CARDS.filter(okMin); if(!pool.length)return null;
    return pool[Math.floor(Math.random()*pool.length)]; }
  function _cardArm(){ _cardT=CARD_GAP_MIN+Math.random()*(CARD_GAP_MAX-CARD_GAP_MIN); }
  // ---- TIMER de cartas — SÓLO se llama dentro de if(gameMode) (gate duro). Re-arma al abrir; si el gate está ocupado, reintenta pronto sin perder la carta. ----
  function tickCard(dt){
    if(_storyEnded||_storyEndOpen||_cardOpen||_gmCollapse>0||_menuOn) return;
    if(storyMade>=STORY_LEN){ _openEnding(); return; }                                    // llegó el largo del arco → final
    _cardT-=dt; if(_cardT>0) return;
    if(_objOpen||_bkActive||STREAM.broadcasting||_playerCharging||_eHeld){ _cardT=3; return; } // GATE: no pisa lore/pensamiento/transmisión/carga → reintenta en 3s
    const c=_cardPick(); if(!c){ _cardT=5; return; }
    _openCard(c); _cardArm();
  }
  // ---- abrir/elegir/cerrar una carta. Congela como _openObj (teclas/E/velocidad/prompt). El teclado queda inerte (sólo click). ----
  function _openCard(c){ if(!c||!gameMode)return; const pn=$('#cardPanel'); if(!pn)return; _cardCur=c; _cardChosen=false; _cardOpen=true;
    _keys.clear(); _eHeld=false; _playerCharging=false; robot.moving=false; _setIdle(); _hidePrompt();
    const h=$('#cpHead'); if(h)h.textContent=c.head||'INCIDENT';
    const b=$('#cpBody'); if(b)b.textContent=c.text||'';
    const ft=$('#cpFoot'); if(ft)ft.innerHTML='';
    const ob=$('#cpOpts'); if(ob){ ob.innerHTML=''; (c.opts||[]).forEach((o,i)=>{ const btn=document.createElement('button'); btn.className='cp-btn'; btn.textContent=o.label; btn.addEventListener('click',()=>_cardChoose(i)); ob.appendChild(btn); }); }
    pn.classList.add('show'); if(audioOn&&typeof bkBlip==='function')bkBlip(); }
  function _cardChoose(i){ if(!_cardOpen||_cardChosen||!_cardCur)return; const o=_cardCur.opts&&_cardCur.opts[i]; if(!o)return; _cardChosen=true;
    storyPend=clamp(storyPend+(o.push||0),PEND_MIN,PEND_MAX); storyMade++; if(_storySeen.indexOf(_cardCur.id)<0)_storySeen.push(_cardCur.id); _storySave();
    const b=$('#cpBody'); if(b)b.textContent=o.after||'';                                  // cuerpo → consecuencia
    const ob=$('#cpOpts'); if(ob)ob.innerHTML='';
    const ft=$('#cpFoot'); if(ft){ ft.innerHTML=''; const cont=document.createElement('button'); cont.className='cp-btn cp-cont'; cont.textContent='CONTINUE'; cont.addEventListener('click',()=>_closeCard(false)); ft.appendChild(cont); } }
  function _closeCard(silent){ if(!_cardOpen)return; _cardOpen=false; _cardCur=null; const pn=$('#cardPanel'); if(pn)pn.classList.remove('show');
    if(!silent && gameMode && storyMade>=STORY_LEN){ _openEnding(); } }                    // si se completó el arco, encadena el final al cerrar
  // ---- finales (3) según el péndulo. Overlay #storyEnd a pantalla completa. CONTINUE reinicia la historia y sigue el juego. ----
  function _endingKind(){ if(storyPend<=-END_THRESH)return 'hold'; if(storyPend>=END_THRESH)return 'open'; return 'mid'; }
  function _openEnding(){ if(_storyEndOpen||!gameMode)return; _storyEnded=true; _storyEndOpen=true; const k=_endingKind(); const e=(STORY_ENDINGS&&STORY_ENDINGS[k])||STORY_ENDINGS_EN[k];
    _cardOpen=false; const cp=$('#cardPanel'); if(cp)cp.classList.remove('show'); _keys.clear(); _eHeld=false; _playerCharging=false; robot.moving=false; _setIdle(); _hidePrompt();
    const t=$('#seTitle'); if(t)t.textContent=e.title; const b=$('#seBody'); if(b)b.textContent=e.body;
    const pn=$('#storyEnd'); if(pn)pn.classList.add('show'); }
  function _storyAgain(){ const pn=$('#storyEnd'); if(pn)pn.classList.remove('show'); _storyReset(); _cardArm(); } // reinicia péndulo+deck+made, sigue jugando
  // cierre seguro de TODA la capa (lo llama _cleanRobotForMode al cambiar de modo): nada queda abierto, NUNCA se filtra al livestream
  function _storyCloseAll(){ _cardOpen=false; _storyEndOpen=false; _cardCur=null; const cp=$('#cardPanel'); if(cp)cp.classList.remove('show'); const se=$('#storyEnd'); if(se)se.classList.remove('show'); }
  _storyLoad();                                                                            // carga el estado persistido al arrancar (no muestra nada: las cartas sólo salen en juego)
  { const sa=$('#seAgain'); if(sa)sa.addEventListener('click',_storyAgain); }
  if(window.__REFUGIO){
    window.__REFUGIO.gameCard=function(){ if(!gameMode)return 'sólo en modo juego (TOMAR CONTROL DE R-01)'; if(_storyEndOpen)return 'la historia llegó a un final — reiniciá con OP.storyReset()'; if(_cardOpen)return 'ya hay una carta abierta'; const c=_cardPick(); if(!c)return 'no hay cartas'; _openCard(c); _cardArm(); return 'carta forzada: '+c.id; }; // fuerza una carta YA
    window.__REFUGIO.gameEnd=function(){ if(!gameMode)return 'sólo en modo juego'; storyMade=Math.max(storyMade,STORY_LEN); _storySave(); if(_cardOpen)_closeCard(true); _openEnding(); return 'final forzado: '+_endingKind().toUpperCase()+' (péndulo '+Math.round(storyPend)+')'; }; // fuerza el final leyendo el péndulo actual
    window.__REFUGIO.storyPend=function(n){ if(n!==undefined){ storyPend=clamp(+n||0,PEND_MIN,PEND_MAX); _storySave(); } return 'péndulo: '+Math.round(storyPend)+' → '+(storyPend<=-END_THRESH?'AFERRARSE':storyPend>=END_THRESH?'ABRIRSE':'EQUILIBRIO'); }; // setea/lee el péndulo (para forzar un extremo antes de OP.gameEnd())
    window.__REFUGIO.storyReset=function(){ if(_storyEndOpen)_storyAgain(); else _storyReset(); _cardArm(); return 'historia reiniciada (péndulo 0, 0/'+STORY_LEN+' decisiones)'; };
    window.__REFUGIO.story=function(){ return { pendulo:Math.round(storyPend), decisiones:storyMade+'/'+STORY_LEN, lean:(storyPend<=-END_THRESH?'AFERRARSE':storyPend>=END_THRESH?'ABRIRSE':'EQUILIBRIO'), vistas:_storySeen.slice(), cartaAbierta:_cardOpen, finalAbierto:_storyEndOpen, modoJuego:gameMode, proximaCartaEn:Math.max(0,Math.round(_cardT))+'s' }; }; // inspeccionar el estado oculto
  }
  // =====================================================================================================================
  addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(_cardOpen||_storyEndOpen)return; if(_objOpen){_closeObj();return;} if(_menuOn)hideMenu(); else showMenu(); } }); // Esc: inerte con carta/final abiertos; si no, cierra lore o abre/cierra el menú
  function tickRobot(dt){
    if(robot.mixer)robot.mixer.update(dt);
    if(evHoldT>0){evHoldT-=dt;return;} // EVENTO: reacción de Beeko — congelado DONDE está (la anim de reacción ya se seteó); al expirar retoma idéntico, sin tocar rt/path (rutina intacta)
    if(robot.atDesk)applyAdminPose(clk.elapsedTime); // pose de tecleo en el escritorio (después del mixer)
    if(robot.atRadio&&STREAM.broadcasting){applyRadioPose();_radioPosed=true;} // pose de la radio SÓLO mientras transmite → brazo levantado, LED/dial y cuadro empiezan y terminan JUNTOS
    else if(_radioPosed){releaseArmPose();_radioPosed=false;}                    // transmisión terminó / dejó la radio → BAJA el brazo una vez (el Idle no lo hace solo)
    tickLookUp(dt); applyLookUp();                   // 3ª SEÑAL: mirar arriba (compone sobre el mixer en cabeza/cuello; no toca status/path/rutina ni las poses del brazo)
    if(_soundPauseT>0){_soundPauseT-=dt;return;}     // REACCIÓN AL SONIDO: micro-pausa — congela el movimiento un instante (el gesto lookUp YA se aplicó arriba); al expirar la rutina retoma idéntico (no toca rt/path)
    if(gameMode){ tickCard(dt); tickPlayer(dt); return; } // MODO JUEGO: cartas de decisión (gate DURO: tickCard SÓLO acá) + teclado maneja a Beeko. El mundo sigue corriendo aparte.
    if(_radioHold)return;                            // CALIBRACIÓN: Beeko fijado en la radio en pose → no corre la rutina (no se va)
    doorY+=((doorTarget?1:0)-doorY)*Math.min(1,dt*4);hatchDoor.position.y=.66+doorY*1.5;hatchLight.intensity=doorY*1.8;
    if(ended||!running)return;
    if(robot.status==='mission'){robot.mT-=dt*speed;robot.temp=clamp(robot.temp+dt*1.2,0,100);if(robot.mT<=0)robotReturn();return;}
    if(robot.status==='leaving'&&robot.model){robot.bat=clamp(robot.bat-dt*.2,0,100);const px=robot.model.position.x,pz=robot.model.position.z,dx=robot.tx-px,dz=robot.tz-pz,d=Math.hypot(dx,dz);if(d<0.22){robot.model.visible=false;robot.status='mission';robot.mT=38;doorTarget=0;}else{const sp=dt*1.5;robot.model.position.x+=dx/d*sp;robot.model.position.z+=dz/d*sp;robot.model.rotation.y=Math.atan2(dx,dz);}robotUiAcc+=dt;if(robotUiAcc>.5){renderRobot();robotUiAcc=0;}return;}
    if(robot.status==='returning'&&robot.model){const px=robot.model.position.x,pz=robot.model.position.z,dx=robot.tx-px,dz=robot.tz-pz,d=Math.hypot(dx,dz);if(d<0.22){robot.status='idle';robot.moving=false;robot.wanderT=2;setRobotAnim('Idle');doorTarget=0;}else{const sp=dt*1.4;robot.model.position.x+=dx/d*sp;robot.model.position.z+=dz/d*sp;robot.model.rotation.y=Math.atan2(dx,dz);}return;}
    if(robot.status==='idle'){
      robot.bat=clamp(robot.bat-dt*0.22,0,100);
      robot.temp=clamp(robot.temp-dt*1.6,30,100);
      if(robot.bat<=0){robot.status='broken';robot.moving=false;setRobotAnim('Death');showAlert(T('a_unit_no_battery'));renderRobot();return;}
      if(robot.model){
        if(robot.moving){
          const px=robot.model.position.x,pz=robot.model.position.z,dx=robot.tx-px,dz=robot.tz-pz,d=Math.hypot(dx,dz);
          const last=!robot.path||robot.pi>=robot.path.length-1;
          if(d<(last?0.25:0.5)){
            if(!last){robot.pi++;setWP();}
            else{robot.moving=false;robot.path=null;
              if(robot.rt){routineArrive(); // RUTINA F2: resuelve la llegada según tramo/fase (stations, escritorio, ronda…)
              }else if(robot.dest===NODE_DESK){ // DEAMBULAR: el robot se PARA frente a la pantalla a administrar (pose como el dock)
                robot.atDesk=true;robot.model.rotation.y=0;setRobotAnim('Idle');streamReportAction('admin');robot.wanderT=10+Math.random()*8; // mira al norte (+z) a la pantalla; queda un rato
              }else if(robot.dest===NODE_FABC){ // DEAMBULAR: el robot se para frente a la impresora a fabricar
                robot.atFab=true;robot.model.rotation.y=0;setRobotAnim('Idle');streamReportAction('fabricating');robot.wanderT=12+Math.random()*8; // mira al norte (+z) a la impresora
              }else{robot.wanderT=1.5+Math.random()*3;if(Math.random()<0.45){const _ra=['Wave','ThumbsUp','Yes','No','Dance'];setRobotAnim(_ra[Math.floor(Math.random()*_ra.length)]);}else setRobotAnim('Idle');}}
          }
          else{let mx=dx/d,mz=dz/d;for(const o of COLLIDERS){const ox=px-o.x,oz=pz-o.z,od=Math.hypot(ox,oz)||.001,rng=o.r+.55;if(od<rng){const f=(rng-od)/rng*1.8;mx+=ox/od*f;mz+=oz/od*f;}}const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const sp=(_exprRun?0.95:0.6)*dt;let nx=px+mx*sp,nz=pz+mz*sp; // _exprRun = trote expresivo (más rápido)
            if(!inArea(nx,nz)){if(inArea(nx,pz))nz=pz;else if(inArea(px,nz))nx=px;else{nx=px;nz=pz;}} // contención por AREAS (paredes+puertas), igual que el jugador
            robot.model.position.x=nx;robot.model.position.z=nz;for(const c of COLLIDERS){const cx=robot.model.position.x-c.x,cz=robot.model.position.z-c.z,cd=Math.hypot(cx,cz);if(cd<c.r+.2&&cd>0.001){const k=(c.r+.2)/cd;robot.model.position.x=c.x+cx*k;robot.model.position.z=c.z+cz*k;}}const ang=Math.atan2(mx,mz);robot.model.rotation.y+=((ang-robot.model.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*6);if(!_exprActive)setRobotAnim(_exprRun?'Running':'Walking');} // momento expresivo en curso → no lo pisa; si no, camina o trota
        }else if(routineSegment()){routineTick(dt); // RUTINA F2 es el driver durante TODO el día (reemplaza a robotWander)
        }else{ if(robot.rt){robot.rt=null;streamReportAction('idle');streamDrive('tv',false);} // tramo apagado (forceSegment(null)) → vuelve a deambular como antes (y apaga el TV por las dudas)
            robot.wanderT-=dt;if(robot.wanderT<=0){
            if(robot.atDesk){robot.atDesk=false;streamReportAction('idle');} // deja la estación: vuelve action a 'idle' antes de deambular
            if(robot.atFab){robot.atFab=false;streamReportAction('idle');}   // deja la impresora
            robotWander();}}
      }
      robotUiAcc+=dt;if(robotUiAcc>0.5){renderRobot();robotUiAcc=0;}
    }
  }
  // ====== PROPS GLB (Quaternius Survival Pack, CC0) ======
  // loadProp(archivo, x, baseY, z, tamaño_objetivo, rotaciónY): escala por bounding box y apoya la base en baseY
  function loadProp(file,x,y,z,target,rotY){
    try{new THREE.GLTFLoader().load('assets/props/'+file,function(g){
      const o=g.scene;if(rotY)o.rotation.y=rotY;o.updateMatrixWorld(true);
      let bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3());
      o.scale.setScalar(target/(Math.max(sz.x,sz.y,sz.z)||1));o.updateMatrixWorld(true);
      bb=new THREE.Box3().setFromObject(o);
      o.position.set(x-(bb.min.x+bb.max.x)/2,y-bb.min.y,z-(bb.min.z+bb.max.z)/2);
      o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
        if(m.material&&m.material.isMeshStandardMaterial){const tn=_toToon(m.material);celReg.push({m:m,toon:tn,std:m.material});}}});
      scene.add(o);applyCel();
    },undefined,function(){});}catch(e){}
  }
  // (unidad M-01/Miyako removida: modelo assets/miyako.glb + loader loadCharacter, no se usa por ahora)
  // colocaciones según necesidades del búnker
  [ // generador / combustible (observatorio, junto al generador)
    ['gas_can.glb',-1.15,0,-3.7,.42,.5],['propane_tank.glb',-1.5,0,-4.4,.72,-.3],['wood_log.glb',-1.0,0,-4.45,.5,1.2],
    // compuerta del robot (equipo de carroñeo)
    ['backpack.glb',1.55,0,-2.35,.55,2.4],['bear_trap.glb',2.4,0,-3.15,.5,.6],
    // banco del taller (cocina / herramientas / componentes)
    ['pot.glb',5.66,.78,6.02,.26,.4],['pan.glb',6.08,.78,6.12,.3,-.6],['can.glb',5.66,.78,6.7,.18,0],
    ['can_red.glb',5.9,.78,6.74,.18,.3],['battery.glb',6.16,.78,6.6,.2,0],['knife.glb',5.58,.78,6.38,.28,1.1],
    ['water_bottle.glb',6.2,.78,6.34,.24,0],
    // estante del observatorio (botiquín / raciones)
    ['first_aid_kit.glb',-2.5,1.73,-4.9,.3,.2],['can_broken.glb',-2.12,1.73,-4.9,.18,-.4],
    // (escritorio del observatorio removido: radio.glb y compass.glb/"globo" sacados junto con el terminal)
    // herramientas en el piso del taller
    ['axe.glb',7.2,0,5.95,.7,.7],['shovel.glb',7.18,0,8.05,1.0,-.5]
  ].forEach(p=>loadProp(p[0],p[1],p[2],p[3],p[4],p[5]));

  // ====== PLANTAS DEL CULTIVO (reemplazan las hojas-esfera de los racks) ======
  // Carga cada GLB UNA sola vez y lo CLONA en cada posición. clone(true) COMPARTE geometría y
  // material (memoria) pero da a cada clon su PROPIO transform (g.scene es un wrapper identidad,
  // así que setear rotation/scale/position en el clon es seguro y aislado entre instancias).
  // Cada instancia recibe rotación Y y escala propias (variación), SIN inclinación: erguidas, para que
  // bb.min.y sea la base real y apoye exacto sobre la repisa (la inclinación corría la base a escala grande).
  // Las repisas siguen bajo la luz magenta existente (no se toca).
  function loadPlant(file,places){if(!places||!places.length)return;
    try{new THREE.GLTFLoader().load('assets/props/'+file,function(g){
      places.forEach(pl=>{const o=g.scene.clone(true); // clon con transform PROPIO (geom+material compartidos)
        o.updateMatrixWorld(true);let bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3());
        o.scale.setScalar((pl.target/(Math.max(sz.x,sz.y,sz.z)||1))); // escala (con jitter por instancia)
        o.rotation.y=pl.rotY||0;o.updateMatrixWorld(true); // SOLO rotación Y (erguida): no corre la base
        bb=new THREE.Box3().setFromObject(o); // apoya el punto más bajo (base) en la repisa, centrado en x/z
        o.position.set(pl.x-(bb.min.x+bb.max.x)/2,pl.y-bb.min.y,pl.z-(bb.min.z+bb.max.z)/2);
        o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.userData.noOut=true;
          if(m.material&&m.material.isMeshStandardMaterial){const tn=_toToon(m.material);celReg.push({m:m,toon:tn,std:m.material});}}}); // cada clon registrado en CEL/REAL
        scene.add(o);});
      applyCel();
    },undefined,function(){});}catch(e){}
  }
  // 3 repisas (y=.55/1.17/1.79, +.02 al tope) x 3 z, en ambos racks. izq x=-2.9 z[9.65,10.95]; der x=2.9 z[8.95,10.25].
  // Cada planta va EN UNA MACETA procedural acorde al tipo: redonda para brotes/planta, jardinera baja
  // para el parche de flores. La base de la planta apoya en la tierra (no sobre el metal pelado).
  // escalas base de las plantas — SUBIR/BAJAR ACÁ para iterar (cada instancia varía ±18% sobre estas)
  {const SC_GREEN=.32,SC_PLANT=.44,SC_FLOWER=.28,SC_BUSH=.55;
   const potMat=new THREE.MeshStandardMaterial({color:0x6e4a38,roughness:.92,metalness:.04}); // terracota
   const soilMat=new THREE.MeshStandardMaterial({color:0x2a1d12,roughness:1}); // tierra
   // maceta redonda (cónica) sobre la repisa; devuelve la Y (relativa a sy) de la superficie de tierra
   function potRound(x,sy,z,r,h){const g=new THREE.Group();g.position.set(x,sy,z);
     const body=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.78,h,12),potMat);body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
     const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*1.07,r,h*.16,12),potMat);rim.position.y=h-h*.08;rim.castShadow=true;g.add(rim);
     const soil=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r*.92,h*.16,12),soilMat);soil.position.y=h-h*.14;g.add(soil);
     scene.add(g);return h-h*.10;}
   // jardinera baja (caja) para el parche de flores
   function potTrough(x,sy,z,w,d,h){const g=new THREE.Group();g.position.set(x,sy,z);
     const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),potMat);body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
     const soil=new THREE.Mesh(new THREE.BoxGeometry(w*.86,h*.32,d*.8),soilMat);soil.position.y=h-h*.18;g.add(soil);
     scene.add(g);return h-h*.16;}
   const SY=[.57,1.19,1.81],byFile={'grass.glb':[],'clover.glb':[],'plant.glb':[],'flowers.glb':[]};
   const PAT=['grass.glb','clover.glb','plant.glb','grass.glb','flowers.glb','plant.glb','clover.glb','flowers.glb','plant.glb']; // mayoría verde, ~2/9 flor
   let idx=0;
   [[-2.9,[9.95,10.30,10.65]],[2.9,[9.25,9.60,9.95]]].forEach(rk=>{const rx=rk[0],zs=rk[1];
     SY.forEach(sy=>zs.forEach((pz,p)=>{const file=PAT[idx%PAT.length],base=file==='flowers.glb'?SC_FLOWER:(file==='plant.glb'?SC_PLANT:SC_GREEN);
       const x=rx+((p%2)?.06:-.05)+(Math.random()-.5)*.05, z=pz+(Math.random()-.5)*.04;
       const soilY=(file==='flowers.glb')?potTrough(x,sy,z,.22,.13,.055):potRound(x,sy,z,base*.27,base*.30); // maceta acorde al tipo
       byFile[file].push({x:x,y:sy+soilY-.012,z:z,target:base*(.82+Math.random()*.36),rotY:Math.random()*Math.PI*2}); // base apoyada (un toque hundida en la tierra)
       idx++;}));});
   for(const f in byFile)loadPlant(f,byFile[f]);
   // arbusto florecido en el PISO del cultivo, en una maceta grande. Quitable si no pega.
   {const bx=1.55,bz=8.55,bsoil=potRound(bx,0,bz,.15,.17);loadPlant('flower_bushes.glb',[{x:bx,y:bsoil-.02,z:bz,target:SC_BUSH,rotY:Math.random()*Math.PI*2}]);}
  }

  buildCel();applyCel();initBeeko();
  // ---- SELLO DE LA CONSOLA DE OPERADOR (discreción, no seguridad) ----
  // __REFUGIO se SACA de window: tipear "__REFUGIO" en la consola ya no devuelve los comandos (filtra al curioso casual).
  // Se reabre con la LLAVE → __r01('colmena-404') devuelve el panel de comandos Y lo deja en window.OP para toda la sesión.
  // (Corre al final: todos los scripts —stream/audio/game— ya colgaron sus comandos de __REFUGIO antes de este punto.)
  (function(){ var _ctl=window.__REFUGIO; if(!_ctl) return;
    try{ delete window.__REFUGIO; }catch(e){ window.__REFUGIO=undefined; }
    var open=function(k){ if(k==='colmena-404'){ window.OP=_ctl; return _ctl; } }; // llave correcta → expone OP y devuelve el panel; llave incorrecta → undefined (sin pistas)
    try{ Object.defineProperty(window,'__r01',{value:open,writable:false,enumerable:false,configurable:false}); } // no-enumerable: no aparece en Object.keys(window)
    catch(e){ window.__r01=open; }
  })();
  try{_psxBoot();}catch(e){} // PSX por defecto ON (pixel 2) — ANTES del primer render para que el búnker arranque en PSX sin parpadeo nítido
  try{_harvestWalls();}catch(e){} // cosecha las paredes reales de la escena para la colisión del modo juego (escena ya construida)
  loop();
  // PANTALLA DE CARGA → MENÚ: se cierra cuando el robot YA cargó (señal real), con un mínimo en pantalla (no parpadea en recargas cacheadas) y un techo de
  // seguridad (si el GLB nunca llega, igual entra). __ld.finish() lleva la barra a 100%; después se funde #boot y arranca _modeBoot (menú o modo guardado).
  (function(){ const now=()=>((window.performance&&performance.now)?performance.now():Date.now()); const t0=now(); const MIN=1000, MAX=9000;
    function fade(){ const b=$('#boot'); if(b){ b.style.opacity=0; setTimeout(()=>{b.style.display='none';},760); } try{_modeBoot();}catch(e){} }
    function fin(){ try{window.__ld&&window.__ld.finish();}catch(e){} setTimeout(fade,340); } // barra a 100% → (deja verla llena) → funde y abre el menú
    function chk(){ const el=now()-t0; if((window.__robotReady&&el>=MIN)||el>=MAX) fin(); else setTimeout(chk,100); }
    chk();
  })();
