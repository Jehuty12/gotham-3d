import { Group, Mesh } from 'three';

// Tiny skyline proxies keep the three navigation references visible beyond residency.
export class LandmarkSilhouettes {
  constructor(city){
    this.city=city;this.group=new Group();city.group.add(this.group);this.items=[];
    for(const landmark of city.landmarks){
      const group=new Group();this.group.add(group);const {x,z,type}=landmark;
      const box=(dx,y,dz,w,h,d)=>{const mesh=new Mesh(city.resources.box,city.resources.materials.stone);mesh.position.set(x+dx,y+h/2,z+dz);mesh.scale.set(w,h,d);group.add(mesh);};
      const spire=(dx,y,dz,r,h)=>{const mesh=new Mesh(city.resources.cone,city.resources.materials.trim);mesh.position.set(x+dx,y+h/2,z+dz);mesh.scale.set(r,h,r);group.add(mesh);};
      if(type==='tower'){box(0,0,0,29,80,29);box(0,80,0,20,45,20);box(0,125,0,12,43,12);spire(0,168,0,5,22);}
      else if(type==='cathedral'){box(0,0,0,18,35,38);for(const side of [-1,1]){box(side*11,0,12,9,68,12);spire(side*11,68,12,6,28);}box(0,35,-5,7,40,7);spire(0,75,-5,5.5,33);}
      else{box(0,0,0,36,22,29);box(0,22,-4,10,54,10);spire(0,76,-4,7,15);}
      this.items.push({group,chunk:city.chunkAt(x,z)});
    }
  }
  update(){for(const {group,chunk} of this.items)group.visible=!chunk.loaded;}
  dispose(){this.group.removeFromParent();this.group.clear();this.items.length=0;}
}
