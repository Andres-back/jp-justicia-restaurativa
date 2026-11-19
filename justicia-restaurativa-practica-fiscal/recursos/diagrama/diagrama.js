/* Diagramas interactivos de las figuras de la ficha (Justicia restaurativa, 18/11/2026). Un recurso dirigido por datos:
   index.html?f=<id> lee la figura de window.FIGURAS_TEXTO (datos.js, copia de plan/figuras-texto.json) y la dibuja
   según su tipo:
     ruta       pasos en orden (cada paso abre el siguiente), con ramas o con su texto en el panel;
     triangulo  ejes en círculos que se cruzan y una frase en cada lado del triángulo;
     matriz     tabla: por fila (lista + panel con las columnas) o por casilla (lector por partes);
     tarjetas   puntos independientes (lista + panel);
     capas      círculos concéntricos, cada capa con sus integrantes;
     niveles    jerarquía: recuadro superior, grupos y un bloque final que se abre al leer los grupos.
   Texto literal de la figura; «mostrar» lleva la mayúscula inicial en lugar de la mayúscula sostenida. Lo que escribe el
   recurso va en usted o genérico. Estado de lectura con Esc (escena.js), clave «jr:recurso:diagrama-<id>». */
(function () {
  'use strict';
  var DATOS = window.FIGURAS_TEXTO || { figuras: [] };
  var m = location.search.match(/[?&]f=([\w-]+)/);
  var ID = m ? m[1] : '';
  var fig = null;
  DATOS.figuras.forEach(function (f) { if (f.id === ID) fig = f; });
  var raiz = document.getElementById('diagrama');
  var guia = document.querySelector('.esc-guia');
  var reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades de texto ---------- */
  function T(n) { return n == null ? '' : (typeof n === 'string' ? n : (n.mostrar || n.texto || '')); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // **negrita** y *cursiva* de la figura; mayúscula inicial en el bloque (Kit.may no toca un bloque que empieza con «…»)
  function md(s) {
    var t = Kit.may(String(s));
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  }
  function plano(s) { return Kit.may(String(s)).replace(/\*\*?/g, ''); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var MARCA = '<i class="fas fa-circle-check marca-visto" aria-hidden="true"></i>';
  var ESTADO = '<span class="estado-lectura">Por leer</span>';

  /* ---------- sin figura o figura que se queda como imagen ---------- */
  if (!fig || !fig.contenido) {
    document.getElementById('titulo-fig').textContent = fig ? fig.titulo : 'Figura no encontrada';
    raiz.innerHTML = '<div class="diag-aviso"><i class="fas fa-image" aria-hidden="true"></i><p>' +
      (fig ? 'Esta figura se presenta como imagen.' : 'No hay una figura con ese nombre.') + '</p>' +
      (fig ? '<a class="boton primario" href="../figura/index.html?f=' + esc(fig.id) + '">Clic para ver la figura</a>' : '') + '</div>';
    Esc.registrar([]);
    return;
  }

  /* ---------- cabecera y pie ---------- */
  document.title = fig.titulo + ' · Justicia restaurativa en la práctica del fiscal';
  document.getElementById('titulo-fig').textContent = fig.titulo;
  document.querySelector('.etq-texto').textContent = 'Unidad ' + fig.unidad + ' · Lección ' + fig.leccion;
  var pie = document.querySelector('.esc-pie');
  pie.querySelector('.fuente-fig').textContent = fig.fuente;
  if (fig.documento_oficial) {
    var bo = el('button', 'boton-original', '<i class="fas fa-image" aria-hidden="true"></i> Clic para ver la figura original');
    bo.type = 'button';
    bo.addEventListener('click', function () {
      var html = '<div class="original">' + fig.imagenes.map(function (im) {
        return '<img src="../figura/img/' + esc(im) + '" alt="' + esc('Figura original de la ficha: ' + fig.titulo) + '">';
      }).join('') + '</div><p class="original-fuente">' + esc(fig.fuente) + '</p>';
      Kit.ventana(fig.titulo, html);
    });
    pie.appendChild(bo);
  }
  raiz.classList.add('tipo-' + fig.tipo);

  /* ---------- panel con lectura por partes (sin desplazamiento) ---------- */
  function oraciones(html) {
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var p = tmp.firstElementChild;
    if (!p || tmp.children.length > 1 || p.tagName !== 'P') return [html];
    var partes = p.innerHTML.split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ¿«“(*<])/);
    if (partes.length < 2) return [html];
    return partes.map(function (x) { return '<p class="' + p.className + '">' + x + '</p>'; });
  }
  function Panel(sec) {
    this.sec = sec;
    this.cab = sec.querySelector('.panel-cab');
    this.cuerpo = sec.querySelector('.panel-cuerpo');
    this.nav = sec.querySelector('.panel-nav');
    this.parte = this.nav.querySelector('.parte');
    this.ant = this.nav.querySelector('.anterior');
    this.sig = this.nav.querySelector('.siguiente');
    var yo = this;
    this.ant.addEventListener('click', function () { yo.ver(yo.i - 1); });
    this.sig.addEventListener('click', function () { yo.ver(yo.i + 1); if (yo.sig.hidden) yo.ant.focus(); });
  }
  function cabe(c) { return c.scrollHeight <= c.clientHeight && c.scrollWidth <= c.clientWidth + 1; }
  // bloques: HTML de una sola vista; alternos: los mismos contenidos en bloques más pequeños para repartir en partes
  Panel.prototype.mostrar = function (o) {
    var c = this.cuerpo;
    if (this.clave && this.clave !== o.clave && !Esc.leido(this.clave) && this.paginas && this.paginas.length > 1) {
      Esc.estado.parcial[this.clave] = true; Kit.guardar('recurso:' + Esc.id, Esc.estado); Esc.pintarEstados();
    }
    this.clave = o.clave; this.alFin = o.alFin || null; this._o = o;
    if (this.cab) this.cab.innerHTML = o.cab || '';
    this.cab && (this.cab.hidden = !o.cab);
    this.nav.hidden = true;
    c.style.minHeight = '';
    var max = o.max || 20, min = o.min || 14, t;
    c.classList.remove('partido');
    for (t = max; t >= min; t -= 1) {
      c.style.fontSize = t + 'px'; c.innerHTML = o.bloques.join('');
      if (cabe(c)) { this.paginas = [o.bloques]; this.ver(0); return; }
    }
    // no cabe en una vista: partes con «Seguir leyendo»
    c.classList.add('partido');
    this.nav.hidden = false; this.parte.textContent = 'Parte 1 de 2';
    var bs = [], fuente = o.alternos || o.bloques;
    t = 15; c.style.fontSize = t + 'px';
    fuente.forEach(function (b) { c.innerHTML = b; if (cabe(c)) bs.push(b); else bs = bs.concat(oraciones(b)); });
    var pags, hoja;
    function repartir() {
      pags = []; hoja = [];
      bs.forEach(function (b) {
        c.innerHTML = hoja.concat([b]).join('');
        if (!cabe(c) && hoja.length) { pags.push(hoja); hoja = [b]; } else hoja.push(b);
      });
      if (hoja.length) pags.push(hoja);
      return pags.every(function (p) { c.innerHTML = p.join(''); return cabe(c); });
    }
    while (!repartir() && t > 12) { t -= 1; c.style.fontSize = t + 'px'; }
    this.paginas = pags;
    this.ver(0);
  };
  Panel.prototype.ver = function (i) {
    var n = this.paginas.length;
    i = Math.max(0, Math.min(n - 1, i)); this.i = i;
    this.cuerpo.innerHTML = this.paginas[i].join('');
    var varias = n > 1;
    this.nav.hidden = !varias;
    if (varias) {
      this.parte.textContent = 'Parte ' + (i + 1) + ' de ' + n;
      this.ant.hidden = i === 0;
      this.sig.hidden = i >= n - 1;
      this.sig.classList.toggle('globo-siga', i < n - 1);
    }
    if (!reducido && this.cuerpo.animate) this.cuerpo.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 230 });
    if (i >= n - 1 && this.clave) {
      Esc.marcar(this.clave); if (this.alFin) this.alFin();
      // marcar como leído puede cambiar el alto de lo que rodea al panel: si ya no cabe, se vuelve a repartir
      if (!cabe(this.cuerpo) && !this._re) { this._re = true; this.mostrar(this._o); this._re = false; }
    }
  };
  function nuevoPanel(extraCab) {
    var sec = el('section', 'panel', '<div class="panel-cab"></div><div class="panel-cuerpo" aria-live="polite"></div>' +
      '<div class="panel-nav" hidden><span class="parte"></span>' +
      '<button type="button" class="boton anterior"><i class="fas fa-arrow-left" aria-hidden="true"></i> Anterior</button>' +
      '<button type="button" class="boton primario siguiente" data-seguir>Seguir leyendo <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div>');
    if (extraCab === false) sec.querySelector('.panel-cab').remove();
    return { sec: sec, p: null };
  }
  function inicioPanel(sec, html) {
    var c = sec.querySelector('.panel-cuerpo');
    c.innerHTML = '<div class="panel-inicio">' + html + '</div>';
    c.style.fontSize = '';
    var cab = sec.querySelector('.panel-cab'); if (cab) cab.hidden = true;
  }
  function boton(clave, cls, html) {
    var b = el('button', cls, html);
    b.type = 'button'; b.setAttribute('data-abre', clave);
    return b;
  }
  function encajarTodo(sel, o) {
    Array.prototype.forEach.call(raiz.querySelectorAll(sel), function (e) { e.style.fontSize = ''; Esc.encajar(e, o); });
  }
  var alRedimensionar = [];
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { alRedimensionar.forEach(function (f) { f(); }); }, 140); });
  // al quedar algo «Leído» cambian la marca y el estado de los botones: se vuelven a encajar sus rótulos (sin reabrir nada)
  var alLeer = [];
  document.addEventListener('esc:leido', function () { alLeer.forEach(function (f) { f(); }); });
  // con las fuentes del kit ya cargadas, las medidas cambian: se vuelve a encajar todo
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alRedimensionar.forEach(function (f) { f(); }); });
  document.addEventListener('esc:completo', function () { Esc.aviso('Ha explorado toda la figura.', 3600); });

  var C = fig.contenido;
  var tipos = { ruta: ruta, triangulo: triangulo, matriz: matriz, tarjetas: tarjetas, capas: capas, niveles: niveles };
  (tipos[fig.tipo] || function () {})();

  /* ======================= RUTA ======================= */
  function ruta() {
    var P = C.pasos, N = P.length;
    var soloRotulo = P.every(function (p) { return !p.parrafos && !p.lista; });
    guia.textContent = 'Recorra los pasos en orden: al leer cada uno se abre el siguiente.';
    var caja = el('div', 'ruta' + (soloRotulo ? ' ruta-flujo' : ''));
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(T(C.encabezado))));
    var cinta = el('div', 'ruta-pasos');
    cinta.style.setProperty('--n', N);
    cinta.innerHTML = '<div class="ruta-linea" aria-hidden="true"><span class="ruta-llena"></span></div>';
    var ol = el('ol', 'pasos');
    P.forEach(function (p, i) {
      var li = el('li');
      var circ = p.icono ? '<i class="fas ' + esc(p.icono) + '" aria-hidden="true"></i><span class="paso-num">' + (i + 1) + '</span>'
        : '<span class="paso-n">' + esc(p.numero || (i + 1)) + '</span>';
      var nombre = T(p.rotulo) || p.corto || '';
      var b = boton(p.id, 'paso', '<span class="paso-circ">' + circ + '</span><span class="paso-nom"></span>' + ESTADO + MARCA);
      b.querySelector('.paso-nom').textContent = Kit.may(nombre);
      b.setAttribute('aria-label', 'Paso ' + (i + 1) + ': ' + plano(nombre));
      b.addEventListener('click', function () { mostrar(i); });
      li.appendChild(b); ol.appendChild(li);
    });
    cinta.appendChild(ol);
    caja.appendChild(cinta);
    var np = nuevoPanel();
    caja.appendChild(np.sec);
    var pieP = el('div', 'ruta-sigue', '<button type="button" class="boton primario paso-sig" hidden>Siguiente paso <i class="fas fa-arrow-right" aria-hidden="true"></i></button>');
    np.sec.appendChild(pieP);
    raiz.appendChild(caja);
    var panel = new Panel(np.sec);
    var botones = Array.prototype.slice.call(ol.querySelectorAll('.paso'));
    var bSig = pieP.querySelector('.paso-sig');
    var actual = -1;
    bSig.addEventListener('click', function () { if (actual < N - 1) { mostrar(actual + 1); botones[actual].focus(); } });
    inicioPanel(np.sec, '<i class="fas fa-route" aria-hidden="true"></i><p>Haga clic en el paso 1 para empezar el recorrido.</p>');

    // Una rama con una sola rama hija la lleva debajo, en su columna; con varias, la fila de hijas va a todo el ancho
    // (centrada bajo la rama madre, como «Actores» en la figura) para que quepan
    function ramasHTML(ramas) {
      var anchas = '';
      var h = '<div class="ramas" style="--r:' + ramas.length + '">' + ramas.map(function (r) {
        var una = r.ramas && r.ramas.length === 1 ? '<div class="ramas sub uno" style="--r:1"><div class="rama"><span class="rama-txt">' + md(T(r.ramas[0])) + '</span></div></div>' : '';
        if (r.ramas && r.ramas.length > 1) {
          anchas += '<div class="ramas sub" style="--r:' + r.ramas.length + '">' + r.ramas.map(function (s) {
            return '<div class="rama"><span class="rama-txt">' + md(T(s)) + '</span></div>';
          }).join('') + '</div>';
        }
        return '<div class="rama"><span class="rama-txt">' + md(T(r)) + '</span>' + una + '</div>';
      }).join('') + '</div>';
      return h + anchas;
    }
    function mostrar(i) {
      var p = P[i]; actual = i;
      botones.forEach(function (b, j) { b.classList.toggle('activo', j === i); });
      var bloques, alternos = null, cab = '';
      var num = '<span class="panel-num">' + esc(p.numero || (i + 1)) + '</span>';
      if (soloRotulo) {
        // flujo: paso anterior → el paso → paso siguiente (unidos por flechas) y, debajo, las ramas del paso
        var vacio = '<span></span><span></span>';
        var flecha = '<span class="flujo-flecha" aria-hidden="true"><i class="fas fa-arrow-right"></i></span>';
        var prev = i > 0 ? '<p class="flujo-vecino ant">' + md(T(P[i - 1].rotulo)) + '</p>' + flecha : vacio;
        var sigu = i < N - 1 ? flecha + '<p class="flujo-vecino sig">' + md(T(P[i + 1].rotulo)) + '</p>' : vacio;
        var actualH = '<p class="flujo-actual' + (p.recuadro ? ' recuadro' : '') + '">' + num + '<span>' + md(T(p.rotulo)) + '</span></p>';
        var ramas = p.ramas ? ramasHTML(p.ramas) + (p.convergen ? '<div class="converge" style="--r:' + p.ramas.length + '" aria-hidden="true"></div>' : '') : '';
        bloques = ['<div class="flujo"><div class="flujo-fila">' + prev + actualH + sigu + '</div>' + ramas + '</div>'];
      } else {
        cab = num + (p.rotulo ? '<h2 class="panel-tit">' + (p.icono ? '<i class="fas ' + esc(p.icono) + '" aria-hidden="true"></i> ' : '') + md(T(p.rotulo)) + '</h2>' : '');
        if (p.lista) {
          bloques = ['<ul class="vinetas">' + p.lista.map(function (x) { return '<li>' + md(T(x)) + '</li>'; }).join('') + '</ul>'];
          alternos = p.lista.map(function (x) { return '<ul class="vinetas"><li>' + md(T(x)) + '</li></ul>'; });
        } else {
          bloques = p.parrafos.map(function (x) { return '<p>' + md(T(x)) + '</p>'; });
        }
      }
      panel.mostrar({ clave: p.id, cab: cab, bloques: bloques, alternos: alternos, max: soloRotulo ? 28 : 23, min: soloRotulo ? 9 : 13, alFin: estado });
      estado();
    }
    function estado() {
      var n = 0;
      while (n < N && Esc.leido(P[n].id)) n++;
      botones.forEach(function (b, j) {
        b.disabled = j > n;
        b.classList.toggle('bloqueado', j > n);
        b.classList.toggle('late', j === n && j !== actual);
      });
      cinta.querySelector('.ruta-llena').style.width = (100 * Math.max(0, Math.min(n, N) - 1) / Math.max(1, N - 1)) + '%';
      bSig.hidden = !(actual >= 0 && actual < N - 1 && Esc.leido(P[actual].id));
      bSig.classList.toggle('late', !bSig.hidden && !Esc.leido(P[actual + 1].id));
    }
    function compactar() {
      var w = cinta.clientWidth;
      var cols = N;
      cinta.classList.remove('compacta', 'dos-filas');
      if (w / N < 74) cinta.classList.add('compacta');
      if (w / N < 34) { cols = Math.ceil(N / 2); cinta.classList.add('dos-filas'); }
      cinta.style.setProperty('--cols', cols);
      if (!cinta.classList.contains('compacta')) encajarTodo('.paso-nom', { min: 8.5 });
      if (actual >= 0) mostrar(actual);
    }
    alRedimensionar.push(compactar);
    alLeer.push(function () { if (!cinta.classList.contains('compacta')) encajarTodo('.paso-nom', { min: 8.5 }); });
    Esc.registrar(P.map(function (p) { return p.id; }));
    compactar();
    estado();
  }

  /* ======================= TRIÁNGULO ======================= */
  function triangulo() {
    guia.textContent = 'Haga clic en cada número del triángulo para leer la frase de ese lado.';
    var E = C.ejes, L = C.lados;
    var pos = { arriba: [300, 150], izquierda: [212, 290], derecha: [388, 290] };
    var vert = { arriba: [300, 92], izquierda: [178, 318], derecha: [422, 318] };
    var ejePos = {}; E.forEach(function (e) { ejePos[e.id] = e.pos; });
    var circ = E.map(function (e, k) {
      var c = pos[e.pos];
      return '<circle class="eje-c c' + k + '" data-eje="' + esc(e.id) + '" cx="' + c[0] + '" cy="' + c[1] + '" r="132"/>';
    }).join('');
    var lineas = L.map(function (l) {
      var a = vert[ejePos[l.entre[0]]], b = vert[ejePos[l.entre[1]]];
      return '<line class="lado-l" data-lado="' + esc(l.id) + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
    }).join('');
    var caja = el('div', 'tri');
    var lienzo = el('div', 'tri-lienzo', '<svg viewBox="0 0 600 430" aria-hidden="true" focusable="false">' + circ + lineas + '</svg>');
    var etq = { arriba: [50, 11], izquierda: [17, 82], derecha: [83, 82] };
    E.forEach(function (e) {
      var s = el('span', 'eje-t', esc(T(e)));
      s.style.left = etq[e.pos][0] + '%'; s.style.top = etq[e.pos][1] + '%';
      lienzo.appendChild(s);
    });
    var leyenda = el('ol', 'tri-leyenda');
    L.forEach(function (l, k) {
      var a = vert[ejePos[l.entre[0]]], b = vert[ejePos[l.entre[1]]];
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var bm = boton(l.id, 'tri-num', '<span>' + (k + 1) + '</span>');
      bm.setAttribute('aria-label', 'Lado ' + (k + 1) + ' del triángulo: clic para leer su frase');
      bm.style.left = (mx / 600 * 100) + '%'; bm.style.top = (my / 430 * 100) + '%';
      bm.addEventListener('click', function () { abrir(k); });
      lienzo.appendChild(bm);
      var li = el('li');
      var bl = boton(l.id, 'tri-item', '<span class="tri-n">' + (k + 1) + '</span><span class="tri-frase"></span><span class="tri-pista">Clic para leer la frase de este lado</span>' + ESTADO + MARCA);
      bl.querySelector('.tri-frase').textContent = Kit.may(T(l));
      bl.addEventListener('click', function () { abrir(k); });
      li.appendChild(bl); leyenda.appendChild(li);
    });
    caja.appendChild(el('div', 'tri-marco')).appendChild(lienzo);
    caja.appendChild(leyenda);
    raiz.appendChild(caja);
    function abrir(k) {
      var l = L[k];
      caja.setAttribute('data-activo', l.id);
      Array.prototype.forEach.call(lienzo.querySelectorAll('.lado-l'), function (x) { x.classList.toggle('activo', x.getAttribute('data-lado') === l.id); });
      Array.prototype.forEach.call(lienzo.querySelectorAll('.eje-c'), function (x) { x.classList.toggle('activo', l.entre.indexOf(x.getAttribute('data-eje')) >= 0); });
      Array.prototype.forEach.call(raiz.querySelectorAll('[data-abre]'), function (x) { x.classList.toggle('activo', x.getAttribute('data-abre') === l.id); });
      Esc.marcar(l.id);
      pintar();
      var it = leyenda.children[k].querySelector('.tri-frase');
      if (!reducido && it.animate) it.animate([{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
    }
    function pintar() {
      L.forEach(function (l) {
        var x = lienzo.querySelector('.lado-l[data-lado="' + l.id + '"]');
        x.classList.toggle('leido', Esc.leido(l.id));
      });
      var sig = -1; L.forEach(function (l, k) { if (sig < 0 && !Esc.leido(l.id)) sig = k; });
      Array.prototype.forEach.call(raiz.querySelectorAll('.tri-num'), function (b, k) { b.classList.toggle('late', k === sig); });
      encajarTodo('.tri-frase', { min: 11 });
    }
    alRedimensionar.push(pintar);
    Esc.registrar(L.map(function (l) { return l.id; }));
    pintar();
  }

  /* ======================= LISTA + PANEL (matriz por fila y tarjetas) ======================= */
  function listaPanel(o) {
    var caja = el('div', 'lp' + (o.cls ? ' ' + o.cls : ''));
    if (o.encabezado) caja.appendChild(el('p', 'diag-enc', md(o.encabezado)));
    var lista = el('div', 'lp-lista');
    if (o.cabLista) lista.appendChild(el('p', 'lp-col', md(o.cabLista)));
    var ul = el('ol', 'lp-items');
    o.items.forEach(function (it, k) {
      var li = el('li');
      var b = boton(it.id, 'lp-item', '<span class="lp-n">' + (k + 1) + '</span><span class="lp-txt"></span>' + ESTADO + MARCA);
      b.querySelector('.lp-txt').textContent = it.etiqueta;
      b.setAttribute('aria-label', plano(it.completo || it.etiqueta));
      b.setAttribute('data-latir', '');
      b.addEventListener('click', function () { abrir(k); });
      li.appendChild(b); ul.appendChild(li);
    });
    lista.appendChild(ul);
    caja.appendChild(lista);
    var np = nuevoPanel();
    caja.appendChild(np.sec);
    if (o.nota) caja.appendChild(el('p', 'lp-nota', md(o.nota)));
    raiz.appendChild(caja);
    var panel = new Panel(np.sec);
    inicioPanel(np.sec, '<i class="fas fa-hand-pointer" aria-hidden="true"></i><p>' + o.inicio + '</p>');
    var actual = -1;
    function abrir(k) {
      actual = k;
      Array.prototype.forEach.call(ul.querySelectorAll('.lp-item'), function (b, j) { b.classList.toggle('activo', j === k); });
      var it = o.items[k];
      panel.mostrar({ clave: it.id, cab: it.cab, bloques: it.bloques, alternos: it.alternos, max: 24, min: 13 });
    }
    function etiquetas() { encajarTodo('.lp-txt', { min: 10.5 }); }
    function ajustar() { etiquetas(); if (actual >= 0) abrir(actual); }
    alRedimensionar.push(ajustar);
    alLeer.push(etiquetas);
    Esc.registrar(o.items.map(function (it) { return it.id; }));
    ajustar();
  }

  /* ======================= MATRIZ ======================= */
  function matriz() {
    if (C.abrir === 'celda') return matrizCeldas();
    guia.textContent = 'Haga clic en cada fila de la tabla para leer sus columnas.';
    var cols = C.columnas;
    listaPanel({
      encabezado: C.encabezado, cabLista: cols[0], cls: 'mfila',
      inicio: 'Elija una fila de la lista para ver lo que dice cada columna.',
      items: C.filas.map(function (f) {
        var celdas = f.celdas.slice(1).map(function (c, j) {
          return '<div class="celda"><p class="rotulo">' + md(cols[j + 1]) + '</p><p>' + md(c) + '</p></div>';
        });
        return {
          id: f.id, etiqueta: plano(f.celdas[0]), completo: f.celdas[0],
          cab: '<h2 class="panel-tit">' + md(f.celdas[0]) + '</h2>',
          bloques: ['<div class="celdas" style="--c:' + celdas.length + '">' + celdas.join('') + '</div>'],
          alternos: celdas
        };
      })
    });
  }
  function matrizCeldas() {
    guia.textContent = 'Haga clic en cada casilla para leer sus indicadores.';
    var cols = C.columnas, vacias = C.columnas_vacias || [];
    var usar = []; for (var j = 1; j < cols.length; j++) if (vacias.indexOf(j) < 0) usar.push(j);
    var caja = el('div', 'mz');
    var tabla = el('div', 'mz-tabla');
    tabla.style.setProperty('--k', usar.length);
    tabla.appendChild(el('span', 'mz-h', md(cols[0])));
    usar.forEach(function (j) { tabla.appendChild(el('span', 'mz-h', md(cols[j]))); });
    var claves = [];
    C.filas.forEach(function (f) {
      tabla.appendChild(el('span', 'mz-dim', md(f.celdas[0])));
      usar.forEach(function (j) {
        var items = f.celdas[j], clave = f.id + '-' + j;
        claves.push(clave);
        var b = boton(clave, 'mz-celda', '<span class="mz-txt"></span><span class="mz-pie">' + ESTADO + MARCA + '</span>');
        b._items = items;
        b.setAttribute('aria-label', plano(f.celdas[0]) + ' · ' + plano(cols[j]) + ': clic para leer sus indicadores');
        b.setAttribute('data-latir', '');
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(tabla.querySelectorAll('.mz-celda'), function (x) { x.classList.toggle('activo', x === b); });
          Esc.lector({ titulo: plano(f.celdas[0]) + ' · ' + plano(cols[j]), clave: clave,
            bloques: items.map(function (x) { return '<ul class="vinetas"><li>' + md(x) + '</li></ul>'; }) });
        });
        tabla.appendChild(b);
      });
    });
    caja.appendChild(tabla);
    raiz.appendChild(caja);
    // vista previa de cada casilla: tantos indicadores enteros como quepan; si sobran, «…» en una línea aparte;
    // si ni el primero cabe, se acorta por palabras completas (el texto completo siempre está en el lector)
    function previa(b) {
      var e = b.querySelector('.mz-txt'), items = b._items;
      e.style.fontSize = ''; e.removeAttribute('data-completo'); e.removeAttribute('title');
      var n = items.length;
      function pintar(k) { e.textContent = items.slice(0, k).map(plano).join('\n• ') + (k < items.length ? '\n…' : ''); }
      pintar(n);
      while (n > 1 && e.scrollHeight > e.clientHeight) { n -= 1; pintar(n); }
      if (e.scrollHeight > e.clientHeight) { e.textContent = plano(items[0]); Esc.encajar(e, { min: 12 }); }
    }
    function ajustar() { Array.prototype.forEach.call(tabla.querySelectorAll('.mz-celda'), previa); }
    alRedimensionar.push(ajustar);
    alLeer.push(ajustar);
    Esc.registrar(claves);
    ajustar();
  }

  /* ======================= TARJETAS ======================= */
  function tarjetas() {
    guia.textContent = 'Haga clic en cada punto para leerlo completo.';
    listaPanel({
      encabezado: C.encabezado, cls: 'tarj', nota: C.nota,
      inicio: 'Elija un punto de la lista para leerlo completo.',
      items: C.tarjetas.map(function (t, k) {
        return {
          id: t.id, etiqueta: plano(T(t)), completo: T(t),
          cab: '<span class="panel-num">' + (k + 1) + '</span>',
          bloques: ['<p>' + md(T(t)) + '</p>']
        };
      })
    });
  }

  /* ======================= CAPAS ======================= */
  function capas() {
    guia.textContent = 'Haga clic en cada círculo, del centro hacia afuera, para leer su contenido.';
    var K = C.capas;
    var caja = el('div', 'cp');
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(C.encabezado)));
    var anillos = el('div', 'cp-anillos', '<svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">' +
      '<circle class="cp-c" data-capa="' + esc(K[2].id) + '" cx="200" cy="200" r="196"/>' +
      '<circle class="cp-c" data-capa="' + esc(K[1].id) + '" cx="200" cy="200" r="142"/>' +
      '<circle class="cp-c cp-c2" data-capa="' + esc(K[0].id) + '" cx="200" cy="200" r="94"/>' +
      '<circle class="cp-c cp-c1" data-capa="' + esc(K[0].id) + '" cx="200" cy="200" r="64"/></svg>');
    var POS = [[50, 50], [50, 21], [50, 6.6]];
    K.forEach(function (k, i) {
      var nom = k.nombre.map(function (x) { return md(x); });
      var b = boton(k.id, 'cp-btn cp-b' + i, (i === 0 ? '<b class="cp-sigla">' + nom[0] + '</b><span>' + nom.slice(1).join(' ') + '</span>' : '<span>' + nom.join(' ') + '</span>') + MARCA);
      b.style.left = POS[i][0] + '%'; b.style.top = POS[i][1] + '%';
      b.setAttribute('aria-label', plano(k.nombre.join(' ')) + ': clic para leer su contenido');
      b.addEventListener('click', function () { abrir(i); });
      anillos.appendChild(b);
    });
    var marco = el('div', 'cp-marco'); marco.appendChild(anillos);
    caja.appendChild(marco);
    var np = nuevoPanel();
    caja.appendChild(np.sec);
    raiz.appendChild(caja);
    var panel = new Panel(np.sec);
    inicioPanel(np.sec, '<i class="fas fa-circle-nodes" aria-hidden="true"></i><p>Haga clic en el círculo central para empezar.</p>');
    function miembro(e) {
      var h = '<div class="miembro">';
      if (e.seguido) h += '<p><b>' + md(e.nombre) + '</b> ' + e.lineas.map(md).join(' ') + '</p>';
      else {
        h += '<p class="rotulo">' + md(e.nombre) + '</p>';
        if (e.lineas) h += e.lineas.map(function (x) { return '<p>' + md(x) + '</p>'; }).join('');
        if (e.lista) h += '<ul class="vinetas">' + e.lista.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>';
      }
      return h + '</div>';
    }
    function abrir(i) {
      var k = K[i];
      caja.setAttribute('data-activo', k.id);
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-btn'), function (b, j) { b.classList.toggle('activo', j === i); });
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-c'), function (c) { c.classList.toggle('activo', c.getAttribute('data-capa') === k.id); });
      var det = k.detalle ? '<p class="cp-detalle">' + md(k.detalle) + '</p>' : '';
      var ms = k.elementos.map(miembro);
      panel.mostrar({ clave: k.id, cab: '<h2 class="panel-tit">' + k.nombre.map(md).join(' ') + '</h2>',
        bloques: [det + '<div class="miembros' + (ms.length > 2 ? ' dos' : '') + '">' + ms.join('') + '</div>'],
        alternos: (det ? [det] : []).concat(ms), max: 24, min: 13, alFin: pintar });
    }
    function pintar() {
      var sig = -1; K.forEach(function (k, i) { if (sig < 0 && !Esc.leido(k.id)) sig = i; });
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-btn'), function (b, i) {
        b.classList.toggle('late', i === sig && !b.classList.contains('activo'));
        b.setAttribute('data-estado', Esc.estadoDe(K[i].id));
      });
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-c'), function (c) { c.classList.toggle('leido', Esc.leido(c.getAttribute('data-capa'))); });
    }
    document.addEventListener('esc:leido', pintar);
    alRedimensionar.push(function () { var a = caja.getAttribute('data-activo'); K.forEach(function (k, i) { if (k.id === a) abrir(i); }); });
    Esc.registrar(K.map(function (k) { return k.id; }));
    pintar();
  }

  /* ======================= NIVELES ======================= */
  function niveles() {
    guia.textContent = 'Haga clic en los tres bloques; al abrirlos se abre el bloque final.';
    var G = C.grupos, B = C.base;
    var caja = el('div', 'nv');
    caja.appendChild(el('div', 'nv-raiz', '<p class="nv-raiz-t">' + md(T(C.raiz)) + '</p>' + (C.subtitulo ? '<p class="nv-sub">' + md(T(C.subtitulo)) + '</p>' : '')));
    caja.appendChild(el('p', 'nv-flecha', '<i class="fas fa-arrow-down" aria-hidden="true"></i>'));
    var fila = el('div', 'nv-grupos');
    fila.style.setProperty('--g', G.length);
    G.forEach(function (g, i) {
      var d = el('div', 'nv-grupo g' + i);
      var b = boton(g.id, 'nv-btn', '<span class="nv-nom">' + md(T(g.nombre)) + '</span>' + ESTADO + MARCA);
      b.setAttribute('data-latir', '');
      b.setAttribute('aria-label', plano(T(g.nombre)) + ': clic para desplegar');
      b.addEventListener('click', function () { abrir(g.id, d); });
      d.appendChild(b);
      d.appendChild(el('ul', 'nv-items', g.elementos.map(function (x) { return '<li>' + md(T(x)) + '</li>'; }).join('')));
      fila.appendChild(d);
    });
    caja.appendChild(fila);
    caja.appendChild(el('p', 'nv-flecha', '<i class="fas fa-arrow-down" aria-hidden="true"></i>'));
    var base = el('div', 'nv-base');
    var bb = boton(B.id, 'nv-btn nv-btn-base', '<span class="nv-nom">' + md(T(B.nombre)) + '</span>' + ESTADO + MARCA);
    bb.setAttribute('aria-label', plano(T(B.nombre)) + ': clic para desplegar');
    bb.addEventListener('click', function () { abrir(B.id, base); });
    base.appendChild(bb);
    base.appendChild(el('p', 'nv-items nv-linea', B.elementos.map(function (x) { return '<span>' + md(T(x)) + '</span>'; }).join('<span class="sep" aria-hidden="true">' + esc(B.separador || ' · ') + '</span>')));
    caja.appendChild(base);
    raiz.appendChild(caja);
    function abrir(k, cont) {
      Array.prototype.forEach.call(caja.querySelectorAll('.nv-grupo,.nv-base'), function (x) { x.classList.toggle('activo', x === cont); });
      var nuevo = !Esc.leido(k);
      Esc.marcar(k);
      pintar();
      if (nuevo && !reducido) {
        Array.prototype.forEach.call(cont.querySelectorAll('.nv-items > *'), function (x, j) {
          if (x.animate) x.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: j * 110, fill: 'backwards' });
        });
      }
    }
    function pintar() {
      G.forEach(function (g, i) { fila.children[i].classList.toggle('abierto', Esc.leido(g.id)); });
      var listos = G.every(function (g) { return Esc.leido(g.id); });
      bb.disabled = !listos;
      base.classList.toggle('bloqueado', !listos);
      base.classList.toggle('abierto', Esc.leido(B.id));
      bb.classList.toggle('late', listos && !Esc.leido(B.id));
    }
    // todo el texto ocupa su lugar desde el inicio (oculto hasta abrirse): la letra baja hasta que todo cabe
    function ajustar() {
      var tam = 16; caja.style.fontSize = tam + 'px';
      while ((caja.scrollHeight > caja.clientHeight + 1 || caja.scrollWidth > caja.clientWidth + 1) && tam > 9.5) { tam -= 0.5; caja.style.fontSize = tam + 'px'; }
    }
    alRedimensionar.push(ajustar);
    Esc.registrar(G.map(function (g) { return g.id; }).concat([B.id]));
    pintar();
    ajustar();
  }
})();
