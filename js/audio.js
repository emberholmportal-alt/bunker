// EL BÚNKER — audio (WebAudio)
  // ---- AUDIO ----
  let actx=null,master=null,audioOn=false,noiseBuf=null,whisperG=null,humG=null;
  const HUM_BASE=.5; // gain de reposo del zumbido del generador (para el duck del fallo eléctrico)
  // VOLÚMENES por sonido (0..~1, ajustables en vivo con __REFUGIO.vol('paso',0.08)). 'master' = volumen general.
  // step/creak = pasos y crujidos de Beeko. El resto son los SFX existentes (cada función multiplica por su entrada).
  const AVOL={master:.55, step:.20, creak:.13, camclick:1, flap:1, blip:1, bkblip:1, alarm:1, rumble:1, thud:1, radioin:1, ambient:1};
  function mkNoise(){const b=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
  function startAudio(){if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;actx=new AC();noiseBuf=mkNoise();
      master=actx.createGain();master.gain.value=0;master.connect(actx.destination);
      humG=actx.createGain();humG.gain.value=HUM_BASE;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=140;humG.connect(f);f.connect(master);
      [55,82.5].forEach((hz,i)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=hz;if(i)o.detune.value=6;const g=actx.createGain();g.gain.value=i?.25:.5;o.connect(g);g.connect(humG);o.start();});
      const airG=actx.createGain();airG.gain.value=.12;const ns=actx.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500;ns.connect(lp);lp.connect(airG);airG.connect(master);ns.start();
      whisperG=actx.createGain();whisperG.gain.value=0;const wn=actx.createBufferSource();wn.buffer=noiseBuf;wn.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=6;wn.connect(bp);bp.connect(whisperG);whisperG.connect(master);wn.start();
    }
    actx.resume();master.gain.cancelScheduledValues(actx.currentTime);master.gain.linearRampToValueAtTime(AVOL.master,actx.currentTime+.4);audioOn=true;}
  function stopAudio(){if(!actx)return;master.gain.cancelScheduledValues(actx.currentTime);master.gain.linearRampToValueAtTime(0,actx.currentTime+.3);audioOn=false;}
  function alarm(){if(!audioOn||!actx)return;const t=actx.currentTime;[0,.4].forEach(off=>{[660,510].forEach((hz,i)=>{const o=actx.createOscillator();o.type='square';o.frequency.value=hz;const g=actx.createGain();g.gain.setValueAtTime(0,t+off+i*.2);g.gain.linearRampToValueAtTime(.18*AVOL.alarm,t+off+i*.2+.02);g.gain.linearRampToValueAtTime(0,t+off+i*.2+.18);o.connect(g);g.connect(master);o.start(t+off+i*.2);o.stop(t+off+i*.2+.2);});});}
  function rumble(){if(!audioOn||!actx)return;const t=actx.currentTime;const s=actx.createBufferSource();s.buffer=noiseBuf;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=90;const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5*AVOL.rumble,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.8);s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+.85);}
  function thud(){if(!audioOn||!actx)return;const t=actx.currentTime;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(40,t+.18);const g=actx.createGain();g.gain.setValueAtTime(.35*AVOL.thud,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(master);o.start(t);o.stop(t+.3);}
  function blip(){if(!audioOn||!actx)return;const t=actx.currentTime;const o=actx.createOscillator();o.type='triangle';o.frequency.value=880;const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12*AVOL.blip,t+.01);g.gain.linearRampToValueAtTime(0,t+.1);o.connect(g);g.connect(master);o.start(t);o.stop(t+.12);}
  // BLIP del cuadro de diálogo de Beeko: MUY sutil (suena UNA vez al aparecer el cuadro). Chirp electrónico tenue con leve subida de tono
  // + un armónico apenas perceptible (textura "máquina/CRT"). Ataque suave para que NO sea un beep duro de videojuego (aparece seguido).
  function bkBlip(){if(!audioOn||!actx)return;const t=actx.currentTime;const v=.05*AVOL.bkblip;
    const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(560,t);o.frequency.linearRampToValueAtTime(720,t+.07);     // tono base: leve subida (señal "mensaje")
    const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0005,t+.13);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+.15);
    const o2=actx.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(1120,t);o2.frequency.linearRampToValueAtTime(1440,t+.07); // armónico tenue (textura electrónica)
    const g2=actx.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(v*.4,t+.012);g2.gain.exponentialRampToValueAtTime(.0004,t+.1);
    o2.connect(g2);g2.connect(master);o2.start(t);o2.stop(t+.12);}
  // FALLO ELÉCTRICO: 'duck' del zumbido del generador. genDuck(level[,ramp]) lleva el gain del hum a 'level' (default=reposo HUM_BASE).
  function genDuck(level,ramp){if(!actx||!humG)return;const t=actx.currentTime,L=(level===undefined)?HUM_BASE:Math.max(0,level),r=ramp||.3;humG.gain.cancelScheduledValues(t);humG.gain.setValueAtTime(Math.max(.0001,humG.gain.value),t);humG.gain.linearRampToValueAtTime(Math.max(.0001,L),t+r);}
  // clic eléctrico (relé/breaker) — para el corte y el reencendido del fallo eléctrico
  function eclick(){if(!audioOn||!actx)return;const t=actx.currentTime;const o=actx.createOscillator();o.type='square';o.frequency.setValueAtTime(2400,t);o.frequency.exponentialRampToValueAtTime(380,t+.045);const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.13,t+.003);g.gain.exponentialRampToValueAtTime(.0008,t+.07);o.connect(g);g.connect(master);o.start(t);o.stop(t+.08);
    const s=actx.createBufferSource();s.buffer=noiseBuf;const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=2000;const g2=actx.createGain();g2.gain.setValueAtTime(.10,t);g2.gain.exponentialRampToValueAtTime(.0006,t+.05);s.connect(hp);hp.connect(g2);g2.connect(master);s.start(t);s.stop(t+.06);}
  // ---- BEEKO CAMINANDO: pasos metálicos sutiles (sincronizados con la animación de caminar) + crujidos del cuerpo (robot viejo/oxidado) ----
  // Tono: tenue/lejano, como captado por el micrófono de una cámara de seguridad en un búnker silencioso. Gateados igual que el resto
  // (si el audio no está activado no suenan ni fallan). Volumen por AVOL.step / AVOL.creak.
  function step(){if(!audioOn||!actx)return;const t=actx.currentTime;
    const s=actx.createBufferSource();s.buffer=noiseBuf;s.playbackRate.value=.8+Math.random()*.3;                 // cuerpo: golpe sordo y lejano (ruido lowpass)
    const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=330+Math.random()*120;
    const g=actx.createGain();const v=AVOL.step*(.8+Math.random()*.4);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.0005,t+.09);
    s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+.1);
    const s2=actx.createBufferSource();s2.buffer=noiseBuf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1850+Math.random()*900;bp.Q.value=2.2; // tap metálico muy tenue
    const g2=actx.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(AVOL.step*.35,t+.002);g2.gain.exponentialRampToValueAtTime(.0004,t+.03);
    s2.connect(bp);bp.connect(g2);g2.connect(master);s2.start(t);s2.stop(t+.035);}
  function creak(){if(!audioOn||!actx)return;const t=actx.currentTime,dur=.34+Math.random()*.34;               // crujido/chirrido de metal viejo (saw filtrado con leve subida de tono)
    const o=actx.createOscillator();o.type='sawtooth';const f0=150+Math.random()*120;
    o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f0*(1.05+Math.random()*.20),t+dur);
    const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420+Math.random()*280;bp.Q.value=4+Math.random()*4;
    const g=actx.createGain();const v=AVOL.creak*(.6+Math.random()*.5);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+dur*.4);g.gain.exponentialRampToValueAtTime(.0006,t+dur);
    o.connect(bp);bp.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);}
  // click mecánico del tablero split-flap (ráfaga corta de ruido filtrado)
  function flap(n){if(!audioOn||!actx)return;const t=actx.currentTime;const s=actx.createBufferSource();s.buffer=noiseBuf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2100+Math.random()*700+Math.min(n||1,6)*40;bp.Q.value=1.1;const g=actx.createGain();const vol=Math.min(.045,.014+(n||1)*.005)*AVOL.flap;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0006,t+.06);s.connect(bp);bp.connect(g);g.connect(master);s.start(t);s.stop(t+.07);} // tick del contador de pared: muy sutil (reloj de fondo en sala vacía)
  // "chunk" de conmutación de la multiplexora CCTV (relé/switch): suena UNA vez por corte de cámara.
  // Más "switch" que el flap: cuerpo lowpass seco + tick de contacto agudo. Sutil (audio de fondo).
  // Gateado igual que el resto: si el audio no está habilitado, no suena ni falla (política de autoplay).
  function camClick(){if(!audioOn||!actx)return;const t=actx.currentTime;
    const s=actx.createBufferSource();s.buffer=noiseBuf;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=820+Math.random()*160; // cuerpo "chunk" del relé
    const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06*AVOL.camclick,t+.002);g.gain.exponentialRampToValueAtTime(.0005,t+.045);
    s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+.06);
    const s2=actx.createBufferSource();s2.buffer=noiseBuf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2500;bp.Q.value=1.5; // tick del contacto
    const g2=actx.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.03*AVOL.camclick,t+.001);g2.gain.exponentialRampToValueAtTime(.0004,t+.02);
    s2.connect(bp);bp.connect(g2);g2.connect(master);s2.start(t);s2.stop(t+.03);}
  // ---- RADIO: SEÑAL ENTRANTE (2ª señal del despertar). TODO GENERADO (sin archivos): la radio "recibe" algo de afuera.
  // Carácter por ETAPA: 1=estática que sube y corta + UN beep aislado (ambiguo) · 2=estática CON patrón rítmico (beeps que se repiten)
  // · 3=estática densa multicapa + patrón complejo/irregular. Respeta AVOL.radioin. Todo se programa de una con el reloj del AudioContext
  // (robusto a caídas de fps); radioInGain permite CORTAR al instante si arranca una transmisión (TX tiene prioridad, no se solapan).
  let radioInGain=null;
  function _radioInInit(){ if(!actx||radioInGain)return; radioInGain=actx.createGain(); radioInGain.gain.value=1; radioInGain.connect(master); }
  function radioInStop(){ if(!actx||!radioInGain)return; const t=actx.currentTime; radioInGain.gain.cancelScheduledValues(t); radioInGain.gain.setValueAtTime(Math.max(.0001,radioInGain.gain.value),t); radioInGain.gain.linearRampToValueAtTime(0,t+.12); } // corte rápido (preempción del TX)
  function _rinStatic(t0,dur,peak){ const s=actx.createBufferSource();s.buffer=noiseBuf;s.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1300+Math.random()*500;bp.Q.value=.7; // ráfaga de estática que sube y cae
    const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(peak,t0+dur*.34);g.gain.linearRampToValueAtTime(peak*.55,t0+dur*.72);g.gain.linearRampToValueAtTime(0,t0+dur);
    s.connect(bp);bp.connect(g);g.connect(radioInGain);s.start(t0);s.stop(t0+dur+.05); }
  function _rinBeep(t0,freq,dur,vol){ const o=actx.createOscillator();o.type='square';o.frequency.value=freq;const g=actx.createGain(); // beep/tono (señal intencional)
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.008);g.gain.setValueAtTime(vol,t0+Math.max(.02,dur-.02));g.gain.linearRampToValueAtTime(0,t0+dur);
    o.connect(g);g.connect(radioInGain);o.start(t0);o.stop(t0+dur+.02); }
  // programa el evento de recepción completo de una ETAPA (estática + beeps según el carácter). dur = duración en segundos.
  function radioReceive(stage,dur){ if(!audioOn||!actx)return; _radioInInit(); if(!radioInGain)return;
    const t=actx.currentTime, V=AVOL.radioin; radioInGain.gain.cancelScheduledValues(t); radioInGain.gain.setValueAtTime(1,t);
    // HOOK FUTURO (NO construido): voz/música real interceptada. El día de mañana, _radioInClip(stage) (en game.js) devolverá un buffer/clip
    // y acá se reproduce en vez de —o encima de— la estática sintética. Hoy el enganche queda listo y comentado:
    // try{ const clip=(typeof _radioInClip==='function')&&_radioInClip(stage); if(clip){ const cs=actx.createBufferSource(); cs.buffer=clip; cs.connect(radioInGain); cs.start(t); } }catch(e){}
    if(stage>=3){ _rinStatic(t,dur,.12*V); _rinStatic(t+dur*.16,dur*.62,.08*V);                              // densa, multicapa
      const pat=[0,.42,.7,1.18,1.4,1.92,2.34,2.5,2.96]; for(let r=0;r*3.3<dur;r++){const o=r*3.3;pat.forEach((b,i)=>{if(o+b<dur-.1)_rinBeep(t+o+b,540+((i*97)%430),.09+(i%3)*.03,.10*V);});} }
    else if(stage>=2){ _rinStatic(t,dur,.09*V); const step=.34;                                              // estática + patrón rítmico (repite)
      for(let k=0;.4+k*step<dur-.2;k++){ if(k%4===0||k%4===1) _rinBeep(t+.4+k*step,880,.13,.09*V); } }
    else { _rinStatic(t,dur,.07*V); _rinBeep(t+dur*.46,740,.16,.07*V); }                                     // etapa 1: estática + UN beep aislado
  }
  // ---- SONIDOS SIN FUENTE (4ª señal del despertar). TODO GENERADO. Algo que NO tiene fuente visible en el búnker — viene de arriba/afuera,
  // "a través del concreto": cada sonido pasa por un bus con LOWPASS (rolloff de agudos) + REVERB sintética (IR de ruido decreciente) → suena
  // LEJANO y amortiguado, NUNCA nítido. Respeta AVOL.ambient (cada sonido multiplica por él, así OP.vol('ambient',x) afecta en vivo). 4 tipos:
  // creak (asentamiento profundo) · thud (golpe lejano, con patrón en etapas altas) · drag (arrastre, barrido de ruido) · scratch (raspado "vivo").
  let ambBus=null, ambConv=null;
  function _ambIR(){ const len=Math.floor(actx.sampleRate*2.2), buf=actx.createBuffer(2,len,actx.sampleRate);   // impulso de reverb: ruido con decaimiento exponencial → espacio grande/lejano
    for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++){const e=Math.pow(1-i/len,2.6);d[i]=(Math.random()*2-1)*e;}} return buf; }
  function _ambInit(){ if(!actx||ambBus)return;
    ambBus=actx.createGain(); ambBus.gain.value=1;                                                              // nodo sumador (el volumen va por sonido, vía AVOL.ambient)
    const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1100; lp.Q.value=.4; ambBus.connect(lp); // muffle "a través del concreto"
    const dry=actx.createGain(); dry.gain.value=.45; lp.connect(dry); dry.connect(master);                      // dry tenue
    ambConv=actx.createConvolver(); ambConv.buffer=_ambIR(); const wet=actx.createGain(); wet.gain.value=.95;   // wet (reverb) = distancia/espacio
    lp.connect(ambConv); ambConv.connect(wet); wet.connect(master); }
  function _ambNoise(){ const s=actx.createBufferSource(); s.buffer=noiseBuf; s.loop=true; return s; }
  function ambientCreak(t0){ if(!audioOn||!actx)return; _ambInit(); const t=t0||actx.currentTime, V=AVOL.ambient, dur=1.1+Math.random()*1.3; // asentamiento profundo/lejano (saw grave, bandpass bajo, env lento)
    const o=actx.createOscillator(); o.type='sawtooth'; const f0=42+Math.random()*34; o.frequency.setValueAtTime(f0,t); o.frequency.linearRampToValueAtTime(f0*(1.04+Math.random()*.12),t+dur);
    const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=150+Math.random()*120; bp.Q.value=5+Math.random()*5;
    const g=actx.createGain(); const v=.16*V; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+dur*.45); g.gain.exponentialRampToValueAtTime(.0006,t+dur);
    o.connect(bp); bp.connect(g); g.connect(ambBus); o.start(t); o.stop(t+dur+.05); }
  function _ambThudOne(t,V){ const o=actx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(58,t); o.frequency.exponentialRampToValueAtTime(28,t+.22); // impacto grave amortiguado
    const g=actx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.5*V,t+.012); g.gain.exponentialRampToValueAtTime(.0005,t+.5); o.connect(g); g.connect(ambBus); o.start(t); o.stop(t+.55);
    const s=actx.createBufferSource(); s.buffer=noiseBuf; const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=200;  // transitorio de cuerpo (polvo/impacto)
    const g2=actx.createGain(); g2.gain.setValueAtTime(.25*V,t); g2.gain.exponentialRampToValueAtTime(.0004,t+.12); s.connect(lp); lp.connect(g2); g2.connect(ambBus); s.start(t); s.stop(t+.14); }
  function ambientThud(stage,t0){ if(!audioOn||!actx)return; _ambInit(); const t=t0||actx.currentTime, V=AVOL.ambient; _ambThudOne(t,V);
    if(stage>=2 && Math.random()<.6){ const n=stage>=3?(2+Math.floor(Math.random()*2)):1; let off=0; for(let k=0;k<n;k++){off+=.34+Math.random()*.3; _ambThudOne(t+off,V*(.8-k*.12));} } } // PATRÓN en etapas altas (golpes que se repiten)
  function ambientDrag(t0){ if(!audioOn||!actx)return; _ambInit(); const t=t0||actx.currentTime, V=AVOL.ambient, dur=2.8+Math.random()*2.2; // algo pesado arrastrándose: ruido con bandpass que BARRE + env lenta
    const s=_ambNoise(); const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.6;
    bp.frequency.setValueAtTime(180,t); bp.frequency.linearRampToValueAtTime(420+Math.random()*200,t+dur*.6); bp.frequency.linearRampToValueAtTime(150,t+dur); // barrido = desplazamiento
    const g=actx.createGain(); const v=.13*V; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+dur*.3); g.gain.linearRampToValueAtTime(v*.7,t+dur*.7); g.gain.linearRampToValueAtTime(0,t+dur);
    const lfo=actx.createOscillator(); lfo.type='sine'; lfo.frequency.value=7+Math.random()*5; const lg=actx.createGain(); lg.gain.value=v*.4; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t+dur+.05); // fricción (AM) = textura de raspe
    s.connect(bp); bp.connect(g); g.connect(ambBus); s.start(t); s.stop(t+dur+.05); }
  function ambientScratch(t0){ if(!audioOn||!actx)return; _ambInit(); const t=t0||actx.currentTime, V=AVOL.ambient, dur=1.4+Math.random()*1.6; // algo "vivo" raspando: ruido HF, modulado en ráfagas IRREGULARES
    const s=_ambNoise(); const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1700+Math.random()*700; bp.Q.value=3.5;
    const g=actx.createGain(); g.gain.setValueAtTime(.0002,t); g.connect(ambBus); s.connect(bp); bp.connect(g);
    let tt=t; const v=.09*V; while(tt<t+dur){ const on=.04+Math.random()*.09, off=.02+Math.random()*.10;        // ráfagas de rasguño (cada una sube y cae) → orgánico/irregular
      g.gain.setValueAtTime(.0002,tt); g.gain.linearRampToValueAtTime(v*(.5+Math.random()*.7),tt+on*.4); g.gain.exponentialRampToValueAtTime(.0006,tt+on); tt+=on+off; }
    s.start(t); s.stop(t+dur+.05); }
  function ambientSound(type,stage){ if(!audioOn||!actx)return;                                                  // dispatcher (lo llaman el controlador del juego y OP.sfx)
    switch(type){ case 'creak': return ambientCreak(); case 'thud': return ambientThud(stage||1); case 'drag': return ambientDrag(); case 'scratch': return ambientScratch(); } }
  // Comandos de operador para volúmenes (se suman al __REFUGIO del backbone). vol() lista; vol('master',.7) ajusta.
  if(window.__REFUGIO){
    window.__REFUGIO.vol=function(name,v){ if(name===undefined) return Object.assign({},AVOL);
      if(!(name in AVOL)) return 'sonidos: '+Object.keys(AVOL).join(', ');
      AVOL[name]=Math.max(0,+v||0);
      if(name==='master'&&actx&&master&&audioOn){master.gain.cancelScheduledValues(actx.currentTime);master.gain.linearRampToValueAtTime(AVOL.master,actx.currentTime+.12);}
      return AVOL[name]; };
    window.__REFUGIO.volumes=function(){return Object.assign({},AVOL);};
    window.__REFUGIO.audio=function(){return {on:audioOn, ctx:actx?actx.state:'none', volumes:Object.assign({},AVOL)};}; // estado del audio (encendido / estado del AudioContext)
  }
