export class FramePacing {
  constructor(capacity=600){this.samples=new Float32Array(capacity);this.cursor=0;this.count=0;}
  record(seconds){if(!Number.isFinite(seconds)||seconds<=0)return;this.samples[this.cursor++%this.samples.length]=seconds*1000;this.count=Math.min(this.count+1,this.samples.length);}
  snapshot(){if(!this.count)return {averageFPS:0,low1FPS:0,frameTimeMean:0,frameTimeMax:0};const values=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>b-a),mean=values.reduce((s,v)=>s+v,0)/values.length,n=Math.max(1,Math.ceil(values.length*.01));return {averageFPS:1000/mean,low1FPS:1000/(values.slice(0,n).reduce((s,v)=>s+v,0)/n),frameTimeMean:mean,frameTimeMax:values[0]};}
  reset(){this.cursor=0;this.count=0;}
}
