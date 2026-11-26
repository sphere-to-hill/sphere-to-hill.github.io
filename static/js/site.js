// project-page/static/js/site.js
// Interactive figures of the project page: the grounded-sphere identity (closed forms, computed here),
// the scale-invariance panels (data: package results), the per-line real-terrain chart (Table 3) and
// the locality chart (Table 11). Data come from static/data/data.js (window.PAGE_DATA).
(function () {
  'use strict';
  const D = window.PAGE_DATA;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const CSSV = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = {
    blue: CSSV('--blue'), orange: CSSV('--orange'), aqua: CSSV('--aqua'), anchor: CSSV('--anchor'),
    ink: CSSV('--ink'), ink2: CSSV('--ink-2'), muted: CSSV('--muted'), hair: CSSV('--hair'),
    axis: CSSV('--axis'), wash: CSSV('--wash'), surface: CSSV('--surface'),
  };
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // DOM helpers
  function s(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, attrs, parent, text) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const MARKUP = /_\{([^}]*)\}|_([A-Za-z])/;              // "Q_{ref}" or "ε_V": subscript
  function rich(parent, str) {                            // HTML text with <sub>, built with textContent
    const re = new RegExp(MARKUP.source, 'g');
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      h('sub', {}, parent, m[1] || m[2]);
      last = re.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
    return parent;
  }
  function txt(parent, x, y, str, attrs) {                // SVG text; "_X" or "_{xy}" becomes a subscript
    const t = s('text', Object.assign({ x, y, fill: C.muted, 'font-size': 11 }, attrs || {}), parent);
    const re = new RegExp(MARKUP.source, 'g');
    let last = 0, m, low = false;
    const add = (str2, sub) => {
      const at = sub ? { dy: '0.3em', 'font-size': '0.78em' } : (low ? { dy: '-0.3em' } : {});
      s('tspan', at, t).textContent = str2;
      low = sub;
    };
    while ((m = re.exec(str))) {
      if (m.index > last) add(str.slice(last, m.index), false);
      add(m[1] || m[2], true);
      last = re.lastIndex;
    }
    if (last < str.length || !str) add(str.slice(last), false);
    return t;
  }
  function pow10(parent, x, y, e, attrs) {                // tick label 10^e with a real superscript
    const t = s('text', Object.assign({ x, y, fill: C.muted, 'font-size': 11 }, attrs || {}), parent);
    if (e === 0) { t.textContent = '1'; return t; }
    s('tspan', {}, t).textContent = '10';
    s('tspan', { dy: '-0.45em', 'font-size': '0.8em' }, t).textContent = String(e).replace('-', '−');
    return t;
  }
  const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

  // number formats
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const supStr = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  const pow10Str = (e) => (e === 0 ? '1' : '10' + supStr(e));
  function sci(v) {
    if (!isFinite(v)) return '–';
    if (v === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 2) return Number(v.toPrecision(3)).toString();
    let m = v / Math.pow(10, e);
    if (Math.abs(m) >= 9.95) { m /= 10; e += 1; }
    return m.toFixed(1) + ' × 10' + supStr(e);
  }
  const pct = (v) => v.toFixed(2) + '%';

  // markers with a 2px surface ring (painted under the fill)
  function marker(g, shape, x, y, color, hollow) {
    const ring = { stroke: C.surface, 'stroke-width': 4, 'paint-order': 'stroke' };
    const fill = hollow ? C.surface : color;
    const r = 4.2;
    if (shape === 'circle') {
      s('circle', Object.assign({ cx: x, cy: y, r: r, fill }, ring), g);
      if (hollow) s('circle', { cx: x, cy: y, r: r - 0.8, fill: 'none', stroke: color, 'stroke-width': 1.8 }, g);
    } else if (shape === 'square') {
      s('rect', Object.assign({ x: x - r + 0.4, y: y - r + 0.4, width: 2 * r - 0.8, height: 2 * r - 0.8, rx: 1, fill }, ring), g);
    } else if (shape === 'up' || shape === 'down') {
      const k = shape === 'up' ? 1 : -1;
      s('path', Object.assign({ d: `M${x},${y - k * (r + 0.8)} L${x + r + 0.6},${y + k * (r - 0.6)} L${x - r - 0.6},${y + k * (r - 0.6)} Z`, fill }, ring), g);
    } else if (shape === 'diamond') {
      s('path', Object.assign({ d: `M${x},${y - r - 0.8} L${x + r + 0.8},${y} L${x},${y + r + 0.8} L${x - r - 0.8},${y} Z`, fill }, ring), g);
    } else if (shape === 'cross') {
      const a = r - 0.4, d = `M${x - a},${y - a} L${x + a},${y + a} M${x + a},${y - a} L${x - a},${y + a}`;
      s('path', { d, stroke: C.surface, 'stroke-width': 5.5, 'stroke-linecap': 'round' }, g);
      s('path', { d, stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g);
    }
  }
  function legend(parent, series) {
    const ul = h('ul', { class: 'legend' }, parent);
    for (const ser of series) {
      const li = h('li', {}, ul);
      const svg = s('svg', { viewBox: '0 0 22 12', 'aria-hidden': 'true' }, li);
      if (ser.line !== false) {
        s('line', { x1: 2, y1: 6, x2: 20, y2: 6, stroke: ser.color, 'stroke-width': ser.band ? 7 : 2,
          'stroke-linecap': ser.dash ? 'butt' : 'round', 'stroke-dasharray': ser.dash || 'none' }, svg);
      }
      if (ser.shape) marker(svg, ser.shape, 11, 6, ser.color, ser.hollow);
      rich(h('span', {}, li), ser.label);
    }
    return ul;
  }

  // one tooltip per chart container; values lead, names follow
  function tooltip(box) {
    const t = h('div', { class: 'tip' }, box);
    t.hidden = true;
    return {
      show(x, y, head, rows) {
        t.replaceChildren();
        h('div', { class: 'head' }, t, head);
        for (const r of rows) {
          const row = h('div', { class: 'row' }, t);
          h('span', { class: 'key' }, row).style.background = r.color;
          h('b', {}, row, r.value);
          rich(h('span', {}, row), r.label);
        }
        t.hidden = false;
        const bw = box.clientWidth, bh = box.clientHeight, tw = t.offsetWidth, th = t.offsetHeight;
        let left = x + 14;
        if (left + tw > bw) left = x - 14 - tw;                  // flip to the left of the point
        t.style.left = Math.max(0, Math.min(bw - tw, left)) + 'px';
        t.style.top = Math.max(0, Math.min(Math.max(0, bh - th), y)) + 'px';
      },
      hide() { t.hidden = true; },
    };
  }
  // redraw at the container's width; deferred one frame, with a window-resize fallback
  function onResize(el, draw) {
    let w = 0, pending = 0;
    const run = () => {
      const nw = Math.round(el.clientWidth);
      if (nw && nw !== w) { w = nw; draw(nw); }
    };
    if (!('ResizeObserver' in window)) {
      window.addEventListener('resize', run);
      run();
      return;
    }
    new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(run);
    }).observe(el);
    run();
  }
  // start a redraw: hide the tooltip and remember whether the old chart had focus
  function beginRedraw(box, tip) {
    const old = box.querySelector(':scope > svg');
    const hadFocus = !!old && old === document.activeElement;
    if (tip) tip.hide();
    if (old) old.remove();
    return hadFocus;
  }
  function chartSvg(box, W, H, label, hadFocus) {
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group',
      'aria-roledescription': 'chart', 'aria-label': label, tabindex: 0 });
    box.insertBefore(svg, box.firstChild);
    if (hadFocus) requestAnimationFrame(() => svg.focus({ preventScroll: true }));
    return svg;
  }

  // log-log panel: x = log10|q|, y = log10(error)
  function logPanel(box, cfg) {
    const plot = h('div', { class: 'chart' }, box);
    const tip = tooltip(plot);
    let idx = cfg.x.length - 1;
    function draw(W) {
      const hadFocus = beginRedraw(plot, tip);
      const H = 250, m = { l: cfg.yTitle ? 58 : 46, r: 10, t: 8, b: 38 };
      const svg = chartSvg(plot, W, H, cfg.aria, hadFocus);
      const X = lin(cfg.xDomain[0], cfg.xDomain[1], m.l, W - m.r);
      const Y = lin(cfg.yDomain[0], cfg.yDomain[1], H - m.b, m.t);
      const b0 = Math.max(cfg.band[0], cfg.xDomain[0]), b1 = Math.min(cfg.band[1], cfg.xDomain[1]);
      s('rect', { x: X(b0), y: m.t, width: X(b1) - X(b0), height: H - m.b - m.t, fill: C.wash }, svg);
      for (let e = Math.ceil(cfg.yDomain[0] / cfg.yStep) * cfg.yStep; e <= cfg.yDomain[1]; e += cfg.yStep) {
        s('line', { x1: m.l, x2: W - m.r, y1: Y(e), y2: Y(e), stroke: C.hair, 'stroke-width': 1 }, svg);
        pow10(svg, m.l - 6, Y(e) + 4, e, { 'text-anchor': 'end' });
      }
      for (const e of [-12, -9, -6, -3, 0]) pow10(svg, X(e), H - m.b + 17, e, { 'text-anchor': 'middle' });
      s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: C.axis }, svg);
      txt(svg, (m.l + W - m.r) / 2, H - 4, 'test charge |q|', { 'text-anchor': 'middle', fill: C.ink2 });
      if (cfg.yTitle) {
        const yc = m.t + (H - m.b - m.t) / 2;
        txt(svg, 11, yc, cfg.yTitle, { 'text-anchor': 'middle', fill: C.ink2, transform: `rotate(-90 11 ${yc})` });
      }
      const g = s('g', {}, svg);
      const ordered = cfg.series.filter((x) => x.dash).concat(cfg.series.filter((x) => !x.dash));
      for (const ser of ordered) {                             // reference lines first, under the markers
        const pts = cfg.x.map((x, i) => [X(x), Y(Math.log10(ser.values[i]))]);
        s('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: ser.color,
          'stroke-width': ser.dash ? 1.5 : 2, 'stroke-dasharray': ser.dash || 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
      }
      for (const ser of ordered) {
        if (ser.shape) cfg.x.forEach((x, i) => marker(g, ser.shape, X(x), Y(Math.log10(ser.values[i])), ser.color, ser.hollow));
      }
      const cross = s('line', { y1: m.t, y2: H - m.b, stroke: C.ink2, 'stroke-width': 1, visibility: 'hidden' }, svg);
      const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
      const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hide(); };
      function showAt(i, px) {
        idx = i;
        const x = X(cfg.x[i]);
        cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
        const rows = cfg.series.map((ser) => ({ color: ser.color, value: sci(ser.values[i]), label: ser.label, v: ser.values[i] }))
          .sort((a, b) => b.v - a.v);
        tip.show(px === undefined ? x : px, 4, '|q| = ' + pow10Str(cfg.x[i]), rows);
      }
      const nearest = (px) => {
        let best = 0;
        cfg.x.forEach((x, i) => { if (Math.abs(X(x) - px) < Math.abs(X(cfg.x[best]) - px)) best = i; });
        return best;
      };
      hit.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * W;
        showAt(nearest(px), px);
      });
      hit.addEventListener('pointerleave', hide);
      svg.addEventListener('focus', () => showAt(idx));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowLeft' && idx > 0) { showAt(idx - 1); ev.preventDefault(); }
        if (ev.key === 'ArrowRight' && idx < cfg.x.length - 1) { showAt(idx + 1); ev.preventDefault(); }
        if (ev.key === 'Escape') hide();
      });
    }
    onResize(plot, draw);
    legend(box, cfg.series);
  }

  function oodPanels() {
    const box = document.getElementById('ood-panels');
    if (!box || !D) return;
    const o = D.ood;
    const band = [Math.log10(o.band[0]), Math.log10(o.band[1])];
    const panels = [
      { title: '(a) Flat ground', yDomain: [-9, 12], yStep: 3, yTitle: 'relative RMS error in σ',
        aria: 'Panel a, flat ground: relative RMS error in sigma against the test charge, log-log',
        series: [
          { label: '8-parameter head', color: C.blue, shape: 'circle', values: o.flat.head },
          { label: 'FNO, raw inputs', color: C.orange, shape: 'cross', values: o.flat.fno },
          { label: 'FNO + charge augmentation', color: C.orange, shape: 'diamond', values: o.flat.fno_qaug },
          { label: 'Set Transformer, raw inputs', color: C.orange, shape: 'square', values: o.flat.set_transformer },
          { label: 'DeepONet, raw inputs', color: C.orange, shape: 'down', values: o.flat.deeponet },
          { label: 'head with Q_{ref} pinned', color: C.orange, shape: 'up', values: o.flat.head_pinned },
          { label: 'anchor alone (exact on a plane)', color: C.anchor, shape: 'circle', values: o.flat.anchor },
        ] },
      { title: '(b) Grounded sphere', yDomain: [-3, 10], yStep: 3,
        aria: 'Panel b, grounded sphere: relative RMS error in sigma against the test charge, log-log',
        series: [
          { label: 'exact coefficient 1/(4π), discretised cap', color: C.ink, dash: '4 3', values: o.sphere.exact_coeff },
          { label: 'head, q > 0', color: C.blue, shape: 'circle', values: o.sphere.head_pos },
          { label: 'head, q < 0', color: C.blue, shape: 'circle', hollow: true, values: o.sphere.head_neg },
          { label: 'anchor alone', color: C.anchor, shape: 'circle', values: o.sphere.anchor },
          { label: 'head with Q_{ref} pinned', color: C.orange, shape: 'up', values: o.sphere.head_pinned },
        ] },
      { title: '(c) Same networks, dimensionless inputs', yDomain: [-4, 10], yStep: 3,
        aria: 'Panel c: FNO and DeepONet with dimensionless inputs or with the charge scale pinned, log-log',
        series: [
          { label: 'FNO, dimensionless', color: C.blue, shape: 'cross', values: o.dimless.fno_dim },
          { label: 'DeepONet, dimensionless', color: C.blue, shape: 'down', values: o.dimless.deeponet_dim },
          { label: 'FNO, Q_{ref} pinned', color: C.orange, shape: 'cross', values: o.dimless.fno_pinned },
          { label: 'DeepONet, Q_{ref} pinned', color: C.orange, shape: 'down', values: o.dimless.deeponet_pinned },
        ] },
    ];
    for (const p of panels) {
      const div = h('div', { class: 'panel' }, box);
      h('h4', {}, div, p.title);
      logPanel(div, Object.assign({ x: o.log10_q, xDomain: [-12.4, 0.75], band }, p));
    }
    const t = h('table', {}, h('div', { class: 'scroll' }, document.getElementById('ood-table')));
    const hr = h('tr', {}, h('thead', {}, t));
    h('th', {}, hr, 'series');
    o.log10_q.forEach((q) => h('th', {}, hr, '|q| = ' + pow10Str(q)));
    const tb = h('tbody', {}, t);
    for (const p of panels) {
      for (const ser of p.series) {
        const tr = h('tr', {}, tb);
        rich(h('td', {}, tr), p.title.slice(0, 3) + ' ' + ser.label);
        ser.values.forEach((v) => h('td', {}, tr, sci(v)));
      }
    }
  }

  // per-line chart of Table 3
  function linesChart() {
    const box = document.getElementById('lines-chart');
    if (!box || !D) return;
    const T = D.terrain;
    let metric = 'eV', focusRow = 0, width = 0;
    const tip = tooltip(box);
    const keys = { eV: ['eV_anchor', 'eV_head', 'induced-voltage error ε_V', 'induced-voltage error'],
                   es: ['es_anchor', 'es_head', 'relative RMS error in σ', 'relative RMS error in sigma'] };
    function draw(W) {
      const hadFocus = beginRedraw(box, tip);
      const [ka, kh, name, plain] = keys[metric];
      const rowH = 22, gap = 10, m = { l: 112, r: 16, t: 34, b: 40 };
      const tiles = [...new Set(T.lines.map((l) => l.tile))];
      const H = m.t + m.b + T.lines.length * rowH + (tiles.length - 1) * gap;
      const xmax = metric === 'eV' ? 14 : 20;
      const svg = chartSvg(box, W, H, `Held-out ${plain} per line, anchor against head`, hadFocus);
      const X = lin(0, xmax, m.l, W - m.r);
      const tstep = (W - m.l - m.r) / (xmax / 2) < 34 ? 4 : 2;
      for (let v = 0; v <= xmax; v += tstep) {
        s('line', { x1: X(v), x2: X(v), y1: m.t - 6, y2: H - m.b, stroke: C.hair }, svg);
        txt(svg, X(v), H - m.b + 16, v + '%', { 'text-anchor': 'middle' });
      }
      txt(svg, (m.l + W - m.r) / 2, H - 6, 'held-out ' + name + ' (%)', { 'text-anchor': 'middle', fill: C.ink2 });
      [[T.median[ka], C.anchor, 'anchor median'], [T.median[kh], C.blue, 'head median']].forEach(([v, col, lab], j) => {
        s('line', { x1: X(v), x2: X(v), y1: m.t - 6, y2: H - m.b, stroke: col, 'stroke-width': 1.2 }, svg);
        txt(svg, X(v) + (j ? -4 : 4), m.t - 12, `${lab} ${pct(v)}`, { 'text-anchor': j ? 'end' : 'start', fill: C.ink2 });
      });
      const hl = s('rect', { x: 0, width: W, height: rowH, fill: C.wash, opacity: 0, 'pointer-events': 'none' }, svg);
      const rows = [];
      let y = m.t, prev = null;
      T.lines.forEach((l) => {
        if (prev !== null && l.tile !== prev) y += gap;
        const cy = y + rowH / 2;
        if (l.tile !== prev) txt(svg, 4, cy + 4, 'tile ' + l.tile, { fill: C.ink, 'font-weight': 600 });
        txt(svg, 54, cy + 4, 'line ' + l.line + (l.letter ? ' · ' + l.letter : ''), { fill: C.ink2 });
        const a = l[ka], hd = l[kh];
        s('line', { x1: X(a), x2: X(hd), y1: cy, y2: cy, stroke: C.axis, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
        marker(svg, 'circle', X(a), cy, C.anchor);
        marker(svg, 'circle', X(hd), cy, C.blue);
        rows.push({ l, cy, a, hd });
        prev = l.tile;
        y += rowH;
      });
      const hide = () => { hl.setAttribute('opacity', 0); tip.hide(); };
      function showRow(i) {
        focusRow = i;
        const r = rows[i];
        hl.setAttribute('y', r.cy - rowH / 2); hl.setAttribute('opacity', 1);
        const lab = `tile ${r.l.tile}, line ${r.l.line}${r.l.letter ? ' (' + r.l.letter + ')' : ''}`;
        tip.show(X(Math.max(r.a, r.hd)), r.cy - 10, lab,
          [{ color: C.blue, value: pct(r.hd), label: 'head' }, { color: C.anchor, value: pct(r.a), label: 'anchor' }]);
      }
      rows.forEach((r, i) => {
        s('rect', { x: 0, y: r.cy - rowH / 2, width: W, height: rowH, fill: 'transparent' }, svg)
          .addEventListener('pointerenter', () => showRow(i));
      });
      svg.addEventListener('pointerleave', hide);
      svg.addEventListener('focus', () => showRow(focusRow));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowDown' && focusRow < rows.length - 1) { showRow(focusRow + 1); ev.preventDefault(); }
        if (ev.key === 'ArrowUp' && focusRow > 0) { showRow(focusRow - 1); ev.preventDefault(); }
        if (ev.key === 'Escape') hide();
      });
    }
    onResize(box, (w) => { width = w; draw(w); });
    legend(box, [{ label: 'anchor', color: C.anchor, shape: 'circle', line: false },
                 { label: 'head', color: C.blue, shape: 'circle', line: false }]);
    document.querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => {
      metric = b.dataset.metric;
      document.querySelectorAll('.seg').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      if (width) draw(width);
    }));
    const t = h('table', {}, h('div', { class: 'scroll' }, document.getElementById('lines-table')));
    const hr = h('tr', {}, h('thead', {}, t));
    ['tile', 'line', 'ε_V anchor', 'ε_V head', 'σ error anchor', 'σ error head'].forEach((c) => rich(h('th', {}, hr), c));
    const tb = h('tbody', {}, t);
    const cells = (arr) => { const tr = h('tr', {}, tb); arr.forEach((c) => h('td', {}, tr, String(c))); };
    T.lines.forEach((l) => cells([l.tile, l.line + (l.letter ? ' ' + l.letter : ''), pct(l.eV_anchor), pct(l.eV_head), pct(l.es_anchor), pct(l.es_head)]));
    cells(['median', '', pct(T.median.eV_anchor), pct(T.median.eV_head), pct(T.median.es_anchor), pct(T.median.es_head)]);
  }

  // locality chart of Table 11
  function localityChart() {
    const box = document.getElementById('locality-chart');
    if (!box || !D) return;
    const L = D.terrain.locality;
    const tip = tooltip(box);
    const labels = L.R_m.map((r) => (r === null ? '∞' : r + ' m'));
    let k = 0;
    function draw(W) {
      const hadFocus = beginRedraw(box, tip);
      const H = 240, m = { l: 44, r: 16, t: 14, b: 40 };
      const svg = chartSvg(box, W, H, 'Median induced-voltage error of two Born terms against the terrain radius, with the head as a horizontal line', hadFocus);
      const n = labels.length;
      const X = (i) => m.l + 18 + ((i + (i === n - 1 ? 0.5 : 0)) / (n - 0.5)) * (W - m.l - m.r - 36);
      const Y = lin(0, 2, H - m.b, m.t);
      for (let v = 0; v <= 2.0001; v += 0.5) {
        s('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: C.hair }, svg);
        txt(svg, m.l - 6, Y(v) + 4, v.toFixed(1) + '%', { 'text-anchor': 'end' });
      }
      labels.forEach((lab, i) => txt(svg, X(i), H - m.b + 16, lab, { 'text-anchor': 'middle' }));
      txt(svg, (m.l + W - m.r) / 2, H - 6, 'terrain radius R given to the two Born terms', { 'text-anchor': 'middle', fill: C.ink2 });
      s('line', { x1: m.l, x2: W - m.r, y1: Y(L.eV_head), y2: Y(L.eV_head), stroke: C.blue, 'stroke-width': 2 }, svg);
      txt(svg, W - m.r, Y(L.eV_head) - 6, `head ${pct(L.eV_head)}`, { 'text-anchor': 'end', fill: C.ink });
      const pts = L.eV_born2.map((v, i) => [X(i), Y(v)]);
      s('polyline', { points: pts.slice(0, -1).map((p) => p.join(',')).join(' '), fill: 'none', stroke: C.aqua, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      pts.forEach((p) => marker(svg, 'circle', p[0], p[1], C.aqua));
      txt(svg, pts[0][0] + 8, pts[0][1] - 8, 'two Born terms', { fill: C.ink });
      const shows = pts.map((p, i) => () => {
        k = i;
        tip.show(p[0], 4, 'R = ' + labels[i],
          [{ color: C.aqua, value: pct(L.eV_born2[i]), label: 'two Born terms' }, { color: C.blue, value: pct(L.eV_head), label: 'head' }]);
      });
      pts.forEach((p, i) => {
        s('rect', { x: p[0] - 18, y: m.t, width: 36, height: H - m.t - m.b, fill: 'transparent' }, svg)
          .addEventListener('pointerenter', shows[i]);
      });
      svg.addEventListener('pointerleave', () => tip.hide());
      svg.addEventListener('focus', () => shows[k]());
      svg.addEventListener('blur', () => tip.hide());
      svg.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowRight' && k < n - 1) { shows[k + 1](); ev.preventDefault(); }
        if (ev.key === 'ArrowLeft' && k > 0) { shows[k - 1](); ev.preventDefault(); }
        if (ev.key === 'Escape') tip.hide();
      });
    }
    onResize(box, draw);
    legend(box, [{ label: 'two Born terms within R', color: C.aqua, shape: 'circle' }, { label: 'head', color: C.blue }]);
    const t = h('table', {}, document.getElementById('locality-table'));
    const hr = h('tr', {}, h('thead', {}, t));
    ['R', 'two Born terms, ε_V', 'two Born terms, σ error'].forEach((c) => rich(h('th', {}, hr), c));
    const tb = h('tbody', {}, t);
    const cells = (arr) => { const tr = h('tr', {}, tb); arr.forEach((c) => h('td', {}, tr, c)); };
    labels.forEach((lab, i) => cells([lab, pct(L.eV_born2[i]), pct(L.es_born2[i])]));
    cells(['head', pct(L.eV_head), pct(L.es_head)]);
  }

  // grounded sphere: Kelvin density, anchor and anchor + curvature term (R = 1, q = 1)
  const W6 = 0.0782;                                      // learned coefficient, seed 0 (Table 2)
  function sphereFields(d, n) {
    const th = [], exact = [], anchor = [], canon = [], learned = [];
    for (let i = 0; i < n; i++) {
      const t = (Math.PI * i) / (n - 1);
      const D3 = Math.pow(1 + d * d - 2 * d * Math.cos(t), 1.5);
      const ex = -(d * d - 1) / (4 * Math.PI * D3);          // Kelvin
      const an = (1 - d * Math.cos(t)) / (2 * Math.PI * D3); // -grad(phi).n / 2pi, h = d cos(t) - 1
      const hphi = -1 / Math.cbrt(D3);                        // H * phi with H = -1/R, phi = q/D
      th.push(t); exact.push(ex); anchor.push(an);
      canon.push(an + hphi / (4 * Math.PI));
      learned.push(an + W6 * hphi);
    }
    return { th, exact, anchor, canon, learned };
  }
  function relRms(model, ref, th) {                         // area-weighted over the whole sphere
    let num = 0, den = 0;
    for (let i = 0; i < th.length; i++) {
      const w = Math.sin(th[i]);
      num += w * (model[i] - ref[i]) ** 2;
      den += w * ref[i] ** 2;
    }
    return Math.sqrt(num / den);
  }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function fmtTick(v, step) {
    const dec = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(dec).replace('-', '−');
  }

  function sphereDemo() {
    const root = document.getElementById('sphere-demo');
    if (!root) return;
    const slider = document.getElementById('d-slider');
    const out = document.getElementById('d-value');
    const play = document.getElementById('d-play');
    const sch = document.getElementById('sphere-schematic');
    const chartBox = document.getElementById('sphere-chart');
    const readout = document.getElementById('sphere-readout');
    const live = document.getElementById('sphere-live');
    const tip = tooltip(chartBox);
    const BAND = '#d3d1c8';                               // the exact solution, drawn as a wide band
    let width = 0, d = parseFloat(slider.value), k = 45;

    function drawSchematic(F) {
      sch.replaceChildren();
      const cx = 150, cy = 256, R = 50;
      const sy = cy - d * R, iy = cy - R / d;
      const mx = Math.max(...F.exact.map(Math.abs));
      const outer = [], inner = [];
      for (let j = 0; j <= 72; j++) {
        const a = (Math.PI * 2 * j) / 72;
        const i = Math.round((Math.acos(Math.cos(a)) / Math.PI) * (F.th.length - 1));
        const r = R + 1 + (22 * Math.abs(F.exact[i])) / mx;
        outer.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]);
        inner.push([cx + (R + 1) * Math.sin(a), cy - (R + 1) * Math.cos(a)]);
      }
      const ring = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L');
      s('path', { d: 'M' + ring(outer) + ' Z M' + ring(inner.reverse()) + ' Z', fill: C.blue, 'fill-opacity': 0.22, 'fill-rule': 'evenodd' }, sch);
      s('circle', { cx, cy, r: R, fill: '#fff', stroke: C.ink, 'stroke-width': 1.6 }, sch);
      const th = Math.acos(1 / d);                          // horizon: tangent lines from the charge
      for (const sg of [-1, 1]) {
        const hx = cx + sg * R * Math.sin(th), hy = cy - R * Math.cos(th);
        s('line', { x1: cx, y1: sy, x2: hx + 0.35 * (hx - cx), y2: hy + 0.35 * (hy - sy), stroke: C.axis, 'stroke-width': 1 }, sch);
      }
      s('line', { x1: cx, y1: sy, x2: cx, y2: cy, stroke: C.axis, 'stroke-width': 1 }, sch);
      s('circle', { cx, cy, r: 2.2, fill: C.ink }, sch);
      s('circle', { cx, cy: iy, r: 3.5, fill: C.blue }, sch);
      s('circle', { cx, cy: sy, r: 5, fill: '#c0392b', stroke: C.surface, 'stroke-width': 3, 'paint-order': 'stroke' }, sch);
      const halo = { stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' };
      txt(sch, cx + 9, sy + 4, '+q', Object.assign({ fill: C.ink, 'font-size': 13 }, halo));
      txt(sch, cx, iy + 16, '−qR/d', Object.assign({ fill: C.ink2, 'font-size': 11, 'text-anchor': 'middle' }, halo));
      txt(sch, cx, cy + R + 26, 'grounded sphere, radius R', { fill: C.ink2, 'font-size': 12, 'text-anchor': 'middle' });
    }

    function drawChart(F) {
      const hadFocus = beginRedraw(chartBox, tip);
      const W = width, H = 280, m = { l: 52, r: 12, t: 12, b: 40 };
      const svg = chartSvg(chartBox, W, H, 'Induced charge density on the sphere against the angle from the charge: exact, anchor plus curvature term, anchor alone', hadFocus);
      const lo = Math.min(...F.exact, ...F.anchor), hi = Math.max(0, ...F.anchor);
      const step = niceStep((hi - lo) / 5);
      const y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
      const X = lin(0, 180, m.l, W - m.r), Y = lin(y0, y1, H - m.b, m.t);
      for (let v = y0; v <= y1 + step / 2; v += step) {
        const z = Math.abs(v) < step / 1e6;
        s('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: z ? C.axis : C.hair, 'stroke-width': 1 }, svg);
        txt(svg, m.l - 6, Y(v) + 4, fmtTick(z ? 0 : v, step), { 'text-anchor': 'end' });
      }
      for (let a = 0; a <= 180; a += 30) txt(svg, X(a), H - m.b + 16, a + '°', { 'text-anchor': 'middle' });
      txt(svg, (m.l + W - m.r) / 2, H - 6, 'angle from the charge, θ', { 'text-anchor': 'middle', fill: C.ink2 });
      const yc = m.t + (H - m.b - m.t) / 2;
      txt(svg, 12, yc, 'σR²/q', { fill: C.ink2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${yc})` });
      const hz = (Math.acos(1 / d) * 180) / Math.PI;
      s('line', { x1: X(hz), x2: X(hz), y1: m.t, y2: H - m.b, stroke: C.axis, 'stroke-width': 1 }, svg);
      txt(svg, X(hz) + 4, m.t + 10, 'horizon', { fill: C.ink2 });
      const deg = F.th.map((t) => (t * 180) / Math.PI);
      const path = (arr) => deg.map((a, i) => `${X(a).toFixed(1)},${Y(arr[i]).toFixed(1)}`).join(' ');
      s('polyline', { points: path(F.exact), fill: 'none', stroke: BAND, 'stroke-width': 9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      s('polyline', { points: path(F.anchor), fill: 'none', stroke: C.anchor, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      s('polyline', { points: path(F.canon), fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      const cross = s('line', { y1: m.t, y2: H - m.b, stroke: C.ink2, visibility: 'hidden' }, svg);
      const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
      const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hide(); };
      const show = (i, px) => {
        k = i;
        cross.setAttribute('x1', X(deg[i])); cross.setAttribute('x2', X(deg[i])); cross.setAttribute('visibility', 'visible');
        tip.show(px === undefined ? X(deg[i]) : px, 4, 'θ = ' + deg[i].toFixed(0) + '°', [
          { color: BAND, value: F.exact[i].toFixed(4), label: 'exact' },
          { color: C.blue, value: F.canon[i].toFixed(4), label: 'anchor + curvature' },
          { color: C.anchor, value: F.anchor[i].toFixed(4), label: 'anchor alone' },
        ]);
      };
      hit.addEventListener('pointermove', (ev) => {
        const r = svg.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * W;
        const a = Math.max(0, Math.min(180, ((px - m.l) / (W - m.l - m.r)) * 180));
        show(Math.round((a / 180) * (deg.length - 1)), px);
      });
      hit.addEventListener('pointerleave', hide);
      svg.addEventListener('focus', () => show(k));
      svg.addEventListener('blur', hide);
      svg.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowRight' && k < deg.length - 1) { show(Math.min(deg.length - 1, k + 5)); ev.preventDefault(); }
        if (ev.key === 'ArrowLeft' && k > 0) { show(Math.max(0, k - 5)); ev.preventDefault(); }
        if (ev.key === 'Escape') hide();
      });
    }

    function errors(F) {
      return { ea: relRms(F.anchor, F.exact, F.th), ec: relRms(F.canon, F.exact, F.th), el: relRms(F.learned, F.exact, F.th) };
    }
    function writeReadout(F) {
      const e = errors(F);
      readout.replaceChildren();
      h('span', { class: 'readout-head' }, readout, `Relative RMS error over the whole sphere, one charge at d/R = ${d.toFixed(2)}`);
      const dl = h('dl', {}, readout);
      const item = (term, val) => { const div = h('div', {}, dl); h('dt', {}, div, term); h('dd', {}, div, val); };
      item('anchor alone', (100 * e.ea).toFixed(1) + '%');
      item('anchor + curvature term', e.ec < 1e-12 ? '0 (exact)' : (100 * e.ec).toExponential(1) + '%');
      item(`anchor + the 8-parameter head's coefficient ${W6} (seed 0)`, (100 * e.el).toFixed(2) + '%');
    }
    function announce(F) {
      const e = errors(F);
      live.textContent = `d over R ${d.toFixed(2)}: anchor alone ${(100 * e.ea).toFixed(1)} percent, anchor plus curvature term exact.`;
    }
    function update() {
      const F = sphereFields(d, 181);
      drawSchematic(F);
      if (width) drawChart(F);
      out.textContent = d.toFixed(2);
      slider.setAttribute('aria-valuetext', 'd over R = ' + d.toFixed(2));
      writeReadout(F);
      return F;
    }

    onResize(chartBox, (w) => { width = w; update(); });
    legend(chartBox, [{ label: 'Kelvin solution (exact)', color: BAND, band: true },
                      { label: 'anchor + curvature term', color: C.blue },
                      { label: 'anchor alone', color: C.anchor }]);
    slider.addEventListener('input', () => { stop(false); d = parseFloat(slider.value); update(); });
    slider.addEventListener('change', () => announce(sphereFields(d, 181)));

    // Play: sweep d/R between 4 and 1.1, starting from the current value
    let raf = 0, t0 = 0, ph0 = 0;
    function frame(t) {
      if (!t0) t0 = t;
      const ph = (ph0 + (t - t0) / 9000) % 1;              // 9 s per cycle
      const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);     // 0 → 1 → 0, eased
      d = 4 - u * (4 - 1.1);
      slider.value = d.toFixed(2);
      update();
      raf = requestAnimationFrame(frame);
    }
    function stop(speak) {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0; t0 = 0;
      play.textContent = 'Play';
      if (speak !== false) announce(sphereFields(d, 181));
    }
    play.addEventListener('click', () => {
      if (raf) { stop(); return; }
      const u0 = Math.min(1, Math.max(0, (4 - d) / 2.9));
      ph0 = Math.acos(1 - 2 * u0) / (2 * Math.PI);
      play.textContent = 'Pause';
      raf = requestAnimationFrame(frame);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { if (!es[0].isIntersecting) stop(false); }).observe(root);
    }
    if (REDUCED) play.title = 'Moves the charge continuously';
    update();
  }

  // BibTeX copy
  function copyBib() {
    const b = document.getElementById('copy-bib');
    if (!b) return;
    b.addEventListener('click', async () => {
      const pre = document.getElementById('bib');
      try {
        await navigator.clipboard.writeText(pre.innerText);
      } catch (e) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      b.textContent = 'Copied';
      setTimeout(() => { b.textContent = 'Copy'; }, 1600);
    });
  }

  for (const init of [sphereDemo, oodPanels, linesChart, localityChart, copyBib]) {
    try { init(); } catch (e) { console.error(e); }
  }
})();
