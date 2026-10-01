import { Color, CircleGeometry } from 'three';
import { fogParameters } from './WeatherParameters.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { seededRandom,deriveSeed } from '../utils/procedural.js';

export class WeatherPolish {
  constructor(living) {
    this.living=living;this.wet=0;this.elapsed=1;this.targetColor=new Color();
    const material=living.city.resources.materialManager.standard('wet-puddles',{color:'#3c6574',roughness:.12,metalness:.85,transparent:true,opacity:0,depthWrite:false});
    this.geometry=new CircleGeometry(1,9).rotateX(-Math.PI/2);
    const shape=seededRandom(deriveSeed(living.city.seed,'puddle-shape')),positions=this.geometry.attributes.position;
    for(let i=1;i<positions.count-1;i++){const scale=.75+shape()*.25;positions.setX(i,positions.getX(i)*scale);positions.setZ(i,positions.getZ(i)*scale);}
    positions.setXYZ(positions.count-1,positions.getX(1),0,positions.getZ(1));
    this.puddles=new DynamicInstances(living.scene,this.geometry,material,48);this.sources=[];
    for(const c of living.city.chunks.values()){const random=seededRandom(deriveSeed(living.city.seed,'puddles',c.id));for(let i=0;i<(c.district.id==='docks'||c.district.id==='old'?6:3);i++)this.sources.push({x:c.x-30+random()*2,z:c.z-22+random()*44,w:.65+random()*2.3,d:1+random()*4,yaw:random()*.6,chunk:c.id});}
  }
  dispose(){this.geometry.dispose();this.puddles.mesh.dispose();this.puddles.mesh.removeFromParent();}
  update(dt) {
    const l=this.living,weather=l.rain.enabled?l.rain.intensity:0,p=l.camera.position;
    this.wet+=(weather-this.wet)*(1-Math.exp(-dt*(weather>this.wet?.8:.08)));
    l.city.resources.materials.asphalt.roughness=.72-this.wet*.39;l.city.resources.materials.asphalt.metalness=.2+this.wet*.25;l.city.resources.materials.pavement.roughness=.9-this.wet*.28;
    const base=l.performance.level==='LOW'?.006:l.performance.level==='MEDIUM'?.0042:.0035;
    const fog=fogParameters(p.x,p.y,p.z,weather,base);
    l.scene.fog.density+=(fog.density-l.scene.fog.density)*(1-Math.exp(-dt*.6));l.scene.fog.color.lerp(fog.color,1-Math.exp(-dt*.5));
    l.lights.skySystem?.update(p,l.time,weather);this.puddles.mesh.material.opacity=this.wet*.3;
    this.elapsed+=dt;if(this.elapsed<.4)return;this.elapsed=0;this.puddles.begin();
    for(const s of this.sources){if(this.puddles.cursor>=(l.performance.profile.fakeDetail?48:12))break;if(Math.hypot(s.x-p.x,s.z-p.z)>75||!l.city.isLoadedAt(s.x,s.z))continue;this.puddles.add(s.x,l.city.groundHeight(s.x,s.z)+.018,s.z,s.w,.008,s.d,s.yaw);}
    this.puddles.end();this.puddles.mesh.visible=!l.city.collisionWorld.domain&&this.wet>.02;
  }
}
