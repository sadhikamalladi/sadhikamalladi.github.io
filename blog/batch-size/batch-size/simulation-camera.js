/* Camera motion changes the view only; trajectories remain in model coordinates. */
(function(root){
  'use strict';
  function rollingMax(values,window){
    const out=new Float64Array(values.length),queue=[];let head=0;
    for(let i=0;i<values.length;i++){
      while(queue.length>head&&values[queue[queue.length-1]]<=values[i])queue.pop();
      queue.push(i);
      while(queue[head]<i-window+1)head++;
      out[i]=values[queue[head]];
    }
    return out;
  }
  function prepare(paths){
    const count=paths.sgd.length,window=Math.min(count,257,1+2**Math.ceil(Math.log2(Math.max(1,(count-1)*.06))));
    const x=new Float64Array(count),y=new Float64Array(count);
    for(let i=0;i<count;i++){
      x[i]=Math.max(Math.abs(paths.sgd[i].w[0]),Math.abs(paths.newton[i].w[0]));
      y[i]=Math.max(Math.abs(paths.sgd[i].w[1]),Math.abs(paths.newton[i].w[1]));
    }
    return {count,window,x:rollingMax(x,window),y:rollingMax(y,window),
      maxX:Math.max(...x),maxY:Math.max(...y)};
  }
  function layout(prepared,width,height,options={}){
    const cx=width*.5,cy=options.cy??height*.53;
    const limitX=options.limitX??Math.max(20,width*.5-38),limitY=options.limitY??Math.max(20,Math.min(cy-34,height-cy-30));
    const base=options.base??Math.min(width/4.5,height/3.35,limitX/Math.max(prepared.maxX,1e-12),limitY/Math.max(prepared.maxY,1e-12));
    const zoom=new Float64Array(prepared.count),targets=new Float64Array(prepared.count);
    const easing=1-Math.exp(-1/Math.max(1,(prepared.count-1)*.35));
    for(let i=0;i<zoom.length;i++)targets[i]=Math.max(1,Math.min(32,limitX/(base*Math.max(prepared.x[i],1e-12)),limitY/(base*Math.max(prepared.y[i],1e-12))));
    // Future bounds make the framing conservative enough to never pull back.
    for(let i=targets.length-2;i>=0;i--)targets[i]=Math.min(targets[i],targets[i+1]);
    let current=0;
    for(let i=0;i<zoom.length;i++){
      if(i)current+=(Math.log(targets[i])-current)*easing;
      zoom[i]=Math.exp(current);
    }
    return {base,cx,cy,width,height,zoom,targets};
  }
  function sample(prepared,view,progress,mode='auto'){
    const position=Math.max(0,Math.min(1,progress))*(prepared.count-1),end=Math.floor(position);
    const next=Math.min(end+1,prepared.count-1),fraction=position-end;
    const zoom=mode==='overview'?1:Math.exp(Math.log(view.zoom[end])*(1-fraction)+Math.log(view.zoom[next])*fraction);
    return {end,from:mode==='overview'?0:Math.max(0,end-prepared.window+1),
      scale:view.base*zoom,zoom,cx:view.cx,cy:view.cy,base:view.base};
  }
  function niceStep(span){
    const raw=Math.max(span/5,1e-12),unit=10**Math.floor(Math.log10(raw)),fraction=raw/unit;
    return (fraction<=1?1:fraction<=2?2:fraction<=5?5:10)*unit;
  }
  function tickLabel(value,step){
    if(Math.abs(value)<step*.001)return '0';
    return Math.abs(value)<.001?value.toExponential(0):value.toFixed(Math.max(0,-Math.floor(Math.log10(step))));
  }
  root.SimulationCamera={prepare,layout,sample,niceStep,tickLabel};
})(typeof window!=='undefined'?window:globalThis);
