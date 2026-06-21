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
  function floorTiles(base){const c=cv(256,256),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,256,256);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.fillStyle='rgba(0,0,0,'+(Math.random()*.13)+')';x.fillRect(i*64+2,j*64+2,60,60);}
    x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=3;for(let i=0;i<=4;i++){const q=i*64;x.beginPath();x.moveTo(q,0);x.lineTo(q,256);x.moveTo(0,q);x.lineTo(256,q);x.stroke();}
    for(let i=0;i<42;i++){x.fillStyle='rgba(0,0,0,'+(.04+Math.random()*.1)+')';x.beginPath();x.arc(Math.random()*256,Math.random()*256,3+Math.random()*14,0,7);x.fill();}
    return c;}
  function wallPanels(base){const c=cv(256,256),x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,256,256);
    for(let i=1;i<6;i++){const q=i*42.6;x.fillStyle='rgba(255,255,255,.04)';x.fillRect(0,q-1,256,2);x.fillStyle='rgba(0,0,0,.32)';x.fillRect(0,q,256,2);}
    x.fillStyle='rgba(0,0,0,.32)';for(let i=0;i<6;i++)for(let j=0;j<6;j++){x.beginPath();x.arc(18+i*43,18+j*43,2,0,7);x.fill();}
    for(let i=0;i<34;i++){x.fillStyle='rgba(0,0,0,'+(.04+Math.random()*.1)+')';x.beginPath();x.arc(Math.random()*256,Math.random()*256,4+Math.random()*16,0,7);x.fill();}
    return c;}
  const concreteMat=new THREE.MeshStandardMaterial({map:tex(wallPanels('#3f463f'),2),normalMap:tex(heightToNormal(bump(),1.2),2),roughness:.95,metalness:.03});
  const floorMat=new THREE.MeshStandardMaterial({map:tex(floorTiles('#2c2e29'),3),normalMap:tex(heightToNormal(bump(),1.4),3),roughness:.88,metalness:.05});
  const ceilMat=new THREE.MeshStandardMaterial({map:tex(concrete('#34362f'),2),roughness:1,metalness:0});
  const rustMat=new THREE.MeshStandardMaterial({map:tex(rust(),1),normalMap:tex(heightToNormal(bump(),1.8),1),roughness:.55,metalness:.85});
  const metalN=tex(heightToNormal(metalHeight(),1.6),1);
  const steelMat=new THREE.MeshStandardMaterial({color:0x6a6e72,normalMap:metalN,roughness:.4,metalness:.9});
  const doorMat=new THREE.MeshStandardMaterial({color:0x52555a,normalMap:metalN,roughness:.5,metalness:.85});
  const tableMat=new THREE.MeshStandardMaterial({map:tex(grime('#4a4d52'),1),normalMap:_wn,roughness:.55,metalness:.65});
  const sandMat=new THREE.MeshStandardMaterial({map:tex(grime('#5a5236'),2),normalMap:_wn,roughness:1});
