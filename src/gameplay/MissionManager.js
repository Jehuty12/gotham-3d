import { Vector3 } from 'three';

export const MISSION_STATES=['AVAILABLE','ACTIVE','COMPLETED','FAILED'];
const objectives={reach:'Rejoindre la zone signalée',observe:'Observer la cible pendant 2 secondes',neutralize:'Neutraliser le groupe',roof:'Atteindre le toit signalé',inspect:'Inspecter le lieu [E]',enter:'Entrer dans le bâtiment signalé'};
const types={assault:'neutralize',burglary:'inspect','hostile-group':'neutralize','vehicle-theft':'observe',rooftop:'roof','occupied-warehouse':'enter'};
export class MissionManager {
  constructor(){this.missions=[];this.active=null;this.completed=0;}
  sync(events) {
    const ids=new Set(events.map(e=>e.id));
    if(this.active?.eventId&&!ids.has(this.active.eventId))this.finish(false);
    this.missions=this.missions.filter(m=>ids.has(m.eventId)||m===this.active);
    for(const e of events) {
      if(this.missions.some(m=>m.eventId===e.id))continue;
      let type=types[e.type];if(type==='enter'&&!e.site.interiorId)type='reach';
      this.missions.push({id:`mission-${e.id}`,eventId:e.id,type,district:e.site.district,position:(type==='enter'?e.site.interiorPosition:e.position)?.clone()??e.position.clone(),objective:objectives[type],state:'AVAILABLE',interiorId:e.site.interiorId,approaches:e.site.approaches,progress:0,elapsed:0});
    }
  }
  offer(position){return this.missions.filter(m=>m.state==='AVAILABLE').sort((a,b)=>a.position.distanceToSquared(position)-b.position.distanceToSquared(position))[0]??null;}
  activate(id){const mission=this.missions.find(m=>m.id===id&&m.state==='AVAILABLE');if(!mission||this.active)return false;mission.state='ACTIVE';this.active=mission;return true;}
  finish(success){const m=this.active;if(!m)return null;m.state=success?'COMPLETED':'FAILED';if(success)this.completed++;this.active=null;return m;}
  update(dt,{position,observing=false,inspected=false,interior=null,enemies=[]}) {
    const m=this.active;if(!m)return null;m.elapsed+=dt;
    if(m.elapsed>240)return this.finish(false);
    const near=position.distanceTo(m.position.clone().add(new Vector3(0,1.5,0)))<5;
    if(m.type==='observe')m.progress=near&&observing?m.progress+dt:0;
    const group=enemies.filter(e=>e.active&&e.eventId===m.eventId);
    const complete=(['reach','roof'].includes(m.type)&&near)||(m.type==='inspect'&&near&&inspected)||(m.type==='observe'&&m.progress>=2)||
      (m.type==='enter'&&interior===m.interiorId)||(m.type==='neutralize'&&group.length>0&&group.every(e=>e.state==='DISABLED'));
    return complete?this.finish(true):null;
  }
  clear(){this.missions.length=0;this.active=null;this.completed=0;}
}
