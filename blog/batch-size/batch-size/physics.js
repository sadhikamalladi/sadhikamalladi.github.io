/* Exact diagonal NQM moments; independent of the UI and reproducibly testable. */
(function (root) {
  const T = 4096;
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function gaussian(random) { return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-15))) * Math.cos(2 * Math.PI * random()); }
  function moments(config, method, eta, steps = T / config.batch) {
    const h = [1, config.sharp], c = [config.noise, 0], start = config.start || [1, 1];
    let bias = 0, variance = 0;
    h.forEach((hi, i) => {
      const a = method === 'newton' ? eta / hi : eta;
      const q = (1 - a * hi) ** 2;
      const power = q ** steps;
      const sum = Math.abs(1 - q) < 1e-12 ? steps : (1 - power) / (1 - q);
      bias += .5 * hi * start[i] ** 2 * power;
      variance += .5 * hi * a * a * c[i] / config.batch * sum;
    });
    return { bias, variance, total: bias + variance };
  }
  function tune(config, method) {
    const cap = 2 / (method === 'newton' ? 1 : config.sharp);
    let best = { eta: 0, ...moments(config, method, 0) };
    const consider = eta => { const result = moments(config, method, eta); if (result.total < best.total) best = { eta, ...result }; };
    for (let k = 0; k <= 700; k++) consider(cap * .9999 * 10 ** (-7 + 7 * k / 700));
    consider(method === 'newton' ? 1 : 1 / config.sharp);
    let lo = best.eta * .97, hi = Math.min(cap * .999999, best.eta * 1.03);
    for (let k = 0; k < 36; k++) {
      const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
      if (moments(config, method, a).total < moments(config, method, b).total) hi = b; else lo = a;
    }
    consider((lo + hi) / 2);
    return best;
  }
  function settlingSteps(config, tuned) {
    const h = [1, config.sharp], c = [config.noise, 0], start = config.start || [1, 1];
    const initial = .5 * (start[0] ** 2 + config.sharp * start[1] ** 2);
    let steps = Math.max(192, 4 * T / config.batch);
    for (const method of ['sgd', 'newton']) {
      const eta = tuned[method].eta;
      const q = h.map(hi => (1 - (method === 'newton' ? eta / hi : eta) * hi) ** 2);
      const stationary = h.reduce((sum, hi, i) => {
        const a = method === 'newton' ? eta / hi : eta;
        return sum + (q[i] < 1 ? .5 * hi * a * a * c[i] / config.batch / (1 - q[i]) : 0);
      }, 0);
      const tolerance = Math.max(initial * 1e-8, stationary * .005, 1e-12);
      h.forEach((hi, i) => {
        const bias = .5 * hi * start[i] ** 2;
        if (bias <= tolerance / 2 || q[i] === 0) return;
        steps = Math.max(steps, q[i] >= 1 ? 32768 : Math.ceil(Math.log(tolerance / (2 * bias)) / Math.log(q[i])));
      });
    }
    return Math.min(32768, steps);
  }
  function trajectory(config, method, eta, seed, steps = T / config.batch) {
    const random = rng(seed), w = [...(config.start || [1, 1])], out = [{ w: [...w], samples: 0, loss: .5 * (w[0] ** 2 + config.sharp * w[1] ** 2) }];
    for (let k = 0; k < steps; k++) {
      const g = [w[0] + Math.sqrt(config.noise / config.batch) * gaussian(random), config.sharp * w[1]];
      w[0] -= eta * g[0]; w[1] -= eta * g[1] / (method === 'newton' ? config.sharp : 1);
      out.push({ w: [...w], samples: (k + 1) * config.batch, loss: .5 * (w[0] ** 2 + config.sharp * w[1] ** 2) });
    }
    return out;
  }
  // Abramowitz–Stegun 7.1.26; maximum absolute error approximately 1.5e-7.
  function erf(x) {
    const sign = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + .3275911 * x);
    return sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x));
  }
  function response(cnr, batch, mu = .9) { return erf(Math.sqrt(cnr * batch * (1 + mu) / (2 * (1 - mu)))); }
  function displacement(cnr, ratio, alpha) { return ratio ** (alpha - 1) * response(cnr, ratio) / response(cnr, 1); }
  const api = { T, rng, gaussian, moments, tune, settlingSteps, trajectory, erf, response, displacement };
  if (typeof module !== 'undefined') module.exports = api; else root.NQM = api;
})(typeof window !== 'undefined' ? window : globalThis);
