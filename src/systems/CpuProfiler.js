export class CpuProfiler {
  constructor(){this.values={};}
  record(name,ms){if(Number.isFinite(ms))this.values[name]=(this.values[name]??ms)*.9+ms*.1;}
  measure(name,callback){const start=performance.now();try{return callback();}finally{this.record(name,performance.now()-start);}}
  snapshot(){return Object.fromEntries(Object.entries(this.values).map(([key,value])=>[`${key}Ms`,value]));}
}
