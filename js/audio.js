// EL BÚNKER — audio (WebAudio)
  // ---- AUDIO ----
  let actx=null,master=null,audioOn=false,noiseBuf=null,whisperG=null,humG=null;
  const HUM_BASE=.5; // gain de reposo del zumbido del generador (para el duck del fallo eléctrico)
  // VOLÚMENES por sonido (0..~1, ajustables en vivo con __REFUGIO.vol('paso',0.08)). 'master' = volumen general.
  // step/creak = pasos y crujidos de Beeko. El resto son los SFX existentes (cada función multiplica por su entrada).
  const AVOL={master:.55, step:.20, creak:.13, camclick:1, flap:1, blip:1, bkblip:1, alarm:1, rumble:1, thud:1};
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
