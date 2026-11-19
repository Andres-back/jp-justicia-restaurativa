/* Diagramas interactivos de las figuras de la ficha (Justicia restaurativa, 18/11/2026). Un recurso dirigido por datos:
   index.html?f=<id> lee la figura de window.FIGURAS_TEXTO (datos.js, copia de plan/figuras-texto.json) y la dibuja
   según su tipo:
     ruta       de solo rótulos: infografía de un vistazo, todos los pasos con sus ramas a la vista, sin clics (19/11/2026);
                con texto: el paso abierto con su texto completo (14 px o más) y un solo botón de avance; si no cabe, columnas;
     triangulo  ejes en círculos que se cruzan y una frase en cada lado del triángulo, todo a la vista;
     matriz     tabla: fija a la vista, por fila (lista + panel con las columnas) o por casilla (lector por partes);
     tarjetas   puntos independientes (lista + panel);
     capas      círculos concéntricos, cada capa con sus integrantes;
     niveles    jerarquía: recuadro superior, grupos y un bloque final, todo a la vista.
   Dentro de una pestaña de su lección (?embebido=1 o detectado; index.html y escena.js) va sin cabecera, sin botón
   propio de pantalla completa y sin avisos propios, con la fuente en una línea pequeña y todo el alto para la figura.
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
  // Dentro de una pestaña de su lección (escena.js: html.embebido): sin cabecera ni avisos propios (la lección tiene los suyos)
  var INCR = !!Esc.embebido;
  var sinAviso = false; // figuras que se leen de un vistazo: quedan vistas al abrirse, sin aviso

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
  document.addEventListener('esc:completo', function () { if (!INCR && !sinAviso) Esc.aviso('Ha explorado toda la figura.', 3600); });

  var C = fig.contenido;
  var tipos = { ruta: ruta, triangulo: triangulo, matriz: matriz, tarjetas: tarjetas, capas: capas, niveles: niveles };
  (tipos[fig.tipo] || function () {})();

  /* ======================= RUTA ======================= */
  // Ramas de un paso: una rama con una sola rama hija la lleva debajo, en su columna; con varias, la fila de hijas va a todo el
  // ancho (centrada bajo la rama madre, como «Actores» en la figura) para que quepan
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
  function ruta() {
    var P = C.pasos;
    var soloRotulo = P.every(function (p) { return !p.parrafos && !p.lista; });
    if (soloRotulo) vistazo(P); else rutaTexto(P);
  }

  /* Infografía de un vistazo (figuras de solo rótulos, como jr-u1-p18; revisión del 19/11/2026: 13 clics para leer rótulos de una o
     dos palabras, y el paso abierto no mostraba sus ramas; Juan, del diagrama de «Repensar el delito»: «está buenísimo… en un solo
     paquete»). Todos los pasos, en orden y con sus ramas, a la vista: se reparten en las columnas que quepan (alturas medidas,
     columnas equilibradas) con la letra más grande que entre. Ningún clic obligatorio: la figura queda vista al abrirse. Si ni con
     la letra más pequeña cabe (celular), la figura se desplaza dentro de su caja, con letra de 14 px, y queda vista al final. */
  function vistazo(P) {
    sinAviso = true;
    guia.textContent = 'Lea la figura completa: los pasos van en orden, cada uno con sus ramas.';
    var caja = el('div', 'fv');
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(T(C.encabezado))));
    var lienzo = el('div', 'fv-lienzo');
    lienzo.setAttribute('role', 'list');
    lienzo.setAttribute('aria-label', plano(fig.titulo));
    caja.appendChild(lienzo);
    raiz.appendChild(caja);
    // Dos dibujos de las ramas: «llaves» (fila de ramas bajo una llave, como en la figura; el que Juan aprobó) y «árbol» (ramas una
    // debajo de otra, más angosto). Cada paso va con llaves si sus ramas caben en fila al ancho de la columna y, si no, en árbol.
    function arbolHTML(ramas) {
      return '<ul class="fv-ramas">' + ramas.map(function (r) {
        return '<li><span class="fv-rama">' + md(T(r)) + '</span>' + (r.ramas ? arbolHTML(r.ramas).replace('fv-ramas', 'fv-ramas sub') : '') + '</li>';
      }).join('') + '</ul>';
    }
    function bloque(p, i, estilo) {
      var b = el('div', 'fv-paso' + (p.ramas ? ' con-ramas' : '') + (p.ramas && estilo === 'arbol' ? ' en-arbol' : ''));
      b.setAttribute('role', 'listitem');
      var ramas = '';
      if (p.ramas) {
        ramas = estilo === 'arbol' ? arbolHTML(p.ramas)
          : ramasHTML(p.ramas) + (p.convergen ? '<div class="converge" style="--r:' + p.ramas.length + '" aria-hidden="true"></div>' : '');
      }
      b.innerHTML = '<p class="fv-rot' + (p.recuadro ? ' recuadro' : '') + '"><span class="fv-n" aria-hidden="true">' + esc(p.numero || (i + 1)) +
        '</span><span class="fv-t">' + md(T(p.rotulo)) + '</span></p>' + ramas;
      return b;
    }
    var bloques = { llaves: [], arbol: [] };
    P.forEach(function (p, i) { bloques.llaves.push(bloque(p, i, 'llaves')); bloques.arbol.push(bloque(p, i, 'arbol')); });
    var usados = bloques.llaves;
    function colocar(grupos) {
      lienzo.innerHTML = '';
      lienzo.style.setProperty('--k', grupos.length);
      grupos.forEach(function (g, c) {
        var col = el('div', 'fv-col');
        g.forEach(function (i, n) {
          if (n) col.appendChild(el('span', 'fv-flecha', '<i class="fas fa-arrow-down" aria-hidden="true"></i>'));
          col.appendChild(usados[i]);
        });
        if (c < grupos.length - 1 && g.length) col.appendChild(el('span', 'fv-sigue', '<i class="fas fa-arrow-right" aria-hidden="true"></i>'));
        lienzo.appendChild(col);
      });
    }
    // Reparte los pasos, en orden, en k columnas con la menor altura máxima posible (alturas medidas al ancho de una columna)
    function repartir(k) {
      var todos = P.map(function (_, i) { return i; }), resto = [], c;
      for (c = 1; c < k; c++) resto.push([]);
      usados = bloques.llaves.slice();
      colocar([todos].concat(resto));
      // al ancho de esta columna: las ramas que no caben en fila van en árbol
      usados = usados.map(function (b, i) {
        return Array.prototype.some.call(b.querySelectorAll('.rama-txt'), function (e) { return sale(e); }) ? bloques.arbol[i] : b;
      });
      colocar([todos].concat(resto));
      var h = usados.map(function (b) { return b.getBoundingClientRect().height; });
      var f = lienzo.querySelector('.fv-flecha'), a = f ? f.getBoundingClientRect().height : 0;
      var N = h.length;
      function alto(i, j) { var s = (j - i) * a; for (var t = i; t <= j; t++) s += h[t]; return s; }
      var mejor = [], corte = [];
      for (c = 1; c <= k; c++) {
        mejor[c] = []; corte[c] = [];
        for (var j = 0; j < N; j++) {
          if (c === 1) { mejor[1][j] = alto(0, j); corte[1][j] = -1; continue; }
          mejor[c][j] = Infinity; corte[c][j] = j - 1;
          for (var i = c - 2; i < j; i++) {
            var v = Math.max(mejor[c - 1][i], alto(i + 1, j));
            if (v < mejor[c][j]) { mejor[c][j] = v; corte[c][j] = i; }
          }
        }
      }
      var grupos = [], fin = N - 1;
      for (c = k; c >= 1; c--) {
        var ini = c === 1 ? -1 : corte[c][fin], g = [];
        for (var t = ini + 1; t <= fin; t++) g.push(t);
        grupos.unshift(g); fin = ini;
      }
      colocar(grupos);
    }
    // un texto se sale de su caja (rótulo del paso o rama)
    function sale(e, caja) {
      var r = (caja || e).getBoundingClientRect(), g = document.createRange(); g.selectNodeContents(e);
      var t = g.getBoundingClientRect();
      return t.width > 0 && (t.left < r.left - 0.5 || t.right > r.right + 0.5 || t.top < r.top - 0.5 || t.bottom > r.bottom + 0.5);
    }
    function anchoBien() {
      if (lienzo.scrollWidth > lienzo.clientWidth + 1) return false;
      return !Array.prototype.some.call(lienzo.querySelectorAll('.rama-txt,.fv-rama,.fv-t'), function (e) {
        return sale(e, e.classList.contains('fv-t') ? e.parentNode : null);
      });
    }
    function cabeVz() { return lienzo.scrollHeight <= lienzo.clientHeight + 1 && anchoBien(); }
    var primera = true;
    function componer() {
      lienzo.classList.remove('desplaza');
      var kmax = Math.max(1, Math.min(6, P.length, Math.floor(lienzo.clientWidth / 175)));
      var listo = false;
      for (var t = 17; t >= 12.5 && !listo; t -= 0.5) {
        caja.style.fontSize = t + 'px';
        for (var k = 1; k <= kmax && !listo; k++) { repartir(k); listo = cabeVz(); }
      }
      if (!listo) {
        // ni con la letra más pequeña cabe (celular): la figura se lee desplazándola dentro de su caja, con letra de 14 px
        caja.style.fontSize = '14px';
        repartir(kmax);
        lienzo.classList.add('desplaza');
      }
      revisar();
      if (primera && !reducido) {
        Array.prototype.forEach.call(lienzo.querySelectorAll('.fv-paso'), function (b, i) {
          if (b.animate) b.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: i * 12, fill: 'backwards' });
        });
      }
      primera = false;
    }
    function revisar() {
      if (!lienzo.classList.contains('desplaza') || lienzo.scrollTop + lienzo.clientHeight >= lienzo.scrollHeight - 4) Esc.marcar('figura');
    }
    lienzo.addEventListener('scroll', revisar);
    alRedimensionar.push(componer);
    Esc.registrar(['figura']);
    componer();
  }

  /* Pasos con texto (como las fases de jr-u1-p30; revisión del 19/11/2026: el texto de la fase constructiva salía en una sola línea
     cortada). El paso abierto muestra su texto completo, sin partes, con letra de 14 px o más, y hay un solo botón de avance
     («Siguiente paso»). El paso 1 se abre solo. Si el texto de algún paso no cabe así, se muestran todos los textos en columnas, sin
     clics (y, si ni así caben a 14 px, las columnas se desplazan dentro de su caja y quedan vistas al llegar al final). */
  function rutaTexto(P) {
    var N = P.length;
    guia.textContent = 'Lea cada paso completo; el botón «Siguiente paso» lleva al que sigue.';
    var caja = el('div', 'ruta');
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
    var cabP = np.sec.querySelector('.panel-cab'), cuerpo = np.sec.querySelector('.panel-cuerpo');
    var botones = Array.prototype.slice.call(ol.querySelectorAll('.paso'));
    var bSig = pieP.querySelector('.paso-sig');
    var actual = -1, modo = '', cols = null;
    bSig.addEventListener('click', function () { if (actual < N - 1) { mostrar(actual + 1); botones[actual].focus(); } });
    function piezas(i) {
      var p = P[i];
      var cab = '<span class="panel-num">' + esc(p.numero || (i + 1)) + '</span>' +
        (p.rotulo ? '<h2 class="panel-tit">' + (p.icono ? '<i class="fas ' + esc(p.icono) + '" aria-hidden="true"></i> ' : '') + md(T(p.rotulo)) + '</h2>' : '');
      var texto = p.lista ? '<ul class="vinetas">' + p.lista.map(function (x) { return '<li>' + md(T(x)) + '</li>'; }).join('') + '</ul>'
        : (p.parrafos || []).map(function (x) { return '<p>' + md(T(x)) + '</p>'; }).join('');
      return { cab: cab, texto: texto };
    }
    function pintar(i, t) {
      var x = piezas(i);
      cabP.innerHTML = x.cab; cabP.hidden = false;
      cuerpo.style.fontSize = t + 'px'; cuerpo.innerHTML = x.texto;
    }
    // la letra más grande (de 20 a 14 px) con la que el texto completo del paso cabe; 0 si no cabe ni con 14
    function letra(i) {
      for (var t = 20; t >= 14; t -= 0.5) { pintar(i, t); if (cabe(cuerpo)) return t; }
      return 0;
    }
    function mostrar(i) {
      actual = i;
      botones.forEach(function (b, j) { b.classList.toggle('activo', j === i); });
      if (!letra(i)) { columnas(); return; }
      if (!reducido && cuerpo.animate) cuerpo.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 230 });
      Esc.marcar(P[i].id);
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
      bSig.hidden = !(actual >= 0 && actual < N - 1);
      bSig.classList.toggle('late', !bSig.hidden && !Esc.leido(P[actual + 1].id));
    }
    function rotulos() { if (!cinta.classList.contains('compacta')) encajarTodo('.paso-nom', { min: 10 }); }
    // forzar: la cinta solo con los círculos (el nombre del paso está en el panel), para dar más alto al texto
    function compactar(forzar) {
      var w = cinta.clientWidth, c = N;
      cinta.classList.remove('compacta', 'dos-filas');
      if (forzar || w / N < 74) cinta.classList.add('compacta');
      if (w / N < 34) { c = Math.ceil(N / 2); cinta.classList.add('dos-filas'); }
      cinta.style.setProperty('--cols', c);
      rotulos();
    }
    function columnas() {
      modo = 'columnas';
      sinAviso = true;
      caja.classList.add('en-columnas');
      if (!cols) {
        cols = el('div', 'rc');
        cols.style.setProperty('--n', N);
        P.forEach(function (p, i) {
          var x = piezas(i);
          cols.appendChild(el('section', 'rc-col', '<div class="rc-cab">' + x.cab + '</div><div class="rc-texto">' + x.texto + '</div>'));
        });
        cols.addEventListener('scroll', revisarCols);
        caja.appendChild(cols);
      }
      cols.classList.remove('desplaza');
      // cuántas columnas por fila (de N a 1, de 170 px o más): la letra más grande con la que todo cabe; a igual letra, más columnas
      var W = cols.clientWidth, ks = [], k, t, elegido = 0;
      for (k = N; k >= 1; k--) if (W / k >= 170 || k === 1) ks.push(k);
      for (t = 19; t >= 14 && !elegido; t -= 0.5) {
        cols.style.fontSize = t + 'px';
        for (var a = 0; a < ks.length && !elegido; a++) { cols.style.setProperty('--c', ks[a]); if (cabe(cols)) elegido = ks[a]; }
      }
      if (!elegido) {
        // ni con 14 px cabe todo: las columnas que dejan menos por desplazar, y se desplazan dentro de su caja
        cols.style.fontSize = '14px';
        var menor = Infinity;
        ks.forEach(function (x) { cols.style.setProperty('--c', x); if (cols.scrollHeight < menor) { menor = cols.scrollHeight; elegido = x; } });
        cols.style.setProperty('--c', elegido);
        cols.classList.add('desplaza');
      }
      Esc.registrar(['columnas']);
      revisarCols();
    }
    function revisarCols() { if (!cols.classList.contains('desplaza') || cols.scrollTop + cols.clientHeight >= cols.scrollHeight - 4) Esc.marcar('columnas'); }
    function componer() {
      caja.classList.remove('en-columnas');
      // primero la cinta con los nombres; si el texto de algún paso no cabe, la cinta solo con los círculos; si tampoco, columnas
      for (var vuelta = 0; vuelta < 2; vuelta++) {
        compactar(vuelta === 1);
        var todos = true;
        for (var i = 0; i < N && todos; i++) todos = letra(i) > 0;
        if (todos) {
          if (modo !== 'pasos') { modo = 'pasos'; Esc.registrar(P.map(function (p) { return p.id; })); }
          mostrar(actual >= 0 ? actual : 0);
          return;
        }
      }
      columnas();
    }
    alRedimensionar.push(componer);
    alLeer.push(function () { if (modo === 'pasos') rotulos(); });
    componer();
  }

  /* ======================= TRIÁNGULO ======================= */
  /* Figura de solo rótulos (19/11/2026: «lo mismo para toda figura de solo rótulos»): los tres ejes y las tres frases a la vista desde
     el inicio, sin clics obligatorios. Pasar el cursor o hacer clic en una frase (o en su número) resalta su lado del triángulo. */
  function triangulo() {
    sinAviso = true;
    guia.textContent = 'Lea las tres frases: cada número señala su lado del triángulo.';
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
      return '<line class="lado-l leido" data-lado="' + esc(l.id) + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>';
    }).join('');
    var caja = el('div', 'tri tri-vista');
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
      var bm = el('button', 'tri-num', '<span>' + (k + 1) + '</span>');
      bm.type = 'button'; bm.setAttribute('data-lado-btn', l.id);
      bm.setAttribute('aria-label', 'Lado ' + (k + 1) + ' del triángulo: ' + plano(T(l)));
      bm.style.left = (mx / 600 * 100) + '%'; bm.style.top = (my / 430 * 100) + '%';
      bm.addEventListener('click', function () { resaltar(k); });
      lienzo.appendChild(bm);
      var li = el('li');
      var bl = el('button', 'tri-item', '<span class="tri-n">' + (k + 1) + '</span><span class="tri-frase"></span>');
      bl.type = 'button'; bl.setAttribute('data-lado-btn', l.id);
      bl.querySelector('.tri-frase').textContent = Kit.may(T(l));
      bl.addEventListener('click', function () { resaltar(k); });
      bl.addEventListener('mouseenter', function () { resaltar(k); });
      li.appendChild(bl); leyenda.appendChild(li);
    });
    caja.appendChild(el('div', 'tri-marco')).appendChild(lienzo);
    caja.appendChild(leyenda);
    raiz.appendChild(caja);
    function resaltar(k) {
      var l = L[k];
      caja.setAttribute('data-activo', l.id);
      Array.prototype.forEach.call(lienzo.querySelectorAll('.lado-l'), function (x) { x.classList.toggle('activo', x.getAttribute('data-lado') === l.id); });
      Array.prototype.forEach.call(lienzo.querySelectorAll('.eje-c'), function (x) { x.classList.toggle('activo', l.entre.indexOf(x.getAttribute('data-eje')) >= 0); });
      Array.prototype.forEach.call(raiz.querySelectorAll('[data-lado-btn]'), function (x) { x.classList.toggle('activo', x.getAttribute('data-lado-btn') === l.id); });
    }
    function ajustar() { encajarTodo('.tri-frase', { min: 12, palabras: false }); }
    alRedimensionar.push(ajustar);
    Esc.registrar(['figura']);
    Esc.marcar('figura');
    ajustar();
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
    if (C.abrir === 'fija') return matrizFija();
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
  /* Tabla fija a la vista, sin clics (revisión con Juan del 19/11/2026: «una tablita html común y corriente»; Figura 3: «la tabla
     completa a la vista, fija»; Figura 4: «tabla HTML fija, sin clics»). Todas las filas y columnas con su texto literal; si no
     caben, la tabla se desplaza y queda leída al llegar al final. */
  function matrizFija() {
    guia.textContent = 'Lea la tabla completa.';
    var cols = C.columnas, vacias = C.columnas_vacias || [], caja = el('div', 'mf');
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(C.encabezado)));
    var marco = el('div', 'mf-marco');
    marco.tabIndex = 0;
    var t = '<table class="mf-tabla"><thead><tr>' + cols.map(function (c, j) { return vacias.indexOf(j) >= 0 ? '' : '<th scope="col">' + md(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      C.filas.map(function (f) {
        return '<tr>' + f.celdas.map(function (c, j) {
          if (j && vacias.indexOf(j) >= 0) return '';
          var html = Array.isArray(c) ? (c.length ? '<ul class="vinetas">' + c.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>' : '') : md(c);
          return j ? '<td>' + html + '</td>' : '<th scope="row">' + html + '</th>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    marco.innerHTML = t;
    caja.appendChild(marco);
    raiz.appendChild(caja);
    var tabla = marco.querySelector('.mf-tabla');
    /* Revisión de la U4 (19/11/2026: la fila «Conductual» quedaba bajo el pliegue sin ninguna señal). La tabla busca caber completa:
       la letra baja de 15 a 13 px y se prueban anchos de la primera columna. Si ni así cabe, se desplaza y lo dice: degradado abajo
       y «Desplace para ver más filas» mientras queden filas (clase «con-mas», como las tablas del motor del curso). */
    var ANCHOS = ['10%', '13%', '18%', '24%']; // de la más angosta a la más ancha: más ancho para las columnas de texto
    function cabeT() { return marco.scrollHeight <= marco.clientHeight + 1 && marco.scrollWidth <= marco.clientWidth + 1; }
    function ajustar() {
      var listo = false, t, k;
      for (t = 15; t >= 13 && !listo; t -= 0.5) {
        tabla.style.fontSize = t + 'px';
        for (k = 0; k < ANCHOS.length && !listo; k++) { tabla.style.setProperty('--mf-col1', ANCHOS[k]); listo = cabeT(); }
      }
      if (!listo) {
        // no cabe con 13 px: el ancho de primera columna que deja menos por desplazar
        tabla.style.fontSize = '13px';
        var menor = Infinity, mejor = ANCHOS[0];
        ANCHOS.forEach(function (w) { tabla.style.setProperty('--mf-col1', w); if (marco.scrollHeight < menor) { menor = marco.scrollHeight; mejor = w; } });
        tabla.style.setProperty('--mf-col1', mejor);
      }
      revisar();
    }
    Esc.registrar(['tabla']);
    function revisar() {
      var quedan = marco.scrollTop + marco.clientHeight < marco.scrollHeight - 4;
      caja.classList.toggle('con-mas', quedan);
      if (!quedan) Esc.marcar('tabla');
    }
    marco.addEventListener('scroll', revisar);
    alRedimensionar.push(ajustar);
    ajustar();
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
  /* Figura de solo rótulos (19/11/2026: «lo mismo para toda figura de solo rótulos»): el recuadro superior, los tres grupos con sus
     elementos y el bloque final, todo a la vista desde el inicio y sin clics obligatorios; la letra baja hasta que todo cabe. */
  function niveles() {
    sinAviso = true;
    guia.textContent = 'Lea la figura completa: el enfoque, sus tres bloques y la finalidad común.';
    var G = C.grupos, B = C.base;
    var caja = el('div', 'nv nv-vista');
    caja.appendChild(el('div', 'nv-raiz', '<p class="nv-raiz-t">' + md(T(C.raiz)) + '</p>' + (C.subtitulo ? '<p class="nv-sub">' + md(T(C.subtitulo)) + '</p>' : '')));
    caja.appendChild(el('p', 'nv-flecha', '<i class="fas fa-arrow-down" aria-hidden="true"></i>'));
    var fila = el('div', 'nv-grupos');
    fila.style.setProperty('--g', G.length);
    G.forEach(function (g, i) {
      var d = el('div', 'nv-grupo abierto g' + i);
      d.appendChild(el('p', 'nv-btn', '<span class="nv-nom">' + md(T(g.nombre)) + '</span>'));
      d.appendChild(el('ul', 'nv-items', g.elementos.map(function (x) { return '<li>' + md(T(x)) + '</li>'; }).join('')));
      fila.appendChild(d);
    });
    caja.appendChild(fila);
    caja.appendChild(el('p', 'nv-flecha', '<i class="fas fa-arrow-down" aria-hidden="true"></i>'));
    var base = el('div', 'nv-base abierto');
    base.appendChild(el('p', 'nv-btn nv-btn-base', '<span class="nv-nom">' + md(T(B.nombre)) + '</span>'));
    base.appendChild(el('p', 'nv-items nv-linea', B.elementos.map(function (x) { return '<span>' + md(T(x)) + '</span>'; }).join('<span class="sep" aria-hidden="true">' + esc(B.separador || ' · ') + '</span>')));
    caja.appendChild(base);
    raiz.appendChild(caja);
    if (!reducido) {
      Array.prototype.forEach.call(caja.querySelectorAll('.nv-grupo, .nv-base'), function (x, j) {
        if (x.animate) x.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: j * 70, fill: 'backwards' });
      });
    }
    // todo el texto a la vista: la letra baja hasta que todo cabe
    function ajustar() {
      var tam = 17; caja.style.fontSize = tam + 'px';
      while ((caja.scrollHeight > caja.clientHeight + 1 || caja.scrollWidth > caja.clientWidth + 1) && tam > 9.5) { tam -= 0.5; caja.style.fontSize = tam + 'px'; }
    }
    alRedimensionar.push(ajustar);
    Esc.registrar(['figura']);
    Esc.marcar('figura');
    ajustar();
  }
})();
