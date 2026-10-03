import { Vector3 } from 'three';
import { UPGRADES } from '../gameplay/UpgradeManager.js';
import { DISTRICTS } from '../world/districts.js';
import { FR } from '../localization/fr.js';
import { segmentBlocked } from '../utils/spatialQueries.js';

const element=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
export class ContentUI {
  constructor(content,signal){
    this.content=content;this.tab='MISSIONS';this.opened=false;this.elapsed=0;this.projected=new Vector3();
    this.overlay=element('section',null,'content-screen');this.overlay.id='content-screen';this.overlay.hidden=true;this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Carte et journal');
    const header=element('header');header.append(element('h2','LES HEURES EFFACÉES · CARTE & JOURNAL'));
    const close=element('button','REPRENDRE');close.id='content-close';close.addEventListener('click',()=>this.close(true),{signal});header.append(close);
    const nav=element('nav');for(const tab of ['MISSIONS','LORE','DISCOVERIES','UPGRADES']){const b=element('button',tab);b.dataset.contentTab=tab;b.addEventListener('click',()=>{this.tab=tab;this.refresh();},{signal});nav.append(b);}
    this.body=element('div',null,'content-body');this.canvas=element('canvas');this.canvas.width=this.canvas.height=640;this.canvas.setAttribute('aria-label','Quartiers, lieux découverts et missions disponibles');this.list=element('div',null,'content-list');this.body.append(this.canvas,this.list);this.overlay.append(header,nav,this.body);document.body.append(this.overlay);
    this.hud=element('div',null,'content-hud');this.hud.id='content-hud';this.radio=element('div',null,'content-radio');this.radio.id='content-radio';this.radio.setAttribute('role','status');this.marker=element('div',null,'content-marker');this.marker.id='content-marker';document.body.append(this.hud,this.radio,this.marker);
    const actions=document.querySelector('.session-actions');
    this.pauseButtons=element('div');
    for(const [id,label,action] of [['content-map','CARTE / JOURNAL · TAB',()=>this.open()],['restart-checkpoint','RESTART CHECKPOINT',()=>{content.restart(false);}],['restart-mission','RESTART MISSION',()=>{content.restart(true);}]]){const b=element('button',label);b.id=id;b.addEventListener('click',action,{signal});this.pauseButtons.append(b);}actions?.append(this.pauseButtons);
    window.addEventListener('keydown',event=>{
      if(event.code==='Tab'&&!event.repeat&&content.living.runtime.state.started){event.preventDefault();event.stopImmediatePropagation();this.opened?this.close(true):this.open();}
      if(event.code==='Escape'&&this.opened){event.preventDefault();event.stopImmediatePropagation();this.close(false);}
    },{signal,capture:true});
    this.canvas.addEventListener('click',e=>{const r=this.canvas.getBoundingClientRect(),x=(e.clientX-r.left)*640/r.width,z=(e.clientY-r.top)*640/r.height;const entry=this.content.mapEntries().find(p=>Math.hypot((p.position[0]+256)*1.25-x,(p.position[2]+256)*1.25-z)<12);if(entry){this.tab=entry.kind==='SAFE'?'DISCOVERIES':'MISSIONS';this.refresh();this.list.querySelector(`[data-content-id="${entry.id}"]`)?.scrollIntoView({block:'nearest'});}},{signal});
  }
  open(){if(!this.content.living.runtime.state.started)return;this.opened=true;this.content.player.controls.unlock();this.content.living.runtime.state.pause();this.overlay.hidden=false;this.refresh();this.overlay.querySelector('button').focus();}
  showFailure(reason){this.open();this.list.replaceChildren();this.list.append(element('h3',FR.failed),element('p',reason));for(const [label,action] of [[FR.checkpoint,()=>this.content.restart(false)],[FR.restart,()=>this.content.restart(true)],[FR.roam,()=>this.content.abandon()]])this.button(this.list,label,()=>{action();this.close(true);});}
  close(resume=false){this.opened=false;this.overlay.hidden=true;if(resume)this.content.living.runtime.lock();}
  button(parent,label,callback,disabled=false,id){const b=element('button',label);b.disabled=disabled;if(id)b.id=id;b.addEventListener('click',callback);parent.append(b);return b;}
  refresh(){
    if(!this.opened)return;
    const c=this.content;this.list.replaceChildren();
    this.list.append(element('h3',({MISSIONS:'Missions · choisir une approche',LORE:`Archives · ${c.foundLore.size}/20`,DISCOVERIES:`Lieux · ${c.locations.locations.filter(l=>l.discovered).length}/${c.locations.locations.length} · secrets ${c.secrets.size}/10`,UPGRADES:`Améliorations · ${c.upgrades.points} points`})[this.tab]));
    if(this.tab==='MISSIONS'){
      if(!c.enabled)this.list.append(element('p','Les missions sont suspendues en Exploration. Activez VIGILANTE dans les options. DISCOVERIES ONLY permet les archives et découvertes sans combat obligatoire.'));
      for(const m of c.missions){const d=m.definition,card=element('article');card.dataset.contentId=d.id;card.append(element('h4',`${d.title} · ${m.state}`),element('p',`${DISTRICTS[d.district].name} · ${Math.round(c.living.camera.position.distanceTo(new Vector3(...d.start.position)))} m`),element('p',d.description));
        if(m.state==='ACTIVE'){card.append(element('p',m.objective?.text));this.button(card,'Reprendre le checkpoint',()=>{c.restart(false);this.close(true);});this.button(card,'Recommencer la mission',()=>{c.restart(true);this.close(true);});}
        else if(m.state==='AVAILABLE'||m.state==='COMPLETED'&&d.kind==='side'){
          const select=element('select');select.setAttribute('aria-label',`Approche : ${d.title}`);for(const [id,route] of Object.entries(d.routes))select.add(new Option(route.label,id));card.append(select);
          this.button(card,m.state==='COMPLETED'?'Rejouer · sans récompense':'Sélectionner la mission',()=>{if(c.start(d.id,select.value,m.state==='COMPLETED'))this.close(true);},!c.enabled||!!c.active,`start-${d.id}`);
        }else if(m.state==='LOCKED')card.append(element('p','Prérequis : '+d.prerequisites.map(id=>c.registry.get(id).title).join(', ')));
        this.list.append(card);
      }
    }
    if(this.tab==='LORE')for(const item of c.catalogue.lore)if(c.foundLore.has(item.id)){const card=element('article');card.append(element('h4',`${item.type.toUpperCase()} · ${item.title}`),element('p',item.text));this.list.append(card);}
    if(this.tab==='DISCOVERIES'){
      for(const l of c.locations.locations)if(l.discovered){const card=element('article');card.dataset.contentId=l.id;card.append(element('h4',l.name),element('p',`${l.type} · ${l.tags.join(' / ')}`),element('p',l.note));
        if(c.safePoints.has(l.id)){const reason=c.fastTravelReason(l.id);this.button(card,'Voyager vers ce refuge',()=>{if(c.fastTravel(l.id))this.close(true);},!!reason,`travel-${l.id}`);if(reason)card.append(element('p',reason));}this.list.append(card);}
      for(const s of c.catalogue.secrets)if(c.secrets.has(s.id)){const card=element('article');card.append(element('h4','SECRET · '+s.title),element('p',s.text));this.list.append(card);}
    }
    if(this.tab==='UPGRADES')for(const u of UPGRADES){const card=element('article');card.append(element('h4',u.title),element('p',u.description));this.button(card,c.upgrades.owned.has(u.id)?'Acquis':`Débloquer · ${u.cost} point(s)`,()=>c.buyUpgrade(u.id),c.upgrades.owned.has(u.id)||c.upgrades.points<u.cost,`upgrade-${u.id}`);this.list.append(card);}
    this.drawMap();
  }
  drawMap(){
    const started=performance.now();
    const ctx=this.canvas.getContext('2d'),c=this.content;ctx.fillStyle='#0c1920';ctx.fillRect(0,0,640,640);
    for(const chunk of c.living.city.chunks.values()){ctx.fillStyle=chunk.district.mapGround;ctx.fillRect((chunk.x-chunk.platformSize/2+256)*1.25,(chunk.z-chunk.platformSize/2+256)*1.25,chunk.platformSize*1.25,chunk.platformSize*1.25);}
    ctx.font='bold 15px sans-serif';ctx.fillStyle='#9bbdb8';for(const [id,x,z] of [['old',80,45],['downtown',390,45],['industrial',55,595],['docks',450,595]])ctx.fillText(DISTRICTS[id].name,x,z);
    for(const p of c.mapEntries()){ctx.fillStyle=p.kind==='OBJECTIVE'?'#fff3ad':p.kind==='MISSION'?'#e8b768':p.kind==='SAFE'?'#81e8bd':'#9eb5bb';const x=(p.position[0]+256)*1.25,z=(p.position[2]+256)*1.25;ctx.beginPath();if(p.kind==='SAFE')ctx.rect(x-4,z-4,8,8);else if(['MISSION','OBJECTIVE'].includes(p.kind)){ctx.moveTo(x,z-6);ctx.lineTo(x+5,z+4);ctx.lineTo(x-5,z+4);ctx.closePath();}else ctx.arc(x,z,3,0,Math.PI*2);ctx.fill();}
    const p=c.living.camera.position;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc((p.x+256)*1.25,(p.z+256)*1.25,5,0,Math.PI*2);ctx.fill();
    this.content.living.runtime?.profiler?.record('mapUpdate',performance.now()-started);
  }
  update(dt){
    const now=performance.now(),profiler=this.content.living.runtime?.profiler;if(!this.opened)profiler?.record('mapUpdate',0);if(now<(this.nextUpdate??0)){profiler?.record('hudUpdate',0);profiler?.record('markersUpdate',0);return;}this.nextUpdate=now+100;
    const c=this.content,l=c.living,playing=l.runtime?.state.state==='PLAYING';
    const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    this.pauseButtons.querySelector('#restart-checkpoint').disabled=!c.active;this.pauseButtons.querySelector('#restart-mission').disabled=!c.active;
    const accent=c.upgrades.owned.has('amber')?'#edbe72':'#a3e8ce';if(accent!==this.accent){this.accent=accent;for(const el of [this.overlay,this.hud,this.radio,this.marker])el.style.setProperty('--content-accent',accent);}
    this.hud.hidden=!playing;const m=c.enabled?c.active:null;
    let hud=m?`${m.definition.title}\n${m.objective?.text??''}\nCheckpoint ${m.checkpoint+1} · TAB : carte / journal`:'TAB · Carte / journal';
    const line=c.dialogue.current;this.radio.hidden=!line||!playing;if(line)text(this.radio,`${line.speaker} — ${line.text}`);
    const markerStart=performance.now();
    this.marker.hidden=true;
    if(playing&&m&&l.runtime.options.settings.missionGuidance==='FULL'){
      const point=c.guidancePoint();this.projected.fromArray(point.position);const d=this.projected.distanceTo(l.camera.position),altitude=this.projected.y-l.camera.position.y,vertical=altitude>4?FR.above:altitude<-4?FR.below:'';
      const blocked=segmentBlocked(l.city.collisionWorld,l.camera.position,this.projected,l.city.collisionWorld.domain);this.projected.project(l.camera);
      hud+=`\n${point.entrance?FR.entrance+' · ':''}${Math.round(d)} m ${vertical}${blocked?' · suivre les accès':''}`;
      if(!blocked&&this.projected.z<1&&this.projected.z>-1&&Math.abs(this.projected.x)<.95&&Math.abs(this.projected.y)<.85){this.marker.hidden=false;this.marker.style.left=`${(this.projected.x*.5+.5)*100}%`;this.marker.style.top=`${(-this.projected.y*.5+.5)*100}%`;text(this.marker,`◇ ${Math.round(d)} m ${vertical}`);}
    }
    if(playing&&c.discoverEnabled&&!l.gameplay.vehicles.driving){
      const p=l.camera.position,near=[...c.catalogue.lore.filter(x=>!c.foundLore.has(x.id)),...c.catalogue.secrets.filter(x=>!c.secrets.has(x.id))].some(x=>x.domain===c.domain&&p.distanceTo(new Vector3(...x.position))<2.8);
      if(near)hud+='\n[E] Examiner la trace proche';
    }
    const enemies=l.gameplay.enemies.enemies.filter(e=>e.state!=='DISABLED'&&e.position.distanceTo(l.camera.position)<28);
    if(playing&&c.enabled&&enemies.length)hud+='\n'+(enemies.some(e=>e.state==='ALERT')?FR.detected:enemies.some(e=>['SUSPICIOUS','SEARCHING'].includes(e.state))?FR.suspicious:FR.unseen);
    text(this.hud,hud);l.runtime?.profiler?.record('markersUpdate',performance.now()-markerStart);l.runtime?.profiler?.record('hudUpdate',performance.now()-now);
  }
  dispose(){for(const e of [this.overlay,this.hud,this.radio,this.marker,this.pauseButtons])e.remove();}
}
