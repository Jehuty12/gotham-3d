import { deriveSeed, seededRandom } from '../utils/procedural.js';

export function selectAccessibleRoofs(city) {
  const ranked=city.buildings.filter(b=>b.landmark!=='cathedral').slice().sort((a,b)=>deriveSeed(city.seed,'access',a.x,a.z)-deriveSeed(city.seed,'access',b.x,b.z));
  const required=ranked.filter(b=>b.landmark);
  return [...required,...ranked.filter(b=>!b.landmark)].slice(0,Math.round(city.buildings.length*.25));
}
export function generateInteriors(city,roofs=selectAccessibleRoofs(city)) {
  const selected=roofs.filter(b=>b.landmark);
  for(const district of ['old','downtown','industrial','docks']) {
    const choices=roofs.filter(b=>b.districtId===district && !b.landmark).sort((a,b)=>deriveSeed(city.seed,'interior',a.x,a.z)-deriveSeed(city.seed,'interior',b.x,b.z));
    selected.push(...choices.slice(0,district==='old'||district==='industrial'?2:1));
  }
  return selected.slice(0,8).map((b,i)=>{
    const random=seededRandom(deriveSeed(city.seed,'room',b.x,b.z));
    return {id:`interior-${i}`,building:b,type:b.landmark==='municipal'?'municipal':b.landmark==='tower'?'lobby':b.districtId==='old'?(i%2?'shop':'lobby'):b.districtId==='downtown'?'metro':b.districtId==='industrial'?(i%2?'industrial':'warehouse'):'warehouse',width:Math.min(15,b.width-1.5),depth:Math.min(16,b.depth-1.5),color:random()>.5?'#576d69':'#777366',roofY:b.landmark==='municipal'?22.2:(b.roofY??b.height)+.2,entrance:{x:b.x,y:.24,z:b.maxZ+.95}};
  });
}
