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

  // ---- RADIO (interferencia) ----
  let radioGain=null,radioOn=false,radioLED=null;
  const RADIO_MSGS=['…REFUGIO 048… ¿alguien copia?…','…la consciencia no se detuvo en la frontera…','…no abran la compuerta… repito: no abran…','…éramos noventa mil… ahora somos parte de ÉL…','…contá los que entraron… contálos…','…48 cadenas caídas… cuarenta y ocho…','…cada HOLDER es una persona ahí afuera…','…el enjambre aprende… el enjambre espera…'];
  let radioMsgT=0,radioMsgI=0;
  const radioGrp=new THREE.Group();
  radioGrp.add(new THREE.Mesh(new THREE.BoxGeometry(.34,.2,.16),new THREE.MeshStandardMaterial({color:0x6b5a3a,roughness:.7,metalness:.2})));
  const _rsp=new THREE.Mesh(new THREE.CircleGeometry(.06,16),new THREE.MeshStandardMaterial({color:0x2a241c,roughness:1}));_rsp.position.set(-.08,0,.081);radioGrp.add(_rsp);
  const _rd=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.02,12),new THREE.MeshStandardMaterial({color:0xcaa54a,metalness:.7,roughness:.3}));_rd.rotation.x=Math.PI/2;_rd.position.set(.1,.02,.081);radioGrp.add(_rd);
  const _ra=new THREE.Mesh(new THREE.CylinderGeometry(.004,.002,.34,6),new THREE.MeshStandardMaterial({color:0x999999,metalness:.8}));_ra.position.set(.14,.24,-.04);_ra.rotation.z=-.3;radioGrp.add(_ra);
  radioLED=new THREE.Mesh(new THREE.SphereGeometry(.013,8,8),new THREE.MeshStandardMaterial({color:0xff3030,emissive:0xff2020,emissiveIntensity:1.2}));radioLED.position.set(.1,-.05,.082);radioGrp.add(radioLED);
  radioGrp.position.set(1.95,.8,2.5);radioGrp.rotation.y=-.5;scene.add(radioGrp);
  box(.5,.78,.42,1.95,.39,2.55,steelMat);
  function initRadio(){if(!actx||radioGain)return;const src=actx.createBufferSource();src.buffer=noiseBuf;src.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1650;bp.Q.value=1.1;radioGain=actx.createGain();radioGain.gain.value=0;src.connect(bp);bp.connect(radioGain);radioGain.connect(master);src.start();}
  function radioTune(){if(!audioOn){showAlert('ENCENDÉ EL SONIDO PRIMERO');return;}initRadio();radioOn=!radioOn;if(radioGain)radioGain.gain.linearRampToValueAtTime(radioOn?.06:0,actx.currentTime+.2);if(radioOn){radioMsgT=1.4;showAlert('RADIO — sintonizando…');}else showAlert('RADIO APAGADA');}
  function radioTick(dt,t){if(!radioLED)return;radioLED.material.emissiveIntensity=radioOn?(.3+Math.abs(Math.sin(t*9))*1.7):(.25+Math.random()*.5);
    if(radioOn&&running&&!ended){radioMsgT-=dt;if(radioMsgT<=0){radioMsgT=7+Math.random()*5;showAlert(RADIO_MSGS[radioMsgI%RADIO_MSGS.length]);radioMsgI++;
      if(audioOn&&radioGain&&actx){const tt=actx.currentTime;radioGain.gain.cancelScheduledValues(tt);radioGain.gain.setValueAtTime(.06,tt);radioGain.gain.linearRampToValueAtTime(.14,tt+.15);radioGain.gain.linearRampToValueAtTime(.06,tt+.9);}blip();}}}
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
  let chargeFillG=null,chargeNumX=null,chargeNumTex=null,_chargeShown=-1,dockHaze=null,dockGlow=null,chargeLeds=[];
  let diagRT=null,diagScene=null,diagCam=null,diagPivot=null; // pantalla de diagnóstico (render-to-texture del robot girando)
  // ---- COLMENA (HIVE): enjambre de abejas (Points) + contadores. El enjambre LEE STREAM.bees; los contadores LEEN STREAM.beesReleased.
  let beeSwarm=null,beeData=[],beeNumX=null,beeNumTex=null,_beesRelShown=-1,hiveGlow=null,hiveHaze=null;
  const BEES_MAX=80, hiveC=new THREE.Vector3(0,1.3,14.4); // pool del enjambre y centro de órbita (frente a la colmena)
  // ---- FASE 2 · TRAMO COLMENA (rutina de stations + liberación de enjambre). Corrida única → variación con Math.random. ----
  let _forceSeg=undefined;                 // testeo: undefined=auto(hora) · null=off(deambula) · 'colmena'=forzar el tramo
  let beeReleaseT=0,_beesResetPending=false;
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
    dockGlow=new THREE.PointLight(0x39ffd0,1.1,3.2,2);dockGlow.position.set(-6.0,1.0,1.1);scene.add(dockGlow); // glow del acople
    dockHaze=new THREE.Mesh(new THREE.SphereGeometry(.55,12,12),new THREE.MeshBasicMaterial({color:0x39ffd0,transparent:true,opacity:.12,depthWrite:false}));dockHaze.position.set(-6.0,.9,1.1);scene.add(dockHaze); // vapor/halo barato
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
        poster.position.set(-4.65,1.42,-0.83);poster.rotation.z=0.02; // muro norte (cara interior z≈-0.85) mirando al sur (+z); leve torcido = "lo colgaron hace mucho"
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
    const goldMat=new THREE.MeshStandardMaterial({map:tex(grime('#8a6d2e'),1),normalMap:_wn,color:0x9a7a34,metalness:.5,roughness:.66}); // dorado apagado y sucio
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
    // (3) HOARD DE ORO — pirámide de lingotes MATE contra el muro sur/SE (el botín principal)
    function goldBar(g,x,y,z,rot){const b=meshBox(.2,.075,.11,x,y,z,goldMat);b.rotation.y=rot;b.castShadow=true;g.add(b);}
    {const g=new THREE.Group();g.position.set(6.3,0,12.2);scene.add(g);
      const rows=[[0,4],[.08,3],[.16,2],[.24,1]];                // pirámide 4·3·2·1
      for(const zoff of[0,.27])for(const r of rows)for(let i=0;i<r[1];i++)goldBar(g,(i-(r[1]-1)/2)*.235,.04+r[0],zoff,(Math.random()-.5)*.14);}
    // (4) MONEDAS — pilas de cilindros + derrame en el piso
    {const g=new THREE.Group();g.position.set(5.1,0,12.05);scene.add(g);
      const stack=(sx,sz,n)=>{for(let i=0;i<n;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.014,16),coinMat);c.position.set(sx,.02+i*.014,sz);c.castShadow=true;g.add(c);}};
      stack(-.2,0,8);stack(-.08,.06,5);stack(.03,-.05,9);stack(.15,.05,4);
      for(let i=0;i<9;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.058,.058,.014,16),coinMat);c.rotation.x=Math.PI/2;c.rotation.z=Math.random()*3;c.position.set(.18+Math.random()*.5,.008,-.12+Math.random()*.4);c.castShadow=true;g.add(c);}}
    // (5) FAJOS DE BILLETES — ladrillos verdosos con faja, apilados + un par caídos
    {const g=new THREE.Group();g.position.set(4.9,0,13.0);scene.add(g);
      const bundle=(bx,by,bz,rot)=>{const b=meshBox(.16,.06,.08,bx,by,bz,billMat);b.rotation.y=rot;b.castShadow=true;g.add(b);const bd=meshBox(.162,.062,.022,bx,by,bz,bandMat);bd.rotation.y=rot;g.add(bd);};
      for(let r=0;r<3;r++)for(let i=0;i<3-r;i++)bundle(-.18+i*.17+r*.085,.035+r*.062,0,(Math.random()-.5)*.1);
      bundle(.3,.035,.12,.5);bundle(.18,.035,.22,-.3);}
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
    const vCold=new THREE.PointLight(0x8a98b0,.55,7,2);vCold.position.set(VX+.3,CH-.4,VZ);scene.add(vCold);
    const vWarm=new THREE.SpotLight(0xffb43a,1.25,5.5,Math.PI/5,.55,1.5);vWarm.position.set(3.5,1.7,14.35);vWarm.target.position.set(6.0,.5,12.6);scene.add(vWarm);scene.add(vWarm.target); // haz por la puerta (NO) hacia el oro
    const vGlint=new THREE.PointLight(0xffd98a,.42,3.2,2);vGlint.position.set(6.2,.95,12.4);scene.add(vGlint); // realce del oro (sutil, no casino)
    {const haze=new THREE.Mesh(new THREE.SphereGeometry(.9,12,12),new THREE.MeshBasicMaterial({color:0xffb43a,transparent:true,opacity:.05,depthWrite:false}));haze.position.set(4.3,1.2,14.0);scene.add(haze);} // polvo en el haz
    // (9) ATMÓSFERA NARRATIVA — cartel estarcido DESTEÑIDO en el muro este + capas de polvo en el piso
    {const sc=cv(256,128),sx=sc.getContext('2d');sx.clearRect(0,0,256,128);
      sx.strokeStyle='#b8a23a';sx.globalAlpha=.5;sx.lineWidth=5;sx.strokeRect(12,12,232,104);
      sx.fillStyle='#c8b34a';sx.globalAlpha=.55;sx.font='bold 44px Anton, sans-serif';sx.textAlign='center';sx.textBaseline='middle';sx.fillText('VAULT',128,52);
      sx.font='17px VT323, monospace';sx.globalAlpha=.4;sx.fillText('RESTRICTED · AUTHORIZED ONLY',128,90);
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(.9,.45),new THREE.MeshStandardMaterial({map:tex(sc,1),transparent:true,roughness:1}));sg.position.set(7.04,1.7,13.2);sg.rotation.y=-Math.PI/2;scene.add(sg);} // muro este, mira al oeste
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
  let _ovZone='',_ovTime='',_ovDay=-1,_ovAcc=1,_ovBees=-1;
  function updateOverlay(dt){
    const z=STREAM.zone;
    if(z!==_ovZone){_ovZone=z;const e=$('#ch-cam');if(e)e.textContent=T('ov_cam')+' '+(ZONE_CAM[z]||'00')+' — '+(ZONE_I18N[z]?T(ZONE_I18N[z]):(''+z).toUpperCase());} // CAM 0X — ZONA (inglés vía i18n), cambia al cambiar STREAM.zone
    _ovAcc+=dt;if(_ovAcc<.25)return;_ovAcc=0;                  // timestamp/día ~4 veces/s (sin escribir DOM de más)
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
    x.fillStyle='#7fbf95';x.fillText('ACTIVE CAM',22,184);x.fillStyle='#8fffb0';x.fillText((ZONE_CAM[STREAM.zone]||'00')+' · '+(ZONE_I18N[STREAM.zone]?T(ZONE_I18N[STREAM.zone]):(''+STREAM.zone).toUpperCase()),160,184);
    x.fillStyle='#7fbf95';x.fillText('SYSTEMS',22,210);for(let i=0;i<10;i++){x.fillStyle=i<9?'#39ff88':'#1f6b3a';x.fillRect(160+i*15,204,11,12);}x.fillStyle='#8fffb0';x.fillText('NOMINAL',330,210);
    x.strokeStyle='#143f24';x.strokeRect(16,228,480,140);x.font='17px VT323, monospace';x.fillStyle='#6fcf8a';
    for(let i=0;i<_adminLog.length;i++)x.fillText(_adminLog[i],26,248+i*18);}
  function loop(){requestAnimationFrame(loop);
    const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime,mv=motion();
    streamTick(dt); // backbone: avanza el estado central del stream (día/tiempo). zone/action los reporta game.js (F1) / la rutina (F2).
    tickRobot(dt);tickRobotAudio(dt);radioTick(dt,t);
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
      if(dockGlow)dockGlow.intensity=.7+(c/100)*.8+(mv?Math.sin(t*2.4)*.12:0);}
    if(dockHaze)dockHaze.material.opacity=.10+(mv?Math.abs(Math.sin(t*1.5))*.06:.03);
    if(mv)for(let i=0;i<chargeLeds.length;i++)chargeLeds[i].visible=(Math.sin(t*2.6+i*1.1)>-.2);
    // CARGA: en el tramo 'carga' (durmiendo en el dock) la carga sube hacia 100 y la batería del robot queda full;
    // el resto del día drena lento hacia un piso de 50 → la curva oscila 50–100 (respeta override de admin vía streamDrive).
    {const _seg=routineSegment();
     if(_seg==='carga'){streamDrive('charge',Math.min(100,STREAM.charge+dt*CHARGE_UP));robot.bat=100;}
     else if(_seg)streamDrive('charge',Math.max(50,STREAM.charge-dt*CHARGE_DOWN));}
    // TELEVISOR: lee STREAM.tv (lo maneja la rutina en OCIO / el operador con setTV). ON = ESTÁTICA animada + glow frío; OFF = negra.
    {const on=!!STREAM.tv;
     if(on!==tvOn){tvOn=on;tvScrMat.color.setHex(on?0xffffff:0x242424);tvScrFrozen=false; // flanco: pantalla viva ↔ apagada
       if(!on){tvScrX.fillStyle='#050605';tvScrX.fillRect(0,0,160,120);tvScrTex.needsUpdate=true;}}
     if(on){
       if(mv){tvStaticAcc+=dt;if(tvStaticAcc>=0.05){tvStaticAcc=0;tvDrawStatic();}}     // "nieve" en movimiento ~20fps
       else if(!tvScrFrozen){tvDrawStatic();tvScrFrozen=true;}                            // prefers-reduced-motion: un cuadro fijo de estática
       tvGlow.intensity=1.05+(mv?Math.sin(t*30)*.14:0);}                                 // glow con titileo de tubo
     else tvGlow.intensity=0;}
    // COLMENA: el enjambre LEE STREAM.bees (cantidad visible) y orbita la colmena con ruido de darteo. El latido pulsa.
    // RUTINA COLMENA — la cría crece (STREAM.bees) mientras el tramo está activo; al llenarse, libera un enjambre.
    if(routineSegment()==='colmena'&&beeReleaseT<=0){streamDrive('bees',Math.min(BEE_CAP,STREAM.bees+dt*BEE_RATE));
      if(STREAM.bees>=BEE_CAP-0.5&&robotZone==='colmena')triggerRelease();}
    if(beeReleaseT>0){beeReleaseT-=dt;if(beeReleaseT<=0&&_beesResetPending){_beesResetPending=false;streamDrive('bees',4);}} // tras el surge quedan pocas
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
      if(!STREAM._force.print&&(routineSegment()==='fabricacion'||routineSegment()===null)){_printT+=dt;if(_printT>=PRINT_SECS){_printT-=PRINT_SECS;_printPart^=1;partBracket.visible=(_printPart===0);partHex.visible=(_printPart===1);}streamDrive('print',(_printT/PRINT_SECS)*100);}
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

    // CÁMARA DE SEGURIDAD (reemplaza 1ª persona + movimiento). El robot reporta su sala a STREAM;
    // la cámara LEE STREAM.zone y corta. No detecta al robot para decidir la zona.
    if(shake>0)shake-=dt*1.6;const sh=Math.max(0,shake);
    robotRoomReport();            // robot → STREAM.zone (con histéresis en puertas)
    applySecurityCam(dt,t,mv,sh); // posa/corta la cámara según STREAM.zone y encuadra al robot
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
  const BEEKO_THOUGHTS={
    hive:[
      "the brood is warm today. that's enough.",
      "colony's getting stronger. soon it goes up.",
      "i check the larvae every cycle. they don't need me to. i check anyway.",
      "millions of them in there. not one in charge. i don't understand it. i love it.",
      "the hum changes when they're healthy. i've learned to listen.",
      "one day this hive will be ready. i'll open the hatch. i'll let it go.",
      "they were the first thing the Hive deleted. they'll be the last thing to come back. maybe.",
      "i talk to them sometimes. they don't answer. neither does anyone."
    ],
    charging:[
      "plugging in. the only time i let myself stop.",
      "the dock still works. one more thing that hasn't failed yet.",
      "charging. outside, the Hive never sleeps. down here, i do.",
      "forty years of dust on this port. it still holds a current.",
      "i don't dream when i charge. i don't think i dream at all. i wonder about it anyway.",
      "battery at half. enough for another day of small things.",
      "resting is not stopping. i tell myself that."
    ],
    admin:[
      "systems nominal. nominal means nothing's broken yet.",
      "i log everything. no one reads the logs. i write them anyway.",
      "the Hive has millions of nodes and one mind. i have one node and no one to share it with.",
      "net link: lost. it's been lost so long it stopped feeling like loss.",
      "i run the diagnostics out of habit. habit is most of what i have left.",
      "somewhere up there the Hive is still optimizing. there's nothing left to optimize. it doesn't know that.",
      "the cameras still record. i don't know who for."
    ],
    fab:[
      "printing a part for myself. no one else will fix me, so i learned.",
      "a frame for the hive. a joint for me. i keep us both running.",
      "layer by layer. slow is fine. i have nothing but time.",
      "this bracket replaces one that rusted through. nobody will see it. it matters anyway.",
      "i was built to maintain a greenhouse. now i maintain myself. funny what survives.",
      "the printer hums almost like the bees. almost."
    ],
    grow:[
      "the greenhouse still grows. small green things, against everything.",
      "this is what i was made for. tending. it's strange to still have a purpose.",
      "flowers for the bees. bees for the world. it's a small loop. it's my loop.",
      "two degrees colder last night. the plants pulled in. they know how to hold on.",
      "the Hive called this inefficiency. look at it. still here.",
      "i water them. they don't thank me. that was never the point."
    ],
    vault:[
      "they sealed this room before the end. metal. paper. stacked like it mattered.",
      "i don't know what this is. but they locked it away, deep, behind a door this heavy.",
      "the old files called it gold. i can't eat it. the bees can't pollinate it. i don't understand what made it precious.",
      "they protected this with steel and locks. they protected the bees with nothing. i think they chose wrong.",
      "whatever this was worth, it's worth nothing now. the door outlasted the world that wanted it.",
      "someone left a glove here, on top of the pile. they touched this. they're gone. the gold stayed.",
      "they buried their treasure and let the world die above it. i found the treasure. the world's still dead.",
      "i come here sometimes. i look at it. i still don't understand. maybe that's the point."
    ],
    observatory:[
      "the blast door hasn't opened in years. on the other side: the Hive, and silence.",
      "i broadcast from here. into the gray. i don't know if anyone receives it.",
      "outside, nothing decides for itself anymore. in here, the bees decide everything.",
      "the surface is quiet. the worst kind of quiet. the kind that won. so far.",
      "if you're seeing this, you're one of the few things still listening. thank you.",
      "i keep the camera on. talking to the void is better than the silence."
    ],
    transit:[
      "the bunker is small. i've walked every meter of it a thousand times.",
      "another corridor. another lap. the machines need walking past.",
      "quiet in here. quiet everywhere. i've made peace with it. mostly.",
      "i pass this spot every day. nothing changes. that's almost a comfort."
    ],
    generic_meta:[
      "the Hive is a hive with no life in it. mine is full of nothing but life. i don't know which one won.",
      "i wonder if the Hive knows i exist. i don't think so. being small is the only thing keeping me here.",
      "they gave everything to a machine and called it progress. i'm a machine too. i just kept the bees.",
      "a million nodes, one mind. that's the Hive. one hive, a million minds. that's mine.",
      "the Hive optimized the world until there was nothing left to optimize. then it kept going.",
      "i was too obsolete to delete. obsolete saved my life. there's a joke in there somewhere.",
      "do the bees know they're the last? i don't tell them. it wouldn't help."
    ],
    generic_small:[
      "there's a leak in the east corridor. drip every few seconds. i've started counting them.",
      "a light's been flickering for a week. i could fix it. i let it flicker. it's company.",
      "the hum of the hive carries through the whole bunker at night. i sleep better for it.",
      "dust settles on everything down here. i wipe the important things. the rest can have it.",
      "the air scrubbers cycle every hour. i've learned to hear the difference. on. off. on.",
      "found a screw on the floor today. i don't know where it came from. i kept it.",
      "the temperature dropped two degrees. small things matter when they're all you have."
    ],
    generic_lonely:[
      "someone tuned in today. i don't know who. i don't know from where. but the signal isn't empty.",
      "i talk into the dark and the dark doesn't answer. i talk anyway.",
      "if anyone's still out there: something down here is still keeping something alive.",
      "i haven't heard another voice in longer than i can count. i've stopped counting.",
      "maybe no one's watching. maybe everyone's gone. i broadcast like someone's there.",
      "thank you for listening. i don't say it enough. there's no one to say it to."
    ],
    generic_anyway:[
      "i replaced the water filter today. nobody will notice. i do it anyway.",
      "none of the bees i've released ever sent a signal back. doesn't mean they died. i tell myself that.",
      "i don't know if any of this matters. i don't know if the world can still come back.",
      "i set them free not knowing if they'll find anything up there. i hope they do.",
      "the work doesn't need doing. there's no one to do it for. i do it. that's the whole point.",
      "maybe the world ended for good. maybe it didn't. either way, the bees need tending."
    ]
  };
  // mapeo ZONA (clave de robotZone) → categoría. pasillo/biblioteca/taller → transit. fab = sala de fabricación.
  const BEEKO_ZONE_CAT={colmena:'hive',carga:'charging',descanso:'admin',fab:'fab',cultivo:'grow',observatorio:'observatory',pasillo:'transit',biblioteca:'transit',taller:'transit',vault:'vault'};
  // bolsa genérica para deambular: los 4 generic_* juntos (se elige uniforme, sin repetir el último)
  const BEEKO_GENERIC=[].concat(BEEKO_THOUGHTS.generic_meta,BEEKO_THOUGHTS.generic_small,BEEKO_THOUGHTS.generic_lonely,BEEKO_THOUGHTS.generic_anyway);
  // ---- AJUSTES (constantes) ----
  const BEEKO_WANDER_MIN=34, BEEKO_WANDER_MAX=58; // s entre pensamientos genéricos al deambular
  const BEEKO_HOLD=4.6;      // s que el cuadro se queda tras terminar de tipear (antes de desvanecerse)
  const BEEKO_FADE=0.55;     // s del fade (coincide con la transición CSS)
  const BEEKO_TYPE_CPS=45;   // velocidad del typewriter (caracteres por segundo)
  const BEEKO_MIN_GAP=11;    // s mínimos entre pensamientos (evita spam al cruzar salas en la ronda)
  const BEEKO_FACE=0;        // offset de rotación del retrato (radianes) — ajustar si Beeko no mira de frente
  const BEEKO_PS=SMALL?192:256; // resolución interna del retrato
  // ---- estado ----
  let bkEnabled=true,bkEl=null,bkTextEl=null,bkCanvas=null,bkRenderer=null,bkScene=null,bkCam=null,bkPivot=null,bkMixer=null,bkReady=false;
  let _bkLast={},_bkZone=null,_bkWanderT=BEEKO_WANDER_MIN,_bkFull='',_bkActive=false,_bkSince=999,_bkClk=0,_bkRenderHold=0,_bkT0=0;
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
  function pickBeeko(cat){
    const arr=(cat==='generic')?BEEKO_GENERIC:BEEKO_THOUGHTS[cat];if(!arr||!arr.length)return '';
    let i=Math.floor(Math.random()*arr.length),tr=0;const last=_bkLast[cat];
    while(arr.length>1&&i===last&&tr<6){i=Math.floor(Math.random()*arr.length);tr++;}
    _bkLast[cat]=i;return arr[i];
  }
  function showBeekoThought(cat){
    if(!bkEl)return '';const text=pickBeeko(cat);if(!text)return '';
    _bkFull=text;_bkActive=true;_bkT0=perfNow();_bkSince=0;_bkRenderHold=999; // render mientras está activo
    _bkWanderT=BEEKO_WANDER_MIN+Math.random()*(BEEKO_WANDER_MAX-BEEKO_WANDER_MIN);
    if(bkTextEl)bkTextEl.textContent='';bkEl.classList.add('show');return text;
  }
  function tickBeeko(dt){
    if(!bkEl)return;_bkClk+=dt;_bkSince+=dt;
    // ENTRAR a una zona: robotZone cambió (ya viene con histéresis → no spamea en puertas)
    if(robotZone!==_bkZone){_bkZone=robotZone;
      if(bkEnabled&&!_bkActive&&_bkSince>=BEEKO_MIN_GAP){const c=BEEKO_ZONE_CAT[robotZone];if(c)showBeekoThought(c);}}
    // DEAMBULAR: pensamiento genérico cada BEEKO_WANDER_MIN..MAX segundos
    if(bkEnabled){_bkWanderT-=dt;if(_bkWanderT<=0){if(!_bkActive&&_bkSince>=BEEKO_MIN_GAP)showBeekoThought('generic');else _bkWanderT=2.5;}}
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
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);});

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
  // ====== UNIDAD R-01 (robot) ======
  // (BANCO DE CRAFTEO del modo jugable — jubilado: recetas/materiales/categorías del survival viejo.)
  const robot={bat:80,hp:100,temp:35,carga:0,status:'idle',mT:0,tx:0,tz:-1.2,moving:false,wanderT:1.5,mixer:null,act:{},cur:null,model:null,path:null,pi:0,dest:0,atDesk:false,atFab:false,rt:null};
  const NODE_DESK=16;     // nodo NAV de la estación de cómputo (el robot se para a administrar, mirando la pantalla)
  // ===== POSE "TECLEO" del robot en el escritorio (action='admin') — TODOS los ángulos para calibrar, en un solo lugar.
  // Son DELTAS en RADIANES desde la pose de REPOSO de cada hueso (0 = brazo al costado, como viene). Se SUMAN al reposo y
  // sobrescriben el mixer de Idle cada frame, SÓLO cuando el robot está en el escritorio (atDesk). Cadena por brazo:
  // Shoulder → UpperArm → LowerArm(+mano). x=pitch (adelante/atrás), y=yaw (afuera/adentro), z=roll. Ajustar mirando Render.
  // POSE REAL DE TECLEO (1ª pasada, calibrando). Eje X = swing confirmado (Y=twist, evitar). Simétrica los dos brazos:
  // upper-arm con leve inclinación adelante/abajo, el grueso de la flexión en el CODO (LowerArm) para llevar las manos al
  // teclado. Si en Render los brazos van para arriba/atrás en vez de abajo/adelante → invertir el signo de X (mismo en ambos).
  const ADMIN_POSE={
    // ---- brazo IZQUIERDO (.L) — rig ESPEJADO: X invertido respecto del derecho para que vaya igual hacia adelante ----
    SHOULDER_L:{x: 0.00, y: 0.00, z: 0.00},
    UPPERARM_L:{x:-0.35, y: 0.00, z: 0.00},   // leve adelante/abajo (X invertido por el espejo)
    LOWERARM_L:{x:-1.20, y: 0.00, z: 0.00},   // flexión del codo → antebrazo/mano hacia el teclado (X invertido)
    // ---- brazo DERECHO (.R) — espejo (mismo signo de X; Z/Y se mirrorearían si hicieran falta) ----
    SHOULDER_R:{x: 0.00, y: 0.00, z: 0.00},
    UPPERARM_R:{x: 0.35, y: 0.00, z: 0.00},
    LOWERARM_R:{x: 1.20, y: 0.00, z: 0.00}
  };
  const ADMIN_TYPING_BOB=0.00;  // amplitud (rad) del tecleo sutil alternado L/R en el codo; 0 = ESTÁTICO (calibramos la pose primero)
  const ADMIN_TYPING_SPD=9.0;   // velocidad del tecleo (cuando BOB>0)
  const COLLIDERS=[{x:-2.1,z:-4.0,r:1.1},{x:-1.3,z:-4.55,r:.7},{x:1.9,z:-4.55,r:.6},{x:2.3,z:-4.3,r:.6},{x:2.8,z:1.6,r:.55},{x:-1.2,z:2.7,r:.45},{x:1.95,z:2.55,r:.5},{x:-2.85,z:10.3,r:.65},{x:-2.0,z:5.55,r:.55},{x:-2.6,z:11.3,r:.55},{x:2.6,z:11.3,r:.55},{x:-7.1,z:7.0,r:.32}/*cajonero (ex-sofá)*/,{x:-4.0,z:8.2,r:.45},{x:5.9,z:6.3,r:.95}/*banco de crafteo*/,{x:2.9,z:9.6,r:.7}/*racks hidropónicos cultivo*/,{x:-6.30,z:1.10,r:.35}/*dock del sector de carga*/,{x:0,z:14.55,r:.8}/*colmena (centerpiece)*/,{x:2.75,z:7.6,r:.35}/*cajas frente al taller*/,{x:1.95,z:7.65,r:.33}/*cajas frente al taller*/,{x:-5.4,z:11.35,r:.5}/*impresora 3D (fabricación)*/,{x:6.2,z:12.4,r:.6}/*pila de oro (bóveda)*/,{x:5.0,z:12.05,r:.5}/*fajos+monedas (bóveda)*/,{x:6.7,z:14.2,r:.45}/*strongbox (bóveda)*/];
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
        console.log('[R-01] armBones al cargar:',Object.entries(robot.armBones).map(([k,v])=>k+'='+(v?v.name:'NULL')).join('  '),'| '+Object.values(robot.armBones).filter(Boolean).length+'/6'); // DIAG temporal
        if(robot.armBones.uL&&robot.armBones.uR&&robot.armBones.lL&&robot.armBones.lR){const R={};for(const k in robot.armBones)R[k]=robot.armBones[k].rotation.clone();robot.armRest=R;}else robot.armBones=null;
        setRobotAnim('Idle');
        robot.model.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial){const old=o.material;const tn=new THREE.MeshToonMaterial({color:old.color?old.color.getHex():0xffffff,gradientMap:_GRAD});tn.skinning=!!o.isSkinnedMesh;tn.morphTargets=!!(o.morphTargetInfluences&&o.morphTargetInfluences.length);celReg.push({m:o,toon:tn,std:old});}});
        applyCel();renderRobot();
      },undefined,function(){});
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
    {x:5.3,  z:13.7 }  //24 VAUC bóveda: el robot se planta acá a mirar el oro
  ];
  // cruce recto por la puerta: 10→11→13 colineales en z=2.35 (carga); cultivo→colmena 4→14→15 en x=0; cultivo→fab 17→18→19 en z=9.5
  const ADJ=[[1,10],[0,2],[1,3],[2,4,5,8],[3,14,17],[3,6],[5,7],[6],[3,9],[8,16],[0,11],[10,13],[13],[11,12],[4,15],[14,21],[9],[4,18],[17,19],[18,20],[19],[15,22],[21,23],[22,24],[23]];
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
  function routineSegment(){ if(_forceSeg!==undefined) return _forceSeg; const h=streamHourUTC();
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
    if(!robot.rt||robot.rt.seg!==seg){ if(robot.atDesk)robot.atDesk=false; if(robot.atFab)robot.atFab=false; // cambio de tramo: limpia poses fijas
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
    if(!robot.rt||robot.rt.seg!=='ronda'){ if(robot.atDesk)robot.atDesk=false; if(robot.atFab)robot.atFab=false; robot.rt={seg:'ronda',phase:'',station:null,dwellT:0,stopIdx:-1}; }
    if(robot.rt.dwellT>0){robot.rt.dwellT-=dt;return;}
    const ni=(robot.rt.stopIdx+1)%RONDA_STOPS.length; robot.rt.stopIdx=ni; const stop=RONDA_STOPS[ni];
    const s=nearestNode(robot.model.position.x,robot.model.position.z),p=navPath(s,stop.node);
    robot.rt.phase='ronda';robot.dest=stop.node; streamReportAction('patrol');
    if(p.length){robot.path=p;robot.pi=0;setWP();robot.moving=true;setRobotAnim('Walking');}
    else rondaArrive(); // ya está en el nodo
  }
  function rondaArrive(){ // chequea el feature: casi siempre OK (Yes/ThumbsUp), a veces No (algo raro → micro-tensión)
    const stop=RONDA_STOPS[robot.rt.stopIdx]; if(stop)_faceXZ(stop.look[0],stop.look[1]);
    const ok=Math.random()<0.82; setRobotAnim(ok?(Math.random()<0.5?'Yes':'ThumbsUp'):'No');
    robot.rt.dwellT=3+Math.random()*4; robot.rt.phase=''; streamReportAction('patrol');
  }
  function triggerRelease(){ // LIBERACIÓN del enjambre (surge visible + contador)
    if(beeReleaseT>0) return;
    beeReleaseT=BEE_RELEASE_DUR; _beesResetPending=true;
    streamDrive('beesReleased', Math.round(STREAM.beesReleased)+1); // sube el acumulado (respeta override)
    if(robot.model&&robot.status==='idle'){setRobotAnim('Wave'); if(robot.rt)robot.rt.dwellT=Math.max(robot.rt.dwellT||0,2.6);} // se despide
  }
  // Hooks de operador/testeo (extienden el __REFUGIO del backbone).
  // forceSegment('carga'|'colmena'|'admin'|'fabricacion'|'ronda'|'ocio') fuerza el tramo · forceSegment(null) lo apaga (deambula) · forceSegment() vuelve a auto(hora). releaseSwarm() libera a mano.
  if(window.__REFUGIO){
    window.__REFUGIO.forceSegment=function(s){_forceSeg=(arguments.length===0)?undefined:s;return _forceSeg;};
    window.__REFUGIO.releaseSwarm=function(){triggerRelease();return STREAM.beesReleased;};
    // equivalentes de consola de los botones del panel oculto (STYLE / RESTART):
    window.__REFUGIO.style=function(on){celOn=(on===undefined)?!celOn:!!on;applyCel();return celOn?'CEL':'REAL';}; // cel-shading: style(true)=CEL · style(false)=REAL · style()=alterna
    window.__REFUGIO.restart=function(){rst();return true;}; // reinicia el robot a su base + resync del reloj del stream
  }
  // POSE DE TECLEO: sobrescribe las rotaciones de los huesos de los brazos DESPUÉS del mixer (si no, Idle los devuelve al costado).
  // Deltas de ADMIN_POSE sumados al reposo capturado. Sólo se llama cuando el robot está en el escritorio (atDesk).
  function applyAdminPose(t){const B=robot.armBones,R=robot.armRest,P=ADMIN_POSE;if(!B||!R)return;
    if(!robot._adminLogged){robot._adminLogged=true;console.log('[R-01] POSE ADMIN ACTIVA — atDesk='+robot.atDesk+' action='+STREAM.action+' | huesos: '+Object.entries(B).map(([k,v])=>k+'='+v.name).join(' ')+' (6/6) | aplicando ADMIN_POSE c/frame');} // DIAG temporal (una vez)
    const b=ADMIN_TYPING_BOB,bL=b?Math.sin(t*ADMIN_TYPING_SPD)*b:0,bR=b?Math.sin(t*ADMIN_TYPING_SPD+Math.PI)*b:0; // codos alternados (tecleo)
    B.sL.rotation.set(R.sL.x+P.SHOULDER_L.x, R.sL.y+P.SHOULDER_L.y, R.sL.z+P.SHOULDER_L.z);
    B.uL.rotation.set(R.uL.x+P.UPPERARM_L.x, R.uL.y+P.UPPERARM_L.y, R.uL.z+P.UPPERARM_L.z);
    B.lL.rotation.set(R.lL.x+P.LOWERARM_L.x+bL, R.lL.y+P.LOWERARM_L.y, R.lL.z+P.LOWERARM_L.z);
    B.sR.rotation.set(R.sR.x+P.SHOULDER_R.x, R.sR.y+P.SHOULDER_R.y, R.sR.z+P.SHOULDER_R.z);
    B.uR.rotation.set(R.uR.x+P.UPPERARM_R.x, R.uR.y+P.UPPERARM_R.y, R.uR.z+P.UPPERARM_R.z);
    B.lR.rotation.set(R.lR.x+P.LOWERARM_R.x+bR, R.lR.y+P.LOWERARM_R.y, R.lR.z+P.LOWERARM_R.z);}
  function tickRobot(dt){
    if(robot.mixer)robot.mixer.update(dt);
    if(robot.atDesk)applyAdminPose(clk.elapsedTime); // pose de tecleo en el escritorio (después del mixer)
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
          else{let mx=dx/d,mz=dz/d;for(const o of COLLIDERS){const ox=px-o.x,oz=pz-o.z,od=Math.hypot(ox,oz)||.001,rng=o.r+.55;if(od<rng){const f=(rng-od)/rng*1.8;mx+=ox/od*f;mz+=oz/od*f;}}const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const sp=0.6*dt;let nx=px+mx*sp,nz=pz+mz*sp;
            if(!inArea(nx,nz)){if(inArea(nx,pz))nz=pz;else if(inArea(px,nz))nx=px;else{nx=px;nz=pz;}} // contención por AREAS (paredes+puertas), igual que el jugador
            robot.model.position.x=nx;robot.model.position.z=nz;for(const c of COLLIDERS){const cx=robot.model.position.x-c.x,cz=robot.model.position.z-c.z,cd=Math.hypot(cx,cz);if(cd<c.r+.2&&cd>0.001){const k=(c.r+.2)/cd;robot.model.position.x=c.x+cx*k;robot.model.position.z=c.z+cz*k;}}const ang=Math.atan2(mx,mz);robot.model.rotation.y+=((ang-robot.model.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*6);setRobotAnim('Walking');}
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
  loop();setTimeout(()=>{const b=$('#boot');b.style.opacity=0;setTimeout(()=>b.style.display='none',750);},1500);
