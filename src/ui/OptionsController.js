import { DEFAULT_SETTINGS, normalizeSettings } from '../save/SaveSchema.js';
import { INPUT_BINDINGS } from '../input/InputBindings.js';

export class OptionsController {
  constructor(living,player,signal) {
    Object.assign(this,{living,player});this.settings={...DEFAULT_SETTINGS};
    const panel=document.querySelector('#settings-panel');
    const controls=document.createElement('details');controls.id='controls-screen';const title=document.createElement('summary');title.textContent='COMMANDES';controls.append(title);for(const [heading,contexts] of [['À PIED',['movement','foot']],['VÉHICULE',['vehicle']],['EXPLORATION',['shared']],['COMBAT',[]],['INTERFACE',['interface']]]){const h=document.createElement('h3');h.textContent=heading;controls.append(h);if(heading==='COMBAT'){const p=document.createElement('p');p.textContent='Vigilante : clic gauche frappe, E neutralisation discrète, ALT esquive. V : scanner à pied ; caméra en voiture.';controls.append(p);}for(const binding of Object.values(INPUT_BINDINGS).filter(b=>contexts.includes(b.context))){const p=document.createElement('p');p.textContent=binding.label;controls.append(p);}}panel.append(controls);
    for(const [key,label,values] of [['tutorials','TUTORIELS',['ON','MINIMAL','OFF']],['subtitleSize','TAILLE SOUS-TITRES',['SMALL','MEDIUM','LARGE']]]){const row=document.createElement('label');row.textContent=label;const input=document.createElement('select');input.id=`option-${key}`;input.dataset.setting=key;for(const value of values)input.add(new Option(value,value));row.append(input);panel.append(row);}
    const flashes=document.createElement('label');flashes.textContent='RÉDUIRE LES FLASHES';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='option-reduceFlashes';checkbox.dataset.setting='reduceFlashes';flashes.append(checkbox);panel.append(flashes);
    const fields=[['cameraMotion','Mouvement caméra',0,1,.05],['screenShake','Secousses',0,1,.05],['fov','Champ de vision',55,100,1],['sensitivity','Sensibilité souris',.15,2,.05],['ambienceVolume','Ambiance',0,1,.05],['effectsVolume','Effets',0,1,.05],['minimapSize','Taille carte',.75,1.5,.05],['uiScale','Taille interface',.8,1.3,.05]];
    for(const [key,label,min,max,step] of fields){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');Object.assign(input,{id:`option-${key}`,type:'range',min,max,step});input.dataset.setting=key;row.append(input);panel.append(row);}
    for(const [key,label] of [['stormEnabled','Orages rares'],['vignette','Vignette discrète'],['highContrast','Marqueurs contrastés'],['mapRotation','Rotation de la carte']]){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');Object.assign(input,{id:`option-${key}`,type:'checkbox'});input.dataset.setting=key;row.append(input);panel.append(row);}
    const grading=document.createElement('label');grading.textContent='Étalonnage';const select=document.createElement('select');select.id='option-colorGrading';select.dataset.setting='colorGrading';for(const value of ['DEFAULT','CINEMATIC','HIGH_CONTRAST'])select.add(new Option(value,value));grading.append(select);panel.append(grading);
    for(const [key,label,values] of [['missionGuidance','MISSION GUIDANCE',['OFF','MINIMAL','FULL']],['explorationContent','Contenu en Exploration',['OFF','DISCOVERIES_ONLY']]]){const row=document.createElement('label');row.textContent=label;const input=document.createElement('select');input.id=`option-${key}`;input.dataset.setting=key;for(const value of values)input.add(new Option(value,value));row.append(input);panel.append(row);}
    panel.addEventListener('input',e=>{const k=e.target.dataset.setting;if(k){this.settings={...this.capture(),[k]:e.target.type==='checkbox'?e.target.checked:e.target.tagName==='SELECT'?e.target.value:Number(e.target.value)};this.apply(this.settings);}this.onChange?.();},{signal});
    panel.addEventListener('change',()=>this.onChange?.(),{signal});
    document.querySelector('#quality').addEventListener('click',()=>this.onChange?.(),{signal});
    this.apply(this.settings);
  }
  capture(){const l=this.living;return normalizeSettings({...this.settings,quality:l.performance.requestedLevel??l.performance.level,volume:l.audio.volume,rainEnabled:l.rain.enabled,rainIntensity:l.rain.intensity});}
  apply(raw){
    const s=this.settings=normalizeSettings(raw),l=this.living;l.setQuality(s.quality);l.audio.setVolume(s.volume);l.audio.setMix?.(s.ambienceVolume,s.effectsVolume);l.rain.setEnabled(s.rainEnabled);l.rain.setIntensity(s.rainIntensity);
    l.camera.fov=s.fov;l.camera.updateProjectionMatrix();const v=l.gameplay.vehicles;v.pointerSpeed=s.sensitivity;v.camera.baseFov=s.fov;this.player.controls.pointerSpeed=v.driving?0:s.sensitivity;
    document.documentElement.style.setProperty('--ui-scale',s.uiScale);document.documentElement.style.setProperty('--map-scale',s.minimapSize);document.body.classList.toggle('high-contrast',s.highContrast);
    document.documentElement.style.setProperty('--subtitle-scale',({SMALL:.85,MEDIUM:1,LARGE:1.3})[s.subtitleSize]);document.body.classList.toggle('reduce-flashes',s.reduceFlashes);l.gameplay.vehicles.renderer.reduceFlashes=s.reduceFlashes;l.traffic.reduceFlashes=s.reduceFlashes;
    for(const input of document.querySelectorAll('[data-setting]')){const value=s[input.dataset.setting];if(input.type==='checkbox')input.checked=value;else input.value=value;}
    document.querySelector('#quality-select').value=s.quality;document.querySelector('#quality').textContent=`QUALITÉ : ${s.quality}`;
    document.querySelector('#master-volume').value=s.volume;document.querySelector('#rain-enabled').checked=s.rainEnabled;document.querySelector('#rain-intensity').value=s.rainIntensity;
  }
}
