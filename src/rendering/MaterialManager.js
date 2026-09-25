import { MeshStandardMaterial, MeshBasicMaterial } from 'three';

export class MaterialManager {
  constructor(){this.materials=new Map();}
  get(key,factory){if(!this.materials.has(key))this.materials.set(key,factory());return this.materials.get(key);}
  standard(key,parameters){return this.get(key,()=>new MeshStandardMaterial(parameters));}
  basic(key,parameters){return this.get(key,()=>new MeshBasicMaterial(parameters));}
  adoptScene(scene){scene.traverse(o=>{for(const m of [o.material].flat())if(m&&!this.materials.has(m.uuid))this.materials.set(m.uuid,m);});}
  dispose(){const textures=new Set();for(const m of new Set(this.materials.values())){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const t of textures)t.dispose();this.materials.clear();}
}
