import { Color, Vector3 } from 'three';
import { DynamicInstances } from '../utils/DynamicInstances.js';

export class WorldMarkers {
  constructor(scene,city){this.batch=new DynamicInstances(scene,city.resources.box,city.resources.materials.windows,128);this.gold=new Color('#dcae55');this.green=new Color('#66cbbb');}
  update(director) {
    const {camera,missions,crimes,scanner,vertical}=director,p=camera.position;this.batch.begin();
    if(director.mode!=='VIGILANTE'){this.batch.end();return;}
    const add=(position,color,range=110)=>{
      const distance=p.distanceTo(position);if(distance<2||distance>range||this.batch.cursor>=125||!director.city.isLoadedAt(position.x,position.z))return;
      this.batch.add(position.x,position.y,position.z,.14,.8,.14,0,color);
      this.batch.add(position.x,position.y+.3,position.z,.65,.1,.1,0,color);
    };
    if(!vertical.interiors.active&&!vertical.underground.active) {
      for(const event of crimes.events)if(event.resolvedAt===null)add(event.position.clone().add(new Vector3(0,3.3,0)),this.gold);
      const m=missions.active;if(m)add(m.position.clone().add(new Vector3(0,3.7,0)),this.green,140);
      if(scanner.duration>0) {
        for(const t of vertical.interaction.targets)if((t.context??'exterior')==='exterior'){const b=t.bounds;add(new Vector3((b.minX+b.maxX)/2,b.maxY+.25,(b.minZ+b.maxZ)/2),this.green,scanner.range);}
        for(const target of vertical.grapple.points)add(target.position,this.green,scanner.range);
      }
      if(vertical.grapple.target)add(vertical.grapple.target.position,this.green,60);
    }
    this.batch.end();
  }
}
