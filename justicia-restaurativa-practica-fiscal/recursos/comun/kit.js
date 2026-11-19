/* Kit común de los recursos HTML del curso de Justicia restaurativa (reunión con Juan del 06/11/2026).
   window.Kit = { guardar, leer, pantallaCompleta, acordeones, ventana, avance, may, clave }
   - Guardado en el navegador (localStorage) con clave propia del curso («jr»), para no mezclar cursos en el mismo
     origen. Si el navegador no deja guardar (ventana privada, iframe con datos bloqueados), funciona igual sin guardar.
   - Pantalla completa con la Fullscreen API; si el iframe no la permite, abre el recurso en otra pestaña.
   - Ventanas con cierre visible y con Escape, foco atrapado y devuelto al botón que la abrió (patrón de diálogo W3C).
   - Textos de la interfaz en «usted» o genéricos (sin tuteo). */
(function () {
  'use strict';
  var CLAVE = 'jr';
  function clave(k) { return CLAVE + ':' + k; }
  function guardar(k, v) { try { localStorage.setItem(clave(k), JSON.stringify(v)); return true; } catch (e) { return false; } }
  function leer(k, def) { try { var v = localStorage.getItem(clave(k)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function may(t) {
    if (!t) return t;
    if (/^\s*…/.test(t)) return t;
    return t.replace(/^(\s*(?:\(?[a-z0-9ivx]{1,4}[.)]\s+)?)(\p{Ll})/u, function (m, a, b) { return a + b.toUpperCase(); });
  }

  /* Pantalla completa: botón en franja propia abajo a la izquierda */
  function pantallaCompleta(opc) {
    opc = opc || {};
    // Dentro de otra página que ya tiene su botón (plantilla de video y actividad): ?embebido=1 no repite el botón
    if (/[?&]embebido=1\b/.test(location.search)) { document.body.classList.add('embebido'); return null; }
    var raiz = document.documentElement;
    var franja = document.createElement('div');
    franja.className = 'franja-pc';
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'boton-pc';
    /* Dentro de una lección del aula (SCORM de herramientas/genially_scorm.py, que publica window.ovaLeccion), el botón pone en
       pantalla completa la lección entera y se sigue navegando sin salir (revisión de la Fiscalía, 13/11/2026). */
    var leccion = function () {
      try { var w = window.parent; return w && w !== window && w.ovaLeccion && w.ovaLeccion.pantallaCompleta ? w.ovaLeccion : null; } catch (e) { return null; }
    };
    var pintar = function () {
      var propio = !!document.fullscreenElement, L = leccion(), en = propio || !!(L && L.enPantallaCompleta && L.enPantallaCompleta());
      document.body.classList.toggle('en-pc', propio);
      b.innerHTML = en ? '<i class="fas fa-compress" aria-hidden="true"></i> Salir' : '<i class="fas fa-expand" aria-hidden="true"></i> Pantalla completa';
      b.setAttribute('aria-pressed', en ? 'true' : 'false');
    };
    window.addEventListener('message', function (e) { if (e.data && e.data.ova === 'pantalla') pintar(); });
    b.addEventListener('click', function () {
      var L = leccion();
      if (L && !document.fullscreenElement && L.pantallaCompleta() !== false) return;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var ok = raiz.requestFullscreen && document.fullscreenEnabled;
      if (ok) {
        raiz.requestFullscreen().catch(function () { window.open(location.href, '_blank', 'noopener'); });
      } else {
        window.open(location.href, '_blank', 'noopener');
      }
    });
    document.addEventListener('fullscreenchange', pintar);
    pintar();
    /* Dentro del SCORM del aula la lección tiene su botón «Pantalla completa» en el centro del pie, en todas las páginas (JP,
       14/11/2026: «navegar en pantalla completa siempre»): este no se repite; queda su franja para no mover el recurso. */
    if (leccion()) { b.style.visibility = 'hidden'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
    franja.appendChild(b);
    (opc.en || document.body).appendChild(franja);
    return b;
  }

  /* Acordeones <details class="acordeon"> con «Abrir/Cerrar todos» y estado de lectura guardado */
  function acordeones(raiz, idPagina) {
    raiz = raiz || document;
    var lista = Array.prototype.slice.call(raiz.querySelectorAll('details.acordeon'));
    var vistos = leer('vistos:' + idPagina, {});
    function estado(d) {
      var s = d.querySelector('.estado');
      var visto = !!vistos[d.id];
      d.classList.toggle('visto', visto);
      if (s) s.textContent = visto ? 'Leído' : 'Por leer';
    }
    lista.forEach(function (d) {
      estado(d);
      d.addEventListener('toggle', function () {
        if (d.open) { vistos[d.id] = true; guardar('vistos:' + idPagina, vistos); estado(d); avance(raiz, lista); }
      });
    });
    var abrir = raiz.querySelector('[data-abrir-todos]');
    var cerrar = raiz.querySelector('[data-cerrar-todos]');
    if (abrir) abrir.addEventListener('click', function () { lista.forEach(function (d) { d.open = true; }); });
    if (cerrar) cerrar.addEventListener('click', function () { lista.forEach(function (d) { d.open = false; }); });
    avance(raiz, lista);
    return lista;
  }

  function avance(raiz, lista) {
    var a = (raiz || document).querySelector('.avance');
    if (!a || !lista) return;
    var n = lista.filter(function (d) { return d.classList.contains('visto'); }).length;
    var span = a.querySelector('.barra span');
    var txt = a.querySelector('.texto');
    if (span) span.style.width = Math.round(100 * n / Math.max(1, lista.length)) + '%';
    if (txt) txt.textContent = 'Exploración ' + n + ' / ' + lista.length;
  }

  /* Ventana accesible */
  var ultimoFoco = null;
  function ventana(titulo, html, opc) {
    opc = opc || {};
    var fondo = document.querySelector('.ventana-fondo');
    if (!fondo) {
      fondo = document.createElement('div');
      fondo.className = 'ventana-fondo'; fondo.hidden = true;
      fondo.innerHTML = '<div class="ventana" role="dialog" aria-modal="true" aria-labelledby="ventana-titulo">' +
        '<div class="ventana-cab"><h2 id="ventana-titulo"></h2><button type="button" class="cerrar" aria-label="Cerrar"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>' +
        '<div class="ventana-cuerpo"></div></div>';
      document.body.appendChild(fondo);
      fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrarVentana(); });
      fondo.querySelector('.cerrar').addEventListener('click', cerrarVentana);
      document.addEventListener('keydown', function (e) {
        if (fondo.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrarVentana(); }
        if (e.key === 'Tab') {
          var f = fondo.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
          if (!f.length) return;
          var p = f[0], u = f[f.length - 1];
          if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
          else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
        }
      });
    }
    ultimoFoco = document.activeElement;
    fondo.querySelector('#ventana-titulo').textContent = titulo;
    var cuerpo = fondo.querySelector('.ventana-cuerpo');
    cuerpo.innerHTML = '';
    if (typeof html === 'string') cuerpo.innerHTML = html; else cuerpo.appendChild(html);
    fondo.hidden = false;
    fondo._alCerrar = opc.alCerrar || null;
    var v = fondo.querySelector('.ventana');
    if (v.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.animate([{ transform: 'scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
    }
    fondo.querySelector('.cerrar').focus();
    return cuerpo;
  }
  function cerrarVentana() {
    var fondo = document.querySelector('.ventana-fondo');
    if (!fondo || fondo.hidden) return;
    fondo.hidden = true;
    if (fondo._alCerrar) fondo._alCerrar();
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  /* Contraste de los iconos (revisores externos, 10/11/2026: «se pierden los iconos… pasa en todas las lecciones»;
     docs/directrices-cursos.md, sección 15): el mismo ajuste del motor común. Un icono que quede por debajo de 3:1 con el fondo
     que tiene detrás toma el carbón del curso o el blanco, el que contraste más. Se repite cuando algo cambia. */
  function contrasteIconos() {
    function rgb(s) {
      s = String(s).trim();
      if (s[0] === '#') { var h = s.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); return { c: [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }), a: 1 }; }
      var q = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);   // color-mix()
      if (q) return { c: [q[1], q[2], q[3]].map(function (x) { return Number(x) * 255; }), a: q[4] === undefined ? 1 : Number(q[4]) };
      var m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
      var v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { c: v.slice(0, 3), a: v.length > 3 ? v[3] : 1 };
    }
    function lum(c) { var p = [0.2126, 0.7152, 0.0722]; return c.reduce(function (s, x, i) { x /= 255; return s + p[i] * (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); }, 0); }
    function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function mezcla(a, b, k) { return a.map(function (v, i) { return v * k + b[i] * (1 - k); }); }
    var raizCss = getComputedStyle(document.documentElement);
    var oscuro = (rgb(raizCss.getPropertyValue('--carbon')) || rgb(raizCss.getPropertyValue('--negro')) || { c: [52, 52, 52] }).c;
    function fondo(e) {
      var capas = [];
      for (var x = e; x && x.nodeType === 1; x = x.parentElement) {
        var cs = getComputedStyle(x);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
        var b = rgb(cs.backgroundColor);
        if (b && b.a > 0) { capas.push(b); if (b.a >= 0.99) break; }
      }
      var c = [255, 255, 255];
      for (var i = capas.length - 1; i >= 0; i--) c = mezcla(capas[i].c, c, capas[i].a);
      return c;
    }
    function pasar() {
      document.querySelectorAll('i[class*="fa-"]').forEach(function (e) {
        if (e.dataset.contraste) { e.style.color = ''; delete e.dataset.contraste; }
        if (!e.getClientRects().length) return;
        var col = rgb(getComputedStyle(e).color), bg = fondo(e.parentElement);
        if (!col || !bg) return;
        var c = col.a < 1 ? mezcla(col.c, bg, col.a) : col.c;
        if (con(c, bg) >= 3) return;
        var mejor = con(oscuro, bg) >= con([255, 255, 255], bg) ? oscuro : [255, 255, 255];
        e.style.color = 'rgb(' + mejor.map(Math.round).join(',') + ')';
        e.dataset.contraste = '1';
      });
    }
    var pendiente = null;
    function pronto() { clearTimeout(pendiente); pendiente = setTimeout(function () { requestAnimationFrame(pasar); }, 120); }
    pasar();
    if (window.MutationObserver) new MutationObserver(pronto).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pronto);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', contrasteIconos); else setTimeout(contrasteIconos, 0);

  window.Kit = { guardar: guardar, leer: leer, pantallaCompleta: pantallaCompleta, acordeones: acordeones,
    ventana: ventana, cerrarVentana: cerrarVentana, avance: avance, may: may, clave: clave };
})();
