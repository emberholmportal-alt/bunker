// EL BÚNKER — i18n: diccionario de strings VISIBLES (en/es). Default: inglés.
  // Solo texto que ve el usuario (HUD, botones, items, stats, zonas, finales, alertas, mapa).
  // NO entra acá: lore del CRT de pantalla, radio, carteles 3D del mundo, ni lo interno del
  // crafteo (recetas/categorías/materiales) — eso migra en pasadas posteriores.
  // Comentarios, nombres de variables y demás código siguen en español: NO se traducen.
  let LANG='en';
  const STR={
    en:{
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
      hint_html:'<span class="k">▣ Move the HOLDERS slider →</span> and watch how many make it into the shelter (capacity 100); the rest stay <b>outside with the swarm</b><br>move with <span class="k">WASD / joystick</span> · drag to look · walk up to objects · ♪ sound · <span class="k">F</span> flashlight'
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
      ov_rec:'● REC', ov_cam:'CAM', ov_day:'DAY', ov_live:'LIVE', ov_signal:'SIGNAL', ov_bees:'BEES RELEASED', ov_outbound:'◖ OUTBOUND TRANSMISSION ◗', ov_inbound:'◖ INCOMING SIGNAL ◗',
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
      room_cultivo:'CULTIVO', room_workshop:'TALLER', room_rest:'DESCANSO', room_hallway:'PASILLO', room_charging:'CHARGING', room_hive:'HIVE', room_fab:'FABRICATION', room_vault:'VAULT',
      hint_html:'<span class="k">▣ Movés el slider HOLDERS →</span> y mirás cuántos entran al refugio (capacidad 100); el resto queda <b>afuera con el enjambre</b><br>movéte con <span class="k">WASD / joystick</span> · arrastrá para mirar · acercate a objetos · ♪ sonido · <span class="k">F</span> linterna'
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
  // listo para un toggle EN/ES a futuro (por ahora arranca fijo en 'en')
  function setLang(l){if(STR[l]){LANG=l;applyI18n();}}
  applyI18n();
