// EL BÚNKER — HUD: stats, recursos, inventario y mapa
  // ---- STATS del modo jugable (hambre/sed/energía/cordura) — JUBILADAS: un robot no come/bebe/enloquece. ----

  // ---- RECURSOS DEL REFUGIO ----
  // inventario completo: vitales (se muestran arriba) + materias primas y componentes (banco de crafteo)
  const res={fuel:6,food:5,water:5,med:2,chatarra:2,circuitos:0,cables:0,plastico:0,tela:1,semillas:1,quimicos:0,lingote:0,placa:0,telatratada:0,bateria:0};
  let nucleo=80;
  function renderRes(){for(const k in res){const e=document.querySelector(`#res [data-r="${k}"] .rv`);if(e)e.textContent=res[k];}
    const nb=$('#nucleo-bar');if(nb){nb.style.width=clamp(nucleo,0,100)+'%';nb.style.background=nucleo<25?'#ff2e88':'#39ffd0';nb.style.boxShadow='0 0 10px '+(nucleo<25?'#ff2e88':'#39ffd0');}
    const np=$('#nucleo-pct');if(np)np.textContent=Math.round(clamp(nucleo,0,100))+'%';}
  // ---- HOTBAR del modo jugable (comer/beber/medicarse + consola del robot) — JUBILADA. ----
  // res/renderRes se conservan: los usa la maquinaria inerte de retorno del robot (robotReturn).
  renderRes();let flashLight=0;

  // ---- MAPA (blueprint) ----
  let mapAcc=0;
  // flash (4º param; sólo modo beta, null en livestream → mapa idéntico a hoy): {room:'<zona>', a:0..1} → ESE sector pulsa ámbar-rojo (tarea de mantenimiento activa)
  function drawMapPlan(px,pz,yaw,flash){
    const c=$('#mapc'),x=c.getContext('2d');
    x.fillStyle='#02160c';x.fillRect(0,0,196,150);
    x.fillStyle='#8fffb0';x.shadowColor='#8fffb0';x.shadowBlur=5;x.font='11px VT323, monospace';x.textAlign='left';x.fillText(T('map_title'),7,12);x.shadowBlur=0;
    const MINX=-7.7,MAXX=7.7,MINZ=-6,MAXZ=15.6,sc=Math.min(176/(MAXX-MINX),120/(MAXZ-MINZ)),cxC=(MINX+MAXX)/2;
    const m=(wx,wz)=>[98+(wx-cxC)*sc,24+(wz-MINZ)*sc];
    function room(x0,z0,x1,z1,fill){const a=m(x0,z0),b=m(x1,z1);if(fill){x.fillStyle=fill;x.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}x.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}
    x.strokeStyle='rgba(143,255,176,.55)';x.lineWidth=1.3;
    room(-RX,RZ0,RX,RZ1,'rgba(143,255,176,.05)');           // observatorio (hub)
    room(-1.3,RZ1,1.3,5.2,'rgba(143,255,176,.05)');         // pasillo
    room(-3.4,5.2,3.4,8.2,'rgba(143,255,176,.05)');         // biblioteca
    room(-3.4,8.2,3.4,11.8,'rgba(143,255,176,.07)');        // cultivo
    room(3.4,5.5,7.4,8.5,'rgba(255,200,120,.07)');          // taller
    room(-7.4,5.5,-3.4,8.5,'rgba(150,190,255,.07)');        // descanso
    room(-6.45,-0.8,-2.7,3.05,'rgba(150,190,255,.06)');     // carga
    room(-7.2,8.45,-3.15,11.55,'rgba(143,255,176,.06)');    // fabricación
    room(-3.25,11.55,3.25,15.25,'rgba(255,200,120,.06)');   // colmena
    room(3.4,11.8,7.2,15.4,'rgba(230,200,120,.05)');        // bóveda (este de la colmena)
    x.fillStyle='rgba(201,201,184,.75)';x.font='8px VT323, monospace';x.textAlign='center';
    const lab=(t,wx,wz)=>{const p=m(wx,wz);x.fillText(t,p[0],p[1]);};
    lab(T('room_observatory'),0,-1.2);lab(T('room_library'),-1.2,6.4);lab(T('room_cultivo'),0,9.6);lab(T('room_workshop'),5.4,7.0);lab(T('room_rest'),-5.4,7.0);
    lab(T('room_charging'),-4.6,1.1);lab(T('room_fab'),-5.2,10.0);lab(T('room_hive'),0,13.4);lab(T('room_vault'),5.3,13.5);
    // DESTELLO de tareas de mantenimiento: cada sector activo pulsa ámbar-rojo. flash = {room,a} O array de {room,a} (varias tareas a la vez). Mismas coords que los room() de arriba.
    if(flash){ const REC={observatorio:[-RX,RZ0,RX,RZ1],pasillo:[-1.3,RZ1,1.3,5.2],biblioteca:[-3.4,5.2,3.4,8.2],cultivo:[-3.4,8.2,3.4,11.8],taller:[3.4,5.5,7.4,8.5],descanso:[-7.4,5.5,-3.4,8.5],carga:[-6.45,-0.8,-2.7,3.05],fab:[-7.2,8.45,-3.15,11.55],colmena:[-3.25,11.55,3.25,15.25],vault:[3.4,11.8,7.2,15.4]};
      const list=Array.isArray(flash)?flash:[flash];
      for(const fl of list){ if(!fl||!fl.room)continue; const R=REC[fl.room]; if(!R)continue; const a=m(R[0],R[1]),b=m(R[2],R[3]),al=Math.max(0,Math.min(1,fl.a==null?0.6:fl.a));
        x.save();x.fillStyle='rgba(255,90,60,'+(0.10+0.28*al)+')';x.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
        x.strokeStyle='rgba(255,120,70,'+(0.4+0.6*al)+')';x.lineWidth=1.6;x.shadowColor='#ff7a46';x.shadowBlur=4+8*al;x.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);x.restore();x.shadowBlur=0; } }
    // marcador = la UNIDAD R-01 (ya no hay jugador): triángulo ámbar orientado al rumbo del robot
    const p=m(px,pz);x.save();x.translate(p[0],p[1]);x.rotate(yaw);x.fillStyle='#ffb000';x.shadowColor='#ffb000';x.shadowBlur=6;x.beginPath();x.moveTo(0,4.5);x.lineTo(3,-4);x.lineTo(-3,-4);x.closePath();x.fill();x.restore();x.shadowBlur=0;x.textAlign='left';
  }
  if($('#blip'))$('#blip').style.display='none';
