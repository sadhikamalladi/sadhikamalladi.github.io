/* Shared numerical kernel for the worker and the cooperative browser fallback. */
(function (root) {
  'use strict';
  const noiseLevels = [80, 40, 20, 8, 4, 2, 1, 0];
  const columns = 13;
  function key(config) { return `${config.sharp}:${config.start.join(',')}`; }
  function winner(sgd, newton) {
    const low = Math.min(sgd, newton), high = Math.max(sgd, newton);
    const tied = high < 1e-14 || Math.abs(sgd - newton) / Math.max(high, 1e-14) < .02;
    return { winner: tied ? 'Close or tied' : sgd < newton ? 'SGD' : 'Newton',
      factor: high / Math.max(low, 1e-300), tied };
  }
  async function compute(config, options = {}) {
    const isCurrent = options.isCurrent || (() => true);
    const yieldTask = options.yieldTask || (() => new Promise(resolve => setTimeout(resolve, 0)));
    const cells = [];
    for (let row = 0; row < noiseLevels.length; row++) {
      if (!isCurrent()) return null;
      for (let exponent = 0; exponent < columns; exponent++) {
        const experiment = { ...config, batch: 2 ** exponent, noise: noiseLevels[row] };
        const sgd = root.NQM.tune(experiment, 'sgd'), newton = root.NQM.tune(experiment, 'newton');
        cells.push({ row, exponent, noise: experiment.noise, sgd, newton,
          ...winner(sgd.total, newton.total) });
      }
      if (options.onProgress) options.onProgress(cells.length);
      // Yield between rows so a newer geometry can supersede this job.
      if (row < noiseLevels.length - 1) await yieldTask();
    }
    return isCurrent() ? cells : null;
  }
  root.PhaseMap = { noiseLevels, columns, key, winner, compute };
})(globalThis);
