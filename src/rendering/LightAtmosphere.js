import { AdditiveBlending, ConeGeometry, MeshBasicMaterial, PlaneGeometry } from 'three';
import { DynamicInstances, softParticleTexture } from '../utils/DynamicInstances.js';

// Fixed local pools; no real lights and no full-city transparency. Cones have a
// soft height fade; reflections are intentionally abstract, not scene captures.
export class LightAtmosphere {
  constructor(living){
    this.living=living;
    this.cone=new ConeGeometry(1,1,8,1,true);this.plane=new PlaneGeometry(1,1).rotateX(-Math.PI/2);
    this.texture=softParticleTexture();
    this.material=new MeshBasicMaterial({color:'#a4c9d6',transparent:true,opacity:.045,depthWrite:false,blending:AdditiveBlending});
    this.material.onBeforeCompile=s=>{s.vertexShader='varying float coneHeight;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n coneHeight=position.y+.5;');s.fragmentShader='varying float coneHeight;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=sin(clamp(coneHeight,0.,1.)*3.14159);');};
    this.reflectMaterial=new MeshBasicMaterial({map:this.texture,color:'#b8c6b0',transparent:true,opacity:.16,depthWrite:false,blending:AdditiveBlending});
    this.cones=new DynamicInstances(living.scene,this.cone,this.material,16);
    this.reflections=new DynamicInstances(living.scene,this.plane,this.reflectMaterial,24);
    this.headGeometry=new ConeGeometry(1,1,8,1,true).rotateX(-Math.PI/2);
    this.headlights=new DynamicInstances(living.scene,this.headGeometry,this.reflectMaterial,8);
    this.stationSources=living.rail.stations.map(s=>({x:s.x,y:13.5,z:s.z+3}));
    this.elapsed=1;
  }
  update(dt){
    const l=this.living,p=l.camera.position,b=l.performance.profile.art,indoor=!!l.city.collisionWorld.domain;
    this.headlights.begin();
    if(!indoor)for(const car of l.traffic.cars.slice(0,l.traffic.count)){
      if(this.headlights.cursor>=Math.min(8,b.cones))break;
      if(!car.initialized||car.position.distanceTo(p)>40||!l.city.isLoadedAt(car.position.x,car.position.z))continue;
      this.headlights.add(car.position.x+Math.sin(car.yaw)*5,.6,car.position.z+Math.cos(car.yaw)*5,1.4,.35,6,car.yaw);
    }
    this.headlights.end();
    this.elapsed+=dt;if(this.elapsed<.2)return;this.elapsed=0;
    this.cones.begin();this.reflections.begin();
    const sources=indoor?(l.vertical.underground.active?[{x:-64,y:-4,z:64},{x:-64,y:-4,z:85}]:[]):[...this.stationSources,...l.city.lampPositions];
    for(const s of sources){if(this.cones.cursor>=b.cones)break;if(Math.hypot(s.x-p.x,s.z-p.z)>38||!indoor&&!l.city.isLoadedAt(s.x,s.z))continue;
      this.cones.add(s.x,s.y-2.5,s.z,1.6,5,1.6,0);
      this.reflections.add(s.x,indoor?-7.94:l.city.groundHeight(s.x,s.z)+.025,s.z,1.8,1,5,0);
    }
    if(!indoor)for(const car of l.traffic.cars.slice(0,l.traffic.count)){
      if(this.reflections.cursor>=24)break;
      if(!car.initialized||car.position.distanceTo(p)>40||!l.city.isLoadedAt(car.position.x,car.position.z))continue;
      this.reflections.add(car.position.x+Math.sin(car.yaw)*4,.034,car.position.z+Math.cos(car.yaw)*4,2,1,6,car.yaw);
    }
    this.cones.end();this.reflections.end();
    this.material.opacity=.025+(l.rain.enabled?l.rain.intensity:0)*.025;
    this.reflectMaterial.opacity=(l.runtime?.weather.wet??0)*.19;
  }
  dispose(){for(const p of [this.cones,this.reflections,this.headlights]){p.mesh.dispose();p.mesh.removeFromParent();}this.cone.dispose();this.headGeometry.dispose();this.plane.dispose();this.material.dispose();this.reflectMaterial.dispose();this.texture.dispose();}
}
