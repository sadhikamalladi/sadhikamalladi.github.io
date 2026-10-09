'use strict';
const $ = id => document.getElementById(id);
const DATA = window.PAPER_DATA;
const mathMarkup = body => window.BlogMath ? window.BlogMath.markup(body) : `<math>${body}</math>`;
const mathVariable = (symbol, subscript) => subscript === undefined ? `<mi>${symbol}</mi>` : `<msub><mi>${symbol}</mi>${Number.isFinite(+subscript)?`<mn>${subscript}</mn>`:`<mtext>${subscript}</mtext>`}</msub>`;
const colors = { SOAP: '#987247', Shampoo: '#087c75', Muon: '#ca4c28', Adam: '#6476a7', Lion: '#8a8192', sgd: '#f19a78', newton: '#77d9bc' };
const fmt = n => n.toLocaleString('en-US');
const batchName = b => ({131072:'128K',524288:'512K',1048576:'1M',2097152:'2M'})[b] || fmt(b);
const line = (points, x, y) => points.map((p,i) => `${i?'L':'M'}${x(p).toFixed(2)},${y(p).toFixed(2)}`).join(' ');
const svgText = (x,y,text,extra='') => `<text x="${x}" y="${y}" ${extra}>${text}</text>`;
const tickStyle = 'font-size="17"';
const scientificSVG = (value, digits=0) => { const [coefficient,exponent]=value.toExponential(digits).split('e');return `${Number(coefficient)===1?'':Number(coefficient)+' × '}10<tspan baseline-shift="super" font-size="9">${Number(exponent).toString().replace('-', '−')}</tspan>`; };
const scientificHTML = (value,digits=1) => {const [coefficient,exponent]=value.toExponential(digits).split('e');return `${Number(coefficient)===1?'':Number(coefficient)+' × '}10<sup>${Number(exponent).toString().replace('-', '−')}</sup>`;};
const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function frame(w,h,margins={l:48,r:20,t:25,b:38}) { return {w,h,...margins,iw:w-margins.l-margins.r,ih:h-margins.t-margins.b}; }
function chartFrame(id,width,height,margins){
  const chart=$(id),w=Math.max(360,Math.min(width,chart.clientWidth));
  chart.setAttribute('viewBox',`0 0 ${w} ${height}`);
  return frame(w,height,margins);
}
function researchFrame(id,width,height,margins={l:58,r:22,t:20,b:43}){
  const chart=$(id),w=Math.max(240,Math.min(width,chart.clientWidth));
  chart.setAttribute('viewBox',`0 0 ${w} ${height}`);
  return frame(w,height,margins);
}
function researchAxes(f){
  const bottom=f.h-f.b,right=f.w-f.r;
  return `<g class="research-axis" fill="none" stroke="${token('--ink')}" stroke-width="1.2" opacity=".7"><path d="M${f.l} ${f.t-7}V${bottom}H${right+7}"/><path d="M${f.l-4} ${f.t-1}L${f.l} ${f.t-7}L${f.l+4} ${f.t-1}M${right+1} ${bottom-4}L${right+7} ${bottom}L${right+1} ${bottom+4}"/></g>`;
}
function axes(f, ymin,ymax, xticks, xmap, options={}) {
  const y=v=>f.t+f.ih*(1-(v-ymin)/(ymax-ymin)); let s='';
  for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yp=y(v);s+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${yp}" y2="${yp}" stroke="${options.dark?'#3d5355':'#e7ebe2'}" stroke-width="1"/>`+svgText(f.l-9,yp+3,options.format?options.format(v):v.toFixed(2),`${tickStyle} text-anchor="end"`);}
  xticks.forEach(([v,t],i)=>s+=svgText(xmap(v),f.h-12,t,`${tickStyle} text-anchor="${i===xticks.length-1?'end':'middle'}"`));
  return {svg:s,y};
}
const rankState={family:'standard_wd',index:0,matrix:true,view:'loss'};
const rankBatches=[131072,524288,1048576,2097152];
function drawRankings(){
  const oldRanks=new Map([...document.querySelectorAll('.rank-row')].map(row=>[row.dataset.optimizer,row.getBoundingClientRect().top]));
  const {family,index,matrix}=rankState, selected=rankBatches[index];
  const all=DATA.rankings.filter(r=>r.family===family), names=matrix?['SOAP','Muon','Shampoo']:['SOAP','Muon','Shampoo','Adam','Lion'];
  const rows=all.filter(r=>names.includes(r.optimizer));
  const f=researchFrame('ranking-chart',1100,220,{l:60,r:18,t:14,b:32}),x=b=>f.l+Math.log2(b/131072)/4*f.iw;
  const best=b=>Math.min(...all.filter(r=>r.batch===b).map(r=>r.loss));
  const value=(loss,batch)=>rankState.view==='gap'?loss-best(batch):loss;
  const bounds=rows.flatMap(r=>[r.loss,...(r.n>1&&r.min!==null&&r.max!==null?[r.min,r.max]:[])].map(loss=>value(loss,r.batch)));
  const {bottom:ymin,top:ymax,step,precision}=window.RuleAtlasAxis.domains(bounds,rankState.view==='gap'?[0]:[],bounds,rankState.view==='gap'&&Math.min(...bounds)>=0).full;
  const y=v=>f.t+f.ih*(1-(v-ymin)/(ymax-ymin));let s='';
  for(let i=0;i<=Math.round((ymax-ymin)/step);i++){const v=ymin+step*i;s+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${y(v)}" y2="${y(v)}" stroke="${token('--line')}" stroke-dasharray="2 5"/>`+svgText(f.l-12,y(v)+5,v.toFixed(precision),'font-size="17" text-anchor="end"');}
  rankBatches.forEach(b=>{s+=`<line x1="${x(b)}" x2="${x(b)}" y1="${f.t}" y2="${f.h-f.b}" stroke="${token('--line')}" stroke-dasharray="2 6"/>`+svgText(x(b),f.h-13,batchName(b),`font-size="17" text-anchor="${b===rankBatches.at(-1)?'end':'middle'}"`);});
  s+=`<line x1="${x(selected)}" x2="${x(selected)}" y1="${f.t}" y2="${f.t+f.ih}" stroke="${token('--orange')}" stroke-dasharray="3 5" opacity=".5"/>`;
  names.forEach(name=>{const pts=rows.filter(r=>r.optimizer===name).sort((a,b)=>a.batch-b.batch);s+=`<path d="${line(pts,p=>x(p.batch),p=>y(value(p.loss,p.batch)))}" fill="none" stroke="${colors[name]}" stroke-width="2.8" stroke-linejoin="round"/>`;pts.forEach(p=>{if(p.min!==null&&p.max!==null&&p.n>1)s+=`<path d="M${x(p.batch)},${y(value(p.min,p.batch))}V${y(value(p.max,p.batch))}M${x(p.batch)-3},${y(value(p.min,p.batch))}h6M${x(p.batch)-3},${y(value(p.max,p.batch))}h6" stroke="${colors[name]}" fill="none"/>`;s+=`<circle cx="${x(p.batch)}" cy="${y(value(p.loss,p.batch))}" r="${p.batch===selected?6:4.5}" fill="${colors[name]}" stroke="${token('--surface')}" stroke-width="1.5"><title>${name}, ${batchName(p.batch)}: ${p.loss.toFixed(6)} nats</title></circle>`;});});
  $('ranking-axis-title').textContent=rankState.view==='gap'?'Loss gap to best optimizer':'Validation loss';
  $('ranking-axis-quantity').innerHTML=mathMarkup('<mi>L</mi>'+(rankState.view==='gap'?'<mo>−</mo><msub><mi>L</mi><mtext>best</mtext></msub>':''))+'<span class="figure-axis-unit">nats</span>';
  $('ranking-chart').dataset.view=rankState.view;
  $('ranking-chart').innerHTML=`<title id="ranking-chart-title">Measured ${rankState.view==='gap'?'loss gaps to the lowest loss among all five optimizers':'validation losses'} under ${family==='standard_wd'?'weight decay':'HyperBall'}; ${batchName(selected)} selected</title>${s}${researchAxes(f)}`;
  $('rank-legend').innerHTML=names.map(n=>`<span><i class="trace-swatch" style="color:${colors[n]}" aria-hidden="true"></i>${n}</span>`).join('');
  const sorted=all.filter(r=>r.batch===selected).sort((a,b)=>a.loss-b.loss);
  $('rank-list').innerHTML=sorted.map((r,i)=>`<div data-optimizer="${r.optimizer}" class="rank-row ${i===0?'first':''}"><span class="rank-name"><span class="rank-number">${i+1}</span><i class="dot" style="background:${colors[r.optimizer]}"></i>${r.optimizer}</span><span class="rank-value">${r.loss.toFixed(4)}</span></div>`).join('');
  if(!reducedMotion.matches)document.querySelectorAll('.rank-row').forEach(row=>{const previous=oldRanks.get(row.dataset.optimizer);if(previous!==undefined){const dy=previous-row.getBoundingClientRect().top;if(dy)row.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.22,1,.36,1)'});}});
  const gap=sorted[1].loss-sorted[0].loss;
  $('ranking-insight').innerHTML=`<strong>${sorted[0].optimizer} leads by ${gap.toFixed(4)} nats</strong> over ${sorted[1].optimizer}.${gap<.002?' This is a close comparison, below the 0.002-nat tuning acceptance threshold.':''}`;
  dispatchEvent(new Event('batchsize:rankings'));
  $('board-batch').textContent=batchName(selected);$('rank-batch-output').textContent=batchName(selected)+' tokens';
  document.querySelectorAll('#rank-ticks button').forEach(b=>{b.classList.toggle('active',+b.dataset.index===index);b.setAttribute('aria-pressed',String(+b.dataset.index===index));});
}
$('rank-batch').addEventListener('input',e=>{rankState.index=+e.target.value;drawRankings();});
document.querySelectorAll('#rank-ticks button').forEach(b=>b.addEventListener('click',()=>{$('rank-batch').value=b.dataset.index;rankState.index=+b.dataset.index;drawRankings();}));
document.querySelectorAll('#family-tabs button').forEach(b=>b.addEventListener('click',()=>{rankState.family=b.dataset.family;document.querySelectorAll('#family-tabs button').forEach(btn=>{btn.classList.toggle('active',btn===b);btn.setAttribute('aria-pressed',String(btn===b));});drawRankings();}));
$('matrix-only').addEventListener('change',e=>{rankState.matrix=e.target.checked;drawRankings();});
$('ranking-view-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-ranking-view]');if(!b)return;rankState.view=b.dataset.rankingView;document.querySelectorAll('[data-ranking-view]').forEach(button=>{const active=button===b;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});drawRankings();});

function canvasSize(canvas){const rect=canvas.getBoundingClientRect(),dpr=Math.min(Math.max(window.devicePixelRatio||1,2),3);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:rect.width,h:rect.height,dpr};}
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let landscapeView='3d';
const heroBackdrop={key:'',paths:null};
const tuningCache=new Map();
function tunedMethods(config){
  const key=JSON.stringify([config.batch,config.sharp,config.noise,...config.start]);
  if(tuningCache.has(key)){
    const result=tuningCache.get(key);tuningCache.delete(key);tuningCache.set(key,result);return result;
  }
  const result={sgd:NQM.tune(config,'sgd'),newton:NQM.tune(config,'newton')};
  tuningCache.set(key,result);
  if(tuningCache.size>24)tuningCache.delete(tuningCache.keys().next().value);
  return result;
}
const hero={batch:256,sharp:20,noise:8,start:[1,1],paths:{},tuned:{}};
function configureHero(){
  // Both projections render this same sampled run; only the camera changes.
  Object.assign(hero,{batch:sim.batch,sharp:sim.sharp,noise:sim.noise,start:sim.start,
    paths:sim.paths,tuned:sim.tuned,duration:sim.duration});
}
function syncHeroCompass(horizontal,vertical){
  const svg=document.querySelector('.coordinate-compass svg');
  // An unlaid-out canvas has no projection basis yet; the next sized draw resyncs.
  if(!(horizontal>0&&vertical>0))return;
  const length=Math.hypot(horizontal,vertical),dx=horizontal/length,dy=vertical/length;
  const origin=[50,31-32*vertical/horizontal];
  for(const [axis,sign] of [['flat',1],['sharp',-1]]){
    const tip=[50+sign*32,31],ux=sign*dx,uy=dy;
    const back=[tip[0]-7*ux,tip[1]-7*uy];
    svg.querySelector(`[data-compass-axis="${axis}"]`).setAttribute('d',
      `M${origin[0]} ${origin[1]}L${tip[0]} ${tip[1]}M${back[0]-3*uy} ${back[1]+3*ux}L${tip[0]} ${tip[1]}L${back[0]+3*uy} ${back[1]-3*ux}`);
  }
  svg.querySelector('circle').setAttribute('cy',origin[1]);
}
function projectSurfacePoint([x,y],{w,h,sharp,scale=1}){
  const [ox,oy]=surfaceOrigin({w,h});
  return [ox+(x-y)*w*.155*scale,
    oy+((x+y)*h*.11-Math.log1p(.5*(x*x+sharp*y*y))*h*.20)*scale];
}
function surfaceOrigin({w,h}){
  return [w*.42,h*.80];
}
function pickSurfaceStart([px,py],{w,h,sharp,scale}){
  if(!Number.isFinite(px)||!Number.isFinite(py)||!(scale>0)||!(w>0)||!(h>0))return null;
  // Undo the rendered camera before intersecting the log-height surface.
  const [ox,oy]=surfaceOrigin({w,h});
  const difference=(px-ox)/(w*.155*scale),target=(py-oy)/(h*scale);
  const level=2**Math.floor(Math.log2(Math.max(1,scale)));
  const limitX=Math.min(1.85,2/level),limitY=Math.min(1.3,1.2/level);
  let min=Math.max(-2*limitX-difference,-2*limitY+difference);
  let max=Math.min(2*limitX-difference,2*limitY+difference);
  if(min>max+1e-10)return null;
  if(min>max)min=max=(min+max)/2;
  // x=(sum+difference)/2, y=(sum-difference)/2. The derivative has
  // at most two roots, so its extrema partition every possible intersection.
  const a=(1+sharp)/8,b=difference*(1-sharp)/4,c=difference*difference*(1+sharp)/8;
  const height=sum=>.11*sum-.2*Math.log1p(a*sum*sum+b*sum+c)-target;
  const qa=.11*a,qb=.11*b-.4*a,qc=.11*(1+c)-.2*b;
  const discriminant=qb*qb-4*qa*qc,breaks=[min,max];
  if(discriminant>=0){
    const root=Math.sqrt(discriminant);
    for(const sum of [(-qb-root)/(2*qa),(-qb+root)/(2*qa)])if(sum>min&&sum<max)breaks.push(sum);
  }
  breaks.sort((a,b)=>a-b);
  const intersections=[],tolerance=1e-11;
  const add=sum=>{if(!intersections.some(value=>Math.abs(value-sum)<1e-8))intersections.push(sum);};
  for(const sum of breaks)if(Math.abs(height(sum))<tolerance)add(sum);
  for(let i=1;i<breaks.length;i++){
    let lo=breaks[i-1],hi=breaks[i],left=height(lo),right=height(hi);
    if(left*right>=0)continue;
    for(let step=0;step<60;step++){
      const middle=(lo+hi)/2,value=height(middle);
      if(left*value<=0){hi=middle;right=value;}else{lo=middle;left=value;}
    }
    add((lo+hi)/2);
  }
  if(!intersections.length)return null;
  // Overlapping surface patches are resolved to the foreground intersection.
  const sum=Math.max(...intersections);
  return [(sum+difference)/2,(sum-difference)/2];
}
function drawHero(time){
  const canvas=$('hero-canvas'),{ctx,w,h,dpr}=canvasSize(canvas);
  const [ox,oy]=surfaceOrigin({w,h}),limitX=Math.min(ox,w-ox)-30;
  const basisX=w*.155,basisY=h*.11;
  const project=(x,y)=>projectSurfacePoint([x,y],{w,h,sharp:hero.sharp});
  const key=`${w}:${h}:${dpr}:${hero.sharp}:${document.documentElement.dataset.theme}`;
  if(heroBackdrop.key!==key){
    heroBackdrop.key=key;heroBackdrop.paths=null;
    syncHeroCompass(basisX,basisY);
    const palette=getComputedStyle(document.documentElement);
    heroBackdrop.palette=Object.fromEntries(['ink','muted','grid','grid-strong','surface'].map(name=>[name,palette.getPropertyValue('--'+name).trim()]));
    heroBackdrop.meshes=new Map();
  }
  if(heroBackdrop.paths!==hero.paths){
    heroBackdrop.paths=hero.paths;
    heroBackdrop.points=Object.fromEntries(['sgd','newton'].map(m=>[m,hero.paths[m].map(p=>project(...p.w))]));
    heroBackdrop.history=null;
    // Asymmetric vertical margins keep the minimum low while fitting both paths.
    const top=oy-26,bottom=h-oy-26;
    const framed=Object.fromEntries(['sgd','newton'].map(m=>[m,heroBackdrop.points[m].map(([x,y])=>({w:[x-ox,y<=oy?oy-y:(y-oy)*top/bottom]}))]));
    heroBackdrop.prepared=SimulationCamera.prepare(framed);
    const base=Math.min(1,limitX/Math.max(heroBackdrop.prepared.maxX,1e-12),top/Math.max(heroBackdrop.prepared.maxY,1e-12));
    heroBackdrop.view=SimulationCamera.layout(heroBackdrop.prepared,w,h,{base,cy:oy,limitX,limitY:top});
  }
  const progress=Math.min(1,time/hero.duration);
  const camera=SimulationCamera.sample(heroBackdrop.prepared,heroBackdrop.view,progress,simCamera.mode);
  const scale=camera.scale,palette=heroBackdrop.palette;
  heroBackdrop.surface={w,h,sharp:hero.sharp,scale};
  const view=([x,y])=>[ox+(x-ox)*scale,oy+(y-oy)*scale];
  const octave=Math.log2(Math.max(1,scale)),level=2**Math.floor(octave),fraction=octave-Math.floor(octave);
  const blend=fraction*fraction*(3-2*fraction);
  for(const resolution of [level,level*2])if(!heroBackdrop.meshes.has(resolution)){
    const mesh={light:new Path2D(),strong:new Path2D()};
    for(let k=-8;k<=8;k++){
      const grid=mesh[k%4?'light':'strong'];
      for(const points of [Array.from({length:65},(_,i)=>[(-2+i/16)/resolution,k*.15/resolution]),Array.from({length:49},(_,i)=>[k*.25/resolution,(-1.2+i/20)/resolution])])
        points.forEach((p,i)=>{const [x,y]=project(...p);i?grid.lineTo(x,y):grid.moveTo(x,y);});
    }
    heroBackdrop.meshes.set(resolution,mesh);
  }
  ctx.clearRect(0,0,w,h);
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(-ox,-oy);
  for(const [resolution,alpha] of [[level,1-blend],[level*2,blend]]){
    if(alpha<.001)continue;
    const mesh=heroBackdrop.meshes.get(resolution);ctx.globalAlpha=alpha;
    ctx.strokeStyle=palette['grid-strong'];ctx.lineWidth=.9/scale;ctx.stroke(mesh.light);
    ctx.strokeStyle=palette.muted;ctx.globalAlpha=alpha*.5;ctx.lineWidth=1.1/scale;ctx.stroke(mesh.strong);
  }
  ctx.restore();
  if(!heroBackdrop.history||camera.end<heroBackdrop.historyEnd){
    heroBackdrop.history=Object.fromEntries(['sgd','newton'].map(m=>{const path=new Path2D();path.moveTo(...heroBackdrop.points[m][0]);return [m,path];}));
    heroBackdrop.historyEnd=0;
  }
  for(const method of ['sgd','newton']){
    const path=heroBackdrop.history[method],points=heroBackdrop.points[method];
    for(let i=heroBackdrop.historyEnd+1;i<=camera.end;i++)path.lineTo(...points[i]);
  }
  heroBackdrop.historyEnd=camera.end;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.translate(-ox,-oy);
  ctx.globalAlpha=.32;ctx.lineWidth=1.7/scale;ctx.lineJoin='round';
  for(const method of ['sgd','newton']){ctx.strokeStyle=colors[method];ctx.stroke(heroBackdrop.history[method]);}
  ctx.restore();
  ctx.beginPath();ctx.arc(ox,oy,7,0,Math.PI*2);ctx.strokeStyle=palette.surface;ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle=palette.ink;ctx.lineWidth=1.8;ctx.stroke();
  ctx.beginPath();ctx.arc(ox,oy,2.5,0,Math.PI*2);ctx.fillStyle=palette.ink;ctx.fill();
  ['sgd','newton'].forEach(method=>{
    const all=hero.paths[method],points=heroBackdrop.points[method],end=camera.end,next=Math.min(end+1,all.length-1);
    const fraction=progress*(all.length-1)-end;
    const tip=view(project(...all[end].w.map((v,i)=>v+(all[next].w[i]-v)*fraction)));
    const stride=Math.max(1,Math.ceil((end-camera.from)/350));
    ctx.beginPath();
    const start=view(points[camera.from]);ctx.moveTo(...start);
    for(let i=camera.from+stride;i<end;i+=stride)ctx.lineTo(...view(points[i]));
    ctx.lineTo(...view(points[end]));ctx.lineTo(...tip);
    ctx.strokeStyle=colors[method];ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(...tip,4.5,0,Math.PI*2);ctx.fillStyle=colors[method];ctx.fill();
    ctx.strokeStyle=palette.surface;ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.arc(...tip,8,0,Math.PI*2);ctx.strokeStyle=colors[method];ctx.globalAlpha=.3;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
  });
  ctx.font=`600 13px ${token('--sans')}`;ctx.fillStyle=palette.ink;ctx.textAlign='center';ctx.fillText('Minimizer',ox,oy+22);
  ctx.font=`14px ${token('--sans')}`;ctx.fillStyle=palette.muted;ctx.textAlign='left';
  if(camera.from===0){const start=view(project(...hero.start));ctx.beginPath();ctx.arc(...start,4,0,Math.PI*2);ctx.strokeStyle=palette.ink;ctx.lineWidth=1;ctx.stroke();ctx.fillText('start',start[0]+10,start[1]-10);}
  canvas.dataset.zoom=camera.zoom.toFixed(3);canvas.dataset.duration=hero.duration.toFixed(0);canvas.dataset.progress=progress.toFixed(3);
  canvas.dataset.steps=String(hero.paths.sgd.length-1);canvas.dataset.samples=String(Math.floor(progress*(hero.paths.sgd.length-1))*hero.batch);
  $('sim-zoom').textContent=camera.zoom.toFixed(1)+'×';
}
const sim={batch:1,sharp:20,noise:8,start:[1,1],seed:7,speed:1,duration:60000,progress:0,playing:false,paths:{},tuned:{},last:0};
let simRAF=0,simConfigRAF=0,simVisible=true;
const simLayer={canvas:document.createElement('canvas'),key:'',paths:null,end:-1,painted:-1,
  trails:{sgd:document.createElement('canvas'),newton:document.createElement('canvas')},history:{}};
const simLoss={key:'',paths:null,end:-1,curves:{}};
const simCamera={mode:reducedMotion.matches?'overview':'auto',paths:null,prepared:null,view:null,size:''};
const simDetail={painted:''};
function configureSimulation(){
  cancelAnimationFrame(simConfigRAF);simConfigRAF=0;
  sim.batch=2**+$('sim-batch').value;sim.sharp=+$('sim-sharp').value;sim.noise=+$('sim-noise').value;sim.progress=0;sim.playing=false;sim.last=0;cancelAnimationFrame(simRAF);
  sim.tuned=tunedMethods(sim);sim.paths={};
  const steps=NQM.T/sim.batch;
  ['sgd','newton'].forEach(m=>{sim.paths[m]=NQM.trajectory(sim,m,sim.tuned[m].eta,sim.seed,steps);});
  const maxLoss=Math.max(.5*(sim.start[0]**2+sim.sharp*sim.start[1]**2),...Object.values(sim.paths).map(ps=>Math.max(...ps.map(p=>p.loss))),1e-2);
  const minLoss=Math.min(...Object.values(sim.paths).map(ps=>Math.min(...ps.map(p=>Math.max(p.loss,1e-15)))));
  sim.runLossBounds={ymax:Math.ceil(Math.log10(maxLoss)),ymin:Math.floor(Math.log10(minLoss))};
  if(sim.runLossBounds.ymax<=sim.runLossBounds.ymin)sim.runLossBounds.ymax=sim.runLossBounds.ymin+1;
  configureHero();
  syncSimPlayback();
  $('sim-batch-output').textContent=fmt(sim.batch);$('sim-sharp-output').textContent=sim.sharp+'×';$('sim-noise-output').textContent=sim.noise;$('sim-updates').textContent=fmt(steps);$('sim-seed').textContent='SEED '+sim.seed;
  $('sim-batch').setAttribute('aria-valuetext',`${sim.batch} samples per batch; ${steps} trajectory updates`);
  $('preset-small').classList.toggle('active',sim.batch===1);$('preset-large').classList.toggle('active',sim.batch===256);
  for(const [id,b] of [['preset-small',1],['preset-large',256]])$(id).setAttribute('aria-pressed',String(sim.batch===b));
  renderRisk();renderSim();
  dispatchEvent(new Event('batchsize:simulation'));
}
function renderRisk(){
  const max=Math.max(sim.tuned.sgd.total,sim.tuned.newton.total)||1;
  $('sim-risk').innerHTML=['sgd','newton'].map(m=>{const r=sim.tuned[m],value=r.total===0?'≈ 0':r.total<.001?r.total.toExponential(2):r.total.toPrecision(3);return `<div class="risk-label"><span><i class="dot" style="background:${colors[m]}"></i>${m==='sgd'?'SGD':'Newton'} <small>${mathMarkup(mathVariable("η")+`<mo>=</mo><mn>${r.eta.toPrecision(3)}</mn>`)}</small></span><span>${value}</span></div><div class="risk-track"><div style="background-color:${colors[m]};width:${r.bias/max*100}%" title="Initialization bias ${r.bias}"></div><div class="variance" style="background-color:${colors[m]};width:${r.variance/max*100}%" title="Noise contribution ${r.variance}"></div>${r.total/max<.004?`<i class="risk-origin" style="color:${colors[m]}" title="Near-zero expected loss" aria-label="Near-zero expected loss"></i>`:''}</div>`;}).join('');
  const result=window.PhaseMap.winner(sim.tuned.sgd.total,sim.tuned.newton.total);
  $('sim-takeaway').innerHTML=result.tied?'<strong>The methods are close or tied here.</strong>':`<strong>${result.winner} has lower expected final loss here.</strong> ${sim.batch<=16?'Small batches allow more updates, but each gradient estimate can be noisier.':'Large batches give less noisy gradients, but fewer updates to reach the minimum.'}`;
}
function renderLandscape(){
  const {ctx,w,h,dpr}=canvasSize($('landscape'));
  if(simCamera.paths!==sim.paths){simCamera.paths=sim.paths;simCamera.prepared=SimulationCamera.prepare(sim.paths);simCamera.size='';}
  if(simCamera.size!==`${w}:${h}`){simCamera.size=`${w}:${h}`;simCamera.view=SimulationCamera.layout(simCamera.prepared,w,h);}
  const camera=SimulationCamera.sample(simCamera.prepared,simCamera.view,sim.progress,simCamera.mode);
  const scale=camera.base,cx=camera.cx,cy=camera.cy;
  const X=x=>cx+x*scale,Y=y=>cy-y*scale;
  const position=sim.progress*(sim.paths.sgd.length-1),end=Math.floor(position);
  const key=`${w}:${h}:${dpr}:${sim.sharp}:${scale}:${document.documentElement.dataset.theme}`;
  if(simLayer.key!==key){
    simLayer.key=key;simLayer.paths=null;
    const palette=getComputedStyle(document.documentElement);
    simLayer.palette=Object.fromEntries(['ink','muted','surface','grid','grid-strong'].map(name=>[name,palette.getPropertyValue('--'+name).trim()]));
    const bg=simLayer.canvas;bg.width=Math.round(w*dpr);bg.height=Math.round(h*dpr);
    const back=bg.getContext('2d');back.setTransform(dpr,0,0,dpr,0,0);
    back.save();back.beginPath();back.rect(9,0,w-18,h);back.clip();
    for(let k=1;k<18;k++){const rx=k*.32*scale,ry=rx/Math.sqrt(sim.sharp);back.beginPath();back.ellipse(cx,cy,rx,ry,0,0,2*Math.PI);back.strokeStyle=simLayer.palette[k%3===0?'grid-strong':'grid'];back.lineWidth=k%3===0?1.1:.7;back.stroke();}
    back.setLineDash([3,5]);back.beginPath();back.moveTo(10,cy);back.lineTo(w-10,cy);back.moveTo(cx,5);back.lineTo(cx,h-10);back.strokeStyle=simLayer.palette['grid-strong'];back.lineWidth=.6;back.stroke();back.restore();

  }
  // Keep every simulated update. Only append the newly revealed segments.
  if(simLayer.paths!==sim.paths||end<simLayer.end){
    simLayer.paths=sim.paths;simLayer.end=0;simLayer.painted=-1;
    simLayer.history=Object.fromEntries(['sgd','newton'].map(m=>{const path=new Path2D();path.moveTo(...sim.paths[m][0].w);return [m,path];}));
    Object.values(simLayer.trails).forEach(canvas=>{canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);});
  }
  const frameKey=`${key}:${camera.scale}:${position}:${simCamera.mode}`;
  if(end===simLayer.painted&&frameKey===simDetail.painted)return {scale:camera.scale,cx,cy};
  ['sgd','newton'].forEach(m=>{
    const trail=simLayer.trails[m].getContext('2d'),pts=sim.paths[m];
    if(end>simLayer.end){
      trail.beginPath();trail.moveTo(X(pts[simLayer.end].w[0]),Y(pts[simLayer.end].w[1]));
      for(let i=simLayer.end+1;i<=end;i++){trail.lineTo(X(pts[i].w[0]),Y(pts[i].w[1]));simLayer.history[m].lineTo(...pts[i].w);}
      trail.strokeStyle=colors[m];trail.lineWidth=1.9;trail.stroke();
    }
  });
  simLayer.end=end;simLayer.painted=end;
  simDetail.painted=frameKey;
  ctx.clearRect(0,0,w,h);
  if(simCamera.mode==='auto')drawFocusedBackdrop(ctx,w,h,camera);else ctx.drawImage(simLayer.canvas,0,0,w,h);
  const zoomText=camera.zoom.toFixed(1)+'×';if($('sim-zoom').textContent!==zoomText)$('sim-zoom').textContent=zoomText;
  $('sim-overview').hidden=simCamera.mode==='overview';
  const windowText=simCamera.mode==='auto'&&end>0?'Full trace':'';
  if($('sim-window').textContent!==windowText)$('sim-window').textContent=windowText;
  $('landscape').dataset.zoom=camera.zoom.toFixed(3);$('landscape').dataset.view=simCamera.mode;
  ctx.save();ctx.beginPath();ctx.rect(9,0,w-18,h);ctx.clip();
  const detailX=x=>cx+x*camera.scale,detailY=y=>cy-y*camera.scale;
  if(simCamera.mode==='auto'){
    // Stroke the accumulated model-space vectors at the current camera scale.
    ctx.save();ctx.translate(cx,cy);ctx.scale(camera.scale,-camera.scale);
    ctx.globalAlpha=.32;ctx.lineWidth=1.7/camera.scale;ctx.lineJoin='round';
    for(const m of ['sgd','newton']){ctx.strokeStyle=colors[m];ctx.stroke(simLayer.history[m]);}
    ctx.restore();
  }
  ['sgd','newton'].forEach(m=>{
    if(simCamera.mode==='overview'){ctx.globalAlpha=.85;ctx.drawImage(simLayer.trails[m],0,0,w,h);}
    else for(let band=0;band<4;band++){
      const from=camera.from+Math.floor((end-camera.from)*band/4),to=camera.from+Math.floor((end-camera.from)*(band+1)/4);
      if(to<=from)continue;
      ctx.beginPath();ctx.moveTo(detailX(sim.paths[m][from].w[0]),detailY(sim.paths[m][from].w[1]));
      for(let i=from+1;i<=to;i++)ctx.lineTo(detailX(sim.paths[m][i].w[0]),detailY(sim.paths[m][i].w[1]));
      ctx.globalAlpha=.2+.23*band;ctx.strokeStyle=colors[m];ctx.lineWidth=2.2;ctx.stroke();
    }
    ctx.globalAlpha=1;
    const current=sim.paths[m][end].w,next=sim.paths[m][Math.min(end+1,sim.paths[m].length-1)].w;
    const p=current.map((v,i)=>v+(next[i]-v)*(position-end));
    ctx.beginPath();ctx.arc(detailX(p[0]),detailY(p[1]),5,0,2*Math.PI);ctx.fillStyle=colors[m];ctx.fill();ctx.strokeStyle=simLayer.palette.surface;ctx.lineWidth=1.5;ctx.stroke();
  });
  if(camera.from===0){ctx.beginPath();ctx.arc(detailX(sim.start[0]),detailY(sim.start[1]),5.5,0,2*Math.PI);ctx.strokeStyle=simLayer.palette.ink;ctx.lineWidth=1;ctx.stroke();ctx.font=`14px ${token('--sans')}`;ctx.fillStyle=simLayer.palette.muted;ctx.fillText('start',detailX(sim.start[0])+9,detailY(sim.start[1])-9);}
  ctx.beginPath();ctx.arc(cx,cy,2.5,0,2*Math.PI);ctx.fillStyle=simLayer.palette.ink;ctx.fill();ctx.restore();
  if(simCamera.mode==='auto')renderOverview(camera,w,h);
  return {scale:camera.scale,cx,cy};
}
function drawFocusedBackdrop(ctx,w,h,camera){
  const {scale,cx,cy}=camera,palette=simLayer.palette;
  ctx.save();ctx.beginPath();ctx.rect(9,0,w-18,h);ctx.clip();
  // Fixed model-space contour levels move continuously with the camera.
  for(let decade=-4;decade<=1;decade++)for(const multiple of [1,2,5]){
    const radius=multiple*10**decade*scale;
    if(radius<12||radius>Math.hypot(w,h)*Math.sqrt(sim.sharp)*2)continue;
    ctx.globalAlpha=Math.min(1,(radius-12)/28)*(multiple===1?.45:.85);ctx.beginPath();ctx.ellipse(cx,cy,radius,radius/Math.sqrt(sim.sharp),0,0,Math.PI*2);
    ctx.strokeStyle=palette[multiple===1?'muted':'grid-strong'];ctx.lineWidth=multiple===1?1.1:.9;ctx.stroke();
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle=palette.muted;ctx.globalAlpha=.55;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,cy);ctx.lineTo(w-20,cy);ctx.moveTo(cx,22);ctx.lineTo(cx,h-22);ctx.stroke();ctx.globalAlpha=1;
  ctx.font=`14px ${token('--sans')}`;ctx.fillStyle=palette.muted;
  const tickX=SimulationCamera.niceStep((w-64)/scale),tickY=SimulationCamera.niceStep((h-50)/scale);
  for(let i=Math.ceil((24-cx)/scale/tickX);i<=Math.floor((w-32-cx)/scale/tickX);i++){
    const x=cx+i*tickX*scale;ctx.beginPath();ctx.moveTo(x,cy-3);ctx.lineTo(x,cy+3);ctx.stroke();
    ctx.textAlign='center';ctx.fillText(SimulationCamera.tickLabel(i*tickX,tickX),x,cy+18);
  }
  for(let i=Math.ceil((cy-h+25)/scale/tickY);i<=Math.floor((cy-30)/scale/tickY);i++)if(i){
    const y=cy-i*tickY*scale;ctx.beginPath();ctx.moveTo(cx-3,y);ctx.lineTo(cx+3,y);ctx.stroke();
    ctx.textAlign='left';ctx.fillText(SimulationCamera.tickLabel(i*tickY,tickY),cx+7,y+3);
  }
  ctx.restore();
}
function renderOverview(camera,w,h){
  const {ctx,w:mw,h:mh}=canvasSize($('landscape-overview'));
  if(!mw||!mh)return;
  ctx.clearRect(0,0,mw,mh);
  const ratio=Math.min((mw-10)/w,(mh-10)/h),cx=mw*.5,cy=mh*.53,scale=camera.base*ratio;
  ctx.save();ctx.beginPath();ctx.rect(0,0,mw,mh);ctx.clip();
  ctx.globalAlpha=.9;
  ['sgd','newton'].forEach(m=>{
    ctx.drawImage(simLayer.trails[m],cx-camera.cx*ratio,cy-camera.cy*ratio,w*ratio,h*ratio);
    const p=sim.paths[m][camera.end].w;ctx.beginPath();ctx.arc(cx+p[0]*scale,cy-p[1]*scale,2.2,0,Math.PI*2);ctx.fillStyle=colors[m];ctx.fill();
  });
  ctx.globalAlpha=1;ctx.fillStyle=simLayer.palette.muted;ctx.beginPath();ctx.arc(cx,cy,1.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=simLayer.palette.ink;ctx.lineWidth=.7;ctx.setLineDash([2,2]);
  ctx.strokeRect(cx-camera.cx/camera.scale*scale,cy-camera.cy/camera.scale*scale,w/camera.scale*scale,h/camera.scale*scale);ctx.restore();
}
function setSimulationView(mode){
  simCamera.mode=mode;
  $('sim-auto-view').setAttribute('aria-pressed',String(mode==='auto'));
  $('sim-full-view').setAttribute('aria-pressed',String(mode==='overview'));
  renderSim();
}
function renderLoss(){
  const chart=$('sim-loss'),width=Math.max(240,Math.min(1100,chart.clientWidth)),height=150;
  const key=`${width}:${height}:${document.documentElement.dataset.theme}`;
  const {ymax,ymin}=sim.runLossBounds;
  if(simLoss.key!==key||simLoss.paths!==sim.paths){
    simLoss.key=key;simLoss.paths=sim.paths;simLoss.end=-1;
    chart.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const samples=sim.paths.sgd.at(-1).samples;
    const f=frame(width,height,{l:70,r:18,t:14,b:30}),x=s=>f.l+s/samples*f.iw;
    const xticks=width<340?[[0,'0'],[samples,'4K samples']]:[[0,'0'],[samples/2,'2K'],[samples,'4K samples']];
    const a=axes(f,ymin,ymax,xticks,x,{dark:true,format:v=>scientificSVG(10**v)});
    chart.innerHTML=a.svg+['sgd','newton'].map(m=>`<path id="sim-loss-${m}" fill="none" stroke="${colors[m]}" stroke-width="1.8"/>`).join('');
    ['sgd','newton'].forEach(m=>{
      const pts=sim.paths[m],stride=Math.max(1,Math.ceil((pts.length-1)/350));
      const coordinates=pts.map(p=>`${x(p.samples).toFixed(2)},${a.y(Math.max(ymin,Math.log10(Math.max(p.loss,1e-15)))).toFixed(2)}`);
      let path='';const offsets=[];
      for(let i=0;i<pts.length;i+=stride){path+=(i?'L':'M')+coordinates[i];offsets.push(path.length);}
      simLoss.curves[m]={path,offsets,coordinates,stride,element:$(`sim-loss-${m}`)};
    });
  }
  const end=Math.floor(sim.progress*(sim.paths.sgd.length-1));
  if(end===simLoss.end)return;
  simLoss.end=end;
  ['sgd','newton'].forEach(m=>{
    const curve=simLoss.curves[m];
    const path=curve.path.slice(0,curve.offsets[Math.floor(end/curve.stride)])+(end%curve.stride?'L'+curve.coordinates[end]:'');
    curve.element.setAttribute('d',path);
  });
}
function renderSim(){
  if(landscapeView==='3d')drawHero(sim.progress*sim.duration);else renderLandscape();
  renderLoss();
  const steps=sim.paths.sgd.length-1,samples=Math.floor(sim.progress*steps)*sim.batch,total=steps*sim.batch;
  const progress=`${fmt(samples)} / ${fmt(total)} samples`,label=sim.playing?'Pause':sim.progress>=1?'Replay':'Run',icon=sim.playing?'Ⅱ':sim.progress>=1?'↻':'▶';
  $('landscape').dataset.steps=String(steps);$('landscape').dataset.samples=String(samples);
  if($('sim-progress').textContent!==progress)$('sim-progress').textContent=progress;
  $('sim-progress-bar').style.width=(sim.progress*100)+'%';
  if($('sim-play-label').textContent!==label)$('sim-play-label').textContent=label;
  if($('sim-play-icon').textContent!==icon)$('sim-play-icon').textContent=icon;
}
function setLandscapeProjection(view){
  if(view!=='3d'&&view!=='2d')return;
  landscapeView=view;
  $('geometry-lab').dataset.projection=view;
  $('landscape-panel-3d').hidden=view!=='3d';$('landscape-panel-2d').hidden=view!=='2d';
  ['3d','2d'].forEach(mode=>{const button=$('projection-'+mode);button.classList.toggle('active',mode===view);button.setAttribute('aria-pressed',String(mode===view));});
  heroBackdrop.key='';simLayer.key='';simDetail.painted='';
  if(sim.paths.sgd){renderSim();syncSimPlayback();}
}
['3d','2d'].forEach(view=>$('projection-'+view).addEventListener('click',()=>setLandscapeProjection(view)));
function tickSim(ts){simRAF=0;if(!sim.playing||!simVisible||document.hidden)return;if(sim.last)sim.progress=Math.min(1,sim.progress+Math.min(ts-sim.last,60)*sim.speed/sim.duration);sim.last=ts;if(sim.progress>=1)sim.playing=false;renderSim();if(sim.playing)simRAF=requestAnimationFrame(tickSim);else syncSimPlayback();}
function syncSimPlayback(){
  const running=sim.playing&&simVisible&&!document.hidden;
  $('landscape').dataset.animating=String(running&&landscapeView==='2d');$('hero-canvas').dataset.animating=String(running&&landscapeView==='3d');
  if(!running){cancelAnimationFrame(simRAF);simRAF=0;sim.last=0;}
  else if(!simRAF){sim.last=0;simRAF=requestAnimationFrame(tickSim);}
}
$('sim-play').addEventListener('click',()=>{sim.playing=!sim.playing;if(sim.progress>=1)sim.progress=0;renderSim();syncSimPlayback();});
new IntersectionObserver(entries=>{simVisible=entries[0].isIntersecting;syncSimPlayback();},{threshold:0}).observe($('landscape').closest('.sandbox'));
document.addEventListener('visibilitychange',syncSimPlayback);
$('sim-reset').addEventListener('click',configureSimulation);
$('sim-reseed').addEventListener('click',()=>{sim.seed++;configureSimulation();});
['sim-batch','sim-sharp','sim-noise'].forEach(id=>$(id).addEventListener('input',()=>{if(!simConfigRAF)simConfigRAF=requestAnimationFrame(configureSimulation);}));
$('sim-speed').addEventListener('change',()=>{sim.speed=Number($('sim-speed').value);});
$('sim-auto-view').addEventListener('click',()=>setSimulationView('auto'));
$('sim-full-view').addEventListener('click',()=>setSimulationView('overview'));
$('sim-overview').addEventListener('click',()=>setSimulationView('overview'));
reducedMotion.addEventListener('change',e=>{if(e.matches){sim.playing=false;setSimulationView('overview');syncSimPlayback();}});
$('preset-small').addEventListener('click',()=>{$('sim-batch').value=0;configureSimulation();});
$('preset-large').addEventListener('click',()=>{$('sim-batch').value=8;configureSimulation();});
function setSimulationStart(point){
  sim.start=[Math.max(-1.85,Math.min(1.85,point[0])),Math.max(-1.3,Math.min(1.3,point[1]))];
  configureSimulation();
}
function moveStartWithKeys(e){
  const delta={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.key];
  if(delta){e.preventDefault();setSimulationStart(sim.start.map((value,i)=>value+delta[i]));}
}
let landscapePointer=null;
$('landscape').addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||landscapeView!=='2d')return;
  const rect=e.currentTarget.getBoundingClientRect(),view=renderLandscape();
  landscapePointer={id:e.pointerId,x:e.clientX,y:e.clientY,point:[e.clientX-rect.left,e.clientY-rect.top],view,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
});
$('landscape').addEventListener('pointermove',e=>{
  if(landscapePointer?.id===e.pointerId&&Math.hypot(e.clientX-landscapePointer.x,e.clientY-landscapePointer.y)>6)landscapePointer.moved=true;
});
$('landscape').addEventListener('pointercancel',()=>{landscapePointer=null;});
$('landscape').addEventListener('lostpointercapture',()=>{landscapePointer=null;});
$('landscape').addEventListener('pointerup',e=>{
  const pointer=landscapePointer;landscapePointer=null;
  if(!pointer||pointer.id!==e.pointerId||pointer.moved||landscapeView!=='2d'||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)return;
  const {scale,cx,cy}=pointer.view;
  e.currentTarget.focus({preventScroll:true});
  setSimulationStart([(pointer.point[0]-cx)/scale,(cy-pointer.point[1])/scale]);
});
['landscape','hero-canvas'].forEach(id=>$(id).addEventListener('keydown',moveStartWithKeys));
let surfacePointer=null;
$('hero-canvas').addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||landscapeView!=='3d')return;
  drawHero(sim.progress*sim.duration);
  const rect=e.currentTarget.getBoundingClientRect();
  surfacePointer={id:e.pointerId,x:e.clientX,y:e.clientY,point:[e.clientX-rect.left,e.clientY-rect.top],view:heroBackdrop.surface,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
});
$('hero-canvas').addEventListener('pointermove',e=>{
  if(surfacePointer?.id===e.pointerId&&Math.hypot(e.clientX-surfacePointer.x,e.clientY-surfacePointer.y)>6)surfacePointer.moved=true;
});
$('hero-canvas').addEventListener('pointercancel',()=>{surfacePointer=null;});
$('hero-canvas').addEventListener('lostpointercapture',()=>{surfacePointer=null;});
$('hero-canvas').addEventListener('pointerup',e=>{
  const pointer=surfacePointer;surfacePointer=null;
  if(!pointer||pointer.id!==e.pointerId||pointer.moved||landscapeView!=='3d')return;
  const origin=surfaceOrigin(pointer.view);
  // The visible minimum marker remains selectable through overlapping mesh lines.
  const point=Math.hypot(pointer.point[0]-origin[0],pointer.point[1]-origin[1])<=9?[0,0]:pickSurfaceStart(pointer.point,pointer.view);
  if(point){e.currentTarget.focus({preventScroll:true});setSimulationStart(point);}
});

function drawScaling(){
  const alpha=+$('scale-alpha').value,ratio=2**+$('scale-batch').value;
  $('scale-alpha-output').textContent=alpha.toFixed(2);$('scale-batch-output').textContent=ratio+'×';
  const chartWidth=Math.max(240,Math.min(1000,$('scaling-chart').clientWidth)),chartHeight=Math.round($('scaling-chart').clientHeight||300);
  const f=researchFrame('scaling-chart',chartWidth,chartHeight,{l:58,r:20,t:18,b:34}),x=r=>f.l+Math.log2(r)/6*f.iw;
  const cnrs=[1,.001],vals=cnrs.map(c=>Array.from({length:121},(_,i)=>({r:2**(i/20),v:NQM.displacement(c,2**(i/20),alpha)})));
  const peak=Math.max(1,...vals.flat().map(p=>p.v)),step=peak<=2?.5:peak<=4?1:2;
  const ymax=peak*1.06,a={y:v=>f.t+f.ih*(1-v/ymax)};
  const ticks=[...new Set([...Array.from({length:Math.floor(ymax/step)+1},(_,i)=>i*step),1])].sort((a,b)=>a-b);
  let s='';
  ticks.forEach(v=>{s+=`<line x1="${f.l}" x2="${f.w-f.r}" y1="${a.y(v)}" y2="${a.y(v)}" stroke="${token(v===1?'--muted':'--line')}"${v===1?' stroke-dasharray="5 4"':''}/>`+svgText(f.l-12,a.y(v)+5,v+'×',`font-size="16" text-anchor="end"${v===1?' font-weight="600"':''}`);});
  [1,4,16,64].forEach(r=>{s+=svgText(x(r),f.h-13,String(r),`font-size="16" text-anchor="${r===64?'end':'middle'}"`);});
  s+=`<line x1="${x(ratio)}" x2="${x(ratio)}" y1="${f.t}" y2="${f.t+f.ih}" stroke="#9bab9a" stroke-dasharray="2 4"/>`;
  vals.forEach((pts,i)=>{const color=i?colors.newton:colors.sgd;s+=`<path d="${line(pts,p=>x(p.r),p=>a.y(p.v))}" fill="none" stroke="${color}" stroke-width="2.7"/><circle cx="${x(ratio)}" cy="${a.y(NQM.displacement(cnrs[i],ratio,alpha))}" r="5" fill="${color}" stroke="#fffefa" stroke-width="2"/>`;});
  s+=researchAxes(f);$('scaling-chart').innerHTML=s;
  $('movement-readout').innerHTML=cnrs.map((c,i)=>{const v=NQM.displacement(c,ratio,alpha);return `<div class="movement-value"><span>${i?'Low':'High'} CNR</span><strong>${v.toFixed(2)}×</strong><small>${Math.abs(v-1)<.02?'Almost preserved':v<1?'Less movement / sample':'More movement / sample'}</small></div>`;}).join('');
  drawMovementQuadratic(alpha,ratio);
  dispatchEvent(new Event('batchsize:scaling'));
  document.querySelectorAll('#scale-presets button').forEach(b=>{b.classList.toggle('active',+b.dataset.alpha===alpha);b.setAttribute('aria-pressed',String(+b.dataset.alpha===alpha));});
}
function drawMovementQuadratic(alpha,ratio){
  const svg=$('local-movement-quadratic'),w=Math.max(240,Math.min(440,svg.clientWidth)),h=370;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const x=v=>24+(v+1.2)/2.8*(w-48);
  const arrowUnit=.3; // Fixed batch-1 reference length across every exponent and batch ratio.
  let markup=`<title>Local movement at batch ratio ${ratio}, exponent ${alpha.toFixed(2)}. Arrows are normalized to each direction's batch-1 movement.</title>`;
  [1,.001].forEach((cnr,i)=>{
    const top=i*190,color=i?colors.newton:colors.sgd,movement=NQM.displacement(cnr,ratio,alpha),end=1-arrowUnit*movement;
    const y=v=>top+67-26*v*v,points=Array.from({length:81},(_,k)=>-1.2+2.6*k/80);
    if(i)markup+=`<line data-movement-separator x1="16" x2="${w-16}" y1="${top-14}" y2="${top-14}" stroke="${token('--line')}"/>`;
    markup+=svgText(16,top+14,`${i?'Low':'High'} CNR · ${cnr}`,`font-size="14" fill="${color}" font-weight="600"`);
    markup+=`<path d="${line(points,v=>x(v),y)}" fill="none" stroke="${token('--grid-strong')}" stroke-width="1.5"/><circle cx="${x(1)}" cy="${y(1)}" r="3" fill="${token('--ink')}"/>`;
    const arrow=(end,cy,stroke,dashed)=>`<path data-movement-arrow="${dashed?'baseline':'scaled'}" d="M${x(1)} ${cy}H${x(end)}" fill="none" stroke="${stroke}" stroke-width="${dashed?1.5:3}" ${dashed?'stroke-dasharray="4 3"':''}/><path d="M${x(end)+5} ${cy-4}L${x(end)} ${cy}L${x(end)+5} ${cy+4}" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
    const local=Array.from({length:21},(_,k)=>end+(1-end)*k/20);
    markup+=`<path d="${line(local,v=>x(v),y)}" fill="none" stroke="${color}" stroke-width="3"/><circle cx="${x(end)}" cy="${y(end)}" r="4" fill="${color}"/>`;
    markup+=arrow(1-arrowUnit,top+115,token('--muted'),true)+arrow(end,top+157,color,false);
    markup+=svgText(16,top+101,'Batch 1','font-size="13"')+svgText(16,top+143,`${ratio}× batch · ${movement.toFixed(2)}×`,`font-size="13" fill="${color}"`);
  });
  svg.dataset.alpha=alpha;svg.dataset.ratio=ratio;svg.innerHTML=markup;
}
['scale-alpha','scale-batch'].forEach(id=>$(id).addEventListener('input',drawScaling));
document.querySelectorAll('#scale-presets button').forEach(b=>b.addEventListener('click',()=>{$('scale-alpha').value=b.dataset.alpha;drawScaling();}));

const interventionAnchors=[...new Set(DATA.endpoints.map(row=>row.anchor))].sort((a,b)=>a-b);
$('anchor').min=interventionAnchors[0]/1000;$('anchor').max=interventionAnchors.at(-1)/1000;$('anchor').step=1;
function drawIntervention(){
  const anchor=+$('anchor').value*1000,arm=$('held').value,rows=DATA.endpoints.filter(r=>r.anchor===anchor);
  const full=rows.find(r=>r.arm==='fully scaled'),selected=rows.find(r=>r.arm===arm),random=rows.find(r=>r.arm==='random-768 held');
  const recovery=arm==='fully scaled'?0:DATA.recovery.find(r=>r.anchor===anchor&&r.arm===arm)?.percent;
  $('anchor-output').textContent=fmt(anchor);$('anchor').setAttribute('aria-valuetext',`Training step ${fmt(anchor)}`);
  [...$('held').options].forEach(o=>{const exists=rows.some(r=>r.arm===o.value);o.textContent=o.textContent.replace(' · not run','')+(exists?'':' · not run');});
  // Bar labels reuse the curve legend's names.
  const show=[{label:'Fully scaled to 2M',row:full,highlight:arm==='fully scaled'},...(arm==='fully scaled'?[]:[{label:arm==='random-768 held'?'Random 768':arm.replace('top-','Top-').replace(' held',''),row:selected,highlight:true}]),...(arm!=='random-768 held'?[{label:'Random 768',row:random,random:true}]:[])];
  const max=Math.max(full.penalty,random?.penalty||0,selected?.penalty||0)*1.08;
  const heldColors={16:'#1a73e8',64:'#9334e6',128:'#e37400',256:'#1e8e3e',768:'#087c75'};
  $('penalty-bars').innerHTML=show.map(({label,row,highlight,random})=>`<div class="penalty-row"><div class="penalty-label"><span>${label}</span><strong>${row?'+'+row.penalty.toFixed(row.penaltyPrecision??2):'Not run'}</strong></div><div class="penalty-track"><div class="penalty-fill ${highlight?'highlight':''} ${random?'random':''}" style="height:${row?row.penalty/max*100:0}%;background:${row?.arm.startsWith('top-')?heldColors[row.rank]:random||row?.arm==='random-768 held'?token('--muted'):token('--coral')};"></div></div></div>`).join('');
  const approximate=DATA.recovery.find(r=>r.anchor===anchor&&r.arm===arm)?.approximate;
  $('recovery-number').innerHTML=selected&&recovery!==undefined?`<i>R</i> ${approximate?'≈':'='} ${recovery.toFixed(1)}<span>%</span>`:'Not run';
  $('recovery-number').classList.toggle('missing',!selected);
  $('recovery-text').textContent=!selected?'We did not run this branch at this checkpoint. Choose another subspace or training step.':arm==='fully scaled'?'All matrix directions use large-batch updates. This is the baseline penalty.':anchor>=11000?'Keeping these directions at small batch makes little difference near the end of training.':arm==='random-768 held'?'Keeping random directions at small batch barely changes the penalty. A negative percentage means the penalty got slightly worse.':`At step ${fmt(anchor)}, keeping small-batch updates in the sharpest ${fmt(selected.rank)} directions ${recovery>=0?'removes':'increases the local batch-size penalty by'} ${approximate?'about ':''}${Math.abs(recovery).toFixed(1)}%${recovery>=0?' of the local batch-size penalty':''}.`;
  dispatchEvent(new Event('batchsize:intervention'));
  $('endpoint-table').innerHTML='<table><caption>Available branch endpoints at step '+fmt(anchor)+'</caption><thead><tr><th scope="col">Branch</th><th scope="col">Validation loss</th><th scope="col">Penalty (10<sup>−3</sup> nats)</th></tr></thead><tbody>'+rows.map(r=>`<tr><th scope="row">${r.arm}</th><td>${r.loss===null?'Not available':r.loss.toFixed(6)}</td><td>${r.penalty.toFixed(r.penaltyPrecision??2)}</td></tr>`).join('')+'</tbody></table>';
}
$('anchor').addEventListener('input',drawIntervention);$('held').addEventListener('change',drawIntervention);

// Theme switches redraw the canvases and scientific series as one visual system.
function updatePalette(){
  const dark=document.documentElement.dataset.theme==='dark';
  Object.assign(colors,dark?{SOAP:'#d3b789',Shampoo:'#89c8b0',Muon:'#ecad8e',Adam:'#a5b3d6',Lion:'#c1aec6'}:{SOAP:'#907040',Shampoo:'#176d63',Muon:'#a44530',Adam:'#526eaa',Lion:'#897087'});
  colors.sgd=token('--coral');colors.newton=token('--teal');
  $('theme-toggle').textContent=dark?'Light mode':'Dark mode';
  $('theme-toggle').setAttribute('aria-label',`Switch to ${dark?'light':'dark'} mode`);
  document.querySelector('meta[name="theme-color"]').content=token('--paper');
}
$('theme-toggle').addEventListener('click',()=>{
  document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  try{localStorage.setItem('batchsize-theme',document.documentElement.dataset.theme);}catch(e){}
  updatePalette();drawRankings();renderRisk();renderSim();drawScaling();drawIntervention();
  dispatchEvent(new Event('batchsize:theme'));
});
// A setup URL preserves the toy experiment, including its starting point and noise seed.
function loadSetup(){
  const params=new URLSearchParams(location.search);
  const read=(key,min,max,fallback)=>{const raw=params.get(key),v=Number(raw);return raw!==null&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;};
  const batch=read('batch',1,4096,1);$('sim-batch').value=Math.round(Math.log2(batch));
  $('sim-sharp').value=Math.round(read('sharp',2,60,20));$('sim-noise').value=Math.round(read('noise',0,80,8));
  sim.seed=Math.round(read('seed',0,4294967295,7));sim.start=[read('x',-1.85,1.85,1),read('y',-1.3,1.3,1)];
  const speed=Number(params.get('speed'));sim.speed=[1,2,4].includes(speed)?speed:1;$('sim-speed').value=String(sim.speed);
  landscapeView=params.get('projection')==='2d'?'2d':'3d';
  simCamera.mode=reducedMotion.matches||params.get('view')==='overview'?'overview':'auto';
  $('sim-auto-view').setAttribute('aria-pressed',String(simCamera.mode==='auto'));$('sim-full-view').setAttribute('aria-pressed',String(simCamera.mode==='overview'));
}
$('sim-share').addEventListener('click',async()=>{
  const url=new URL(location.href);url.search='';
  Object.entries({batch:sim.batch,sharp:sim.sharp,noise:sim.noise,seed:sim.seed,x:sim.start[0],y:sim.start[1],speed:sim.speed,view:simCamera.mode,projection:landscapeView}).forEach(([k,v])=>url.searchParams.set(k,v));url.hash='playground';
  history.replaceState(null,'',url);const feedback=$('share-feedback');
  try{await navigator.clipboard.writeText(url.href);feedback.textContent='Setup link copied. It includes your start point and noise seed.';}
  catch(e){feedback.textContent='Copy this link to share your setup: ';const field=document.createElement('input');field.readOnly=true;field.value=url.href;field.setAttribute('aria-label','Shareable experiment URL');feedback.appendChild(field);field.focus();field.select();}
});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{renderSim();drawRankings();drawScaling();},100);});
document.fonts.ready.then(()=>{heroBackdrop.key='';simLayer.key='';simDetail.painted='';renderSim();});
updatePalette();loadSetup();setLandscapeProjection(landscapeView);drawRankings();configureSimulation();drawScaling();drawIntervention();
// Reveal only unseen sections, so the first screen and reduced-motion readers stay immediate.
if(!reducedMotion.matches){
  const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');reveal.unobserve(e.target);}}),{threshold:.06});
  document.querySelectorAll('.chapter-head,.two-col,.light-panel,.sandbox,.pull-quote,.closing-grid').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('reveal');reveal.observe(el);}});
}
