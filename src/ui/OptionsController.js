import { DEFAULT_SETTINGS, normalizeSettings } from '../save/SaveSchema.js';

export class OptionsController {
  constructor(living,player,signal) {
    Object.assign(this,{living,player});this.settings={...DEFAULT_SETTINGS};
    const panel=document.querySelector('#settings-panel');
    const fields=[['cameraMotion','Mouvement caméra',0,1,.05],['screenShake','Secousses',0,1,.05],['fov','Champ de vision',55,100,1],['sensitivity','Sensibilité souris',.15,2,.05],['ambienceVolume','Ambiance',0,1,.05],['effectsVolume','Effets',0,1,.05],['minimapSize','Taille carte',.75,1.5,.05],['uiScale','Taille interface',.8,1.3,.05]];
    for(const [key,label,min,max,step] of fields){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');Object.assign(input,{id:`option-${key}`,type:'range',min,max,step});input.dataset.setting=key;row.append(input);panel.append(row);}
    for(const [key,label] of [['highContrast','Marqueurs contrastés'],['mapRotation','Rotation de la carte']]){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');Object.assign(input,{id:`option-${key}`,type:'checkbox'});input.dataset.setting=key;row.append(input);panel.append(row);}
    panel.addEventListener('input',e=>{const k=e.target.dataset.setting;if(k){this.settings={...this.capture(),[k]:e.target.type==='checkbox'?e.target.checked:Number(e.target.value)};this.apply(this.settings);}this.onChange?.();},{signal});
    panel.addEventListener('change',()=>this.onChange?.(),{signal});
    document.querySelector('#quality').addEventListener('click',()=>this.onChange?.(),{signal});
    this.apply(this.settings);
  }
  capture(){const l=this.living;return normalizeSettings({...this.settings,quality:l.performance.requestedLevel??l.performance.level,volume:l.audio.volume,rainEnabled:l.rain.enabled,rainIntensity:l.rain.intensity});}
  apply(raw){
    const s=this.settings=normalizeSettings(raw),l=this.living;l.setQuality(s.quality);l.audio.setVolume(s.volume);l.audio.setMix?.(s.ambienceVolume,s.effectsVolume);l.rain.setEnabled(s.rainEnabled);l.rain.setIntensity(s.rainIntensity);
    l.camera.fov=s.fov;l.camera.updateProjectionMatrix();const v=l.gameplay.vehicles;v.pointerSpeed=s.sensitivity;v.camera.baseFov=s.fov;this.player.controls.pointerSpeed=v.driving?0:s.sensitivity;
    document.documentElement.style.setProperty('--ui-scale',s.uiScale);document.documentElement.style.setProperty('--map-scale',s.minimapSize);document.body.classList.toggle('high-contrast',s.highContrast);
    for(const input of document.querySelectorAll('[data-setting]')){const value=s[input.dataset.setting];if(input.type==='checkbox')input.checked=value;else input.value=value;}
    document.querySelector('#quality-select').value=s.quality;document.querySelector('#quality').textContent=`QUALITÉ : ${s.quality}`;
    document.querySelector('#master-volume').value=s.volume;document.querySelector('#rain-enabled').checked=s.rainEnabled;document.querySelector('#rain-intensity').value=s.rainIntensity;
  }
}
