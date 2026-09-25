export class ScannerSystem {
  constructor(){this.duration=0;this.cooldown=0;this.range=55;this.enabled=false;}
  activate(){if(!this.enabled||this.cooldown>0)return false;this.duration=4;this.cooldown=7;return true;}
  update(dt){this.duration=Math.max(0,this.duration-dt);this.cooldown=Math.max(0,this.cooldown-dt);}
  reveals(target,position){return this.enabled&&this.duration>0&&target.position.distanceTo(position)<this.range;}
  clear(){this.duration=this.cooldown=0;}
}
