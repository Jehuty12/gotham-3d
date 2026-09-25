export const SAVE_VERSION = 1;
export const SAVE_KEY = 'world-polish:save';
export const DEFAULT_SETTINGS = Object.freeze({quality:'MEDIUM',volume:.22,ambienceVolume:1,effectsVolume:1,cameraMotion:.3,screenShake:.25,fov:72,sensitivity:.65,minimapSize:1,uiScale:1,highContrast:false,mapRotation:false,rainEnabled:true,rainIntensity:1});
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const number=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const bool=(value,fallback)=>typeof value==='boolean'?value:fallback;
const text=(value,fallback='')=>typeof value==='string'&&value.length<=100?value:fallback;
const choice=(value,values,fallback)=>values.includes(value)?value:fallback;
export function vector(value,fallback=[0,1.75,54]) {
  return Array.isArray(value)&&value.length===3&&value.every(n=>typeof n==='number'&&Number.isFinite(n))&&Math.abs(value[0])<=255&&Math.abs(value[2])<=255&&value[1]>=-20&&value[1]<=400 ? [...value] : [...fallback];
}
const ids=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&v.length<=100))].slice(-512):[];
export function normalizeSettings(raw) {
  const s=object(raw),d=DEFAULT_SETTINGS;
  return {quality:choice(s.quality,['LOW','MEDIUM','HIGH','AUTO'],d.quality),volume:number(s.volume,0,1,d.volume),ambienceVolume:number(s.ambienceVolume,0,1,1),effectsVolume:number(s.effectsVolume,0,1,1),
    cameraMotion:number(s.cameraMotion,0,1,d.cameraMotion),screenShake:number(s.screenShake,0,1,d.screenShake),fov:number(s.fov,55,100,d.fov),sensitivity:number(s.sensitivity,.15,2,d.sensitivity),
    minimapSize:number(s.minimapSize,.75,1.5,1),uiScale:number(s.uiScale,.8,1.3,1),highContrast:bool(s.highContrast,false),mapRotation:bool(s.mapRotation,false),rainEnabled:bool(s.rainEnabled,true),rainIntensity:number(s.rainIntensity,0,1,1)};
}
function activeMission(raw) {
  if(!raw)return null;const m=object(raw);
  if(!['foot','vehicle'].includes(m.kind)||!text(m.type))return null;
  return {kind:m.kind,type:text(m.type),siteId:text(m.siteId),progress:number(m.progress,0,240,0),elapsed:number(m.elapsed,0,240,0),remaining:number(m.remaining,0,150,150),serial:Math.round(number(m.serial,1,1000000,1)),distance:number(m.distance,0,2000,0),disabled:Math.round(number(m.disabled,0,6,0))};
}
export function normalizeSave(raw) {
  const s=object(raw);if(s.version!==SAVE_VERSION||s.seed!==1989||!s.player||typeof s.player!=='object'||Array.isArray(s.player))return null;
  const p=object(s.player),v=object(s.vehicle),safe=object(s.safePoint),domain=object(p.domain);
  const checkpoint=vector(safe.position),rotation=Array.isArray(p.rotation)?p.rotation:[];
  return {version:SAVE_VERSION,seed:1989,savedAt:number(s.savedAt,0,9e15,0),mode:choice(s.mode,['EXPLORATION','VIGILANTE'],'EXPLORATION'),
    player:{position:vector(p.position,checkpoint),rotation:[number(rotation[0],-1.5,1.5,0),number(rotation[1],-Math.PI*2,Math.PI*2,0),0],health:number(p.health,0,100,100),driving:bool(p.driving,false),domain:{kind:choice(domain.kind,['exterior','interior','underground'],'exterior'),id:text(domain.id)}},
    safePoint:{position:checkpoint,district:text(safe.district,'Docks'),height:checkpoint[1]},
    discoveries:ids(s.discoveries),landmarksVisited:ids(s.landmarksVisited),completedMissions:ids(s.completedMissions),completedCrimes:ids(s.completedCrimes),
    activeMission:activeMission(s.activeMission),activeVehicleMission:activeMission(s.activeVehicleMission),settings:normalizeSettings(s.settings),
    vehicle:{id:'nightrider-01',position:vector(v.position,[-7,0,32]),rotation:number(v.rotation,-Math.PI*100,Math.PI*100,Math.PI),integrity:number(v.integrity,0,100,100),boost:number(v.boost,0,100,100),camera:Math.round(number(v.camera,0,2,0))},garage:{id:text(object(s.garage).id,'garage-3,4')}};
}
