import { Ray, Vector3 } from 'three';
export const ENABLE_GRAPPLE=false;
export function selectGrapplePoint(origin,direction,points,maxDistance=45) {
  const ray=new Ray(origin,direction); let best=null, distance=maxDistance;
  for(const point of points) {
    if(!point.compatible || point.position.y<=origin.y+2) continue;
    const d=origin.distanceTo(point.position);
    if(d<distance && ray.distanceSqToPoint(point.position)<1.4**2 && point.position.clone().sub(origin).dot(direction)>0) {best=point;distance=d;}
  }
  return best;
}
export class GrappleSystem {
  constructor(camera,physics,points,enabled=ENABLE_GRAPPLE) { Object.assign(this,{camera,physics,points,enabled}); this.target=null;this.active=false;this.direction=new Vector3(); }
  update(dt) {
    if(!this.enabled) return;
    this.camera.getWorldDirection(this.direction); this.target=selectGrapplePoint(this.camera.position,this.direction,this.points);
    if(!this.active) return;
    const p=this.camera.position, next=p.clone().lerp(this.destination,1-Math.exp(-3*dt));
    // Swept steps never tunnel through a facade while pulling.
    const n=Math.max(1,Math.ceil(p.distanceTo(next)/.12)), step=next.clone().sub(p).divideScalar(n);
    for(let i=0;i<n;i++) {
      const candidate=p.clone().add(step), feet=candidate.clone(); feet.y-=this.physics.height;
      this.physics.world.prepare(feet,this.physics.height+.15);
      if(this.physics.world.hits(feet.x,feet.y,feet.z,this.physics.height+.15).length) {this.active=false;break;}
      p.copy(candidate);
    }
    if(p.distanceTo(this.destination)<.15) this.active=false;
    this.physics.vy=0; this.physics.state='grappling';
  }
  use() { if(this.enabled && this.target) {this.destination=this.target.position.clone();this.active=true;} }
}
