import { Vector3 } from 'three';
import { CollisionWorld, overlaps } from '../world/CollisionWorld.js';

export class PlayerPhysics {
  constructor(camera, world) {
    this.camera=camera; this.world=world; this.height=1.75; this.radius=.42;
    this.velocity=new Vector3(); this.vy=0; this.grounded=false; this.crouching=false;
    this.accumulator=0; this.jumpHeld=false; this.motion=null; this.mantleOffset=0;
    this.feet=new Vector3(); this.state='falling'; this.collisionTests=0;
  }
  static forCity(camera,city) { return new PlayerPhysics(camera,city.collisionWorld ??=new CollisionWorld(city)); }
  teleport(position) {
    this.camera.position.copy(position); this.velocity.set(0,0,0); this.vy=0; this.accumulator=0; this.motion=null; this.grounded=false;this.state='falling';
  }
  follow(points, speed=5, state='climbing', complete=()=>{}) {
    this.motion={ points:points.map(p=>p.clone()), index:0, speed, state, complete }; this.velocity.set(0,0,0); this.vy=0;
  }
  update(delta, wish, { jump=false, crouch=false, mantle=false }={}) {
    this.accumulator+=Math.min(delta,.2); this.collisionTests=0;
    while(this.accumulator+1e-9>=1/120) {
      this.step(1/120,wish,{jump,crouch,mantle}); this.accumulator-=1/120; this.collisionTests+=this.world.tests;
    }
  }
  step(dt,wish,input) {
    const p=this.camera.position;
    if(this.carried) {this.state='climbing';this.vy=0;return;}
    if(this.motion) {
      const m=this.motion, target=m.points[m.index], distance=p.distanceTo(target);
      this.state=m.state; this.grounded=false;
      // Authored ladder/elevator paths are clear; grapple paths additionally use swept collision.
      if(distance<=m.speed*dt) { p.copy(target); if(++m.index===m.points.length) { this.motion=null; m.complete(); } }
      else p.addScaledVector(target.clone().sub(p),m.speed*dt/distance);
      return;
    }
    this.feet.copy(p); this.feet.y-=this.height;
    this.world.prepare(this.feet,this.height+.15);
    const desired=input.crouch ? 1.05 : 1.75;
    if(desired<this.height || !this.world.hits(p.x,this.feet.y,p.z,desired+.15).length) {
      this.height=desired; p.y=this.feet.y+this.height;
    }
    this.crouching=this.height<1.5;
    if(input.jump && !this.jumpHeld && this.grounded && !this.crouching) { this.vy=6.5; this.grounded=false; }
    this.jumpHeld=input.jump;
    this.velocity.lerp(wish,1-Math.exp(-14*dt));
    for(const axis of ['x','z']) {
      const next=this.feet.clone(); next[axis]+=this.velocity[axis]*dt;
      let hits=this.world.hits(next.x,next.y,next.z,this.height+.15);
      if(hits.length && this.grounded) {
        const top=Math.max(...hits.map(b=>b.maxY)), rise=top-next.y;
        const canMantle=input.mantle && !this.crouching && rise>.38 && rise<=1.2;
        if(rise>0 && (rise<=.38 || canMantle) && !this.world.hits(next.x,top,next.z,this.height+.15).length) {
          next.y=top; hits=[]; if(canMantle) this.mantleOffset=-Math.min(.25,rise*.2);
        }
      }
      if(!hits.length) this.feet.copy(next); else this.velocity[axis]=0;
    }
    const before=this.feet.y;
    this.vy-=18*dt; let target=before+this.vy*dt, floor=this.world.ground(this.feet.x,this.feet.z);
    for(const b of this.world.local) {
      this.world.tests++; if(b.enabled===false || !overlaps(b,this.feet.x,this.feet.z,this.radius)) continue;
      if(b.maxY<=before+.001 && b.maxY>floor) floor=b.maxY;
      if(this.vy>0 && before+this.height+.15<=b.minY+.001 && target+this.height+.15>b.minY) { target=b.minY-this.height-.15; this.vy=0; }
    }
    this.grounded=this.vy<=0 && target<=floor+.001;
    if(this.grounded) { target=floor; this.vy=0; }
    this.feet.y=target;
    p.copy(this.feet); p.y+=this.height;
    this.state=this.crouching?'crouching':this.grounded?'grounded':this.vy>0?'jumping':'falling';
    this.mantleOffset*=Math.exp(-12*dt);
  }
}
