import { Group, Vector3 } from 'three';
import { Interior } from './Interior.js';
import { Door } from '../world/Door.js';

export class InteriorManager {
  constructor(scene,city,specs,interaction,physics) {
    Object.assign(this,{scene,city,specs,interaction,physics});this.cache=new Map();this.active=null;this.entrances=[];
    for(const spec of specs) {
      const group=new Group();city.chunkAt(spec.entrance.x,spec.entrance.z).group.add(group);
      const door=new Door({...spec.entrance,resources:city.resources,parent:group,onEnter:()=>this.enter(spec.id)});
      this.entrances.push({spec,door});city.collisionWorld.add(door.collider);interaction.register(door.target(this));
    }
  }
  enter(id,atRoof=false) {
    const spec=this.specs.find(s=>s.id===id);if(!spec)return;
    if(!this.cache.has(id)) {
      if(this.cache.size>=2) {const [key,old]=this.cache.entries().next().value;old.dispose(this.interaction);this.cache.delete(key);}
      const interior=new Interior(spec,this.city.resources,this.interaction,this.physics,()=>this.exit(),()=>this.exit(true));
      this.cache.set(id,interior);this.scene.add(interior.group);
    }
    this.active=this.cache.get(id);this.active.group.visible=true;this.city.collisionWorld.domain=this.active;
    this.interaction.context=id;this.physics.teleport(this.active.spawn);
    this.physics.camera.lookAt(spec.building.x,1.8,spec.building.z);
    if(atRoof) {const e=this.active.elevator;e.y=spec.roofY;e.floor=e.target=2;e.state='open';e.doorProgress=1;this.active.panel=true;this.physics.teleport(new Vector3(e.x,e.y+this.physics.height,e.z));}
  }
  exit(roof=false) {
    if(!this.active)return;
    const spec=this.active.spec,b=spec.building;
    this.active.group.visible=false;this.active.panel=false;this.active=null;this.city.collisionWorld.domain=null;this.interaction.context='exterior';this.physics.carried=false;
    // Front roof edge avoids existing HVAC units and water tanks.
    const position=roof?new Vector3(b.x,spec.roofY+this.physics.height+.05,b.z+(b.roofDepth??b.depth)*.5-1.3):new Vector3(spec.entrance.x,spec.entrance.y+this.physics.height,spec.entrance.z+1.6);
    this.physics.teleport(position);
  }
  update(dt) {
    for(const {door} of this.entrances) if(Math.hypot(door.x-this.physics.camera.position.x,door.z-this.physics.camera.position.z)<70)door.update(dt,this.physics.camera.position);
    this.active?.update(dt,this.physics);
    for(const interior of this.cache.values())interior.group.visible=interior===this.active;
  }
  dispose() {for(const interior of this.cache.values())interior.dispose(this.interaction);this.interaction.removeOwner(this);}
}
