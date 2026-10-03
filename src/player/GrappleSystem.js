import { Ray, Sphere, Vector3 } from 'three';
import { segmentBlocked, sweepPlayer, capsuleClear } from '../utils/spatialQueries.js';
import { releaseMomentum } from './Momentum.js';

// V4 Exploration keeps its default; the Vigilante mode explicitly enables this system.
export const ENABLE_GRAPPLE=false;
export function selectGrapplePoint(origin,direction,points,maxDistance=45) {
  const ray=new Ray(origin,direction),sphere=new Sphere(),hit=new Vector3();
  let best=null,distance=maxDistance;
  for(const point of points) {
    if(!point.compatible || point.position.y<=origin.y+2)continue;
    sphere.set(point.position,point.radius??1.2);
    const d=origin.distanceTo(point.position);
    if(d<=distance && ray.intersectSphere(sphere,hit)) {best=point;distance=d;}
  }
  return best;
}
export class GrappleSystem {
  constructor(camera,physics,points,enabled=ENABLE_GRAPPLE) {
    Object.assign(this,{camera,physics,points,enabled});this.maxDistance=55;
    this.target=null;this.active=false;this.direction=new Vector3();this.velocity=new Vector3();
    this.cooldown=0;this.accumulator=0;this.speed=0;this.state='idle';
  }
  update(dt) {
    if(!this.enabled){this.target=null;return;}
    this.camera.getWorldDirection(this.direction);
    const target=selectGrapplePoint(this.camera.position,this.direction,this.points,this.maxDistance);
    this.target=target && !this.physics.world.domain && !segmentBlocked(this.physics.world,this.camera.position,target.position) ? target : null;
    // The controller owns the fixed clock in-game; standalone use is also deterministic.
    if(!this.physics.traversal){this.accumulator+=Math.min(dt,.2);while(this.accumulator+1e-9>=1/120){this.step(1/120);this.accumulator-=1/120;}}
  }
  use() {
    if(this.active){this.cancel();return true;}
    if(!this.enabled || !this.target || this.cooldown>0 || this.physics.motion || this.physics.carried || this.physics.world.domain)return false;
    if(this.camera.position.distanceTo(this.target.position)>this.maxDistance || segmentBlocked(this.physics.world,this.camera.position,this.target.position))return false;
    // Eye clearance above a roof lip: a line-of-sight ray can be clear while
    // the player's feet still strike the last platform edge on a diagonal pull.
    this.destination=this.target.position.clone();this.destination.y+=.85;this.finalDestination=null;
    const clear=(a,b)=>{const steps=Math.ceil(a.distanceTo(b)/.12);for(let i=1;i<=steps;i++){const feet=a.clone().lerp(b,i/steps);feet.y-=this.physics.height;if(!capsuleClear(this.physics.world,feet,this.physics.height+.15,this.physics.radius))return false;}return true;};
    // If feet would catch a cornice, first lift alongside the facade. Both legs
    // must be clear; every simulation step remains swept against live obstacles.
    if(!clear(this.camera.position,this.destination)){const lift=this.camera.position.clone();lift.y=this.destination.y;if(clear(this.camera.position,lift)&&clear(lift,this.destination)){this.finalDestination=this.destination;this.destination=lift;}}
    this.active=true;this.state='pulling';this.speed=3;
    this.physics.grounded=false;return true;
  }
  step(dt) {
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.active)return;
    const delta=this.destination.clone().sub(this.camera.position),distance=delta.length();
    this.speed=Math.min(24,this.speed+32*dt);
    this.velocity.copy(delta).normalize().multiplyScalar(this.speed);
    if(!sweepPlayer(this.physics,delta.normalize().multiplyScalar(Math.min(distance,this.speed*dt)))){this.cancel(false);this.state='blocked';return;}
    this.physics.vy=0;this.physics.state='grappling';
    if(distance<.25){if(this.finalDestination){this.destination=this.finalDestination;this.finalDestination=null;}else this.cancel();}
  }
  cancel(boost=true) {
    if(this.active)releaseMomentum(this.physics,this.velocity,boost);
    this.active=false;this.cooldown=this.recharge??.18;this.state='idle';
  }
}
