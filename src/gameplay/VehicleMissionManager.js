import { Vector3 } from 'three';
import { RoadVehicleAgent, missionRoute } from '../vehicles/RoadVehicleAgent.js';

export const DRIVING_OBJECTIVES = Object.freeze(['drive','follow','evade','timed','intercept','escort']);
const LABELS={drive:'Rejoindre le point en véhicule',follow:'Suivre le véhicule cible 8 secondes',evade:'Semer la poursuite',timed:'Rejoindre la destination à temps',intercept:'Intercepter la cible : rester à moins de 9 m',escort:'Escorter le véhicule pendant 12 secondes'};
export class VehicleMissionManager {
  constructor(manager,pursuit) {this.manager=manager;this.pursuit=pursuit;this.serial=0;this.active=null;this.last=null;this.enabled=false;this.updateMs=0;this.agent=new RoadVehicleAgent(manager.target,manager.physics,manager.living.traffic.network);}
  clear(){this.active=null;this.last=null;this.serial=0;this.manager.target.active=false;}
  startNext(type=this.offeredType??DRIVING_OBJECTIVES[this.serial%DRIVING_OBJECTIVES.length]) {
    if(!this.enabled||this.active||!this.manager.driving||!DRIVING_OBJECTIVES.includes(type))return false;
    const route=missionRoute(this.agent.network,this.manager.city.seed,this.serial);
    const destination=new Vector3(route.nodes[0].x,0,route.nodes[0].z);
    this.active={id:`driving-${++this.serial}`,type,state:'ACTIVE',objective:LABELS[type],destination,remaining:type==='timed'?75:150,progress:0,route:route.nodes};
    this.manager.target.active=['follow','intercept','escort'].includes(type);
    if(this.manager.target.active){this.agent.followLoop(route.path);this.active.destination.copy(this.manager.target.position);}
    if(type==='evade')this.pursuit.begin(this.manager.vehicle.position,this.manager.living.performance.level,'mission');
    return true;
  }
  finish(success){if(!this.active)return;this.active.state=success?'COMPLETED':'FAILED';this.last=this.active;this.active=null;this.manager.target.active=false;return this.last;}
  update(dt,alive=true) {
    const start=performance.now(),m=this.active;if(!m)return null;
    m.remaining-=dt;if(!alive||m.remaining<=0)return this.finish(false);
    const manager=this.manager;
    if(manager.target.active){this.agent.update(dt,null,m.type==='escort'?7:10);m.destination.copy(manager.target.position);}
    const distance=manager.vehicle.position.distanceTo(m.destination);
    if(manager.driving) {
      if(['drive','timed'].includes(m.type)&&distance<8)return this.finish(true);
      if(m.type==='evade'&&['LOST','NONE'].includes(this.pursuit.state))return this.finish(true);
      if(['follow','escort','intercept'].includes(m.type)) {
        const inRange=distance<(m.type==='intercept'?9:30);
        m.progress=inRange?m.progress+dt:Math.max(0,m.progress-dt*.5);
        if(m.progress>=(m.type==='intercept'?2:m.type==='escort'?12:8))return this.finish(true);
      }
    }
    this.updateMs=this.updateMs*.9+(performance.now()-start)*.1;return null;
  }
}
