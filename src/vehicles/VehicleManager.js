import { Vector3 } from 'three';
import { Vehicle } from './Vehicle.js';
import { VehiclePhysics } from './VehiclePhysics.js';
import { VehicleController } from './VehicleController.js';
import { VehicleCamera } from './VehicleCamera.js';
import { VehicleRenderer } from './VehicleRenderer.js';
import { generateGarages, buildGarages } from './Garage.js';
import { VehicleHUD } from '../ui/VehicleHUD.js';
import { capsuleClear, segmentBlocked } from '../utils/spatialQueries.js';

export class VehicleManager {
  constructor(living, player, {ui=true}={}) {
    this.living=living;this.player=player;this.city=living.city;this.world=this.city.collisionWorld;
    this.garages=generateGarages(this.city);buildGarages(this.city,this.garages);
    this.vehicle=new Vehicle('nightrider-01','NIGHTRIDER',this.garages[0].position,this.garages[0].rotation);
    this.police=Array.from({length:4},(_,i)=>{const v=new Vehicle(`patrol-${i}`,'POLICE');v.active=false;return v;});
    this.target=new Vehicle('mission-target','TARGET');this.target.active=false;
    this.physics=new VehiclePhysics(this.world);this.controller=new VehicleController(player.keys);
    this.camera=new VehicleCamera(living.camera,this.world);this.renderer=new VehicleRenderer(living.scene,this.city);
    this.hud=ui?new VehicleHUD():null;this.driving=false;this.repairing=false;this.time=0;this.updateMs=0;
    this.lastMessage='';this.pointerSpeed=player.controls.pointerSpeed;
  }
  get activeVehicles(){return [this.vehicle,...this.police.filter(v=>v.active),...(this.target.active?[this.target]:[])];}
  get garage(){return this.garages.find(g=>g.position.distanceTo(this.vehicle.position)<g.radius)??null;}
  canEnter() {
    const p=this.player.physics;
    return !this.driving&&!this.world.domain&&!p.motion&&!p.carried&&!p.traversal?.grapple.active&&p.grounded&&Math.abs(this.living.camera.position.y-this.vehicle.position.y)<3&&
      this.living.camera.position.distanceTo(this.vehicle.position)<3.3&&!segmentBlocked(this.world,this.living.camera.position,this.vehicle.position.clone().add(new Vector3(0,1,0)),null);
  }
  enter() {
    if(!this.canEnter())return false;
    const p=this.player.physics;p.traversal?.grapple.cancel(false);if(p.traversal){p.traversal.glide.active=false;p.traversal.grapple.enabled=false;p.traversal.dodgeTime=0;}
    this.driving=true;p.frozen=true;p.velocity.set(0,0,0);p.vy=0;p.mantleOffset=0;
    this.player.resetInput();this.player.controls.pointerSpeed=0;this.camera.initialized=false;
    if(this.vehicle.integrity>0)this.vehicle.state='DRIVING';return true;
  }
  exitPosition() {
    const v=this.vehicle;if(Math.abs(v.speed)>1.2||!v.grounded)return null;
    for(const side of [-1,1]) {
      const p=v.position.clone().add(new Vector3(Math.cos(v.rotation)*side*2.4,0,-Math.sin(v.rotation)*side*2.4));
      p.y=this.city.groundHeight(p.x,p.z);
      if(Math.abs(p.y-v.position.y)>.5||!capsuleClear(this.world,p,1.9,.42,null))continue;
      if(segmentBlocked(this.world,v.position.clone().add(new Vector3(0,1.2,0)),p.clone().add(new Vector3(0,1.2,0)),null))continue;
      if(this.physics.dynamic.size){this.physics.prepare(p);const probe={...v,radius:.42};if(this.physics.blocked(probe,p,v.rotation))continue;}
      p.y+=1.75;return p;
    }
    return null;
  }
  exit(forcePosition=null) {
    if(!this.driving)return false;
    const position=forcePosition??this.exitPosition();
    if(!position){this.lastMessage='Ralentir et dégager un côté pour sortir';this.messageTime=2;return false;}
    this.driving=false;this.repairing=false;this.vehicle.speed=0;this.vehicle.velocity.set(0,0,0);
    if(this.vehicle.integrity>0)this.vehicle.state='PARKED';
    this.player.physics.frozen=false;this.player.physics.height=1.75;this.player.physics.crouching=false;this.player.physics.teleport(position);
    if(this.player.physics.traversal)this.player.physics.traversal.grapple.enabled=this.player.physics.traversal.enabled;
    this.player.controls.pointerSpeed=this.pointerSpeed;this.player.resetInput();this.camera.reset();
    this.living.camera.lookAt(position.clone().add(new Vector3(Math.sin(this.vehicle.rotation),0,Math.cos(this.vehicle.rotation))));return true;
  }
  interact() {
    if(!this.driving)return this.enter();
    if(this.garage&&Math.abs(this.vehicle.speed)<.5&&this.vehicle.integrity<100&&!this.repairing){this.repairing=true;return true;}
    this.exit();return true;
  }
  update(dt) {
    const start=performance.now();this.time+=dt;this.messageTime=Math.max(0,(this.messageTime??0)-dt);
    const running=this.player.controls.isLocked;
    const obstacles=this.living.traffic.cars.slice(0,this.living.traffic.count).filter(c=>c.initialized);
    this.physics.setObstacles([...obstacles,...this.activeVehicles]);
    const input=this.driving&&running?this.controller.read():{throttle:0,steering:0,handbrake:false,boost:false};
    if(this.driving&&!running){this.vehicle.boosting=false;}
    if((running||!this.driving)&&(this.driving||this.vehicle.position.distanceTo(this.living.camera.position)<(this.living.performance.profile.vehicleSimulationDistance??120))) {
      if(this.repairing&&(input.throttle||!this.garage))this.repairing=false;
      this.physics.update(dt,this.vehicle,input,this.living.rain.enabled?this.living.rain.intensity:0);
      if(this.repairing){this.vehicle.repair(dt);if(this.vehicle.integrity===100){this.repairing=false;this.vehicle.state='DRIVING';}}
    }
    if(this.driving)this.camera.update(dt,this.vehicle);
    this.living.traffic.vehicleObstacles=this.activeVehicles;
    this.living.audio.setVehicle?.({driving:this.driving,speed:Math.abs(this.vehicle.speed),throttle:input.throttle,brake:this.vehicle.brakingInput,tires:input.handbrake&&Math.abs(this.vehicle.speed)>3,boost:this.vehicle.boosting,impact:this.vehicle.impact,siren:this.police.some(v=>v.active&&v.position.distanceTo(this.vehicle.position)<95)});
    this.frameMs=performance.now()-start;this.updateMs=this.updateMs*.9+this.frameMs*.1;
  }
  render(game) {
    if(this.hud){
      document.querySelector('#walking-hint').hidden=this.driving||!this.player.controls.isLocked;
      document.querySelector('#reticle').hidden=this.driving||!this.player.controls.isLocked;
    }
    this.renderer.render(this.activeVehicles,this.vehicle,this.living.camera,this.time,!this.world.domain,this.living.performance.profile.vehicleHeadlight??true);
    if(this.player.controls.isLocked) {
      if(this.driving)this.living.vertical.prompt.textContent=this.messageTime>0?this.lastMessage:this.repairing?'RÉPARATION… [E] Sortir':this.garage&&this.vehicle.integrity<100?'[E] Réparer':'[E] Sortir · [V] Caméra · [M] Mission';
      else if(this.canEnter())this.living.vertical.prompt.textContent='[E] Entrer · NIGHTRIDER';
    }
    this.hud?.update(game,this);
  }
  snapshot() {
    const v=this.vehicle;return {driving:this.driving,vehicleSpeed:v.speed,vehicleAcceleration:v.currentAcceleration,vehicleSteering:v.steering,vehicleIntegrity:v.integrity,vehicleBoost:v.boost,currentVehicleId:this.driving?v.id:null,
      vehicleCamera:this.camera.mode,vehicleRotation:v.rotation,vehiclePosition:v.position.toArray(),garagePosition:this.garages[0].position.toArray(),vehicleCollisionTests:this.physics.tests,activeVehicleColliders:this.physics.activeColliders,vehicleUpdateMs:this.updateMs,activeVehicles:this.activeVehicles.length};
  }
  dispose(){this.hud?.dispose();this.player.controls.pointerSpeed=this.pointerSpeed;}
}
