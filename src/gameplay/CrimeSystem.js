import { Vector3 } from 'three';
import { deriveSeed } from '../utils/procedural.js';
import { capsuleClear } from '../utils/spatialQueries.js';

export const CRIME_TYPES=['assault','burglary','hostile-group','vehicle-theft','rooftop','occupied-warehouse'];
export const GAMEPLAY_BUDGETS=Object.freeze({LOW:{crimes:1,enemies:6,perCrime:3},MEDIUM:{crimes:2,enemies:12,perCrime:4},HIGH:{crimes:3,enemies:20,perCrime:6}});
export function generateCrimeSites(city,vertical) {
  const sites=[];
  for(const chunk of city.chunks.values()) {
    const type=CRIME_TYPES[deriveSeed(city.seed,'crime-type',chunk.id)%6];
    const roof=vertical.roofs.find(b=>city.chunkAt(b.x,b.z)===chunk),interior=vertical.specs.find(s=>city.chunkAt(s.building.x,s.building.z)===chunk);
    let position;
    if(type==='rooftop'&&roof)position=new Vector3(roof.x,(roof.landmark==='municipal'?22.2:(roof.roofY??roof.height)+.2),roof.z+(roof.roofDepth??roof.depth)/2-1.3);
    else {
      const h=chunk.platformSize/2-1.4;
      const candidates=[[chunk.x-h,chunk.z],[chunk.x+h,chunk.z],[chunk.x,chunk.z+h],[chunk.x,chunk.z-h]];
      const first=deriveSeed(city.seed,'crime-place',chunk.id)%4;
      for(let i=0;i<4;i++){
        const [x,z]=candidates[(i+first)%4],p=new Vector3(x,city.groundHeight(x,z),z);
        if(capsuleClear(city.collisionWorld,p,1.9,.5,null)){position=p;break;}
      }
    }
    if(!position)continue;
    const actualType=type==='rooftop'&&!roof?'hostile-group':type;
    sites.push({id:`site-${chunk.id}`,type:actualType,chunk:chunk.id,district:chunk.district.name,position,roof:roof??null,interiorId:interior?.id??null,interiorPosition:interior?new Vector3(interior.entrance.x,interior.entrance.y,interior.entrance.z):null,
      approaches:roof?['RUE','TOIT',...(interior?['INTÉRIEUR']:[])]:['RUE'],rank:deriveSeed(city.seed,'crime-order',chunk.id)});
  }
  return sites.sort((a,b)=>a.rank-b.rank);
}
export class CrimeSystem {
  constructor(sites){this.sites=sites;this.events=[];this.serial=0;this.cursor=0;this.time=0;this.enabled=false;}
  setEnabled(enabled){this.enabled=enabled;if(!enabled){this.events.length=0;this.cursor=0;this.serial=0;this.time=0;}}
  update(dt,player,limit,protectedId=null) {
    if(!this.enabled)return;
    this.time+=dt;
    this.events=this.events.filter(e=>(e.resolvedAt===null||this.time-e.resolvedAt<8)&&(e.id===protectedId||e.position.distanceTo(player)<240));
    while(this.events.length>limit){const i=this.events.findIndex(e=>e.id!==protectedId);if(i<0)break;this.events.splice(i,1);}
    for(let attempts=0;this.events.length<limit&&attempts<this.sites.length;attempts++) {
      const site=this.sites[this.cursor++%this.sites.length],distance=site.position.distanceTo(player);
      if(distance<35||distance>110||this.events.some(e=>e.site.id===site.id))continue;
      this.events.push({id:`crime-${++this.serial}`,site,type:site.type,position:site.position.clone(),started:this.time,resolvedAt:null});
    }
  }
  resolve(id){const event=this.events.find(e=>e.id===id);if(event&&event.resolvedAt===null)event.resolvedAt=this.time;}
}
