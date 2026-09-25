import { Vector3 } from 'three';
import { floorBelow } from '../utils/spatialQueries.js';

export class GlideSystem {
  constructor(physics) {this.physics=physics;this.active=false;this.enabled=false;this.direction=new Vector3();}
  step(dt,held,wish) {
    const p=this.physics,feet=p.camera.position.clone();feet.y-=p.height;
    this.active=Boolean(this.enabled && held && !p.grounded && p.vy<-.5 && !p.motion && !p.carried && !p.world.domain && feet.y-floorBelow(p.world,feet)>3);
    if(!this.active)return false;
    p.camera.getWorldDirection(this.direction);this.direction.y=0;this.direction.normalize();
    if(wish.lengthSq()>.1)this.direction.lerp(wish.clone().normalize(),.25).normalize();
    p.velocity.lerp(this.direction.multiplyScalar(11),1-Math.exp(-1.4*dt));
    p.vy += (-2.8-p.vy)*(1-Math.exp(-5*dt));
    return true;
  }
}
