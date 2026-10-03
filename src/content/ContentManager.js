import { Vector3 } from 'three';
import { LocationRegistry } from './LocationRegistry.js';
import { MissionRegistry } from './MissionRegistry.js';
import { StoryMission } from './StoryMission.js';
import { createCatalogue } from './ContentCatalogue.js';
import { normalizeContent } from './ContentState.js';
import { DialogueSystem } from './DialogueSystem.js';
import { WorldEvents } from './WorldEvents.js';
import { ContentDecor } from './ContentDecor.js';
import { UpgradeManager } from '../gameplay/UpgradeManager.js';
import { ContentUI } from '../ui/ContentUI.js';
import { segmentBlocked } from '../utils/spatialQueries.js';
import { roundedLoop } from '../utils/routes.js';
import { deriveSeed } from '../utils/procedural.js';

const distance=(p,a)=>Math.hypot(p.x-a[0],p.y-a[1],p.z-a[2]);
export function objectiveSatisfied(objective,evidence){
  if(!objective||evidence.domain!==objective.domain)return false;
  if(objective.kind==='vehicle')return evidence.vehicleCompleted===true;
  if(objective.kind==='defeat')return evidence.spawned>=objective.count&&evidence.defeated>=evidence.spawned;
  if(evidence.distance>(objective.radius??6))return false;
  switch(objective.kind){
    case 'reach':return true;
    case 'inspect':return evidence.inspected===true;
    case 'scan':return evidence.scanning&&evidence.progress>=objective.duration;
    case 'observe':return evidence.looking&&evidence.progress>=objective.duration;
    case 'drive':return evidence.driving;
    case 'traverse':return evidence.traversed;
    default:return false;
  }
}

export class ContentManager {
  constructor(living,player,{signal,ui=true}={}){
    Object.assign(this,{living,player});living.content=this;
    this.locations=new LocationRegistry(living.city,living.vertical);
    this.registry=new MissionRegistry(this.locations,living.traffic.network,living.city.seed);
    this.catalogue=createCatalogue(this.locations);this.missions=this.registry.missions.map(d=>new StoryMission(d));
    for(const id of ['theatre','workshop','coldstore']){
      const l=this.locations.get(id),position=new Vector3(...l.outside);position.y-=1.75;
      living.gameplay.crimes.sites.push({id:`site-content-${id}`,type:'occupied-warehouse',position,district:l.district,chunk:living.city.chunkAt(position.x,position.z).id,interiorId:l.interiorId,interiorPosition:new Vector3(...l.outside),approaches:['RUE','TOIT','INTÉRIEUR'],rank:deriveSeed(living.city.seed,id)});
    }
    this.dialogue=new DialogueSystem(living.audio);this.upgrades=new UpgradeManager();this.events=new WorldEvents(this);
    this.direction=new Vector3();this.reset();
    if(ui){this.decor=new ContentDecor(this);this.ui=new ContentUI(this,signal);}
    // A second exit reuses the existing underground domain and transition. It is
    // learned at the maintenance location, never a new tunnel simulation.
    const interaction=living.vertical.interaction;
    interaction?.register?.({owner:this,context:'underground',bounds:{minX:-66,maxX:-62,minY:-8,maxY:-4,minZ:99.5,maxZ:100},enabled:()=>this.locations.get('maintenance').discovered,label:'Raccourci · atelier',use:()=>{living.vertical.underground.exit();this.teleport(this.locations.point('workshop','outside'));}});
  }
  get active(){return this.missions.find(m=>m.state==='ACTIVE')??null;}
  get enabled(){return this.living.gameplay.mode==='VIGILANTE';}
  get discoverEnabled(){return this.enabled||this.living.runtime?.options.settings.explorationContent==='DISCOVERIES_ONLY';}
  get domain(){return this.living.vertical.interiors.active?.spec.id??(this.living.vertical.underground.active?'underground':'exterior');}
  get objective(){return this.active?.objective??null;}
  requestSave(){this.living.runtime?.save.request('content');this.ui?.refresh();}
  reset(){
    this.failure=null;
    this.clearStage();this.events?.clear();this.dialogue.clear();this.completed=new Set();this.foundLore=new Set();this.secrets=new Set();this.safePoints=new Set();
    this.locations.restore();for(const m of this.missions)m.reset();this.upgrades.restore();this.upgrades.apply(this.living);this.unlock();this.pendingFailure=false;this.mode=this.living.gameplay.mode;
  }
  unlock(){for(const m of this.missions)m.unlock(this.completed);}
  start(id,route='STREET',replay=false){
    if(!this.enabled||this.active||this.living.gameplay.health.dead)return false;
    const mission=this.missions.find(m=>m.definition.id===id);if(!mission?.start(route,replay))return false;
    const g=this.living.gameplay;g.missions.clear();g.vehicleMissions?.finish(false);this.clearStage();
    this.dialogue.clear();this.dialogue.say('Radio · Nacre / Iris',mission.definition.briefing,12);this.announce();this.requestSave();return true;
  }
  announce(){if(this.objective)this.dialogue.say('Objectif',this.objective.text,7);}
  clearStage(){
    const g=this.living.gameplay;
    if(this.encounter)for(const enemy of g.enemies.enemies)if(enemy.eventId===this.encounter.id)enemy.active=false;
    if(this.vehicleId&&g.vehicleMissions?.active?.id===this.vehicleId)g.vehicleMissions.finish(false);
    this.encounter=null;this.spawned=0;this.vehicleId=null;this.stageKey=null;this.inspected=false;this.traversed=false;this.away=0;
  }
  advance(){
    const m=this.active;if(!m)return false;const locationId=m.objective?.locationId;
    this.clearStage();m.advance();if(locationId)this.discover(locationId);
    if(m.state==='COMPLETED'){
      const first=!this.completed.has(m.definition.id);this.completed.add(m.definition.id);
      if(first){this.upgrades.earned+=m.definition.rewards.points;for(const id of m.definition.rewards.reveal??[])this.discover(id);if(m.definition.rewards.lore)this.foundLore.add(m.definition.rewards.lore);}
      this.unlock();this.dialogue.say('Radio',m.definition.ending,12);this.living.vertical.notify(`Mission terminée : ${m.definition.title}${first?' · +1 point':''}`);
    }else this.announce();
    this.requestSave();return true;
  }
  discover(id){if(!this.locations.discover(id))return false;const l=this.locations.get(id);if(l.safe)this.safePoints.add(id);this.living.vertical.notify(`Découverte : ${l.name}`);this.requestSave();return true;}
  buyUpgrade(id){if(!this.upgrades.buy(id))return false;this.upgrades.apply(this.living);this.requestSave();return true;}
  teleport(point){
    const l=this.living,g=l.gameplay,v=l.vertical;
    g.vehicles?.exit(new Vector3(...point.position));g.pursuit?.clear();v.grapple.cancel(false);g.traversal.glide.active=false;
    if(v.interiors.active)v.interiors.exit();if(v.underground.active)v.underground.exit();
    l.runtime?.streaming.ensureAt(new Vector3(...point.position));
    if(point.domain==='underground')v.underground.enter();else if(point.domain!=='exterior')v.interiors.enter(point.domain);
    this.player.physics.carried=false;this.player.physics.frozen=false;this.player.physics.teleport(new Vector3(...point.position));
    this.player.resetInput();l.runtime?.transitions.trigger();this.decor&&(this.decor.elapsed=1);
  }
  restart(all=false){
    this.failure=null;
    const m=this.active;if(!m)return false;this.clearStage();m.restart(all);
    const prior=m.index>0?m.objectives[m.index-1]:m.definition.start;
    // Vehicle stages recover at the garage; the player never loses NIGHTRIDER.
    if(['drive','vehicle'].includes(m.objective?.kind)){
      const v=this.living.gameplay.vehicles,garage=v.garages[0];v.exit();v.vehicle.position.copy(garage.position);v.vehicle.rotation=garage.rotation;v.vehicle.integrity=100;v.vehicle.speed=0;v.vehicle.velocity.set(0,0,0);v.vehicle.active=true;v.vehicle.state='PARKED';
      this.teleport(this.locations.point('garage'));
    }else this.teleport(prior);
    const h=this.living.gameplay.health;h.dead=false;h.hp=h.max;h.timer=0;this.pendingFailure=false;
    this.dialogue.clear();this.dialogue.say('Radio',all?'Reprise de la mission. Vos découvertes restent conservées.':'Reprise au dernier checkpoint. Le dossier est en sécurité.');this.announce();this.requestSave();return true;
  }
  fastTravelReason(id){
    if(!this.safePoints.has(id))return 'Découvrez ce refuge avant de voyager.';
    const g=this.living.gameplay;
    if(g.health.dead)return 'Indisponible pendant une mise hors combat.';
    if(!['NONE','LOST'].includes(g.pursuit?.state??'NONE'))return 'Indisponible pendant une poursuite.';
    if(this.active||g.missions.active||g.vehicleMissions?.active)return 'Terminez ou reprenez la mission avant de voyager.';
    if(g.enemies.enemies.some(e=>e.state==='ALERT'&&e.position.distanceTo(this.living.camera.position)<35))return 'Éloignez-vous du combat.';
    return '';
  }
  fastTravel(id){const reason=this.fastTravelReason(id);if(reason){this.dialogue.say('Carte',reason);return false;}this.teleport(this.locations.point(id,'outside'));this.requestSave();return true;}
  fail(reason){if(!this.active)return false;this.restart(false);this.failure={reason};this.ui?.showFailure(reason);return true;}
  abandon(){const m=this.active;if(!m)return false;this.clearStage();m.reset();this.failure=null;this.unlock();this.dialogue.clear();this.requestSave();return true;}
  interact(){
    if(!this.discoverEnabled||this.living.gameplay.health.dead||this.living.gameplay.vehicles?.driving)return false;
    const p=this.living.camera.position,objective=this.enabled?this.objective:null;
    this.living.camera.getWorldDirection(this.direction);
    const reachable=point=>point.domain===this.domain&&distance(p,point.position)<2.8&&!segmentBlocked(this.living.city.collisionWorld,p,new Vector3(...point.position),this.living.city.collisionWorld.domain);
    if(objective?.kind==='inspect'&&reachable(objective)){this.inspected=true;this.dialogue.say(this.locations.get(objective.locationId).name,this.locations.get(objective.locationId).note);return true;}
    for(const [list,found,category] of [[this.catalogue.lore,this.foundLore,'LORE'],[this.catalogue.secrets,this.secrets,'SECRET']]){
      const item=list.find(item=>!found.has(item.id)&&reachable(item));if(!item)continue;
      found.add(item.id);this.discover(item.locationId);this.dialogue.say(category,item.text,12);this.living.vertical.notify(`Découverte : ${item.title}`);this.requestSave();return true;
    }
    return false;
  }
  prepareStage(){
    const m=this.active,o=m?.objective;if(!o||!this.enabled)return;
    const g=this.living.gameplay,p=this.living.camera.position;
    if(o.kind==='defeat'&&!this.encounter&&distance(p,o.position)<85&&this.domain===o.domain){
      const position=new Vector3(...o.position);position.y-=1.75;
      this.encounter={id:`content-${m.definition.id}-${m.index}`,site:{id:`content-${o.locationId}`},position,type:'hostile-group',resolvedAt:null};g.sync(0);
    }
    if(o.kind==='vehicle'&&!this.vehicleId&&g.vehicles.driving&&this.domain==='exterior'){
      g.vehicleMissions.finish(false);
      if(g.vehicleMissions.startNext(o.vehicleType)){
        this.vehicleId=g.vehicleMissions.active.id;
        // A fixed authored rectangle on the docks, or a seeded side-job block.
        if(g.vehicles.target.active){const nodes=o.vehicleLoop;g.vehicleMissions.agent.followLoop(roundedLoop(nodes,7,0));g.vehicleMissions.active.route=nodes;}
        g.vehicleMissions.active.remaining=240;this.dialogue.say('Radio',o.vehicleType==='evade'?'Gardez les rues larges. La patrouille finira par perdre le contact.':'Le convoi roule sur les grandes voies des docks. Restez dans son sillage.');
      }
    }
  }
  update(dt){
    const start=performance.now();
    this.dialogue.update(dt);this.decor?.update(Math.min(dt||.016,.1));this.ui?.update(dt);
    const missionStart=performance.now();this.updateMission(dt);const profiler=this.living.runtime?.profiler;profiler?.record('missionUpdate',performance.now()-missionStart);profiler?.record('contentUpdate',performance.now()-start);
  }
  updateMission(dt){
    if(dt<=0)return;
    const g=this.living.gameplay,p=this.living.camera.position;
    if(this.mode!==g.mode){this.clearStage();this.mode=g.mode;this.upgrades.apply(this.living);}
    if(this.discoverEnabled){for(const l of this.locations.locations)if(!l.discovered&&((l.domain===this.domain&&distance(p,l.position)<8)||(this.domain==='exterior'&&distance(p,l.outside)<6)))this.discover(l.id);}
    this.events.update(dt);
    const m=this.active;if(!m||!this.enabled)return;
    if(g.health.dead){this.pendingFailure=true;return;}
    if(this.pendingFailure){this.fail('Mise hors combat. Le dernier checkpoint a été préparé.');return;}
    if(this.failure)return;
    this.prepareStage();const o=m.objective;if(!o)return;
    const d=distance(p,o.position);m.elapsed+=dt;
    if(this.living.vertical.grapple.active||g.traversal.glide.active)this.traversed=true;
    this.living.camera.getWorldDirection(this.direction);
    const looking=new Vector3(...o.position).sub(p).normalize().dot(this.direction)>.55;
    const scanning=g.scanner.duration>0;
    if(this.domain===o.domain&&d<=o.radius&&((o.kind==='scan'&&scanning)||(o.kind==='observe'&&looking)))m.progress+=dt;
    const enemies=this.encounter?g.enemies.enemies.filter(e=>e.eventId===this.encounter.id):[];
    this.spawned=Math.max(this.spawned,enemies.length);
    const result=g.vehicleMissions?.last;
    if(this.vehicleId&&result?.id===this.vehicleId&&result.state==='FAILED'){this.fail('Trajet interrompu. NIGHTRIDER est récupéré au garage.');return;}
    if(this.vehicleId&&g.vehicles.target.active){this.away=g.vehicles.target.position.distanceTo(g.vehicles.vehicle.position)>180?this.away+dt:0;if(this.away>40){this.fail('Le convoi est perdu de vue.');return;}}
    if(this.encounter){this.away=d>180?this.away+dt:0;if(this.away>90){this.fail('Vous avez quitté la zone de la rencontre.');return;}}
    if(objectiveSatisfied(o,{domain:this.domain,distance:d,inspected:this.inspected,scanning,looking,progress:m.progress,driving:g.vehicles?.driving,traversed:this.traversed,spawned:this.spawned,defeated:enemies.filter(e=>e.state==='DISABLED').length,vehicleCompleted:!!this.vehicleId&&result?.id===this.vehicleId&&result.state==='COMPLETED'}))this.advance();
  }
  capture(){return normalizeContent({missions:Object.fromEntries(this.missions.map(m=>[m.definition.id,m.capture()])),completed:[...this.completed],lore:[...this.foundLore],secrets:[...this.secrets],discoveries:this.locations.locations.filter(l=>l.discovered).map(l=>l.id),upgrades:[...this.upgrades.owned],safePoints:[...this.safePoints]});}
  restore(raw){
    this.reset();const s=normalizeContent(raw),known=(ids,list)=>new Set(ids.filter(id=>list.some(x=>x.id===id)));
    this.completed=known(s.completed,this.registry.missions);this.foundLore=known(s.lore,this.catalogue.lore);this.secrets=known(s.secrets,this.catalogue.secrets);this.locations.restore(s.discoveries);
    this.safePoints=new Set(s.safePoints.filter(id=>this.locations.byId.get(id)?.safe&&this.locations.get(id).discovered));
    let active=false;
    for(const m of this.missions){m.restore(s.missions[m.definition.id]);if(m.state==='ACTIVE'){if(active||!m.definition.prerequisites.every(id=>this.completed.has(id)))m.reset();else active=true;}if(this.completed.has(m.definition.id)&&m.state!=='ACTIVE')m.state='COMPLETED';else if(m.state==='COMPLETED')m.state='LOCKED';}
    this.unlock();this.upgrades.restore(s.upgrades,this.completed.size);this.upgrades.apply(this.living);this.announce();
  }
  mapEntries(){
    const entries=this.locations.locations.filter(l=>l.discovered).map(l=>({id:l.id,name:l.name,position:l.outside,kind:l.safe?'SAFE':l.type}));
    entries.push({id:'garage',name:'Garage NIGHTRIDER',position:this.locations.get('garage').position,kind:'GARAGE'});
    for(const lore of this.catalogue.lore)if(this.foundLore.has(lore.id))entries.push({id:lore.id,name:lore.title,position:lore.position,kind:'LORE'});
    if(this.enabled){for(const m of this.missions)if(m.state==='AVAILABLE')entries.push({id:m.definition.id,name:m.definition.title,position:m.definition.start.position,kind:'MISSION'});if(this.objective)entries.push({id:'objective',name:this.objective.text,position:this.guidancePoint().position,kind:'OBJECTIVE'});}
    return entries;
  }
  guidancePoint(){const o=this.objective;if(!o)return null;if(o.domain===this.domain)return o;if(this.domain==='underground')return {position:[-78,-6.25,71],domain:'underground',entrance:true};const interior=this.living.vertical.interiors.active;if(interior)return {position:interior.spawn.toArray(),domain:this.domain,entrance:true};return {...this.locations.point(o.locationId,'outside'),entrance:true};}
  snapshot(){const m=this.active;return {activeStoryMission:m?.definition.kind==='story'?m.definition.id:null,storyProgress:[...this.completed].filter(id=>id.startsWith('story-')).length,sideMissionsCompleted:[...this.completed].filter(id=>id.startsWith('side-')).length,collectibles:this.foundLore.size,secrets:this.secrets.size,activeWorldEvents:this.events.active?.kind??null,contentObjective:m?.objective?.text??null,contentCheckpoint:m?.checkpoint??0,routeVariant:m?`${m.route}:${m.definition.variant??0}`:null,contentMission:m?.definition.id??null,contentProps:this.decor?.props.cursor??0,upgradePoints:this.upgrades.points};}
  dispose(){this.clearStage();this.events.dispose();this.dialogue.clear();this.decor?.dispose();this.ui?.dispose();this.living.vertical.interaction?.removeOwner?.(this);}
}
