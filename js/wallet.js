// EL BÚNKER — wallet connect real (EIP-6963 + ethers vendored)
  // ---- WALLET CONNECT ----
  // OJO: esto sólo cubre wallets de browser INYECTADAS — extensiones tipo MetaMask
  // y cualquiera que implemente EIP-6963 (o el legacy window.ethereum). En MOBILE el
  // usuario tiene que abrir la página desde el DAPP BROWSER de su wallet (MetaMask,
  // Rabby, etc.); desde Safari/Chrome normal NO hay provider inyectado y no aparece
  // ninguna wallet. WalletConnect (QR / deep-link para mobile) queda PENDIENTE a futuro.
  let walletProviders=[];                 // {info,provider} descubiertos por EIP-6963
  let walletState={addr:null,provider:null,info:null};

  // Discovery EIP-6963: registrar el listener AL CARGAR wallet.js (no al click) para no
  // perder wallets que anuncian temprano; recién DESPUÉS se despacha el requestProvider.
  window.addEventListener('eip6963:announceProvider',e=>{const d=e.detail;
    if(d&&d.info&&d.provider&&!walletProviders.some(p=>p.info.uuid===d.info.uuid)){walletProviders.push(d);if(!walletState.addr)renderWallet();}});
  try{window.dispatchEvent(new Event('eip6963:requestProvider'));}catch(e){}

  function truncAddr(a){return a?a.slice(0,6)+'…'+a.slice(-4):'';}
  function shortName(){return walletState.info&&walletState.info.name?walletState.info.name:'WALLET';}

  function renderWallet(){const el=$('#wallet');if(!el)return;
    if(walletState.addr){el.className='connected';el.title='tocá para desconectar';
      el.innerHTML='<div class="wh">◈ '+shortName()+'</div><div class="waddr">'+truncAddr(walletState.addr)+'</div><div class="wstat">● CONECTADA</div>';
    }else{el.className='disconnected';el.title='';
      el.innerHTML='<button class="wconnect" type="button">▸ CONECTAR WALLET</button>';}}

  // Selector cuando hay varias wallets inyectadas (mini-lista CRT)
  function renderPicker(){const el=$('#wallet');if(!el)return;el.className='disconnected';el.title='';
    let h='<div class="wh">ELEGÍ WALLET</div>';
    walletProviders.forEach((p,i)=>{h+='<button class="wpick" type="button" data-i="'+i+'">'+(p.info.name||('Wallet '+(i+1)))+'</button>';});
    el.innerHTML=h;}

  async function doConnect(detail){
    const provider=detail?detail.provider:(window.ethereum||null);
    if(!provider){showWalletMsg('SIN WALLET — abrí desde el dapp browser de tu wallet');renderWallet();return;}
    try{const accs=await provider.request({method:'eth_requestAccounts'});
      if(!accs||!accs.length){renderWallet();return;}
      walletState={addr:accs[0],provider:provider,info:detail?detail.info:{name:'WALLET'}};
      // gate del futuro $COIN — hoy DESACTIVADO (CONTRACT_ADDRESS vacío => true)
      try{const ok=await checkGate(walletState.addr,provider);if(!ok)showWalletMsg('NECESITÁS $COIN');}catch(e){}
      // re-render ante cambios de cuenta / red
      if(provider.on){provider.on('accountsChanged',a=>{if(a&&a.length){walletState.addr=a[0];renderWallet();}else{walletState={addr:null,provider:null,info:null};renderWallet();}});
        provider.on('chainChanged',()=>{});}
      renderWallet();
    }catch(err){renderWallet();if(err&&err.code===4001)showWalletMsg('CONEXIÓN RECHAZADA');else showWalletMsg('NO SE PUDO CONECTAR');}}

  function connectWallet(){
    if(walletProviders.length>1){renderPicker();return;}      // varias inyectadas => elegir
    if(walletProviders.length===1){doConnect(walletProviders[0]);return;}
    doConnect(null);                                          // fallback legacy window.ethereum
  }

  // EIP-1193 no tiene "disconnect" real: sólo olvidamos la sesión local del front.
  function forgetWallet(){walletState={addr:null,provider:null,info:null};renderWallet();}

  // ---- GATING $COIN — ESCRITO PERO DESACTIVADO ----
  // Es CLIENT-SIDE: sirve para UX, NO es seguridad (el front se puede saltear).
  // El gate real, si hace falta, va on-chain / server-side. GATE_MIN ya viene en
  // unidad cruda contemplando los decimales del token (ver config.js).
  async function checkGate(addr,eip1193){
    if(!CONTRACT_ADDRESS)return true;            // sin contrato => cualquiera con wallet entra
    if(typeof ethers==='undefined')return true;  // sin ethers vendored, no bloqueamos
    const prov=new ethers.providers.Web3Provider(eip1193);
    const erc20=new ethers.Contract(CONTRACT_ADDRESS,['function balanceOf(address) view returns (uint256)'],prov);
    const bal=await erc20.balanceOf(addr);
    return bal.gt(ethers.BigNumber.from(GATE_MIN));}

  function showWalletMsg(txt){const el=$('#wallet');if(!el)return;const m=document.createElement('div');m.className='wmsg';m.textContent=txt;el.appendChild(m);setTimeout(()=>m.remove(),2600);}

  // un solo handler delegado en el pill
  {const el=$('#wallet');if(el)el.addEventListener('click',e=>{
    const pick=e.target.closest('.wpick');if(pick){const i=+pick.getAttribute('data-i');if(walletProviders[i])doConnect(walletProviders[i]);return;}
    if(e.target.closest('.wconnect')){connectWallet();return;}
    if(walletState.addr){forgetWallet();}});}
  renderWallet();
