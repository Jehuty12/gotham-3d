import { Vector3 } from 'three';
import { PlayerTraversal } from '../player/PlayerTraversal.js';
import { PlayerHealth } from '../player/PlayerHealth.js';
import { CrimeSystem, generateCrimeSites, GAMEPLAY_BUDGETS } from './CrimeSystem.js';
import { MissionManager } from './MissionManager.js';
import { NoiseSystem } from './NoiseSystem.js';
import { CombatSystem } from './CombatSystem.js';
import { ScannerSystem } from './ScannerSystem.js';
import { EnemyManager } from '../ai/EnemyManager.js';
import { WorldMarkers } from './WorldMarkers.js';
import { MissionHUD } from '../ui/MissionHUD.js';
import { segmentBlocked } from '../utils/spatialQueries.js';
import { VehicleManager } from '../vehicles/VehicleManager.js';
import { PursuitSystem } from './PursuitSystem.js';
import { VehicleMissionManager } from './VehicleMissionManager.js';

export class GameDirector {
  constructor(living,player,signal,{ui=true}={}) {
    this.living=living;this.player=player;this.camera=living.camera;this.city=living.city;this.vertical=living.vertical;
    this.vertical.gameplay=this;
    for(const station of living.rail.stations)this.vertical.grapple.points.push({compatible:true,position:new Vector3(station.x-9,12.5,station.z+3.2)});
    if(this.vertical.routes.crane){const c=this.vertical.routes.crane;this.vertical.grapple.points.push({compatible:true,position:new Vector3(c.x,c.y,c.z)});}
    for(const b of this.vertical.roofs)for(const s of (b.sections??[]).slice(0,-1))this.vertical.grapple.points.push({compatible:true,position:new Vector3(b.x,s.y+s.h+2,b.z+s.d/2+1.2)});
    this.traversal=new PlayerTraversal(player.physics,this.vertical.grapple);
    this.vehicles=living.traffic?new VehicleManager(living,player,{ui}):null;
    this.pursuit=this.vehicles?new PursuitSystem(this.vehicles):null;
    this.vehicleMissions=this.vehicles?new VehicleMissionManager(this.vehicles,this.pursuit):null;
    this.health=new PlayerHealth();this.noise=new NoiseSystem();this.scanner=new ScannerSystem();
    this.crimes=new CrimeSystem(generateCrimeSites(this.city,this.vertical));this.missions=new MissionManager();
    this.enemies=new EnemyManager(this.city,living.scene);this.combat=new CombatSystem(this.city.collisionWorld);
    this.markers=new WorldMarkers(living.scene,this.city);this.hud=ui?new MissionHUD():null;
    this.safePoints=[{id:'spawn',position:new Vector3(0,1.75,54),district:'Docks'},...this.vertical.discoveries.points.filter(p=>p.y>0).map(p=>({id:p.id,position:new Vector3(p.x,p.y,p.z),district:this.city.districtAt(p.x,p.z).name}))];
    this.time=0;this.accumulator=0;this.syncTime=0;this.stepNoise=0;this.lastGrounded=false;this.lastVy=0;this.direction=new Vector3();this.inspected=false;this.target=null;
    this.originalAction=player.onAction;
    player.onAction=code=>{if(!this.action(code))this.originalAction?.(code);};
    if(ui) {
      document.querySelector('#game-mode').addEventListener('change',e=>this.setMode(e.target.value),{signal});
      window.addEventListener('mousedown',e=>{if(e.button===0&&player.controls.isLocked&&this.mode==='VIGILANTE'&&!this.health.dead&&!this.vehicles?.driving&&!this.city.collisionWorld.domain){this.camera.getWorldDirection(this.direction);if(this.combat.attack(this.enemies.enemies,this.camera.position,this.direction))this.attackNearPatrol();}},{signal});
    }
    this.setMode('EXPLORATION');
  }
  setMode(mode) {
    if(!['EXPLORATION','VIGILANTE'].includes(mode))throw new RangeError('Unknown game mode');
    this.mode=mode;const enabled=mode==='VIGILANTE';this.traversal.configure(enabled);this.scanner.enabled=enabled;this.scanner.clear();
    this.crimes.setEnabled(enabled);this.missions.clear();this.enemies.clear();this.noise.clear();
    this.health.hp=100;this.health.dead=false;this.player.physics.frozen=Boolean(this.vehicles?.driving);this.target=null;this.syncTime=1;
    this.pursuit?.setEnabled(enabled);
    if(this.vehicleMissions){this.vehicleMissions.enabled=enabled;this.vehicleMissions.clear();}
    if(this.vehicles?.driving)this.vertical.grapple.enabled=false;
    if(enabled)this.sync(0);
  }
  sync(dt) {
    const budget=GAMEPLAY_BUDGETS[this.living.performance.level];
    this.crimes.update(dt,this.camera.position,budget.crimes,this.missions.active?.eventId);
    this.missions.sync(this.crimes.events);this.enemies.sync(this.crimes.events,budget);
  }
  action(code) {
    if(this.health.dead)return true;
    if(this.vehicles?.driving){
      if(code==='KeyE')this.vehicles.interact();
      if(code==='KeyV')this.vehicles.camera.cycle();
      if(code==='KeyM')this.vehicleMissions.startNext();
      return true;
    }
    if(code==='KeyE'&&this.vehicles?.canEnter())return this.vehicles.interact();
    if(code==='Space'&&this.vertical.grapple.active){this.vertical.grapple.cancel();return true;}
    if(this.mode!=='VIGILANTE')return false;
    if(code==='KeyV'){this.scanner.activate();return true;}
    if(code==='KeyM'){const m=this.missions.offer(this.camera.position);if(m)this.missions.activate(m.id);return true;}
    if(code==='AltLeft'||code==='AltRight'){this.traversal.dodge(this.player.wish);return true;}
    if(code==='KeyE') {
      if(this.target&&this.combat.takedown(this.target,this.camera.position))return true;
      if(this.canInspect()){this.inspected=true;return true;}
    }
    return false;
  }
  canInspect() {
    const m=this.missions.active;if(!m||m.type!=='inspect'||this.city.collisionWorld.domain)return false;
    const target=m.position.clone().add(new Vector3(0,1.2,0)),delta=target.clone().sub(this.camera.position);
    return delta.length()<2.8&&delta.normalize().dot(this.direction)>.65&&!segmentBlocked(this.city.collisionWorld,this.camera.position,target,null);
  }
  respawn(position) {
    this.vehicles?.exit(position);this.pursuit?.clear();this.vehicleMissions?.finish(false);
    this.vertical.grapple.cancel(false);this.traversal.glide.active=false;
    if(this.vertical.interiors.active)this.vertical.interiors.exit();if(this.vertical.underground.active)this.vertical.underground.exit();
    this.player.physics.carried=false;this.player.physics.frozen=false;this.player.physics.teleport(position);this.player.resetInput();
    for(const e of this.enemies.enemies)if(e.state!=='DISABLED'){e.state=e.archetype==='patroller'?'PATROL':'IDLE';e.position.copy(e.home);e.seen=0;e.lost=0;}
    this.noise.clear();
  }
  updateNoise(dt) {
    if(this.vehicles?.driving)return;
    const p=this.player.physics,rain=this.living.rain.enabled?this.living.rain.intensity:0;this.stepNoise-=dt;
    if(p.grounded&&p.velocity.length()>1&&this.stepNoise<=0){this.noise.emit(this.camera.position,p.crouching?3:p.velocity.length()>7?14:6,'steps',this.time,rain);this.stepNoise=.4;}
    if(this.lastGrounded&&!p.grounded&&p.vy>2)this.noise.emit(this.camera.position,13,'jump',this.time,rain);
    if(!this.lastGrounded&&p.grounded)this.noise.emit(this.camera.position,this.lastVy<-12?26:8,'landing',this.time,rain);
    this.lastGrounded=p.grounded;this.lastVy=p.vy;this.noise.update(this.time);
  }
  tick(dt) {
    this.time+=dt;this.scanner.update(dt);this.combat.update(dt);this.updateNoise(dt);
    this.syncTime+=dt;if(this.syncTime>=.5){this.sync(this.syncTime);this.syncTime=0;}
    const hidden=Boolean(this.city.collisionWorld.domain)||Boolean(this.vehicles?.driving);
    this.enemies.update(dt,{position:this.camera.position,direction:this.direction,time:this.time,rain:this.living.rain.enabled?this.living.rain.intensity:0,
      noise:this.noise,health:this.health,budget:GAMEPLAY_BUDGETS[this.living.performance.level],hidden,dodging:this.traversal.dodgeTime>0});
    if(this.health.dead&&!this.player.physics.frozen){this.player.physics.frozen=true;const failed=this.missions.finish(false);if(failed)this.crimes.resolve(failed.eventId);}
    this.health.update(dt,p=>this.respawn(p));
    if(this.health.dead)return;
    const tracked=this.vehicles?.driving?this.vehicles.vehicle.position:this.camera.position;
    const vehicleStart=performance.now();
    this.pursuit?.update(dt,tracked,this.living.performance.level,Boolean(this.city.collisionWorld.domain));
    const driveResult=this.vehicleMissions?.update(dt,!this.health.dead);
    this.vehicleTickMs=(this.vehicleTickMs??0)+performance.now()-vehicleStart;
    if(driveResult)this.vertical.notify(driveResult.state==='COMPLETED'?'Trajet accompli':'Trajet interrompu');
    const m=this.missions.active;
    if(m?.type==='observe'&&!m.pursuitTriggered&&this.camera.position.distanceTo(m.position)<18){m.pursuitTriggered=true;this.pursuit?.begin(tracked,this.living.performance.level,'crime');}
    let observing=false;
    if(m?.type==='observe'&&this.camera.position.distanceTo(m.position)<6){const target=m.position.clone().add(new Vector3(0,1,0));observing=target.clone().sub(this.camera.position).normalize().dot(this.direction)>.96&&!segmentBlocked(this.city.collisionWorld,this.camera.position,target,null);}
    const finished=this.missions.update(dt,{position:this.camera.position,observing,inspected:this.inspected,interior:this.vertical.interiors.active?.spec.id,enemies:this.enemies.enemies});this.inspected=false;
    if(finished){this.crimes.resolve(finished.eventId);this.vertical.notify(finished.state==='COMPLETED'?'Objectif accompli':'Objectif interrompu');}
    if(this.player.physics.grounded&&!hidden&&!this.enemies.enemies.some(e=>e.state==='ALERT'&&e.position.distanceTo(this.camera.position)<15)) {
      for(const safe of this.safePoints)if(safe.position.distanceTo(this.camera.position)<3)this.health.save(safe.position,safe.district);
    }
  }
  update(dt) {
    this.vehicleTickMs=0;
    this.camera.getWorldDirection(this.direction);
    if(this.mode==='VIGILANTE'&&this.player.controls.isLocked){this.accumulator+=Math.min(dt,.1);while(this.accumulator+1e-9>=1/30){this.tick(1/30);this.accumulator-=1/30;}}
    this.target=null;
    if(this.mode==='VIGILANTE'&&!this.health.dead&&!this.city.collisionWorld.domain&&!this.vehicles?.driving){
      const candidates=this.enemies.enemies.filter(e=>e.position.clone().add(new Vector3(0,1.2,0)).sub(this.camera.position).normalize().dot(this.direction)>.65);
      this.target=this.combat.takedownTarget(candidates,this.camera.position);
      if(this.player.controls.isLocked){if(this.target)this.vertical.prompt.textContent='[E] Neutraliser';else if(this.canInspect())this.vertical.prompt.textContent='[E] Inspecter';}
    }
    this.enemies.render(this.camera.position,this.scanner,this.crimes.events);
    const visible=this.mode==='VIGILANTE'&&!this.city.collisionWorld.domain;
    this.enemies.bodies.mesh.visible=visible;this.enemies.heads.mesh.visible=visible;
    this.markers.update(this);this.hud?.update(dt,this);
    const renderStart=performance.now();this.vehicles?.render(this);
    this.vehicleCpuMs=(this.vehicleCpuMs??0)*.9+((this.vehicles?.frameMs??0)+this.vehicleTickMs+performance.now()-renderStart)*.1;
  }
  attackNearPatrol(){if(this.living.traffic?.cars.some((c,i)=>i<this.living.traffic.count&&c.initialized&&c.type==='police'&&c.position.distanceTo(this.camera.position)<45))this.pursuit?.begin(this.camera.position,this.living.performance.level,'attack');}
  snapshot() {
    const p=this.player.physics,enemies=this.enemies.enemies;
    return {gameMode:this.mode,activeMission:this.missions.active?.id??null,missionState:this.missions.active?.state??null,availableMissions:this.missions.missions.filter(m=>m.state==='AVAILABLE').length,
      activeCrimes:this.crimes.events.length,health:this.health.hp,movementMode:this.vehicles?.driving?'driving':this.traversal.mode,grappleState:this.vertical.grapple.state,glideState:this.traversal.glide.active,
      velocity:[p.velocity.x,p.vy,p.velocity.z],speed:Math.hypot(p.velocity.x,p.vy,p.velocity.z),totalEnemies:enemies.length,activeAI:this.enemies.activeAI,
      suspicious:enemies.filter(e=>e.state==='SUSPICIOUS').length,alerted:enemies.filter(e=>e.state==='ALERT').length,disabled:enemies.filter(e=>e.state==='DISABLED').length,
      aiUpdateMs:this.enemies.updateMs,raycasts:this.city.collisionWorld.raycasts??0,scanner:this.scanner.duration,completedMissions:this.missions.completed,
      ...this.vehicles?.snapshot(),...this.pursuit?.snapshot(),vehicleMission:this.vehicleMissions?.active?.type??null,vehicleMissionState:this.vehicleMissions?.active?.state??this.vehicleMissions?.last?.state??null,
      vehicleUpdateMs:this.vehicleCpuMs??0};
  }
  dispose(){this.vehicles?.dispose();this.hud?.dispose();this.player.onAction=this.originalAction;}
}
