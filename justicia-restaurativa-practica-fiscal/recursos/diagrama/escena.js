/* Escenario común de los recursos interactivos (rama de interactivos, 06/11/2026). Copia idéntica en cada carpeta.
   Necesita ../comun/kit.js. window.Esc = { registrar, marcar, leido, lector, encajar, estado, aviso, pintarEstados }
   - Estado de lectura guardado en el navegador con Kit.guardar («ijda:recurso:<id>»).
   - Lector por partes en la ventana del kit: el texto nunca se desplaza; si no cabe, se reparte en partes con
     «Seguir leyendo» y «¡Siga aquí!». El elemento queda «Leído» al llegar a la última parte.
   - Textos de la interfaz en «usted» o genéricos. */
(function () {
  'use strict';
  var E = {};
  var cuerpo = document.body;
  E.id = cuerpo.getAttribute('data-recurso') || 'recurso';
  E.estado = Kit.leer('recurso:' + E.id, null) || { leidos: {}, parcial: {} };
  if (!E.estado.leidos) E.estado.leidos = {};
  if (!E.estado.parcial) E.estado.parcial = {};
  E.claves = [];
  function guardar() { Kit.guardar('recurso:' + E.id, E.estado); }
  E.leido = function (k) { return !!E.estado.leidos[k]; };
  E.registrar = function (claves) { E.claves = claves.slice(); E.pintarAvance(); E.pintarEstados(); };
  E.marcar = function (k) {
    var nuevo = !E.estado.leidos[k];
    E.estado.leidos[k] = true; delete E.estado.parcial[k]; guardar();
    E.pintarAvance(); E.pintarEstados();
    document.dispatchEvent(new CustomEvent('esc:leido', { detail: { clave: k, nuevo: nuevo } }));
    if (nuevo && E.claves.length && E.claves.every(E.leido)) {
      document.dispatchEvent(new CustomEvent('esc:completo'));
    }
  };
  E.estadoDe = function (k) { return E.leido(k) ? 'leido' : (E.estado.parcial[k] ? 'parcial' : 'pendiente'); };
  E.textoEstado = function (k) {
    var s = E.estadoDe(k);
    return s === 'leido' ? 'Leído' : s === 'parcial' ? 'Falta leer' : 'Por leer';
  };
  E.pintarEstados = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-abre]'), function (el) {
      var k = el.getAttribute('data-abre');
      if (E.claves.indexOf(k) < 0) return;
      var s = E.estadoDe(k);
      el.setAttribute('data-estado', s);
      el.classList.toggle('late', s !== 'leido' && el.hasAttribute('data-latir'));
      var t = el.querySelector('.estado-lectura');
      if (t) t.textContent = E.textoEstado(k);
    });
  };
  E.pintarAvance = function () {
    var a = document.querySelector('.esc-cab .avance');
    if (!a) return;
    var total = E.claves.length, n = E.claves.filter(E.leido).length;
    a.hidden = total < 3;
    var span = a.querySelector('.barra span'), txt = a.querySelector('.texto');
    if (span) span.style.width = Math.round(100 * n / Math.max(1, total)) + '%';
    if (txt) txt.textContent = 'Exploración ' + n + ' / ' + total;
    a.classList.toggle('completo', total > 0 && n === total);
  };

  var avisoT = null;
  E.aviso = function (texto, ms) {
    var a = document.querySelector('.aviso-esc');
    if (!a) { a = document.createElement('div'); a.className = 'aviso-esc'; a.setAttribute('role', 'status'); a.hidden = true; document.body.appendChild(a); }
    a.textContent = texto; a.hidden = false;
    clearTimeout(avisoT); avisoT = setTimeout(function () { a.hidden = true; }, ms || 3200);
  };

  /* Parte un bloque largo en oraciones (sin cortar ninguna) para que quepa en una parte del lector */
  function oraciones(html) {
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    if (tmp.children.length > 1 || /<(ul|ol|table|div)/i.test(html)) return [html];
    var tag = (tmp.firstElementChild && tmp.firstElementChild.tagName.toLowerCase()) || 'p';
    var cls = tmp.firstElementChild ? tmp.firstElementChild.className : '';
    var txt = tmp.firstElementChild ? tmp.firstElementChild.innerHTML : html;
    var partes = txt.split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ¿«“(])/);
    if (partes.length < 2) return [html];
    return partes.map(function (p, i) { return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + p + '</' + tag + '>'; });
  }

  /* Lector: bloques HTML (párrafos, listas) repartidos en partes que caben en la ventana */
  E.lector = function (o) {
    var clave = o.clave;
    var cont = document.createElement('div');
    cont.className = 'lector';
    cont.innerHTML = '<div class="lector-pagina" aria-live="polite"></div>' +
      '<div class="lector-nav"><span class="parte"></span><span class="puntos" aria-hidden="true"></span>' +
      '<button type="button" class="boton anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button>' +
      '<button type="button" class="boton primario siguiente">Seguir leyendo <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div>';
    var cuerpoV = Kit.ventana(o.titulo, cont, {
      alCerrar: function () {
        if (clave && !E.leido(clave) && paginas.length > 1) {
          E.estado.parcial[clave] = true; guardar(); E.pintarEstados();
          E.aviso('Aún no ha leído el 100 % de «' + o.titulo + '»: faltan ' + (paginas.length - 1 - actual) + ' parte(s).');
        }
        if (o.alCerrar) o.alCerrar();
      }
    });
    var pag = cont.querySelector('.lector-pagina'), nav = cont.querySelector('.lector-nav');
    var bAnt = nav.querySelector('.anterior'), bSig = nav.querySelector('.siguiente');
    var ventana = cuerpoV.closest('.ventana');
    var cab = ventana.querySelector('.ventana-cab');
    var cs = getComputedStyle(cuerpoV);
    var maxV = parseFloat(getComputedStyle(ventana).maxHeight) || (window.innerHeight - 36);
    
    nav.hidden = false; bAnt.hidden = false; bSig.hidden = false;
    nav.querySelector('.parte').textContent = 'Parte 1 de 2';
    var navH = nav.offsetHeight + 14;
    var alto = maxV - cab.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - navH - 4;
    alto = Math.max(110, alto);
    pag.setAttribute('data-alto', Math.round(alto));
    // reparto en partes midiendo
    var bloques = [];
    (o.bloques || []).forEach(function (b) { if (b && b.replace(/<[^>]+>/g, '').length > 380) bloques = bloques.concat(oraciones(b)); else if (b) bloques.push(b); });
    var paginas = [], actual = 0;
    pag.style.visibility = 'hidden';
    nav.hidden = true;
    var tam = 16;
    // Un bloque que no cabe solo se parte: primero en sus elementos hijos, después en oraciones
    function partirGrandes() {
      var cambio = true, vueltas = 0;
      while (cambio && vueltas++ < 6) {
        cambio = false;
        var nuevos = [];
        bloques.forEach(function (b) {
          pag.innerHTML = b;
          if (pag.scrollHeight <= alto + 1) { nuevos.push(b); return; }
          var tmp = document.createElement('div'); tmp.innerHTML = b;
          var el = tmp.firstElementChild;
          if (tmp.children.length === 1 && el && el.children.length > 1 && /^(DIV|SECTION)$/.test(el.tagName)) {
            var hijos = Array.prototype.slice.call(el.children), grupo = '';
            hijos.forEach(function (h, i) {
              grupo += h.outerHTML;
              // un rótulo no queda solo: va con el elemento que le sigue
              if (h.classList.contains('rotulo') && i < hijos.length - 1) return;
              nuevos.push('<div class="' + el.className + '">' + grupo + '</div>'); grupo = '';
            });
            cambio = true; return;
          }
          var os = oraciones(b);
          if (os.length > 1) { nuevos = nuevos.concat(os); cambio = true; return; }
          nuevos.push(b);
        });
        bloques = nuevos;
      }
    }
    function repartir() {
      paginas = []; var hoja = [];
      pag.innerHTML = '';
      for (var i = 0; i < bloques.length; i++) {
        pag.insertAdjacentHTML('beforeend', bloques[i]);
        if (pag.scrollHeight > alto + 1 && hoja.length) {
          paginas.push(hoja); hoja = [];
          pag.innerHTML = bloques[i];
        }
        hoja.push(bloques[i]);
      }
      if (hoja.length) paginas.push(hoja);
      // un solo bloque que no cabe: baja la letra hasta 13 px
      return paginas.every(function (p) { pag.innerHTML = p.join(''); return pag.scrollHeight <= alto + 1; });
    }
    pag.style.fontSize = tam + 'px';
    partirGrandes();
    while (!repartir() && tam > 13) { tam -= 1; pag.style.fontSize = tam + 'px'; }
    // con una sola parte breve, la letra crece un poco (relleno de la caja)
    if (paginas.length === 1) {
      while (tam < 19) { pag.style.fontSize = (tam + 1) + 'px'; pag.innerHTML = paginas[0].join(''); if (pag.scrollHeight > alto + 1) { pag.style.fontSize = tam + 'px'; break; } tam += 1; }
    }
    // con varias partes, la caja conserva su alto: la ventana no salta de una parte a otra
    if (paginas.length > 1) pag.style.minHeight = alto + 'px';
    function mostrar(i) {
      actual = i;
      pag.innerHTML = paginas[i].join('');
      var varias = paginas.length > 1;
      nav.hidden = !varias;
      nav.querySelector('.parte').textContent = varias ? 'Parte ' + (i + 1) + ' de ' + paginas.length : '';
      var pts = nav.querySelector('.puntos'); pts.innerHTML = '';
      for (var j = 0; j < paginas.length && varias; j++) { var s = document.createElement('span'); if (j <= i) s.className = 'hecho'; pts.appendChild(s); }
      bAnt.hidden = i === 0;
      bSig.hidden = i >= paginas.length - 1;
      bSig.classList.toggle('globo-siga', i < paginas.length - 1);
      if (i >= paginas.length - 1 && clave) E.marcar(clave);
    }
    bAnt.addEventListener('click', function () { mostrar(Math.max(0, actual - 1)); });
    bSig.addEventListener('click', function () { mostrar(Math.min(paginas.length - 1, actual + 1)); bSig.hidden ? bAnt.focus() : bSig.focus(); });
    pag.style.visibility = '';
    mostrar(0);
    return cont;
  };

  /* Encajar: baja la letra hasta que el texto cabe; si no cabe ni así, acorta por palabras completas con «…»
     (el texto completo queda en title y en su ventana). */
  E.encajar = function (el, o) {
    o = o || {};
    var min = o.min || 10.5, paso = 0.5;
    var completo = el.getAttribute('data-completo') || el.textContent;
    el.setAttribute('data-completo', completo);
    el.textContent = completo;
    var tam = parseFloat(getComputedStyle(el).fontSize);
    function cabe() { return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1; }
    while (!cabe() && tam > min) { tam -= paso; el.style.fontSize = tam + 'px'; }
    if (!cabe() && o.palabras !== false) {
      var pal = completo.split(/\s+/);
      while (pal.length > 1 && !cabe()) { pal.pop(); el.textContent = pal.join(' ').replace(/[,;:.]$/, '') + '…'; }
      el.title = completo;
    }
    return cabe();
  };

  window.Esc = E;
  document.addEventListener('DOMContentLoaded', function () { Kit.pantallaCompleta(); });
})();
