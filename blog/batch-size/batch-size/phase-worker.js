/* This worker is created only when the reader reaches the phase map. */
'use strict';
importScripts('physics.js', 'phase-compute.js');
let generation = 0;
self.onmessage = async ({ data }) => {
  const current = ++generation, started = performance.now();
  try {
    const cells = await PhaseMap.compute(data.config, {
      isCurrent: () => current === generation,
      onProgress: completed => self.postMessage({ id: data.id, completed })
    });
    if (cells) self.postMessage({ id: data.id, key: PhaseMap.key(data.config), cells,
      computeMs: performance.now() - started });
  } catch (error) {
    if (current === generation) self.postMessage({ id: data.id, error: error.message });
  }
};
