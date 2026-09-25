export class DebugPanel {
  constructor(living, signal) {
    this.living = living; this.elapsed = 0;
    this.element = document.createElement('pre'); this.element.id = 'debug-panel'; this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Diagnostics de la ville'); document.body.appendChild(this.element);
    window.addEventListener('keydown', event => {
      if (event.code === 'F3') { event.preventDefault(); if (!event.repeat) this.element.hidden = !this.element.hidden; }
    }, { signal });
  }
  update(delta) {
    this.elapsed += delta; if (this.elapsed < 0.25) return; this.elapsed = 0;
    const s = this.living.snapshot();
    this.element.dataset.stats = JSON.stringify(s);
    if (this.element.hidden) return;
    this.element.textContent = [
      `VEHICLES & PURSUIT / ${s.quality}`,
      `FPS ${s.fps.toFixed(1)} · draw calls ${s.drawCalls.toFixed(0)}`,
      `Position ${s.position.map(v=>v.toFixed(1)).join(' / ')}`,
      `${s.district} · chunk ${s.chunk}`,
      `Bâtiments dans le champ ${s.buildings}`,
      `Voitures ${s.cars} · piétons ${s.pedestrians}`,
      `Particules ${s.particles} (pluie ${s.rain}, vapeur ${s.steam})`,
      `Arrêts ${s.stoppedCars} · virages ${s.turns}`,
      `État ${s.playerState} · grounded ${s.grounded}`,
      `Zone ${s.zone} · Y ${s.position[1].toFixed(2)}`,
      `Collisions ${s.nearbyColliders} proches / ${s.collisionTests} tests`,
      `Intérieur ${s.activeInterior ?? '—'} · étage ${s.floor}`,
      `Triangles ${Math.round(s.triangles)} · toits ${s.accessibleRoofs}`,
      `Mode ${s.gameMode} · mission ${s.activeMission??'—'} · crimes ${s.activeCrimes}`,
      `PV ${s.health} · mouvement ${s.movementMode}`,
      `Grappin ${s.grappleState} · planage ${s.glideState}`,
      `Vitesse ${(s.speed??0).toFixed(1)} · XYZ ${(s.velocity??[]).map(v=>v.toFixed(1)).join(' / ')}`,
      `IA ${s.activeAI}/${s.totalEnemies} · suspects ${s.suspicious} · alertés ${s.alerted} · neutralisés ${s.disabled}`,
      `CPU IA ${(s.aiUpdateMs??0).toFixed(3)} ms/tick · raycasts/frame ${s.raycasts}`,
      `Conduite ${s.driving} · ${s.currentVehicleId??'à pied'} · ${s.vehicleCamera}`,
      `Véhicule ${(s.vehicleSpeed??0).toFixed(1)} m/s · accel ${(s.vehicleAcceleration??0).toFixed(1)} · direction ${(s.vehicleSteering??0).toFixed(2)}`,
      `Intégrité ${Math.round(s.vehicleIntegrity??0)} · boost ${Math.round(s.vehicleBoost??0)}`,
      `Trafic ${s.cars} / ${s.simplifiedTraffic??0} simplifiés · collisions véhicule ${s.vehicleCollisionTests??0}`,
      `Poursuite ${s.pursuitState} · unités ${s.policeUnits} · ${(s.pursuitTimer??0).toFixed(1)} s`,
      `Dernier contact ${(s.lastKnownPosition??[]).map(v=>v.toFixed(0)).join('/')}`,
      `CPU véhicules ${(s.vehicleUpdateMs??0).toFixed(3)} ms · colliders ${s.activeVehicleColliders??0}`,
      'F3 pour masquer',
    ].join('\n');
  }
  dispose() { this.element.remove(); }
}
