import { Color } from 'three';
import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { DISTRICT_ART, districtWeights } from './ArtDirection.js';

export function facadeProfile(seed,district,x=0,z=0) {
  const random=seededRandom(deriveSeed(seed,'art-facade')),weights=districtWeights(x,z);
  let pick=random(),id=district.id;
  for(const [candidate,weight] of Object.entries(weights)){pick-=weight;if(pick<=0){id=candidate;break;}}
  const art=DISTRICT_ART[id],variant=Math.floor(random()*art.palette.length);
  return {district:id,variant,color:art.palette[variant],roughness:art.roughness,window:art.window,grime:.06+random()*.09};
}

// One instanced detail batch per chunk, not one mesh per window.
export function windowFrame(batch,x,y,z,w,h,d,axis,tint) {
  const color=new Color(tint).multiplyScalar(.58);
  batch.add(x,y,z,axis===0?w+.22:.16,h+.24,axis===0?.16:w+.22,0,color);
}

export function addFacade(building,sections,batches,profile) {
  const {x,z,width,depth,height,seed}=building,random=seededRandom(deriveSeed(seed,'wall-details'));
  const batch=batches.facade,accent=new Color(profile.color).multiplyScalar(1.2),dark=new Color('#26343b');
  for(const s of sections){
    const sx=x+(s.x??0),sz=z+(s.z??0);
    for(const side of [-1,1]) {
      // Cornices project beyond the mass; narrow pilasters catch the moonlight.
      for(let y=s.y+3;y<s.y+s.h;y+=profile.district==='old'?6.4:10.2)
        batch.add(sx,y,sz+side*(s.d/2+.12),s.w+.3,.18,.32,0,accent);
      for(const dx of [-.38,.38]) batch.add(sx+dx*s.w,s.y+s.h/2,sz+side*(s.d/2+.12),.22,s.h,.28,0,accent);
    }
  }
  // Entries stay flush with the existing collision envelope and access doors.
  for(const side of [-1,1]) {
    batch.add(x+side*1.45,1.6,z+depth/2+.18,.2,2.7,.3,0,accent);
    batch.add(x+side*(width/2-.35),height*.42,z-depth/2-.15,.13,height*.78,.18,0,dark);
  }
  batch.add(x,3.05,z+depth/2+.2,3.1,.24,.45,0,accent);
  batch.add(x,1.6,z+depth/2+.06,2.55,2.6,.07,0,dark);
  if(random()<.6){
    const px=x+width*.3;
    batch.add(px,5.3,z+depth/2+.2,1.15,.8,.42,0,accent);
    for(let n=0;n<4;n++)batch.add(px,5.05+n*.15,z+depth/2+.43,.95,.04,.04,0,dark);
    batch.add(px,7.2,z+depth/2+.16,.1,3,.12,0,dark);
  }
  return profile;
}
