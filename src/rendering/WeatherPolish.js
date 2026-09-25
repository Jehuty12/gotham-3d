import { Color } from 'three';
import { DynamicInstances } from '../utils/DynamicInstances.js';
import { seededRandom,deriveSeed } from '../utils/procedural.js';

const DISTRICT_WEATHER={downtown:{density:.85,color:'#172c39'},old:{density:1.2,color:'#222b3b'},industrial:{density:1.35,color:'#29342f'},docks:{density:1.45,color:'#213641'}};
export class WeatherPolish {
  constructor(living) {
    this.living=living;this.wet=0;this.elapsed=1;this.targetColor=new Color();
    const material=living.city.resources.materialManager.standard('wet-puddles',{color:'#3c6574',roughness:.12,metalness:.85,transparent:true,opacity:0,depthWrite:false});
    this.puddles=new DynamicInstances(living.scene,living.city.resources.box,material,48);this.sources=[];
    for(const c of living.city.chunks.values()){const random=seededRandom(deriveSeed(living.city.seed,'puddles',c.id));for(let i=0;i<3;i++)this.sources.push({x:c.x-30+random()*2,z:c.z-22+random()*44,w:.8+random()*1.3,d:2+random()*3,chunk:c.id});}
  }
  update(dt) {
    const l=this.living,weather=l.rain.enabled?l.rain.intensity:0,p=l.camera.position;
    this.wet+=(weather-this.wet)*(1-Math.exp(-dt*(weather>this.wet?.8:.08)));
    l.city.resources.materials.asphalt.roughness=.72-this.wet*.39;l.city.resources.materials.asphalt.metalness=.2+this.wet*.25;l.city.resources.materials.pavement.roughness=.9-this.wet*.28;
    const district=DISTRICT_WEATHER[l.city.districtAt(p.x,p.z).id],base=l.performance.level==='LOW'?.006:l.performance.level==='MEDIUM'?.0042:.0035;
    l.scene.fog.density+=(base*district.density*(.9+weather*.15)-l.scene.fog.density)*(1-Math.exp(-dt*.6));this.targetColor.set(district.color);l.scene.fog.color.lerp(this.targetColor,1-Math.exp(-dt*.5));
    l.lights.skySystem?.update(p,l.time,weather);this.puddles.mesh.material.opacity=this.wet*.3;
    this.elapsed+=dt;if(this.elapsed<.4)return;this.elapsed=0;this.puddles.begin();
    for(const s of this.sources){if(this.puddles.cursor>=(l.performance.profile.fakeDetail?48:12))break;if(Math.hypot(s.x-p.x,s.z-p.z)>75||!l.city.isLoadedAt(s.x,s.z))continue;this.puddles.add(s.x,l.city.groundHeight(s.x,s.z)+.018,s.z,s.w,.014,s.d,0);}
    this.puddles.end();this.puddles.mesh.visible=!l.city.collisionWorld.domain&&this.wet>.02;
  }
}
