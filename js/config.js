// EL BÚNKER — constantes y helpers (config/constantes)
  const SMALL=window.innerWidth<760, motion=()=>document.body.classList.contains('motion');
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.body.classList.remove('motion');
  const CAP=100, FULL=71*3600+58*60+42, $=s=>document.querySelector(s);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function fmt(s){s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0');}
