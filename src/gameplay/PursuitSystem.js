import { Vector3 } from 'three';
import { RoadVehicleAgent } from '../vehicles/RoadVehicleAgent.js';
import { segmentBlocked } from '../utils/spatialQueries.js';

export const PURSUIT_BUDGETS=Object.freeze({LOW:2,MEDIUM:3,HIGH:4});
export function policeDetects(unit,position,world,range=72) {
  return unit.active&&unit.position.distanceTo(position)<range&&Math.abs(unit.position.y-position.y)<12&&
    !segmentBlocked(world,unit.position.clone().add(new Vector3(0,1.3,0)),position.clone().add(new Vector3(0,.5,0)),null);
}
export class PursuitSystem {
  constructor(manager) {
    this.manager=manager;this.network=manager.living.traffic.network;this.world=manager.world;this.enabled=false;
    this.agents=manager.police.map(v=>new RoadVehicleAgent(v,manager.physics,this.network));
    this.state='NONE';this.lastKnown=new Vector3();this.timer=0;this.unseen=0;this.senseTime=0;this.senseCursor=0;this.updateMs=0;
  }
  setEnabled(enabled){this.enabled=enabled;if(!enabled)this.clear();}
  clear(){this.state='NONE';this.timer=0;this.unseen=0;for(const agent of this.agents){agent.vehicle.active=false;agent.replan=0;}}
  begin(position,level='MEDIUM',reason='event') {
    if(!this.enabled||!['NONE','LOST'].includes(this.state))return false;
    this.state='PURSUIT';this.timer=0;this.unseen=0;this.lastKnown.copy(position);this.reason=reason;
    const sites=this.network.nodes.filter(n=>Math.hypot(n.x-position.x,n.z-position.z)>38&&Math.hypot(n.x-position.x,n.z-position.z)<115).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)||a.id.localeCompare(b.id));
    for(let i=0;i<this.agents.length;i++) {
      const a=this.agents[i];a.vehicle.active=false;a.replan=0;a.points=[];a.index=0;a.accumulator=0;
      if(i>=PURSUIT_BUDGETS[level])continue;
      while(sites.length){const node=sites.shift(),spawn=new Vector3(node.x,0,node.z);this.manager.physics.prepare(spawn);
        if(this.manager.physics.blocked(a.vehicle,spawn))continue;
        a.vehicle.position.copy(spawn);a.vehicle.rotation=Math.atan2(position.x-node.x,position.z-node.z);a.vehicle.speed=0;a.vehicle.active=true;break;}
    }
    return true;
  }
  update(dt,position,level='MEDIUM',hidden=false) {
    const start=performance.now();
    if(!this.enabled||this.state==='NONE'){this.updateMs=0;return;}
    this.timer+=dt;this.unseen+=dt;this.senseTime-=dt;
    for(let i=PURSUIT_BUDGETS[level];i<this.agents.length;i++)this.agents[i].vehicle.active=false;
    if(this.state==='LOST') {if(this.timer>3)this.clear();this.updateMs=performance.now()-start;return;}
    if(this.senseTime<=0) {
      this.senseTime=.25;
      const active=this.agents.filter(a=>a.vehicle.active),agent=active[this.senseCursor++%Math.max(1,active.length)];
      if(agent&&!hidden&&policeDetects(agent.vehicle,position,this.world)){this.lastKnown.copy(position);this.unseen=0;if(this.state==='SEARCHING'){this.state='PURSUIT';this.timer=0;}}
    }
    if(this.state==='PURSUIT'&&this.unseen>3){this.state='SEARCHING';this.timer=0;}
    if(this.state==='SEARCHING'&&this.timer>10){this.state='LOST';this.timer=0;for(const a of this.agents)a.vehicle.active=false;}
    if(['PURSUIT','SEARCHING'].includes(this.state))for(const a of this.agents) {
      if(!a.vehicle.active)continue;
      if(a.vehicle.position.distanceTo(position)>240){a.vehicle.active=false;continue;}
      a.update(dt,this.lastKnown,this.state==='PURSUIT'?17:9);
    }
    this.updateMs=this.updateMs*.9+(performance.now()-start)*.1;
  }
  snapshot(){return {pursuitState:this.state,policeUnits:this.agents.filter(a=>a.vehicle.active).length,lastKnownPosition:this.lastKnown.toArray(),pursuitTimer:this.timer};}
}
