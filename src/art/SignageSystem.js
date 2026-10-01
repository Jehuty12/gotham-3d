import { deriveSeed, seededRandom } from '../utils/procedural.js';

// A deliberately bounded fictional catalogue: 4 names per district reused by
// every chunk. Texture keys never contain building IDs or reload counters.
const ROOTS=Object.freeze({downtown:['VELRUNE','AUREVEX','ORVESS','ELDRAVE'],old:['NACREL','BRUMEVAL','ORMELLE','VESPRIN'],industrial:['FERROVEIL','DRAUVEX','CALDREN','RIVEXEL'],docks:['ESTRAVEL','QUAI VEL','NERVALE','MAREVEX']});
const TYPES=Object.freeze({downtown:['HOTEL','BANQUE','THEATRE','BUREAUX'],old:['TABLE','LIBRAIRIE','HOTEL','THEATRE'],industrial:['ATELIERS','DEPOT','USINES','PARKING'],docks:['ENTREPOT','TRANSIT','CANTINE','HANGAR']});
export function signageIdentity(seed,district,slot=0) {
  const random=seededRandom(deriveSeed(seed,'signage',district,slot)),variant=Math.floor(random()*4);
  return {variant,name:`${ROOTS[district][variant]} ${TYPES[district][variant]}`,category:TYPES[district][variant],phase:random()*100,broken:random()<.22};
}
export function signText(p) {
  if(p.label==='municipal')return 'MAISON DES VEILLES';
  if(p.label==='street')return {downtown:'DISTRICT DES CIMES',old:'VIEIL ORME',industrial:'CEINTURE DES FORGES',docks:'BASSINS DE L’EST'}[p.districtId];
  const n=(p.variant??0)%4;return `${ROOTS[p.districtId][n]} ${TYPES[p.districtId][n]}`;
}
export function paintSign(ctx,p) {
  const old=p.districtId==='old',industrial=['industrial','docks'].includes(p.districtId);
  ctx.fillStyle='#101d27';ctx.fillRect(0,0,512,128);
  ctx.strokeStyle=old?'#e6b783':industrial?'#95c7c6':'#f0d29a';ctx.lineWidth=industrial?4:2;
  ctx.strokeRect(8,8,496,112);ctx.strokeRect(15,15,482,98);
  // Original split-chevron monogram and a short, deliberately unlit tube.
  ctx.beginPath();ctx.moveTo(24,64);ctx.lineTo(34,40);ctx.lineTo(44,64);ctx.lineTo(34,86);ctx.stroke();
  ctx.fillStyle=ctx.strokeStyle;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=p.label==='street'?0:7;
  ctx.font=`${industrial?'600':'500'} ${industrial?30:32}px ${old?'serif':'sans-serif'}`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(signText(p),276,65,420);
  if((p.variant??0)===2&&p.label!=='street'){ctx.shadowBlur=0;ctx.fillStyle='#182832';ctx.fillRect(345,7,28,5);}
}
