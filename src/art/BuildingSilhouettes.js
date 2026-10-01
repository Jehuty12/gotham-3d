import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { DISTRICT_ART } from './ArtDirection.js';

export function buildingSilhouette(seed,district,w,d,h,fallback) {
  const random=seededRandom(deriveSeed(seed,'silhouette'));
  const choices=DISTRICT_ART[district].silhouettes;
  const type=choices[Math.floor(random()*choices.length)];
  const section=(y,sw,sd,sh,x=0,z=0)=>({y,w:sw,d:sd,h:sh,x,z});
  let sections;
  // Wings have a continuous podium: old collision/access contracts remain true.
  // The highest occupied roof is always centered for existing ladders/elevators.
  if(['l','u','courtyard'].includes(type)&&Math.min(w,d)>8){
    sections=[section(0,w,d,h*.22),section(h*.22,w*.3,d,h*.65,-w*.35),section(h*.22,w,d*.3,h*.65,0,-d*.35)];
    if(type!=='l')sections.push(section(h*.22,w*.3,d,h*.65,w*.35));
    if(type==='courtyard')sections.push(section(h*.22,w,d*.22,h*.65,0,d*.39));
    sections.push(section(h*.87,w*.48,d*.48,h*.13));
  } else if(type==='slender')sections=[section(0,w,d,h*.16),section(h*.16,w*.62,d*.62,h*.84)];
  else if(type==='podium')sections=[section(0,w,d,h*.2),section(h*.2,w*.78,d*.78,h*.65),section(h*.85,w*.58,d*.58,h*.15)];
  else if(type==='terraced')sections=Array.from({length:4},(_,i)=>section(h*i/4,w*(1-i*.14),d*(1-i*.14),h/4));
  else if(type==='warehouse')sections=[section(0,w,d,h*.65),section(h*.65,w*.72,d*.84,h*.35)];
  else if(type==='massive')sections=[section(0,w,d,h)];
  else if(type==='gothic')sections=[section(0,w,d,h*.85),section(h*.85,w*.8,d*.8,h*.15)];
  else sections=fallback(w,d,h);
  return {type,sections};
}
