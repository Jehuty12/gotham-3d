export class LoadingScreen {
  constructor(){this.element=document.createElement('div');this.element.id='loading-screen';this.element.innerHTML='<strong>WORLD POLISH & PERSISTENCE</strong><p></p><progress max="1" value="0"></progress><small></small>';document.body.appendChild(this.element);}
  phase(label,progress,district=''){this.element.querySelector('p').textContent=label;this.element.querySelector('progress').value=progress;this.element.querySelector('small').textContent=district;}
  dispose(){this.element.remove();}
}
