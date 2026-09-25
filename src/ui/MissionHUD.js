export class MissionHUD {
  constructor(){this.element=document.createElement('aside');this.element.id='mission-hud';document.body.appendChild(this.element);this.shade=document.createElement('div');this.shade.id='health-shade';document.body.appendChild(this.shade);this.time=0;}
  update(dt,director) {
    this.time+=dt;if(this.time<.1)return;this.time=0;
    const {mode,missions,camera,health,scanner}=director;
    this.element.hidden=mode!=='VIGILANTE';this.shade.style.opacity=mode==='VIGILANTE'?(health.dead?.9:health.hurt>0?.22:0):0;
    document.querySelector('#reticle')?.classList.toggle('attack-hit',mode==='VIGILANTE'&&director.combat.feedback>0);
    if(mode!=='VIGILANTE')return;
    const m=missions.active??missions.offer(camera.position),distance=m?Math.round(camera.position.distanceTo(m.position)):0;
    let direction='';if(m){const local=m.position.clone().project(camera);direction=local.x>1?' →':local.x<-1?' ←':local.z>1?' ↶':'';}
    this.element.textContent=health.dead?'REPLI EN COURS…':`VIGILANTE · ${Math.round(health.hp)} PV\n${missions.active?'OBJECTIF':'[M] ACCEPTER UNE MISSION'}${direction}\n${m?.objective??'Recherche de signalements…'}${m?`\n${m.district} · ${distance} m\nApproches : ${m.approaches.join(' / ')}`:''}\n[V] Scanner ${scanner.duration>0?'ACTIF':scanner.cooldown>0?Math.ceil(scanner.cooldown)+' s':'prêt'} · [ALT] Esquive`;
  }
  dispose(){this.element.remove();this.shade.remove();}
}
