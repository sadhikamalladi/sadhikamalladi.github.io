/* Linear loss axes and the selected point's loss rank among tested rules. */
'use strict';
(function () {
  function domain(low, high, zero, padding) {
    const span = Math.max(high - low, .00001);
    const lower = zero ? 0 : low - span * .05;
    const upper = zero ? Math.max(.01, high * (1 + padding)) : high + span * .05;
    const rough = (upper - lower) / 4;
    const unit = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / unit;
    const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * unit;
    const bottom = zero ? 0 : Math.floor(lower / step) * step;
    const top = Math.ceil(upper / step) * step;
    return { bottom, top, step, precision: Math.max(0, -Math.floor(Math.log10(step))) };
  }
  function domains(values, references, selected, zero) {
    const all = [...values, ...references];
    const focused = [...selected, ...references];
    const full = domain(Math.min(...all), Math.max(...all), zero, .04);
    const detail = domain(Math.min(...focused), Math.max(...focused), zero, .15);
    detail.bottom = Math.max(detail.bottom, full.bottom);
    detail.top = Math.min(detail.top, full.top);
    return { full, detail };
  }
  function lossRank(values, value) {
    return 1 + values.filter(v=>v<value).length;
  }
  // A derived display cohort: keep the downloadable measurements and paper ranks intact.
  function scaleUpSetting(source) {
    const indices = source.batches.flatMap((batch, i) => batch > source.referenceBatch ? [i] : []);
    const subset = values => indices.map(i => values[i]);
    const rules = source.rules.map(rule => {
      const regrets = indices.map(i => rule.losses[i] - source.gridMinimum[i]);
      return { ...rule, losses: subset(rule.losses), meanRegret: regrets.reduce((a,b)=>a+b,0)/indices.length, maxRegret: Math.max(...regrets) };
    }).sort((a,b)=>a.meanRegret-b.meanRegret);
    rules.forEach(rule => { rule.rank = 1 + rules.filter(other=>other.meanRegret<rule.meanRegret).length; });
    return { ...source, batches: subset(source.batches), rules, gridMinimum: subset(source.gridMinimum),
      retunedBaseline: subset(source.retunedBaseline), bestAtBatch: subset(source.bestAtBatch),
      ...(source.trainSteps ? { trainSteps: subset(source.trainSteps) } : {}),
      commonRuleId: rules[0].id, measurementCount: rules.length * indices.length };
  }
  window.RuleAtlasAxis = { domains, lossRank, scaleUpSetting };
})();
