import { Color } from 'three';
import { DISTRICT_ART, districtWeights } from '../art/ArtDirection.js';

export function fogParameters(x,y,z,rain,base=.0035){
  const weights=districtWeights(x,z),color=new Color(0,0,0);let density=0;
  for(const [id,weight] of Object.entries(weights)){const f=DISTRICT_ART[id].fog;color.add(new Color(f.color).multiplyScalar(weight));density+=f.density*weight;}
  const altitude=1-Math.min(.38,Math.max(0,y-15)/350);
  return {density:base*density*(.9+Math.max(0,Math.min(1,rain))*.2)*altitude,color};
}
export function rainVisualParameters(time,driving){return {density:(.94+Math.sin(time*.17)*.06)*(driving?.68:1),opacity:driving?.23:.34,wind:Math.sin(time*.13)*1.6+Math.sin(time*.043)*1.1};}
