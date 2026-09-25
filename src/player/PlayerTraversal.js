import { Vector3 } from 'three';
import { GlideSystem } from './GlideSystem.js';
import { clampMomentum } from './Momentum.js';

export class PlayerTraversal {
  constructor(physics,grapple) {
    this.physics=physics;this.grapple=grapple;this.glide=new GlideSystem(physics);this.enabled=false;
    this.dodgeTime=0;this.cooldown=0;this.dodgeDirection=new Vector3();physics.traversal=this;
  }
  configure(enabled) {
    this.enabled=enabled;this.grapple.enabled=enabled;this.glide.enabled=enabled;
    if(!enabled) {this.grapple.cancel(false);this.glide.active=false;this.dodgeTime=0;}
  }
  dodge(wish) {
    if(!this.enabled || this.cooldown>0 || !this.physics.grounded || this.physics.motion || this.physics.carried)return false;
    this.dodgeDirection.copy(wish);
    if(this.dodgeDirection.lengthSq()<.1){this.physics.camera.getWorldDirection(this.dodgeDirection);this.dodgeDirection.y=0;}
    this.dodgeDirection.normalize().multiplyScalar(17);this.dodgeTime=.18;this.cooldown=.85;return true;
  }
  beforeStep(dt,input,wish) {
    this.cooldown=Math.max(0,this.cooldown-dt);this.dodgeTime=Math.max(0,this.dodgeTime-dt);
    if(!this.enabled)return false;
    const pulling=this.grapple.active;this.grapple.step(dt);if(pulling)return true;
    this.glide.step(dt,input.jump,wish);
    if(this.dodgeTime>0)this.physics.velocity.copy(this.dodgeDirection);
    this.physics.vy=clampMomentum(this.physics.velocity,this.physics.vy);
    return false;
  }
  get mode(){return this.grapple.active?'grappling':this.glide.active?'gliding':this.dodgeTime>0?'dodging':this.physics.state;}
}
