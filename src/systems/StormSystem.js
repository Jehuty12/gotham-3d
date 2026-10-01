import { seededRandom, deriveSeed } from '../utils/procedural.js';

export class StormSystem {
  constructor(seed,audio){this.random=seededRandom(deriveSeed(seed,'rare-storm'));this.audio=audio;this.enabled=false;this.remaining=this.interval();this.flash=0;this.thunder=-1;this.strikes=0;}
  interval(){return 240+this.random()*420;}
  update(dt,rain,indoor=false){
    this.flash=Math.max(0,this.flash-dt*5);
    if(!this.enabled){this.flash=0;this.thunder=-1;return;}
    if(dt<=0)return;
    if(this.thunder>=0){this.thunder-=dt;if(this.thunder<0)this.audio?.thunder?.(indoor?.2:.5);}
    if(rain<.6)return;
    this.remaining-=dt;
    if(this.remaining<=0){this.remaining=this.interval();this.flash=indoor?.2:1;this.thunder=1.8+this.random()*2.5;this.strikes++;}
  }
}
