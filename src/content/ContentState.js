const ids=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x.length<80))].slice(0,64):[];
export function normalizeContent(raw={}){
  const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const missions={};
  for(const [id,m] of Object.entries(r.missions??{}).slice(0,32)){
    if(!/^(story-[1-7]|side-[1-8])$/.test(id)||!m||typeof m!=='object')continue;
    const n=(key,max)=>typeof m[key]==='number'&&Number.isFinite(m[key])?Math.max(0,Math.min(max,Math.floor(m[key]))):0;
    missions[id]={state:['LOCKED','AVAILABLE','ACTIVE','COMPLETED'].includes(m.state)?m.state:'LOCKED',route:['STREET','ROOFTOP','INTERIOR'].includes(m.route)?m.route:'STREET',index:n('index',32),checkpoint:n('checkpoint',32),failures:n('failures',9999),replay:m.replay===true};
  }
  return {missions,completed:ids(r.completed),lore:ids(r.lore),secrets:ids(r.secrets),discoveries:ids(r.discoveries),upgrades:ids(r.upgrades),safePoints:ids(r.safePoints)};
}
