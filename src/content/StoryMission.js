export const MISSION_STATES=Object.freeze(['LOCKED','AVAILABLE','ACTIVE','COMPLETED']);

// Pure progress model. Runtime actions supply evidence; neither proximity nor a
// menu click can directly complete an unrelated objective.
export class StoryMission {
  constructor(definition){this.definition=definition;this.reset();}
  reset(){this.state='LOCKED';this.index=0;this.checkpoint=0;this.route='STREET';this.progress=0;this.elapsed=0;this.failures=0;this.replay=false;}
  get objectives(){return [...(this.definition.routes[this.route]?.objectives??[]),...this.definition.objectives];}
  get objective(){return this.objectives[this.index]??null;}
  unlock(completed){if(this.state==='LOCKED'&&this.definition.prerequisites.every(id=>completed.has(id)))this.state='AVAILABLE';}
  start(route='STREET',replay=false){if(this.state!=='AVAILABLE'&&!(replay&&this.state==='COMPLETED'))return false;this.route=this.definition.routes[route]?route:'STREET';this.index=this.checkpoint=0;this.progress=this.elapsed=0;this.state='ACTIVE';this.replay=replay;return true;}
  advance(){if(this.state!=='ACTIVE')return false;this.index++;this.progress=this.elapsed=0;this.checkpoint=this.index;if(!this.objective)this.state='COMPLETED';return true;}
  restart(all=false){if(this.state!=='ACTIVE')return false;this.index=all?0:this.checkpoint;if(all)this.checkpoint=0;this.progress=this.elapsed=0;this.failures++;return true;}
  capture(){return {state:this.state,index:this.index,checkpoint:this.checkpoint,route:this.route,progress:this.progress,elapsed:this.elapsed,failures:this.failures,replay:this.replay};}
  restore(raw){
    if(!raw||!MISSION_STATES.includes(raw.state))return;
    this.route=this.definition.routes[raw.route]?raw.route:'STREET';
    const bounded=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
    this.state=raw.state;this.index=bounded(raw.index,this.objectives.length);this.checkpoint=Math.min(this.index,bounded(raw.checkpoint,this.objectives.length));
    if(this.state==='ACTIVE'&&this.index===this.objectives.length)this.index=this.checkpoint=0;
    this.progress=0;this.elapsed=0;this.failures=bounded(raw.failures,9999);this.replay=raw.replay===true;
  }
}
