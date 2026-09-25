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
      `VIGILANTE GAMEPLAY / ${s.quality}`,
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
      'F3 pour masquer',
    ].join('\n');
  }
  dispose() { this.element.remove(); }
}
