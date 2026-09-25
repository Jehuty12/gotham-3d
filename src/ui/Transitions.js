export class Transitions {
  constructor(){this.remaining=0;this.element=document.createElement('div');this.element.id='transition-fade';document.body.appendChild(this.element);}
  trigger(){this.remaining=.24;}
  update(dt){this.remaining=Math.max(0,this.remaining-dt);this.element.style.opacity=String(this.remaining/.24*.75);}
  get active(){return this.remaining>0;}
  dispose(){this.element.remove();}
}
