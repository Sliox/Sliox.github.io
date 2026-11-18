/* ==========================================================================
   Intro "ensamblaje robótico"
   Robots SCARA (vista cenital) entran desde los bordes y colocan las piezas de
   la página marcadas con [data-ri-piece]: cabecera, barra lateral y tarjetas.

   - Cinemática inversa analítica de 2 eslabones.
   - Dibujo en <canvas> con sombreado según una luz fija (arriba a la izquierda),
     sombras proyectadas según la altura de cada pieza del robot.
   - Sólo en la primera visita de la sesión; botón "Saltar", tecla Esc,
     botón [data-ri-replay] para repetir y respeto de prefers-reduced-motion.
   - JS vanilla, sin dependencias.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'ri-visto';
  var html = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var running = null;

  // ---------- utilidades ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpP(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function add(a, b, k) { k = (k === undefined) ? 1 : k; return { x: a.x + b.x * k, y: a.y + b.y * k }; }
  function markSeen() { try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* modo privado */ } }

  // Cinemática inversa de 2 eslabones (L1, L2) con codo +1 / -1.
  function ik(base, target, L1, L2, elbow) {
    var dx = target.x - base.x, dy = target.y - base.y;
    var d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.5);
    var c2 = clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    var q2 = elbow * Math.acos(c2);
    var q1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
    var e = { x: base.x + L1 * Math.cos(q1), y: base.y + L1 * Math.sin(q1) };
    var a2 = q1 + q2;
    return { elbow: e, tcp: { x: e.x + L2 * Math.cos(a2), y: e.y + L2 * Math.sin(a2) }, a1: q1, a2: a2 };
  }

  // ---------- piezas ----------
  function collectPieces(vw, vh, mobile) {
    var out = [], maxCards = mobile ? 2 : 6, nCards = 0;
    var els = document.querySelectorAll('[data-ri-piece]');
    for (var i = 0; i < els.length; i += 1) {
      var el = els[i], kind = el.getAttribute('data-ri-piece');
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { continue; }
      var visible = r.bottom > 12 && r.top < vh - 12 && r.right > 0 && r.left < vw;
      var p = { el: el, kind: kind, r: r, animate: visible };
      if (kind === 'card' && visible) { nCards += 1; if (nCards > maxCards) { p.animate = false; p.fade = true; } }
      // Centro de la parte visible (sólo para ordenar y repartir el trabajo).
      p.center = {
        x: (Math.max(r.left, 0) + Math.min(r.right, vw)) / 2,
        y: (Math.max(r.top, 0) + Math.min(r.bottom, vh)) / 2
      };
      out.push(p);
    }
    return out;
  }

  // ---------- planificación ----------
  // Celda de ensamblaje: robots en los cuatro bordes. Cada pieza sale de un
  // alimentador fuera de pantalla y entra en línea recta hasta su lugar.
  function makeRobots(vw, vh, mobile) {
    var R = [];
    function rb(id, x, y, nx, ny, elbow) {
      R.push({ id: id, st: { x: x, y: y }, n: { x: nx, y: ny }, t: { x: -ny, y: nx }, elbow: elbow, jobs: [] });
    }
    rb('top', vw * 0.55, -14, 0, 1, 1);
    rb('left', -14, vh * 0.45, 1, 0, -1);
    rb('right', vw + 14, vh * 0.35, -1, 0, 1);
    if (mobile) {
      rb('bottom', vw * 0.5, vh + 10, 0, -1, -1);
    } else {
      rb('bottomL', vw * 0.40, vh + 14, 0, -1, -1);
      rb('bottomR', vw * 0.72, vh + 14, 0, -1, 1);
    }
    return R;
  }
  function byId(R, id) { for (var i = 0; i < R.length; i += 1) { if (R[i].id === id) { return R[i]; } } return null; }

  // Punto de agarre: cerca del borde de la pieza que mira al robot (como lo
  // tomaría una pinza real), centrado en el otro eje y dentro de la pantalla.
  function gripFor(rb, p, vw, vh) {
    var r = p.r, g = { x: p.center.x, y: p.center.y };
    var size = rb.n.x !== 0 ? r.width : r.height;
    var inset = clamp(size * 0.22, 22, 80);
    if (rb.n.x > 0) { g.x = Math.max(r.left, 0) + inset; }          // robot a la izquierda
    else if (rb.n.x < 0) { g.x = Math.min(r.right, vw) - inset; }   // robot a la derecha
    else if (rb.n.y > 0) { g.y = Math.max(r.top, 0) + inset; }      // robot arriba
    else { g.y = Math.min(r.bottom, vh) - inset; }                  // robot abajo
    return g;
  }

  // Cuánto se extiende la pieza más allá del agarre, hacia el interior de la pantalla.
  function farExtent(rb, p) {
    var r = p.r, c = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]], m = 0;
    c.forEach(function (q) { m = Math.max(m, (q[0] - p.grip.x) * rb.n.x + (q[1] - p.grip.y) * rb.n.y); });
    return m;
  }

  // Alimentador: fuera del borde, en la misma línea que el agarre, para que la pieza
  // entre derecho. Lo bastante atrás para que quede oculta mientras espera.
  function pickPoint(rb, p) {
    p.ext = farExtent(rb, p);
    // Piezas muy largas (la barra superior) esperan asomando apenas: el robot las
    // trae tomadas del extremo, como quien desliza una regla sobre la mesa.
    p.back = p.ext + 30 <= 360 ? Math.max(p.ext + 30, 60) : 60;
    var edgeN = rb.st.x * rb.n.x + rb.st.y * rb.n.y;          // posición del borde sobre n
    var gripN = p.grip.x * rb.n.x + p.grip.y * rb.n.y;
    return add(p.grip, rb.n, (edgeN - p.back) - gripN);
  }

  function plan(vw, vh, mobile, pieces) {
    // Tiempos (ms) de cada fase. STAGGER separa el inicio de cada traslado para que
    // los brazos entren uno tras otro en vez de todos a la vez.
    var T = mobile
      ? { enter: 700, app: 520, grip: 170, carry: 900, rel: 170, ret: 380, exit: 520, stagger: 650 }
      : { enter: 700, app: 520, grip: 160, carry: 900, rel: 160, ret: 380, exit: 500, stagger: 480 };
    T.pull = mobile ? 1000 : 1150;   // tirón de la "cortina" (barra superior)
    var R = makeRobots(vw, vh, mobile);
    var lastStart = -Infinity;
    function nextStart(rb) {
      var own = rb.jobs.length ? rb.avail + T.app + T.grip : T.enter;
      return Math.max(own, lastStart + T.stagger);
    }
    function assign(rb, p) {
      var start = nextStart(rb);
      // La cortina necesita que el brazo llegue y cierre la pinza antes de tirar.
      if (p.curtain && !rb.jobs.length) { start = Math.max(start, T.enter + T.grip); }
      lastStart = start;
      p.robot = rb; p.carry0 = start; p.carry1 = start + (p.curtain ? T.pull : T.carry);
      if (p.curtain) {
        // Se toma del borde inferior (el "dobladillo") que asoma arriba de la pantalla.
        p.grip = { x: clamp(vw * 0.5, 40, vw - 40), y: p.r.bottom - 6 };
      } else {
        p.grip = gripFor(rb, p, vw, vh);
      }
      rb.jobs.push(p); rb.avail = p.carry1 + T.rel;
    }
    var anim = pieces.filter(function (p) { return p.animate; });
    // La barra superior es una cortina: está enrollada arriba, asomando sólo su borde
    // inferior; un brazo que sube desde abajo la toma de ese borde y la tira hacia abajo.
    // La barra lateral entra desde la izquierda.
    var bottoms = R.filter(function (rb) { return rb.n.y < 0; });
    anim.forEach(function (p) {
      if (p.kind === 'header') {
        p.curtain = true;
        var best = bottoms[0];
        bottoms.forEach(function (rb) { if (Math.abs(rb.st.x - vw / 2) < Math.abs(best.st.x - vw / 2)) { best = rb; } });
        assign(best, p);
      } else if (p.kind === 'sidebar') { assign(byId(R, 'left'), p); }
    });
    // Tarjetas: desde el borde más cercano, repartiendo para que no espere un solo robot.
    anim.filter(function (p) { return p.kind === 'card'; })
      .sort(function (a, b) { return (a.r.top - b.r.top) || (a.r.left - b.r.left); })
      .forEach(function (p) {
        var best = null, bestCost = Infinity;
        R.forEach(function (rb) {
          var edge = rb.n.x > 0 ? { x: 0, y: p.center.y } : rb.n.x < 0 ? { x: vw, y: p.center.y } : { x: p.center.x, y: vh };
          var c = nextStart(rb) + dist(edge, p.center) * 1.2;
          if (c < bestCost) { bestCost = c; best = rb; }
        });
        assign(best, p);
      });

    var used = R.filter(function (rb) { return rb.jobs.length > 0; });
    // Mover cada base a lo largo de su borde hacia el centro de sus trabajos.
    used.forEach(function (rb) {
      var horiz = rb.n.x === 0, edge = horiz ? vw : vh, sum = 0;
      rb.jobs.forEach(function (p) { sum += horiz ? p.grip.x : p.grip.y; });
      var m = clamp(sum / rb.jobs.length, edge * 0.1, edge * 0.9);
      if (horiz) { rb.st.x = m; } else { rb.st.y = m; }
      rb.jobs.forEach(function (p) {
        if (p.curtain) {
          // Posición "enrollada": la barra subida, asomando 8 px por el borde superior.
          p.pick = { x: p.grip.x, y: p.grip.y - (p.r.height - 8) };
          p.ext = 0; p.back = 0; p.rot0 = 0;
          return;
        }
        p.pick = pickPoint(rb, p);
        // Leve inclinación al tomarla; en piezas largas, casi nada (gira desde el extremo).
        var maxRot = Math.min(4 * Math.PI / 180, 14 / Math.max(p.ext, 1));
        p.rot0 = (rb.elbow > 0 ? 1 : -1) * maxRot * (0.5 + Math.random() * 0.5);
      });
    });

    // Si hay muchas piezas, comprimir un poco para no pasar de ~6 s en total.
    var end = 0;
    R.forEach(function (rb) { if (rb.jobs.length) { end = Math.max(end, rb.avail + T.ret + T.exit); } });
    var k = end > 6000 ? 6000 / end : 1;

    used.forEach(function (rb) {
      // Largo de eslabones: lo justo para alcanzar todo, con margen.
      var maxD = 0;
      rb.jobs.forEach(function (p) { maxD = Math.max(maxD, dist(rb.st, p.grip), dist(rb.st, p.pick)); });
      var L = Math.max(maxD * 0.54, mobile ? 70 : 120);
      rb.L1 = L * 1.06; rb.L2 = L * 0.94;
      rb.w = clamp(L * 0.075, mobile ? 9 : 12, mobile ? 15 : 22); // "calibre" del robot
      rb.rest = add(rb.st, rb.n, L * 0.55);
      var first = rb.jobs[0];
      rb.off = Math.max((rb.L1 + rb.L2) + 260, first.ext - first.back + 80);
      var segs = [], prev = null;
      rb.jobs.forEach(function (p, i) {
        if (i === 0) {
          // Cada brazo entra justo antes de su primer traslado (no todos al comienzo).
          // La duración de la entrada crece con la distancia, para no "teletransportar" piezas largas.
          var enterDur = clamp(rb.off / 1.5, T.enter, 1500);
          if (p.curtain) {
            // Llega con la pinza abierta, la cierra sobre el borde y recién ahí tira.
            segs.push({ type: 'enter', t0: p.carry0 - T.grip - enterDur, t1: p.carry0 - T.grip, p: p });
            segs.push({ type: 'grip', t0: p.carry0 - T.grip, t1: p.carry0, p: p });
          } else {
            segs.push({ type: 'enter', t0: p.carry0 - enterDur, t1: p.carry0, p: p });
          }
        } else {
          segs.push({ type: 'app', t0: prev.carry1 + T.rel, t1: p.carry0 - T.grip, from: prev.grip, p: p });
          segs.push({ type: 'grip', t0: p.carry0 - T.grip, t1: p.carry0, p: p });
        }
        segs.push({ type: 'carry', t0: p.carry0, t1: p.carry1, p: p });
        segs.push({ type: 'rel', t0: p.carry1, t1: p.carry1 + T.rel, p: p });
        prev = p;
      });
      segs.push({ type: 'ret', t0: rb.avail, t1: rb.avail + T.ret, from: prev.grip });
      segs.push({ type: 'exit', t0: rb.avail + T.ret, t1: rb.avail + T.ret + T.exit });
      segs.forEach(function (s) { s.t0 *= k; s.t1 *= k; });
      rb.jobs.forEach(function (p) { p.carry0 *= k; p.carry1 *= k; });
      rb.segs = segs;
      rb.end = segs[segs.length - 1].t1;
    });
    // Si alguna entrada quedó antes de t=0, correr toda la línea de tiempo.
    var minT = 0;
    used.forEach(function (rb) { minT = Math.min(minT, rb.segs[0].t0); });
    if (minT < 0) {
      used.forEach(function (rb) {
        rb.segs.forEach(function (s) { s.t0 -= minT; s.t1 -= minT; });
        rb.jobs.forEach(function (p) { p.carry0 -= minT; p.carry1 -= minT; });
        rb.end -= minT;
      });
    }
    var total = 0;
    used.forEach(function (rb) { total = Math.max(total, rb.end); });
    return { robots: used, total: total };
  }

  // Pose de un robot en el instante t (ms).
  function pose(rb, t) {
    var s = null;
    for (var i = 0; i < rb.segs.length; i += 1) { if (t >= rb.segs[i].t0) { s = rb.segs[i]; } }
    if (!s || t > rb.end) { return null; }
    var u = s.t1 > s.t0 ? clamp((t - s.t0) / (s.t1 - s.t0), 0, 1) : 1;
    var base = rb.st, tcp, open = 1, held = null, rot = 0, lift = 0, z = 0;
    switch (s.type) {
      case 'enter':
        var e = easeOut(u);
        var delta = { x: -rb.n.x * rb.off * (1 - e), y: -rb.n.y * rb.off * (1 - e) };
        base = add(rb.st, delta); tcp = add(s.p.pick, delta);
        if (s.p.curtain) { open = 1; z = 0.6; }                 // sube vacía a buscar la cortina
        else { open = 0; held = s.p; rot = s.p.rot0; lift = 1; z = 1; }
        break;
      case 'app': tcp = lerpP(s.from, s.p.pick, ease(u)); z = Math.sin(Math.PI * u) * 0.6; break;
      case 'grip': tcp = s.p.pick; open = 1 - ease(u); held = u > 0.5 ? s.p : null; rot = s.p.rot0; lift = s.p.curtain ? 0 : u; z = u; break;
      case 'carry':
        if (s.p.curtain) {                                       // tirón recto hacia abajo
          tcp = lerpP(s.p.pick, s.p.grip, ease(u)); open = 0; held = s.p; z = 0.3;
          break;
        }
        var c = ease(u), a = s.p.pick, b = s.p.grip;
        var d = dist(a, b) || 1;
        var perp = { x: -(b.y - a.y) / d, y: (b.x - a.x) / d };
        tcp = add(lerpP(a, b, c), perp, Math.sin(Math.PI * c) * d * 0.08 * rb.elbow);
        open = 0; held = s.p; rot = s.p.rot0 * (1 - c); lift = 1 - easeIn(u); z = 1 - easeIn(u);
        break;
      case 'rel': tcp = s.p.grip; open = ease(u); break;
      case 'ret': tcp = lerpP(s.from, rb.rest, ease(u)); z = Math.sin(Math.PI * u) * 0.5; break;
      case 'exit':
        var x = easeIn(u);
        var dl = { x: -rb.n.x * rb.off * x, y: -rb.n.y * rb.off * x };
        base = add(rb.st, dl); tcp = add(rb.rest, dl);
        break;
    }
    return { base: base, k: ik(base, tcp, rb.L1, rb.L2, rb.elbow), open: open, held: held, rot: rot, lift: lift, z: z };
  }

  // ==========================================================================
  // Dibujo
  // Vista cenital de un SCARA industrial: eslabones de
  // fundición pintados (perfil cónico), tapas de motor con pernos, conduit de
  // cables corrugado y pinza paralela neumática.
  // ==========================================================================
  var LIGHT = { x: -0.5, y: -0.86 };              // luz desde arriba-izquierda
  var PAINT = { edge: '#5c2c05', shade: '#b4590f', base: '#ea8228', hi: '#ffc283', cover: '#f08f33' };
  var STEEL = { hi: '#f4f6f8', mid: '#a9b1ba', lo: '#4a5159' };
  var CAST = { hi: '#4a525c', mid: '#30363d', lo: '#1a1e23' };
  var hasFilter = false;

  // Silueta "hueso": dos círculos (r1 en el origen, r2 en x=L) unidos por sus tangentes externas.
  function bonePath(ctx, L, r1, r2) {
    var th = Math.acos(clamp((r1 - r2) / Math.max(L, 0.001), -1, 1));
    ctx.beginPath();
    ctx.arc(0, 0, r1, th, Math.PI * 2 - th);
    ctx.arc(L, 0, r2, -th, th);
    ctx.closePath();
  }

  // Degradado transversal (efecto de pieza redondeada) orientado según la luz.
  function crossGradient(ctx, ang, r, c) {
    // ¿El costado -y local mira hacia la luz?
    var towardLight = (Math.sin(ang) * LIGHT.x - Math.cos(ang) * LIGHT.y) > 0;
    var g = towardLight ? ctx.createLinearGradient(0, -r, 0, r) : ctx.createLinearGradient(0, r, 0, -r);
    g.addColorStop(0, c.edge);
    g.addColorStop(0.16, c.hi);
    g.addColorStop(0.42, c.base);
    g.addColorStop(0.84, c.shade);
    g.addColorStop(1, c.edge);
    return g;
  }

  function radialMetal(ctx, x, y, r, c) {
    var g = ctx.createRadialGradient(x + LIGHT.x * r * 0.45, y + LIGHT.y * r * 0.45, r * 0.05, x, y, r);
    g.addColorStop(0, c.hi); g.addColorStop(0.55, c.mid); g.addColorStop(1, c.lo);
    return g;
  }

  function bolts(ctx, x, y, R, n, size, phase) {
    for (var i = 0; i < n; i += 1) {
      var a = phase + i * Math.PI * 2 / n, bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R;
      ctx.beginPath(); ctx.arc(bx, by, size, 0, Math.PI * 2);
      ctx.fillStyle = radialMetal(ctx, bx, by, size, STEEL); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();        // hexágono interior (Allen)
    }
  }

  // Tapa de motor / eje articular.
  function jointCap(ctx, p, r) {
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = radialMetal(ctx, p.x, p.y, r, CAST); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = radialMetal(ctx, p.x, p.y, r * 0.72, STEEL); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
    bolts(ctx, p.x, p.y, r * 0.86, 6, Math.max(1.2, r * 0.07), Math.PI / 6);
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#20252b'; ctx.fill();
  }

  // Eslabón pintado con tapa superior, junta y placa de modelo.
  function link(ctx, a, b, r1, r2, label) {
    var L = dist(a, b), ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang);
    bonePath(ctx, L, r1, r2);
    ctx.fillStyle = crossGradient(ctx, ang, r1, PAINT); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,18,0,.55)'; ctx.stroke();
    // Tapa superior (cubierta de acceso) algo más plana y clara, con junta.
    var ins = 0.66;
    bonePath(ctx, L, r1 * ins, r2 * ins);
    var g = ctx.createLinearGradient(0, -r1, L * 0.3, r1);
    g.addColorStop(0, '#ffb067'); g.addColorStop(1, PAINT.cover);
    ctx.fillStyle = g; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(70,30,0,.45)'; ctx.lineWidth = 0.8; ctx.stroke();
    // Tornillos de la tapa
    [[r1 * 1.25, r1 * 0.38], [r1 * 1.25, -r1 * 0.38], [L - r2 * 1.25, r2 * 0.36], [L - r2 * 1.25, -r2 * 0.36]].forEach(function (s) {
      if (s[0] > r1 * 0.8 && s[0] < L - r2 * 0.8) {
        ctx.beginPath(); ctx.arc(s[0], s[1], Math.max(0.9, r1 * 0.06), 0, Math.PI * 2);
        ctx.fillStyle = '#3a2410'; ctx.fill();
      }
    });
    // Placa de modelo
    if (label && L > r1 * 4) {
      var pw = Math.min(L * 0.3, r1 * 2.6), ph = r1 * 0.42, px = L * 0.48 - pw / 2;
      ctx.fillStyle = '#1d2228'; ctx.fillRect(px, -ph / 2, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '700 ' + Math.max(6, ph * 0.62).toFixed(1) + 'px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, L * 0.48, ph * 0.04);
    }
    ctx.restore();
  }

  // Conduit corrugado que va de la base al codo, colgando hacia un costado.
  function conduit(ctx, a, b, side, w) {
    var d = dist(a, b) || 1, nx = -(b.y - a.y) / d * side, ny = (b.x - a.x) / d * side;
    var c1 = { x: lerp(a.x, b.x, 0.3) + nx * w * 1.9, y: lerp(a.y, b.y, 0.3) + ny * w * 1.9 };
    var c2 = { x: lerp(a.x, b.x, 0.75) + nx * w * 1.7, y: lerp(a.y, b.y, 0.75) + ny * w * 1.7 };
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    ctx.strokeStyle = '#111418'; ctx.lineWidth = w * 0.42; ctx.stroke();
    ctx.setLineDash([1.2, Math.max(2, w * 0.18)]);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = w * 0.3; ctx.stroke();  // anillos del corrugado
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Pinza paralela: cuerpo de aluminio anodizado y dos mordazas con almohadillas.
  function gripper(ctx, wrist, ang, w, open) {
    var gap = lerp(w * 0.42, w * 0.95, open);
    ctx.save(); ctx.translate(wrist.x, wrist.y); ctx.rotate(ang);
    // Cuerpo
    var bw = w * 1.15, bh = w * 1.0;
    var g = ctx.createLinearGradient(0, -bh, 0, bh);
    g.addColorStop(0, '#6b7480'); g.addColorStop(0.35, '#3c434c'); g.addColorStop(1, '#1f242a');
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(-w * 0.2, -bh, bw, bh * 2, w * 0.18); } else { ctx.rect(-w * 0.2, -bh, bw, bh * 2); }
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1; ctx.stroke();
    // Guía de las mordazas
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(bw - w * 0.3, -bh * 0.92, w * 0.12, bh * 1.84);
    // Mordazas
    [-1, 1].forEach(function (sg) {
      var y0 = sg * gap, fl = w * 1.05, ft = w * 0.3;
      var fx = bw - w * 0.32;
      var fg = ctx.createLinearGradient(0, y0 - ft, 0, y0 + ft);
      fg.addColorStop(0, '#e3e7eb'); fg.addColorStop(0.5, '#aab2bb'); fg.addColorStop(1, '#6f7882');
      ctx.beginPath(); ctx.rect(fx, y0 - ft / 2, fl, ft);
      ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
      // Almohadilla de goma en la cara interior
      ctx.fillStyle = '#23272c';
      ctx.fillRect(fx + fl * 0.45, y0 - sg * ft * 0.5 - (sg > 0 ? 0 : ft * 0.28), fl * 0.55, ft * 0.28);
    });
    // LED de estado (verde = sujetando)
    var holding = open < 0.5;
    ctx.beginPath(); ctx.arc(w * 0.18, 0, w * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = holding ? '#3ee07a' : '#f5a524'; ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.18, 0, w * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = holding ? 'rgba(62,224,122,.22)' : 'rgba(245,165,36,.2)'; ctx.fill();
    ctx.restore();
  }

  // Sombra proyectada: la silueta de cada parte, desplazada según su altura.
  function shadowPass(ctx, rb, P, wrist) {
    var w = rb.w, k = P.k, a2 = k.a2;
    function sil(dx, dy, fn) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); }
    ctx.save();
    if (hasFilter) { ctx.filter = 'blur(' + Math.round(w * 0.45) + 'px)'; }
    ctx.fillStyle = 'rgba(8,10,14,.30)';
    var h1 = w * 0.5, h2 = w * (0.85 + P.z * 0.5);
    sil(h1 * 0.6, h1, function () {
      ctx.translate(P.base.x, P.base.y); ctx.rotate(k.a1);
      bonePath(ctx, rb.L1, w * 1.3, w * 1.0); ctx.fill();
    });
    sil(h2 * 0.6, h2, function () {
      ctx.translate(k.elbow.x, k.elbow.y); ctx.rotate(a2);
      bonePath(ctx, dist(k.elbow, wrist), w * 0.95, w * 0.7); ctx.fill();
      ctx.fillRect(dist(k.elbow, wrist) - w * 0.4, -w * 0.9, w * 2.3, w * 1.8);
    });
    ctx.restore();
  }

  function drawRobot(ctx, rb, P) {
    var w = rb.w, k = P.k;
    var gw = w * 1.0;                               // calibre de la pinza
    var dir = { x: Math.cos(k.a2), y: Math.sin(k.a2) };
    var wrist = add(k.tcp, dir, -gw * 1.75);        // el eslabón 2 termina donde empieza la pinza
    shadowPass(ctx, rb, P, wrist);
    link(ctx, P.base, k.elbow, w * 1.3, w * 1.0, 'MX-2');
    conduit(ctx, P.base, k.elbow, -rb.elbow, w);
    jointCap(ctx, P.base, w * 1.15);
    link(ctx, k.elbow, wrist, w * 0.95, w * 0.7, null);
    jointCap(ctx, k.elbow, w * 0.8);
    gripper(ctx, wrist, k.a2, gw, P.open);
    // Eje de la muñeca (husillo) sobre la pinza
    ctx.beginPath(); ctx.arc(wrist.x, wrist.y, w * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = radialMetal(ctx, wrist.x, wrist.y, w * 0.4, STEEL); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Esquinas de "pieza posicionada".
  function drawMarks(ctx, m, now) {
    var a = 1 - (now - m.t) / 480;
    if (a <= 0) { return false; }
    var r = m.r, s = 16, g = (1 - a) * 6;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#f28c28'; ctx.lineWidth = 3;
    var L = r.left - g, T = r.top - g, Rr = r.right + g, B = r.bottom + g;
    ctx.beginPath();
    ctx.moveTo(L, T + s); ctx.lineTo(L, T); ctx.lineTo(L + s, T);
    ctx.moveTo(Rr - s, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, T + s);
    ctx.moveTo(Rr, B - s); ctx.lineTo(Rr, B); ctx.lineTo(Rr - s, B);
    ctx.moveTo(L + s, B); ctx.lineTo(L, B); ctx.lineTo(L, B - s);
    ctx.stroke(); ctx.restore();
    return true;
  }

  function drawHud(ctx, vh, frac, mobile) {
    var txt = 'Ensamblando portafolio… ' + Math.round(frac * 100) + '%';
    ctx.save();
    ctx.font = (mobile ? '11px' : '12px') + ' ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var w = ctx.measureText(txt).width + 24, h = 30, x = 14, y = vh - h - 14;
    ctx.fillStyle = 'rgba(17,24,39,0.88)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#e5e7eb'; ctx.fillText(txt, x + 12, y + 17);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 12, y + 22, w - 24, 3);
    ctx.fillStyle = '#f28c28'; ctx.fillRect(x + 12, y + 22, (w - 24) * frac, 3);
    ctx.restore();
  }

  // ---------- control ----------
  function setPieceTransform(p, P) {
    var dx = P.k.tcp.x - p.grip.x, dy = P.k.tcp.y - p.grip.y, sc = 1 + 0.03 * P.lift;
    p.el.style.transformOrigin = (p.grip.x - p.r.left) + 'px ' + (p.grip.y - p.r.top) + 'px';
    p.el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + P.rot.toFixed(4) + 'rad) scale(' + sc.toFixed(4) + ')';
    if (!p.held) { p.held = true; p.el.classList.add('ri-held'); }
  }

  // Cortina enrollada: la barra subida, asomando sólo el borde inferior.
  function peekCurtain(p) {
    p.el.style.transform = 'translate(0,' + (p.pick.y - p.grip.y).toFixed(1) + 'px)';
    if (!p.el.classList.contains('ri-held')) { p.el.classList.add('ri-held'); }
  }

  function clearPiece(p) {
    p.el.style.transform = ''; p.el.style.transformOrigin = '';
    p.el.classList.remove('ri-held');
  }

  function placePiece(p, now, st) {
    if (p.placed) { return; }
    p.placed = true; clearPiece(p);
    p.el.classList.add('ri-placed', 'ri-landed');
    setTimeout(function () { p.el.classList.remove('ri-landed'); }, 450);
    st.marks.push({ r: { left: Math.max(p.r.left, 2), top: Math.max(p.r.top, 2), right: Math.min(p.r.right, st.vw - 2), bottom: Math.min(p.r.bottom, st.vh - 2) }, t: now });
  }

  function finish() {
    var st = running;
    if (!st) { return; }
    running = null;
    cancelAnimationFrame(st.raf);
    st.pieces.forEach(function (p) { clearPiece(p); p.el.classList.remove('ri-placed', 'ri-fade'); });
    if (st.canvas.parentNode) { st.canvas.parentNode.removeChild(st.canvas); }
    if (st.skip.parentNode) { st.skip.parentNode.removeChild(st.skip); }
    window.removeEventListener('keydown', st.onKey);
    window.removeEventListener('resize', st.onResize);
    window.removeEventListener('scroll', st.onScroll);
    html.classList.remove('ri-pending', 'ri-running');
    markSeen();
  }

  function simpleReveal() {
    html.classList.remove('ri-pending', 'ri-running');
    var els = document.querySelectorAll('[data-ri-piece]');
    for (var i = 0; i < els.length; i += 1) { els[i].classList.add('ri-fade'); }
    setTimeout(function () { for (var j = 0; j < els.length; j += 1) { els[j].classList.remove('ri-fade'); } }, 600);
    markSeen();
  }

  function play() {
    if (running) { return; }
    if (reduceMQ.matches) { simpleReveal(); return; }
    if (window.scrollY > 0) { window.scrollTo(0, 0); }
    html.classList.add('ri-pending', 'ri-running');

    var vw = window.innerWidth, vh = window.innerHeight, mobile = vw < 700;
    var pieces = collectPieces(vw, vh, mobile);
    var pl = plan(vw, vh, mobile, pieces);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    canvas.className = 'ri-canvas'; canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    hasFilter = typeof ctx.filter === 'string';

    var skip = document.createElement('button');
    skip.type = 'button'; skip.className = 'ri-skip'; skip.textContent = 'Saltar ⏭';
    skip.setAttribute('aria-label', 'Saltar animación de entrada');
    skip.addEventListener('click', finish);
    document.body.appendChild(skip);

    var st = {
      pieces: pieces, robots: pl.robots, total: pl.total, canvas: canvas, ctx: ctx, skip: skip,
      vw: vw, vh: vh, marks: [], t0: performance.now(), raf: 0,
      onKey: function (e) { if (e.key === 'Escape') { finish(); } },
      onScroll: function () { if (window.scrollY > 40) { finish(); } },
      // En móviles la barra de direcciones cambia el alto al hacer scroll: sólo cortar si cambia el ancho.
      onResize: function () { if (window.innerWidth !== vw) { finish(); } }
    };
    running = st;
    if (!pl.robots.length) { finish(); return; }

    pieces.forEach(function (p) {
      p.held = false; p.placed = false;
      if (!p.animate) { p.el.classList.add('ri-placed'); if (p.fade) { p.el.classList.add('ri-fade'); } }
    });

    window.addEventListener('keydown', st.onKey);
    window.addEventListener('resize', st.onResize);
    window.addEventListener('scroll', st.onScroll, { passive: true });

    function frame(now) {
      if (running !== st) { return; }
      var t = now - st.t0;
      ctx.clearRect(0, 0, vw, vh);
      st.pieces.forEach(function (p) {
        if (p.animate && p.carry1 !== undefined && t >= p.carry1) { placePiece(p, now, st); }
        else if (p.curtain && !p.held && !p.placed) { peekCurtain(p); }
      });
      st.marks = st.marks.filter(function (m) { return drawMarks(ctx, m, now); });
      st.robots.forEach(function (rb) {
        var P = pose(rb, t);
        if (!P) { return; }
        if (P.held && !P.held.placed) { setPieceTransform(P.held, P); }
        drawRobot(ctx, rb, P);
      });
      drawHud(ctx, vh, clamp(t / st.total, 0, 1), vw < 700);
      if (t >= st.total + 120) { finish(); return; }
      st.raf = requestAnimationFrame(frame);
    }
    st.raf = requestAnimationFrame(frame);
  }

  // Botón "Repetir animación"
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-ri-replay]') : null;
    if (!a) { return; }
    e.preventDefault();
    if (window.scrollY > 0) { window.scrollTo(0, 0); setTimeout(play, 350); } else { play(); }
  });

  // Arranque automático (el script del <head> agrega .ri-pending si corresponde).
  function boot() {
    if (!html.classList.contains('ri-pending')) { return; }
    requestAnimationFrame(function () { requestAnimationFrame(play); });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
}());
