/* Biblioteca de normas (Justicia restaurativa, 18/11/2026). Necesita ../comun/kit.js y datos.js (window.BIBLIOTECAS).
   index.html?b=<id>. La colección completa se ve de un vistazo: una estantería con un estante por grupo de normas
   (placa con su título, la ficha con el texto del estante y un libro por norma). Cada libro se abre en una ventana amplia,
   un «libro abierto» que muestra la norma COMPLETA: a una columna si cabe con letra cómoda; si no, a dos columnas, como
   las dos páginas de un libro. Solo si ni así cabe (celular) se lee por partes con «Seguir leyendo», por párrafos
   completos: nunca se parte una oración.
   - Texto literal de datos.js, en su orden. Las notas al pie (nota: true) van como nota, en su lugar. Si un párrafo
     repite al final el texto de su nota («…⁴. ⁴ Por ejemplo…»), esa cola no se pinta dos veces: se lee en la nota.
   - Estado en el navegador: Kit.guardar('biblioteca:<id>') → clave «jr:biblioteca:<id>». «Por leer», «Falta leer»,
     «Leído»; barra «Exploración n / N»; lo pendiente late suave y el siguiente sugerido se resalta.
   - Textos de la interfaz en usted o genéricos. window.Bib expone el estado para la QA. */
(function () {
  'use strict';
  var m = location.search.match(/[?&]b=([\w-]+)/);
  var ID = m ? m[1] : '';
  var B = (window.BIBLIOTECAS || {})[ID] || null;
  var raiz = document.getElementById('biblioteca');
  document.body.setAttribute('data-recurso', 'biblioteca-' + (ID || 'sin-id'));

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  if (!B) {
    raiz.innerHTML = '<div class="aviso-bib"><i class="fas fa-book" aria-hidden="true"></i><p>No se encontró la biblioteca solicitada.</p></div>';
    Kit.pantallaCompleta();
    window.Bib = { claves: [], leido: function () { return false; } };
    return;
  }

  /* ---------- Estado ---------- */
  var CLAVE_EST = 'biblioteca:' + B.id;
  var estado = Kit.leer(CLAVE_EST, null) || {};
  if (!estado.leidos) estado.leidos = {};
  if (!estado.parcial) estado.parcial = {};
  function guardar() { Kit.guardar(CLAVE_EST, estado); }
  function leido(k) { return !!estado.leidos[k]; }
  function estadoDe(k) { return leido(k) ? 'leido' : (estado.parcial[k] ? 'parcial' : 'pendiente'); }
  function textoEstado(k) { var s = estadoDe(k); return s === 'leido' ? 'Leído' : s === 'parcial' ? 'Falta leer' : 'Por leer'; }

  /* ---------- Textos: notas al pie y unidades de lectura ---------- */
  var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function limpiar(parrafos) {
    var out = [];
    (parrafos || []).forEach(function (p, i) {
      if (p.nota) { out.push({ tipo: 'nota', t: p.t }); return; }
      var t = p.t.trim();
      for (var j = i + 1; j < parrafos.length && parrafos[j].nota; j++) {
        var mm = parrafos[j].t.match(/^(\d+)\s+([\s\S]+)$/);
        if (!mm) continue;
        var cola = mm[1].split('').map(function (d) { return SUP[d]; }).join('') + ' ' + mm[2].trim();
        if (t.length > cola.length && t.slice(-cola.length) === cola) t = t.slice(0, -cola.length).trim();
      }
      out.push({ tipo: p.vineta ? 'li' : 'p', t: t });
    });
    return out;
  }
  // Una unidad no se separa entre partes: el párrafo con sus notas; la frase que abre una lista («…preguntarse:») con su
  // primera viñeta.
  function unidades(items) {
    var u = [];
    items.forEach(function (it) {
      var ult = u[u.length - 1];
      if (it.tipo === 'nota' && ult) { ult.push(it); return; }
      if (it.tipo === 'li' && ult && ult.length === 1 && ult[0].tipo === 'p' && /:\s*$/.test(ult[0].t)) { ult.push(it); return; }
      u.push([it]);
    });
    return u;
  }
  function htmlDe(us) {
    var h = '', lista = false;
    us.forEach(function (un) {
      un.forEach(function (it) {
        if (it.tipo === 'li') { if (!lista) { h += '<ul class="vinetas">'; lista = true; } h += '<li>' + esc(it.t) + '</li>'; return; }
        if (lista) { h += '</ul>'; lista = false; }
        if (it.tipo === 'nota') h += '<p class="nota">' + esc(it.t).replace(/^(\d+)(\s)/, '<span class="nota-num">$1</span>$2') + '</p>';
        else h += '<p' + (it.sigue ? ' class="sigue"' : '') + '>' + esc(it.t) + '</p>';
      });
    });
    if (lista) h += '</ul>';
    return h;
  }
  // Solo si una unidad sola no cabe en una parte: se reparte por oraciones completas
  // (sus notas al pie van con la última oración, que es donde está la llamada)
  function porOraciones(un) {
    if (un[0].tipo !== 'p' || un.slice(1).some(function (x) { return x.tipo !== 'nota'; })) return null;
    var os = un[0].t.split(/(?<=[.;?!])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«“(])/);
    if (os.length < 2) return null;
    var r = os.map(function (o, i) { return [{ tipo: 'p', t: o, sigue: i > 0 }]; });
    r[r.length - 1] = r[r.length - 1].concat(un.slice(1));
    return r;
  }

  /* ---------- Colección ---------- */
  var ICONOS = [[/constituci/i, 'fa-landmark-dome'], [/legal/i, 'fa-book'], [/v[ií]ctima/i, 'fa-hand-holding-heart'], [/jurispruden/i, 'fa-building-columns']];
  function iconoDe(t) { for (var i = 0; i < ICONOS.length; i++) if (ICONOS[i][0].test(t)) return ICONOS[i][1]; return 'fa-book'; }
  var COLORES = ['var(--c-azul)', 'var(--c-granate)', 'var(--terracota-oscura)', 'color-mix(in srgb,var(--c-azul) 78%,var(--c-azulgris))'];
  var ITEMS = {}, ORDEN = [];
  ITEMS.entrada = { clave: 'entrada', titulo: B.titulo, estante: null, parrafos: B.entrada || [] };
  if ((B.entrada || []).length) ORDEN.push('entrada');
  B.estantes.forEach(function (e, i) {
    if ((e.entrada || []).length) { var k = 'e' + i; ITEMS[k] = { clave: k, titulo: e.titulo, estante: e.titulo, parrafos: e.entrada, ficha: true }; ORDEN.push(k); }
    (e.libros || []).forEach(function (l, j) { var k2 = 'l' + i + '-' + j; ITEMS[k2] = { clave: k2, titulo: l.rotulo, estante: e.titulo, parrafos: l.parrafos }; ORDEN.push(k2); });
  });

  document.getElementById('titulo-bib').textContent = B.titulo;
  document.title = B.titulo + ' · Biblioteca de normas';
  var bp = document.querySelector('.boton-presentacion');
  if (ITEMS.entrada.parrafos.length) bp.hidden = false;
  var ubic = document.querySelector('.esc-pie .ubicacion');
  if (B.unidad) ubic.textContent = 'Unidad ' + B.unidad + (B.leccion ? ' · Lección ' + B.leccion : '');

  var pest = '<div class="pestanas" role="group" aria-label="Estantes">';
  var est = '<div class="estanteria" style="grid-template-columns:' + B.estantes.map(function (e) {
    var n = (e.libros || []).length + ((e.entrada || []).length ? 1 : 0);
    return (0.85 + 0.09 * n).toFixed(2) + 'fr';
  }).join(' ') + '">';
  B.estantes.forEach(function (e, i) {
    var libros = e.libros || [];
    pest += '<button type="button" class="pestana" data-estante="' + i + '" aria-pressed="false"><span class="num">' + (i + 1) + '</span>' +
      '<span class="pt">' + esc(e.titulo) + '</span><i class="fas fa-circle-check" aria-hidden="true"></i></button>';
    est += '<section class="bahia" data-estante="' + i + '" aria-labelledby="est-' + i + '">' +
      '<div class="placa"><span class="num" aria-hidden="true">' + (i + 1) + '</span><h2 id="est-' + i + '">' + esc(e.titulo) + '</h2><span class="cuenta"></span></div>' +
      '<div class="libros">';
    if ((e.entrada || []).length) {
      est += '<button type="button" class="ficha' + (libros.length ? '' : ' de-frente') + '" data-abre="e' + i + '">' +
        '<span class="ficha-ico" aria-hidden="true"><i class="fas ' + (libros.length ? 'fa-scroll' : iconoDe(e.titulo)) + '"></i></span>' +
        '<span class="ficha-tx"><b>Texto del estante</b><span class="clic">Clic para leer</span></span>' +
        '<span class="estado-lectura">Por leer</span><i class="fas fa-circle-check marca-visto" aria-hidden="true"></i></button>';
    }
    libros.forEach(function (l, j) {
      // cada volumen con su tono y su ancho: lomos distintos, como en un estante real
      var tono = j % 3 === 1 ? 'color-mix(in srgb,' + COLORES[i % 4] + ' 84%,var(--c-azul))' : j % 3 === 2 ? 'color-mix(in srgb,' + COLORES[i % 4] + ' 90%,var(--c-granate))' : COLORES[i % 4];
      var ancho = [100, 94, 97, 91, 98, 93][j % 6];
      var lado = ['center', 'flex-start', 'flex-end'][j % 3];
      est += '<button type="button" class="libro" data-abre="l' + i + '-' + j + '" style="--lomo:' + tono + ';--ancho:' + ancho + '%;--lado:' + lado + '">' +
        '<span class="rotulo">' + esc(l.rotulo) + '</span><span class="lado-der"><span class="estado-lectura">Por leer</span>' +
        '<i class="fas fa-circle-check marca-visto" aria-hidden="true"></i></span></button>';
    });
    est += '</div></section>';
  });
  est += '</div>';
  pest += '</div>';
  raiz.innerHTML = pest + est;

  /* Pestañas (celular): un estante a la vez */
  var activo = Kit.leer(CLAVE_EST + ':estante', 0) || 0;
  function elegir(i) {
    activo = i; Kit.guardar(CLAVE_EST + ':estante', i);
    raiz.querySelectorAll('.bahia').forEach(function (b) { b.classList.toggle('activa', +b.getAttribute('data-estante') === i); });
    raiz.querySelectorAll('.pestana').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-estante') === i ? 'true' : 'false'); });
    ajustar();
  }
  raiz.querySelectorAll('.pestana').forEach(function (b) { b.addEventListener('click', function () { elegir(+b.getAttribute('data-estante')); }); });

  /* ---------- Pintar estados y avance ---------- */
  function pintar() {
    var sug = null;
    for (var i = 0; i < ORDEN.length; i++) if (!leido(ORDEN[i])) { sug = ORDEN[i]; break; }
    document.querySelectorAll('[data-abre]').forEach(function (el) {
      var k = el.getAttribute('data-abre');
      if (!ITEMS[k]) return;
      el.setAttribute('data-estado', estadoDe(k));
      el.classList.toggle('sugerido', k === sug);
      var t = el.querySelector('.estado-lectura'); if (t) t.textContent = textoEstado(k);
      var nom = el.classList.contains('libro') ? 'Leer la norma completa: ' + ITEMS[k].titulo
        : el.classList.contains('ficha') ? 'Leer el texto del estante ' + ITEMS[k].estante : 'Leer la presentación';
      el.setAttribute('aria-label', nom + ' (' + textoEstado(k) + ')');
    });
    B.estantes.forEach(function (e, i) {
      var ks = ORDEN.filter(function (k) { return k === 'e' + i || k.indexOf('l' + i + '-') === 0; });
      var n = ks.filter(leido).length;
      var bahia = raiz.querySelector('.bahia[data-estante="' + i + '"]');
      var completa = ks.length > 0 && n === ks.length;
      bahia.classList.toggle('completa', completa);
      bahia.querySelector('.cuenta').textContent = n + ' / ' + ks.length;
      raiz.querySelector('.pestana[data-estante="' + i + '"]').classList.toggle('completa', completa);
    });
    var a = document.querySelector('.esc-cab .avance');
    var n = ORDEN.filter(leido).length;
    a.hidden = ORDEN.length < 3;
    a.querySelector('.barra span').style.width = Math.round(100 * n / Math.max(1, ORDEN.length)) + '%';
    a.querySelector('.texto').textContent = 'Exploración ' + n + ' / ' + ORDEN.length;
    a.classList.toggle('completo', n === ORDEN.length);
    ajustar(); // la marca «Leído» puede cambiar el alto de los lomos
  }
  var avisoT = null;
  function aviso(texto, ms) {
    var a = document.querySelector('.aviso-esc');
    if (!a) { a = document.createElement('div'); a.className = 'aviso-esc'; a.setAttribute('role', 'status'); a.hidden = true; document.body.appendChild(a); }
    a.textContent = texto; a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(function () { a.hidden = true; }, ms || 3600);
  }
  function marcar(k) {
    var nuevo = !estado.leidos[k];
    estado.leidos[k] = true; delete estado.parcial[k]; guardar(); pintar();
    if (nuevo && ORDEN.every(leido)) aviso('¡Biblioteca completa! Ha leído los ' + ORDEN.length + ' textos de la colección.', 4800);
  }

  /* ---------- Libro abierto ---------- */
  function abrir(k) {
    var it = ITEMS[k];
    var cont = document.createElement('div');
    cont.className = 'libro-abierto';
    cont.innerHTML = (it.estante && !it.ficha ?'<p class="estante-de"><i class="fas ' + iconoDe(it.estante) + '" aria-hidden="true"></i><span>Estante: ' + esc(it.estante) + '</span></p>' : '') +
      '<div class="hojas" aria-live="polite"></div>' +
      '<div class="lector-nav" hidden><span class="parte"></span><span class="puntos" aria-hidden="true"></span>' +
      '<button type="button" class="boton anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button>' +
      '<button type="button" class="boton primario siguiente">Seguir leyendo <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div>';
    var paginas = [], actual = 0;
    var cuerpo = Kit.ventana(it.titulo, cont, {
      alCerrar: function () {
        if (!leido(k) && paginas.length > 1) {
          estado.parcial[k] = true; guardar(); pintar();
          aviso('Aún no ha leído el 100 % de «' + it.titulo + '»: falta(n) ' + (paginas.length - 1 - actual) + ' parte(s).');
        }
      }
    });
    var ventana = cuerpo.closest('.ventana');
    ventana.classList.add('ventana-libro');
    var hojas = cont.querySelector('.hojas'), nav = cont.querySelector('.lector-nav');
    var bAnt = nav.querySelector('.anterior'), bSig = nav.querySelector('.siguiente');
    var us = unidades(limpiar(it.parrafos));

    var maxV = parseFloat(getComputedStyle(ventana).maxHeight) || (innerHeight - 36);
    function disponible(conNav) {
      var cs = getComputedStyle(cuerpo);
      var cab = ventana.querySelector('.ventana-cab').offsetHeight;
      var ed = cont.querySelector('.estante-de'); var edH = ed ? ed.offsetHeight + 6 : 0;
      var navH = 0;
      if (conNav) { nav.hidden = false; nav.querySelector('.parte').textContent = 'Parte 1 de 2'; navH = nav.offsetHeight + 8; nav.hidden = true; }
      return maxV - cab - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - edH - navH - 4;
    }
    function poner(modo, f) {
      ventana.style.maxWidth = modo.w + 'px';
      hojas.classList.toggle('dos', modo.cols === 2);
      hojas.style.fontSize = f + 'px';
    }
    // offsetHeight: la ventana entra con una animación de escala y getBoundingClientRect mediría la caja escalada
    function alto() { return hojas.offsetHeight; }
    var anchoV = innerWidth;
    var modos = anchoV >= 760
      ? [{ cols: 1, w: 720, f: [20, 19, 18, 17, 16] }, { cols: 2, w: 1100, f: [17, 16.5, 16, 15.5, 15, 14.5, 14] }]
      : [{ cols: 1, w: 2000, f: [18, 17, 16.5, 16, 15.5, 15, 14.5, 14] }];
    hojas.style.minHeight = '';
    var dispUno = disponible(false), hecho = false;
    for (var mi = 0; mi < modos.length && !hecho; mi++) {
      for (var fi = 0; fi < modos[mi].f.length; fi++) {
        poner(modos[mi], modos[mi].f[fi]);
        hojas.innerHTML = htmlDe(us);
        if (alto() <= dispUno) { paginas = [us]; hecho = true; break; }
      }
    }
    if (!hecho) {
      // por partes: párrafos completos (y, si uno solo no cabe, sus oraciones completas)
      var ult = modos[modos.length - 1];
      poner(ult, anchoV >= 760 ? 15 : 15);
      var disp = disponible(true);
      var lista = [];
      us.forEach(function (un) {
        hojas.innerHTML = htmlDe([un]);
        var os = alto() > disp ? porOraciones(un) : null;
        lista = lista.concat(os || [un]);
      });
      var hoja = [];
      lista.forEach(function (un) {
        hojas.innerHTML = htmlDe(hoja.concat([un]));
        if (alto() > disp && hoja.length) { paginas.push(hoja); hoja = []; }
        hoja.push(un);
      });
      if (hoja.length) paginas.push(hoja);
      // reparto parejo: con el mismo número de partes, los cortes que dejan las partes más parecidas en alto
      // (sin huecos al final de la última parte)
      if (paginas.length > 1 && lista.length <= 14) {
        var n = paginas.length, mejor = null, mejorMax = Infinity, memo = {};
        var altoDe = function (a, b) { var c = a + ':' + b; if (!(c in memo)) { hojas.innerHTML = htmlDe(lista.slice(a, b)); memo[c] = alto(); } return memo[c]; };
        (function probar(desde, quedan, cortes, maxH) {
          if (maxH >= mejorMax) return;
          if (quedan === 1) {
            var hU = altoDe(desde, lista.length);
            if (hU <= disp && Math.max(maxH, hU) < mejorMax) { mejorMax = Math.max(maxH, hU); mejor = cortes.concat([lista.length]); }
            return;
          }
          for (var c = desde + 1; c <= lista.length - quedan + 1; c++) {
            var hC = altoDe(desde, c);
            if (hC > disp) break;
            probar(c, quedan - 1, cortes.concat([c]), Math.max(maxH, hC));
          }
        })(0, n, [], 0);
        if (mejor) { var ini = 0; paginas = mejor.map(function (fin) { var pg = lista.slice(ini, fin); ini = fin; return pg; }); }
      }
      var max = 0;
      paginas.forEach(function (p) { hojas.innerHTML = htmlDe(p); max = Math.max(max, alto()); });
      hojas.style.minHeight = Math.ceil(max) + 'px';
    }
    function mostrar(i) {
      actual = i;
      hojas.innerHTML = htmlDe(paginas[i]);
      var varias = paginas.length > 1;
      nav.hidden = !varias;
      nav.querySelector('.parte').textContent = varias ? 'Parte ' + (i + 1) + ' de ' + paginas.length : '';
      var pts = nav.querySelector('.puntos'); pts.innerHTML = '';
      for (var j = 0; j < paginas.length && varias; j++) { var s = document.createElement('span'); if (j <= i) s.className = 'hecho'; pts.appendChild(s); }
      bAnt.hidden = i === 0;
      bSig.hidden = i >= paginas.length - 1;
      bSig.classList.toggle('globo-siga', i < paginas.length - 1);
      if (i >= paginas.length - 1) marcar(k);
    }
    bAnt.addEventListener('click', function () { mostrar(Math.max(0, actual - 1)); if (bAnt.hidden) bSig.focus(); });
    bSig.addEventListener('click', function () { mostrar(Math.min(paginas.length - 1, actual + 1)); if (bSig.hidden) bAnt.focus(); });
    mostrar(0);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-abre]');
    if (el && ITEMS[el.getAttribute('data-abre')]) abrir(el.getAttribute('data-abre'));
  });

  /* ---------- Encaje de la estantería: la letra de los lomos baja hasta que cada estante cabe ---------- */
  function ajustar() {
    var f = 12.5;
    document.documentElement.style.setProperty('--f-lomo', f + 'px');
    function desborda() {
      // los libros se apilan desde el piso (flex-end): lo que no cabe sale por arriba y no cuenta en scrollHeight
      return Array.prototype.some.call(raiz.querySelectorAll('.bahia'), function (b) {
        if (!b.offsetParent) return false;
        var l = b.querySelector('.libros'), h = l.firstElementChild;
        return l.scrollHeight > l.clientHeight + 1 || b.scrollHeight > b.clientHeight + 1 ||
          (h && h.getBoundingClientRect().top < l.getBoundingClientRect().top - 0.5);
      });
    }
    while (desborda() && f > 10) { f -= 0.5; document.documentElement.style.setProperty('--f-lomo', f + 'px'); }
  }
  var rT = null;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(ajustar, 120); });

  elegir(Math.min(activo, B.estantes.length - 1));
  pintar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
  Kit.pantallaCompleta();

  window.Bib = { claves: ORDEN.slice(), leido: leido, items: ITEMS, limpiar: limpiar, datos: B };
})();
