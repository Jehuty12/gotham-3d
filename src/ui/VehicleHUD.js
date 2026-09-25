export class VehicleHUD {
  constructor(){this.element=document.createElement('aside');this.element.id='vehicle-hud';document.body.appendChild(this.element);}
  update(game,manager) {
    this.element.hidden=!manager.driving;if(!manager.driving)return;
    if(manager.time-(this.lastUpdate??-1)<.1)return;this.lastUpdate=manager.time;
    const v=manager.vehicle,m=game.vehicleMissions?.active;
    const guidance=m?.type==='evade'?'Rompre le contact visuel':m?`${Math.round(v.position.distanceTo(m.destination))} m`:'';
    this.element.textContent=`NIGHTRIDER / ${manager.camera.mode}\n${Math.round(Math.abs(v.speed)*3.6)} km/h\nBOOST ${'■'.repeat(Math.round(v.boost/10))}${'·'.repeat(10-Math.round(v.boost/10))} ${Math.round(v.boost)}%\nINTÉGRITÉ ${Math.round(v.integrity)}%${v.integrity===0?' · VEHICLE DISABLED':''}\n${game.pursuit?.state??'NONE'}${m?`\nOBJECTIF : ${m.objective}\n${Math.ceil(m.remaining)} s · ${guidance}`:'\n[M] Mission de conduite'}\nZQSD / WASD · ESPACE frein · MAJ boost\n[V] Caméra · [E] ${manager.repairing?'Arrêter la réparation / sortir':'Sortir / réparer'}`;
  }
  dispose(){this.element.remove();}
}
