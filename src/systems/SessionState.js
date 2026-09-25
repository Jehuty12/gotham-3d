// No wall-clock timers: a paused frame never contributes to simulation time.
export class SessionState {
  constructor(){this.state='MENU';this.started=false;this.resetDelta=true;}
  play(){this.state='PLAYING';this.started=true;this.resetDelta=true;}
  pause(){if(this.started)this.state='PAUSED';this.resetDelta=true;}
  menu(){this.state='MENU';this.resetDelta=true;}
  delta(raw,blocked=false){if(this.resetDelta){this.resetDelta=false;return 0;}return this.state==='PLAYING'&&!blocked?Math.min(Math.max(0,raw),.05):0;}
}
