/* Original branch-loss measurements, with a shared checkpoint and token-matched continuations. */
'use strict';
(function(){
  const data=window.BRANCH_CURVES;
  const el=id=>document.getElementById(id),chart=el('branch-trajectory-chart');
  if(!chart||!data)return;
  let closeView=false,frame=0;
  // Show every measured checkpoint; missing rank sweeps remain absent.
  const anchors=Object.keys(data.anchors).map(Number).sort((a,b)=>a-b);
  const ranks=[16,64,128,256,768],rankColors=['#1a73e8','#9334e6','#e37400','#1e8e3e','#087c75'];
  const fmt=n=>n.toLocaleString('en-US');
  const token=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const path=(points,x,y)=>points.map(([step,loss],i)=>`${i?'L':'M'}${x(step).toFixed(2)},${y(loss).toFixed(2)}`).join(' ');
  function niceTicks(min,max,count){
    const raw=(max-min)/count,power=10**Math.floor(Math.log10(raw));
    const step=[1,2,2.5,5,10].map(n=>n*power).find(n=>n>=raw);
    const start=Math.floor(min/step)*step,end=Math.ceil(max/step)*step;
    return {min:start,max:end,ticks:Array.from({length:Math.round((end-start)/step)+1},(_,i)=>start+i*step),step};
  }
  function render(){
    frame=0;
    const anchor=+el('anchor').value*1000,held=el('held'),selected=data.anchors[anchor];
    const top128Available=Boolean(selected['top-128 held']?.length);
    const top128Option=[...held.options].find(option=>option.value==='top-128 held');
    if(top128Option){top128Option.hidden=!top128Available;top128Option.disabled=!top128Available;}
    const arm=held.value;
    if(arm==='top-128 held'&&!top128Available){
      const fallback=selected['top-768 held']?.length?'top-768 held':'fully scaled';
      if(selected[fallback]?.length){held.value=fallback;held.dispatchEvent(new Event('change'));return;}
    }
    const hasHighlight=Boolean(selected[arm]?.length);
    const width=chart.clientWidth||800,height=width<500?230:250;
    const box={left:width<500?49:64,right:width-14,top:35,bottom:height-37};
    const colors={control:token('--ink'),full:token('--coral'),held:token('--teal'),random:token('--muted'),grid:token('--line'),surface:token('--surface')};
    const xmin=closeView?anchor:1000,xmax=closeView?anchor+1024:13000;
    const shownArms=['control (128K)','fully scaled',...ranks.map(k=>`top-${k} held`),'random-768 held'];
    const shown=closeView?shownArms.flatMap(a=>selected[a]||[]):data.base.filter(([s])=>s>=xmin);
    if(!shown.length)return;
    const values=shown.map(p=>p[1]);
    if(!closeView)anchors.forEach(a=>shownArms.forEach(k=>(data.anchors[a][k]||[]).forEach(p=>values.push(p[1]))));
    const low=Math.min(...values),high=Math.max(...values),range=high-low;
    const axis=niceTicks(low-range*.03,high+range*.06,5);
    const x=s=>box.left+(s-xmin)/(xmax-xmin)*(box.right-box.left);
    const y=l=>box.bottom-(l-axis.min)/(axis.max-axis.min)*(box.bottom-box.top);
    const precision=Math.max(2,(String(axis.step).split('.')[1]||'').length);
    const xticks=closeView?[anchor,anchor+256,anchor+512,anchor+768,anchor+1024]:width<600?[1000,5000,9000,13000]:[1000,3000,5000,7000,9000,11000,13000];
    const label=(px,py,txt,extra='')=>`<text x="${px}" y="${py}" font-size="17" ${extra}>${txt}</text>`;
    let svg=`<title>${closeView?'Continuations from':'Branches along the 128K base run; selected checkpoint'} ${fmt(anchor)}. Same start state and data stream.</title><defs><clipPath id="branch-plot-clip"><rect x="${box.left-2}" y="${box.top-3}" width="${box.right-box.left+4}" height="${box.bottom-box.top+6}"/></clipPath></defs>`;
    axis.ticks.forEach(t=>{svg+=`<line x1="${box.left}" x2="${box.right}" y1="${y(t)}" y2="${y(t)}" stroke="${colors.grid}" stroke-dasharray="2 5"/>${label(box.left-10,y(t)+5,t.toFixed(precision),'text-anchor="end"')}`;});
    xticks.forEach((t,i)=>{const offset=!closeView?`${t/1000}K`:width<500?(i===0?'0':`+${t-anchor}`):fmt(t);svg+=label(x(t),box.bottom+27,offset,`text-anchor="${i===0?'start':i===xticks.length-1?'end':'middle'}"`);});
    svg+=`<path d="M${box.left},${box.top}V${box.bottom}H${box.right}" fill="none" stroke="${token('--grid-strong')}" stroke-width="1.3"/>`;
    function curve(a,k,opacity=1,strokeWidth=2.2){
      const points=data.anchors[a][k];if(!points)return '';
      const rank=ranks.indexOf(Number(k.match(/^top-(\d+)/)?.[1]));
      const color=k==='control (128K)'?colors.control:k==='fully scaled'?colors.full:k==='random-768 held'?colors.random:rankColors[rank];
      const last=points.at(-1),dash=k==='random-768 held'?'stroke-dasharray="4 4"':'';
      return `<g class="branch-measured-curve" data-anchor="${a}" data-arm="${k}" opacity="${opacity}" clip-path="url(#branch-plot-clip)"><path d="${path(points,x,y)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round" ${dash}/>${opacity===1?`<circle cx="${x(last[0])}" cy="${y(last[1])}" r="3.3" fill="${color}"/>`:''}</g>`;
    }
    if(!closeView){
      const points=data.base.filter(([s])=>s>=xmin);
      anchors.filter(a=>a!==anchor).forEach(a=>shownArms.filter(k=>k!=='control (128K)').forEach(k=>{svg+=curve(a,k,hasHighlight?.1:.35,1.4);}));
      svg+=`<path class="branch-base-curve" d="${path(points,x,y)}" fill="none" stroke="${colors.control}" stroke-width="2.1" opacity="${hasHighlight?.45:1}" clip-path="url(#branch-plot-clip)"/>`;
    }
    svg+=`<line x1="${x(anchor)}" x2="${x(anchor)}" y1="${box.top}" y2="${box.bottom}" stroke="${colors.control}" opacity=".2" stroke-dasharray="3 5"/>`;
    shownArms.filter(k=>k!==arm&&k!=='control (128K)').forEach(k=>{svg+=curve(anchor,k,hasHighlight?.2:1,1.7);});
    if(arm!=='control (128K)')svg+=curve(anchor,'control (128K)',hasHighlight?.6:1,1.9);
    svg+=curve(anchor,arm,1,3.1);
    if(!closeView){
      anchors.forEach(a=>{
        const loss=data.anchors[a]['control (128K)'][0][1];
        svg+=`<g role="button" tabindex="0" aria-label="Compare branches from checkpoint ${fmt(a)}" data-branch-anchor="${a}"><title>Checkpoint ${fmt(a)}: click to compare continuations</title><circle class="branch-anchor-ring" cx="${x(a)}" cy="${y(loss)}" r="${a===anchor?8:6}" fill="${colors.surface}" stroke="${colors.control}" stroke-width="${a===anchor?2:1.4}"/><circle cx="${x(a)}" cy="${y(loss)}" r="3" fill="${colors.control}"/><circle cx="${x(a)}" cy="${y(loss)}" r="18" fill="transparent"/></g>`;
      });
      svg+=label(x(anchor),box.top-12,`Checkpoint ${fmt(anchor)}`,`text-anchor="${anchor>10000?'end':anchor<3000?'start':'middle'}"`);
    }else{
      const start=selected['control (128K)'][0];
      svg+=`<circle cx="${x(start[0])}" cy="${y(start[1])}" r="5" fill="${colors.control}"/><path d="M${x(start[0])+9},${y(start[1])-8}l20,-10" stroke="${colors.control}" fill="none"/>${label(x(start[0])+34,y(start[1])-20,'Same checkpoint')}`;
    }
    chart.setAttribute('viewBox',`0 0 ${width} ${height}`);chart.style.height=`${height}px`;chart.innerHTML=svg;
    chart.querySelectorAll('[data-branch-anchor]').forEach(node=>{
      const choose=()=>{closeView=true;el('anchor').value=+node.dataset.branchAnchor/1000;el('anchor').dispatchEvent(new Event('input'));};
      node.addEventListener('click',choose);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
    });
    const armLabel=arm==='fully scaled'?'Fully scaled':arm==='random-768 held'?'Random 768 held':arm.replace('top-','Sharpest ').replace(' held',' held');
    const endpointExists=key=>window.PAPER_DATA?.endpoints.some(r=>r.anchor===anchor&&r.arm===key);
    const entry=(name,color,key,dashed=false)=>`<button type="button" data-branch-arm="${key}" aria-pressed="${key===arm}" ${!selected[key]?'disabled':''}><i class="branch-line ${dashed?'dashed':''}" style="color:${color}" aria-hidden="true"></i><span class="branch-legend-label">${name}${!selected[key]?endpointExists(key)?' · curve unavailable':' · not run':''}</span></button>`;
    const control=`<span class="branch-control"><i class="branch-line" style="color:${colors.control}" aria-hidden="true"></i><span class="branch-legend-label">${closeView?'128K control':'128K base / control'}</span></span>`;
    el('branch-curve-legend').innerHTML=`<div class="branch-legend-group branch-legend-baselines" role="group" aria-label="Reference and comparison branches">${control}${entry('Fully scaled to 2M',colors.full,'fully scaled')}${entry('Random 768',colors.random,'random-768 held',true)}</div><div class="branch-legend-group branch-legend-ranks" role="group" aria-label="Sharpest directions retained">${ranks.map((k,i)=>k===128&&!top128Available?'':entry(`Top-${k}`,rankColors[i],`top-${k} held`)).join('')}</div>`;
    el('branch-curve-legend').querySelectorAll('[data-branch-arm]').forEach(button=>button.addEventListener('click',()=>{el('held').value=button.dataset.branchArm;el('held').dispatchEvent(new Event('change'));}));
    el('branch-curve-state').textContent=`Checkpoint ${fmt(anchor)}`;
    el('branch-curve-caption').textContent=!selected[arm]?endpointExists(arm)?`${armLabel}: only the final loss penalty is available for this branch.`:`${armLabel} was not run at this checkpoint.`:'';
    el('branch-back').hidden=!closeView;
    el('branch-close').setAttribute('aria-pressed',String(closeView));el('branch-all').setAttribute('aria-pressed',String(!closeView));
    chart.setAttribute('aria-label',`${closeView?'All measured branch loss curves from':'Base run and all measured ranks at every checkpoint; selected checkpoint'} ${fmt(anchor)}. ${selected[arm]?armLabel+' highlighted.':armLabel+(endpointExists(arm)?' curve unavailable; endpoint penalty available.':' was not run.')}`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  el('branch-all').addEventListener('click',()=>{closeView=false;render();});
  el('branch-back').addEventListener('click',()=>{closeView=false;render();});
  el('branch-close').addEventListener('click',()=>{closeView=true;render();});
  addEventListener('batchsize:intervention',render);
  addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  render();
})();
