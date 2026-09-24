import { box } from './CollisionWorld.js';

// Alternating flights: 18 cm risers, 30 cm treads, connected end landings.
export class FireEscape {
  constructor({x,z,top,bottom=.24,batches,world}) {
    this.steps=[]; const flights=Math.ceil((top-bottom)/3.24), rise=(top-bottom)/flights;
    Object.assign(this,{x,z,flights,rise,bottom,top});
    const add=(x,y,z,w,h,d,kind='stair')=>{
      batches.trim.add(x,y,z,w,h,d); const b=box(x,y,z,w,h,d,kind); world.add(b); this.steps.push(b);
    };
    for(let f=0;f<flights;f++) {
      const direction=f%2===0?1:-1, lane=z+(f%2)*1.65, count=18;
      for(let i=0;i<count;i++) {
        const px=x+direction*(-2.55+i*.3), py=bottom+f*rise+(i+1)*rise/count;
        add(px,py-.06,lane,.31,.12,1.45);
        // Uprights and handrail segments stay outside the walkable tread.
        if(i%3===0) for(const side of [-1,1]) {
          batches.metal.add(px,py+.5,lane+side*.8,.05,1,.05);
          add(px,py+1,lane+side*.8,.9,.06,.06,'railing');
        }
      }
      // Clearance beyond the handrail lets a 42 cm capsule turn into the next flight.
      add(x+direction*3.4,bottom+(f+1)*rise-.08,z+.825,1.6,.16,3.2,'landing');
    }
    const endDirection=(flights-1)%2===0?1:-1;
    this.exit={x:x+endDirection*3.65,z:z+.825,y:top};
  }
}
