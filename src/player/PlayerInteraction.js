import { Raycaster, Vector2, Box3, Vector3 } from 'three';

export class PlayerInteraction {
  constructor(camera,world) { this.camera=camera; this.world=world; this.targets=[]; this.raycaster=new Raycaster(); this.box=new Box3(); this.hit=new Vector3(); this.current=null; this.context='exterior'; }
  register(target) { this.targets.push(target); return target; }
  removeOwner(owner) { this.targets=this.targets.filter(t=>t.owner!==owner); }
  update() {
    this.camera.updateMatrixWorld(); this.raycaster.setFromCamera(new Vector2(),this.camera);
    let nearest=2.8; this.current=null;
    for(const target of this.targets) {
      if((target.context ?? 'exterior')!==this.context || target.enabled?.()===false) continue;
      const b=target.bounds; this.box.min.set(b.minX,b.minY,b.minZ); this.box.max.set(b.maxX,b.maxY,b.maxZ);
      if(!this.raycaster.ray.intersectBox(this.box,this.hit)) continue;
      const distance=this.hit.distanceTo(this.camera.position); if(distance>nearest) continue;
      let blocked=false;
      for(const solid of this.world.local) {
        if(solid===target.collider || solid.enabled===false) continue;
        this.box.min.set(solid.minX,solid.minY,solid.minZ); this.box.max.set(solid.maxX,solid.maxY,solid.maxZ);
        if(this.raycaster.ray.intersectBox(this.box,this.hit) && this.hit.distanceTo(this.camera.position)<distance-.08) { blocked=true; break; }
      }
      if(!blocked) { nearest=distance; this.current=target; }
    }
    return this.current;
  }
  use() { return this.update()?.use(); }
  get prompt() { return this.current ? `[E] ${typeof this.current.label==='function'?this.current.label():this.current.label}` : ''; }
}
