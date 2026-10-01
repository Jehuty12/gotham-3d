// V8 internal art guide. Original civic gothic: dark mineral masses, readable
// entrances, restrained luminous accents. No licensed architecture or insignia.
// Small shared material family; color/aging are instance and world-space data.
export const ART_DIRECTION = Object.freeze({
  palette: Object.freeze({ night:'#102330', stone:'#53616a', metal:'#34454f', warm:'#ffd9a0', cold:'#b8dfe4', rust:'#805c48' }),
  lighting: Object.freeze({ moon:1.65, hemisphere:1.15, window:1.65, neon:1.8, bloom:.16, bloomThreshold:1.4 }),
  facadeRules: Object.freeze({ plinth:1.1, minimumEntrance:2.4, detailProjection:.24, maxTextures:40, transitionWidth:128 }),
});
const profile = (palette, roughness, window, silhouettes, fog, signage, props) => Object.freeze({
  palette:Object.freeze(palette), roughness, window:Object.freeze(window), silhouettes:Object.freeze(silhouettes), fog:Object.freeze(fog), signage, props:Object.freeze(props),
});
export const DISTRICT_ART = Object.freeze({
  downtown:profile(['#536773','#626b70','#46565f'],.72,{width:1.25,height:1.9,step:3.4,group:'office'},['podium','slender','terraced','deco'],{density:.85,color:'#192e40'},'brass', ['bench','bollard','shelter','cabinet','bin']),
  old:profile(['#685d57','#514c50','#6b6258'],.91,{width:.75,height:1.6,step:3.2,group:'apartment'},['gothic','l','u','courtyard'],{density:1.12,color:'#292e3b'},'copper', ['bin','bench','hydrant','bags','barrier']),
  industrial:profile(['#5b625b','#646961','#555b60'],.84,{width:1.65,height:1.05,step:4.6,group:'workshop'},['massive','warehouse','l'],{density:1.26,color:'#28362f'},'enamel', ['cabinet','pallet','barrier','technical','bin']),
  docks:profile(['#496775','#556771','#536b6c'],.78,{width:1.8,height:.85,step:4.8,group:'warehouse'},['warehouse','massive'],{density:1.42,color:'#253b49'},'paint', ['pallet','bollard','cabinet','bags','sign']),
});
const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Two-block blending, independent of chunk load order and quality.
export function districtWeights(x,z) {
  const east=smooth((x+64)/128),south=smooth((z+64)/128);
  return {old:(1-east)*(1-south),downtown:east*(1-south),industrial:(1-east)*south,docks:east*south};
}
export function skylineHeight(x,z,district,variation) {
  const center=Math.exp(-((x-70)**2+(z+100)**2)/19000);
  const bases={downtown:58+center*44,old:27,industrial:13,docks:9};
  const weights=districtWeights(x,z);
  const blended=Object.entries(weights).reduce((sum,[id,w])=>sum+bases[id]*w,0);
  // Bound mixing to preserve each district's scale and existing roof traversal.
  const base=bases[district.id]*.82+blended*.18;
  const axis=Math.abs(z+96)<12&&Math.abs(x)<95?.86:1;
  return Math.max(6,(base+variation*district.heightVariation*.6)*axis);
}
export const ART_BUDGETS = Object.freeze({
  LOW:Object.freeze({near:45,mid:100,props:.25,signs:.4,background:0,cones:4,splashes:8}),
  MEDIUM:Object.freeze({near:72,mid:160,props:.6,signs:.7,background:32,cones:10,splashes:20}),
  HIGH:Object.freeze({near:100,mid:230,props:1,signs:1,background:64,cones:16,splashes:32}),
});
export function distanceBand(distance,budget) {return distance<budget.near?'NEAR':distance<budget.mid?'MID':'FAR';}
