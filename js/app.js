/* =========================================================
 *  AutoCalabazas · Interfaz
 * ========================================================= */
(function () {
  'use strict';
  const { generate, CODE } = window.PumpkinGen;
  const { buildRandomLua, buildBakedLua } = window.PumpkinLua;
  const { resolveColor, PRESETS } = window.PumpkinBlocks;
  const $ = (s) => document.querySelector(s);

  const CONTROLS = [
    { title: 'Tamaño máximo', icon: '📐', items: [
      { id: 'maxW', label: 'Ancho (X)', min: 3, max: 48, value: 11, unit: ' bl' },
      { id: 'maxH', label: 'Alto (Y)', min: 3, max: 48, value: 9, unit: ' bl' },
      { id: 'maxD', label: 'Fondo (Z)', min: 3, max: 48, value: 11, unit: ' bl' },
      { id: 'variation', label: 'Variación de tamaño', min: 0, max: 80, value: 30, unit: '%',
        hint: 'Cuánto puede encoger cada eje respecto al máximo' },
    ] },
    { title: 'Forma', icon: '🎃', items: [
      { id: 'lobesMin', label: 'Gajos mín.', min: 3, max: 16, value: 6 },
      { id: 'lobesMax', label: 'Gajos máx.', min: 3, max: 16, value: 10 },
      { id: 'groove', label: 'Profundidad de surcos', min: 0, max: 45, value: 18, unit: '%' },
      { id: 'irregular', label: 'Irregularidad de gajos', min: 0, max: 40, value: 12, unit: '%' },
      { id: 'roundness', label: 'Cuadratura', min: 15, max: 40, value: 22, scale: 10,
        hint: 'Bajo = redonda · Alto = más cúbica' },
      { id: 'perfectRound', type: 'toggle', label: 'Redonda perfecta', value: false, hint: 'Ignora gajos y surcos, hace una esfera suave' },
      { id: 'dip', label: 'Hundido del tallo', min: 0, max: 50, value: 25, unit: '%' },
    ] },
    { title: 'Tallo y hojas', icon: '🌿', items: [
      { id: 'stemMin', label: 'Tallo mín.', min: 1, max: 8, value: 2, unit: ' bl' },
      { id: 'stemMax', label: 'Tallo máx.', min: 1, max: 8, value: 4, unit: ' bl' },
      { id: 'stemCurve', type: 'toggle', label: 'Tallo curvado', value: true },
      { id: 'stemSymmetric', type: 'toggle', label: 'Tallo simétrico/grueso', value: false, hint: 'Centra y engrosa el tallo para que sea perfectamente simétrico' },
      { id: 'stemTip', type: 'toggle', label: 'Punta con escalera/losa', value: true },
      { id: 'collar', type: 'toggle', label: 'Cuello de escaleras', value: true },
      { id: 'leaves', type: 'toggle', label: 'Hojas', value: true },
    ] },
    { title: 'Detalles', icon: '✨', items: [
      { id: 'detail', label: 'Cantidad de detalle', min: 0, max: 100, value: 70, unit: '%' },
      { id: 'useStairs', type: 'toggle', label: 'Escaleras en bordes', value: true },
      { id: 'useSlabs', type: 'toggle', label: 'Losas de suavizado', value: true },
      { id: 'useAccent', type: 'toggle', label: 'Color en surcos', value: true },
      { id: 'hollow', type: 'toggle', label: 'Hueca (menos bloques)', value: false },
      { id: 'carvedFace', type: 'toggle', label: 'Cara tétrica (Jack-o\'-lantern)', value: false, hint: 'Talla una cara de Halloween en el frente' },
    ] },
  ];

  const BLOCK_FIELDS = [
    ['body', 'Cuerpo'], ['bodyStairs', 'Escalera cuerpo'], ['bodySlab', 'Losa cuerpo'],
    ['accent', 'Surcos'], ['stem', 'Tallo'], ['stemStairs', 'Escalera tallo'],
    ['stemSlab', 'Losa tallo'], ['leaf', 'Hoja'],
  ];

  // ---------- Construir controles ----------
  const controlsRoot = $('#controls');
  for (const sec of CONTROLS) {
    const el = document.createElement('section');
    el.className = 'ctl-section';
    el.innerHTML = `<h2 class="ctl-title"><span>${sec.icon}</span>${sec.title}</h2>`;
    const toggles = document.createElement('div');
    toggles.className = 'toggle-grid';
    for (const it of sec.items) {
      if (it.type === 'toggle') {
        const lab = document.createElement('label');
        lab.className = 'toggle';
        lab.innerHTML = `<input type="checkbox" id="${it.id}" ${it.value ? 'checked' : ''}><span class="switch"></span><span>${it.label}</span>`;
        toggles.appendChild(lab);
      } else {
        const row = document.createElement('div');
        row.className = 'range';
        row.innerHTML = `
          <div class="range-head"><label for="${it.id}">${it.label}</label><output id="${it.id}-out"></output></div>
          <input type="range" id="${it.id}" min="${it.min}" max="${it.max}" value="${it.value}">
          ${it.hint ? `<small>${it.hint}</small>` : ''}`;
        el.appendChild(row);
        const input = row.querySelector('input');
        const out = row.querySelector('output');
        const upd = () => {
          const v = it.scale ? (input.value / it.scale).toFixed(1) : input.value;
          out.textContent = v + (it.unit || '');
          const pct = ((input.value - it.min) / (it.max - it.min)) * 100;
          input.style.setProperty('--fill', pct + '%');
        };
        input.addEventListener('input', upd);
        upd();
      }
    }
    if (toggles.children.length) el.appendChild(toggles);
    controlsRoot.appendChild(el);
  }

  // ---------- Bloques ----------
  const presetSel = $('#preset');
  for (const [k, p] of Object.entries(PRESETS)) {
    const o = document.createElement('option');
    o.value = k; o.textContent = p.name;
    presetSel.appendChild(o);
  }
  const blockGrid = $('#blockGrid');
  for (const [key, label] of BLOCK_FIELDS) {
    const row = document.createElement('label');
    row.className = 'block-field';
    row.innerHTML = `<span class="swatch" id="sw-${key}"></span><span class="bf-label">${label}</span>
      <input type="text" id="blk-${key}" spellcheck="false" autocomplete="off">`;
    blockGrid.appendChild(row);
  }
  function applyPreset(k) {
    const p = PRESETS[k];
    for (const [key] of BLOCK_FIELDS) $('#blk-' + key).value = p[key];
    updateSwatches();
  }
  function readBlocks() {
    const b = {};
    for (const [key] of BLOCK_FIELDS) b[key] = $('#blk-' + key).value.trim();
    return b;
  }
  function updateSwatches() {
    for (const [key] of BLOCK_FIELDS) $('#sw-' + key).style.background = resolveColor($('#blk-' + key).value);
  }

  // ---------- Parámetros ----------
  function readParams() {
    const p = {};
    for (const sec of CONTROLS)
      for (const it of sec.items) {
        const el = document.getElementById(it.id);
        p[it.id] = it.type === 'toggle' ? el.checked : Number(el.value) / (it.scale || 1);
      }
    return p;
  }

  function colorMapper(b) {
    const map = {};
    const C = (id) => new THREE.Color(resolveColor(id));
    map[CODE.BODY] = C(b.body);
    map[CODE.ACCENT] = C(b.accent);
    map[CODE.SLAB_B] = map[CODE.SLAB_T] = C(b.bodySlab);
    map[CODE.STEM] = C(b.stem);
    map[CODE.LEAF] = C(b.leaf);
    map[CODE.STEM_SLAB] = C(b.stemSlab);
    const bs = C(b.bodyStairs), ss = C(b.stemStairs);
    return (code) => map[code] || (code >= 20 ? ss : code >= 10 ? bs : map[CODE.BODY]);
  }

  // ---------- Estado ----------
  const viewer = new window.PumpkinViewer.MainViewer($('#viewer'));
  const randSeed = () => Math.floor(Math.random() * 999999) + 1;
  let seed = randSeed();
  let gallerySeeds = [];
  let model = null;
  let exportTab = 'random';

  function renderMain(refit) {
    const p = readParams();
    const b = readBlocks();
    model = generate(p, seed);
    viewer.show(model, colorMapper(b), refit);
    $('#seed').value = seed;
    $('#statDims').textContent = `${model.W} × ${model.maxY} × ${model.D}`;
    $('#statBlocks').textContent = model.blocks.length;
    $('#statLobes').textContent = model.lobes;
    $('#statStairs').textContent = model.stats.stairs;
    $('#statSlabs').textContent = model.stats.slabs;
    updateExport();
  }

  function renderGallery(newSeeds) {
    if (newSeeds || !gallerySeeds.length) gallerySeeds = Array.from({ length: 8 }, randSeed);
    const p = readParams();
    const cm = colorMapper(readBlocks());
    const root = $('#gallery');
    root.innerHTML = '';
    gallerySeeds.forEach((s, n) => {
      const m = generate(p, s);
      const btn = document.createElement('button');
      btn.className = 'thumb' + (s === seed ? ' active' : '');
      btn.id = 'thumb-' + n;
      btn.title = `Seed ${s}`;
      btn.style.animationDelay = n * 40 + 'ms';
      btn.innerHTML = `<img alt="Variante ${n + 1}" src="${window.PumpkinViewer.renderThumb(m, cm)}">
        <span class="thumb-meta">${m.W}×${m.maxY}×${m.D}</span>`;
      btn.addEventListener('click', () => {
        seed = s;
        document.querySelectorAll('.thumb').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        renderMain(true);
      });
      root.appendChild(btn);
    });
  }

  function updateExport() {
    const p = readParams();
    const b = readBlocks();
    const code = exportTab === 'random' ? buildRandomLua(p, b) : buildBakedLua(model, b);
    $('#code').value = code;
    $('#codeInfo').textContent =
      exportTab === 'random'
        ? 'Cada clic en Axiom crea una calabaza distinta con estos ajustes.'
        : `Coloca siempre esta calabaza exacta (seed ${model.seed}, ${model.blocks.length} bloques).`;
    $('#codeLines').textContent = code.split('\n').length + ' líneas';
  }

  // ---------- Eventos ----------
  let tmr = null;
  const schedule = (gallery) => {
    clearTimeout(tmr);
    tmr = setTimeout(() => { renderMain(false); if (gallery) renderGallery(false); }, 90);
  };
  controlsRoot.addEventListener('input', () => schedule(true));
  blockGrid.addEventListener('input', () => { updateSwatches(); schedule(true); });
  presetSel.addEventListener('change', () => { applyPreset(presetSel.value); renderMain(false); renderGallery(false); });

  $('#btnRandom').addEventListener('click', () => { seed = randSeed(); renderMain(true); });
  $('#seed').addEventListener('change', () => { seed = Math.max(1, parseInt($('#seed').value, 10) || 1); renderMain(true); });
  $('#btnGallery').addEventListener('click', () => renderGallery(true));
  $('#btnRotate').addEventListener('click', (e) => {
    viewer.autoRotate = !viewer.autoRotate;
    e.currentTarget.classList.toggle('on', viewer.autoRotate);
  });
  $('#btnFit').addEventListener('click', () => model && viewer.fit(model));

  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      exportTab = t.dataset.tab;
      updateExport();
    })
  );

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 1800);
  }
  $('#btnCopy').addEventListener('click', async () => {
    const ta = $('#code');
    try { await navigator.clipboard.writeText(ta.value); }
    catch { ta.select(); document.execCommand('copy'); }
    toast('📋 Script copiado — pégalo en el Script Brush de Axiom');
  });
  $('#btnDownload').addEventListener('click', () => {
    const name = exportTab === 'random' ? 'calabaza_aleatoria.lua' : `calabaza_${model.seed}.lua`;
    const blob = new Blob([$('#code').value], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('💾 ' + name + ' descargado');
  });

  // ---------- Inicio ----------
  presetSel.value = 'clasica';
  applyPreset('clasica');
  gallerySeeds = Array.from({ length: 8 }, randSeed);
  seed = gallerySeeds[0];
  renderMain(true);
  renderGallery(false);
})();
