export class DialogueSystem {
  constructor(audio=null){this.audio=audio;this.queue=[];this.current=null;this.remaining=0;}
  say(speaker,text,duration=8){if(!text)return;this.queue.push({speaker,text,duration:Math.max(3,Math.min(18,duration))});if(this.queue.length>6)this.queue.shift();}
  update(dt){if(dt<=0)return;this.remaining-=dt;if(this.remaining<=0){this.current=this.queue.shift()??null;this.remaining=this.current?.duration??0;if(this.current){this.audio?.duck?.();this.audio?.radio?.();}}}
  clear(){this.queue.length=0;this.current=null;this.remaining=0;}
}
