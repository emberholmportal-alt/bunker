// EL BÚNKER — escena, render, geometría estática, CRT y postprocesado (init)
  // ---- escena ----
  const app=$('#app'), scene=new THREE.Scene();scene.fog=new THREE.Fog(0x0b0e14,9,28);
  const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.05,200);
  const EYEH=1.5;const pos=new THREE.Vector3(0,EYEH,2.4);camera.position.copy(pos);
  const renderer=new THREE.WebGLRenderer({antialias:!SMALL,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,SMALL?1.5:2));renderer.setSize(innerWidth,innerHeight);
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.86;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;app.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0x283440,0x06090d,.32));
  // luz cálida "refugio" — sube con la cantidad de refugiados adentro (payoff del slider HOLDERS)
  const refugioLight=new THREE.PointLight(0xffcf94,0,9,2);refugioLight.position.set(0,2.25,0.4);scene.add(refugioLight);

  const RX=3.2,RZ0=-5.4,RZ1=3.2,CH=2.65,depth=RZ1-RZ0,midz=(RZ0+RZ1)/2;
  function box(w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
  function meshBox(w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;return o;}
  function place(o,x,y,z,rx,ry,rz){o.position.set(x||0,y||0,z||0);if(rx!==undefined||ry!==undefined||rz!==undefined)o.rotation.set(rx||0,ry||0,rz||0);return o;}
  box(RX*2,.3,depth,0,-.15,midz,floorMat);box(RX*2,.3,depth,0,CH,midz,ceilMat);
  box(.3,CH+.3,6.9,-RX,CH/2,-1.95,concreteMat);box(.3,CH+.3,depth,RX,CH/2,midz,concreteMat);box(RX*2,CH+.3,.3,0,CH/2,RZ0,concreteMat); // pared oeste acortada z[-5.4,1.5]: abre la puerta z[1.5,3.2] (1.7m) al SECTOR DE CARGA
  for(let i=0;i<5;i++)box(RX*2,.16,.16,0,CH-.18,RZ0+.6+i*((depth-1.2)/4),steelMat);
  function pipe(len,x,y,z){const o=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,len,12),rustMat);o.rotation.x=Math.PI/2;o.position.set(x,y,z);o.castShadow=true;scene.add(o);return o;}
  pipe(depth-.6,-RX+.35,CH-.32,midz);pipe(depth-.6,RX-.35,CH-.5,midz);pipe(2.5,-RX+.5,1.6,RZ0+.3);
  for(let i=0;i<3;i++){const v=new THREE.Mesh(new THREE.TorusGeometry(.12,.04,8,16),steelMat);v.position.set(-RX+.35,CH-.32,RZ0+1+i*1.6);v.rotation.y=Math.PI/2;scene.add(v);}

  // puerta blast
  box(2.0,2.2,.18,-.6,1.0,RZ0+.12,doorMat);
  const wheel=new THREE.Mesh(new THREE.TorusGeometry(.34,.06,10,24),steelMat);wheel.position.set(-.6,1.05,RZ0+.24);scene.add(wheel);
  for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.06,.6,.06),steelMat);sp.position.set(-.6,1.05,RZ0+.24);sp.rotation.z=i*Math.PI/4;scene.add(sp);}
  const sealLight=new THREE.PointLight(0xff2a2a,1.6,4,2);sealLight.position.set(-.6,2.25,RZ0+.4);scene.add(sealLight);
  const sealBulb=new THREE.Mesh(new THREE.SphereGeometry(.07,10,10),new THREE.MeshBasicMaterial({color:0xff4040}));sealBulb.position.copy(sealLight.position);scene.add(sealBulb);

  // (literas removidas del observatorio)
  // (cartel del refugio + capacidad JUBILADO: texto del memecoin viejo con el número viejo; contradecía el canon de Beeko.)

  // ---- TABLERO SPLIT-FLAP "TIME ALONE" (cronómetro del LIVE, montado en la pared del observatorio) ----
  const HB_DIG=13,HB_FLIP=0.13,hbC=cv(1024,384),hbX=hbC.getContext('2d'),hbTex=new THREE.CanvasTexture(hbC);hbTex.anisotropy=4; // 13 celdas = DDDD:HH:MM:SS (cronómetro del LIVE, no se topa)
  box(.10,.80,1.92,-RX+.13,1.16,-2.6,doorMat); // carcasa/bisel del tablero
  const hbBoard=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.64),new THREE.MeshBasicMaterial({map:hbTex}));hbBoard.position.set(-RX+.20,1.16,-2.6);hbBoard.rotation.y=Math.PI/2;scene.add(hbBoard);
  const hbGlow=new THREE.PointLight(0xffc24a,.5,3.2,2);hbGlow.position.set(-RX+.75,1.16,-2.6);scene.add(hbGlow);
  // CONTADOR DE PARED: cronómetro del LIVE — tiempo transcurrido desde LORE_EPOCH (now-epoch) en HH:MM:SS, vivo
  // estado por dígito: cur=mostrado, nxt=destino, p=progreso de volteo (1=quieto)
  const hbCells=[];for(let i=0;i<HB_DIG;i++)hbCells.push({cur:'0',nxt:'0',p:1});let hbDirty=true;
  function hbGlyph(ch,cx,cy,cw,chh,top,col){hbX.save();hbX.beginPath();hbX.rect(cx,top?cy:cy+chh/2,cw,chh/2);hbX.clip();
    hbX.fillStyle=col;hbX.shadowColor=col;hbX.shadowBlur=14;hbX.font=Math.round(cw*1.39)+'px Anton, sans-serif';hbX.textAlign='center';hbX.textBaseline='middle';hbX.fillText(ch,cx+cw/2,cy+chh/2+4);hbX.restore();} // fuente proporcional al ancho de celda (escala con la cantidad de placas)
  function hbDrawCell(cx,cy,cw,chh,old,nu,p,dim){const seam=cy+chh/2,col=dim?'rgba(120,150,120,.4)':'#ffc24a';
    hbX.fillStyle='#0b0f0c';hbX.fillRect(cx,cy,cw,chh);hbX.fillStyle='#14201a';hbX.fillRect(cx+2,cy+2,cw-4,chh/2-3);
    hbGlyph(nu,cx,cy,cw,chh,true,col);hbGlyph(p<.5?old:nu,cx,cy,cw,chh,false,col); // estáticos: arriba=nuevo, abajo=viejo
    if(p<.5){const s=1-p/.5;hbX.save();hbX.beginPath();hbX.rect(cx,cy,cw,chh/2);hbX.clip();hbX.translate(0,seam);hbX.scale(1,s);hbX.translate(0,-seam);hbGlyph(old,cx,cy,cw,chh,true,col);hbX.restore();} // hoja superior cae
    else if(p<1){const s=(p-.5)/.5;hbX.save();hbX.beginPath();hbX.rect(cx,cy+chh/2,cw,chh/2);hbX.clip();hbX.translate(0,seam);hbX.scale(1,s);hbX.translate(0,-seam);hbGlyph(nu,cx,cy,cw,chh,false,col);hbX.restore();} // hoja inferior sube
    hbX.shadowBlur=0;hbX.fillStyle='rgba(0,0,0,.85)';hbX.fillRect(cx,seam-2,cw,4);hbX.strokeStyle='rgba(0,0,0,.6)';hbX.lineWidth=3;hbX.strokeRect(cx+1,cy+1,cw-2,chh-2);}
  function hbRedraw(){hbX.fillStyle='#06080a';hbX.fillRect(0,0,1024,384);
    hbX.fillStyle='#ffb000';hbX.shadowColor='#ffb000';hbX.shadowBlur=12;hbX.textAlign='center';hbX.textBaseline='alphabetic';hbX.font='48px Anton, sans-serif';hbX.fillText(T('uptime_hdr'),512,58);
    hbX.font='22px VT323, monospace';hbX.fillStyle='#8fffb0';hbX.shadowColor='#8fffb0';hbX.shadowBlur=6;hbX.fillText(T('uptime_sub'),512,86);hbX.shadowBlur=0;
    const cw=70,gap=4,chh=210,top=120,total=HB_DIG*cw+(HB_DIG-1)*gap,x0=(1024-total)/2;
    for(let i=0;i<HB_DIG;i++){const c=hbCells[i];hbDrawCell(x0+i*(cw+gap),top,cw,chh,c.cur,c.nxt,c.p,false);} // reloj: sin atenuar ceros a la izquierda
    hbTex.needsUpdate=true;}
  // Alimenta el tablero con el CRONÓMETRO DEL LIVE (ms transcurridos → HH:MM:SS). Mismo volteo de flap.
  function updateUptimeBoard(ms,dt){let s=Math.max(0,Math.floor(ms/1000));const d=Math.min(9999,Math.floor(s/86400));s=s%86400;const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
    const str=String(d).padStart(4,'0')+':'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0'); // DDDD:HH:MM:SS, 13 chars = HB_DIG (los ':' caen en celdas fijas que no voltean)
    let started=0,active=false;
    for(let i=0;i<HB_DIG;i++){const c=hbCells[i],want=str[i];
      if(c.p>=1){if(c.nxt!==want){c.cur=c.nxt;c.nxt=want;c.p=0;started++;}}
      if(c.p<1){c.p=Math.min(1,c.p+dt/HB_FLIP);if(c.p>=1)c.cur=c.nxt;active=true;}}
    if(started&&typeof flap==='function')flap(started);
    if(active||hbDirty){hbRedraw();hbDirty=false;}}
  updateUptimeBoard(0,1); // primer render (0000:00:00:00)

  // cajas / barriles / sacos / generador / bidones
  const crateMat=new THREE.MeshStandardMaterial({map:tex(grime('#6e5a36'),1),normalMap:_wn,roughness:.92,metalness:.05});
  const barrelMat=new THREE.MeshStandardMaterial({map:tex(grime('#394b3a'),1),normalMap:_wn,roughness:.55,metalness:.6});
  // ---- PROPS DETALLADOS (en tu repo podés cambiar por modelos GLB Quaternius/Kenney) ----
  const _frameMat=new THREE.MeshStandardMaterial({color:0x4a3c22,normalMap:_wn,roughness:.92,metalness:.04});
  function crate(x,y,z,sz,rot){const g=new THREE.Group();g.position.set(x,y,z);if(rot)g.rotation.y=rot;
    g.add(meshBox(sz*.93,sz*.93,sz*.93,0,0,0,crateMat));const t=sz*.1;
    for(const zz of[sz/2,-sz/2])for(const yy of[sz/2,-sz/2])g.add(meshBox(sz,t,t,0,yy,zz,_frameMat));
    for(const xx of[sz/2,-sz/2])for(const yy of[sz/2,-sz/2])g.add(meshBox(t,t,sz,xx,yy,0,_frameMat));
    for(const xx of[sz/2,-sz/2])for(const zz of[sz/2,-sz/2])g.add(meshBox(t,sz,t,xx,0,zz,_frameMat));
    g.children.forEach(c=>{c.castShadow=true;});scene.add(g);return g;}
  function shelf(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);if(rot)g.rotation.y=rot;
    for(const px of[-.52,.52])for(const pz of[-.17,.17])g.add(meshBox(.06,1.5,.06,px,.75,pz,steelMat));
    for(const yy of[.32,.74,1.16,1.46])g.add(meshBox(1.16,.04,.42,0,yy,0,shelfMat));
    g.add(meshBox(.22,.26,.22,-.32,.46,.02,crateMat));g.add(meshBox(.2,.22,.2,.04,.43,-.04,crateMat));
    const can=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.2,12),steelMat);can.position.set(.34,.42,-.04);g.add(can);
    g.add(meshBox(.26,.2,.26,-.22,.86,0,barrelMat));g.add(meshBox(.32,.18,.34,.16,.85,.02,crateMat));
    const jar=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.16,12),new THREE.MeshStandardMaterial({color:0x3a6a4a,transparent:true,opacity:.7,roughness:.2}));jar.position.set(.36,1.26,0);g.add(jar);
    g.children.forEach(c=>{c.castShadow=true;});scene.add(g);return g;}
  crate(RX-.7,.5,RZ0+.9,1.0);crate(RX-.55,1.40,RZ0+.9,.8,.3);crate(RX-1.6,.35,RZ0+.6,.7,-.25);
  // ---- COMPUERTA DEL ROBOT (pared der del hub) ----
  const DOORINX=RX-0.78,DOORZ=-1.7;let doorY=0,doorTarget=0;
  const _hf=new THREE.MeshStandardMaterial({color:0x3a3e42,metalness:.8,roughness:.4});
  box(.14,1.55,.14,RX,.77,DOORZ-.6,_hf);box(.14,1.55,.14,RX,.77,DOORZ+.6,_hf);box(.14,.16,1.34,RX,1.5,DOORZ,_hf);
  const hatchDoor=meshBox(.1,1.32,1.04,RX-.02,.66,DOORZ,new THREE.MeshStandardMaterial({color:0x55595d,metalness:.85,roughness:.4}));
  const _strip=new THREE.Mesh(new THREE.BoxGeometry(.12,.13,1.04),new THREE.MeshStandardMaterial({color:0xc89820,emissive:0x3a2800,emissiveIntensity:.5}));_strip.position.set(0,.38,0);hatchDoor.add(_strip);
  const hatchLight=new THREE.PointLight(0xff5030,0,3.5,2);hatchLight.position.set(RX-.4,1.35,DOORZ);scene.add(hatchLight);
  for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,1.0,18),barrelMat);b.position.set(RX-.6,.5,RZ0+2.1+i*.7);b.castShadow=true;scene.add(b);
    const r=new THREE.Mesh(new THREE.TorusGeometry(.33,.03,8,20),steelMat);r.rotation.x=Math.PI/2;r.position.set(b.position.x,.75,b.position.z);scene.add(r);}
  // sacos de arena apilados (frente a la portilla, defensa)
  for(let r=0;r<3;r++)for(let i=0;i<4-r;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.45,.22,.3),sandMat);s.position.set(RX-.55,.12+r*.22,-3.4+i*.36+r*.18);s.rotation.y=(Math.random()-.5)*.2;s.castShadow=true;scene.add(s);}
  // bidones de agua (azulados)
  const waterMat=new THREE.MeshStandardMaterial({color:0x2a5a8a,roughness:.3,metalness:.1,transparent:true,opacity:.85});
  for(let i=0;i<2;i++){const w=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.5,12),waterMat);w.position.set(-RX+1.9,.25,RZ0+.5+i*.42);w.castShadow=true;scene.add(w);}
  // generador
  box(.9,.6,.6,1.9,.3,RZ0+.5,doorMat);const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.4,8),steelMat);exhaust.position.set(2.25,.7,RZ0+.5);scene.add(exhaust);
  // estante con frascos
  box(1.2,.06,.35,-RX+.85,1.7,RZ0+.5,steelMat);
  for(let i=0;i<5;i++){const j=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.18,8),new THREE.MeshStandardMaterial({color:[0x6a8,0x86a,0xaa6,0x8aa,0xa66][i],roughness:.2,metalness:.1,transparent:true,opacity:.8}));j.position.set(-RX+.55+i*.16,1.82,RZ0+.5);scene.add(j);}
  // herramientas colgadas (siluetas)
  for(let i=0;i<3;i++){const t=new THREE.Mesh(new THREE.BoxGeometry(.04,.4,.04),steelMat);t.position.set(1.0+i*.18,1.9,RZ0+.18);t.rotation.z=(Math.random()-.5)*.3;scene.add(t);}

  // radio + ventilador + cables
  box(.4,.26,.28,RX-.7,1.13,RZ0+.9,doorMat);
  const radioLed=new THREE.Mesh(new THREE.SphereGeometry(.02,8,8),new THREE.MeshBasicMaterial({color:0xff3030}));radioLed.position.set(RX-.55,1.2,RZ0+1.05);scene.add(radioLed);
  const fan=new THREE.Group();fan.position.set(0,CH-.12,1.4);scene.add(fan);
  fan.add(new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.1,12),steelMat));
  for(let i=0;i<4;i++){const bl=new THREE.Mesh(new THREE.BoxGeometry(.7,.02,.16),steelMat);bl.position.set(Math.cos(i*Math.PI/2)*.4,0,Math.sin(i*Math.PI/2)*.4);bl.rotation.y=i*Math.PI/2;fan.add(bl);}
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.7,6),new THREE.MeshStandardMaterial({color:0x111,roughness:1}));cable.position.set(1.4,CH-.45,-1);scene.add(cable);
  const sparkLight=new THREE.PointLight(0x88bbff,0,2,2);sparkLight.position.set(1.4,CH-.8,-1);scene.add(sparkLight);

  // ---- NÚCLEO ----
  // ---- GENERADOR A COMBUSTIBLE ----
  box(1.34,.12,1.02,0,.06,-3.6,tableMat);
  const genGrp=new THREE.Group();genGrp.position.set(-2.1,0,-4.0);scene.add(genGrp);
  const genBodyMat=new THREE.MeshStandardMaterial({color:0x3a4048,roughness:.5,metalness:.85});
  genGrp.add(meshBox(1.05,.7,.72,0,.5,0,genBodyMat));
  genGrp.add(meshBox(.86,.22,.62,0,.92,0,steelMat));
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.8,18),steelMat);tank.rotation.z=Math.PI/2;tank.position.set(0,1.2,0);tank.castShadow=true;genGrp.add(tank);
  const exh=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.62,10),rustMat);exh.position.set(.42,1.12,-.32);genGrp.add(exh);
  const exh2=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.22,10),rustMat);exh2.rotation.z=Math.PI/2;exh2.position.set(.31,.83,-.32);genGrp.add(exh2);
  const flywheel=new THREE.Mesh(new THREE.TorusGeometry(.24,.06,10,22),steelMat);flywheel.position.set(-.58,.48,0);flywheel.rotation.y=Math.PI/2;genGrp.add(flywheel);
  const flyhub=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.14,12),steelMat);flyhub.rotation.z=Math.PI/2;flyhub.position.set(-.58,.48,0);genGrp.add(flyhub);
  const panel=meshBox(.44,.3,.06,-.12,.7,.37,doorMat);genGrp.add(panel);
  const genLed=new THREE.Mesh(new THREE.SphereGeometry(.045,10,10),new THREE.MeshBasicMaterial({color:0x39ff66}));genLed.position.set(-.22,.78,.41);genGrp.add(genLed);
  const genLed2=new THREE.Mesh(new THREE.SphereGeometry(.028,8,8),new THREE.MeshBasicMaterial({color:0xffcf55}));genLed2.position.set(-.05,.78,.41);genGrp.add(genLed2);
  const coreLight=new THREE.PointLight(0xffaa44,1.5,6,2);coreLight.position.set(0,1.0,.45);genGrp.add(coreLight);
  let waveT=-1;
  const lamp=new THREE.SpotLight(0xffd9a0,1.6,7,Math.PI/7,.4,1.4);lamp.position.set(-2.1,2.5,-3.4);lamp.target.position.set(-2.1,1.4,-4.0);
  lamp.castShadow=true;lamp.shadow.mapSize.set(SMALL?512:1024,SMALL?512:1024);lamp.shadow.bias=-0.0005;scene.add(lamp);scene.add(lamp.target);
  scene.add(place(new THREE.Mesh(new THREE.ConeGeometry(.16,.22,16,1,true),steelMat),0,2.55,-3.0));

  // luz de emergencia
  const emer=new THREE.PointLight(0xffb000,1.4,9,1.8);const EMER0=new THREE.Vector3(.4,CH-.3,.3);emer.position.copy(EMER0);emer.castShadow=true;emer.shadow.mapSize.set(SMALL?512:1024,SMALL?512:1024);scene.add(emer);
  const emerCage=new THREE.Mesh(new THREE.SphereGeometry(.12,12,12),new THREE.MeshBasicMaterial({color:0xffca55}));scene.add(emerCage);

  // baliza roja giratoria (gyrophare)
  const gyro=new THREE.Group();gyro.position.set(-1.8,CH-.16,-1);scene.add(gyro);
  gyro.add(new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,.12,12),steelMat));
  const gyroDome=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8,0,6.28,0,1.57),new THREE.MeshBasicMaterial({color:0xff2020,transparent:true,opacity:.5}));gyroDome.position.y=.06;gyro.add(gyroDome);
  const gyroCone=new THREE.Mesh(new THREE.ConeGeometry(.5,1.6,16,1,true),new THREE.MeshBasicMaterial({color:0xff1020,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  gyroCone.rotation.z=Math.PI/2;gyroCone.position.set(.8,0,0);gyro.add(gyroCone);
  const gyroLight=new THREE.PointLight(0xff1818,0,7,2);gyro.add(gyroLight);let gyroOn=0;

  // grietas ocultas
  const cracks=[];for(let i=0;i<3;i++){const cm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(crackTex()),transparent:true,opacity:0,depthWrite:false});
    const cp=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.6),cm);
    if(i===0){cp.position.set(0,1.4,RZ0+.2);}else if(i===1){cp.position.set(-RX+.2,1.4,-0.5);cp.rotation.y=Math.PI/2;}else{cp.position.set(RX-.2,1.5,1.2);cp.rotation.y=-Math.PI/2;}
    scene.add(cp);cracks.push(cm);}let crackIdx=0;

  // ---- portilla + exterior ----
  box(.34,.18,1.7,RX,1.9,-2.0,steelMat);box(.34,.18,1.7,RX,.7,-2.0,steelMat);box(.34,1.2,.18,RX,1.3,-2.85,steelMat);box(.34,1.2,.18,RX,1.3,-1.15,steelMat);
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.1),new THREE.MeshPhysicalMaterial({color:0x223,transparent:true,opacity:.18,roughness:.4,metalness:0}));glass.position.set(RX-.02,1.3,-2.0);glass.rotation.y=-Math.PI/2;scene.add(glass);
  for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.1,8),steelMat);b.position.set(RX-.05,1.3,-2.55+i*.55);scene.add(b);}
  const outG=new THREE.Group();scene.add(outG);
  outG.add(place(new THREE.Mesh(new THREE.PlaneGeometry(40,30),new THREE.MeshStandardMaterial({color:0x120e12,roughness:1})),RX+12,-.1,-2,-Math.PI/2,0,0));
  const sk=cv(512,256),skx=sk.getContext('2d');const grd=skx.createLinearGradient(0,0,0,256);grd.addColorStop(0,'#1a0a16');grd.addColorStop(1,'#070409');skx.fillStyle=grd;skx.fillRect(0,0,512,256);
  skx.fillStyle='#0a0509';for(let i=0;i<40;i++){const w=12+Math.random()*40,h=40+Math.random()*180;skx.fillRect(i*13,256-h,w,h);}
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(46,18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sk),fog:true}));sky.position.set(RX+18,7,-2);sky.rotation.y=-Math.PI/2;outG.add(sky);
  for(let i=0;i<7;i++){const h=2+Math.random()*5;const b=new THREE.Mesh(new THREE.BoxGeometry(1+Math.random()*2,h,1+Math.random()),new THREE.MeshStandardMaterial({color:0x0d0a0d,roughness:1}));b.position.set(RX+4+Math.random()*8,h/2,-6+Math.random()*8);outG.add(b);}
  const enjLight=new THREE.PointLight(0xff2e88,2.0,18,1.5);enjLight.position.set(RX+5,3,-1);outG.add(enjLight);
  const enjLeak=new THREE.PointLight(0xff2e88,.5,6,2);enjLeak.position.set(RX+.6,1.3,-2);scene.add(enjLeak);
  const cN=SMALL?70:130,bodyG=new THREE.CylinderGeometry(.16,.2,.9,6),headG=new THREE.SphereGeometry(.16,8,6);
  const cMat=new THREE.MeshStandardMaterial({color:0x18141a,roughness:1,emissive:0x2a0014,emissiveIntensity:.4});
  const cBody=new THREE.InstancedMesh(bodyG,cMat,cN),cHead=new THREE.InstancedMesh(headG,cMat,cN);cBody.count=0;cHead.count=0;outG.add(cBody);outG.add(cHead);
  const cBase=[],cPh=[];for(let i=0;i<cN;i++){const a=Math.random()*6.28,r=Math.random()*3.2;cBase.push(new THREE.Vector3(RX+1.2+Math.abs(Math.cos(a))*r,.45,-2+Math.sin(a)*r*1.4));cPh.push(Math.random()*6.28);}
  const PN=SMALL?50:110,pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3),psd=[];
  for(let i=0;i<PN;i++){pp[i*3]=RX+2+Math.random()*10;pp[i*3+1]=Math.random()*8;pp[i*3+2]=-7+Math.random()*9;psd.push(Math.random()*6.28);}
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  const parts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xff2e88,size:.13,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));outG.add(parts);
  // polvo ambiente — repartido por TODAS las salas (no sólo el hub): atmósfera de búnker abandonado, sutil y barato
  // (un solo sistema de Points = 1 draw call). Cajas ≈ AREAS de game.js (hub, pasillo, biblioteca, cultivo, taller, descanso, carga).
  const DROOMS=[
    {x0:-2.8,x1:2.8,z0:-4.9,z1:3.25},    // hub
    {x0:-1.15,x1:1.15,z0:3.1,z1:5.35},   // pasillo
    {x0:-3.25,x1:3.25,z0:5.05,z1:8.35},  // biblioteca
    {x0:-3.25,x1:3.25,z0:8.05,z1:11.65}, // cultivo
    {x0:3.15,x1:7.05,z0:5.75,z1:8.25},   // taller
    {x0:-7.2,x1:-3.15,z0:5.75,z1:8.25},  // descanso
    {x0:-6.45,x1:-2.70,z0:-0.8,z1:3.05}, // sector de carga
    {x0:-3.25,x1:3.25,z0:11.8,z1:15.25}, // colmena (motas/polen flotando)
    {x0:-7.2,x1:-3.4,z0:8.2,z1:11.8}     // fabricación (polvo técnico)
  ];
  const DN=SMALL?70:150,dg=new THREE.BufferGeometry(),dp=new Float32Array(DN*3),dsd=[];
  for(let i=0;i<DN;i++){const r=DROOMS[i%DROOMS.length];dp[i*3]=r.x0+Math.random()*(r.x1-r.x0);dp[i*3+1]=.2+Math.random()*2.2;dp[i*3+2]=r.z0+Math.random()*(r.z1-r.z0);dsd.push(Math.random()*6.28);}
  dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xffe6b0,size:.025,transparent:true,opacity:.42,depthWrite:false}));scene.add(dust);
  // ESCOMBROS que caen (en temblor)
  const FN=70,fg=new THREE.BufferGeometry(),fp=new Float32Array(FN*3),fv=[];
  for(let i=0;i<FN;i++){fp[i*3]=(Math.random()-.5)*5.6;fp[i*3+1]=CH-.1;fp[i*3+2]=RZ0+.4+Math.random()*(depth-.8);fv.push(.8+Math.random());}
  fg.setAttribute('position',new THREE.BufferAttribute(fp,3));
  const debris=new THREE.Points(fg,new THREE.PointsMaterial({color:0x8a8478,size:.04,transparent:true,opacity:0,depthWrite:false}));scene.add(debris);let dustFall=0;

  // ---- CÁMARA DE VIGILANCIA (te sigue) ----
  const cctv=new THREE.Group();cctv.position.set(RX-.3,CH-.28,2.5);scene.add(cctv);
  cctv.add(new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.28),steelMat));
  const cctvHead=new THREE.Group();cctv.add(cctvHead);
  cctvHead.add(new THREE.Mesh(new THREE.BoxGeometry(.2,.15,.28),new THREE.MeshStandardMaterial({color:0x1c1c1f,roughness:.5,metalness:.6})));
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.08,16),new THREE.MeshStandardMaterial({color:0x060606,roughness:.15,metalness:.4}));lens.rotation.x=Math.PI/2;lens.position.set(0,0,-.16);cctvHead.add(lens);
  const lensGlow=new THREE.Mesh(new THREE.CircleGeometry(.032,16),new THREE.MeshBasicMaterial({color:0xff2020}));lensGlow.position.set(0,0,-.205);cctvHead.add(lensGlow);
  const recLed=new THREE.Mesh(new THREE.SphereGeometry(.014,8,8),new THREE.MeshBasicMaterial({color:0xff0000}));recLed.position.set(.08,.06,-.1);cctvHead.add(recLed);

  // ---- CULTIVO HIDROPÓNICO ----
  // (growMat removido: ya no quedan plantas procedurales en el cultivo, son GLB)
  for(let k=0;k<3;k++){const y=.55+k*.62;box(.5,.04,1.3,-2.9,y,10.3,steelMat);
    // (hojas-esfera removidas: los brotes GLB se distribuyen en game.js, donde existe el loader)
    scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(.46,.03,1.2),new THREE.MeshBasicMaterial({color:0xc83cff})),-2.9,y+.5,10.3));}
  const growLight=new THREE.PointLight(0xb43cff,1.05,4.5,2);growLight.position.set(-2.6,1.5,10.3);scene.add(growLight); // magenta rack izq (bajado 1.3->1.05 para que el verde respire; el relleno neutro va en game.js)
  box(.05,2.1,.05,-3.15,1.05,9.7,steelMat);box(.05,2.1,.05,-3.15,1.05,10.9,steelMat);

  // ---- RACK DE SERVIDORES ----
  box(.5,1.7,.42,2.7,.85,RZ0+.32,doorMat);
  const serverLeds=[];for(let i=0;i<11;i++){const l=new THREE.Mesh(new THREE.PlaneGeometry(.045,.022),new THREE.MeshBasicMaterial({color:0x39ff88}));l.position.set(2.45,.35+i*.13,RZ0+.33);scene.add(l);serverLeds.push(l);}

  // ---- TIRA DE LED ----
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(.1,.02,depth-1.2),new THREE.MeshBasicMaterial({color:0xbfefff})),0,CH-.06,midz));
  const stripLight=new THREE.PointLight(0xbfefff,.55,9,2);stripLight.position.set(0,CH-.25,0);scene.add(stripLight);

  // ---- PANEL ELÉCTRICO + ESCALERA ----
  box(.4,.5,.08,RX-.22,1.5,1.6,doorMat);
  for(let i=0;i<3;i++){const sw=new THREE.Mesh(new THREE.BoxGeometry(.04,.08,.05),steelMat);sw.position.set(RX-.3,1.4+i*.13,1.6);scene.add(sw);}
  for(let i=0;i<6;i++){const rung=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.4,8),steelMat);rung.rotation.z=Math.PI/2;rung.position.set(-2.6,.3+i*.38,RZ0+.28);scene.add(rung);}
  box(.04,2.3,.04,-2.8,1.15,RZ0+.28,steelMat);box(.04,2.3,.04,-2.4,1.15,RZ0+.28,steelMat);
  scene.add(place(new THREE.Mesh(new THREE.CircleGeometry(.3,20),doorMat),-2.6,CH-.05,RZ0+.5,Math.PI/2,0,0));

  // ---- MOBILIARIO (sillón, biblioteca, zona en obra) ----
  function signWarn(t){const c=cv(256,128),x=c.getContext('2d');x.fillStyle='#1a1a1a';x.fillRect(0,0,256,128);
    for(let i=-128;i<256;i+=28){x.fillStyle='#f5c400';x.beginPath();x.moveTo(i,0);x.lineTo(i+14,0);x.lineTo(i+14-30,128);x.lineTo(i-30,128);x.fill();}
    x.fillStyle='#1a1a1a';x.fillRect(18,40,220,48);x.fillStyle='#f5c400';x.font='32px Anton, sans-serif';x.textAlign='center';x.fillText(t,128,75);return c;}
  const sofaMat=new THREE.MeshStandardMaterial({map:tex(grime('#4a3f30'),1),normalMap:_wn,roughness:.96});
  const cushMat=new THREE.MeshStandardMaterial({color:0x564833,roughness:1});
  // (sillon movido a la sala DESCANSO)
  const shelfMat=new THREE.MeshStandardMaterial({map:tex(grime('#3a2f22'),1),normalMap:_wn,roughness:1});
  const lib=new THREE.Group();lib.position.set(-2.0,0,5.55);scene.add(lib);
  lib.add(meshBox(1.3,1.7,.32,0,.85,0,shelfMat));
  for(let s=0;s<3;s++)lib.add(meshBox(1.22,.04,.28,0,.45+s*.46,.03,shelfMat));
  const bookCols=[0x6a3030,0x30506a,0x3a6a30,0x6a5a30,0x503060,0x803020];
  for(let s=0;s<3;s++)for(let b=0;b<8;b++){const bk=meshBox(.11,.24+Math.random()*.1,.22,-.52+b*.135,.58+s*.46,.06,new THREE.MeshStandardMaterial({color:bookCols[Math.floor(Math.random()*bookCols.length)],roughness:.9}));bk.rotation.z=(Math.random()-.5)*.06;lib.add(bk);}
  // lámpara de lectura cálida
  const readLight=new THREE.PointLight(0xffcf90,1.0,3,2);readLight.position.set(-1.4,1.6,2.6);scene.add(readLight);
  // (puerta EN OBRA destapiada: el hueco z[1.9,3.2] abre al SECTOR DE CARGA; el marco y la sala se construyen en game.js)

  // (infección orgánica interior removida — visual limpia)
  // (colonias de infección interior removidas)

  // (CRT del observatorio "estado del refugio" JUBILADO: dashboard del memecoin viejo —refugiados/almas/
  //  mundo asimilado— en español; contradecía el canon. alertMsg se conserva: lo escribe showAlert.)
  let alertMsg='';

  // ---- post ----
  let composer=null,filmPass=null,rgbPass=null;
  try{composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));
    const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),SMALL?.12:.18,.45,.85);composer.addPass(bloom);
    rgbPass=new THREE.ShaderPass(THREE.RGBShiftShader);rgbPass.uniforms.amount.value=.0014;composer.addPass(rgbPass); // aberración cromática (base; game.js la spikea en el glitch)
    const vigPass=new THREE.ShaderPass(THREE.VignetteShader);vigPass.uniforms.offset.value=.72;vigPass.uniforms.darkness.value=1.0;composer.addPass(vigPass); // viñeta CCTV marcada (esquinas ~26%, bordes ~13%) — túnel
    filmPass=new THREE.ShaderPass(THREE.FilmShader);filmPass.uniforms.nIntensity.value=.42;filmPass.uniforms.sIntensity.value=.18;filmPass.uniforms.sCount.value=SMALL?320:480;filmPass.uniforms.grayscale.value=0;filmPass.renderToScreen=true;composer.addPass(filmPass); // grano + scanlines marcados (2a pasada; el grano real lo fija GRAIN_BASE en game.js)
  }catch(e){composer=null;rgbPass=null;filmPass=null;}
