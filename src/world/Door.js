import { Mesh, Group } from 'three';
import { box } from './CollisionWorld.js';

export class Door {
  constructor({x,y=.24,z,width=1.7,height=2.8,locked=false,resources,parent,onEnter=null}) {
    Object.assign(this,{x,y,z,width,height,locked,onEnter}); this.open=false; this.progress=0;
    this.collider=box(x,y+height/2,z,width,height,.18,'door');
    this.bounds=box(x,y+height/2,z,width+.2,height,.3,'interaction');
    if(resources && parent) {
      this.pivot=new Group(); this.pivot.position.set(x-width/2,y,z); parent.add(this.pivot);
      this.mesh=new Mesh(resources.box,resources.materials.trim); this.mesh.scale.set(width,height,.16); this.mesh.position.set(width/2,height/2,0); this.pivot.add(this.mesh);
      const handle=new Mesh(resources.box,resources.materials.windows); handle.scale.set(.12,.35,.2); handle.position.set(width-.2,1.2,.13); this.pivot.add(handle);
    }
  }
  get state() { return this.locked?'locked':this.open?'open':'closed'; }
  get label() { return this.locked?'Verrouillée':this.open?(this.onEnter?'Entrer':'Fermer'):'Ouvrir'; }
  use() { if(this.locked) return false; if(this.open && this.onEnter) { if(this.progress>=.95) this.onEnter(); } else this.open=!this.open; return true; }
  update(dt,player) {
    // Do not close through the player's capsule.
    if(!this.open && player && Math.abs(player.x-this.x)<this.width/2+.5 && Math.abs(player.z-this.z)<.65 && player.y>this.y && player.y<this.y+this.height+1) this.open=true;
    this.progress=Math.max(0,Math.min(1,this.progress+(this.open?1:-1)*dt*2.5));
    this.collider.enabled=this.progress<.95;
    if(this.pivot) this.pivot.rotation.y=-this.progress*Math.PI/2;
  }
  target(owner,context='exterior') { return {owner,context,bounds:this.bounds,collider:this.collider,label:()=>this.label,use:()=>this.use()}; }
  dispose() { this.pivot?.removeFromParent(); }
}
