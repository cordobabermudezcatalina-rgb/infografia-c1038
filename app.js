/* =========================================================
   Sentencia C-1038/02 · Infografía interactiva
   JavaScript sin dependencias: arrastrar y soltar, juegos y navegación.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Almacenamiento seguro (solo comodidad: posiciones de tarjetas) ---------- */
  var STORE_KEY = 'c1038:pos:v1';
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function saveStore(obj) { try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* sin almacenamiento */ } }
  var positions = loadStore();

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  function gridSize() {
    var g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid'));
    return isNaN(g) ? 40 : g;
  }
  function svgIcon(id, cls) {
    return '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  /* =========================================================
     1. BARRA SUPERIOR: cenefa de avance, sección activa, menú móvil
     ========================================================= */
  var cenefa = $('#cenefa');
  var cenefaBars = [];
  function buildCenefa() {
    if (!cenefa) return;
    var n = window.innerWidth < 720 ? 16 : 22;
    var maxW = window.innerWidth < 720 ? 7 : 9;
    if (cenefaBars.length === n) return;
    cenefa.innerHTML = '';
    cenefaBars = [];
    for (var i = 0; i < n; i++) {
      var b = document.createElement('i');
      b.style.width = (2 + (maxW - 2) * i / (n - 1)).toFixed(1) + 'px';
      cenefa.appendChild(b);
      cenefaBars.push(b);
    }
    updateProgress();
  }
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    var on = Math.round(p * cenefaBars.length);
    cenefaBars.forEach(function (b, i) { b.classList.toggle('on', i < on); });
    if (cenefa) cenefa.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
  var staticCenefa = $('.cenefa-static');
  if (staticCenefa) {
    for (var ci = 0; ci < 26; ci++) {
      var sb = document.createElement('i');
      sb.style.width = (3 + 13 * ci / 25).toFixed(1) + 'px';
      staticCenefa.appendChild(sb);
    }
  }

  var sections = $$('main > .sec');
  var navLinks = $$('.topnav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === id); });
        $$('.sheet a').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  var menuBtn = $('#menuBtn'), sheet = $('#topnav-sheet');
  if (menuBtn && sheet) {
    sheet.innerHTML = $('.topnav').innerHTML;
    menuBtn.addEventListener('click', function () {
      var open = sheet.hasAttribute('hidden');
      if (open) sheet.removeAttribute('hidden'); else sheet.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a')) { sheet.setAttribute('hidden', ''); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ←/→ para pasar de sección (útil al proyectar) */
  function currentSectionIndex() {
    var y = window.scrollY + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar')) || 64) + 12;
    var idx = 0;
    sections.forEach(function (s, i) { if (s.offsetTop <= y) idx = i; });
    return idx;
  }
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var a = document.activeElement;
    if (a && (a.matches('input, textarea, select, [contenteditable]') || a.classList.contains('grip'))) return;
    var i = currentSectionIndex() + (e.key === 'ArrowRight' ? 1 : -1);
    if (i < 0 || i >= sections.length) return;
    e.preventDefault();
    sections[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* =========================================================
     2. TARJETAS MOVIBLES (se imantan a la retícula)
     ========================================================= */
  var zTop = 10;
  var suppressClick = false;

  function boardOf(el) { return el.closest('.board'); }
  function naturalPos(el, board) {
    // Posición del elemento dentro del tablero, ignorando su transformación
    var x = 0, y = 0, n = el;
    while (n && n !== board) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    if (n !== board) { // respaldo
      var r = el.getBoundingClientRect(), br = board.getBoundingClientRect();
      x = r.left - br.left - (parseFloat(el.style.getPropertyValue('--x')) || 0);
      y = r.top - br.top - (parseFloat(el.style.getPropertyValue('--y')) || 0);
    }
    return { x: x, y: y };
  }
  function getXY(el) {
    return { x: parseFloat(el.style.getPropertyValue('--x')) || 0, y: parseFloat(el.style.getPropertyValue('--y')) || 0 };
  }
  function setXY(el, x, y) {
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
  }
  function bounds(el, board, nat) {
    return {
      minX: -nat.x, maxX: board.clientWidth - el.offsetWidth - nat.x,
      minY: -nat.y, maxY: board.clientHeight - el.offsetHeight - nat.y
    };
  }
  function snapAndClamp(el, x, y) {
    var board = boardOf(el); if (!board) return { x: x, y: y };
    var nat = naturalPos(el, board), b = bounds(el, board, nat), g = gridSize();
    var sx = Math.round((nat.x + x) / g) * g - nat.x;
    var sy = Math.round((nat.y + y) / g) * g - nat.y;
    return { x: clamp(sx, b.minX, Math.max(b.minX, b.maxX)), y: clamp(sy, b.minY, Math.max(b.minY, b.maxY)) };
  }
  function persist(el) {
    var id = el.getAttribute('data-id'); if (!id) return;
    var p = getXY(el);
    if (p.x === 0 && p.y === 0) delete positions[id]; else positions[id] = [p.x, p.y];
    saveStore(positions);
  }

  function initDraggable(el) {
    var grip = $('.grip', el);
    if (grip) {
      grip.setAttribute('tabindex', '0');
      grip.setAttribute('role', 'button');
      grip.setAttribute('aria-label', 'Mover tarjeta. Usa las flechas del teclado.');
      grip.addEventListener('keydown', function (e) {
        var k = e.key, g = gridSize() * (e.shiftKey ? 4 : 1), p = getXY(el);
        var d = { ArrowLeft: [-g, 0], ArrowRight: [g, 0], ArrowUp: [0, -g], ArrowDown: [0, g] }[k];
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        var s = snapAndClamp(el, p.x + d[0], p.y + d[1]);
        setXY(el, s.x, s.y); persist(el);
      });
    }
    var saved = positions[el.getAttribute('data-id')];
    if (saved) setXY(el, saved[0], saved[1]);

    var start = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var onGrip = !!e.target.closest('.grip');
      if (e.pointerType === 'touch' && !onGrip) return;           // en táctil, solo desde la agarradera
      if (!onGrip && e.target.closest('a, input, textarea, select, .opt')) return;
      var p = getXY(el), board = boardOf(el);
      start = { px: e.clientX, py: e.clientY, x: p.x, y: p.y, moved: false, id: e.pointerId, board: board, nat: naturalPos(el, board) };
      if (onGrip) { e.preventDefault(); }
    });
    el.addEventListener('pointermove', function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (!start.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        start.moved = true;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* */ }
        el.classList.add('is-dragging');
        el.style.zIndex = String(++zTop);
      }
      e.preventDefault();
      var b = bounds(el, start.board, start.nat);
      setXY(el, clamp(start.x + dx, b.minX, Math.max(b.minX, b.maxX)), clamp(start.y + dy, b.minY, Math.max(b.minY, b.maxY)));
    });
    function end(e) {
      if (!start || (e && e.pointerId !== start.id)) return;
      if (start.moved) {
        el.classList.remove('is-dragging');
        var p = getXY(el), s = snapAndClamp(el, p.x, p.y);
        setXY(el, s.x, s.y);
        persist(el);
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
      }
      start = null;
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  // Evita que un arrastre dispare el clic (p. ej. voltear tarjeta)
  document.addEventListener('click', function (e) {
    if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
  }, true);

  var draggables = $$('.drag');
  draggables.forEach(initDraggable);

  function reclampAll() {
    draggables.forEach(function (el) {
      var p = getXY(el);
      if (p.x === 0 && p.y === 0) return;
      var board = boardOf(el); if (!board) return;
      var nat = naturalPos(el, board), b = bounds(el, board, nat);
      setXY(el, clamp(p.x, b.minX, Math.max(b.minX, b.maxX)), clamp(p.y, b.minY, Math.max(b.minY, b.maxY)));
    });
  }
  function resetBoard(board) {
    $$('.drag', board).forEach(function (el) {
      setXY(el, 0, 0);
      el.style.zIndex = '';
      delete positions[el.getAttribute('data-id')];
      el.classList.remove('is-flipped');
      var fi = $('.flip-inner', el); if (fi) fi.setAttribute('aria-pressed', 'false');
    });
    saveStore(positions);
  }

  /* =========================================================
     3. CHIPS PARA JUEGOS (arrastrar a una zona, o tocar y luego tocar la zona)
     ========================================================= */
  function ChipGame(opts) {
    var root = opts.root, selected = null;
    var zones = $$(opts.zoneSelector, root);
    function zoneAt(x, y) {
      var el = document.elementFromPoint(x, y);
      var z = el && el.closest('.zone');
      return z && zones.indexOf(z) > -1 ? z : null;
    }
    function arm(on) { zones.forEach(function (z) { z.classList.toggle('is-armed', on); }); }
    // Barra «Enviar a…» bajo la ficha elegida: en celular evita bajar hasta la zona
    var sendBar = null;
    function removeSend() { if (sendBar) { sendBar.remove(); sendBar = null; } }
    function showSend(chip, focusFirst) {
      removeSend();
      if (!opts.labels) return;
      sendBar = document.createElement('div');
      sendBar.className = 'chip-send';
      sendBar.setAttribute('role', 'group');
      sendBar.setAttribute('aria-label', 'Enviar la ficha a una zona');
      var html = '<span>Enviar a</span>';
      zones.forEach(function (z) {
        var k = z.getAttribute('data-zone');
        if (opts.labels[k]) html += '<button type="button" data-send="' + k + '">' + opts.labels[k] + '</button>';
      });
      sendBar.innerHTML = html;
      chip.insertAdjacentElement('afterend', sendBar);
      if (focusFirst) { var b = $('button', sendBar); if (b) b.focus(); }
    }
    function clearSel() { if (selected) selected.classList.remove('is-selected'); selected = null; arm(false); removeSend(); }
    function drop(chip, zone) { clearSel(); opts.onDrop(chip, zone); }

    root.addEventListener('pointerdown', function (e) {
      var chip = e.target.closest('[data-chip]');
      if (!chip || !root.contains(chip) || chip.classList.contains('is-locked') || e.button !== 0) return;
      var st = { px: e.clientX, py: e.clientY, moved: false, id: e.pointerId, over: null };
      function move(ev) {
        if (ev.pointerId !== st.id) return;
        var dx = ev.clientX - st.px, dy = ev.clientY - st.py;
        if (!st.moved) {
          if (Math.abs(dx) + Math.abs(dy) < 6) return;
          st.moved = true;
          try { chip.setPointerCapture(ev.pointerId); } catch (err) { /* */ }
          chip.classList.add('is-dragging');
          chip.style.pointerEvents = 'none';
          clearSel();
        }
        ev.preventDefault();
        chip.style.setProperty('--x', dx + 'px');
        chip.style.setProperty('--y', dy + 'px');
        var z = zoneAt(ev.clientX, ev.clientY);
        if (z !== st.over) {
          if (st.over) st.over.classList.remove('is-over');
          if (z) z.classList.add('is-over');
          st.over = z;
        }
      }
      function up(ev) {
        if (ev.pointerId !== st.id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        // La zona se calcula antes de devolverle los eventos al chip (si no, el chip se tapa a sí mismo)
        var z = (st.moved && ev.type !== 'pointercancel') ? (zoneAt(ev.clientX, ev.clientY) || st.over) : null;
        chip.style.pointerEvents = '';
        if (st.over) st.over.classList.remove('is-over');
        if (!st.moved) return; // fue un toque: lo maneja 'click'
        chip.classList.remove('is-dragging');
        suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
        if (z) {
          chip.style.transition = 'none';
          chip.style.setProperty('--x', '0px'); chip.style.setProperty('--y', '0px');
          void chip.offsetWidth; chip.style.transition = '';
          drop(chip, z);
        } else {
          chip.style.setProperty('--x', '0px'); chip.style.setProperty('--y', '0px');
        }
      }
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    root.addEventListener('click', function (e) {
      var send = e.target.closest('[data-send]');
      if (send && selected) {
        var to = zones.filter(function (z) { return z.getAttribute('data-zone') === send.getAttribute('data-send'); })[0];
        var sc = selected;
        if (to) { drop(sc, to); if (e.detail === 0 && sc.isConnected) sc.focus(); }
        return;
      }
      var chip = e.target.closest('[data-chip]');
      if (chip && root.contains(chip)) {
        if (chip.classList.contains('is-locked')) { if (opts.onLockedClick) opts.onLockedClick(chip); return; }
        if (opts.singleZone) { drop(chip, zones[0]); return; }
        if (selected === chip) { clearSel(); return; }
        clearSel();
        selected = chip; chip.classList.add('is-selected'); arm(true);
        if (opts.labels) showSend(chip, e.detail === 0);
        else toast('Ahora toca la zona donde va');
        return;
      }
      var zone = e.target.closest('.zone');
      if (zone && zones.indexOf(zone) > -1 && selected) { drop(selected, zone); }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearSel(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('zone') && selected) {
        e.preventDefault(); drop(selected, e.target);
      }
    });
    return { clear: clearSel };
  }

  /* =========================================================
     4. SECCIÓN 01 · Normas demandadas contra el art. 116
     ========================================================= */
  var NORMAS = {
    a13: { t: 'Art. 13 · Decreto 2651 de 1991', dice: 'La solicitud de convocatoria debe reunir los requisitos de una demanda y se dirige al centro de arbitraje acordado.', acusa: 'Convierte al centro en la puerta de entrada del proceso arbitral.' },
    a15: { t: 'Art. 15 · Decreto 2651 de 1991', dice: 'Regula cómo se integra el tribunal: a qué centro va la solicitud, cómo se cita a los árbitros y qué pasa si no aceptan o si las partes no los nombran.', acusa: 'Permite que el centro designe árbitros que las partes no eligieron.' },
    a119: { t: 'Art. 119 · Ley 446 de 1998', dice: 'Reescribe los numerales 3 y 4 del art. 15: si el delegado no designa, «el Centro designará los árbitros», y «el Centro hará las designaciones que no hagan las partes».', acusa: 'El centro suple la voluntad de las partes.' },
    a121: { t: 'Art. 121 · Ley 446 de 1998', dice: 'Trámite inicial: «previo a la instalación del tribunal», la admisión, el traslado, la contestación y la conciliación se surten ante el Director del Centro, que puede delegarlas.', acusa: 'Son actos judiciales a cargo de quien no es árbitro.' },
    a122: { t: 'Art. 122 · Ley 446 de 1998', dice: 'Instalación: integrado el tribunal y fracasada la conciliación, el centro fija fecha y hora, y el Director entrega a los árbitros la actuación surtida.', acusa: 'Da por hecho que la conciliación ya ocurrió ante el centro.' }
  };
  var casoRoot = $('[data-board="caso"]'), normPool = $('#poolNormas'), normDone = $('#normasDone'), normReveal = $('#normReveal');
  var normRevealDefault = normReveal ? normReveal.innerHTML : '';
  function showNorm(key) {
    var n = NORMAS[key]; if (!n || !normReveal) return;
    normReveal.style.borderLeftColor = 'var(--naranja)';
    normReveal.innerHTML = '<h4>' + n.t + '</h4><dl><div><dt>Qué decía</dt><dd>' + n.dice + '</dd></div><div><dt>Por qué se acusó</dt><dd class="acusa">' + n.acusa + '</dd></div></dl>';
    normReveal.classList.remove('flash'); void normReveal.offsetWidth; normReveal.classList.add('flash');
    $$('.chip', normDone).forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-chip') === key); });
  }
  if (casoRoot && normPool) {
    ChipGame({
      root: casoRoot, zoneSelector: '#target116', singleZone: true,
      onDrop: function (chip) {
        var key = chip.getAttribute('data-chip');
        chip.classList.add('is-locked');
        if (!$('.ic', chip)) chip.insertAdjacentHTML('afterbegin', svgIcon('i-check'));
        normDone.appendChild(chip);
        showNorm(key);
        if (!normPool.children.length) toast('¡Listo! Revisaste las cinco normas demandadas');
      },
      onLockedClick: function (chip) { showNorm(chip.getAttribute('data-chip')); }
    });
  }
  function resetCaso() {
    $$('.chip', normDone).forEach(function (c) {
      c.classList.remove('is-locked', 'is-current');
      var ic = $('.ic', c); if (ic) ic.remove();
      normPool.appendChild(c);
    });
    // reordenar como al inicio
    ['a13', 'a15', 'a119', 'a121', 'a122'].forEach(function (k) { var c = $('[data-chip="' + k + '"]', normPool); if (c) normPool.appendChild(c); });
    normReveal.innerHTML = normRevealDefault;
    normReveal.style.borderLeftColor = '';
  }

  /* =========================================================
     5. SECCIÓN 02 · La balanza de las voces
     ========================================================= */
  var VOCES = {
    actor: { n: 'El demandante', side: 'in', icon: 'i-persona', arg: 'Los centros de arbitraje ejercen funciones judiciales sin ser árbitros, y eso viola el artículo 116. Se apoya en un auto del Consejo de Estado (7 de diciembre de 2000) que califica esas funciones como judiciales.', corte: 'En lo esencial, sí: la fase prearbitral es judicial.' },
    minjus: { n: 'Ministerio de Justicia y del Derecho', short: 'Ministerio de Justicia', side: 'ex', icon: 'i-centro', arg: 'Sobre los arts. 13 y 15 ya hay cosa juzgada (C-592/92). El centro hace labores de trámite e impulso, que le permiten al tribunal concentrarse en decidir. Pide condicionar: el centro solo designa árbitros con autorización expresa de las partes.', corte: 'En parte: la Corte adoptó su condicionamiento sobre la designación de árbitros, pero concluyó que la fase prearbitral sí es judicial.' },
    academia: { n: 'Academia Colombiana de Jurisprudencia', short: 'Academia de Jurisprudencia', side: 'in', icon: 'i-libro', arg: 'La función judicial no es solo el fallo: admitir, inadmitir o rechazar la demanda arbitral hace parte del proceso y no puede quedar en manos del director del centro. Pide una sentencia integradora: que el tribunal, ya instalado, haga el trámite inicial.', corte: 'Sí: eso fue, en esencia, lo que decidió la Corte sobre el art. 121.' },
    martinez: { n: 'Néstor Humberto Martínez Neira', short: 'N. H. Martínez Neira', side: 'mix', icon: 'i-persona', arg: 'Impugna la demanda: para él, la función del centro es administrativa, no judicial. Pero concluye que la «etapa prearbitral» es un cuerpo extraño al proceso y propone retirarla: en el mundo, los centros solo prestan apoyo administrativo y secretarial.', corte: 'En parte: la Corte rechazó su premisa (la función sí es judicial), pero coincidió en sacar al centro de las decisiones.' },
    procurador: { n: 'Procurador General de la Nación', short: 'Procurador General', side: 'ex', icon: 'i-balanza', arg: 'Concepto 2944: los centros cumplen funciones públicas, pero administrativas y no jurisdiccionales; sus actos se controlan ante lo contencioso administrativo (T-049/93).', corte: 'No: la Corte se apartó y concluyó que la fase prearbitral es jurisdiccional.' }
  };
  var SIDE_TXT = { ex: 'la exequibilidad', in: 'la inexequibilidad', mix: 'una posición mixta' };
  var vocesRoot = $('[data-board="voces"]'), balance = $('#balance'), voicePool = $('#poolVoces'), voicePanel = $('#voicePanel'), vocesScore = $('#vocesScore');
  var voicePanelDefault = voicePanel ? voicePanel.innerHTML : '';
  function countSide(side) { return $$('[data-zone="' + side + '"] .token', balance).length; }
  function updateBalance() {
    if (!balance) return;
    var ex = countSide('ex'), inn = countSide('in'), mix = countSide('mix');
    var tilt = clamp((inn - ex) * 6, -18, 18);
    balance.style.setProperty('--tilt', tilt + 'deg');
    var beam = $('.b-beam', balance);
    var half = beam ? beam.offsetWidth / 2 : 180;
    var dy = Math.sin(tilt * Math.PI / 180) * half;
    $('.plate--ex', balance).style.setProperty('--dy', (-dy).toFixed(1) + 'px');
    $('.plate--in', balance).style.setProperty('--dy', dy.toFixed(1) + 'px');
    vocesScore.textContent = 'Exequible ' + ex + ' · Inexequible ' + inn + ' · Mixta ' + mix;
  }
  function showVoice(key, note) {
    var v = VOCES[key]; if (!v || !voicePanel) return;
    var tagClass = v.side === 'ex' ? 'bg-verde' : v.side === 'in' ? 'bg-naranja' : 'bg-amarillo';
    voicePanel.innerHTML = '<small>Su argumento</small>' +
      '<span class="tag ' + tagClass + '">Defendió ' + SIDE_TXT[v.side] + '</span>' +
      '<h3>' + v.n + '</h3><p>' + v.arg + '</p>' +
      (note ? '<p class="verdict" style="background:var(--amarillo)"><b>Ojo:</b> ' + note + '</p>' : '') +
      '<p class="verdict"><b>¿La Corte le dio la razón?</b> ' + v.corte + '</p>';
    voicePanel.classList.remove('flash'); void voicePanel.offsetWidth; voicePanel.classList.add('flash');
  }
  if (vocesRoot && balance) {
    ChipGame({
      root: vocesRoot, zoneSelector: '.plate, .fulcrum',
      labels: { ex: 'Exequible', in: 'Inexequible', mix: 'Mixta' },
      onDrop: function (chip, zone) {
        var key = chip.getAttribute('data-chip'), v = VOCES[key], chosen = zone.getAttribute('data-zone'), note = '';
        var target = v.side;
        if (v.side === 'mix') {
          note = chosen === 'mix' ? '¡Bien visto! Su posición fue mixta.' : 'Su posición fue mixta: impugnó la demanda, pero propuso retirar la etapa prearbitral. Por eso queda en el centro.';
        } else if (chosen !== v.side) {
          note = 'No exactamente: defendió ' + SIDE_TXT[v.side] + '. La pasamos a su plato.';
        }
        var list = $('[data-zone="' + target + '"] .zone-list', balance);
        var li = document.createElement('li');
        li.className = 'token'; li.setAttribute('data-voice', key); li.setAttribute('tabindex', '0');
        li.innerHTML = svgIcon(v.icon) + (v.short || v.n);
        list.appendChild(li);
        chip.remove();
        updateBalance();
        showVoice(key, note);
        if (!voicePool.children.length) {
          setTimeout(function () {
            toast('Empate 2 a 2 y una voz mixta: la Corte decidió con argumentos propios');
          }, 900);
        }
      }
    });
    balance.addEventListener('click', function (e) {
      var t = e.target.closest('.token'); if (t) showVoice(t.getAttribute('data-voice'));
    });
    balance.addEventListener('keydown', function (e) {
      var t = e.target.closest && e.target.closest('.token');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showVoice(t.getAttribute('data-voice')); }
    });
    $$('[data-chip]', voicePool).forEach(function (c) { c.setAttribute('data-orig', '1'); });
  }
  var voiceChipHTML = voicePool ? voicePool.innerHTML : '';
  function resetVoces() {
    $$('.token:not(.token--fixed)', balance).forEach(function (t) { t.remove(); });
    voicePool.innerHTML = voiceChipHTML;
    voicePanel.innerHTML = voicePanelDefault;
    updateBalance();
  }

  /* =========================================================
     6. SECCIÓN 03 · Tarjetas que se voltean
     ========================================================= */
  $$('.flip-inner').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.closest('.flip'), on = !f.classList.contains('is-flipped');
      f.classList.toggle('is-flipped', on);
      b.setAttribute('aria-pressed', String(on));
    });
  });

  /* =========================================================
     7. SECCIÓN 04 · Juego ¿quién puede hacerlo?
     ========================================================= */
  var TAREAS = {
    't-admitir': { z: 'arb', why: 'Decide si el caso entra o no a la justicia arbitral: puede limitar el acceso a la justicia.' },
    't-traslado': { z: 'arb', why: 'Hace parte del trámite inicial (art. 121), que ahora le corresponde al tribunal ya instalado.' },
    't-reconv': { z: 'arb', why: 'También es trámite inicial y define el objeto del proceso.' },
    't-concil': { z: 'arb', why: 'Está dentro del trámite inicial, que pasa al tribunal. Ojo: la ley sí puede darle a los centros otras funciones de conciliación.' },
    't-citar': { z: 'cen', why: 'Es una labor operativa: quienes designan son las partes.' },
    't-requerir': { z: 'cen', why: 'Labor material y de apoyo: el tercero elige por voluntad de las partes.' },
    't-designar': { z: 'cen', why: 'Puede hacerlo porque esa designación expresa la voluntad de las partes (directamente o por el reglamento).' },
    't-fecha': { z: 'cen', why: 'Art. 122: es apoyo a la instalación; no decide nada del litigio.' },
    't-entregar': { z: 'cen', why: 'Apoyo logístico (art. 122).' }
  };
  var ZONE_TXT = { arb: 'solo a los árbitros', cen: 'al centro' };
  var claveRoot = $('#gameClave'), taskPool = $('#poolTareas'), claveScore = $('#claveScore'), claveFb = $('#claveFeedback');
  var taskPoolHTML = taskPool ? taskPool.innerHTML : '';
  function evalClave() {
    var total = Object.keys(TAREAS).length;
    var ok = $$('.dropzone .chip.is-ok', claveRoot).length;
    var placed = $$('.dropzone .chip', claveRoot).length;
    claveScore.textContent = ok + ' de ' + total;
    var done = ok === total;
    claveRoot.classList.toggle('is-done', done);
    if (done) { claveFb.textContent = '¡Perfecto! Ya ves la frontera que trazó la Corte: lo que decide va para los árbitros; lo que apoya, para el centro.'; claveFb.className = 'game-feedback ok'; }
    else if (placed === total) { claveFb.textContent = 'Hay ' + (total - ok) + ' por corregir: arrástralas a la otra zona.'; claveFb.className = 'game-feedback'; }
  }
  if (claveRoot) {
    ChipGame({
      root: claveRoot, zoneSelector: '.dropzone',
      labels: { arb: 'Solo los árbitros', cen: 'El centro' },
      onDrop: function (chip, zone) {
        var key = chip.getAttribute('data-chip'), t = TAREAS[key], z = zone.getAttribute('data-zone');
        var ok = t.z === z;
        if (!$('.mark', chip)) {
          var label = chip.textContent.trim();
          chip.innerHTML = '<svg class="ic mark" aria-hidden="true"><use href="#i-check"/></svg><span class="lbl">' + label + '</span><span class="why"></span>';
        }
        $('.mark use', chip).setAttribute('href', ok ? '#i-check' : '#i-x');
        $('.why', chip).textContent = ok ? t.why : 'Esta no va aquí: le corresponde ' + ZONE_TXT[t.z] + '.';
        chip.classList.toggle('is-ok', ok);
        chip.classList.toggle('is-bad', !ok);
        $('.zone-list', zone).appendChild(chip);
        claveFb.className = 'game-feedback' + (ok ? ' ok' : '');
        claveFb.textContent = ok ? '✓ ' + t.why : '✗ No: le corresponde ' + ZONE_TXT[t.z] + '. Muévela a la otra zona.';
        evalClave();
        var fr = claveFb.getBoundingClientRect();
        if (fr.top < 0 || fr.bottom > window.innerHeight) toast(ok ? '✓ Correcto · ' + claveScore.textContent : '✗ Le corresponde ' + ZONE_TXT[t.z]);
      }
    });
  }
  function resetClave() {
    taskPool.innerHTML = taskPoolHTML;
    $$('.dropzone .zone-list', claveRoot).forEach(function (l) { l.innerHTML = ''; });
    claveFb.textContent = ''; claveFb.className = 'game-feedback';
    evalClave();
  }

  /* =========================================================
     8. SECCIÓN 05 · ¿Quién designa? (camino interactivo)
     ========================================================= */
  var ACTORS = {
    partes: { n: 'Las partes', c: '#000000' },
    centro: { n: 'El centro de arbitraje', c: 'var(--azul)' },
    arbitros: { n: 'Los árbitros', c: 'var(--morado)' },
    juez: { n: 'Juez civil del circuito', c: 'var(--gris1)' }
  };
  var TREE = {
    q1: { actor: 'partes', q: '¿Las partes ya eligieron a los árbitros, directamente o por medio de un tercero en quien delegaron?', opts: [['Sí', 's_citar'], ['No', 's_aud']] },
    s_citar: { actor: 'centro', q: 'El centro cita a los árbitros elegidos para que acepten.', t: 'Personalmente o por telegrama, con 5 días para pronunciarse; el silencio cuenta como rechazo. Es una labor de apoyo.', opts: [['Aceptaron', 'end_ok'], ['No aceptaron', 's_aud']] },
    s_aud: { actor: 'centro', q: 'El centro cita a las partes a una audiencia para que ellas designen, total o parcialmente.', t: 'Aunque se llame «audiencia», la Corte la entiende como una labor operativa: quienes designan son las partes.', opts: [['Designaron', 'end_ok'], ['No se pusieron de acuerdo', 'q_aut']] },
    q_aut: { actor: 'partes', q: '¿En el pacto arbitral autorizaron al centro para designar, directamente o aceptando su reglamento?', opts: [['Sí', 'end_centro'], ['No', 'end_juez']] },
    end_ok: { tone: 'verde', actor: 'partes', k: 'Exequible', h: 'Los árbitros los eligieron las partes', p: 'Es el corazón del principio de habilitación: la voluntad de las partes activa la justicia arbitral y decide quién la ejerce.' },
    end_centro: { tone: 'amarillo', actor: 'centro', k: 'Exequible condicionado', h: 'Designa el centro', p: 'Solo porque las partes lo autorizaron de forma previa y expresa, ya sea directamente o al aceptar el reglamento del centro. Sin esa autorización, el centro no puede hacerlo.' },
    end_juez: { tone: 'negro', actor: 'juez', k: 'Lo que dijo la Corte', h: 'Designa un juez civil del circuito', p: 'Ni la ley ni el centro pueden suplir la voluntad de las partes. La parte interesada acude al juez civil del circuito, que designa en un trámite breve y sumario, con las listas de los centros y respetando al máximo lo que quieran las partes. El pacto arbitral sigue vigente.' }
  };
  var trail = $('#trail'), path = [];
  function renderTrail(scrollToLast) {
    if (!trail) return;
    trail.innerHTML = '';
    path.forEach(function (st, i) {
      var node = TREE[st.id], li = document.createElement('li');
      var a = ACTORS[node.actor] || ACTORS.partes;
      if (node.tone) {
        li.className = 'step';
        li.innerHTML = '<span class="step-n">' + svgIcon('i-check') + '</span>' +
          '<div class="leaf tone-' + node.tone + '"><small>' + node.k + '</small><h4>' + node.h + '</h4><p>' + node.p + '</p>' +
          '<button class="again" type="button">' + svgIcon('i-reset') + 'Probar otro camino</button></div>';
      } else {
        li.className = 'step' + (st.choice != null ? ' is-answered' : '');
        var opts = node.opts.map(function (o, j) {
          return '<button class="opt' + (st.choice === j ? ' is-chosen' : '') + '" type="button" data-step="' + i + '" data-opt="' + j + '" aria-pressed="' + (st.choice === j) + '">' + o[0] + '</button>';
        }).join('');
        li.innerHTML = '<span class="step-n">' + (i + 1) + '</span>' +
          '<div class="step-card" style="--actor:' + a.c + '"><span class="actor"><i></i>' + a.n + '</span>' +
          '<p class="step-q">' + node.q + '</p>' + (node.t ? '<p class="step-t">' + node.t + '</p>' : '') +
          '<div class="opts">' + opts + '</div></div>';
      }
      trail.appendChild(li);
    });
    if (scrollToLast && trail.lastElementChild && !reduceMotion) {
      trail.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  function startTrail() { path = [{ id: 'q1', choice: null }]; renderTrail(false); }
  if (trail) {
    trail.addEventListener('click', function (e) {
      var opt = e.target.closest('.opt');
      if (opt) {
        var i = +opt.getAttribute('data-step'), j = +opt.getAttribute('data-opt');
        path = path.slice(0, i + 1);
        path[i].choice = j;
        path.push({ id: TREE[path[i].id].opts[j][1], choice: null });
        renderTrail(true);
        return;
      }
      if (e.target.closest('.again')) { startTrail(); trail.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }); }
    });
    startTrail();
  }

  /* =========================================================
     9. SECCIÓN 06 · Antes / Después (con animación FLIP)
     ========================================================= */
  var FLOW = {
    antes: {
      caption: 'Antes (Decreto 2651/91 y Ley 446/98): el centro hacía el trámite inicial, antes de que existiera el tribunal.',
      steps: [
        ['solicitud', 'partes', 'Presentan la solicitud de convocatoria ante el centro.'],
        ['admision', 'centro', 'El director admite o rechaza la solicitud y corre traslado de la demanda.', 'wrong', 'Función judicial en manos del centro'],
        ['contestacion', 'centro', 'Recibe la contestación, la reconvención y las excepciones, y hace la conciliación.', 'wrong', 'Función judicial en manos del centro'],
        ['designacion', 'centro', 'Integra el tribunal y designa los árbitros que las partes no nombren.', 'wrong', 'Sin autorización de las partes'],
        ['fecha', 'centro', 'Fracasada la conciliación, fija fecha y hora de instalación.'],
        ['instalacion', 'arbitros', 'El tribunal se instala y recibe la actuación surtida.'],
        ['primera', 'arbitros', 'Primera audiencia de trámite: el tribunal decide sobre su competencia.']
      ]
    },
    despues: {
      caption: 'Después de la C-1038/02: primero se instala el tribunal y luego él mismo hace el trámite inicial.',
      steps: [
        ['solicitud', 'partes', 'Convocan el tribunal; el centro presta apoyo material y logístico.'],
        ['designacion', 'partes', 'Designan los árbitros (o el centro, si lo autorizaron; si no, un juez civil).'],
        ['fecha', 'centro', 'Fija fecha y hora de instalación y la notifica.'],
        ['instalacion', 'arbitros', 'El tribunal se instala y recibe la actuación surtida.'],
        ['admision', 'arbitros', 'El tribunal hace el trámite inicial: admisión, traslado, contestación, reconvención y conciliación.', 'fixed', 'Ahora lo hace el tribunal'],
        ['primera', 'arbitros', 'Primera audiencia de trámite.']
      ]
    }
  };
  var flowList = $('#flowList'), flowCaption = $('#flowCaption'), flowState = 'antes';
  function renderFlow(state, animate) {
    if (!flowList) return;
    var first = {};
    if (animate) $$('.fstep', flowList).forEach(function (el) { first[el.getAttribute('data-k')] = el.getBoundingClientRect(); });
    var data = FLOW[state];
    flowCaption.textContent = data.caption;
    flowList.innerHTML = '';
    data.steps.forEach(function (s, i) {
      var a = ACTORS[s[1]], li = document.createElement('li');
      li.className = 'fstep' + (s[3] === 'wrong' ? ' is-wrong' : s[3] === 'fixed' ? ' is-fixed' : '');
      li.setAttribute('data-k', s[0]);
      li.style.setProperty('--actor', a.c);
      if (s[4]) li.setAttribute('data-badge', s[4]);
      li.innerHTML = '<b class="n">' + (i + 1) + '</b><span class="actor" style="--actor:' + a.c + '"><i></i>' + a.n + '</span><p>' + s[2] + '</p>';
      flowList.appendChild(li);
    });
    if (!animate || reduceMotion) return;
    $$('.fstep', flowList).forEach(function (el) {
      var k = el.getAttribute('data-k'), f = first[k];
      if (!f) { el.classList.add('enter'); return; }
      var l = el.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
      if ((dx || dy) && el.animate) {
        el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
  }
  $$('.toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      var st = b.getAttribute('data-state'); if (st === flowState) return;
      flowState = st;
      $$('.toggle button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderFlow(st, true);
    });
  });
  renderFlow('antes', false);
  function resetFlow() {
    flowState = 'antes';
    $$('.toggle button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-state') === 'antes')); });
    renderFlow('antes', false);
  }

  /* =========================================================
     10. REORDENAR / REINICIAR
     ========================================================= */
  var RESETS = { caso: resetCaso, voces: resetVoces, clave: resetClave, designa: startTrail, decision: resetFlow };
  $$('[data-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-reset'), board = $('[data-board="' + key + '"]');
      if (board) resetBoard(board);
      if (RESETS[key]) RESETS[key]();
      toast('Listo: todo volvió a su lugar');
    });
  });
  var resetAllBtn = $('#resetAll');
  if (resetAllBtn) resetAllBtn.addEventListener('click', function () {
    $$('.board').forEach(resetBoard);
    Object.keys(RESETS).forEach(function (k) { RESETS[k](); });
    positions = {}; saveStore(positions);
    toast('Todas las tarjetas volvieron a su lugar');
  });

  /* =========================================================
     11. ARRANQUE
     ========================================================= */
  buildCenefa();
  updateBalance();
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { updateProgress(); ticking = false; });
  }, { passive: true });
  var rT;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { buildCenefa(); updateProgress(); reclampAll(); updateBalance(); }, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { reclampAll(); updateBalance(); });
})();
