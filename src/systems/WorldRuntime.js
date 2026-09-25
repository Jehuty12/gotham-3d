import { SaveManager } from '../save/SaveManager.js';
import { WorldPersistence } from '../save/WorldPersistence.js';
import { OptionsController } from '../ui/OptionsController.js';
import { Transitions } from '../ui/Transitions.js';
import { SessionState } from './SessionState.js';
import { ChunkStreamingManager } from '../world/ChunkStreamingManager.js';
import { WeatherPolish } from '../rendering/WeatherPolish.js';
import { CameraEffects } from '../camera/CameraEffects.js';
import { RuntimeDiagnostics } from './RuntimeDiagnostics.js';
import { LandmarkSilhouettes } from '../rendering/LandmarkSilhouettes.js';

export class WorldRuntime {
  constructor(living,player,signal,showError) {
    Object.assign(this,{living,player,showError});living.runtime=this;this.state=new SessionState();this.transitions=new Transitions();this.cleanups=[];this.listenerCount=0;
    this.options=new OptionsController(living,player,signal);this.persistence=new WorldPersistence(living,player,this.options);
    this.streaming=new ChunkStreamingManager(living.city);this.weather=new WeatherPolish(living);this.camera=new CameraEffects(living.camera);this.diagnostics=new RuntimeDiagnostics(living);
    this.silhouettes=new LandmarkSilhouettes(living.city);
    living.gameplay.crimes.isLoaded=p=>living.city.isLoadedAt(p.x,p.z);living.gameplay.vehicles.camera.effectsManaged=true;
    living.gameplay.crimes.isCompleted=site=>this.persistence.completedCrimes.has(site.id);
    for(const garage of living.gameplay.vehicles.garages)living.vertical.discoveries.points.push({id:garage.id,name:'Garage NIGHTRIDER',x:garage.position.x,y:garage.position.y+1.75,z:garage.position.z,radius:6});
    let storage=null;try{storage=globalThis.localStorage;}catch{/* Restricted/private browser: play without persistence. */}
    this.status=document.createElement('div');this.status.id='save-status';this.status.setAttribute('role','status');document.body.append(this.status);
    this.save=new SaveManager(storage,{capture:()=>this.persistence.capture(),onStatus:text=>{this.status.textContent=text;this.refreshMenu();}});
    this.options.onChange=()=>{if(this.state.started)this.save.request('settings');};
    this.installMenu(signal);this.installHooks();this.refreshMenu();
    this.previousAction=player.onAction;player.onAction=code=>{if(this.state.state==='PLAYING'&&!this.transitions.active)this.previousAction(code);};
  }
  on(target,event,callback,signal){target.addEventListener(event,callback,{signal});this.listenerCount++;}
  installMenu(signal){
    const menu=document.querySelector('#menu'),enter=document.querySelector('#enter');
    enter.textContent='NOUVELLE PARTIE';
    const actions=document.createElement('div');actions.className='session-actions';actions.innerHTML='<button id="continue-game" hidden>CONTINUER</button><button id="new-game">NOUVELLE PARTIE</button><button id="menu-options">OPTIONS</button><button id="save-game" hidden>SAUVEGARDER</button><button id="return-menu" hidden>RETOUR AU MENU</button><div id="new-game-confirm" hidden><p>Remplacer la sauvegarde existante ?</p><button id="confirm-new">Confirmer</button><button id="cancel-new">Annuler</button></div>';
    enter.after(actions);this.actions=actions;
    this.on(enter,'click',()=>this.state.state==='PAUSED'?this.lock():this.newGame(),signal);
    this.on(actions.querySelector('#new-game'),'click',()=>this.newGame(),signal);
    this.on(actions.querySelector('#confirm-new'),'click',()=>this.newGame(true),signal);
    this.on(actions.querySelector('#cancel-new'),'click',()=>{document.querySelector('#new-game-confirm').hidden=true;},signal);
    this.on(actions.querySelector('#continue-game'),'click',()=>{const save=this.save.read();if(save&&this.persistence.restore(save)){this.transitions.trigger();this.lock();}},signal);
    this.on(actions.querySelector('#menu-options'),'click',()=>{document.querySelector('#settings-panel').hidden=false;},signal);
    this.on(actions.querySelector('#save-game'),'click',()=>this.save.write(),signal);
    this.on(actions.querySelector('#return-menu'),'click',()=>{this.save.write();this.state.menu();this.refreshMenu();},signal);
    const lock=()=>{this.state.play();this.resetInputs();menu.hidden=true;document.body.classList.add('playing');document.querySelector('#game-mode').value=this.living.gameplay.mode;document.querySelector('#settings-panel').hidden=true;this.living.audio.setActive(true);};
    const unlock=()=>{this.state.pause();this.resetInputs();menu.hidden=false;document.body.classList.remove('playing');this.living.audio.setActive(false);if(this.state.started)this.save.request('pause');this.refreshMenu();};
    this.player.controls.addEventListener('lock',lock);this.player.controls.addEventListener('unlock',unlock);this.listenerCount+=2;
    this.cleanups.push(()=>{this.player.controls.removeEventListener('lock',lock);this.player.controls.removeEventListener('unlock',unlock);});
    this.on(document,'visibilitychange',()=>{if(document.hidden&&this.player.controls.isLocked)this.player.controls.unlock();},signal);
    this.on(window,'pagehide',()=>{if(this.state.started)this.save.write();},signal);
    window.addEventListener('mousedown',e=>{if(this.transitions.active){e.preventDefault();e.stopImmediatePropagation();}},{signal,capture:true});this.listenerCount++;
  }
  lock(){this.living.audio.activate();try{Promise.resolve(this.living.renderer.domElement.requestPointerLock()).catch(()=>this.showError('Cliquez sur Reprendre pour activer la souris.'));}catch{this.showError('Le verrouillage de la souris est indisponible.');}}
  newGame(confirmed=false){
    const existing=this.save.read();
    if(!confirmed&&existing){document.querySelector('#new-game-confirm').hidden=false;return;}
    if(!this.save.clear()&&existing){this.showError('La sauvegarde existante ne peut pas être remplacée.');return;}
    this.persistence.reset(document.querySelector('#game-mode').value);this.state.started=true;this.save.request('new-game');document.querySelector('#new-game-confirm').hidden=true;this.transitions.trigger();this.lock();
  }
  refreshMenu(){if(!this.actions)return;const paused=this.state.state==='PAUSED';document.querySelector('#enter').textContent=paused?'REPRENDRE':'NOUVELLE PARTIE';document.querySelector('#continue-game').hidden=paused||!this.save.read();document.querySelector('#new-game').hidden=!paused;document.querySelector('#save-game').hidden=!this.state.started;document.querySelector('#return-menu').hidden=!paused;}
  resetInputs(){const l=this.living,p=this.player;p.resetInput();p.physics.accumulator=0;p.physics.jumpHeld=false;l.accumulator=0;l.gameplay.accumulator=0;l.gameplay.vehicles.physics.accumulator=0;}
  wrap(object,key,after){const original=object[key];object[key]=(...args)=>{const result=original.apply(object,args);after(result,args);return result;};this.cleanups.push(()=>{object[key]=original;});}
  installHooks(){
    const l=this.living,g=l.gameplay;
    this.wrap(l.vertical.discoveries,'onDiscover',()=>this.save.request('discovery'));
    this.wrap(g.health,'save',()=>{const key=g.health.safe.position.toArray().join(',');if(this.safeKey!==key){this.safeKey=key;this.save.request('checkpoint');}});
    this.wrap(g.missions,'finish',m=>{if(m?.state==='COMPLETED'){const event=g.crimes.events.find(e=>e.id===m.eventId);this.persistence.completedMissions.add(`${event?.site.id??m.id}:${m.type}`);if(event)this.persistence.completedCrimes.add(event.site.id);this.trimLedgers();this.save.request('mission');}});
    this.wrap(g.vehicleMissions,'finish',m=>{if(m?.state==='COMPLETED'){this.persistence.completedMissions.add(m.id+':'+m.type);this.trimLedgers();this.save.request('mission');}});
    for(const [object,keys] of [[l.vertical.interiors,['enter','exit']],[l.vertical.underground,['enter','exit']],[g,['respawn']]])for(const key of keys)this.wrap(object,key,()=>{this.streaming.ensureAt(l.camera.position);this.transitions.trigger();this.player.resetInput();});
    this.wrap(l.vertical,'notify',()=>l.audio.duck?.());
  }
  trimLedgers(){for(const set of [this.persistence.completedMissions,this.persistence.completedCrimes])while(set.size>512)set.delete(set.values().next().value);}
  update(raw){
    const l=this.living,v=l.gameplay.vehicles,p=v.driving?v.vehicle.position:l.camera.position;
    const velocity=v.driving?v.vehicle.velocity:this.player.physics.velocity;
    this.streaming.radius=l.performance.profile.chunkPreloadRadius??224;
    this.streaming.update(p,velocity,[...(l.gameplay.missions.active?[l.gameplay.missions.active.position]:[])]);
    this.silhouettes.update();
    const blocked=this.transitions.active;this.transitions.update(Math.min(raw,.05));if(blocked&&!this.transitions.active)this.player.resetInput();
    const delta=this.state.delta(raw,this.transitions.active);
    l.audio.setActive(this.state.state==='PLAYING'&&!this.transitions.active);
    const garage=v.garage?.id;if(garage&&garage!==this.garage&&this.state.started)this.save.request('garage');this.garage=garage;
    if(this.state.started)this.save.update(Math.min(raw,.1),delta>0);
    if(delta>0)this.weather.update(delta);
    return delta;
  }
  afterFrame(raw){this.diagnostics.update(raw);if(this.living.performance.adjustAuto(raw))this.living.applyBudgets();}
  snapshot(){return {...this.streaming.snapshot(),...this.diagnostics.snapshot(),sessionState:this.state.state,saveBytes:this.save.bytes,saveWrites:this.save.writes,wetness:this.weather.wet};}
  dispose(){for(const cleanup of this.cleanups.reverse())cleanup();this.player.onAction=this.previousAction;this.silhouettes.dispose();this.streaming.dispose();this.transitions.dispose();this.diagnostics.dispose();this.status.remove();this.actions.remove();}
}
