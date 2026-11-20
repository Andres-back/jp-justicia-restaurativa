/* Decisiones · Justicia restaurativa en la práctica del fiscal (18/11/2026).
   En lugar de la selección múltiple (Juan, 06/11/2026: «la opción múltiple ya está como muy trillado»; 18/11/2026: «esta no la
   usemos… de esta hubo bastantes en ambiental»). index.html?d=<id>; datos en datos.js (herramientas/decision_restaurativa.py).

   Qué es cada segmento: se respeta el motor común (herramientas/motor-audiencias/app.js, B.actividad):
   · intro y contexto: se leen antes de la pregunta; enunciado: la pregunta; cab: rótulo de la pregunta;
   · opciones: su texto sin la marca «A.» (la letra va en su propia insignia, como en el motor);
   · opción incorrecta: su retroalimentación propia (cab + retro de la opción) o, si no la tiene, la general (cab_retro + retro);
   · opción correcta: su retroalimentación propia, la general y la clave («Respuesta correcta: B.»), en el orden de la ficha;
   · cab_retro que encabeza las retroalimentaciones de las opciones incorrectas («¿Por qué son incorrectas las demás opciones?»,
     antes de ellas en la ficha) no se pega a la de la correcta: titula el repaso de esas opciones, que se abre al acertar.
   Todo el texto es literal; solo cambia la letra con que arranca un bloque (Kit.may). Un texto que no cabe se lee por partes
   («Seguir leyendo»), por bloques y, si uno solo no cabe, por oraciones completas: nunca desplazamiento ni letra cortada.

   Formas:
   · «ruta»: un camino que sube (el conflicto escala) con una parada por pregunta. En cada parada se lee el momento y se elige
     una señal del cruce. Error: su retroalimentación y nuevo intento. Acierto: la retroalimentación de la ficha, el tramo se
     ilumina y se abre la parada siguiente. Al final, la última retroalimentación como cierre del recorrido.
   · «chat»: una conversación. La persona (o la «Situación») escribe; usted, fiscal, elige qué responder; ella contesta con la
     retroalimentación de la ficha. Si no es la correcta, se vuelve a intentar. Las preguntas siguientes siguen en el hilo.
   Gamificación: avance n / N, estrellas (3 al primer intento, 2 al segundo, 1 después), visto (fa-circle-check), lo pendiente
   late. Estado en el navegador con la clave jr:decision:<id> (Kit.guardar, con try/catch): no es la calificación del aula. */
(function () {
  'use strict';
  var DATOS = window.DECISIONES || {};
  var mm = location.search.match(/[?&]d=([\w-]+)/);
  var ID = mm ? mm[1] : '';
  var A = DATOS[ID];
  var raiz = document.getElementById('decision');
  var may = window.Kit ? Kit.may : function (t) { return t; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* Texto literal en HTML: mayúscula inicial, llamadas de nota (²) como superíndice y citas entre comillas resaltadas. */
  function rico(t) {
    return esc(may(String(t)))
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, function (s) { return '<sup class="llamada">' + s + '</sup>'; })
      .replace(/“[^”]{12,}”/g, function (s) { return '<span class="cita">' + s + '</span>'; });
  }
  function hay(x) { return x !== null && x !== undefined; }
  function sinMarca(t) { return String(t).replace(/^(?:Opción\s+)?[A-Da-d][.:)]\s+/, ''); }
  /* «Retroalimentación:», «Retroalimentación del caso:», «Pregunta»: rótulos breves de la ficha. */
  function esRotulo(t) { return t.length <= 44 && /:$/.test(t.trim()); }
  function norm(t) { return String(t).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '').replace(/[.\s]+$/, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  /* Oraciones completas, sin cortar tras una letra de opción («A.») ni dentro de una cita. */
  function oraciones(t) {
    var p = String(t).split(/(?<=[.!?…][”»"’)]?)\s+(?=[¿¡«“"(A-ZÁÉÍÓÚÑ])/), out = [];
    p.forEach(function (s) {
      if (out.length && (/^[A-D]\.$/.test(out[out.length - 1]) || s.length < 3)) out[out.length - 1] += ' ' + s;
      else out.push(s);
    });
    return out;
  }
  /* Un segmento con su nota al pie al final («… rumbo. ² El caso se recrea…»): la nota va aparte, en letra menor. */
  function partirNota(t) {
    var m = /^([\s\S]*?[.!?…])\s+([⁰¹²³⁴⁵⁶⁷⁸⁹]+\s+[\s\S]+)$/.exec(t);
    return m ? [m[1], m[2]] : [t];
  }

  var avisoT = null;
  function aviso(t) {
    var a = $('.aviso-esc'); if (!a) return;
    a.textContent = t; a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(function () { a.hidden = true; }, 3800);
  }

  if (!A) {
    raiz.innerHTML = '<p class="sin-datos"><i class="fas fa-circle-info" aria-hidden="true"></i> No se encontró la actividad «' + esc(ID) + '». Revise la dirección (index.html?d=…).</p>';
    window.Dec = { listo: true, error: true };
    if (window.Kit) Kit.pantallaCompleta();
    return;
  }

  /* ---------- Modelo: un paso por pregunta, con sus segmentos ya resueltos ---------- */
  function lineas(ls, S) {
    return (ls || []).map(function (l) {
      if (l.tipo === 'tabla') return { tipo: 'p', t: l.filas.map(function (f) { return f.map(function (i) { return S[i]; }).join(' · '); }).join(' ') };
      return { tipo: l.tipo, t: (l.segs || []).map(function (i) { return S[i]; }).join(' ') };
    }).filter(function (l) { return l.t && l.t.trim(); });
  }
  var PASOS = [];
  A.partes.forEach(function (p, pi) {
    var S = p.segmentos, b = p.bloque, nq = b.preguntas.length;
    b.preguntas.forEach(function (q, qi) {
      var minPropia = Infinity;
      q.opciones.forEach(function (o) { (o.retro || []).concat(hay(o.cab) ? [o.cab] : []).forEach(function (i) { minPropia = Math.min(minPropia, i); }); });
      var paso = {
        i: PASOS.length, pi: pi, qi: qi, titulo: p.titulo, nq: nq,
        intro: qi === 0 ? lineas(b.intro, S) : [],
        cierre: qi === nq - 1 ? lineas(b.cierre, S) : [],
        contexto: lineas(q.contexto, S),
        cab: hay(q.cab) ? S[q.cab] : null,
        enunciado: (q.enunciado || []).map(function (i) { return S[i]; }),
        opciones: q.opciones.map(function (o, j) {
          return { j: j, letra: o.letra, ok: !!o.ok, texto: hay(o.seg) ? sinMarca(S[o.seg]) : (o.texto || ''),
            propia: (hay(o.cab) ? [S[o.cab]] : []).concat((o.retro || []).map(function (i) { return S[i]; })) };
        }),
        retro: (q.retro || []).map(function (i) { return S[i]; }),
        cabRetro: hay(q.cab_retro) ? S[q.cab_retro] : null,
        cabRepaso: null,
        clave: hay(q.respuesta) ? S[q.respuesta] : null,
        fuente: (q.fuente || []).map(function (i) { return S[i]; })
      };
      if (hay(q.cab_retro) && minPropia < Infinity && q.cab_retro < minPropia) { paso.cabRepaso = paso.cabRetro; paso.cabRetro = null; }
      paso.correcta = paso.opciones.filter(function (o) { return o.ok; })[0];
      PASOS.push(paso);
    });
  });
  var N = PASOS.length;

  /* Retroalimentación como unidades de lectura (cada segmento, un bloque; los rótulos breves, en negrita). */
  function u(t, k, g) { return { t: t, k: k || (esRotulo(t) ? 'rot' : 'p'), g: g }; }
  function retroBien(p) {
    var out = [];
    if (p.cabRetro) out.push(u(p.cabRetro));
    if (p.correcta) p.correcta.propia.forEach(function (t) { out.push(u(t)); });
    p.retro.forEach(function (t) { out.push(u(t)); });
    p.fuente.forEach(function (t) { out.push(u(t, 'fuente')); });
    return out;
  }
  function retroMal(p, op) {
    var out = [];
    if (op.propia.length) op.propia.forEach(function (t) { out.push(u(t)); });
    else { if (p.cabRetro) out.push(u(p.cabRetro)); p.retro.forEach(function (t) { out.push(u(t)); }); }
    p.fuente.forEach(function (t) { out.push(u(t, 'fuente')); });
    return out;
  }
  function claveCorta(p) { return p.clave && p.clave.length <= 48; }

  /* ---------- Estado en el navegador (jr:decision:<id>) ---------- */
  var CLAVE = 'decision:' + ID;
  function nuevo() { return { v: 1, n: N, res: {}, err: {}, prob: {}, vistos: {}, pos: 0 }; }
  var est = window.Kit ? Kit.leer(CLAVE, null) : null;
  if (!est || est.v !== 1 || est.n !== N) est = nuevo();
  function guardar() { if (window.Kit) Kit.guardar(CLAVE, est); }
  function resueltos() { return PASOS.filter(function (p) { return est.res[p.i]; }).length; }
  function estrellas(i) { if (!est.res[i]) return 0; var e = est.err[i] || 0; return e === 0 ? 3 : e === 1 ? 2 : 1; }
  function totalEstrellas() { var s = 0; PASOS.forEach(function (p) { s += estrellas(p.i); }); return s; }
  function primeroPendiente() { for (var i = 0; i < N; i++) if (!est.res[i]) return i; return N; }

  /* ---------- Cabecera, pie y marcador ---------- */
  var RUTA = A.forma === 'ruta';
  document.body.setAttribute('data-forma', RUTA ? 'ruta' : 'chat');
  $('#titulo-dec').textContent = may(A.titulo);
  document.title = may(A.titulo) + ' · Actividad práctica';
  $('.esc-guia').textContent = RUTA
    ? 'Lea cada momento del camino y elija la señal que lo describe. Clic en una señal para decidir.'
    : 'Lea lo que le escriben y elija qué responder. Clic en una respuesta para enviarla.';
  $('.ubicacion').textContent = 'Unidad ' + A.unidad + ' · Lección ' + A.leccion;
  function marcador() {
    var r = resueltos(), av = $('.avance');
    $('.avance .texto').textContent = (RUTA ? 'Paradas ' : 'Aciertos ') + r + ' / ' + N;
    $('.avance .barra span').style.width = Math.round(100 * r / Math.max(1, N)) + '%';
    av.classList.toggle('completo', r === N);
    $('.estrellas .e-texto').textContent = totalEstrellas() + ' / ' + (3 * N);
    $('.estrellas').setAttribute('aria-label', 'Estrellas: ' + totalEstrellas() + ' de ' + (3 * N));
  }

  /* ---------- Lectura por partes, sin desplazamiento ---------- */
  /* Reparte unidades en páginas que caben en «caja» (alto fijo, overflow oculto). Una unidad que sola no cabe se parte en sus
     oraciones completas; las oraciones de una misma unidad se pintan juntas («g»). */
  function paginar(caja, unidades, html, cabe) {
    var pags = [], cur = [], cola = unidades.map(function (x, n) { return Object.assign({}, x, { g: hay(x.g) ? x.g : 'u' + n }); });
    function prueba(l) { caja.innerHTML = html(l); return cabe(); }
    while (cola.length) {
      var x = cola.shift();
      if (prueba(cur.concat([x]))) { cur.push(x); continue; }
      if (!x.oracion && x.k !== 'boton') {
        var os = oraciones(x.t);
        if (os.length > 1) { cola = os.map(function (o, n) { return Object.assign({}, x, { t: o, oracion: true, sigue: n > 0 }); }).concat(cola); continue; }
      }
      if (cur.length) {
        cola.unshift(x);
        /* Un rótulo o título no queda solo al final de una página: pasa con lo que encabeza. */
        while (cur.length > 1 && /^(rot|rotm|tit)$/.test(cur[cur.length - 1].k) && !cur[cur.length - 1].oracion) cola.unshift(cur.pop());
        pags.push(cur); cur = []; continue;
      }
      pags.push([x]);
    }
    if (cur.length) pags.push(cur);
    return pags.length ? pags : [[]];
  }
  /* Agrupa las unidades consecutivas de un mismo grupo (oraciones de un mismo bloque) para pintarlas juntas. */
  function agrupar(l) {
    var out = [];
    l.forEach(function (x) {
      var ult = out[out.length - 1];
      if (ult && ult.g === x.g && x.oracion) { ult.t += ' ' + x.t; ult.partes++; }
      else out.push(Object.assign({}, x, { partes: 1 }));
    });
    return out;
  }
  function htmlBloques(l) {
    return agrupar(l).map(function (x) {
      if (x.k === 'boton') return x.html;
      var cls = x.k === 'rot' ? 'b-rot' : x.k === 'tit' ? 'b-tit' : x.k === 'lead' ? 'b-lead' : x.k === 'nota' ? 'b-nota' : x.k === 'fuente' ? 'b-fuente' : x.k === 'clave' ? 'b-clave' : 'b-p';
      return '<p class="' + cls + (x.sigue ? ' sigue' : '') + '">' + (x.k === 'clave' ? '<i class="fas fa-key" aria-hidden="true"></i> ' : '') + rico(x.t) + '</p>';
    }).join('');
  }
  /* Lector de una caja: la letra crece hasta «max» si el texto es breve y baja hasta «min»; si ni así cabe, se lee por partes.
     o: {texto (caja de alto fijo), nav, unidades, html, max, min, pag, arte, artMin, cont, alLeer, alPintar} */
  function lectorCaja(o) {
    var L = { pags: [o.unidades], k: 0, leido: false };
    var html = o.html || htmlBloques;
    function cabe() {
      if (o.texto.scrollHeight > o.texto.clientHeight + 1) return false;
      if (o.cont && o.cont.scrollHeight > o.cont.clientHeight + 1) return false;
      return true;
    }
    function fuente(fs) { o.texto.style.setProperty('--fs', fs + 'px'); }
    o.nav.hidden = true;
    if (o.cont) o.cont.classList.remove('sin-arte', 'partido');
    o.texto.innerHTML = html(o.unidades);
    var ok = false, fs;
    if (o.arte) {
      for (fs = o.max; fs >= o.min; fs -= 0.5) { fuente(fs); if (cabe() && o.arte.getBoundingClientRect().height >= (o.artMin || 80)) { ok = true; break; } }
      if (!ok) o.cont.classList.add('sin-arte');
    }
    if (!ok) for (fs = o.max; fs >= o.min; fs -= 0.5) { fuente(fs); if (cabe()) { ok = true; break; } }
    if (!ok) {
      /* La barra de partes ocupa su lugar con su tamaño real antes de repartir el texto. */
      o.nav.hidden = false;
      o.nav.innerHTML = '<button type="button" class="boton anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button><span class="parte">Parte 1 de 2</span>' +
        '<span class="puntos"><span></span><span></span></span><button type="button" class="boton primario siguiente">Seguir leyendo <i class="fas fa-arrow-right" aria-hidden="true"></i></button>';
      if (o.cont) o.cont.classList.add('partido');
      fuente(o.pag || 14);
      L.pags = paginar(o.texto, o.unidades, html, cabe);
    }
    function pintarNav() {
      var n = L.pags.length, k = L.k;
      if (n < 2) { o.nav.hidden = true; return; }
      o.nav.hidden = false;
      o.nav.innerHTML = (k > 0 ? '<button type="button" class="boton anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button>' : '') +
        '<span class="parte">Parte ' + (k + 1) + ' de ' + n + '</span>' +
        '<span class="puntos" aria-hidden="true">' + L.pags.map(function (x, j) { return '<span class="' + (j <= L.max ? 'hecho' : '') + '"></span>'; }).join('') + '</span>' +
        (k < n - 1 ? '<button type="button" class="boton primario siguiente' + (k >= L.max ? ' late' : '') + '">Seguir leyendo <i class="fas fa-arrow-right" aria-hidden="true"></i></button>' : '');
      var a = $('.anterior', o.nav), s = $('.siguiente', o.nav);
      if (a) a.addEventListener('click', function () { ir(k - 1); var s2 = $('.siguiente', o.nav); (s2 || $('.anterior', o.nav) || o.texto).focus(); });
      if (s) s.addEventListener('click', function () { ir(k + 1); var s2 = $('.siguiente', o.nav); (s2 || $('.anterior', o.nav)).focus(); });
    }
    L.max = 0;
    function ir(k) {
      L.k = k; L.max = Math.max(L.max, k);
      o.texto.innerHTML = html(L.pags[k]);
      pintarNav();
      if (o.alPintar) o.alPintar(L);
      if (k === L.pags.length - 1 && !L.leido) { L.leido = true; if (o.alLeer) o.alLeer(); }
    }
    L.ir = ir;
    ir(0);
    return L;
  }

  /* Ventana de lectura (Kit.ventana: cierre visible, Escape, foco atrapado y devuelto). El texto que no cabe se lee por partes. */
  function lectura(o) {
    var cont = document.createElement('div');
    cont.className = 'lec';
    cont.innerHTML = (o.antes ? '<div class="lec-antes">' + o.antes + '</div>' : '') + '<div class="lec-texto"></div>' +
      (o.despues ? '<div class="lec-despues">' + o.despues + '</div>' : '') +
      '<div class="lector-nav lec-nav"></div><div class="lec-acciones"></div>';
    var cuerpo = Kit.ventana(o.titulo, cont, { alCerrar: o.alCerrar });
    var v = cuerpo.closest('.ventana');
    v.className = 'ventana' + (o.tono ? ' ' + o.tono : '');
    var texto = $('.lec-texto', cont), nav = $('.lec-nav', cont), acc = $('.lec-acciones', cont);
    function alto() {
      var cab = $('.ventana-cab', v), an = $('.lec-antes', cont), de = $('.lec-despues', cont);
      var resto = cab.offsetHeight + 34 + (an ? an.offsetHeight + 10 : 0) + (de ? de.offsetHeight + 10 : 0) + 54 + 46;
      return Math.max(90, innerHeight - 30 - resto);
    }
    texto.style.maxHeight = alto() + 'px';
    var leido = false;
    function acciones(L) {
      var ultima = !L || L.k === L.pags.length - 1;
      acc.innerHTML = o.boton && ultima ? '<button type="button" class="boton primario accion' + (o.boton.late ? ' late' : '') + '">' + esc(o.boton.texto) + (o.boton.icono ? ' <i class="fas ' + o.boton.icono + '" aria-hidden="true"></i>' : '') + '</button>' : '';
      acc.hidden = !acc.innerHTML;
      var b = $('.accion', acc);
      if (b) b.addEventListener('click', function () { Kit.cerrarVentana(); if (o.boton.accion) o.boton.accion(); });
    }
    var L = lectorCaja({ texto: texto, nav: nav, unidades: o.unidades, max: o.max || 18, min: 13, pag: 14.5, cont: null,
      alPintar: function (L) { acciones(L); },
      alLeer: function () { leido = true; if (o.alLeer) o.alLeer(); } });
    var foco = $('.accion', acc) || $('.siguiente', nav);
    if (foco) foco.focus();
    return L;
  }

  /* Botón de ayuda: cómo se juega (en usted). */
  $('.boton-ayuda').addEventListener('click', function () {
    var t = RUTA ? [
      'El camino tiene ' + N + ' paradas, una por cada momento del conflicto. La parada que late es la que sigue.',
      'Lea el momento. Si el texto tiene varias partes, use «Seguir leyendo».',
      'Clic en la señal que responde la pregunta. Si no es la correcta, lea la retroalimentación y vuelva a intentarlo.',
      'Con la respuesta correcta el tramo del camino se ilumina y se abre la parada siguiente.',
      'Estrellas: 3 si acierta al primer intento, 2 al segundo y 1 después. Clic en una parada ya superada para repasarla.',
      'Lo que se guarda en este navegador no es una calificación. Escape cierra las ventanas.'
    ] : [
      'Lea los mensajes de la conversación. Si hay varias partes, use «Seguir leyendo».',
      'Clic en una de las respuestas para enviarla como fiscal. La conversación le contesta con la retroalimentación.',
      'Si no es la respuesta adecuada, lea por qué y vuelva a intentarlo con otra.',
      'Al acertar, cada respuesta se puede volver a abrir para repasar su retroalimentación.',
      'Estrellas: 3 si acierta al primer intento, 2 al segundo y 1 después.',
      'Lo que se guarda en este navegador no es una calificación. Escape cierra las ventanas.'
    ];
    lectura({ titulo: 'Cómo se juega', unidades: t.map(function (x) { return u(x, 'p'); }), max: 17 });
  });

  if (window.Kit) Kit.pantallaCompleta();
  marcador();

  /* =====================================================================================================================
     RUTA: el conflicto escala por un camino
     ===================================================================================================================== */
  function rotuloCorto(p) {
    if (!p.titulo) return 'Pregunta final';
    var t = String(p.titulo).split(':')[0].replace(/[.\s]+$/, '');
    return may(t) + (p.nq > 1 ? ' · ' + (p.qi + 1) : '');
  }
  /* Escena dibujada del momento: la carretera y los dos autos; la tensión sube con cada parada (sin fotos, sin texto). */
  function escena(nivel) {
    var s = '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid meet" class="esc-svg">';
    s += '<rect class="s-cielo" x="0" y="0" width="320" height="120" rx="12"/>';
    s += '<path class="s-monte" d="M0 70 L50 40 L95 62 L150 30 L210 64 L260 44 L320 66 L320 120 L0 120Z"/>';
    s += '<rect class="s-via" x="0" y="72" width="320" height="34"/>';
    s += '<path class="s-raya" d="M8 89 H312"/>';
    function auto(x, y, cls, giro, pinchazo) {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + (giro || 0) + ' 24 10)">' +
        '<rect class="' + cls + '" x="0" y="6" width="50" height="13" rx="4"/>' +
        '<path class="' + cls + '" d="M10 7 L16 -2 H34 L41 7Z"/>' +
        '<path class="s-vidrio" d="M17 0 H33 L38 6 H13Z"/>' +
        '<circle class="s-rueda" cx="12" cy="' + (pinchazo ? 21 : 20) + '" r="' + (pinchazo ? 3.2 : 5) + '"/><circle class="s-rueda" cx="38" cy="20" r="5"/></g>';
    }
    function persona(x, y, cls, voltea) {
      return '<g transform="translate(' + x + ' ' + y + ')' + (voltea ? ' scale(-1 1)' : '') + '"><ellipse class="s-sombra" cx="0" cy="30" rx="9" ry="2.5"/>' +
        '<rect class="s-pantalon" x="-4" y="16" width="8" height="14" rx="2"/><rect class="' + cls + '" x="-6" y="3" width="12" height="15" rx="4"/>' +
        '<path class="' + cls + '" d="M5 7 L13 2" stroke-width="3.5" stroke-linecap="round"/><circle class="s-cabeza" cx="0" cy="-2" r="5"/><path class="s-pelo" d="M-5 -3 A5 5 0 0 1 5 -3 Z"/></g>';
    }
    function ira(x, y) { return '<path class="s-ira" d="M' + x + ' ' + y + ' l5 -7 l3 6 l5 -8 l3 7"/>'; }
    function estallido(x, y, r) {
      var d = '', k; for (k = 0; k < 16; k++) { var a = k * Math.PI / 8, rr = k % 2 ? r * 0.45 : r; d += (k ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); }
      return '<path class="s-estallido" d="' + d + 'Z"/>';
    }
    function llama(x, y) { return '<path class="s-llama" d="M' + x + ' ' + y + ' q-10 -14 2 -30 q2 12 9 14 q2 -8 -1 -14 q14 12 6 30z"/><path class="s-llama2" d="M' + (x + 3) + ' ' + y + ' q-4 -8 3 -16 q3 9 6 16z"/>'; }
    if (nivel <= 0) { s += auto(42, 66, 's-auto-a') + auto(150, 66, 's-auto-b', 0) + '<path class="s-flecha" d="M100 66 q20 -14 40 0" />'; }
    else if (nivel === 1) { s += auto(196, 66, 's-auto-a', 0, true) + auto(80, 66, 's-auto-b') + ira(150, 52) + ira(236, 50); }
    else if (nivel === 2) { s += auto(28, 66, 's-auto-b') + auto(234, 66, 's-auto-a', 0, true) + persona(138, 52, 's-camisa-b') + persona(178, 52, 's-camisa-a', true) + ira(150, 42) + ira(166, 40); }
    else if (nivel === 3) { s += auto(70, 64, 's-auto-b', -8) + auto(170, 66, 's-auto-a', 10) + estallido(152, 62, 16) + estallido(60, 50, 9) + estallido(236, 52, 9); }
    else { s += '<circle class="s-humo" cx="150" cy="30" r="14"/><circle class="s-humo" cx="172" cy="20" r="11"/><circle class="s-humo" cx="132" cy="18" r="9"/>' +
      auto(130, 66, 's-auto-quemado') + llama(140, 72) + llama(160, 70) + llama(150, 74); }
    return s + '</svg>';
  }
  function nivelDe(i) { return N <= 1 ? 0 : Math.round(4 * i / Math.max(1, N - 2)); }

  function ruta() {
    raiz.className = 'dec ruta';
    raiz.innerHTML =
      '<nav class="mapa" aria-label="Recorrido del conflicto">' +
        '<svg class="camino" aria-hidden="true"><path class="asfalto"/><path class="raya"/><path class="avanzado"/></svg>' +
        '<ol class="paradas">' + PASOS.map(function (p, i) {
          return '<li><button type="button" class="parada" data-i="' + i + '" style="--t:' + Math.round(100 * i / Math.max(1, N - 1)) + '%">' +
            '<span class="p-num" aria-hidden="true">' + (i + 1) + '</span><span class="p-rot">' + esc(rotuloCorto(p)) + '</span>' +
            '<span class="p-est" aria-hidden="true"></span></button></li>';
        }).join('') + '</ol>' +
        '<span class="auto-marca" aria-hidden="true"><i class="fas fa-car-side"></i></span>' +
      '</nav>' +
      '<section class="momento" aria-labelledby="m-num">' +
        '<p class="m-num" id="m-num"></p>' +
        '<div class="m-cont"><div class="m-texto lectura" tabindex="-1"></div><figure class="m-arte" aria-hidden="true"></figure></div>' +
        '<nav class="lector-nav m-nav" aria-label="Partes del momento" hidden></nav>' +
        '<button type="button" class="boton primario a-decidir">Clic para decidir <i class="fas fa-signs-post" aria-hidden="true"></i></button>' +
      '</section>' +
      '<section class="cruce" aria-label="Decisión en el cruce">' +
        '<button type="button" class="volver-momento"><i class="fas fa-arrow-left" aria-hidden="true"></i> Volver al momento</button>' +
        '<div class="c-cont"><p class="c-preg"></p><div class="senales" role="group" aria-label="Señales: opciones de respuesta"></div>' +
        '<p class="c-aviso" aria-live="polite"></p><div class="c-acciones"></div></div>' +
      '</section>' +
      '<section class="llegada" aria-labelledby="ll-tit" hidden>' +
        '<div class="ll-cab"><i class="fas fa-flag-checkered" aria-hidden="true"></i><h2 id="ll-tit">Recorrido completo</h2><span class="ll-estrellas"></span></div>' +
        '<div class="ll-cont"><div class="ll-texto lectura"></div></div>' +
        '<nav class="lector-nav ll-nav" aria-label="Partes del cierre" hidden></nav>' +
        '<div class="ll-acciones"><button type="button" class="boton repasar"><i class="fas fa-route" aria-hidden="true"></i> Clic para repasar las paradas</button>' +
        '<button type="button" class="boton de-nuevo"><i class="fas fa-rotate-left" aria-hidden="true"></i> Clic para recorrer de nuevo</button></div>' +
      '</section>';

    var pos = Math.min(est.pos || 0, primeroPendiente(), N - 1), lectorM = null, momentoLeido = false, enFin = false;

    function modo() { return getComputedStyle(raiz).getPropertyValue('--modo').trim() || 'columnas'; }

    /* Camino: una curva que pasa por el centro de cada parada; el tramo superado se ilumina. */
    function camino() {
      var mapa = $('.mapa', raiz), svg = $('.camino', mapa), rm = mapa.getBoundingClientRect();
      var pts = $$('.p-num', mapa).map(function (e) { var r = e.getBoundingClientRect(); return [r.left + r.width / 2 - rm.left, r.top + r.height / 2 - rm.top]; });
      svg.setAttribute('width', rm.width); svg.setAttribute('height', rm.height);
      svg.setAttribute('viewBox', '0 0 ' + rm.width + ' ' + rm.height);
      function d(ps) {
        if (!ps.length) return '';
        var s = 'M' + ps[0][0].toFixed(1) + ' ' + ps[0][1].toFixed(1);
        for (var k = 1; k < ps.length; k++) {
          var a = ps[k - 1], b = ps[k], my = (a[1] + b[1]) / 2, mx = (a[0] + b[0]) / 2;
          s += modo() === 'vistas' ? ' Q' + mx.toFixed(1) + ' ' + (Math.min(a[1], b[1]) - 6).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1)
            : ' C' + a[0].toFixed(1) + ' ' + my.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + my.toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
        }
        return s;
      }
      var hasta = Math.min(N - 1, resueltos() === N ? N - 1 : primeroPendiente());
      $('.asfalto', svg).setAttribute('d', d(pts));
      $('.raya', svg).setAttribute('d', d(pts));
      $('.avanzado', svg).setAttribute('d', d(pts.slice(0, hasta + 1)));
      var car = $('.auto-marca', mapa), p = pts[enFin ? N - 1 : pos];
      if (p) { car.style.left = p[0] + 'px'; car.style.top = p[1] + 'px'; }
    }
    function pintarMapa() {
      var pend = primeroPendiente();
      $$('.parada', raiz).forEach(function (b, i) {
        var abierto = i <= pend;
        b.disabled = !abierto;
        b.classList.toggle('actual', i === pos && !enFin);
        b.classList.toggle('superada', !!est.res[i]);
        b.classList.toggle('late', i === pend && i !== pos && !enFin);
        b.setAttribute('aria-current', i === pos && !enFin ? 'step' : 'false');
        var e = estrellas(i);
        $('.p-est', b).innerHTML = est.res[i] ? '<i class="fas fa-circle-check"></i>' : abierto ? '' : '<i class="fas fa-lock"></i>';
        b.setAttribute('aria-label', 'Parada ' + (i + 1) + ': ' + rotuloCorto(PASOS[i]) + (est.res[i] ? ', superada con ' + e + (e === 1 ? ' estrella' : ' estrellas') : abierto ? ', por decidir' : ', bloqueada'));
        b.title = est.res[i] ? 'Clic para repasar esta parada' : abierto ? 'Clic para ir a esta parada' : 'Se abre al superar la anterior';
      });
      camino();
    }

    function unidadesMomento(p) {
      var out = [], tit = norm(p.titulo || '');
      function agregar(t, k) {
        partirNota(t).forEach(function (x, n) { out.push(u(x, n ? 'nota' : (tit && norm(x) === tit ? 'tit' : k))); });
      }
      p.intro.forEach(function (l, n) { agregar(l.t, n === 0 && norm(l.t) !== tit ? 'lead' : 'p'); });
      p.contexto.forEach(function (l) { agregar(l.t, 'p'); });
      if (p.cab) agregar(p.cab, 'rot');
      p.enunciado.slice(0, -1).forEach(function (t) { agregar(t, 'p'); });
      return out;
    }
    function pregunta(p) { return p.enunciado.length ? p.enunciado[p.enunciado.length - 1] : ''; }

    function irA(i, foco) {
      enFin = false; raiz.classList.remove('fin');
      $('.llegada', raiz).hidden = true;
      pos = i; est.pos = i; guardar();
      var p = PASOS[i], us = unidadesMomento(p);
      raiz.classList.toggle('sin-momento', !us.length);
      raiz.classList.remove('ver-cruce');
      $('.m-num', raiz).innerHTML = '<i class="fas fa-location-dot" aria-hidden="true"></i> Parada ' + (i + 1) + ' de ' + N + ' · ' + esc(rotuloCorto(p));
      $('.m-arte', raiz).innerHTML = escena(nivelDe(i));
      pintarCruce();
      pintarMapa();
      encajar();
      if (foco) { var t = us.length ? $('.m-texto', raiz) : $('.senal', raiz); if (t) t.focus({ preventScroll: true }); }
    }
    function encajarMomento() {
      var p = PASOS[pos], us = unidadesMomento(p);
      momentoLeido = !us.length || !!est.res[pos];
      if (!us.length) return;
      lectorM = lectorCaja({ texto: $('.m-texto', raiz), nav: $('.m-nav', raiz), unidades: us, max: 19, min: 12.5, pag: 14,
        cont: $('.m-cont', raiz), arte: $('.m-arte', raiz), artMin: 84,
        alLeer: function () { momentoLeido = true; pintarCruce(true); } });
    }
    function pintarCruce(soloEstado) {
      var p = PASOS[pos], c = $('.cruce', raiz), res = !!est.res[pos], prob = est.prob[pos] || {};
      if (!soloEstado) {
        $('.c-preg', c).innerHTML = '<i class="fas fa-signs-post" aria-hidden="true"></i> <span>' + rico(pregunta(p)) + '</span>';
        $('.senales', c).innerHTML = p.opciones.map(function (o) {
          return '<button type="button" class="senal" data-j="' + o.j + '" style="--d:' + (o.j * 0.07) + 's"><span class="s-letra">' + esc(o.letra) + '</span>' +
            '<span class="s-texto">' + rico(o.texto) + '</span><span class="s-marca" aria-hidden="true"></span></button>';
        }).join('');
        $$('.senal', c).forEach(function (b) { b.addEventListener('click', function () { elegir(Number(b.dataset.j), b); }); });
      }
      $$('.senal', c).forEach(function (b) {
        var j = Number(b.dataset.j), o = p.opciones[j];
        b.classList.toggle('acierto', res && o.ok);
        b.classList.toggle('probada', !!prob[j] && !o.ok);
        b.classList.toggle('bloqueada', !momentoLeido && !res);
        b.setAttribute('aria-disabled', !momentoLeido && !res ? 'true' : 'false');
        $('.s-marca', b).innerHTML = res && o.ok ? '<i class="fas fa-circle-check"></i>' : prob[j] && !o.ok ? '<i class="fas fa-xmark"></i>' : '';
        b.title = res ? 'Clic para repasar la retroalimentación' : 'Clic para decidir por esta señal';
      });
      var aviso2 = $('.c-aviso', c);
      aviso2.className = 'c-aviso' + (res ? ' bien' : '');
      aviso2.innerHTML = res ? '<i class="fas fa-circle-check" aria-hidden="true"></i> Parada superada. Clic en una señal para repasar su retroalimentación.'
        : !momentoLeido ? '<i class="fas fa-lock" aria-hidden="true"></i> Termine de leer el momento («Seguir leyendo») para decidir.'
        : 'Clic en la señal que elija.';
      var acc = $('.c-acciones', c), ult = pos === N - 1;
      acc.innerHTML = res ? (ult ? '<button type="button" class="boton primario seguir late">Clic para ver el cierre <i class="fas fa-flag-checkered" aria-hidden="true"></i></button>'
        : '<button type="button" class="boton primario seguir' + (!est.res[pos + 1] ? ' late' : '') + '">Siguiente parada <i class="fas fa-arrow-right" aria-hidden="true"></i></button>') : '';
      var sg = $('.seguir', acc);
      if (sg) sg.addEventListener('click', function () { if (ult) llegada(true); else irA(pos + 1, true); });
    }
    function elegir(j, boton) {
      var p = PASOS[pos], o = p.opciones[j], res = !!est.res[pos];
      if (!momentoLeido && !res) { aviso('Termine de leer el momento («Seguir leyendo») para decidir.'); return; }
      var antes = '<p class="lec-eleccion"><span class="s-letra">' + esc(o.letra) + '</span> <span>' + rico(o.texto) + '</span></p>';
      if (res) {
        /* Repaso: cada señal abre su retroalimentación. */
        lectura({ titulo: o.ok ? 'Respuesta correcta · repaso' : 'Repaso de la señal ' + o.letra, tono: o.ok ? 'bien' : 'mal', antes: antes,
          unidades: o.ok ? retroBien(p).concat(p.clave ? [u(p.clave, 'clave')] : []) : retroMal(p, o),
          boton: { texto: 'Volver al cruce', icono: 'fa-signs-post' } });
        return;
      }
      if (o.ok) {
        est.res[pos] = true; est.prob[pos] = est.prob[pos] || {}; est.prob[pos][j] = true; guardar();
        marcador(); pintarCruce(true); pintarMapa();
        if (pos === N - 1) { llegada(true); return; }
        /* El cruce suma «Siguiente parada»: se vuelve a encajar sin perder la vista de las señales. */
        encajar();
        lectura({ titulo: '¡Respuesta correcta!', tono: 'bien', antes: antes,
          unidades: retroBien(p).concat(p.clave ? [u(p.clave, 'clave')] : []),
          boton: { texto: 'Siguiente parada', icono: 'fa-arrow-right', late: true, accion: function () { irA(pos + 1, true); } } });
      } else {
        est.err[pos] = (est.err[pos] || 0) + 1; est.prob[pos] = est.prob[pos] || {}; est.prob[pos][j] = true; guardar();
        pintarCruce(true);
        /* La señal marcada con su «×» puede ocupar otra línea: se vuelve a encajar el cruce (QA de cortes, 19/11/2026: el aviso
           «Clic en la señal que elija» quedaba fuera de la tarjeta en la parada 3). */
        encajar();
        boton.classList.remove('sacude'); void boton.offsetWidth; boton.classList.add('sacude');
        lectura({ titulo: 'Esa no es la señal', tono: 'mal', antes: antes, unidades: retroMal(p, o),
          boton: { texto: 'Vuelva a intentarlo', icono: 'fa-rotate-left' } });
      }
    }
    /* Llegada: la última retroalimentación de la ficha como cierre del recorrido. */
    function llegada(foco) {
      enFin = true; raiz.classList.add('fin'); raiz.classList.remove('ver-cruce', 'sin-momento');
      var ll = $('.llegada', raiz); ll.hidden = false;
      var p = PASOS[N - 1], e = totalEstrellas();
      $('.ll-estrellas', ll).innerHTML = '<i class="fas fa-star" aria-hidden="true"></i> ' + e + ' / ' + (3 * N) + ' estrellas';
      var us = (p.clave ? [u(p.clave, 'clave')] : []).concat(retroBien(p));
      if (p.cierre.length) p.cierre.forEach(function (l) { us.push(u(l.t, 'p')); });
      pintarMapa();
      lectorCaja({ texto: $('.ll-texto', ll), nav: $('.ll-nav', ll), unidades: us, max: 20, min: 12.5, pag: 14, cont: $('.ll-cont', ll) });
      if (foco) $('#ll-tit').setAttribute('tabindex', '-1'), $('#ll-tit').focus({ preventScroll: true });
    }
    /* Cada panel se mide visible: en las vistas (celular), el momento y el cruce se alternan y se encajan por turno. */
    function encajar() {
      var verC = raiz.classList.contains('ver-cruce');
      raiz.classList.remove('forzar-vistas', 'ver-cruce');
      if (enFin) { llegada(false); return; }
      var c = $('.cruce', raiz), cc = $('.c-cont', c);
      function cabeCruce() { return cc.scrollHeight <= cc.clientHeight + 1 && c.scrollHeight <= c.clientHeight + 1; }
      function fitCruce(max, min) { for (var fs = max; fs >= min; fs -= 0.5) { c.style.setProperty('--fs', fs + 'px'); if (cabeCruce()) return true; } return false; }
      var md = modo();
      if (md === 'apilado') {
        /* El cruce toma su alto natural (hasta el 60 % de la columna); el momento, lo que queda. */
        var col = raiz.clientHeight;
        for (var fs = 18; fs >= 12; fs -= 0.5) { c.style.setProperty('--fs', fs + 'px'); if (c.offsetHeight <= col * 0.6 && cabeCruce()) break; }
        encajarMomento();
        if ($('.m-cont', raiz).clientHeight < 110 && lectorM && lectorM.pags.length > 1) {
          raiz.classList.add('forzar-vistas', 'ver-cruce'); fitCruce(19, 11.5); raiz.classList.remove('ver-cruce'); encajarMomento();
        }
      } else if (md === 'columnas') {
        if (!fitCruce(21, 12)) { raiz.classList.add('forzar-vistas', 'ver-cruce'); fitCruce(19, 11.5); raiz.classList.remove('ver-cruce'); }
        encajarMomento();
      } else {
        encajarMomento();
        raiz.classList.add('ver-cruce'); fitCruce(19, 11.5); raiz.classList.remove('ver-cruce');
      }
      if (verC && (md === 'vistas' || raiz.classList.contains('forzar-vistas'))) raiz.classList.add('ver-cruce');
      pintarCruce(true);
      if (c.getClientRects().length && !cabeCruce()) fitCruce(parseFloat(c.style.getPropertyValue('--fs')) || 16, 11.5);
      camino();
    }

    $$('.parada', raiz).forEach(function (b) { b.addEventListener('click', function () { irA(Number(b.dataset.i), true); }); });
    $('.a-decidir', raiz).addEventListener('click', function () {
      if (!momentoLeido) { aviso('Termine de leer el momento («Seguir leyendo») para decidir.'); return; }
      raiz.classList.add('ver-cruce'); encajarCruceVista(); var s = $('.senal', raiz); if (s) s.focus();
    });
    $('.volver-momento', raiz).addEventListener('click', function () { raiz.classList.remove('ver-cruce'); var t = $('.m-texto', raiz); t.focus({ preventScroll: true }); });
    function encajarCruceVista() {
      var c = $('.cruce', raiz), cc = $('.c-cont', c);
      for (var fs = 18; fs >= 11.5; fs -= 0.5) { c.style.setProperty('--fs', fs + 'px'); if (cc.scrollHeight <= cc.clientHeight + 1 && c.scrollHeight <= c.clientHeight + 1) break; }
    }
    $('.repasar', raiz).addEventListener('click', function () { irA(0, true); });
    $('.de-nuevo', raiz).addEventListener('click', function () { est = nuevo(); guardar(); marcador(); irA(0, true); });

    if (resueltos() === N) { pos = N - 1; irA(N - 1); llegada(false); } else irA(pos);
    var rT = null;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { if (enFin) llegada(false); else { var k = lectorM ? lectorM.k : 0; encajar(); if (lectorM && k < lectorM.pags.length) lectorM.ir(Math.min(k, lectorM.pags.length - 1)); if (raiz.classList.contains('ver-cruce')) encajarCruceVista(); } }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (enFin) llegada(false); else encajar(); });

    window.Dec = {
      listo: true, forma: 'ruta', n: N,
      pos: function () { return enFin ? -1 : pos; },
      resuelto: function (i) { return !!est.res[i]; },
      correcta: function (i) { return PASOS[i].correcta.j; },
      opciones: function (i) { return PASOS[i].opciones.length; },
      estrellas: totalEstrellas, enFin: function () { return enFin; }
    };
  }

  /* =====================================================================================================================
     CHAT: una conversación con la persona (o la «Situación»)
     ===================================================================================================================== */
  function chat() {
    var nombre = A.personaje || (A.titulos && A.titulos[0]) || PASOS[0].titulo || 'Situación';
    var avatar = A.personaje
      ? '<svg class="av-svg" viewBox="0 0 40 40" aria-hidden="true"><circle class="av-fondo" cx="20" cy="20" r="20"/><path class="av-ropa" d="M7 40c1-9 6-13 13-13s12 4 13 13z"/>' +
        '<path class="av-pelo" d="M11 22c-1-10 3-15 9-15s10 5 9 15c-2-1-3-4-3-7-2 2-8 3-12 1 0 3-1 5-3 6z"/><circle class="av-cara" cx="20" cy="17" r="6.5"/>' +
        '<path class="av-pelo" d="M13 16c0-5 3-8 7-8s7 3 7 7c-3-3-9-3-14 1z"/></svg>'
      : '<span class="av-icono" aria-hidden="true"><i class="fas fa-folder-open"></i></span>';
    raiz.className = 'dec chat';
    raiz.innerHTML =
      '<section class="hilo" aria-label="Conversación: ' + esc(nombre) + '">' +
        '<header class="h-cab">' + avatar + '<div class="h-quien"><p class="h-nombre">' + esc(may(nombre)) + '</p><p class="h-sub"></p></div>' +
        '<span class="h-estado" aria-hidden="true"><i class="fas fa-comments"></i></span></header>' +
        '<div class="h-msjs" tabindex="-1" aria-live="polite"></div>' +
        '<nav class="lector-nav h-nav" aria-label="Mensajes de la conversación"></nav>' +
      '</section>' +
      '<section class="respuestas" aria-label="Respuestas que puede enviar">' +
        '<button type="button" class="volver-hilo"><i class="fas fa-arrow-left" aria-hidden="true"></i> Volver a la conversación</button>' +
        '<div class="r-cont"><p class="r-cab"></p><p class="r-guia"></p><div class="r-lista" role="group" aria-label="Respuestas"></div>' +
        '<p class="r-aviso" aria-live="polite"></p><div class="r-acciones"></div></div>' +
      '</section>';

    var hilo = $('.h-msjs', raiz), navH = $('.h-nav', raiz);
    var TURNOS = [], PAGS = [], pg = 0, animar = false;
    var fin = false;
    function modo() { return raiz.classList.contains('forzar-vistas') ? 'vistas' : (getComputedStyle(raiz).getPropertyValue('--modo').trim() || 'columnas'); }

    /* Turnos: los mensajes de la pregunta, cada respuesta con su retroalimentación y el cierre. */
    function turnoPregunta(i) {
      var p = PASOS[i], m = [], g = 0;
      function persona(t) { m.push({ t: t, k: 'pers', g: 'q' + i + '-' + (g++) }); }
      function narr(t) { m.push({ t: t, k: 'narr', g: 'q' + i + '-' + (g++) }); }
      function lin(t) { if (!A.personaje || /^[“"«]/.test(t.trim())) persona(t); else narr(t); }
      p.intro.forEach(function (l) { lin(l.t); });
      p.contexto.forEach(function (l) { lin(l.t); });
      if (p.cab) m.push({ t: p.cab, k: 'rotm', g: 'q' + i + '-c' });
      p.enunciado.forEach(function (t) { if (A.personaje) narr(t); else persona(t); });
      return { id: 'q' + i, q: i, tipo: 'pregunta', msjs: m };
    }
    function turnoRespuesta(i, j) {
      var p = PASOS[i], o = p.opciones[j], m = [];
      m.push({ t: o.texto, k: 'usted', letra: o.letra, g: 'u' });
      var r = o.ok ? retroBien(p) : retroMal(p, o);
      r.forEach(function (x, n) { m.push({ t: x.t, k: 'resp', sub: x.k, g: 'r' + n, ok: o.ok, primero: n === 0 }); });
      if (o.ok && p.clave) {
        /* La clave breve va en el hilo; la larga (repite la retroalimentación), en el panel de respuestas, con su botón. */
        if (claveCorta(p)) m.push({ t: p.clave, k: 'clave', g: 'c' });
      }
      if (!o.ok && !est.res[i]) m.push({ t: 'Esa no es la respuesta adecuada. Vuelva a intentarlo con otra.', k: 'sis', g: 's' });
      return { id: 'r' + i + '-' + j, q: i, tipo: 'respuesta', ok: o.ok, msjs: m };
    }
    function turnoFin() {
      var m = [], ult = PASOS[N - 1];
      ult.cierre.forEach(function (l, n) { m.push({ t: l.t, k: A.personaje ? 'narr' : 'pers', g: 'f' + n }); });
      m.push({ t: 'Conversación completa: ' + totalEstrellas() + ' de ' + (3 * N) + ' estrellas.', k: 'sis', g: 'fs', fin: true });
      m.push({ k: 'boton', g: 'fb', t: '', html: '<p class="m-boton m-centro"><button type="button" class="boton de-nuevo"><i class="fas fa-rotate-left" aria-hidden="true"></i> Clic para empezar de nuevo</button></p>' });
      return { id: 'fin', q: N - 1, tipo: 'fin', msjs: m };
    }
    function htmlMsjs(l) {
      /* La retroalimentación de la persona va en un solo globo, con sus párrafos (rótulo de la ficha, texto, fuente). */
      var gs = agrupar(l), out = [];
      for (var n = 0; n < gs.length; n++) {
        var x0 = gs[n];
        if (x0.k !== 'resp') { out.push(x0); continue; }
        var globo = { k: 'globo', ok: x0.ok, cab: x0.primero && !x0.sigue, ps: [x0] };
        while (n + 1 < gs.length && gs[n + 1].k === 'resp') globo.ps.push(gs[++n]);
        out.push(globo);
      }
      return out.map(function (x) {
        if (x.k === 'globo') return '<div class="msj m-pers m-resp ' + (x.ok ? 'ok' : 'no') + '">' +
          (x.cab ? '<span class="m-quien">' + esc(may(nombre)) + ' <i class="fas ' + (x.ok ? 'fa-circle-check' : 'fa-circle-xmark') + '" aria-hidden="true"></i></span>' : '') +
          x.ps.map(function (p) { return '<p class="' + (p.sub === 'rot' ? 'b-rot' : p.sub === 'fuente' ? 'b-fuente' : '') + (p.sigue ? ' sigue' : '') + '">' + rico(p.t) + '</p>'; }).join('') + '</div>';
        if (x.k === 'boton') return x.html;
        var t = rico(x.t), cls = x.sigue ? ' sigue' : '';
        if (x.k === 'pers') return '<div class="msj m-pers' + cls + '"><span class="m-quien">' + esc(may(nombre)) + '</span><p>' + t + '</p></div>';
        if (x.k === 'narr') return '<p class="msj m-narr' + cls + '">' + t + '</p>';
        if (x.k === 'rotm') return '<p class="msj m-rot' + cls + '"><span>' + t + '</span></p>';
        if (x.k === 'usted') return '<div class="msj m-usted' + cls + '"><span class="m-quien">Usted, fiscal <i class="fas fa-user-tie" aria-hidden="true"></i></span><p><span class="s-letra">' + esc(x.letra) + '</span> ' + t + '</p></div>';
        if (x.k === 'clave') return '<p class="msj m-clave' + cls + '"><i class="fas fa-key" aria-hidden="true"></i> ' + t + '</p>';
        return '<p class="msj m-sis' + cls + (x.fin ? ' fin' : '') + '"><i class="fas ' + (x.fin ? 'fa-trophy' : 'fa-rotate-left') + '" aria-hidden="true"></i> ' + t + '</p>';
      }).join('');
    }
    /* Páginas: cada turno en las páginas que hagan falta, con la letra más grande que quepa. */
    function paginarTodo() {
      var ant = PAGS[pg], antT = ant ? ant.t : null, antLoc = ant ? ant.loc : 0;
      PAGS = [];
      /* La barra de mensajes tiene alto fijo; se mide con su contenido más largo. */
      navH.innerHTML = '<button type="button" class="boton anterior">Anterior</button><span class="parte">Mensajes 1 / 2</span><button type="button" class="boton siguiente">Seguir leyendo</button>';
      function cabe() { return hilo.scrollHeight <= hilo.clientHeight + 1; }
      TURNOS.forEach(function (T, ti) {
        hilo.innerHTML = htmlMsjs(T.msjs);
        var ok = false, fs, ps;
        for (fs = 21; fs >= 13; fs -= 0.5) { hilo.style.setProperty('--fs', fs + 'px'); if (cabe()) { ok = true; break; } }
        if (ok) ps = [{ l: T.msjs, fs: fs }];
        else { hilo.style.setProperty('--fs', '14px'); ps = paginar(hilo, T.msjs, htmlMsjs, cabe).map(function (l) { return { l: l, fs: 14 }; }); }
        ps.forEach(function (x, loc) { PAGS.push({ t: ti, loc: loc, n: ps.length, l: x.l, fs: x.fs }); });
      });
      if (antT !== null) pg = Math.min(primeraDe(antT) + antLoc, ultimaDe(antT));
    }
    function primeraDe(ti) { for (var k = 0; k < PAGS.length; k++) if (PAGS[k].t === ti) return k; return 0; }
    function ultimaDe(ti) { var r = 0; for (var k = 0; k < PAGS.length; k++) if (PAGS[k].t === ti) r = k; return r; }
    /* Lo leído se guarda por turno (no por número de página: al cambiar el tamaño, las páginas se rehacen). */
    var LEIDO = {}, COMPLETO = {};
    function vistoPag(k) { var P = PAGS[k]; if (!P) return true; var id = TURNOS[P.t].id; return !!COMPLETO[id] || (LEIDO[id] !== undefined && P.loc <= LEIDO[id]); }
    /* ¿Leyó todos los mensajes de la pregunta i? (para responder) */
    function preguntaLeida(i) {
      var ti = -1; TURNOS.forEach(function (T, n) { if (T.id === 'q' + i) ti = n; });
      return ti < 0 || !!COMPLETO['q' + i];
    }
    function pasoVisto() { var P = PAGS[pg]; return P ? TURNOS[P.t].q : 0; }
    function mostrar(k, foco) {
      pg = Math.max(0, Math.min(PAGS.length - 1, k));
      var P = PAGS[pg], tid = TURNOS[P.t].id;
      if (!animar) hilo.classList.remove('llega');
      animar = false;
      LEIDO[tid] = Math.max(LEIDO[tid] === undefined ? -1 : LEIDO[tid], P.loc);
      if (P.loc === P.n - 1) COMPLETO[tid] = true;
      hilo.style.setProperty('--fs', P.fs + 'px');
      hilo.innerHTML = htmlMsjs(P.l);
      $$('.de-nuevo', hilo).forEach(function (b) {
        b.addEventListener('click', function () { est = nuevo(); guardar(); marcador(); iniciar(); encajar(); hilo.focus({ preventScroll: true }); });
      });
      pintarNav();
      pintarRespuestas();
      if (foco) hilo.focus({ preventScroll: true });
    }
    function pintarNav() {
      var n = PAGS.length, k = pg, i = pasoVisto(), vistas = modo() === 'vistas';
      var pendiente = k < n - 1 && !vistoPag(k + 1);
      var responder = vistas;
      navH.innerHTML = (k > 0 ? '<button type="button" class="boton anterior" aria-label="Anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i><span class="tx"> Anterior</span></button>' : '<span class="hueco"></span>') +
        '<span class="parte">Mensajes ' + (k + 1) + ' / ' + n + '</span>' +
        (k < n - 1 ? '<button type="button" class="boton ' + (pendiente ? 'primario late ' : '') + 'siguiente">' + (pendiente ? 'Seguir leyendo' : 'Siguiente') + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></button>' : '') +
        (responder && k === n - 1 ? '<button type="button" class="boton primario a-responder' + (!est.res[i] ? ' late' : '') + '">' + (est.res[i] ? 'Clic para ver respuestas' : 'Clic para responder') + ' <i class="fas fa-reply" aria-hidden="true"></i></button>' : '');
      var a = $('.anterior', navH), s = $('.siguiente', navH), r = $('.a-responder', navH);
      if (a) a.addEventListener('click', function () { mostrar(pg - 1); var x = $('.anterior', navH) || $('.siguiente', navH); if (x) x.focus(); });
      if (s) s.addEventListener('click', function () { mostrar(pg + 1); var x = $('.siguiente', navH) || $('.a-responder', navH) || $('.anterior', navH); if (x) x.focus(); });
      if (r) r.addEventListener('click', function () { raiz.classList.add('ver-resp'); encajarRespuestas(); var b = $('.resp', raiz); if (b) b.focus(); });
    }
    function pintarRespuestas() {
      var i = fin && pasoVisto() === N - 1 ? N - 1 : pasoVisto(), p = PASOS[i], res = !!est.res[i], prob = est.prob[i] || {}, R = $('.respuestas', raiz);
      $('.h-sub', raiz).textContent = 'Pregunta ' + (i + 1) + ' de ' + N + (res ? ' · resuelta' : '');
      $('.r-cab', R).innerHTML = res && p.cabRepaso ? rico(p.cabRepaso) : res ? 'Repaso de las respuestas' : 'Respuestas que puede enviar';
      $('.r-cab', R).classList.toggle('de-ficha', !!(res && p.cabRepaso));
      $('.r-guia', R).textContent = res ? 'Clic en cada respuesta para leer su retroalimentación.' : 'Clic en una respuesta para enviarla.';
      var lista = $('.r-lista', R);
      if (lista.getAttribute('data-q') !== String(i)) {
        lista.setAttribute('data-q', i);
        lista.innerHTML = p.opciones.map(function (o) {
          return '<button type="button" class="resp" data-j="' + o.j + '"><span class="s-letra">' + esc(o.letra) + '</span><span class="r-texto">' + rico(o.texto) + '</span>' +
            '<span class="r-marca" aria-hidden="true"></span></button>';
        }).join('');
        $$('.resp', lista).forEach(function (b) { b.addEventListener('click', function () { enviar(i, Number(b.dataset.j)); }); });
      }
      var leida = preguntaLeida(i);
      $$('.resp', lista).forEach(function (b) {
        var j = Number(b.dataset.j), o = p.opciones[j], visto = !!est.vistos['r' + i + '-' + j];
        b.classList.toggle('acierto', res && o.ok);
        b.classList.toggle('probada', !!prob[j] && !o.ok);
        b.classList.toggle('late', res && !o.ok && !prob[j] && !visto);
        b.classList.toggle('bloqueada', !res && !leida);
        b.setAttribute('aria-disabled', !res && !leida ? 'true' : 'false');
        $('.r-marca', b).innerHTML = res && o.ok ? '<i class="fas fa-circle-check"></i>' : prob[j] && !o.ok ? '<i class="fas fa-xmark"></i>' : res && visto ? '<i class="fas fa-circle-check"></i>' : '<i class="fas fa-paper-plane"></i>';
        b.title = res ? 'Clic para repasar su retroalimentación' : 'Clic para enviar esta respuesta';
      });
      var av = $('.r-aviso', R);
      av.className = 'r-aviso' + (res ? ' bien' : '');
      av.innerHTML = res ? '' : !leida ? '<i class="fas fa-lock" aria-hidden="true"></i> Lea todos los mensajes («Seguir leyendo») para responder.' : '';
      var acc = $('.r-acciones', R), sig = res && i < N - 1 ? i + 1 : null;
      var vc = !!est.vistos['clave' + i];
      acc.innerHTML = (res && p.clave && !claveCorta(p) ? '<button type="button" class="boton ver-clave' + (vc ? ' visto' : ' late') + '"><i class="fas fa-key" aria-hidden="true"></i> Clic para ver la respuesta de la ficha' +
          (vc ? ' <i class="fas fa-circle-check visto-marca" aria-hidden="true"></i>' : '') + '</button>' : '') +
        (sig !== null ? '<button type="button" class="boton primario a-siguiente' + (!est.res[sig] ? ' late' : '') + '">Clic para ir a la pregunta siguiente <i class="fas fa-arrow-right" aria-hidden="true"></i></button>' : '');
      var bs = $('.a-siguiente', acc), bc = $('.ver-clave', acc);
      if (bs) bs.addEventListener('click', function () { irPregunta(sig); });
      if (bc) bc.addEventListener('click', function () {
        lectura({ titulo: 'Respuesta de la ficha', tono: 'bien', unidades: [u(p.clave, 'p')], boton: { texto: 'Volver a las respuestas', icono: 'fa-reply' },
          alLeer: function () { est.vistos['clave' + i] = true; guardar(); },
          alCerrar: function () { pintarRespuestas(); var b2 = $('.ver-clave', raiz); if (b2) b2.focus(); } });
      });
      /* El panel cambia de texto (rótulo, aviso, botones): la letra se vuelve a encajar. */
      if (R.getClientRects().length) encajarRespuestas();
    }
    function irPregunta(i) {
      var ti = -1; TURNOS.forEach(function (T, n) { if (T.id === 'q' + i) ti = n; });
      if (ti < 0) { TURNOS.push(turnoPregunta(i)); paginarTodo(); ti = TURNOS.length - 1; }
      raiz.classList.remove('ver-resp');
      mostrar(primeraDe(ti), true);
    }
    function agregar(T) {
      var ti = -1; TURNOS.forEach(function (x, n) { if (x.id === T.id) ti = n; });
      if (ti < 0) { TURNOS.push(T); ti = TURNOS.length - 1; } else TURNOS[ti] = T;
      paginarTodo();
      return ti;
    }
    function enviar(i, j) {
      var p = PASOS[i], o = p.opciones[j], res = !!est.res[i];
      if (!res && !preguntaLeida(i)) { aviso('Lea todos los mensajes («Seguir leyendo») para responder.'); return; }
      if (!res) {
        est.prob[i] = est.prob[i] || {}; est.prob[i][j] = true;
        if (o.ok) est.res[i] = true; else est.err[i] = (est.err[i] || 0) + 1;
      }
      est.vistos['r' + i + '-' + j] = true;
      guardar(); marcador();
      /* La conversación se mide visible (en vistas, las respuestas estaban delante). */
      raiz.classList.remove('ver-resp');
      var ti = agregar(turnoRespuesta(i, j));
      if (o.ok && !res && i === N - 1) { fin = true; agregar(turnoFin()); }
      hilo.classList.remove('llega'); void hilo.offsetWidth; hilo.classList.add('llega'); animar = true;
      mostrar(primeraDe(ti), true);
      var s = $('.siguiente', navH) || $('.a-responder', navH);
      if (s && modo() === 'vistas') s.focus();
    }
    function encajarRespuestas() {
      var R = $('.respuestas', raiz), c = $('.r-cont', R);
      for (var fs = 17; fs >= 11.5; fs -= 0.5) { R.style.setProperty('--fs', fs + 'px'); if (c.scrollHeight <= c.clientHeight + 1 && R.scrollHeight <= R.clientHeight + 1) return true; }
      return false;
    }
    function encajar() {
      raiz.classList.remove('forzar-vistas');
      pintarRespuestas();
      if (getComputedStyle(raiz).getPropertyValue('--modo').trim() !== 'vistas') {
        var R = $('.respuestas', raiz), c = $('.r-cont', R), ok = false;
        for (var fs = 17; fs >= 12; fs -= 0.5) { R.style.setProperty('--fs', fs + 'px'); if (c.scrollHeight <= c.clientHeight + 1) { ok = true; break; } }
        if (!ok) raiz.classList.add('forzar-vistas');
      }
      /* Cada panel se mide visible: en las vistas, la conversación y las respuestas se alternan. */
      var verR = raiz.classList.contains('ver-resp');
      raiz.classList.remove('ver-resp');
      paginarTodo();
      mostrar(pg);
      if (modo() === 'vistas') { raiz.classList.add('ver-resp'); encajarRespuestas(); if (!verR) raiz.classList.remove('ver-resp'); }
    }
    $('.volver-hilo', raiz).addEventListener('click', function () { raiz.classList.remove('ver-resp'); hilo.focus({ preventScroll: true }); pintarNav(); });

    function iniciar() {
      TURNOS = []; PAGS = []; pg = 0; LEIDO = {}; COMPLETO = {}; fin = false;
      var pend = primeroPendiente();
      for (var i = 0; i < N; i++) {
        if (i > pend) break;
        TURNOS.push(turnoPregunta(i));
        if (est.res[i]) TURNOS.push(turnoRespuesta(i, PASOS[i].correcta.j));
      }
      if (pend === N) { fin = true; TURNOS.push(turnoFin()); }
      raiz.classList.remove('ver-resp');
      $('.r-lista', raiz).removeAttribute('data-q');
      paginarTodo();
      if (pend < N) { var ti = -1; TURNOS.forEach(function (T, n) { if (T.id === 'q' + pend) ti = n; }); pg = primeraDe(ti); }
      else pg = 0;
      /* Lo ya resuelto en otra visita queda visto. */
      TURNOS.forEach(function (T) { if (est.res[T.q] || T.tipo === 'fin') COMPLETO[T.id] = true; });
    }
    iniciar();
    encajar();
    var rT = null;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(encajar, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(encajar);

    window.Dec = {
      listo: true, forma: 'chat', n: N,
      pos: function () { return pasoVisto(); },
      resuelto: function (i) { return !!est.res[i]; },
      correcta: function (i) { return PASOS[i].correcta.j; },
      opciones: function (i) { return PASOS[i].opciones.length; },
      estrellas: totalEstrellas, enFin: function () { return fin; },
      paginas: function () { return PAGS.length; }, pagina: function () { return pg; }
    };
  }

  if (RUTA) ruta(); else chat();
})();
