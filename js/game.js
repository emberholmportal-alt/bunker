// EL BÚNKER — lógica de juego: estado, slider HOLDERS, eventos, zonas, loop, robot, crafteo
  // ---- estado ----
  let holders=0,clock=FULL,speed=1,auto=false,running=true,ended=false,asim=.05;
  let shake=0,blackout=0,evT=7+Math.random()*6,prevInside=0,prevOutside=0,prevConsumed=0,coreSurge=0,flashA=0,flashCol='255,46,136',critT=22,critWarned=false;
  let look2portilla=0,enjSurge=0;
  function showAlert(txt){const a=$('#alert');a.textContent=txt;a.classList.add('show');alertMsg=txt;setTimeout(()=>a.classList.remove('show'),1700);setTimeout(()=>{if(alertMsg===txt)alertMsg='';},2300);}
  function setFlash(col,a){flashCol=col;flashA=a;}
  // ---- feedback del slider HOLDERS (visual, no depende del audio) ----
  function floatTick(txt,color){const c=$('#ticks');if(!c)return;const e=document.createElement('div');e.className='tick';e.style.color=color;e.style.top=(Math.random()*10)+'px';e.textContent=txt;c.appendChild(e);setTimeout(()=>{e.remove();},1000);}
  function blipBatch(n){if(!audioOn||!actx)return;const o=actx.createOscillator();o.type='triangle';o.frequency.value=720+Math.min(n,14)*26;const g=actx.createGain();const t=actx.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.01);g.gain.linearRampToValueAtTime(0,t+.11);o.connect(g);g.connect(master);o.start(t);o.stop(t+.13);}
  function holdoutPulse(kind){const b=$('#holdout');if(!b)return;b.classList.remove('hin','hout');void b.offsetWidth;b.classList.add(kind==='in'?'hin':'hout');}
  function renderHoldout(inside,outside,consumed){const f=$('#ro-fill');if(f)f.style.width=(inside/CAP*100)+'%';
    const ri=$('#ro-in');if(ri)ri.innerHTML=inside+'<i>/100</i>';
    const ro=$('#ro-out');if(ro)ro.textContent=outside>0?T('ho_outside',outside):'—';
    const rc=$('#ro-cons');if(rc)rc.textContent=consumed>0?('☣ '+consumed):'';
    const rp=$('#ro-pop');if(rp){if(inside<=0)rp.textContent=T('ho_empty');
      else rp.innerHTML='<b'+(inside>=CAP?' class="warn"':'')+'>'+inside+'</b> '+(inside===1?T('ho_soul_one'):T('ho_soul_many'))+(inside>=CAP?T('ho_full'):'');}
    const b=$('#holdout');if(b)b.classList.toggle('full',inside>=CAP);}
  function clearHoldersCue(){const s=$('#holders');if(s)s.classList.remove('cue');const h=$('#holdout');if(h)h.classList.remove('cue');}
  function onFirstOutside(){showAlert(T('a_first_outside'));enjSurge=Math.max(enjSurge,3.5);gyroOn=Math.max(gyroOn,2.2);setFlash('255,46,136',.3);look2portilla=1.3;robotReact('No',2.6);}
  function fireEvent(){const r=Math.random();
    if(r<.4){showAlert(T('a_swarm_hit'));shake=1;setFlash('120,120,140',.35);dustFall=1.2;rumble();alarm();gyroOn=3.0;robotReact('No',2.4);stats.energia=clamp(stats.energia-15,0,100);stats.cordura=clamp(stats.cordura-8,0,100);if(Math.random()<.6&&crackIdx<3){cracks[crackIdx].opacity=1;crackIdx++;}}
    else if(r<.72){showAlert(T('a_power_fail'));blackout=.8;crtGlitch=1;rumble();stats.cordura=clamp(stats.cordura-14,0,100);}
    else{showAlert(T('a_gen_overload'));coreSurge=1.4;setFlash('255,140,0',.4);rumble();stats.cordura=clamp(stats.cordura-12,0,100);stats.energia=clamp(stats.energia-6,0,100);}
    renderStats();}

  // look-around
  let yaw=0,pitch=0,drag=false,px=0,py=0;const cvEl=renderer.domElement;
  function down(x,y){drag=true;px=x;py=y;$('#hint').style.opacity=0;look2portilla=0;}
  function move(x,y){if(!drag)return;yaw-=(x-px)*.0026;pitch-=(y-py)*.0026;px=x;py=y;pitch=clamp(pitch,-.5,.55);}
  function up(){drag=false;}
  cvEl.addEventListener('mousedown',e=>down(e.clientX,e.clientY));addEventListener('mousemove',e=>move(e.clientX,e.clientY));addEventListener('mouseup',up);
  cvEl.addEventListener('touchstart',e=>down(e.touches[0].clientX,e.touches[0].clientY),{passive:true});cvEl.addEventListener('touchmove',e=>move(e.touches[0].clientX,e.touches[0].clientY),{passive:true});cvEl.addEventListener('touchend',up);
  const keys={};addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyF')torch.visible=!torch.visible;});addEventListener('keyup',e=>{keys[e.code]=false;});
  let joyVec={x:0,y:0};if('ontouchstart' in window)document.body.classList.add('touch');
  {const joy=$('#joy'),stick=$('#stick');
   const jm=e=>{const tt=e.touches?e.touches[0]:e;const r=joy.getBoundingClientRect();let dx=(tt.clientX-(r.left+r.width/2))/(r.width/2),dy=(tt.clientY-(r.top+r.height/2))/(r.height/2);const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}joyVec={x:dx,y:dy};stick.style.transform=`translate(${dx*22}px,${dy*22}px)`;};
   const je=()=>{joyVec={x:0,y:0};stick.style.transform='translate(0,0)';};
   joy.addEventListener('touchstart',e=>{e.stopPropagation();jm(e);},{passive:true});joy.addEventListener('touchmove',e=>{e.stopPropagation();jm(e);},{passive:true});joy.addEventListener('touchend',e=>{e.stopPropagation();je();});}

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
    // --- fabricadora (cámara sci-fi; futura cuna de M-01) ---
    const fab=new THREE.Group();fab.position.set(6.7,0,6.05);scene.add(fab);
    fab.add(meshBox(.74,.2,.54,0,.1,0,darkMetal));fab.add(meshBox(.74,.13,.54,0,1.52,0,darkMetal));
    for(const px of[-.31,.31])for(const pz of[-.21,.21])fab.add(meshBox(.05,1.3,.05,px,.82,pz,steelMat));
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,1.22,20,1,true),new THREE.MeshPhysicalMaterial({color:0x88c0d0,transparent:true,opacity:.14,roughness:.1,metalness:0,side:THREE.DoubleSide}));glass.position.set(0,.8,0);fab.add(glass);
    fab.add(meshBox(.32,.42,.06,0,.52,.28,doorMat));
    for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.018,8,8),new THREE.MeshBasicMaterial({color:0x39ffd0}));l.position.set(-.11+i*.07,.62,.32);fab.add(l);fabLeds.push(l);}
    fabLight=new THREE.PointLight(0x39ffd0,.6,3,2);fabLight.position.set(0,.85,0);fab.add(fabLight);
    fab.children.forEach(c=>{if(c.isMesh)c.castShadow=true;});
    // --- blueprint azul (cianotipo) de la unidad M-01 sobre la estantería ---
    function blueprintTex(){const c=cv(512,340),x=c.getContext('2d');x.fillStyle='#0b2a5e';x.fillRect(0,0,512,340);
      x.strokeStyle='rgba(120,170,255,.16)';x.lineWidth=1;for(let i=0;i<512;i+=24){x.beginPath();x.moveTo(i,0);x.lineTo(i,340);x.stroke();}for(let j=0;j<340;j+=24){x.beginPath();x.moveTo(0,j);x.lineTo(512,j);x.stroke();}
      x.strokeStyle='rgba(200,225,255,.7)';x.lineWidth=3;x.strokeRect(10,10,492,320);
      x.fillStyle='#dbe8ff';x.font='24px Anton, sans-serif';x.fillText('PROYECTO M-01 · MIYAKO',22,44);
      x.font='13px VT323, monospace';x.fillStyle='rgba(205,225,255,.85)';x.fillText('UNIDAD ANDROIDE — ESTADO: INERTE',22,66);
      x.strokeStyle='rgba(210,230,255,.9)';x.lineWidth=2;const cx=370,cy=185;
      x.beginPath();x.arc(cx,cy-72,22,0,7);x.stroke();x.beginPath();x.moveTo(cx,cy-50);x.lineTo(cx,cy+38);x.stroke();
      x.beginPath();x.moveTo(cx,cy-32);x.lineTo(cx-42,cy+8);x.moveTo(cx,cy-32);x.lineTo(cx+42,cy+8);x.stroke();
      x.beginPath();x.moveTo(cx,cy+38);x.lineTo(cx-22,cy+108);x.moveTo(cx,cy+38);x.lineTo(cx+22,cy+108);x.stroke();
      x.strokeStyle='rgba(150,190,255,.6)';x.lineWidth=1;x.beginPath();x.moveTo(cx+74,cy-94);x.lineTo(cx+74,cy+110);x.stroke();
      x.fillStyle='rgba(205,225,255,.85)';x.font='12px VT323, monospace';x.fillText('1.62 m',cx+80,cy+8);
      ['NÚCLEO: DAÑADO','SERVOS: 12 / 40 OK','CHASIS: 64%','MEMORIA: CORRUPTA','REQ: circuitos · placa · batería'].forEach((s,i)=>x.fillText('· '+s,22,112+i*22));
      return c;}
    const bp=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.83),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(blueprintTex())}));
    bp.position.set(4.4,1.92,8.33);bp.rotation.y=Math.PI;scene.add(bp);
    box(1.33,.91,.04,4.4,1.92,8.39,doorMat);
    const bpLight=new THREE.PointLight(0x5a9cff,.5,3,2);bpLight.position.set(4.4,1.9,8.0);scene.add(bpLight);
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
  const _newSofa=new THREE.Group();_newSofa.position.set(-6.7,0,7.0);_newSofa.rotation.y=Math.PI/2;scene.add(_newSofa);
  _newSofa.add(meshBox(1.5,.3,.74,0,.32,0,sofaMat));_newSofa.add(meshBox(1.5,.52,.16,0,.62,-.29,sofaMat));
  _newSofa.add(meshBox(.16,.42,.74,-.67,.5,0,sofaMat));_newSofa.add(meshBox(.16,.42,.74,.67,.5,0,sofaMat));
  _newSofa.add(meshBox(.66,.16,.62,-.36,.46,.03,cushMat));_newSofa.add(meshBox(.66,.16,.62,.36,.46,.03,cushMat));
  _newSofa.add(meshBox(.62,.22,.16,-.36,.62,-.22,cushMat));_newSofa.add(meshBox(.62,.22,.16,.36,.62,-.22,cushMat));
  for(const px of[-.6,.6])for(const pz of[-.3,.3])_newSofa.add(meshBox(.06,.2,.06,px,.1,pz,steelMat));
  _newSofa.children.forEach(c=>c.castShadow=true);
  bunkbed(-5.0,8.0,Math.PI);locker(-4.0,8.2,Math.PI);armchair(-6.6,5.9,Math.PI/2,0x3a4a5a);
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(2.0,1.4),new THREE.MeshStandardMaterial({map:tex(grime('#5a3a3a'),1),roughness:1})),-5.6,.02,6.8,-Math.PI/2,0,0));
  box(.34,.5,.34,-4.0,.25,7.0,_woodMat);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(.06,10,10),new THREE.MeshBasicMaterial({color:0xffe2b0})).translateX(-4.0).translateY(.55).translateZ(7.0));

  // ---- colocaciones: OBSERVATORIO (detalle pro) ----
  armchair(-1.2,2.7,Math.PI,0x4a3f30);
  // (terminal/observatorio deskTerm removido — cuello al taller despejado)
  jerryCan(-1.15,-3.85,0xb84028);jerryCan(-.95,-4.05,0x7a6a30);jerryCan(-1.35,-4.0,0xb84028);
  medCab(-2.5,1.5,-5.18,0);
  ventGrille(3.18,1.85,0.6,-Math.PI/2);
  box(.08,.08,3.2,3.13,2.2,0.6,doorMat);box(.08,.08,2.0,-3.13,2.25,-1.0,doorMat);
  for(const cz of[-3.6,-1.2,0.8,2.4]){const cb=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.5,6),new THREE.MeshStandardMaterial({color:0x141414,roughness:1}));cb.position.set(2.9,CH-.32,cz);cb.rotation.x=(Math.random()-.5)*.3;scene.add(cb);}

  // ---- colocaciones: BIBLIOTECA ----
  armchair(2.3,6.7,Math.PI,0x3a4a3a);

  // SALA C (CULTIVO) z[8.2,11.8]
  box(6.8,.3,3.6,0,-.15,10.0,floorMat);box(6.8,.3,3.6,0,CH,10.0,ceilMat);
  box(.3,CH+.3,3.6,-3.4,CH/2,10.0,concreteMat);box(.3,CH+.3,3.6,3.4,CH/2,10.0,concreteMat);
  box(6.8,CH+.3,.3,0,CH/2,11.8,concreteMat);
  const sbLight=new THREE.PointLight(0xa8c0e8,.9,8,2);sbLight.position.set(0,CH-.35,6.6);scene.add(sbLight);
  const scLight=new THREE.PointLight(0x9ab0d0,.6,7,2);scLight.position.set(1.4,CH-.35,10.2);scene.add(scLight);
  const paLight=new THREE.PointLight(0xbfd0e0,.5,4,2);paLight.position.set(0,CH-.3,4.2);scene.add(paLight);
  // (escritorio este removido — cuello al taller despejado)
  crate(2.7,.4,7.6,.8,.4);crate(2.0,.35,7.7,.7,-.3);shelf(-2.6,11.3,Math.PI);shelf(2.6,11.3,Math.PI);
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
      for(let p=0;p<4;p++){const px=2.9,pz=9.1+p*.32;const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.02,.14,6),new THREE.MeshStandardMaterial({color:0x3a6b2a,roughness:.9}));stem.position.set(px,y+.11,pz);scene.add(stem);for(let lf=0;lf<5;lf++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),growMat);leaf.scale.set(1,.32,.55);leaf.position.set(px+(Math.random()-.5)*.1,y+.1+lf*.025,pz+(Math.random()-.5)*.1);leaf.rotation.set(Math.random(),Math.random()*6,Math.random());leaf.userData.noOut=true;leaf.castShadow=true;scene.add(leaf);}}
      scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(.46,.03,1.2),new THREE.MeshBasicMaterial({color:0xc83cff})),2.9,y+.5,9.6));}
    const grow2=new THREE.PointLight(0xb43cff,1.1,4.5,2);grow2.position.set(2.6,1.5,9.6);scene.add(grow2);
    {const tray=meshBox(.74,.08,.42,-2.6,.82,8.75,doorMat);tray.castShadow=true;scene.add(tray);for(let i=0;i<12;i++){const sp=new THREE.Mesh(new THREE.ConeGeometry(.02,.08,5),growMat);sp.position.set(-2.6-.28+(i%4)*.18,.92,8.75-.14+Math.floor(i/4)*.14);sp.userData.noOut=true;scene.add(sp);}}
    // --- DESCANSO: alfombra, estufa (glow), mesita con taza, posters ---
    scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6),new THREE.MeshStandardMaterial({map:tex(grime('#5a3a3a'),1),roughness:1})),-5.4,.02,6.6,-Math.PI/2,0,0));
    {const heater=new THREE.Group();heater.position.set(-7.05,0,6.0);heater.add(meshBox(.4,.5,.22,0,.28,0,doorMat));for(let i=0;i<3;i++){const bar=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,8),new THREE.MeshStandardMaterial({color:0xff5520,emissive:0xff3300,emissiveIntensity:1.5}));bar.position.set(-.1+i*.1,.3,.1);bar.userData.noOut=true;heater.add(bar);}heater.children.forEach(c=>c.castShadow=true);scene.add(heater);const hglow=new THREE.PointLight(0xff5a20,.8,2.8,2);hglow.position.set(-6.95,.4,6.2);scene.add(hglow);}
    {const st=meshBox(.4,.5,.4,-4.2,.25,5.9,_woodMat);st.castShadow=true;scene.add(st);const mugMat=new THREE.MeshStandardMaterial({color:0xcfcabc,roughness:.7});const mug=new THREE.Mesh(new THREE.CylinderGeometry(.045,.04,.08,12),mugMat);mug.position.set(-4.2,.54,5.9);mug.castShadow=true;scene.add(mug);const hd=new THREE.Mesh(new THREE.TorusGeometry(.03,.01,6,12),mugMat);hd.position.set(-4.13,.54,5.9);scene.add(hd);}
    for(const pz of[5.75,7.55]){scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(.7,.95),new THREE.MeshStandardMaterial({map:tex(grime('#6a5a3a'),1),roughness:1,emissive:0x0d0c06})),-7.34,1.5,pz,0,Math.PI/2,0));}
    const restWarm=new THREE.PointLight(0xffb060,.5,5,2);restWarm.position.set(-5.4,1.9,6.6);scene.add(restWarm);
  }
  const AREAS=[{x0:-RX+.4,x1:RX-.4,z0:RZ0+.5,z1:RZ1+.05},{x0:-1.15,x1:1.15,z0:RZ1-.1,z1:5.35},{x0:-3.25,x1:3.25,z0:5.05,z1:8.35},{x0:-3.25,x1:3.25,z0:8.05,z1:11.65},{x0:3.15,x1:7.05,z0:5.75,z1:8.25},{x0:-7.2,x1:-3.15,z0:5.75,z1:8.25}];
  function inArea(x,z){for(const a of AREAS)if(x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1)return true;return false;}
  // ---- ZONAS DE INTERACCIÓN ----
  const V=(x,z)=>new THREE.Vector3(x,0,z);
  const zones=[
    {p:V(-0.9,-3.4),r:1.3,label:T('z_feed_gen'),cdM:1.0,cd:0,fn:()=>{if(res.fuel>0){res.fuel--;nucleo=clamp(nucleo+26,0,100);renderRes();blip();}else showAlert(T('a_no_fuel'));}},
    {p:V(-2.4,10.3),r:1.5,label:T('z_harvest'),cdM:2.0,cd:0,fn:()=>{res.food++;if(Math.random()<.4){res.semillas++;floatTick(T('ft_seeds'),'#9fe0b0');}stats.energia=clamp(stats.energia-8,0,100);renderRes();renderHotbar();renderStats();blip();}},
    {p:V(-1.3,-4.55),r:1.4,label:T('z_water'),cdM:2.0,cd:0,fn:()=>{res.water++;stats.energia=clamp(stats.energia-6,0,100);renderRes();renderHotbar();renderStats();blip();}},
    {p:V(1.9,-4.55),r:1.4,label:T('z_fuel'),cdM:2.5,cd:0,fn:()=>{res.fuel++;stats.energia=clamp(stats.energia-10,0,100);renderRes();renderStats();blip();}},
    {p:V(2.3,-4.3),r:1.5,label:T('z_scrap'),cdM:2.0,cd:0,fn:()=>{res.chatarra++;if(Math.random()<.35){res.cables++;floatTick(T('ft_cables'),'#cfd2cc');}stats.energia=clamp(stats.energia-8,0,100);renderRes();renderStats();blip();}},
    {p:V(RX-.4,1.6),r:1.3,label:T('z_repair'),cdM:1.5,cd:0,fn:()=>{if(res.chatarra>0){res.chatarra--;nucleo=clamp(nucleo+14,0,100);renderRes();blip();}else showAlert(T('a_no_scrap'));}},
    {p:V(-5.8,7.0),r:1.4,label:T('z_rest'),cdM:1.5,cd:0,fn:()=>{stats.energia=clamp(stats.energia+35,0,100);renderStats();blip();}},
    {p:V(-1.0,3.0),r:1.3,label:T('z_read'),cdM:1.5,cd:0,fn:()=>{stats.cordura=clamp(stats.cordura+30,0,100);renderStats();blip();}},
    {p:V(1.95,2.2),r:1.2,label:T('z_radio'),cdM:.6,cd:0,fn:radioTune},
    {p:V(5.9,6.3),r:1.7,label:T('z_craft'),cdM:.3,cd:0,fn:openCraft}
  ];
  const zoneRings=[];zones.forEach(z=>{const rg=new THREE.Mesh(new THREE.RingGeometry(.42,.52,28),new THREE.MeshBasicMaterial({color:z.fn?0x39ffaa:0xff3030,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));rg.rotation.x=-Math.PI/2;rg.position.set(z.p.x,.015,z.p.z);scene.add(rg);zoneRings.push(rg);});
  const torch=new THREE.SpotLight(0xfff0d0,0,9,Math.PI/6,.5,1.5);torch.visible=false;scene.add(torch);scene.add(torch.target);
  let activeZone=null,lastDisabled=null;const promptEl=$('#prompt');
  function updateZones(){let best=null,bd=999;for(const z of zones){const d=Math.hypot(camera.position.x-z.p.x,camera.position.z-z.p.z);if(d<z.r&&d<bd){bd=d;best=z;}}
    const dis=best?(!best.fn||best.cd>0):false;
    if(best!==activeZone||dis!==lastDisabled){activeZone=best;lastDisabled=dis;
      if(best){promptEl.textContent=(!best.fn?'⛔ ':(best.cd>0?'… ':'▸ '))+best.label;promptEl.style.display='block';promptEl.classList.toggle('disabled',dis);}
      else promptEl.style.display='none';}}
  promptEl.addEventListener('click',()=>{if(activeZone&&activeZone.fn&&activeZone.cd<=0){activeZone.fn();activeZone.cd=activeZone.cdM;}});

  const dummy=new THREE.Object3D(),clk=new THREE.Clock();let statAcc=0;
  function loop(){requestAnimationFrame(loop);
    const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime,mv=motion();
    streamTick(dt); // backbone: avanza el estado central del stream (día/tiempo). zone/action los reporta game.js (F1) / la rutina (F2).
    tickRobot(dt);radioTick(dt,t);mapAcc+=dt;if(mapAcc>.16){drawMapPlan(pos.x,pos.z,yaw);mapAcc=0;}
    if(running){clock-=dt*speed;asim=Math.min(1,.05+(1-clock/FULL)*.95);
      if(auto&&holders<400){holders=Math.min(400,holders+dt*6+dt*speed*.02);$('#holders').value=Math.round(holders);$('#hv').textContent=Math.round(holders);}
      evT-=dt;if(evT<=0){evT=10+Math.random()*9;fireEvent();}
      nucleo=Math.max(0,nucleo-dt*0.35);
      if(nucleo<=2){critT-=dt;if(!critWarned){critWarned=true;showAlert(T('a_gen_dying'));}if(Math.random()<.025)alarm();}
      else{critT=22;critWarned=false;}
      // decay de stats (tiempo real)
      statAcc+=dt;if(statAcc>1){const d=statAcc;stats.hambre=clamp(stats.hambre-d*.6,0,100);stats.sed=clamp(stats.sed-d*.9,0,100);stats.energia=clamp(stats.energia-d*.5,0,100);
        let cd2=d*.35;if(stats.hambre<=0||stats.sed<=0||stats.energia<=0)cd2+=d*2.2;stats.cordura=clamp(stats.cordura-cd2,0,100);statAcc=0;renderStats();renderRes();
        ['hambre','sed','energia'].forEach(k=>{if(stats[k]<=0&&!ended)showAlert(({hambre:T('a_starvation'),sed:T('a_dehydration'),energia:T('a_exhaustion')})[k]);});}
    }
    const inside=Math.min(Math.round(holders),CAP);
    const consumed=Math.floor(Math.max(0,holders-CAP)*Math.max(0,(asim-.6))/.4);
    const outside=Math.max(0,Math.round(holders)-CAP-consumed);
    const dIn=inside-prevInside,dOut=outside-prevOutside;
    if(dIn>0){blipBatch(dIn);floatTick(T('ft_enter',dIn),'#8fffb0');holdoutPulse('in');if(prevInside===0)robotReact('Wave',3);}
    if(inside>=CAP&&prevInside<CAP){showAlert(T('a_shelter_complete'));setFlash('255,200,80',.3);floatTick(T('ft_full'),'#ffd86a');blip();robotReact('Dance',4);}
    if(dOut>0&&outside>0){if(Math.random()<.6)thud();shake=Math.max(shake,.3+Math.min(.5,dOut*.05));floatTick(T('ft_outside',dOut),'#ff2e88');holdoutPulse('out');if(prevOutside===0)onFirstOutside();}
    if(inside!==prevInside||outside!==prevOutside||consumed!==prevConsumed)renderHoldout(inside,outside,consumed);
    prevInside=inside;prevOutside=outside;prevConsumed=consumed;
    refugioLight.intensity=(inside/CAP)*1.2;
    updateHoldersBoard(Math.round(holders),dt); // tablero split-flap en la pared

    crtAcc+=dt;if(crtAcc>.1){drawCRT(inside,outside,asim);crtAcc=0;}
    if(crtGlitch>0)crtGlitch-=dt*2;
    crtGlow.intensity=.4+(mv?Math.sin(t*3)*.06:0);

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

    // enjambre
    if(enjSurge>0)enjSurge-=dt;const enjB=mv?(.5+.5*Math.sin(t*.5)):.5,_es=Math.max(0,enjSurge);
    enjLight.intensity=1.1+asim*2.0+enjB*.7+_es;enjLeak.intensity=.25+asim*1.0+enjB*.18+_es*.4;parts.material.opacity=Math.min(1,.32+asim*.45+enjB*.12+_es*.08);sky.material.color.setRGB(1,1-asim*.3-enjB*.04,1-asim*.2);

    const cShow=Math.min(outside,cN);
    for(let i=0;i<cShow;i++){const b=cBase[i],bob=mv?Math.sin(t*1.5+cPh[i])*.04:0,sw=mv?Math.sin(t*1.0+cPh[i])*.05:0;
      dummy.position.set(b.x+sw,b.y+bob,b.z);dummy.rotation.set(0,cPh[i],0);dummy.updateMatrix();cBody.setMatrixAt(i,dummy.matrix);
      dummy.position.set(b.x+sw,b.y+.6+bob,b.z);dummy.updateMatrix();cHead.setMatrixAt(i,dummy.matrix);}
    cBody.count=cShow;cHead.count=cShow;cBody.instanceMatrix.needsUpdate=true;cHead.instanceMatrix.needsUpdate=true;

    // partículas / escombros
    if(mv){const a=parts.geometry.attributes.position.array;for(let i=0;i<PN;i++){a[i*3+1]+=dt*.7;a[i*3]-=dt*.3;if(a[i*3+1]>8){a[i*3+1]=0;a[i*3]=RX+2+Math.random()*10;}}parts.geometry.attributes.position.needsUpdate=true;
      const d=dust.geometry.attributes.position.array;for(let i=0;i<DN;i++){d[i*3+1]+=dt*.05*Math.sin(dsd[i]+t);d[i*3]+=dt*.03*Math.cos(dsd[i]);if(d[i*3+1]>2.6)d[i*3+1]=0;}dust.geometry.attributes.position.needsUpdate=true;}
    if(dustFall>0){dustFall-=dt*.5;const f=debris.geometry.attributes.position.array;for(let i=0;i<FN;i++){f[i*3+1]-=dt*fv[i]*2.2;if(f[i*3+1]<0){f[i*3+1]=CH-.1;f[i*3]=(Math.random()-.5)*5.6;}}debris.geometry.attributes.position.needsUpdate=true;debris.material.opacity=clamp(dustFall,0,.9);}else debris.material.opacity=0;

    // (sin infección interior)

    // locura (cordura baja → imagen enferma)
    const locura=clamp((100-stats.cordura)/100,0,1);
    if(rgbPass)rgbPass.uniforms.amount.value=.0013+locura*.005;
    if(filmPass)filmPass.uniforms.nIntensity.value=.22+locura*.35;
    $('#madness').style.opacity=(locura*.28).toFixed(2);
    if(whisperG&&actx)whisperG.gain.value=audioOn?locura*.10:0;

    // flash de evento
    if(flashA>0)flashA-=dt*1.4;const fe=$('#flash');fe.style.background='rgb('+flashCol+')';fe.style.opacity=clamp(flashA,0,.6).toFixed(2);

    // MOVIMIENTO (WASD / joystick) + colisión + cámara
    if(shake>0)shake-=dt*1.6;const sh=Math.max(0,shake);
    const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);fwd.y=0;if(fwd.lengthSq()>0)fwd.normalize();
    const rgt=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
    const mvv=new THREE.Vector3();
    if(keys['KeyW']||keys['ArrowUp'])mvv.add(fwd);if(keys['KeyS']||keys['ArrowDown'])mvv.sub(fwd);
    if(keys['KeyD']||keys['ArrowRight'])mvv.add(rgt);if(keys['KeyA']||keys['ArrowLeft'])mvv.sub(rgt);
    if(joyVec.x||joyVec.y){mvv.add(fwd.clone().multiplyScalar(-joyVec.y));mvv.add(rgt.clone().multiplyScalar(joyVec.x));}
    const walking=mvv.lengthSq()>0;
    const _ox=pos.x,_oz=pos.z;
    if(walking){mvv.normalize().multiplyScalar(2.3*dt);pos.x+=mvv.x;pos.z+=mvv.z;}
    if(!inArea(pos.x,pos.z)){if(inArea(pos.x,_oz))pos.z=_oz;else if(inArea(_ox,pos.z))pos.x=_ox;else{pos.x=_ox;pos.z=_oz;}}
    for(const c of COLLIDERS){const cx=pos.x-c.x,cz=pos.z-c.z,cd=Math.hypot(cx,cz);if(cd<c.r&&cd>0.001){const k=c.r/cd;pos.x=c.x+cx*k;pos.z=c.z+cz*k;}}
    if(look2portilla>0){look2portilla-=dt;const tdx=RX-pos.x,tdz=-2-pos.z,tyaw=Math.atan2(-tdx,-tdz);yaw+=((tyaw-yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*3.2);}
    const wb=(walking&&mv)?Math.sin(t*9)*.025:0,br=mv?Math.sin(t*1.1)*.006:0;
    const sx=(Math.random()-.5)*.09*sh,sy=(Math.random()-.5)*.09*sh,sr=(Math.random()-.5)*.025*sh;
    camera.position.set(pos.x+sx,EYEH+wb+br+sy,pos.z);camera.rotation.set(pitch+sr,yaw,0,'YXZ');
    if(torch.visible){torch.intensity=2.6;torch.position.copy(camera.position);torch.target.position.set(camera.position.x+fwd.x,camera.position.y+fwd.y-.1,camera.position.z+fwd.z);}else torch.intensity=0;
    for(let i=0;i<zoneRings.length;i++){const z=zones[i],rg=zoneRings[i];
      if(z.cd>0){const fr=1-z.cd/z.cdM;rg.material.color.setHex(0xff5a5a);rg.material.opacity=.1+fr*.26;}
      else{rg.material.color.setHex(z.fn?0x39ffaa:0xff3030);rg.material.opacity=.18+(mv?Math.abs(Math.sin(t*2+i))*.18:.1);}}
    for(const z of zones)if(z.cd>0)z.cd-=dt;
    updateZones();
    if(activeZone&&activeZone.cd>0)promptEl.textContent='… '+activeZone.label+'  ('+Math.ceil(activeZone.cd)+'s)';

    if(composer)composer.render();else renderer.render(scene,camera);
    if(filmPass)filmPass.uniforms.time.value+=dt;
  }

  // controles
  $('#holders').addEventListener('input',e=>{holders=+e.target.value;$('#hv').textContent=holders;auto=false;$('#auto').classList.remove('on');clearHoldersCue();});
  $('#auto').addEventListener('click',e=>{auto=!auto;e.target.classList.toggle('on');clearHoldersCue();});
  document.querySelectorAll('[data-spd]').forEach(b=>b.addEventListener('click',e=>{speed=+e.target.dataset.spd;document.querySelectorAll('[data-spd]').forEach(x=>x.classList.remove('on'));e.target.classList.add('on');}));
  $('#snd').addEventListener('click',e=>{if(!audioOn){startAudio();e.target.classList.add('on');}else{stopAudio();e.target.classList.remove('on');}});
  $('#cel').addEventListener('click',()=>{celOn=!celOn;applyCel();});
  $('#rclose').addEventListener('click',()=>{$('#robotui').style.display='none';});
  $('#cclose').addEventListener('click',()=>{$('#craftui').style.display='none';});
  $('#rsend').addEventListener('click',sendRobot);$('#rcharge').addEventListener('click',chargeRobot);$('#rrepair').addEventListener('click',repairRobot);
  $('#reset').addEventListener('click',rst);
  function rst(){holders=0;clock=FULL;asim=.05;auto=false;ended=false;running=true;shake=0;blackout=0;coreSurge=0;evT=7+Math.random()*6;prevInside=0;prevOutside=0;prevConsumed=0;dustFall=0;crtGlitch=0;flashA=0;gyroOn=0;waveT=-1;critT=22;critWarned=false;look2portilla=0;enjSurge=0;
    stats.hambre=stats.sed=stats.energia=stats.cordura=100;nucleo=80;
    for(const k in res)res[k]=0;res.fuel=6;res.food=5;res.water=5;res.med=2;res.chatarra=2;res.tela=1;res.semillas=1;
    zones.forEach(z=>z.cd=0);if(torch)torch.visible=false;refugioLight.intensity=0;
    cracks.forEach(c=>c.opacity=0);crackIdx=0;resetRobot();renderStats();renderHotbar();renderRes();renderHoldout(0,0,0);
    $('#holders').value=0;$('#hv').textContent='0';$('#auto').classList.remove('on');
    const s=$('#holders');if(s)s.classList.add('cue');const h=$('#holdout');if(h)h.classList.add('cue');}
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
  // ====== UNIDAD R-01 (robot explorador) ======
  // ====== BANCO DE CRAFTEO (árbol estilo Last Day on Earth) ======
  const MATN={chatarra:'Chatarra',circuitos:'Circuitos',cables:'Cables',plastico:'Plástico',tela:'Tela',semillas:'Semillas',quimicos:'Químicos',lingote:'Lingote',placa:'Placa',telatratada:'Tela tratada',bateria:'Batería',fuel:'Combustible',food:'Comida',water:'Agua',med:'Medicina'};
  const MAT=[['chatarra','🔩'],['circuitos','🖥'],['cables','🔌'],['plastico','🧴'],['tela','🧵'],['semillas','🌱'],['quimicos','⚗'],['lingote','🧱'],['placa','🟩'],['telatratada','🧶'],['bateria','🔋'],['fuel','⛽'],['food','🥫'],['water','💧'],['med','💊']];
  // recetas: need (consume) → give (produce). give apunta a res[k] o a 'nucleo'.
  const RECIPES=[
    {id:'lingote', n:'Lingote de metal',  i:'🧱', cat:'Componentes', need:{chatarra:3,fuel:1},          give:{lingote:1}},
    {id:'placa',   n:'Placa de circuito', i:'🟩', cat:'Componentes', need:{circuitos:2,cables:1},        give:{placa:1}},
    {id:'telat',   n:'Tela tratada',      i:'🧶', cat:'Componentes', need:{tela:2,quimicos:1},           give:{telatratada:1}},
    {id:'bateria', n:'Batería casera',    i:'🔋', cat:'Componentes', need:{circuitos:1,cables:1,chatarra:1}, give:{bateria:1}},
    {id:'racion',  n:'Ración enlatada',   i:'🥫', cat:'Provisiones', need:{semillas:2,plastico:1},       give:{food:3}},
    {id:'agua',    n:'Agua filtrada',     i:'💧', cat:'Provisiones', need:{chatarra:1,telatratada:1},    give:{water:3}},
    {id:'vendaje', n:'Vendaje',           i:'🩹', cat:'Provisiones', need:{tela:2},                      give:{med:1}},
    {id:'antidoto',n:'Antídoto',          i:'💊', cat:'Provisiones', need:{quimicos:1,semillas:1},       give:{med:2}},
    {id:'celula',  n:'Célula de energía', i:'⚡', cat:'Energía',     need:{placa:1,bateria:1},           give:{nucleo:35}},
    {id:'kit',     n:'Kit de reparación', i:'🛠', cat:'Energía',     need:{lingote:2,cables:1},          give:{nucleo:20,chatarra:1}},
    {id:'combust', n:'Combustible sintético', i:'⛽', cat:'Energía', need:{quimicos:2,plastico:1},       give:{fuel:2}}
  ];
  function openCraft(){$('#craftui').style.display='block';renderCraft();}
  function canCraft(rc){for(const k in rc.need)if((res[k]||0)<rc.need[k])return false;return true;}
  function doCraft(id){const rc=RECIPES.find(r=>r.id===id);if(!rc)return;if(!canCraft(rc)){showAlert('FALTAN MATERIALES');return;}
    for(const k in rc.need)res[k]-=rc.need[k];
    for(const k in rc.give){if(k==='nucleo')nucleo=clamp(nucleo+rc.give[k],0,100);else res[k]=Math.min(99,(res[k]||0)+rc.give[k]);}
    blip();showAlert('FABRICASTE: '+rc.n);renderRes();renderHotbar();renderCraft();}
  function renderCraft(){
    const inv=$('#cinv');if(inv){inv.innerHTML='';MAT.forEach(([k,ic])=>{const n=res[k]||0;const e=document.createElement('span');e.className='ci'+(n>0?' has':'');e.innerHTML=ic+' '+MATN[k]+' <b>'+n+'</b>';inv.appendChild(e);});}
    const list=$('#crecipes');if(!list)return;list.innerHTML='';let lastCat='';
    RECIPES.forEach(rc=>{if(rc.cat!==lastCat){lastCat=rc.cat;const h=document.createElement('div');h.className='ccat';h.textContent=rc.cat;list.appendChild(h);}
      const ok=canCraft(rc),row=document.createElement('div');row.className='rcp';
      const need=Object.keys(rc.need).map(k=>{const have=(res[k]||0),req=rc.need[k];return '<span class="'+(have>=req?'ok':'no')+'">'+req+' '+MATN[k]+'</span>';}).join(' + ');
      const give=Object.keys(rc.give).map(k=>'+'+rc.give[k]+' '+(k==='nucleo'?'núcleo':(MATN[k]||k))).join(', ');
      row.innerHTML='<span class="ic">'+rc.i+'</span><span class="info"><span class="nm">'+rc.n+'</span><br><span class="nd">'+need+' → '+give+'</span></span><button class="mk"'+(ok?'':' disabled')+'>FABRICAR</button>';
      row.querySelector('.mk').onclick=()=>doCraft(rc.id);
      list.appendChild(row);});
  }
  const robot={bat:80,hp:100,temp:35,carga:0,status:'idle',mT:0,tx:0,tz:-1.2,moving:false,wanderT:1.5,mixer:null,act:{},cur:null,model:null,path:null,pi:0,dest:0};
  const COLLIDERS=[{x:-2.1,z:-4.0,r:1.1},{x:-1.3,z:-4.55,r:.7},{x:1.9,z:-4.55,r:.6},{x:2.3,z:-4.3,r:.6},{x:2.8,z:1.6,r:.55},{x:-1.2,z:2.7,r:.45},{x:1.95,z:2.55,r:.5},{x:-2.85,z:10.3,r:.65},{x:-2.0,z:5.55,r:.55},{x:-2.6,z:11.3,r:.55},{x:2.6,z:11.3,r:.55},{x:-6.7,z:7.0,r:.7},{x:-5.0,z:8.1,r:.7},{x:-4.0,z:8.2,r:.45},{x:5.9,z:6.3,r:.95}/*banco de crafteo*/,{x:2.9,z:9.6,r:.7}/*racks hidropónicos cultivo*/];
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
        setRobotAnim('Idle');
        robot.model.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial){const old=o.material;const tn=new THREE.MeshToonMaterial({color:old.color?old.color.getHex():0xffffff,gradientMap:_GRAD});tn.skinning=!!o.isSkinnedMesh;tn.morphTargets=!!(o.morphTargetInfluences&&o.morphTargetInfluences.length);celReg.push({m:o,toon:tn,std:old});}});
        applyCel();renderRobot();
      },undefined,function(){});
    }catch(e){}
  })();
  function setRobotAnim(name){if(!robot.mixer||!robot.act[name])return;const nx=robot.act[name];if(nx===robot.cur)return;if(robot.cur)robot.cur.fadeOut(0.3);nx.reset().fadeIn(0.3).play();robot.cur=nx;}
  // R-01 reacciona a lo que pasa con el HOLDERS (queda quieto haciendo el gesto un rato)
  function robotReact(name,dur){if(!robot.model||robot.status!=='idle')return;setRobotAnim(name);robot.moving=false;robot.wanderT=Math.max(robot.wanderT,dur||2.4);}
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
  function sendRobot(){
    if(robot.status!=='idle'){showAlert(T('a_unit_unavailable'));return;}
    if(robot.temp>85){showAlert(T('a_unit_overheat'));return;}
    if(robot.bat<30){showAlert(T('a_low_battery'));return;}
    if(robot.hp<=0){showAlert(T('a_unit_damaged'));return;}
    robot.status='leaving';robot.moving=true;robot.tx=DOORINX;robot.tz=DOORZ;doorTarget=1;setRobotAnim('Walking');showAlert(T('a_unit_to_hatch'));
    renderRobot();
  }
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
  function chargeRobot(){
    if(robot.status==='mission')return;
    if(res.fuel<=0){showAlert(T('a_no_fuel_charge'));return;}
    res.fuel--;robot.bat=clamp(robot.bat+45,0,100);robot.temp=clamp(robot.temp+8,0,100);
    if(robot.status==='broken'&&robot.hp>0&&robot.bat>0){robot.status='idle';robot.moving=false;setRobotAnim('Idle');}
    renderRes();renderRobot();showAlert(T('a_battery_charged'));
  }
  function repairRobot(){
    if(robot.status==='mission')return;
    if(res.chatarra<=0){showAlert(T('a_no_scrap_repair'));return;}
    res.chatarra--;robot.hp=clamp(robot.hp+35,0,100);
    if(robot.status==='broken'&&robot.hp>0&&robot.bat>0){robot.status='idle';setRobotAnim('Idle');}
    renderRes();renderRobot();showAlert(T('a_unit_repaired'));
  }
  function resetRobot(){robot.bat=80;robot.hp=100;robot.temp=35;robot.carga=0;robot.status='idle';robot.mT=0;robot.moving=false;robot.path=null;robot.wanderT=1.5;if(robot.model){robot.model.visible=true;robot.model.position.set(2.05,0,-1.2);setRobotAnim('Idle');}renderRobot();}
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
    {x:-4.7, z:6.8 }   //9 DESC  descanso
  ];
  const ADJ=[[1],[0,2],[1,3],[2,4,5,8],[3],[3,6],[5,7],[6],[3,9],[8]];
  const DEST=[0,2,3,4,7,9]; // nodos "centro de sala" donde el robot puede plantarse
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
  function tickRobot(dt){
    if(robot.mixer)robot.mixer.update(dt);
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
            else{robot.moving=false;robot.path=null;robot.wanderT=1.5+Math.random()*3;if(Math.random()<0.45){const _ra=['Wave','ThumbsUp','Yes','No','Dance'];setRobotAnim(_ra[Math.floor(Math.random()*_ra.length)]);}else setRobotAnim('Idle');}
          }
          else{let mx=dx/d,mz=dz/d;for(const o of COLLIDERS){const ox=px-o.x,oz=pz-o.z,od=Math.hypot(ox,oz)||.001,rng=o.r+.55;if(od<rng){const f=(rng-od)/rng*1.8;mx+=ox/od*f;mz+=oz/od*f;}}const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const sp=0.6*dt;let nx=px+mx*sp,nz=pz+mz*sp;
            if(!inArea(nx,nz)){if(inArea(nx,pz))nz=pz;else if(inArea(px,nz))nx=px;else{nx=px;nz=pz;}} // contención por AREAS (paredes+puertas), igual que el jugador
            robot.model.position.x=nx;robot.model.position.z=nz;for(const c of COLLIDERS){const cx=robot.model.position.x-c.x,cz=robot.model.position.z-c.z,cd=Math.hypot(cx,cz);if(cd<c.r+.2&&cd>0.001){const k=(c.r+.2)/cd;robot.model.position.x=c.x+cx*k;robot.model.position.z=c.z+cz*k;}}const ang=Math.atan2(mx,mz);robot.model.rotation.y+=((ang-robot.model.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*6);setRobotAnim('Walking');}
        }else{robot.wanderT-=dt;if(robot.wanderT<=0)robotWander();}
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
  // carga un personaje GLB escalando por ALTURA (para Miyako, inerte en la fabricadora)
  function loadCharacter(file,x,y,z,height,rotY){
    try{new THREE.GLTFLoader().load(file,function(g){
      const o=g.scene;if(rotY)o.rotation.y=rotY;o.updateMatrixWorld(true);
      let bb=new THREE.Box3().setFromObject(o),sz=bb.getSize(new THREE.Vector3());
      o.scale.setScalar(height/(sz.y||1));o.updateMatrixWorld(true);
      bb=new THREE.Box3().setFromObject(o);
      o.position.set(x-(bb.min.x+bb.max.x)/2,y-bb.min.y,z-(bb.min.z+bb.max.z)/2);
      o.traverse(m=>{if(m.isMesh){m.castShadow=true;if(m.material&&m.material.isMeshStandardMaterial){const tn=_toToon(m.material);celReg.push({m:m,toon:tn,std:m.material});}}});
      scene.add(o);applyCel();
    },undefined,function(){});}catch(e){}
  }
  // M-01 (Miyako): inerte dentro de la cámara de la fabricadora del taller
  loadCharacter('assets/miyako.glb',6.7,0.2,6.05,1.08,-Math.PI/2);
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

  buildCel();applyCel();renderHoldout(0,0,0);
  loop();setTimeout(()=>{const b=$('#boot');b.style.opacity=0;setTimeout(()=>b.style.display='none',750);},1500);
