import { Group, Color, Vector3 } from 'three';
import { box } from '../world/CollisionWorld.js';
import { Door } from '../world/Door.js';
import { Elevator } from '../world/Elevator.js';

export class Interior {
  constructor(spec,resources,interaction,physics,onExit,onRoof) {
    this.spec=spec; this.group=new Group();this.group.name=spec.id;this.colliders=[];this.doors=[];
    const {building:b,width:w,depth:d}=spec, x=b.x,z=b.z,y=.24;
    const batches=resources.batches(), color=new Color(spec.color);
    const solid=(px,py,pz,sw,sh,sd,mat='stone')=>{batches[mat].add(px,py,pz,sw,sh,sd,0,color);this.colliders.push(box(px,py,pz,sw,sh,sd,'interior'));};
    solid(x,y-.12,z,w,.24,d); solid(x,7.8,z,w,.2,d);
    for(const side of [-1,1]) {solid(x+side*w/2,4,z,.2,7.8,d);solid(x,4,z+side*d/2,w,7.8,.2);}
    // Mezzanine leaves both the stairwell and cabin shaft clear.
    solid(x-.1,3.74,z,Math.max(1,w-5.5),.2,d);
    for(let i=0;i<20;i++) solid(x-w/2+1, y+(i+1)*.18-.06,z+d/2-1-i*.3,1.5,.12,.31,'trim');
    solid(x-w/2+1,3.74,z+d/2-7,2,.2,2);
    solid(x-w/2+2,3.74,z+d/2-7,2,.2,2);
    // Procedural fittings vary by use without importing assets.
    for(let i=0;i<3;i++) {
      const px=x+(i-1)*Math.max(1,(w-5)/3), pz=z-d/2+1;
      solid(px,1,pz,.9,1.5,.7,spec.type==='warehouse'?'metal':'trim');
      batches.windows.add(px,2.1,pz,.6,.1,.05,0,new Color('#9bd9c7'));
    }
    for(const floor of [0,3.6]) batches.windows.add(x,3.4+floor,z,Math.max(2,w-3),.05,.3,0,new Color('#b0d4bd'));
    for(const batch of Object.values(batches)) batch.build(this.group);
    const door=new Door({x,y,z:z+d/2-.3,resources,parent:this.group,onEnter:onExit});
    this.doors.push(door);this.colliders.push(door.collider);interaction.register(door.target(this,spec.id));
    this.spawn=new Vector3(x,y+1.75,z+d/2-2);
    this.elevator=new Elevator({x:x+w/2-1.6,z:z+d/2-3.5,floors:[y,3.84,spec.roofY],resources,parent:this.group,onRoof});
    this.colliders.push(this.elevator.collider,...this.elevator.walls);
    const call=floor=>{
      const e=this.elevator;
      if(e.state!=='open')return;
      if(e.floor!==floor) {e.select(floor);return;}
      this.panel=true;physics.teleport(new Vector3(e.x,e.y+physics.height,e.z));
    };
    interaction.register({owner:this,context:spec.id,bounds:box(this.elevator.x-.95,1.65,this.elevator.z+1.25,.35,.6,.3),label:'Appeler / utiliser l’ascenseur',use:()=>call(0)});
    // A return control on the mezzanine calls the same cabin, no second simulation.
    interaction.register({owner:this,context:spec.id,bounds:box(this.elevator.x-.95,5.25,this.elevator.z+1.25,.35,.6,.3),label:'Appeler / utiliser l’ascenseur',use:()=>call(1)});
    for(const level of [1.65,5.25]) {
      batches.trim.add(this.elevator.x-.95,level,this.elevator.z+1.25,.35,.6,.12);
      batches.windows.add(this.elevator.x-.95,level,this.elevator.z+1.33,.1,.1,.03,0,new Color('#94dec0'));
    }
    batches.trim.build(this.group);batches.windows.build(this.group);
    this.panel=false;
  }
  update(dt,physics) {
    for(const door of this.doors)door.update(dt,physics.camera.position);
    this.elevator.update(dt,physics.camera.position,physics);
    this.panel=this.elevator.contains(physics.camera.position);
  }
  dispose(interaction) {interaction.removeOwner(this);this.group.removeFromParent();this.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
}
