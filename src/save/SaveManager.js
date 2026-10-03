import { SAVE_KEY, BACKUP_SAVE_KEY } from './SaveSchema.js';
import { migrateSave } from './SaveMigrations.js';

export class SaveManager {
  constructor(storage=null,{capture=()=>null,onStatus=()=>{}}={}) {
    this.storage=storage;this.capture=capture;this.onStatus=onStatus;this.pending=false;this.elapsed=0;this.sinceWrite=10;this.writes=0;this.bytes=0;this.status='';this.statusTime=0;
  }
  read() {
    this.recovered=false;
    for(const key of [SAVE_KEY,BACKUP_SAVE_KEY])try{const text=this.storage?.getItem(key),value=this.parse(text);if(value){this.bytes=new TextEncoder().encode(text).length;this.recovered=key===BACKUP_SAVE_KEY;return value;}}catch{/* Try the previous valid generation. */}
    return null;
  }
  parse(text){try{return text&&text.length<=256*1024?migrateSave(JSON.parse(text)):null;}catch{return null;}}
  request(reason='checkpoint'){this.pending=true;this.reason=reason;}
  write() {
    try {
      const dto=migrateSave(this.capture());if(!dto||!this.storage)return false;
      const text=JSON.stringify(dto);this.bytes=new TextEncoder().encode(text).length;if(this.bytes>256*1024)throw new Error('Save too large');
      const previous=this.storage.getItem(SAVE_KEY);
      if(this.parse(previous))this.storage.setItem(BACKUP_SAVE_KEY,previous);
      this.storage.setItem(SAVE_KEY,text);this.writes++;this.pending=false;this.elapsed=0;this.sinceWrite=0;this.setStatus('Sauvegardé',3);return true;
    } catch {this.pending=false;this.sinceWrite=0;this.setStatus('Sauvegarde indisponible',5);return false;}
  }
  setStatus(status,duration){this.status=status;this.statusTime=duration;this.onStatus(status);}
  update(dt,playing=false) {
    this.sinceWrite+=dt;this.statusTime-=dt;
    if(this.status==='Sauvegarde…'&&this.statusTime<=0&&this.pending){this.write();return;}
    if(this.statusTime<=0&&this.status){this.status='';this.onStatus('');}
    if(playing)this.elapsed+=dt;if(this.elapsed>=40)this.request('periodic');
    if(this.pending&&this.sinceWrite>=3){if(this.status!=='Sauvegarde…')this.setStatus('Sauvegarde…',.12);else if(this.statusTime<=.04)this.write();}
  }
  clear(){try{this.storage?.removeItem(SAVE_KEY);this.storage?.removeItem(BACKUP_SAVE_KEY);}catch{return false;}this.pending=false;this.bytes=0;this.elapsed=0;return true;}
}
