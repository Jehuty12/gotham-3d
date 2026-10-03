import { Color } from 'three';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { addLabel } from '../art/TechnicalMarks.js';

export class ContentDecor {
  constructor(content){
    this.content=content;const l=content.living,r=l.city.resources;
    this.props=new DynamicInstances(l.scene,r.box,r.materials.metal,128);
    this.ink=new DynamicInstances(l.scene,r.box,r.materials.windows,640);
    this.colors=[new Color('#718a89'),new Color('#967d51'),new Color('#afc9b3')];
    this.elapsed=1;
  }
  update(dt){
    this.elapsed+=dt;if(this.elapsed<.2)return;this.elapsed=0;
    const c=this.content,l=c.living,domain=c.domain,p=l.camera.position;
    this.props.begin();this.ink.begin();let nearest=null,best=18;
    for(const location of c.locations.locations){
      const point=location.domain===domain?location.position:domain==='exterior'?location.outside:null;
      if(!point||!l.city.isLoadedAt(point[0],point[2]))continue;
      const distance=Math.hypot(point[0]-p.x,point[1]-p.y,point[2]-p.z);
      if(distance>Math.min(65,l.performance.profile.art.near))continue;
      const [x,y,z]=point,index=c.locations.locations.indexOf(location),color=this.colors[index%3];
      this.props.add(x-.8,y-1.5,z,.65,.5,.45,0,color);
      this.props.add(x-.8,y-1.12,z,.8,.08,.6,0,color);
      this.ink.add(x-.8,y-1.06,z,.3,.03,.3,0,this.colors[2]);
      // Three compositions: archive boxes, relay cabinets, dismantled equipment.
      if(index%3===0)this.props.add(x+.9,y-1.38,z+.4,.5,.7,.5,0,color);
      if(index%3===1){this.props.add(x+.8,y-1,z+.2,.2,1.45,.2,0,color);this.ink.add(x+.8,y-.25,z+.2,.3,.08,.3,0,this.colors[2]);}
      if(index%3===2)this.props.add(x+1,y-1.6,z+.4,.9,.22,.4,.3,color);
      if(distance<best){best=distance;nearest={location,point};}
    }
    if(nearest){const {location,point:[x,y,z]}=nearest;addLabel(this.ink,location.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().slice(0,18),x,y+.3,z,.07,this.colors[2]);}
    for(const secret of c.catalogue.secrets){if(secret.domain!==domain)continue;const [x,y,z]=secret.position;if(Math.hypot(x-p.x,y-p.y,z-p.z)<12&&l.city.isLoadedAt(x,z))this.props.add(x,y-1.5,z,.25,.35,.35,0,this.colors[1]);}
    this.props.end();this.ink.end();this.props.mesh.visible=this.props.cursor>0;this.ink.mesh.visible=this.ink.cursor>0;
  }
  dispose(){for(const pool of [this.props,this.ink]){pool.mesh.removeFromParent();pool.mesh.dispose();}}
}
