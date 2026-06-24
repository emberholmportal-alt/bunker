// EL BÚNKER — audio (WebAudio)
  // ---- AUDIO ----
  let actx=null,master=null,audioOn=false,noiseBuf=null,whisperG=null;
  function mkNoise(){const b=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
  function startAudio(){if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;actx=new AC();noiseBuf=mkNoise();
      master=actx.createGain();master.gain.value=0;master.connect(actx.destination);
      const humG=actx.createGain();humG.gain.value=.5;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=140;humG.connect(f);f.connect(master);
      [55,82.5].forEach((hz,i)=>{const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=hz;if(i)o.detune.value=6;const g=actx.createGain();g.gain.value=i?.25:.5;o.connect(g);g.connect(humG);o.start();});
      const airG=actx.createGain();airG.gain.value=.12;const ns=actx.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500;ns.connect(lp);lp.connect(airG);airG.connect(master);ns.start();
      whisperG=actx.createGain();whisperG.gain.value=0;const wn=actx.createBufferSource();wn.buffer=noiseBuf;wn.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1200;bp.Q.value=6;wn.connect(bp);bp.connect(whisperG);whisperG.connect(master);wn.start();
    }
    actx.resume();master.gain.cancelScheduledValues(actx.currentTime);master.gain.linearRampToValueAtTime(.55,actx.currentTime+.4);audioOn=true;}
  function stopAudio(){if(!actx)return;master.gain.cancelScheduledValues(actx.currentTime);master.gain.linearRampToValueAtTime(0,actx.currentTime+.3);audioOn=false;}
  function alarm(){if(!audioOn||!actx)return;const t=actx.currentTime;[0,.4].forEach(off=>{[660,510].forEach((hz,i)=>{const o=actx.createOscillator();o.type='square';o.frequency.value=hz;const g=actx.createGain();g.gain.setValueAtTime(0,t+off+i*.2);g.gain.linearRampToValueAtTime(.18,t+off+i*.2+.02);g.gain.linearRampToValueAtTime(0,t+off+i*.2+.18);o.connect(g);g.connect(master);o.start(t+off+i*.2);o.stop(t+off+i*.2+.2);});});}
  function rumble(){if(!audioOn||!actx)return;const t=actx.currentTime;const s=actx.createBufferSource();s.buffer=noiseBuf;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=90;const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.8);s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+.85);}
  function thud(){if(!audioOn||!actx)return;const t=actx.currentTime;const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(40,t+.18);const g=actx.createGain();g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(master);o.start(t);o.stop(t+.3);}
  function blip(){if(!audioOn||!actx)return;const t=actx.currentTime;const o=actx.createOscillator();o.type='triangle';o.frequency.value=880;const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.01);g.gain.linearRampToValueAtTime(0,t+.1);o.connect(g);g.connect(master);o.start(t);o.stop(t+.12);}
  // click mecánico del tablero split-flap (ráfaga corta de ruido filtrado)
  function flap(n){if(!audioOn||!actx)return;const t=actx.currentTime;const s=actx.createBufferSource();s.buffer=noiseBuf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2100+Math.random()*700+Math.min(n||1,6)*40;bp.Q.value=1.1;const g=actx.createGain();const vol=Math.min(.045,.014+(n||1)*.005);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0006,t+.06);s.connect(bp);bp.connect(g);g.connect(master);s.start(t);s.stop(t+.07);} // tick del contador de pared: muy sutil (reloj de fondo en sala vacía)
  // "chunk" de conmutación de la multiplexora CCTV (relé/switch): suena UNA vez por corte de cámara.
  // Más "switch" que el flap: cuerpo lowpass seco + tick de contacto agudo. Sutil (audio de fondo).
  // Gateado igual que el resto: si el audio no está habilitado, no suena ni falla (política de autoplay).
  function camClick(){if(!audioOn||!actx)return;const t=actx.currentTime;
    const s=actx.createBufferSource();s.buffer=noiseBuf;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=820+Math.random()*160; // cuerpo "chunk" del relé
    const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.002);g.gain.exponentialRampToValueAtTime(.0005,t+.045);
    s.connect(lp);lp.connect(g);g.connect(master);s.start(t);s.stop(t+.06);
    const s2=actx.createBufferSource();s2.buffer=noiseBuf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2500;bp.Q.value=1.5; // tick del contacto
    const g2=actx.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(.03,t+.001);g2.gain.exponentialRampToValueAtTime(.0004,t+.02);
    s2.connect(bp);bp.connect(g2);g2.connect(master);s2.start(t);s2.stop(t+.03);}
