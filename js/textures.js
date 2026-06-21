// EL BÚNKER — texturas procedurales y materiales
  // ---- texturas ----
  function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function tex(c,rep){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep,rep);t.anisotropy=4;return t;}
  function concrete(b){const c=cv(256,256),x=c.getContext('2d');x.fillStyle=b;x.fillRect(0,0,256,256);
    for(let i=0;i<2600;i++){const g=Math.random();x.fillStyle=`rgba(${g<.5?20:200},${g<.5?24:195},${g<.5?20:180},${Math.random()*.1})`;x.fillRect(Math.random()*256,Math.random()*256,1,1);}
    for(let i=0;i<40;i++){x.fillStyle=`rgba(8,10,7,${Math.random()*.28})`;x.beginPath();x.arc(Math.random()*256,Math.random()*256,10+Math.random()*55,0,7);x.fill();}
    for(let i=0;i<14;i++){x.fillStyle=`rgba(${30+Math.random()*30},${50+Math.random()*40},${20+Math.random()*20},${Math.random()*.22})`;x.beginPath();x.arc(Math.random()*256,Math.random()*256,8+Math.random()*30,0,7);x.fill();}
    for(let i=0;i<18;i++){const px=Math.random()*256,w=1+Math.random()*4,h=20+Math.random()*120;x.fillStyle=`rgba(6,8,6,${.1+Math.random()*.2})`;x.fillRect(px,Math.random()*120,w,h);}
    return c;}
  function bump(){const c=cv(256,256),x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,256,256);
    for(let i=0;i<16000;i++){const v=120+Math.random()*30;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(Math.random()*256,Math.random()*256,1,1);}return c;}
  function rust(){const c=cv(256,256),x=c.getContext('2d');x.fillStyle='#3a3d40';x.fillRect(0,0,256,256);
    for(let i=0;i<40;i++){const o=Math.random();x.fillStyle=`rgba(${120+o*80},${50+o*30},20,${Math.random()*.5})`;x.beginPath();x.arc(Math.random()*256,Math.random()*256,6+Math.random()*30,0,7);x.fill();}
    for(let i=0;i<5000;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.15})`;x.fillRect(Math.random()*256,Math.random()*256,1,1);}return c;}
  function signTex(t1,t2){const c=cv(512,256),x=c.getContext('2d');x.fillStyle='#1c1f1a';x.fillRect(0,0,512,256);
    x.strokeStyle='#ffb000';x.lineWidth=8;x.strokeRect(16,16,480,224);x.fillStyle='#ffb000';x.shadowColor='#ffb000';x.shadowBlur=14;x.textAlign='center';
    x.font='62px Anton, sans-serif';x.fillText(t1,256,110);x.font='40px VT323, monospace';x.fillText(t2,256,180);return c;}
  function crackTex(){const c=cv(256,256),x=c.getContext('2d');x.clearRect(0,0,256,256);x.strokeStyle='rgba(5,5,8,.95)';
    function branch(px,py,ang,len,w){if(len<6)return;x.lineWidth=w;x.beginPath();x.moveTo(px,py);const nx=px+Math.cos(ang)*len,ny=py+Math.sin(ang)*len;x.lineTo(nx,ny);x.stroke();
      if(Math.random()<.6)branch(nx,ny,ang+(Math.random()-.5)*1.2,len*.7,w*.8);if(Math.random()<.4)branch(nx,ny,ang+(Math.random()-.5)*1.6,len*.5,w*.7);}
    branch(128,20,Math.PI/2+(Math.random()-.5),46,4);return c;}

  function heightToNormal(hc,strength){const w=hc.width,h=hc.height,sd=hc.getContext('2d').getImageData(0,0,w,h).data;
    const out=cv(w,h),oc=out.getContext('2d'),od=oc.createImageData(w,h);
    const H=(x,y)=>{x=(x+w)%w;y=(y+h)%h;return sd[(y*w+x)*4]/255;};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(H(x-1,y)-H(x+1,y))*strength,dy=(H(x,y-1)-H(x,y+1))*strength,l=Math.hypot(dx,dy,1),i=(y*w+x)*4;
      od.data[i]=(dx/l*.5+.5)*255;od.data[i+1]=(dy/l*.5+.5)*255;od.data[i+2]=(1/l*.5+.5)*255;od.data[i+3]=255;}
    oc.putImageData(od,0,0);return out;}
  function metalHeight(){const c=cv(256,256),x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,256,256);
    x.strokeStyle='#5a5a5a';x.lineWidth=2;for(let y=0;y<256;y+=42){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();}
    x.fillStyle='#c8c8c8';for(let y=10;y<256;y+=42)for(let i=14;i<256;i+=40){x.beginPath();x.arc(i,y,3,0,7);x.fill();}
    for(let i=0;i<8000;i++){const v=110+Math.random()*40;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(Math.random()*256,Math.random()*256,1,1);}return c;}
  function grime(base){const c=cv(128,128),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,128,128);
    for(let i=0;i<70;i++){x.fillStyle='rgba(0,0,0,'+(0.04+Math.random()*0.13)+')';x.beginPath();x.arc(Math.random()*128,Math.random()*128,3+Math.random()*22,0,7);x.fill();}
    for(let i=0;i<34;i++){x.fillStyle='rgba(210,205,180,'+(0.03+Math.random()*0.09)+')';x.beginPath();x.arc(Math.random()*128,Math.random()*128,2+Math.random()*9,0,7);x.fill();}
    for(let i=0;i<20;i++){x.strokeStyle='rgba(0,0,0,'+(0.05+Math.random()*0.11)+')';x.lineWidth=Math.random()*1.6;x.beginPath();const sx=Math.random()*128,sy=Math.random()*128;x.moveTo(sx,sy);x.lineTo(sx+(Math.random()-.5)*46,sy+(Math.random()-.5)*46);x.stroke();}
    return c;}
  const _wn=tex(heightToNormal(bump(),1.3),1);
  function floorTiles(base){const c=cv(512,512),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,512,512);const T=128;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){const ox=i*T,oy=j*T,v=(Math.random()-.5)*.16;
      x.fillStyle='rgba('+(v>0?255:0)+','+(v>0?255:0)+','+(v>0?255:0)+','+Math.abs(v).toFixed(3)+')';x.fillRect(ox+3,oy+3,T-6,T-6);
      x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=2;x.strokeRect(ox+4,oy+4,T-8,T-8);
      x.strokeStyle='rgba(0,0,0,.16)';x.strokeRect(ox+6,oy+6,T-11,T-11);}
    x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=6;for(let i=0;i<=4;i++){const q=i*T;x.beginPath();x.moveTo(q,0);x.lineTo(q,512);x.moveTo(0,q);x.lineTo(512,q);x.stroke();}
    for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){const px=i*T,py=j*T;x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(px,py,5,0,7);x.fill();x.fillStyle='rgba(190,188,176,.5)';x.beginPath();x.arc(px-1,py-1,2.4,0,7);x.fill();}
    for(let i=0;i<8;i++){const px=Math.random()*512,py=Math.random()*512,r=20+Math.random()*70,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(0,0,0,.3)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,7);x.fill();}
    for(let i=0;i<90;i++){const dk=Math.random()<.5;x.strokeStyle=dk?'rgba(0,0,0,'+(Math.random()*.12)+')':'rgba(255,255,255,'+(Math.random()*.05)+')';x.lineWidth=Math.random()*1.4;const sx=Math.random()*512,sy=Math.random()*512,a=Math.random()*6.28,l=8+Math.random()*44;x.beginPath();x.moveTo(sx,sy);x.lineTo(sx+Math.cos(a)*l,sy+Math.sin(a)*l);x.stroke();}
    for(let i=0;i<120;i++){x.fillStyle='rgba(0,0,0,'+(.03+Math.random()*.08)+')';x.beginPath();x.arc(Math.random()*512,Math.random()*512,2+Math.random()*10,0,7);x.fill();}
    return c;}
  function floorHeight(){const c=cv(512,512),x=c.getContext('2d'),T=128;x.fillStyle='#888';x.fillRect(0,0,512,512);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.fillStyle='#9c9c9c';x.fillRect(i*T+8,j*T+8,T-16,T-16);}
    x.strokeStyle='#363636';x.lineWidth=8;for(let i=0;i<=4;i++){const q=i*T;x.beginPath();x.moveTo(q,0);x.lineTo(q,512);x.moveTo(0,q);x.lineTo(512,q);x.stroke();}
    for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){x.fillStyle='#ececec';x.beginPath();x.arc(i*T,j*T,4,0,7);x.fill();}
    for(let i=0;i<9000;i++){const v=128+Math.random()*16;x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(Math.random()*512,Math.random()*512,1,1);}return c;}
  function wallPanels(base){const c=cv(512,512),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,512,512);const PW=256,PH=170;
    for(let i=0;i<2;i++)for(let j=0;j<4;j++){const v=(Math.random()-.5)*.12;x.fillStyle='rgba('+(v>0?255:0)+','+(v>0?255:0)+','+(v>0?255:0)+','+Math.abs(v).toFixed(3)+')';x.fillRect(i*PW,j*PH,PW,PH);}
    x.fillStyle='rgba(0,0,0,.42)';x.fillRect(254,0,4,512);for(let j=0;j<=3;j++)x.fillRect(0,j*PH,512,4);
    x.fillStyle='rgba(255,255,255,.05)';for(let j=0;j<=3;j++)x.fillRect(0,j*PH-2,512,2);x.fillRect(252,0,2,512);
    x.fillStyle='rgba(0,0,0,.45)';for(let j=0;j<=3;j++)for(let i=0;i<512;i+=40){x.beginPath();x.arc(i+12,j*PH+10,3,0,7);x.fill();}
    for(let yy=18;yy<512;yy+=40){x.beginPath();x.arc(256,yy,3,0,7);x.fill();}
    for(let i=0;i<16;i++){const px=Math.random()*512,py=Math.floor(Math.random()*4)*PH+4,len=20+Math.random()*80,g=x.createLinearGradient(px,py,px,py+len);g.addColorStop(0,'rgba(124,72,32,.28)');g.addColorStop(1,'rgba(124,72,32,0)');x.fillStyle=g;x.fillRect(px,py,2+Math.random()*3,len);}
    for(let i=0;i<46;i++){x.fillStyle='rgba(0,0,0,'+(.03+Math.random()*.09)+')';x.beginPath();x.arc(Math.random()*512,Math.random()*512,4+Math.random()*22,0,7);x.fill();}
    return c;}
  function wallHeight(){const c=cv(512,512),x=c.getContext('2d'),PW=256,PH=170;x.fillStyle='#9a9a9a';x.fillRect(0,0,512,512);
    x.fillStyle='#363636';x.fillRect(253,0,6,512);for(let j=0;j<=3;j++)x.fillRect(0,j*PH-1,512,6);
    x.fillStyle='#ececec';for(let j=0;j<=3;j++)for(let i=0;i<512;i+=40){x.beginPath();x.arc(i+12,j*PH+9,3.6,0,7);x.fill();}
    for(let yy=18;yy<512;yy+=40){x.beginPath();x.arc(256,yy,3.6,0,7);x.fill();}
    for(let i=0;i<9000;i++){const v=146+Math.random()*14;x.fillStyle='rgb('+v+','+v+','+v+')';x.fillRect(Math.random()*512,Math.random()*512,1,1);}return c;}
  const concreteMat=new THREE.MeshStandardMaterial({map:tex(wallPanels('#3f463f'),2),normalMap:tex(heightToNormal(wallHeight(),2.2),2),roughness:.9,metalness:.08});
  const floorMat=new THREE.MeshStandardMaterial({map:tex(floorTiles('#2c2e29'),3),normalMap:tex(heightToNormal(floorHeight(),2.4),3),roughness:.8,metalness:.12});
  const ceilMat=new THREE.MeshStandardMaterial({map:tex(concrete('#34362f'),2),roughness:1,metalness:0});
  const rustMat=new THREE.MeshStandardMaterial({map:tex(rust(),1),normalMap:tex(heightToNormal(bump(),1.8),1),roughness:.55,metalness:.85});
  const metalN=tex(heightToNormal(metalHeight(),1.6),1);
  const steelMat=new THREE.MeshStandardMaterial({color:0x6a6e72,normalMap:metalN,roughness:.4,metalness:.9});
  const doorMat=new THREE.MeshStandardMaterial({color:0x52555a,normalMap:metalN,roughness:.5,metalness:.85});
  const tableMat=new THREE.MeshStandardMaterial({map:tex(grime('#4a4d52'),1),normalMap:_wn,roughness:.55,metalness:.65});
  const sandMat=new THREE.MeshStandardMaterial({map:tex(grime('#5a5236'),2),normalMap:_wn,roughness:1});
