import { deriveSeed } from '../utils/procedural.js';

// At most one temporary modifier, owned and restored here. The existing rain,
// light and rail renderers implement its effects; no new simulation or timer.
export class WorldEvents {
  constructor(content){this.content=content;this.serial=0;this.remaining=240;this.active=null;this.railDelay=0;}
  update(dt){
    if(dt<=0)return;
    if(this.active){this.active.remaining-=dt;if(this.active.remaining<=0)this.clear();return;}
    this.remaining-=dt;if(this.remaining>0||this.content.active||this.content.living.city.collisionWorld.domain)return;
    const l=this.content.living,kinds=['blackout','siren','train-delay','heavy-rain'];
    const kind=kinds[deriveSeed(l.city.seed,'world-event',this.serial++)%kinds.length];
    this.active={kind,remaining:kind==='train-delay'?12:22,position:l.camera.position.clone(),rain:l.rain.intensity};
    if(kind==='heavy-rain'&&l.rain.enabled)l.rain.setIntensity(1);
    if(kind==='siren')l.audio.radio?.(true);
    this.content.dialogue.say('Régie',({blackout:'Délestage local. L’éclairage de secours reste allumé.',siren:'Une alerte de quartier passe sur la fréquence de service.','train-delay':'Rame retenue douze secondes au signal de régulation.','heavy-rain':'Averse soutenue. Les quais restent accessibles.'})[kind]);
  }
  clear(){if(this.active?.kind==='heavy-rain'&&this.content.living.rain.intensity===1)this.content.living.rain.setIntensity(this.active.rain);if(this.active?.kind==='blackout')this.content.living.lights?.lastPosition.set(Infinity,0,Infinity);this.active=null;this.remaining=180+deriveSeed(1989,'event-delay',this.serial)%181;}
  dispose(){this.clear();}
}
