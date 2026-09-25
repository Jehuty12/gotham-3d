import { Vector3 } from 'three';
import { SAVE_VERSION, normalizeSave } from './SaveSchema.js';
import { capsuleClear, floorBelow } from '../utils/spatialQueries.js';
import { GAMEPLAY_BUDGETS } from '../gameplay/CrimeSystem.js';
import { DRIVING_OBJECTIVES } from '../gameplay/VehicleMissionManager.js';

// Explicit DTO boundary: runtime objects, AI, timers and meshes never enter storage.
export class WorldPersistence {
  constructor(living,player,options) {
    Object.assign(this,{living,player,options});this.completedMissions=new Set();this.completedCrimes=new Set();
  }
  capture() {
    const l=this.living,g=l.gameplay,v=g.vehicles,p=this.player,domain=l.vertical.interiors.active;
    const mission=g.missions.active,event=g.crimes.events.find(e=>e.id===mission?.eventId),drive=g.vehicleMissions.active;
    return normalizeSave({version:SAVE_VERSION,seed:l.city.seed,savedAt:Date.now(),mode:g.mode,
      player:{position:l.camera.position.toArray(),rotation:[l.camera.rotation.x,l.camera.rotation.y,0],health:g.health.hp,driving:v.driving,domain:{kind:domain?'interior':l.vertical.underground.active?'underground':'exterior',id:domain?.spec.id}},
      safePoint:{position:g.health.safe.position.toArray(),district:g.health.safe.district},discoveries:[...l.vertical.discoveries.visited],landmarksVisited:[...l.vertical.discoveries.visited].filter(id=>['tower','cathedral','municipal'].includes(id)),
      completedMissions:[...this.completedMissions],completedCrimes:[...this.completedCrimes],settings:this.options.capture(),
      activeMission:mission&&event?{kind:'foot',siteId:event.site.id,type:mission.type,progress:mission.progress,elapsed:mission.elapsed,disabled:g.enemies.enemies.filter(e=>e.eventId===event.id&&e.state==='DISABLED').length}:null,
      activeVehicleMission:drive?{kind:'vehicle',type:drive.type,progress:drive.progress,remaining:drive.remaining,serial:g.vehicleMissions.serial,distance:g.vehicleMissions.agent.distance}:null,
      vehicle:{position:v.vehicle.position.toArray(),rotation:v.vehicle.rotation,integrity:v.vehicle.integrity,boost:v.vehicle.boost,camera:v.camera.index},garage:{id:v.garages[0].id}});
  }
  validPosition(position,domain=null) {
    const world=this.living.city.collisionWorld;this.living.city.streaming?.ensureAt(position);
    const feet=position.clone();feet.y-=1.75;
    const floor=floorBelow(world,position,domain);
    return Number.isFinite(floor)&&capsuleClear(world,feet,1.9,.42,domain)&&feet.y>=floor-.2&&(!domain||feet.y-floor<2);
  }
  reset(mode='EXPLORATION') {
    const l=this.living,g=l.gameplay;g.respawn(new Vector3(0,1.75,54));g.crimes.setEnabled(false);g.setMode(mode);
    g.health.save(new Vector3(0,1.75,54),'Docks');g.health.hurt=0;g.health.timer=0;
    l.vertical.discoveries.visited.clear();this.completedMissions.clear();this.completedCrimes.clear();
    const v=g.vehicles.vehicle,garage=g.vehicles.garages[0];v.position.copy(garage.position);v.rotation=garage.rotation;v.integrity=100;v.boost=100;v.speed=0;v.velocity.set(0,0,0);v.vy=0;v.state='PARKED';v.active=true;
    l.camera.lookAt(11,12,-65);l.city.streaming?.ensureAt(l.camera.position);
  }
  restore(raw) {
    const s=normalizeSave(raw);if(!s)return false;
    const l=this.living,g=l.gameplay,v=g.vehicles;this.reset(s.mode);this.options.apply(s.settings);
    this.completedMissions=new Set(s.completedMissions);this.completedCrimes=new Set(s.completedCrimes);
    const known=new Set(l.vertical.discoveries.points.map(p=>p.id));l.vertical.discoveries.visited=new Set([...s.discoveries,...s.landmarksVisited].filter(id=>known.has(id)));
    const safe=new Vector3().fromArray(s.safePoint.position);if(!this.validPosition(safe))safe.set(0,1.75,54);
    g.health.save(safe,l.city.districtAt(safe.x,safe.z).name);g.health.hp=s.player.health>0?s.player.health:100;
    const vehicle=v.vehicle;vehicle.position.fromArray(s.vehicle.position);vehicle.rotation=s.vehicle.rotation;l.city.streaming?.ensureAt(vehicle.position);
    v.physics.prepare(vehicle.position);
    const ground=l.city.groundHeight(vehicle.position.x,vehicle.position.z);
    if(v.physics.blocked(vehicle,vehicle.position,vehicle.rotation)||Math.abs(vehicle.position.y-ground)>.7){vehicle.position.copy(v.garages[0].position);vehicle.rotation=v.garages[0].rotation;}
    else vehicle.position.y=ground;
    vehicle.integrity=s.vehicle.integrity;vehicle.boost=s.vehicle.boost;vehicle.state=vehicle.integrity?'PARKED':'DISABLED';vehicle.grounded=true;v.camera.index=s.vehicle.camera;
    if(s.player.domain.kind==='interior')l.vertical.interiors.enter(s.player.domain.id);
    else if(s.player.domain.kind==='underground')l.vertical.underground.enter();
    const pos=new Vector3().fromArray(s.player.position),domain=l.city.collisionWorld.domain;
    if(s.player.health<=0||!this.validPosition(pos,domain)){if(l.vertical.interiors.active)l.vertical.interiors.exit();if(l.vertical.underground.active)l.vertical.underground.exit();pos.copy(safe);}
    this.player.physics.teleport(pos);l.camera.rotation.set(...s.player.rotation,'YXZ');
    if(s.player.driving){const side=v.exitPosition();if(side){this.player.physics.teleport(side);this.player.physics.grounded=true;v.enter();}}
    if(s.mode==='VIGILANTE')this.restoreMission(s);
    this.player.resetInput();return true;
  }
  restoreMission(s) {
    const g=this.living.gameplay,m=s.activeMission,site=g.crimes.sites.find(site=>site.id===m?.siteId);
    if(site&&m?.kind==='foot'){
      this.living.city.streaming.ensureAt(site.position);
      const event={id:`crime-${++g.crimes.serial}`,site,type:site.type,position:site.position.clone(),started:g.crimes.time,resolvedAt:null};
      g.crimes.events=[event];g.missions.clear();g.missions.sync([event]);const mission=g.missions.missions[0];
      if(mission?.type===m.type){g.missions.activate(mission.id);mission.progress=m.progress;mission.elapsed=m.elapsed;g.enemies.sync([event],GAMEPLAY_BUDGETS[this.living.performance.level]);g.enemies.enemies.slice(0,m.disabled).forEach(e=>{e.state='DISABLED';});}
    }
    const d=s.activeVehicleMission;
    if(d?.kind==='vehicle'&&DRIVING_OBJECTIVES.includes(d.type)&&g.vehicles.driving){g.vehicleMissions.serial=d.serial-1;if(g.vehicleMissions.startNext(d.type)){Object.assign(g.vehicleMissions.active,{progress:d.progress,remaining:d.remaining});g.vehicleMissions.agent.distance=d.distance;}}
    g.missions.completed=this.completedMissions.size;
  }
}
