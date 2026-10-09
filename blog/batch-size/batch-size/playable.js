/* Each interaction answers a question in the essay; measurements stay separate from toys. */
'use strict';
(function () {
  const el = id => document.getElementById(id);
  const gridStroke = () => token('--line');
  const text = (x, y, label, extra = '') => svgText(x, y, label, `font-size="17" ${extra}`);

  function drawMatchup() {
    const first = el('pair-a').value, second = el('pair-b').value;
    const measurements = DATA.rankings.filter(r => r.family === rankState.family);
    const points = rankBatches.map(batch => ({ batch,
      value: measurements.find(r => r.batch === batch && r.optimizer === second).loss
        - measurements.find(r => r.batch === batch && r.optimizer === first).loss }));
    const width = Math.max(240, el('pair-chart').clientWidth || 320);
    el('pair-chart').setAttribute('viewBox', `0 0 ${width} 112`);
    const f = frame(width, 112, { l: 58, r: 16, t: 10, b: 28 });
    const limit = Math.ceil(Math.max(.004, ...points.map(p => Math.abs(p.value))) * 1.15 / .005) * .005;
    const x = b => f.l + Math.log2(b / rankBatches[0]) / 4 * f.iw;
    const y = v => f.t + f.ih * (.5 - v / (2 * limit));
    let markup = `<rect x="${f.l}" y="${y(.002)}" width="${f.iw}" height="${y(-.002)-y(.002)}" fill="${token('--sunken')}"/>`;
    [-limit, 0, limit].forEach(v => {
      markup += `<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(v)}" y2="${y(v)}" stroke="${gridStroke()}" ${v===0?'stroke-width="1.5"':'stroke-dasharray="2 5"'}/>`;
      markup += svgText(f.l-12, y(v)+5, v.toFixed(3), 'font-size="17" text-anchor="end"');
    });
    el('pair-axis-quantity').innerHTML=mathMarkup(`<msub><mi>L</mi><mtext>${second}</mtext></msub><mo>−</mo><msub><mi>L</mi><mtext>${first}</mtext></msub>`);
    markup += `<path d="${line(points, p=>x(p.batch), p=>y(p.value))}" fill="none" stroke="${token('--ink')}" stroke-width="2.3" stroke-linejoin="round"/>`;
    points.forEach(p => {
      const sign = p.value > 0 ? first : p.value < 0 ? second : 'Tie';
      markup += `<circle cx="${x(p.batch)}" cy="${y(p.value)}" r="${p.batch===rankBatches[rankState.index]?5.5:3.5}" fill="${sign==='Tie'?token('--muted'):colors[sign]}" stroke="${token('--surface')}" stroke-width="2"><title>${batchName(p.batch)}: ${sign}${sign==='Tie'?'':` leads by ${Math.abs(p.value).toFixed(4)} nats`}</title></circle>`;
      markup += svgText(x(p.batch), f.h-13, batchName(p.batch), `font-size="17" text-anchor="${p.batch===rankBatches.at(-1)?'end':p.batch===rankBatches[0]?'start':'middle'}"`);
    });
    el('pair-chart').innerHTML = `<title>${first} versus ${second}: positive values favor ${first}, negative values favor ${second}</title>${markup}${researchAxes(f)}`;
    const start = points[0].value, end = points[3].value;
    const signedWinner = v => v > 0 ? first : second;
    el('pair-verdict').textContent = first === second ? 'Same optimizer: zero difference.'
      : start*end < 0 ? `${signedWinner(start)} leads at 128K; ${signedWinner(end)} leads at 2M.`
      : end===0?'Tied at 2M.':`${signedWinner(end)} leads at 2M by ${Math.abs(end).toFixed(4)} nats.`;
  }
  ['pair-a', 'pair-b'].forEach(id => el(id).addEventListener('change', drawMatchup));
  addEventListener('batchsize:rankings', drawMatchup);

  const { noiseLevels, columns, winner: winnerResult } = PhaseMap;
  const phaseCache = new Map();
  let mapKey = '', pendingKey = '', phaseFrame = 0, phaseVisible = false;
  let phaseWorker = null, workerUnavailable = false, jobId = 0, jobTimeout = 0;

  function scaffoldPhaseMap() {
    if (el('phase-map').childElementCount) return;
    let html = `<div class="phase-axis phase-axis-x"><span>Batch size ${mathMarkup(mathVariable('B'))}</span><i aria-hidden="true"></i></div>`
      + `<div class="phase-axis phase-axis-y"><span>Noise variance ${mathMarkup(mathVariable('c',1))}</span><i aria-hidden="true"></i></div>`;
    for (let exponent = 0; exponent < columns; exponent++) {
      const batch = 2 ** exponent;
      html += `<span class="phase-column" style="grid-column:${exponent + 3};grid-row:2">${batch >= 1024 ? batch / 1024 + 'K' : batch}</span>`;
    }
    noiseLevels.forEach((noise, row) => {
      html += `<span class="phase-row" style="grid-column:2;grid-row:${row + 3}">${noise}</span>`;
      for (let exponent = 0; exponent < columns; exponent++) {
        html += `<button class="phase-cell" style="grid-column:${exponent + 3};grid-row:${row + 3}" data-exponent="${exponent}" data-noise="${noise}" data-row="${row}" tabindex="-1" disabled aria-label="Batch ${2 ** exponent}, noise variance ${noise}: calculating"><span aria-hidden="true"></span></button>`;
      }
    });
    el('phase-map').innerHTML = html;
  }
  function setPhaseBusy(busy) {
    el('phase-map').setAttribute('aria-busy', String(busy));
    el('phase-map').classList.toggle('is-updating', busy);
    el('phase-progress').hidden = !busy;
    el('phase-status').hidden = !busy;
    el('phase-map').querySelectorAll('button').forEach(cell => { cell.disabled = busy; });
    el('phase-status').textContent = busy ? 'Comparing 104 experiments…' : '';
    if (busy) el('phase-progress').value = 0;
  }
  function showPhaseMap(key, cells, execution, computeMs = 0) {
    mapKey = key;
    const buttons = [...el('phase-map').querySelectorAll('button')];
    cells.forEach((result, index) => {
      const button = buttons[index];
      button.className = `phase-cell ${result.tied ? 'tied' : result.winner.toLowerCase()}`;
      button.style.setProperty('--strength', .2 + .8 * (result.tied ? 0 : Math.min(1, Math.log2(result.factor) / 4)));
      button.setAttribute('aria-label', `Batch ${2 ** result.exponent}, noise variance ${result.noise}: ${result.winner}`);
      button.firstElementChild.textContent = result.tied ? '≈' : result.winner === 'SGD' ? 'S' : 'N';
    });
    el('phase-map').dataset.geometry = key;
    el('phase-map').dataset.execution = execution;
    el('phase-map').dataset.computeMs = computeMs.toFixed(1);
    setPhaseBusy(false);
    updatePhaseSelection();
  }
  function completePhaseJob(job, cells, execution, computeMs) {
    if (job.id !== jobId || !cells) return;
    clearTimeout(jobTimeout);
    pendingKey = '';
    phaseCache.delete(job.key);
    phaseCache.set(job.key, cells);
    if (phaseCache.size > 6) phaseCache.delete(phaseCache.keys().next().value);
    if (job.key === PhaseMap.key(sim)) showPhaseMap(job.key, cells, execution, computeMs);
    else requestPhaseMap();
  }
  async function phaseFallback(job) {
    if (job.id !== jobId || job.fallback) return;
    job.fallback = true;
    clearTimeout(jobTimeout);
    workerUnavailable = true;
    if (phaseWorker) phaseWorker.terminate();
    phaseWorker = null;
    const started = performance.now();
    try {
      const cells = await PhaseMap.compute(job.config, {
        isCurrent: () => job.id === jobId,
        onProgress: completed => { if (job.id === jobId) el('phase-progress').value = completed; }
      });
      completePhaseJob(job, cells, 'cooperative', performance.now() - started);
    } catch (error) {
      if (job.id !== jobId) return;
      pendingKey = '';
      setPhaseBusy(false);
      el('phase-map').querySelectorAll('button').forEach(cell => { cell.disabled = true; });
      el('phase-status').hidden = false;
      el('phase-status').textContent = 'The map could not be calculated. Change the starting point to try again; the experiment above still works.';
    }
  }
  function requestPhaseMap() {
    if (!phaseVisible) return;
    scaffoldPhaseMap();
    const key = PhaseMap.key(sim);
    if (key === pendingKey) return;
    if (key === mapKey) {
      // Returning to the visible geometry supersedes an unfinished different map.
      if (pendingKey) {
        ++jobId;
        clearTimeout(jobTimeout);
        pendingKey = '';
        setPhaseBusy(false);
        updatePhaseSelection();
      }
      return;
    }
    const job = { id: ++jobId, key, config: { sharp: sim.sharp, start: [...sim.start] } };
    clearTimeout(jobTimeout);
    if (phaseCache.has(key)) {
      const cells = phaseCache.get(key);
      phaseCache.delete(key); phaseCache.set(key, cells);
      pendingKey = '';
      showPhaseMap(key, cells, 'cache');
      return;
    }
    pendingKey = key;
    setPhaseBusy(true);
    if (workerUnavailable || typeof Worker === 'undefined') { phaseFallback(job); return; }
    try {
      if (!phaseWorker) phaseWorker = new Worker(new URL('batch-size/phase-worker.js', document.baseURI));
      phaseWorker.onmessage = ({ data }) => {
        if (data.id !== job.id || job.id !== jobId) return;
        if (data.error) { phaseFallback(job); return; }
        if (data.completed !== undefined) el('phase-progress').value = data.completed;
        if (data.cells) completePhaseJob(job, data.cells, 'worker', data.computeMs);
      };
      phaseWorker.onerror = event => { event.preventDefault(); phaseFallback(job); };
      phaseWorker.postMessage({ id: job.id, config: job.config });
      jobTimeout = setTimeout(() => phaseFallback(job), 5000);
    } catch (error) { phaseFallback(job); }
  }
  function updatePhaseSelection() {
    const closest = noiseLevels.reduce((a, b) => Math.abs(a - sim.noise) < Math.abs(b - sim.noise) ? a : b);
    el('phase-map').querySelectorAll('button').forEach(cell => {
      const batchMatch = 2 ** Number(cell.dataset.exponent) === sim.batch;
      const selected = batchMatch && Number(cell.dataset.noise) === sim.noise;
      cell.classList.toggle('selected', selected);
      cell.setAttribute('aria-pressed', String(selected));
      cell.tabIndex = !cell.disabled && batchMatch && Number(cell.dataset.noise) === closest ? 0 : -1;
    });
    const result = winnerResult(sim.tuned.sgd.total, sim.tuned.newton.total);
    el('phase-winner').textContent = result.tied ? 'Close or tied' : `${result.winner} wins`;
    el('phase-winner').style.color = result.tied ? token('--ink') : colors[result.winner === 'SGD' ? 'sgd' : 'newton'];
    el('phase-winner').setAttribute('aria-label', result.tied ? 'Expected losses are close or tied at 4,096 samples.' : `${result.winner} has lower expected loss at 4,096 samples.`);
    const starts = { both: [1, 1], flat: [1, 0], sharp: [0, 1] };
    document.querySelectorAll('.phase-starts button').forEach(button => {
      const selected = starts[button.dataset.start].every((v, i) => Math.abs(sim.start[i] - v) < 1e-10);
      button.setAttribute('aria-pressed', String(selected));
    });
    el('phase-context').innerHTML = `Starting point: ${mathMarkup('<mo>(</mo>'+mathVariable('w',1)+'<mo>,</mo>'+mathVariable('w',2)+'<mo>)</mo><mo>=</mo><mo>(</mo>'+sim.start.map(v=>`<mn>${Number(v.toFixed(2))}</mn>`).join('<mo>,</mo>')+'<mo>)</mo>')}.`;
  }
  function drawPhaseMap() { updatePhaseSelection(); requestPhaseMap(); }
  function selectPhase(cell) {
    if (cell.disabled) return;
    el('sim-batch').value = cell.dataset.exponent;
    el('sim-noise').value = cell.dataset.noise;
    configureSimulation();
  }
  new IntersectionObserver(entries => {
    phaseVisible = entries[0].isIntersecting;
    if (phaseVisible) drawPhaseMap();
  }, { rootMargin: '200px' }).observe(el('phase-map'));
  el('phase-map').addEventListener('click', event => {
    const cell = event.target.closest('button[data-exponent]');
    if (cell) selectPhase(cell);
  });
  el('phase-map').addEventListener('keydown', event => {
    const cell = event.target.closest('button[data-exponent]');
    if (!cell || cell.disabled) return;
    let column = Number(cell.dataset.exponent), row = Number(cell.dataset.row);
    if (event.key === 'ArrowLeft') column = Math.max(0, column - 1);
    else if (event.key === 'ArrowRight') column = Math.min(columns - 1, column + 1);
    else if (event.key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') row = Math.min(noiseLevels.length - 1, row + 1);
    else if (event.key === 'Home') { column = 0; if (event.ctrlKey) row = 0; }
    else if (event.key === 'End') { column = columns - 1; if (event.ctrlKey) row = noiseLevels.length - 1; }
    else return;
    event.preventDefault();
    const next = el('phase-map').querySelector(`[data-row="${row}"][data-exponent="${column}"]`);
    selectPhase(next); next.focus();
  });
  document.querySelectorAll('.phase-starts button').forEach(button => button.addEventListener('click', () => {
    sim.start = { both: [1, 1], flat: [1, 0], sharp: [0, 1] }[button.dataset.start];
    configureSimulation();
  }));
  el('phase-labels').addEventListener('change', event => el('phase-map').classList.toggle('show-labels', event.target.checked));
  addEventListener('batchsize:simulation', () => {
    cancelAnimationFrame(phaseFrame);
    phaseFrame = requestAnimationFrame(drawPhaseMap);
  });


  addEventListener('batchsize:theme', ()=>{drawPhaseMap();drawMatchup();});
  let chartResize;
  addEventListener('resize',()=>{clearTimeout(chartResize);chartResize=setTimeout(()=>{drawMatchup();},100);});
  drawMatchup();drawPhaseMap();
})();
