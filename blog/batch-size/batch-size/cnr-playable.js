/* Real finite-budget tuning cells; the slider selects a computed condition. */
'use strict';
(function () {
  const data = window.SIGNSGD_CNR_DENSE_DATA || window.SIGNSGD_CNR_DATA;
  if (!data || !document.getElementById('cnr-paper-chart')) return;

  function conditionAt(position) {
    const measuredIndex=Math.max(0,Math.min(data.groups.length-1,Math.round(position)));
    const group=data.groups[measuredIndex];
    return {
      cnr:group.cnr,
      ratios:group.rows.map(p=>p.eta/group.rows[0].eta),
      fittedExponent:group.fittedExponent,
      measuredIndex
    };
  }
  // Color follows the fitted exponent; the numerical curve remains measured.
  function scalingColor(exponent, sqrtColor, linearColor) {
    const mix=Math.max(0,Math.min(1,(exponent-.5)/.5));
    return `color-mix(in oklch shorter hue, ${sqrtColor} ${(1-mix)*100}%, ${linearColor} ${mix*100}%)`;
  }
  function draw() {
    const selected=conditionAt(+$('paper-cnr').value);
    const width=Math.max(240,Math.min(1000,$('cnr-paper-chart').clientWidth));
    const height=Math.round(Math.max(160,Math.min(210,width*.3)));
    const f=researchFrame('cnr-paper-chart',width,height,{l:58,r:20,t:16,b:34});
    const referenceBatch=data.groups[selected.measuredIndex].rows[0].batch;
    const x=kappa=>f.l+Math.log2(kappa)/8*f.iw,y=ratio=>f.t+f.ih*(1-Math.log10(ratio)/Math.log10(400));
    const cnrLabel=Number(selected.cnr.toPrecision(3)).toString();
    const linearColor=token('--cnr-linear-color'),sqrtColor=token('--cnr-sqrt-color');
    const tunedColor=scalingColor(selected.fittedExponent,sqrtColor,linearColor);
    document.querySelector('.cnr-paper-panel').style.setProperty('--cnr-tuned-color',tunedColor);
    let markup=`<title>Independently tuned SignSGD learning rate ratios against batch ratio kappa, CNR ${cnrLabel}, fixed momentum 0.9 and 4,096 samples</title>`;
    for(const ratio of [1,10,100]){
      markup+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(ratio)}" y2="${y(ratio)}" stroke="${token('--line')}" stroke-dasharray="2 5"/>`+svgText(f.l-12,y(ratio)+5,ratio+'×','font-size="16" text-anchor="end"');
    }
    for(const b of (f.w<330?[1,16,256]:[1,4,16,64,256]))markup+=svgText(x(b),f.h-13,String(b),`font-size="16" text-anchor="${b===256?'end':'middle'}"`);
    const guides=[1,256];
    markup+=`<path class="cnr-guide-linear" d="${line(guides,kappa=>x(kappa),kappa=>y(kappa))}" stroke="${linearColor}" stroke-width="1.8" stroke-dasharray="2 4" fill="none" opacity=".8"/>`;
    markup+=`<path class="cnr-guide-sqrt" d="${line(guides,kappa=>x(kappa),kappa=>y(Math.sqrt(kappa)))}" stroke="${sqrtColor}" stroke-width="1.8" stroke-dasharray="7 3 2 3" fill="none" opacity=".8"/>`;
    const drawCurve=curve=>{
      const ratios=curve.rows.map(p=>p.eta/curve.rows[0].eta);
      return `<g data-cnr="${curve.cnr}"><path class="cnr-tuned-curve" d="${line(curve.rows,p=>x(p.batch/referenceBatch),p=>y(p.eta/curve.rows[0].eta))}" stroke="${tunedColor}" stroke-width="2.7" fill="none"/>`+curve.rows.map((p,i)=>`<circle cx="${x(p.batch/referenceBatch)}" cy="${y(ratios[i])}" r="3.2" fill="${tunedColor}" stroke="${token('--surface')}" stroke-width="1.5"><title>${p.source==='paper'?'Paper measurement':'Supplemental tuning'}: CNR ${Number(curve.cnr.toPrecision(3))}, batch ratio ${p.batch/referenceBatch}, ${p.processedSamples??4096} samples: learning rate ${p.eta.toPrecision(5)}, ratio ${ratios[i].toFixed(3)}</title></circle>`).join('')+'</g>';
    };
    markup+=drawCurve(data.groups[selected.measuredIndex]);
    $('cnr-paper-chart').innerHTML=markup+researchAxes(f);
    $('cnr-paper-chart').setAttribute('aria-label',`Tuned learning rate ratios against batch ratio kappa at CNR ${cnrLabel}`);
    $('cnr-paper-chart').dataset.cnr=selected.cnr;$('cnr-paper-chart').dataset.interpolated='false';
    $('paper-cnr-output').textContent=cnrLabel;
    $('paper-cnr').setAttribute('aria-valuetext',`CNR ${cnrLabel}, independently tuned`);
    $('cnr-series-label').textContent='Tuned';
    $('cnr-fit-exponent').textContent=selected.fittedExponent.toFixed(3);
    $('cnr-paper-insight').textContent=selected.cnr<.005?'Low CNR: tuned learning rates scale approximately with the square root of batch size.':selected.cnr<.1?'Here, the tuned rates grow faster than square-root scaling but slower than linear scaling.':'At high CNR, the tuned learning rate grows almost in proportion to batch size.';
    document.querySelectorAll('[data-cnr-index]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.cnrIndex===selected.measuredIndex));
  }
  const slider=$('paper-cnr');
  slider.max=data.groups.length-1;slider.step=1;
  // The three original paper buttons retain their displayed CNR values.
  document.querySelectorAll('[data-cnr-index]').forEach(button=>{
    button.dataset.cnrIndex=data.groups.findIndex(group=>group.cnr===Number(button.textContent));
  });
  let drawFrame=0;
  const scheduleDraw=()=>{cancelAnimationFrame(drawFrame);drawFrame=requestAnimationFrame(draw);};
  slider.addEventListener('input',()=>{slider.value=Math.round(+slider.value);scheduleDraw();});
  document.querySelector('.cnr-presets').addEventListener('click',event=>{
    const button=event.target.closest('[data-cnr-index]');if(!button)return;
    slider.value=button.dataset.cnrIndex;cancelAnimationFrame(drawFrame);draw();
  });
  new ResizeObserver(scheduleDraw).observe($('cnr-paper-chart'));
  new MutationObserver(scheduleDraw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  draw();
})();
