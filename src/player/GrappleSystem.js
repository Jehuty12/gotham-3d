import { Ray, Sphere, Vector3 } from 'three';
import { segmentBlocked, sweepPlayer } from '../utils/spatialQueries.js';
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
    this.destination=this.target.position.clone();this.active=true;this.state='pulling';this.speed=3;
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
    if(distance<.25)this.cancel();
  }
  cancel(boost=true) {
    if(this.active)releaseMomentum(this.physics,this.velocity,boost);
    this.active=false;this.cooldown=.18;this.state='idle';
  }
}
