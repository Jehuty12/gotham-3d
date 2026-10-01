import { Color } from 'three';
import { deriveSeed, seededRandom } from '../utils/procedural.js';
import { DISTRICT_ART } from '../art/ArtDirection.js';

export function streetPropLayout(chunk) {
  const random=seededRandom(deriveSeed(chunk.seed,'street-props')),types=DISTRICT_ART[chunk.district.id].props,result=[];
  for(let i=0;i<12;i++){
    const edge=chunk.platformSize/2-.8,side=i%2?1:-1;
    // The north/south sidewalk edge leaves alleys, intersections and doors clear.
    const x=chunk.x-14+Math.floor(i/2)*5.4,z=chunk.z+side*edge;
    if(chunk.waterfront&&x>chunk.x+1)continue;
    if(chunk.colliders.some(b=>x>b.minX-.7&&x<b.maxX+.7&&z>b.minZ-.7&&z<b.maxZ+.7))continue;
    result.push({x,z,type:types[Math.floor(random()*types.length)],tint:.8+random()*.25,priority:random()});
  }
  return result.sort((a,b)=>a.priority-b.priority);
}
export function addStreetProps(chunk,batch) {
  const props=streetPropLayout(chunk),prefix=[];
  for(const p of props){
    const color=new Color(['pallet','bags'].includes(p.type)?'#514638':'#52656b').multiplyScalar(p.tint);
    const add=(dx,y,dz,w,h,d)=>batch.add(p.x+dx,y+.24,p.z+dz,w,h,d,0,color);
    switch(p.type){
      case 'bench':add(0,.65,0,1.8,.15,.55);add(0,1,-.2,1.8,.6,.1);for(const dx of [-.65,.65])add(dx,.3,0,.12,.6,.45);break;
      case 'barrier':for(const dx of [-.8,.8])add(dx,.55,0,.1,1.1,.15);add(0,.85,0,1.8,.1,.12);break;
      case 'bollard':case 'hydrant':add(0,.5,0,.25,1,.25);add(0,.75,0,p.type==='hydrant'?.55:.3,.15,.3);break;
      case 'shelter':for(const dx of [-1,1])add(dx,1.35,0,.1,2.7,.1);add(0,2.7,0,2.4,.15,1.3);add(0,1,-.2,1.8,.13,.4);break;
      case 'pallet':for(let n=0;n<4;n++)add(0,.12+n*.17,0,1.1,.1,.75);break;
      case 'bags':add(0,.25,0,.45,.5,.5);add(.35,.18,.12,.3,.35,.4);break;
      case 'sign':add(0,1.2,0,.08,2.4,.1);add(0,2.1,0,.75,.45,.1);break;
      default:add(0,p.type==='technical'?1:.55,0,.6,p.type==='technical'?2:1.1,.45);add(0,1.12,0,.68,.08,.5);
    }
    prefix.push(batch.items.length);
  }
  batch.art={kind:'props',band:'NEAR',prefix};chunk.artProps=props;
}
