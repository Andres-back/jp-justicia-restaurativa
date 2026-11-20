/* Diagramas interactivos de las figuras de la ficha (Justicia restaurativa, 18/11/2026). Un recurso dirigido por datos:
   index.html?f=<id> lee la figura de window.FIGURAS_TEXTO (datos.js, copia de plan/figuras-texto.json) y la dibuja
   según su tipo:
     ruta       de solo rótulos: ruta continua numerada de un vistazo (filas en zigzag unidas por una línea con flechas, las
                ramas colgando de su paso), sin clics (19/11/2026);
                con texto: el paso abierto con su texto completo (14 px o más) y un solo botón de avance; si no cabe, columnas;
     triangulo  ejes en círculos que se cruzan y una frase en cada lado del triángulo, todo a la vista;
     matriz     tabla: fija a la vista (Figuras 4 y 6 de la U2: partida por filas si no cabe entera), por fila (lista + panel con las columnas) o por casilla (lector por partes);
     tarjetas   puntos independientes (lista + panel);
     capas      círculos concéntricos, cada capa con sus integrantes completos (panel en columnas o ventana amplia, sin partes);
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
    c.classList.remove('partido', 'desplaza'); c.onscroll = null; c.scrollTop = 0; this.sec.classList.remove('con-mas');
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
    var ok = repartir();
    while (!ok && t > 12) { t -= 1; c.style.fontSize = t + 'px'; ok = repartir(); }
    if (!ok) { this.desplazar(o); return; }
    this.paginas = pags;
    this.ver(0);
  };
  /* Ni por partes cabe (celular, con el alto que se ve del marco; qa_cortes del 19/11/2026: una oración no cabía ni con 12 px): el
     texto completo, con 14 px, se desplaza dentro del panel con «Desplace para ver más»; queda leído al llegar al final. */
  Panel.prototype.desplazar = function (o) {
    var c = this.cuerpo, yo = this;
    c.classList.remove('partido'); c.classList.add('desplaza');
    this.nav.hidden = true;
    c.style.fontSize = '14px';
    c.innerHTML = o.bloques.join('');
    this.paginas = [o.bloques]; this.i = 0;
    function revisar() {
      var quedan = c.scrollTop + c.clientHeight < c.scrollHeight - 4;
      yo.sec.classList.toggle('con-mas', quedan);
      if (!quedan && yo.clave && !Esc.leido(yo.clave)) { Esc.marcar(yo.clave); if (yo.alFin) yo.alFin(); }
    }
    c.onscroll = revisar; c.scrollTop = 0; revisar();
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
      // «¡Siga aquí!» solo en la primera parte: después, a su lado está «Anterior» y lo taparía
      this.sig.classList.toggle('globo-siga', i === 0 && n > 1);
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
  // en la lección angosta cambió lo que se ve del marco (index.html): se recompone en el acto, sin esperar
  window.addEventListener('alto-visible', function () { clearTimeout(rt); alRedimensionar.forEach(function (f) { f(); }); });
  // al quedar algo «Leído» cambian la marca y el estado de los botones: se vuelven a encajar sus rótulos (sin reabrir nada)
  var alLeer = [];
  document.addEventListener('esc:leido', function () { alLeer.forEach(function (f) { f(); }); });
  // con las fuentes del kit ya cargadas, las medidas cambian: se vuelve a encajar todo
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alRedimensionar.forEach(function (f) { f(); }); });
  // una fuente que llega después (Montserrat, Roboto) cambia las medidas: se vuelve a encajar todo
  if (document.fonts && document.fonts.addEventListener) {
    var rf; document.fonts.addEventListener('loadingdone', function () { clearTimeout(rf); rf = setTimeout(function () { alRedimensionar.forEach(function (f) { f(); }); }, 60); });
  }
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

  /* Infografía de un vistazo (figuras de solo rótulos, como jr-u1-p18). Revisión del 19/11/2026: 13 clics para leer rótulos de una o
     dos palabras → todo a la vista, sin clics. Después Juan, de la versión en columnas con flechas sueltas al pie: «esas flechas no se
     entiende muy bien como va, busquemos como organizarlo mejor». Ahora es una ruta continua numerada: los pasos van en filas (1 a 7 y
     8 a 13; en tres filas si así cabe con letra más grande) unidas por una sola línea con una flecha en cada tramo, en zigzag (la fila
     siguiente vuelve por el otro lado, como un camino). Las ramas de cada paso cuelgan debajo de él: en llave, como en la figura, o,
     si no caben a lo ancho, como etiquetas una debajo de otra. En una pantalla angosta la ruta baja en una sola columna, con la línea
     a la izquierda, y si no cabe se desplaza dentro de su caja con «Desplace para ver más». Ningún clic obligatorio: queda vista al
     abrirse (o al llegar al final, si se desplaza). */
  function vistazo(P) {
    sinAviso = true;
    var N = P.length;
    guia.textContent = 'Siga la ruta en orden, del 1 al ' + N + '; las ramas de cada paso van debajo de él.';
    var caja = el('div', 'fv');
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(T(C.encabezado))));
    var lienzo = el('div', 'fv-lienzo');
    var pista = el('div', 'fv-pista');
    pista.setAttribute('role', 'list');
    pista.setAttribute('aria-label', plano(fig.titulo));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'fv-linea'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<defs><marker id="fv-punta" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs><g class="fv-trazos"></g>';
    lienzo.appendChild(pista); caja.appendChild(lienzo); raiz.appendChild(caja);

    // Ramas como etiquetas colgantes: cada rama en su recuadro; una rama con hijas las lleva dentro, debajo de su nombre
    function etiqueta(r, hija) { return '<span class="fv-tag' + (hija ? ' hija' : '') + '">' + md(T(r)) + '</span>'; }
    function colganteHTML(ramas) {
      return '<div class="fv-colg">' + ramas.map(function (r) {
        if (!r.ramas) return '<div class="fv-grupo solo">' + etiqueta(r) + '</div>';
        return '<div class="fv-grupo">' + etiqueta(r) + '<div class="fv-hijas">' + r.ramas.map(function (s) { return etiqueta(s, true); }).join('') + '</div></div>';
      }).join('') + '</div>';
    }
    function paso(p, i, estilo) {
      var b = el('div', 'fv-paso' + (p.ramas ? ' con-ramas' : ''));
      b.setAttribute('role', 'listitem');
      b.innerHTML = '<p class="fv-rot' + (p.recuadro ? ' recuadro' : '') + '"><span class="fv-n" aria-hidden="true">' + esc(p.numero || (i + 1)) +
        '</span><span class="fv-t">' + md(T(p.rotulo)) + '</span></p>' +
        (p.ramas ? '<div class="fv-cuelga ' + estilo + '">' + (estilo === 'llaves' ? ramasHTML(p.ramas) : colganteHTML(p.ramas)) + '</div>' : '');
      return b;
    }
    // cada paso en sus dos formas (un paso sin ramas es el mismo en las dos)
    var V = { llaves: [], colgante: [] };
    P.forEach(function (p, i) { V.llaves.push(paso(p, i, 'llaves')); V.colgante.push(p.ramas ? paso(p, i, 'colgante') : V.llaves[i]); });

    // Repartos en filas que se prueban, de menos a más filas (como mucho 7 pasos por fila), y en cada número de filas los que llevan
    // un paso de más en la primera, en la del medio o en la última: 13 → 7 + 6, 6 + 7, 5 + 4 + 4, 4 + 5 + 4 y 4 + 4 + 5
    var REPARTOS = [];
    for (var R = 1; R <= 3; R++) {
      if (Math.ceil(N / R) > 7 || (R > 1 && N < R * 2)) continue;
      var q = Math.floor(N / R), r = N % R, vistos = {};
      for (var c = 0; c < R; c++) {
        var a = []; for (var j = 0; j < R; j++) a.push(q + ((j - c + R) % R < r ? 1 : 0));
        if (!vistos[a]) { vistos[a] = 1; REPARTOS.push(a); }
      }
    }
    if (!REPARTOS.length) REPARTOS.push([Math.ceil(N / 3), Math.ceil(N / 3), N - 2 * Math.ceil(N / 3)]);

    var estilo = [], filas = [];
    function armar(rep) {
      pista.innerHTML = ''; pista.appendChild(svg); filas = [];
      var i0 = 0;
      rep.forEach(function (n, r) {
        var f = el('div', 'fv-fila' + (r % 2 ? ' inversa' : ''));
        f.setAttribute('role', 'none');
        for (var i = i0; i < i0 + n; i++) { V.llaves[i].querySelector('.fv-rot').style.minHeight = V.colgante[i].querySelector('.fv-rot').style.minHeight = ''; f.appendChild(V[estilo[i]][i]); }
        pista.appendChild(f); filas.push({ el: f, ini: i0, n: n, inversa: r % 2 === 1 }); i0 += n;
      });
    }
    // un texto se sale a lo ancho de su caja (rótulo del paso, rama o etiqueta; la etiqueta de una rama, de su recuadro)
    function sale(e) {
      var caja = e.classList.contains('fv-t') ? e.parentNode : e.classList.contains('fv-tag') && !e.classList.contains('hija') ? e.parentNode : e;
      var r = caja.getBoundingClientRect(), g = document.createRange(); g.selectNodeContents(e);
      var t = g.getBoundingClientRect();
      return t.width > 0 && (t.left < r.left - 0.5 || t.right > r.right + 0.5);
    }
    // Cabe a lo ancho: cada paso dentro de su fila y cada pieza dentro de su paso, comparando cajas (en la fila que vuelve de derecha a
    // izquierda lo que sobra sale por la izquierda, donde el ancho desplazable no lo cuenta), y ningún texto fuera de su recuadro
    function dentro(a, b) { return a.left >= b.left - 0.5 && a.right <= b.right + 0.5; }
    function anchoFila(f) {
      var rf = f.getBoundingClientRect();
      var ok = Array.prototype.every.call(f.children, function (p) {
        var rp = p.getBoundingClientRect();
        return dentro(rp, rf) && Array.prototype.every.call(p.querySelectorAll('.fv-rot,.fv-cuelga,.ramas,.rama-txt,.fv-grupo,.fv-tag.hija'), function (e) {
          return dentro(e.getBoundingClientRect(), rp);
        });
      });
      return ok && !Array.prototype.some.call(f.querySelectorAll('.rama-txt,.fv-tag,.fv-t'), sale);
    }
    // Una fila con las ramas en etiquetas (lo más angosto) tiene que caber a lo ancho. Después, del paso más alto al más bajo, sus
    // ramas pasan a llave (como en la figura) si así la fila sigue cabiendo a lo ancho y no queda más alta.
    function ajustarFila(f) {
      if (!anchoFila(f.el)) return false;
      var orden = [];
      for (var i = f.ini; i < f.ini + f.n; i++) if (P[i].ramas) orden.push(i);
      orden.sort(function (a, b) { return V.colgante[b].offsetHeight - V.colgante[a].offsetHeight; });
      orden.forEach(function (i) {
        var alto = f.el.offsetHeight;
        f.el.replaceChild(V.llaves[i], V.colgante[i]);
        if (anchoFila(f.el) && f.el.offsetHeight <= alto) estilo[i] = 'llaves';
        else f.el.replaceChild(V.colgante[i], V.llaves[i]);
      });
      return true;
    }
    // los rótulos de una fila, del mismo alto: la línea pasa por el centro de todos
    function igualar() {
      filas.forEach(function (f) {
        var rots = Array.prototype.map.call(f.el.children, function (p) { var r = p.querySelector('.fv-rot'); r.style.minHeight = ''; return r; });
        if (pista.classList.contains('en-columna')) return;
        var h = Math.max.apply(null, rots.map(function (r) { return r.getBoundingClientRect().height; }));
        rots.forEach(function (r) { r.style.minHeight = h + 'px'; });
      });
    }
    function cabeAlto() { return pista.offsetHeight <= lienzo.clientHeight + 1; }
    // 0: no cabe a lo ancho; 1: cabe a lo ancho, no a lo alto; 2: cabe
    function enFilas(rep, t) {
      caja.style.fontSize = t + 'px';
      pista.className = 'fv-pista en-filas' + (rep.length > 1 ? ' carril-d' : '') + (rep.length > 2 ? ' carril-i' : '');
      for (var i = 0; i < N; i++) estilo[i] = 'colgante';
      armar(rep);
      for (var r = 0; r < filas.length; r++) if (!ajustarFila(filas[r])) return 0;
      igualar();
      return cabeAlto() ? 2 : 1;
    }
    function enColumna(t) {
      caja.style.fontSize = t + 'px';
      pista.className = 'fv-pista en-columna';
      for (var i = 0; i < N; i++) estilo[i] = 'colgante';
      armar([N]);
      igualar();
      return anchoFila(filas[0].el) && cabeAlto();
    }

    // La línea de la ruta: un tramo con flecha de cada paso al siguiente; entre filas, la vuelta por el carril del lado
    function dibujar() {
      var g = svg.querySelector('.fv-trazos');
      var base = pista.getBoundingClientRect(), W = pista.offsetWidth, H = pista.offsetHeight;
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var fs = parseFloat(getComputedStyle(caja).fontSize), cs = getComputedStyle(pista);
      var m = svg.querySelector('marker'), pt = Math.max(7, Math.round(fs * 0.62));
      m.setAttribute('markerWidth', pt); m.setAttribute('markerHeight', pt);
      function R(e) { var r = e.getBoundingClientRect(); return { l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, cy: (r.top + r.bottom) / 2 - base.top }; }
      var rots = Array.prototype.map.call(pista.querySelectorAll('.fv-rot'), R);
      var nums = Array.prototype.map.call(pista.querySelectorAll('.fv-n'), R);
      var fila = [];
      filas.forEach(function (f, k) { for (var i = f.ini; i < f.ini + f.n; i++) fila[i] = k; });
      var columna = pista.classList.contains('en-columna'), sep = 2, d = [];
      var cd = W - parseFloat(cs.paddingRight) / 2, ci = parseFloat(cs.paddingLeft) / 2;
      for (var i = 0; i < N - 1; i++) {
        var a = rots[i], b = rots[i + 1];
        if (columna) {
          var x = (nums[i].l + nums[i].r) / 2;
          d.push('M' + x + ' ' + (a.b + sep) + 'V' + (b.t - sep));
        } else if (fila[i] === fila[i + 1]) {
          d.push(filas[fila[i]].inversa ? 'M' + (a.l - sep) + ' ' + a.cy + 'H' + (b.r + sep) : 'M' + (a.r + sep) + ' ' + a.cy + 'H' + (b.l - sep));
        } else {
          var der = !filas[fila[i]].inversa, y1 = a.cy, y2 = b.cy, rr = Math.min(fs * 0.7, (y2 - y1) / 2);
          if (der) d.push('M' + (a.r + sep) + ' ' + y1 + 'H' + (cd - rr) + 'Q' + cd + ' ' + y1 + ' ' + cd + ' ' + (y1 + rr) + 'V' + (y2 - rr) +
            'Q' + cd + ' ' + y2 + ' ' + (cd - rr) + ' ' + y2 + 'H' + (b.r + sep));
          else d.push('M' + (a.l - sep) + ' ' + y1 + 'H' + (ci + rr) + 'Q' + ci + ' ' + y1 + ' ' + ci + ' ' + (y1 + rr) + 'V' + (y2 - rr) +
            'Q' + ci + ' ' + y2 + ' ' + (ci + rr) + ' ' + y2 + 'H' + (b.l - sep));
        }
      }
      g.innerHTML = d.map(function (x) { return '<path d="' + x + '" marker-end="url(#fv-punta)"/>'; }).join('');
    }

    var LETRAS = [];
    for (var lt = 16; lt >= 11.5; lt -= 0.5) LETRAS.push(lt);
    var primera = true;
    function componer() {
      lienzo.classList.remove('desplaza'); lienzo.scrollTop = 0;
      var listo = false, t, k, ancho = lienzo.clientWidth >= 560;
      // en cada reparto, la letra más grande con la que la ruta cabe completa (búsqueda binaria de 16 a 11,5 px); gana la más grande
      // y, con la misma letra, el reparto de menos filas (y el de la fila más larga primero: 7 + 6)
      if (ancho) {
        var mejor = null;
        REPARTOS.forEach(function (rep) {
          var lo = 0, hi = LETRAS.length - 1;
          if (mejor) hi = mejor.i - 1;
          if (hi < 0 || enFilas(rep, LETRAS[hi]) !== 2) return;
          while (lo < hi) { var mid = (lo + hi) >> 1; if (enFilas(rep, LETRAS[mid]) === 2) hi = mid; else lo = mid + 1; }
          mejor = { rep: rep, i: hi };
        });
        if (mejor) { enFilas(mejor.rep, LETRAS[mejor.i]); listo = true; }
      }
      if (!listo) for (t = 16; t >= 12.5 && !listo; t -= 0.5) listo = enColumna(t);
      if (!listo) {
        // ni así cabe: con letra de 14 px, la ruta se desplaza dentro de su caja (en filas si cabe a lo ancho; si no, en columna)
        lienzo.classList.add('desplaza');
        var hecho = false;
        if (ancho) for (k = 0; k < REPARTOS.length && !hecho; k++) hecho = enFilas(REPARTOS[k], 14) > 0;
        if (!hecho) enColumna(14);
      }
      dibujar();
      revisar();
      if (primera && !reducido) {
        Array.prototype.forEach.call(pista.querySelectorAll('.fv-paso'), function (b, i) {
          if (b.animate) b.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: i * 12, fill: 'backwards' });
        });
      }
      primera = false;
    }
    // se desplaza: «Desplace para ver más» mientras quede ruta abajo; vista al llegar al final
    function revisar() {
      var quedan = lienzo.classList.contains('desplaza') && lienzo.scrollTop + lienzo.clientHeight < lienzo.scrollHeight - 4;
      caja.classList.toggle('con-mas', quedan);
      if (!quedan) Esc.marcar('figura');
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
    function revisarCols() {
      var quedan = cols.classList.contains('desplaza') && cols.scrollTop + cols.clientHeight < cols.scrollHeight - 4;
      caja.classList.toggle('con-mas', quedan);
      if (!quedan) Esc.marcar('columnas');
    }
    function componer() {
      caja.classList.remove('en-columnas', 'con-mas');
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
     completa a la vista, fija»; Figura 4: «tabla HTML fija, sin clics»). Todas las filas y columnas con su texto literal.
     Para caber entera, la letra baja de 15 a 13 px, se prueban anchos de la primera columna y, si hace falta, un relleno más
     estrecho (clase «densa»). Si ni así cabe:
     - las figuras de PARTIR_FILAS (revisión final de la U2, 20/11/2026: Juan, «la tabla completa a la vista, fija», y Samir aprobó
       partirlas) se parten por filas, en orden y sin perder ninguna casilla: «Ver filas: 1 a 4 · 5 a 7» junto al encabezado. Cada
       parte cabe entera con la cabecera de columnas y sin desplazar; todas con la misma letra; el menor número de partes;
     - las demás se desplazan y lo dicen (revisión de la U4, 19/11/2026: degradado y «Desplace para ver más filas», clase «con-mas»).
     Queda leída cada parte al verla entera con el reparto vigente (o la tabla, al llegar al final). */
  function matrizFija() {
    var PARTIR_FILAS = ['jr-u2-p56', 'jr-u2-p64'];
    guia.textContent = 'Lea la tabla completa.';
    var cols = C.columnas, vacias = C.columnas_vacias || [], caja = el('div', 'mf');
    var cab = el('div', 'mf-cab');
    if (C.encabezado) cab.appendChild(el('p', 'diag-enc', md(C.encabezado)));
    var selector = el('div', 'mf-partes');
    selector.setAttribute('role', 'group'); selector.setAttribute('aria-label', 'Partes de la tabla');
    selector.hidden = true;
    cab.appendChild(selector);
    caja.appendChild(cab);
    var marco = el('div', 'mf-marco');
    marco.tabIndex = 0;
    var t = '<table class="mf-tabla" id="mf-tabla"><thead><tr>' + cols.map(function (c, j) { return vacias.indexOf(j) >= 0 ? '' : '<th scope="col">' + md(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      C.filas.map(function (f) {
        return '<tr>' + f.celdas.map(function (c, j) {
          if (j && vacias.indexOf(j) >= 0) return '';
          var html = Array.isArray(c) ? (c.length ? '<ul class="vinetas">' + c.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>' : '') : md(c);
          // el nombre de la columna va también en la casilla: solo se ve con la tabla apilada (celular), donde no hay cabecera
          return j ? '<td><span class="mf-col">' + md(cols[j]) + '</span>' + html + '</td>' : '<th scope="row"><span class="mf-col">' + md(cols[0]) + '</span>' + html + '</th>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    marco.innerHTML = t;
    caja.appendChild(marco);
    raiz.appendChild(caja);
    var tabla = marco.querySelector('.mf-tabla');
    var filas = Array.prototype.slice.call(tabla.querySelectorAll('tbody tr'));
    var partir = PARTIR_FILAS.indexOf(fig.id) >= 0;
    var ANCHOS = ['10%', '13%', '18%', '24%']; // de la más angosta a la más ancha: más ancho para las columnas de texto
    var LETRAS = [15, 14.5, 14, 13.5, 13];
    var grupos = null, actual = 0, clave = 'tabla';
    function cabeT() { return marco.scrollHeight <= marco.clientHeight + 1 && marco.scrollWidth <= marco.clientWidth + 1; }
    function mostrarFilas(a, b) { filas.forEach(function (tr, i) { tr.hidden = i < a || i > b; }); }
    // con esta letra, ¿algún ancho de primera columna y relleno (normal, luego estrecho) deja caber entero cada grupo de filas?
    function cabeCon(letra, gs) {
      tabla.style.fontSize = letra + 'px';
      for (var d = 0; d < 2; d++) {
        caja.classList.toggle('densa', d === 1);
        for (var k = 0; k < ANCHOS.length; k++) {
          tabla.style.setProperty('--mf-col1', ANCHOS[k]);
          if (gs.every(function (g) { mostrarFilas(g[0], g[1]); return cabeT(); })) return true;
        }
      }
      return false;
    }
    // n grupos de filas seguidas, del mismo tamaño (los primeros con una fila más)
    function repartir(n) {
      var gs = [], a = 0, base = Math.floor(filas.length / n), resto = filas.length % n;
      for (var i = 0; i < n; i++) { var c = base + (i < resto ? 1 : 0); gs.push([a, a + c - 1]); a += c; }
      return gs;
    }
    function claveDe(g) { return 'filas-' + (g[0] + 1) + '-' + (g[1] + 1); }
    function rotulo(g) { var a = g[0] + 1, b = g[1] + 1; return a === b ? String(a) : b === a + 1 ? a + ' y ' + b : a + ' a ' + b; }
    function pintarSelector(gs) {
      selector.innerHTML = '';
      selector.hidden = !gs;
      if (!gs) return;
      selector.appendChild(el('span', 'mf-partes-rot', 'Ver filas:'));
      gs.forEach(function (g, i) {
        var b = boton(claveDe(g), 'mf-parte', '<span>' + rotulo(g) + '</span><i class="fas fa-circle-check" aria-hidden="true"></i>');
        b.setAttribute('aria-label', (g[0] === g[1] ? 'Ver fila ' : 'Ver filas ') + rotulo(g));
        b.setAttribute('aria-controls', 'mf-tabla');
        b.setAttribute('data-latir', '');
        b.addEventListener('click', function () { mostrar(i); });
        selector.appendChild(b);
      });
    }
    function mostrar(i) {
      actual = i;
      var g = grupos[i];
      mostrarFilas(g[0], g[1]);
      clave = claveDe(g);
      Array.prototype.forEach.call(selector.querySelectorAll('.mf-parte'), function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      marco.scrollTop = 0;
      revisar();
    }
    function ajustar() {
      var fila0 = grupos ? grupos[actual][0] : 0, hecho = false, i, n;
      grupos = null; pintarSelector(null); mostrarFilas(0, filas.length - 1);
      caja.classList.remove('apilada', 'densa');
      // 1. la tabla entera, con la letra más grande con la que cabe
      for (i = 0; i < LETRAS.length && !hecho; i++) hecho = cabeCon(LETRAS[i], [[0, filas.length - 1]]);
      if (!hecho) {
        caja.classList.remove('densa');
        tabla.style.fontSize = '13px';
        // 2. más ancha que su caja aun con 13 px (celular): filas apiladas, cada casilla con el nombre de su columna
        var aLoAncho = ANCHOS.some(function (w) { tabla.style.setProperty('--mf-col1', w); return marco.scrollWidth <= marco.clientWidth + 1; });
        if (!aLoAncho) caja.classList.add('apilada');
        if (partir) {
          // 3. partida por filas: el menor número de partes en que cada una cabe entera y, con él, la letra más grande
          var letras = aLoAncho ? LETRAS : [14, 13.5, 13];
          for (n = 2; n <= filas.length && !hecho; n++) {
            var gs = repartir(n);
            pintarSelector(gs);
            for (i = 0; i < letras.length && !hecho; i++) if (cabeCon(letras[i], gs)) { grupos = gs; hecho = true; }
          }
          // ni una fila sola cabe: una fila por parte, y la que no quepa se desplaza con su señal
          if (!hecho) { grupos = repartir(filas.length); pintarSelector(grupos); caja.classList.remove('densa'); tabla.style.fontSize = aLoAncho ? '13px' : '14px'; }
        } else if (aLoAncho) {
          // 4. se desplaza: el ancho de primera columna que deja menos por desplazar
          var menor = Infinity, mejor = ANCHOS[0];
          ANCHOS.forEach(function (w) { tabla.style.setProperty('--mf-col1', w); if (marco.scrollWidth <= marco.clientWidth + 1 && marco.scrollHeight < menor) { menor = marco.scrollHeight; mejor = w; } });
          tabla.style.setProperty('--mf-col1', mejor);
        } else tabla.style.fontSize = '14px';
      }
      Esc.registrar(grupos ? grupos.map(claveDe) : ['tabla']);
      if (grupos) {
        // la parte que se veía sigue a la vista (la que tenga su primera fila)
        var k = 0;
        grupos.forEach(function (g, j) { if (fila0 >= g[0] && fila0 <= g[1]) k = j; });
        mostrar(k);
      } else {
        clave = 'tabla';
        mostrarFilas(0, filas.length - 1);
        revisar();
      }
    }
    function revisar() {
      var quedan = marco.scrollTop + marco.clientHeight < marco.scrollHeight - 4;
      caja.classList.toggle('con-mas', quedan);
      if (!quedan && !Esc.leido(clave)) Esc.marcar(clave);
    }
    marco.addEventListener('scroll', revisar);
    if (window.ResizeObserver) new ResizeObserver(revisar).observe(tabla);
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
  /* Cada capa se lee completa, sin partes ni desplazamiento (Samir, 20/11/2026: «no podemos dejar información incompleta o
     cortada»; antes «Nivel interinstitucional» salía en «Parte 1 de 3» y, en el celular, «FGN articula el modelo» también).
     - Los círculos ocupan solo el ancho que pide su alto; el panel se queda con el resto y reparte los integrantes de la capa en las
       columnas que hagan falta, con la letra más grande que entre (de 20 a 13 px). El detalle de la capa va junto a su nombre.
     - Si alguna capa no cabe así (pantalla angosta), los círculos se quedan con todo el espacio y cada capa se abre en una ventana
       amplia, con el mismo ajuste. Solo si ni así cabe con 13 px, la ventana se desplaza con «Desplace para ver más». */
  function capas() {
    guia.textContent = 'Haga clic en cada círculo, del centro hacia afuera, para leer su contenido.';
    var K = C.capas;
    var caja = el('div', 'cp');
    if (C.encabezado) caja.appendChild(el('p', 'diag-enc', md(C.encabezado)));
    var pista = el('p', 'cp-pista', 'Haga clic en cada círculo, del centro hacia afuera.');
    caja.appendChild(pista);
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
    var cab = np.sec.querySelector('.panel-cab'), cuerpo = np.sec.querySelector('.panel-cuerpo');
    var INICIO = '<i class="fas fa-circle-nodes" aria-hidden="true"></i><p>Haga clic en el círculo central para empezar.</p>';
    inicioPanel(np.sec, INICIO);
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
    function titulo(k) { return k.nombre.map(md).join(' '); }
    function miembros(k) { return '<div class="miembros">' + k.elementos.map(miembro).join('') + '</div>'; }
    // La letra más grande (20 a 13 px) y las columnas (de 1 a tantas como integrantes, de 9,5 em o más) con las que la capa cabe
    // completa en su caja; con la misma letra, menos columnas. 0 si no cabe ni con 13 px.
    function ajustar(c, k) {
      var n = k.elementos.length, W = c.clientWidth;
      for (var t = 20; t >= 13; t -= 0.5) {
        c.style.fontSize = t + 'px';
        for (var cols = 1; cols <= n; cols++) {
          if (cols > 1 && W / cols < 9.5 * t) break;
          c.style.setProperty('--cols', cols);
          if (cabe(c)) return t;
        }
      }
      c.style.fontSize = '13px'; c.style.setProperty('--cols', 1);
      return 0;
    }
    function pintarPanel(k) {
      cab.innerHTML = '<h2 class="panel-tit">' + titulo(k) + '</h2>' + (k.detalle ? '<p class="cp-detalle">' + md(k.detalle) + '</p>' : '');
      cab.hidden = false;
      cuerpo.innerHTML = miembros(k);
      return ajustar(cuerpo, k);
    }
    // ¿caben todas las capas en el panel? Si no, cada capa se abre en una ventana
    var enVentana = false, activa = -1;
    function decidir() {
      caja.classList.remove('en-ventana');
      // los círculos, del ancho de su alto (como mucho la mitad): el panel se queda con el resto
      var r = marco.getBoundingClientRect();
      caja.style.setProperty('--cp-izq', Math.round(Math.min(r.height, caja.clientWidth * 0.5)) + 'px');
      enVentana = !K.every(pintarPanel);
      caja.classList.toggle('en-ventana', enVentana);
      if (enVentana || activa < 0) inicioPanel(np.sec, INICIO);
      else mostrarEnPanel(activa);
    }
    function mostrarEnPanel(i) {
      pintarPanel(K[i]);
      if (!reducido && cuerpo.animate) cuerpo.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 230 });
      Esc.marcar(K[i].id);
    }
    function mostrarEnVentana(i) {
      var k = K[i];
      var c = Kit.ventana(plano(k.nombre.join(' ')), (k.detalle ? '<p class="cp-detalle">' + md(k.detalle) + '</p>' : '') + miembros(k), {
        alCerrar: function () { fondo.classList.remove('cp-ventana'); c.onscroll = null; v.classList.remove('con-mas'); }
      });
      var fondo = c.closest('.ventana-fondo'), v = c.closest('.ventana');
      fondo.classList.add('cp-ventana');
      ajustar(c, k);
      function revisar() {
        var quedan = c.scrollTop + c.clientHeight < c.scrollHeight - 2;
        v.classList.toggle('con-mas', quedan);
        if (!quedan) Esc.marcar(k.id);
      }
      c.scrollTop = 0; c.onscroll = revisar; revisar();
    }
    function abrir(i) {
      activa = i;
      caja.setAttribute('data-activo', K[i].id);
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-btn'), function (b, j) { b.classList.toggle('activo', j === i); });
      Array.prototype.forEach.call(anillos.querySelectorAll('.cp-c'), function (c) { c.classList.toggle('activo', c.getAttribute('data-capa') === K[i].id); });
      if (enVentana) mostrarEnVentana(i); else mostrarEnPanel(i);
      pintar();
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
    alRedimensionar.push(decidir);
    Esc.registrar(K.map(function (k) { return k.id; }));
    decidir();
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
