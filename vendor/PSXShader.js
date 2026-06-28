// ============================================================================
//  PSXShader.js — Filtro retro PSX para EL BÚNKER (Three.js r128)
//  Compatible con el pipeline actual (EffectComposer + ShaderPass).
//
//  DOS capas:
//    (1) THREE.PSXDitherShader  -> ShaderPass de cuantización 15-bit + dither
//                                  Bayer 4x4 (el "banding" y los puntitos PSX).
//    (2) THREE.installPSX(scene) -> parchea materiales con vertex-wobble
//                                  (el temblor de vértices PSX). Reversible.
//
//  NOTA r128: el "affine UV warp" original referenciaba vMapUv (existe en
//  three r152+, NO en r128) y rompía la compilación. En r128 el afín además es
//  redundante (ya se usa vUv interpolado), así que esta versión deja SÓLO el
//  WOBBLE de vértices (que sí funciona perfecto en r128). El dither + la
//  pixelación (bajar la resolución del composer) aportan el grueso del look.
//
//  La PIXELACIÓN no se hace acá: se logra bajando la resolución del composer
//  (ver el toggle OP.psx en game.js).
// ============================================================================

(function (THREE) {
  if (!THREE) { console.warn('PSXShader: THREE no está cargado'); return; }

  // --------------------------------------------------------------------------
  // (1) PASS DE DITHER + CUANTIZACIÓN  (ShaderPass)
  // --------------------------------------------------------------------------
  THREE.PSXDitherShader = {
    uniforms: {
      tDiffuse: { value: null },
      uLevels:  { value: 32.0 },  // niveles por canal (32 = 5 bits, look PSX)
      uDither:  { value: 1.0 },   // 0 = banding duro, 1 = dither Bayer
      uScan:    { value: 0.0 }    // scanlines extra (dejá 0: ya hay FilmShader)
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main(){',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float uLevels;',
      'uniform float uDither;',
      'uniform float uScan;',
      'varying vec2 vUv;',
      // Bayer 4x4 sin texturas ni indexado de arrays (compat GLSL ES 1.0).
      'float bayer4(vec2 fc){',
      '  vec2 lo = mod(fc, 2.0);',
      '  vec2 hi = mod(floor(fc * 0.5), 2.0);',
      '  float b2lo = lo.x*2.0 + lo.y*3.0 - lo.x*lo.y*4.0;',
      '  float b2hi = hi.x*2.0 + hi.y*3.0 - hi.x*hi.y*4.0;',
      '  return (4.0*b2hi + b2lo) / 16.0;',  // 0 .. 0.9375
      '}',
      'void main(){',
      '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
      '  float L = max(uLevels - 1.0, 1.0);',
      '  float thr = bayer4(floor(gl_FragCoord.xy));',
      '  vec3 plain = floor(c * L + 0.5) / L;',          // cuantización simple
      '  vec3 dith  = floor(c * L + thr) / L;',          // cuantización con dither
      '  c = mix(plain, dith, uDither);',
      '  if(uScan > 0.0){',
      '    float sl = 0.5 + 0.5*sin(gl_FragCoord.y * 3.14159);',
      '    c *= mix(1.0, 0.6 + 0.4*sl, uScan);',
      '  }',
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n')
  };

  // --------------------------------------------------------------------------
  // (2) INSTALADOR DE WOBBLE  (parchea materiales vía onBeforeCompile)
  // --------------------------------------------------------------------------
  //  Vertex wobble: snappea gl_Position a una grilla NDC (temblor PSX). Funciona
  //  sobre MeshStandardMaterial / MeshToonMaterial (el CEL) manteniendo luces y
  //  sombras de Three intactas. Reversible (dispose restaura onBeforeCompile).
  // --------------------------------------------------------------------------
  THREE.installPSX = function (root, opts) {
    opts = opts || {};
    var shared = {
      enabled: { value: opts.enabled === false ? 0.0 : 1.0 },
      wobble:  { value: opts.wobble != null ? opts.wobble : 0.85 }, // 0..1
      grid:    { value: opts.grid   != null ? opts.grid   : 160.0 } // densidad de snap
    };
    var patched = []; // { mat, prev (onBeforeCompile original) }

    function patch(mat) {
      if (!mat || (mat.userData && mat.userData.__psx)) return;
      mat.userData = mat.userData || {};
      mat.userData.__psx = true;
      var prev = mat.onBeforeCompile;
      mat.onBeforeCompile = function (shader, renderer) {
        if (typeof prev === 'function') { try { prev.call(this, shader, renderer); } catch (e) {} }
        shader.uniforms.uPSXEnabled = shared.enabled;
        shader.uniforms.uPSXWobble  = shared.wobble;
        shader.uniforms.uPSXGrid    = shared.grid;
        // VERTEX: declaraciones + snap de gl_Position a grilla NDC (sólo wobble).
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>',
            '#include <common>\n' +
            'uniform float uPSXEnabled; uniform float uPSXWobble; uniform float uPSXGrid;')
          .replace('#include <project_vertex>',
            '#include <project_vertex>\n' +
            'if(uPSXEnabled > 0.5 && uPSXWobble > 0.0 && gl_Position.w > 0.0){\n' +
            '  vec3 ndc = gl_Position.xyz / gl_Position.w;\n' +
            '  vec2 g = vec2(uPSXGrid);\n' +
            '  vec2 snap = floor(ndc.xy * g + 0.5) / g;\n' +
            '  ndc.xy = mix(ndc.xy, snap, uPSXWobble);\n' +
            '  gl_Position.xyz = ndc * gl_Position.w;\n' +
            '}');
        // FRAGMENT: SIN tocar (el afín es redundante/rompía en r128).
      };
      mat.needsUpdate = true;
      patched.push({ mat: mat, prev: prev });
    }

    if (root && root.traverse) root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      if (Array.isArray(o.material)) o.material.forEach(patch);
      else patch(o.material);
    });

    return {
      uniforms: shared,
      patch: patch,                                                  // expuesto: para parchear materiales nuevos (p.ej. ambas variantes del CEL)
      setEnabled: function (on) { shared.enabled.value = on ? 1.0 : 0.0; },
      setWobble:  function (v)  { shared.wobble.value  = v; },
      setGrid:    function (v)  { shared.grid.value    = v; },
      dispose: function () {                                          // restaura los materiales originales (toggle sin residuos)
        patched.forEach(function (p) {
          p.mat.onBeforeCompile = p.prev || function () {};
          if (p.mat.userData) delete p.mat.userData.__psx;
          p.mat.needsUpdate = true;
        });
        patched.length = 0;
      }
    };
  };

})(window.THREE);
