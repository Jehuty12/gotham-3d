import { Vector3 } from 'three';
import { CollisionWorld, box, overlaps } from '../world/CollisionWorld.js';
import { PlayerPhysics } from '../player/PlayerPhysics.js';
import { PlayerInteraction } from '../player/PlayerInteraction.js';
import { GrappleSystem } from '../player/GrappleSystem.js';
import { selectAccessibleRoofs, generateInteriors } from '../interiors/InteriorGenerator.js';
import { InteriorManager } from '../interiors/InteriorManager.js';
import { VerticalRoutes } from '../world/VerticalRoutes.js';
import { Underground } from '../world/Underground.js';
import { DiscoverySystem } from './DiscoverySystem.js';
import { VisibilityManager } from './VisibilityManager.js';
import { NavigationSigns } from '../world/NavigationSigns.js';

export class VerticalCity {
  constructor(living,player,signal) {
    Object.assign(this,{living,player});const {city,camera,scene}=living;
    city.collisionWorld=new CollisionWorld(city);
    player.physics=new PlayerPhysics(camera,city.collisionWorld);
    this.interaction=new PlayerInteraction(camera,city.collisionWorld);
    this.roofs=selectAccessibleRoofs(city);this.specs=generateInteriors(city,this.roofs);
    this.routes=new VerticalRoutes(city,this.roofs,living.rail,this.interaction,player.physics);
    this.interiors=new InteriorManager(scene,city,this.specs,this.interaction,player.physics);
    this.underground=new Underground(scene,city,this.interaction,player.physics,living.steam);
    this.signs=new NavigationSigns(city,this);
    this.grapple=new GrappleSystem(camera,player.physics,this.routes.grapplePoints);
    this.visibility=new VisibilityManager(living);this.zone='exterior';
    const tower=this.specs.find(s=>s.building.landmark==='tower'),municipal=this.specs.find(s=>s.building.landmark==='municipal');
    const old=this.roofs.filter(b=>b.districtId==='old'&&!b.landmark).sort((a,b)=>Math.hypot(a.x+32,a.z+96)-Math.hypot(b.x+32,b.z+96))[0];
    const point=(s,id,name)=>({id,name,x:s.building.x,z:s.building.z+(s.building.roofDepth??s.building.depth)/2-1.3,y:s.roofY+1.75});
    this.discoveries=new DiscoverySystem([
      point(tower,'tower','Terrasse Meridian'),point(municipal,'municipal','Toit de l’Hôtel de la Garde'),
      {id:'cathedral',name:'Les toits des Veilleurs',x:old.x,z:old.z+(old.roofDepth??old.depth)/2-1.3,y:(old.roofY??old.height)+1.95},
      this.routes.crane,...this.underground.zones.map((p,i)=>({...p,id:`underground-${i}`,y:-6.25})),
    ].filter(Boolean),p=>this.notify(`Point découvert : ${p.name}`));
    for(const spec of this.specs) {
      const b=spec.building,z=b.z+(b.roofDepth??b.depth)/2-1.3;
      this.interaction.register({owner:this,bounds:box(b.x,spec.roofY+1,z,1,2,.7),label:'Ascenseur · descendre',use:()=>this.interiors.enter(spec.id,true)});
    }
    this.prompt=document.createElement('div');this.prompt.id='interaction-prompt';document.body.appendChild(this.prompt);
    this.toast=document.createElement('div');this.toast.id='discovery-toast';this.toast.setAttribute('role','status');document.body.appendChild(this.toast);
    this.toastTime=0;
    player.onAction=code=>{
      if(code==='KeyE')this.interaction.use();
      if(code==='KeyG')this.grapple.use();
      if(/^Digit[123]$/.test(code) && this.interiors.active?.panel)this.interiors.active.elevator.select(Number(code.at(-1))-1);
    };
    window.addEventListener('mousedown',e=>{if(e.button===2 && player.controls.isLocked)this.grapple.use();},{signal});
    window.addEventListener('contextmenu',e=>{if(player.controls.isLocked && this.grapple.enabled)e.preventDefault();},{signal});
  }
  notify(text) {this.toast.textContent=text;this.toastTime=5;}
  update(dt) {
    const {physics}=this.player,p=this.living.camera.position;
    if(this.player.controls.isLocked) {
      this.interiors.update(dt);this.grapple.update(dt);this.discoveries.update(p);
    }
    this.underground.update(this.living.time);
    physics.world.prepare(new Vector3(p.x,p.y-physics.height,p.z),physics.height+.15);
    const onRoof=physics.grounded && physics.world.local.some(b=>['building','rooftop'].includes(b.kind) && Math.abs(p.y-physics.height-b.maxY)<.4 && overlaps(b,p.x,p.z,physics.radius));
    const zone=this.underground.active?'underground':this.interiors.active?'interior':onRoof?'rooftop':'exterior';
    if(zone!==this.zone) {this.zone=zone;this.living.performance.updateVisibility(this.living.camera);this.living.lights.lastPosition.set(Infinity,0,Infinity);this.living.steam.last.set(Infinity,0,Infinity);}
    this.visibility.update(zone,this.interiors.active);
    this.interaction.update();
    this.prompt.textContent=this.player.controls.isLocked ? this.interiors.active?.panel?'ASCENSEUR · 1 RDC · 2 MEZZANINE · 3 TOIT':this.interaction.prompt || (this.grapple.enabled&&this.grapple.target?'[G] Point d’accroche':'') : '';
    this.toastTime-=dt;this.toast.hidden=this.toastTime<=0;
    // Above roofs use local rain; sealed spaces reuse the existing audio categories.
    this.living.audio.environment=zone;
    if(p.y < -30 && !this.underground.active) physics.teleport(new Vector3(0,1.75,54));
  }
  snapshot() {
    const p=this.player.physics;
    return {playerState:p.state,grounded:p.grounded,crouching:p.crouching,zone:this.zone,nearbyColliders:p.world.local.length,collisionTests:p.collisionTests,activeInterior:this.interiors.active?.spec.id??null,floor:this.interiors.active?.elevator.floor??0,accessibleRoofs:this.roofs.length,interiors:this.specs.length,discoveries:[...this.discoveries.visited],stairs:this.routes.stairs.length};
  }
  dispose() {this.interiors.dispose();this.prompt.remove();this.toast.remove();this.player.onAction=null;}
}
