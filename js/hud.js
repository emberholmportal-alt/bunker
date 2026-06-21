// EL BÚNKER — HUD: stats, recursos, inventario y mapa
  // ---- STATS + INVENTARIO ----
  const stats={hambre:100,sed:100,energia:100,cordura:100};
  const SDEF=[['hambre',T('stat_hunger'),'🍖','#ffb000'],['sed',T('stat_thirst'),'💧','#39c4ff'],['energia',T('stat_energy'),'⚡','#8fffb0'],['cordura',T('stat_sanity'),'🧠','#ff2e88']];
  const statsEl=$('#stats');SDEF.forEach(([k,l,ic,c])=>{const d=document.createElement('div');d.className='sbar';d.dataset.k=k;
    d.innerHTML=`<div class="lab"><span>${ic} ${l}</span><span class="pct">100</span></div><div class="track"><div class="fill" style="background:${c};box-shadow:0 0 8px ${c}"></div></div>`;statsEl.appendChild(d);});
  function renderStats(){SDEF.forEach(([k])=>{const d=statsEl.querySelector(`[data-k="${k}"]`),v=Math.round(stats[k]);d.querySelector('.fill').style.width=v+'%';d.querySelector('.pct').textContent=v;d.classList.toggle('low',v<25);});}
  renderStats();

  // ---- RECURSOS DEL REFUGIO ----
  // inventario completo: vitales (se muestran arriba) + materias primas y componentes (banco de crafteo)
  const res={fuel:6,food:5,water:5,med:2,chatarra:2,circuitos:0,cables:0,plastico:0,tela:1,semillas:1,quimicos:0,lingote:0,placa:0,telatratada:0,bateria:0};
  let nucleo=80;
  function renderRes(){for(const k in res){const e=document.querySelector(`#res [data-r="${k}"] .rv`);if(e)e.textContent=res[k];}
    const nb=$('#nucleo-bar');if(nb){nb.style.width=clamp(nucleo,0,100)+'%';nb.style.background=nucleo<25?'#ff2e88':'#39ffd0';nb.style.boxShadow='0 0 10px '+(nucleo<25?'#ff2e88':'#39ffd0');}
    const np=$('#nucleo-pct');if(np)np.textContent=Math.round(clamp(nucleo,0,100))+'%';}
  const ICONS={food:'<svg viewBox="0 0 24 24" fill="none" stroke="#e6c490" stroke-width="1.5" stroke-linecap="round"><ellipse cx="12" cy="5.5" rx="5.5" ry="2"/><path d="M6.5 5.5v13c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-13"/><path d="M9.5 9v8M12 9v8M14.5 9v8" stroke-width="1.1"/></svg>',water:'<svg viewBox="0 0 24 24"><path d="M12 3.5c0 0-6.5 7.2-6.5 11.2a6.5 6.5 0 0 0 13 0c0-4-6.5-11.2-6.5-11.2z" fill="#6cc0ee" stroke="#9bd8f8" stroke-width="1"/><path d="M9 14a3 3 0 0 0 1 3" fill="none" stroke="#bfeaff" stroke-width="1" stroke-linecap="round"/></svg>',med:'<svg viewBox="0 0 24 24"><g transform="rotate(45 12 12)"><rect x="5.5" y="9" width="13" height="6" rx="3" fill="#ef6b6b"/><path d="M12 9h-3.5a3 3 0 0 0 0 6H12z" fill="#f6dada"/><rect x="5.5" y="9" width="13" height="6" rx="3" fill="none" stroke="#cf4a4a" stroke-width="1"/></g></svg>',fuel:'<svg viewBox="0 0 24 24" fill="none" stroke="#e6a868" stroke-width="1.5" stroke-linejoin="round"><rect x="5" y="8" width="10" height="11" rx="1"/><path d="M15 11h3v5h-3M8 8V6h4v2"/><line x1="7.5" y1="11.5" x2="13.5" y2="11.5" stroke-width="1.1"/></svg>',mats:'<svg viewBox="0 0 24 24" fill="none" stroke="#c2c8d0" stroke-width="1.5" stroke-linejoin="round"><path d="M8 4.5h8l4 7.5-4 7.5H8l-4-7.5z"/><circle cx="12" cy="12" r="3.3"/></svg>',tablet:'<svg viewBox="0 0 24 24" fill="none" stroke="#8fffb0" stroke-width="1.5"><rect x="5.5" y="3" width="13" height="18" rx="2"/><line x1="5.5" y1="17.5" x2="18.5" y2="17.5"/><circle cx="12" cy="19.2" r="0.7" fill="#8fffb0" stroke="none"/></svg>'};
  const HB=[['food','hambre',T('item_eat')],['water','sed',T('item_drink')],['med','cordura',T('item_heal')]];
  const invEl=$('#inv');
  function renderHotbar(){invEl.innerHTML='';HB.forEach(([rk,sk,lbl])=>{const s=document.createElement('div');s.className='slot'+(res[rk]<=0?' empty':'');
    s.innerHTML=`${ICONS[rk]}<span class="cnt">${res[rk]}</span><span class="hlbl">${lbl}</span>`;
    if(res[rk]>0)s.addEventListener('click',()=>{res[rk]--;stats[sk]=clamp(stats[sk]+28,0,100);blip();renderHotbar();renderRes();renderStats();});invEl.appendChild(s);});
    const tb=document.createElement('div');tb.className='slot tablet';tb.title=T('tt_robot_console');tb.innerHTML=`${ICONS.tablet}<span class="hlbl">${T('item_robot')}</span>`;tb.addEventListener('click',()=>{const r=$('#robotui');r.style.display=r.style.display==='block'?'none':'block';});invEl.appendChild(tb);}
  renderHotbar();renderRes();let flashLight=0;

  // ---- MAPA (blueprint) ----
  let mapAcc=0;
  function drawMapPlan(px,pz,yaw){
    const c=$('#mapc'),x=c.getContext('2d');
    x.fillStyle='#02160c';x.fillRect(0,0,196,150);
    x.fillStyle='#8fffb0';x.shadowColor='#8fffb0';x.shadowBlur=5;x.font='11px VT323, monospace';x.textAlign='left';x.fillText(T('map_title'),7,12);x.shadowBlur=0;
    const MINX=-7.7,MAXX=7.7,MINZ=-6,MAXZ=12.4,sc=Math.min(176/(MAXX-MINX),120/(MAXZ-MINZ)),cxC=(MINX+MAXX)/2;
    const m=(wx,wz)=>[98+(wx-cxC)*sc,24+(wz-MINZ)*sc];
    function room(x0,z0,x1,z1,fill){const a=m(x0,z0),b=m(x1,z1);if(fill){x.fillStyle=fill;x.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}x.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}
    x.strokeStyle='rgba(143,255,176,.55)';x.lineWidth=1.3;
    room(-RX,RZ0,RX,RZ1,'rgba(143,255,176,.05)');
    room(-1.3,RZ1,1.3,5.2,'rgba(143,255,176,.05)');
    room(-3.4,5.2,3.4,8.2,'rgba(143,255,176,.05)');
    room(-3.4,8.2,3.4,11.8,'rgba(143,255,176,.07)');
    room(3.4,5.5,7.4,8.5,'rgba(255,200,120,.07)');
    room(-7.4,5.5,-3.4,8.5,'rgba(150,190,255,.07)');
    x.fillStyle='rgba(201,201,184,.75)';x.font='8px VT323, monospace';x.textAlign='center';
    const lab=(t,wx,wz)=>{const p=m(wx,wz);x.fillText(t,p[0],p[1]);};
    lab(T('room_observatory'),0,-1.2);lab(T('room_library'),-1.2,6.4);lab(T('room_cultivo'),0,10);lab(T('room_workshop'),5.4,7.0);lab(T('room_rest'),-5.4,7.0);
    const p=m(px,pz);x.save();x.translate(p[0],p[1]);x.rotate(yaw);x.fillStyle='#8fffb0';x.shadowColor='#8fffb0';x.shadowBlur=6;x.beginPath();x.moveTo(0,-4.5);x.lineTo(3,4);x.lineTo(-3,4);x.closePath();x.fill();x.restore();x.shadowBlur=0;x.textAlign='left';
  }
  if($('#blip'))$('#blip').style.display='none';
