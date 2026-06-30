// EL BÚNKER — i18n: diccionario de strings VISIBLES (en/es). Default: inglés.
  // Solo texto que ve el usuario (HUD, botones, items, stats, zonas, finales, alertas, mapa).
  // NO entra acá: lore del CRT de pantalla, radio, carteles 3D del mundo, ni lo interno del
  // crafteo (recetas/categorías/materiales) — eso migra en pasadas posteriores.
  // Comentarios, nombres de variables y demás código siguen en español: NO se traducen.
  let LANG='en';
  const STR={
    en:{
      // ===== LEGACY (juego de supervivencia viejo: stats hambre/sed, HOLDERS, crafteo, consola R-01, zonas z_*, hint_html).
      //       POSIBLEMENTE HUÉRFANAS en el build actual (trailer + demo 1ª persona). NO borrar a ciegas — auditar uso antes. Las alertas a_* sí siguen activas. =====
      // stats / hud
      stat_hunger:'HUNGER', stat_thirst:'THIRST', stat_energy:'ENERGY', stat_sanity:'SANITY',
      generator:'⚙ GENERATOR', holders:'HOLDERS', refugees:'⌂ REFUGEES',
      // items (hotbar)
      item_eat:'EAT', item_drink:'DRINK', item_heal:'HEAL', item_robot:'R-01',
      tt_robot_console:'R-01 unit console (scavenge, charge, repair)',
      tt_auto:'Auto-raises HOLDERS', tt_speed:'Time / swarm speed', tt_style:'Cel-shading / realistic style',
      tt_sound:'Audio on/off (hum, alarms, radio)', tt_reset:'Restart the demo', tt_scrap:'Scrap (metal)',
      // botones
      btn_auto:'AUTO ▲', btn_style_cel:'STYLE: CEL', btn_style_real:'STYLE: REAL',
      btn_sound:'♪ SOUND', btn_restart:'RESTART',
      // unidad R-01
      unit_r01:'🤖 UNIT R-01', battery:'BATTERY', integrity:'INTEGRITY', temperature:'TEMPERATURE', charge:'CHARGE',
      btn_send:'SEND TO SCAVENGE', btn_charge:'CHARGE BATTERY', btn_repair:'REPAIR UNIT',
      st_base:'AT BASE', st_mission:'ON MISSION…', st_broken:'OUT OF SERVICE', st_maintenance:'MAINTENANCE',
      // banco de crafteo (solo el chrome estático; lo interno va en Tanda 4)
      craft_bench:'⚗ CRAFTING BENCH', craft_materials:'MATERIALS', craft_recipes:'RECIPES',
      // boot
      boot_title:'OPENING SHELTER', boot_sub:'sealing hatches…',
      // overlay de cámara (chrome SIEMPRE en inglés; los nombres de zona van en español por lore, en game.js)
      ov_rec:'● REC', ov_cam:'CAM', ov_day:'DAY', ov_live:'LIVE', ov_signal:'SIGNAL', ov_bees:'BEES RELEASED', ov_outbound:'◖ OUTBOUND TRANSMISSION ◗', ov_inbound:'◖ INCOMING SIGNAL ◗',
      uptime_hdr:'TIME ALONE', uptime_sub:'· LIVE SINCE CONTACT LOST ·',
      // holdout (slider HOLDERS)
      ho_outside:'{0} outside', ho_empty:'shelter empty', ho_soul_one:'soul safe', ho_soul_many:'souls safe', ho_full:' · shelter full',
      // zonas
      z_feed_gen:'FUEL GENERATOR  (-fuel)', z_harvest:'HARVEST  (+food)', z_water:'COLLECT WATER  (+water)',
      z_fuel:'DRAW FUEL  (+fuel)', z_scrap:'SCAVENGE SCRAP  (+scrap)', z_repair:'REPAIR SYSTEM  (-scrap)',
      z_rest:'REST  (+energy)', z_read:'READ  (+sanity)', z_radio:'TUNE RADIO', z_craft:'CRAFTING BENCH',
      // alertas
      a_no_fuel:'NO FUEL', a_no_scrap:'NO SCRAP', a_gen_dying:'GENERATOR SHUTTING DOWN',
      a_starvation:'STARVATION', a_dehydration:'DEHYDRATION', a_exhaustion:'EXHAUSTION',
      a_swarm_hit:'SWARM STRIKE', a_power_fail:'POWER FAILURE', a_gen_overload:'GENERATOR OVERLOAD',
      a_first_outside:"THOSE WHO DIDN'T GET IN STAY OUTSIDE", a_shelter_complete:'SHELTER FULL · 100/100',
      a_unit_unavailable:'UNIT NOT AVAILABLE', a_unit_overheat:'UNIT OVERHEATED', a_low_battery:'INSUFFICIENT BATTERY',
      a_unit_damaged:'UNIT DAMAGED', a_unit_to_hatch:'R-01 HEADING TO THE HATCH', a_unit_oos:'R-01 OUT OF SERVICE',
      a_no_fuel_charge:'NO FUEL TO CHARGE', a_battery_charged:'R-01 BATTERY CHARGED', a_unit_repaired:'R-01 REPAIRED',
      a_no_scrap_repair:'NO SCRAP TO REPAIR', a_unit_no_battery:'R-01 OUT OF BATTERY',
      a_entered_brought:'ENTERED. Brought:', a_was_infected:'IT WAS INFECTED', a_left_outside:'YOU LEFT IT OUTSIDE',
      // floatTicks
      ft_seeds:'+1 seeds', ft_cables:'+1 cables', ft_enter:'+{0} enter', ft_full:'SHELTER FULL', ft_outside:'−{0} outside',
      // materiales (texto de botín)
      m_food:'food', m_water:'water', m_scrap:'scrap',
      // mapa
      map_title:'PLAN — SHELTER 404', room_observatory:'OBSERVATORY', room_library:'LIBRARY',
      room_cultivo:'GROW', room_workshop:'WORKSHOP', room_rest:'REST', room_hallway:'HALLWAY', room_charging:'CHARGING', room_hive:'HIVE', room_fab:'FABRICATION', room_vault:'VAULT',
      // hint (HTML) — (tag_html eliminado junto con el #tag jubilado: era el tag del memecoin viejo con el número viejo)
      hint_html:'<span class="k">▣ Move the HOLDERS slider →</span> and watch how many make it into the shelter (capacity 100); the rest stay <b>outside with the swarm</b><br>move with <span class="k">WASD / joystick</span> · drag to look · walk up to objects · ♪ sound · <span class="k">F</span> flashlight',
      // ===== FASE 1 — INTERFAZ NUEVA (modo juego / menú / config / paneles / overlay CCTV legible). La VOZ de Beeko NO entra acá (Fase 2). =====
      // menú de inicio
      menu_select:'CCTV · SHELTER SELECT', menu_day:'DAY', menu_bees:'BEES RELEASED',
      menu_observe:'▶ OBSERVE', menu_observe_sub:'live feed · R-01 alone',
      menu_play:'⦿ TAKE CONTROL OF R-01', menu_play_sub:'playable demo · beta',
      menu_foot:'SHELTER 404 · STANDALONE FEED · one operational unit',
      menu_lore:'The surface fell silent a long time ago. Down here, one unit still turns the lights on every day.', // (provisional EN; la versión ES autoral se revisa en Fase 2 tanda 6)
      // config
      cfg_title:'⚙ CONFIGURATION', cfg_mode:'MODE', cfg_world:'WORLD', cfg_lang:'LANGUAGE',
      cfg_menu:'‹ START MENU', cfg_lore:'READ THE LORE',
      cfg_to_observe:'▶ OBSERVE — back to livestream', cfg_to_game:'⦿ TAKE CONTROL OF R-01',
      // HUD del modo juego
      gh_energy:'ENERGY', gh_bees:'BEES RELEASED', gh_inv:'INVENTORY', gh_slot_empty:'item',
      // prompts de interacción [E]
      pr_charge:'[E] CHARGE', pr_charging:'⚡ CHARGING…', pr_energy_full:'⚡ ENERGY FULL',
      pr_release:'[E] RELEASE BEE', pr_releasing:'✦ RELEASING…', pr_take:'[E] TAKE',
      pr_tv:'[E] VIEW SCREEN', pr_radio:'[E] TUNE RADIO', pr_term:'[E] ACCESS TERMINAL', pr_turnoff:'[E] TURN OFF',
      // TAREAS DE MANTENIMIENTO (modo beta) — labels de sistema, EN ahora; el espejo ES va con la tarea del idioma. T() cae a EN si falta la key en STR.es.
      tk_lights:'[E] RECALIBRATE LIGHTS', tk_brood:'[E] TEND THE BROOD', tk_grow:'[E] WATER THE GREENHOUSE', tk_fab:'[E] CLEAR THE FABRICATOR', tk_coolant:'[E] VENT THE COOLANT',
      tk_lights_do:'RECALIBRATING…', tk_brood_do:'TENDING…', tk_grow_do:'WATERING…', tk_fab_do:'CLEARING…', tk_coolant_do:'VENTING…',
      tk_alert_lights:'⚠ LIGHTING ARRAY FAULT', tk_alert_brood:'⚠ BROOD NEEDS TENDING', tk_alert_grow:'⚠ GREENHOUSE DRYING OUT', tk_alert_fab:'⚠ FABRICATOR JAMMED', tk_alert_coolant:'⚠ COOLANT WARNING',
      // chrome de paneles (ENCABEZADOS = Fase 1; los CUERPOS son voz de Beeko = Fase 2, siguen en inglés)
      op_close:'[ click to close ]', op_tv_head:'SIGNAL RECOVERED · BROADCAST LOOP',
      op_radio_head:'INTERCEPTED · CARRIER STILL LIVE', op_term_head:'SHELTER 404 · CORE LOG',
      ip_recovered:'RECOVERED · ', lp_head:'SHELTER 404 · FIELD BRIEF', lp_close:'close',
      // overlay CCTV legible (línea de estado de la unidad + badges/alertas de evento). El chrome REC/CAM/DAY/LIVE/SIGNAL queda en inglés a propósito.
      cam_status:'STATUS: ', cam_active:'ACTIVE CAM',
      cam_offline:'UNIT OFFLINE', cam_transit:'IN TRANSIT', cam_charging:'CHARGING', cam_fabricating:'FABRICATING',
      cam_brood:'RAISING BROOD', cam_diag:'SYSTEM DIAGNOSTICS', cam_rounds:'INSPECTION ROUNDS', cam_standby:'STANDBY', cam_operational:'OPERATIONAL',
      cam_ev_quake:'⚠ SEISMIC EVENT', cam_ev_blackout:'⚠ POWER FAILURE', cam_ev_alert:'⚠ ALERT'
    },
    es:{
      stat_hunger:'HAMBRE', stat_thirst:'SED', stat_energy:'ENERGÍA', stat_sanity:'CORDURA',
      generator:'⚙ GENERADOR', holders:'HOLDERS', refugees:'⌂ REFUGIADOS',
      item_eat:'COMER', item_drink:'BEBER', item_heal:'MEDICARSE', item_robot:'R-01',
      tt_robot_console:'Consola de la unidad R-01 (enviar a buscar, cargar, reparar)',
      tt_auto:'Sube HOLDERS solo', tt_speed:'Velocidad del tiempo / del enjambre', tt_style:'Estilo cel-shading / realista',
      tt_sound:'Audio on/off (zumbido, alarmas, radio)', tt_reset:'Reiniciar la demo', tt_scrap:'Chatarra (metal)',
      btn_auto:'AUTO ▲', btn_style_cel:'ESTILO: CEL', btn_style_real:'ESTILO: REAL',
      btn_sound:'♪ SONIDO', btn_restart:'REINICIAR',
      unit_r01:'🤖 UNIDAD R-01', battery:'BATERÍA', integrity:'INTEGRIDAD', temperature:'TEMPERATURA', charge:'CARGA',
      btn_send:'ENVIAR A BUSCAR', btn_charge:'CARGAR BATERÍA', btn_repair:'REPARAR UNIDAD',
      st_base:'EN BASE', st_mission:'EN MISIÓN…', st_broken:'FUERA DE SERVICIO', st_maintenance:'MANTENIMIENTO',
      craft_bench:'⚗ BANCO DE CRAFTEO', craft_materials:'MATERIALES', craft_recipes:'RECETAS',
      boot_title:'ABRIENDO REFUGIO', boot_sub:'sellando compuertas…',
      // overlay de cámara: chrome en inglés a propósito (REC/CAM/DAY/LIVE/SIGNAL); zonas en español por lore
      ov_rec:'● REC', ov_cam:'CAM', ov_day:'DAY', ov_live:'LIVE', ov_signal:'SIGNAL', ov_bees:'ABEJAS LIBERADAS', ov_outbound:'◖ TRANSMISIÓN SALIENTE ◗', ov_inbound:'◖ SEÑAL ENTRANTE ◗',
      uptime_hdr:'TIME ALONE', uptime_sub:'· LIVE SINCE CONTACT LOST ·',
      ho_outside:'{0} afuera', ho_empty:'refugio vacío', ho_soul_one:'alma a salvo', ho_soul_many:'almas a salvo', ho_full:' · refugio lleno',
      z_feed_gen:'ALIMENTAR GENERADOR  (-combustible)', z_harvest:'COSECHAR  (+comida)', z_water:'JUNTAR AGUA  (+agua)',
      z_fuel:'SACAR COMBUSTIBLE  (+combustible)', z_scrap:'BUSCAR CHATARRA  (+chatarra)', z_repair:'REPARAR SISTEMA  (-chatarra)',
      z_rest:'DESCANSAR  (+energía)', z_read:'LEER  (+cordura)', z_radio:'SINTONIZAR RADIO', z_craft:'BANCO DE CRAFTEO',
      a_no_fuel:'SIN COMBUSTIBLE', a_no_scrap:'SIN CHATARRA', a_gen_dying:'GENERADOR APAGÁNDOSE',
      a_starvation:'INANICIÓN', a_dehydration:'DESHIDRATACIÓN', a_exhaustion:'AGOTAMIENTO',
      a_swarm_hit:'GOLPE DEL ENJAMBRE', a_power_fail:'FALLA ELÉCTRICA', a_gen_overload:'SOBRECARGA DEL GENERADOR',
      a_first_outside:'LOS QUE NO ENTRARON QUEDAN AFUERA', a_shelter_complete:'REFUGIO COMPLETO · 100/100',
      a_unit_unavailable:'LA UNIDAD NO ESTÁ DISPONIBLE', a_unit_overheat:'UNIDAD SOBRECALENTADA', a_low_battery:'BATERÍA INSUFICIENTE',
      a_unit_damaged:'UNIDAD AVERIADA', a_unit_to_hatch:'R-01 SE DIRIGE A LA COMPUERTA', a_unit_oos:'R-01 QUEDÓ FUERA DE SERVICIO',
      a_no_fuel_charge:'SIN COMBUSTIBLE PARA CARGAR', a_battery_charged:'BATERÍA DE R-01 CARGADA', a_unit_repaired:'R-01 REPARADA',
      a_no_scrap_repair:'SIN CHATARRA PARA REPARAR', a_unit_no_battery:'R-01 SIN BATERÍA',
      a_entered_brought:'ENTRÓ. Trajo:', a_was_infected:'ESTABA INFECTADO', a_left_outside:'LO DEJASTE AFUERA',
      ft_seeds:'+1 semillas', ft_cables:'+1 cables', ft_enter:'+{0} entran', ft_full:'REFUGIO LLENO', ft_outside:'−{0} afuera',
      m_food:'comida', m_water:'agua', m_scrap:'chatarra',
      map_title:'PLANO — REFUGIO 404', room_observatory:'OBSERVATORIO', room_library:'BIBLIO',
      room_cultivo:'CULTIVO', room_workshop:'TALLER', room_rest:'DESCANSO', room_hallway:'PASILLO', room_charging:'CARGA', room_hive:'COLMENA', room_fab:'FABRICACIÓN', room_vault:'BÓVEDA',
      hint_html:'<span class="k">▣ Movés el slider HOLDERS →</span> y mirás cuántos entran al refugio (capacidad 100); el resto queda <b>afuera con el enjambre</b><br>movéte con <span class="k">WASD / joystick</span> · arrastrá para mirar · acercate a objetos · ♪ sonido · <span class="k">F</span> linterna',
      // ===== FASE 1 — INTERFAZ NUEVA (ES) =====
      menu_select:'CCTV · SELECCIÓN DE REFUGIO', menu_day:'DÍA', menu_bees:'ABEJAS LIBERADAS',
      menu_observe:'▶ OBSERVAR', menu_observe_sub:'el refugio en vivo · R-01 solo',
      menu_play:'⦿ TOMAR CONTROL DE R-01', menu_play_sub:'demo jugable · beta',
      menu_foot:'REFUGIO 404 · SEÑAL AUTÓNOMA · una unidad operativa',
      menu_lore:'La superficie quedó en silencio hace mucho. Acá abajo, una unidad todavía enciende las luces cada día.',
      cfg_title:'⚙ CONFIGURACIÓN', cfg_mode:'MODO', cfg_world:'MUNDO', cfg_lang:'IDIOMA',
      cfg_menu:'‹ MENÚ DE INICIO', cfg_lore:'LEER EL LORE',
      cfg_to_observe:'▶ OBSERVAR — volver al livestream', cfg_to_game:'⦿ TOMAR CONTROL DE R-01',
      gh_energy:'ENERGÍA', gh_bees:'ABEJAS LIBERADAS', gh_inv:'INVENTARIO', gh_slot_empty:'objeto',
      pr_charge:'[E] CARGAR', pr_charging:'⚡ CARGANDO…', pr_energy_full:'⚡ ENERGÍA LLENA',
      pr_release:'[E] LIBERAR ABEJA', pr_releasing:'✦ LIBERANDO…', pr_take:'[E] TOMAR',
      pr_tv:'[E] VER PANTALLA', pr_radio:'[E] SINTONIZAR RADIO', pr_term:'[E] ACCEDER A TERMINAL', pr_turnoff:'[E] APAGAR',
      op_close:'[ click para cerrar ]', op_tv_head:'SEÑAL RECUPERADA · BUCLE DE EMISIÓN',
      op_radio_head:'INTERCEPTADA · PORTADORA AÚN ACTIVA', op_term_head:'REFUGIO 404 · REGISTRO DEL NÚCLEO',
      ip_recovered:'RECUPERADO · ', lp_head:'REFUGIO 404 · INFORME DE CAMPO', lp_close:'cerrar',
      cam_status:'ESTADO: ', cam_active:'CÁMARA ACTIVA',
      cam_offline:'UNIDAD FUERA DE LÍNEA', cam_transit:'EN TRÁNSITO', cam_charging:'CARGANDO', cam_fabricating:'FABRICANDO',
      cam_brood:'CRIANDO LARVAS', cam_diag:'DIAGNÓSTICO DEL SISTEMA', cam_rounds:'RONDAS DE INSPECCIÓN', cam_standby:'EN ESPERA', cam_operational:'OPERATIVO',
      cam_ev_quake:'⚠ EVENTO SÍSMICO', cam_ev_blackout:'⚠ FALLA ELÉCTRICA', cam_ev_alert:'⚠ ALERTA'
    }
  };
  // T('key') -> string en el idioma actual; cae a EN y después a la propia key.
  // T('key', a, b) -> interpola {0},{1}... (útil para contadores).
  function T(k){let s=(STR[LANG]&&STR[LANG][k])||STR.en[k]||k;
    for(let i=1;i<arguments.length;i++)s=s.split('{'+(i-1)+'}').join(arguments[i]);return s;}
  // pinta los strings estáticos del DOM marcados con data-i18n / -html / -title
  function applyI18n(root){const r=root||document;
    r.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=T(e.getAttribute('data-i18n'));});
    r.querySelectorAll('[data-i18n-html]').forEach(e=>{e.innerHTML=T(e.getAttribute('data-i18n-html'));});
    r.querySelectorAll('[data-i18n-title]').forEach(e=>{e.title=T(e.getAttribute('data-i18n-title'));});}
  function getLang(){return LANG;}
  // listeners que se disparan al cambiar de idioma — game.js registra acá el re-render de lo dinámico (prompts, paneles abiertos, overlay) con onLang().
  const _langListeners=[];
  function onLang(fn){ if(typeof fn==='function')_langListeners.push(fn); }
  // marca el botón EN/ES activo en el panel de config
  function _syncLangButtons(){ const bs=document.querySelectorAll('.cfg-lng'); bs.forEach(b=>{ b.classList.toggle('on', b.getAttribute('data-lng')===LANG); }); }
  // TOGGLE EN VIVO: cambia LANG, persiste, repinta el DOM estático (applyI18n) y avisa a los listeners (lo dinámico). Sin recargar.
  function setLang(l){ if(!STR[l])return; LANG=l; try{localStorage.setItem('refugio_lang',l);}catch(e){}
    applyI18n(); _syncLangButtons(); for(let i=0;i<_langListeners.length;i++){try{_langListeners[i](l);}catch(e){}} }
  // BOOT: arranca en el idioma guardado (default 'en' en sesión limpia)
  try{const _s=localStorage.getItem('refugio_lang'); if(_s&&STR[_s])LANG=_s;}catch(e){}
  applyI18n(); _syncLangButtons();
  // globales explícitos (por si algún archivo los referencia por window)
  window.T=T; window.setLang=setLang; window.getLang=getLang; window.onLang=onLang; window.applyI18n=applyI18n;
