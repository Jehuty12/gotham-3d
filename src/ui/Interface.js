import { CITY_SEED } from '../world/districts.js';

export function mountInterface() {
document.querySelector('#app').innerHTML = `
  <div id="viewport" aria-label="Ville 3D à explorer"></div><div class="vignette"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Vertical City, accueil"><span class="brand-mark">L<span>·</span></span><span>VERTICAL CITY<small>V4 / EXPLORATION VERTICALE</small></span></a>
    <div class="top-right"><span class="live-dot"></span> MONDE PROCÉDURAL <span class="divider"></span> <span>01:27 <span class="moon-icon">◔</span></span></div>
  </header>
  <main id="menu">
    <div class="intro">
      <div class="eyebrow"><span></span> LA VILLE NE DORT JAMAIS.</div>
      <h1>La nuit vous<br><em>appartient.</em></h1>
      <p>Sous la pluie, les dernières rames traversent la nuit.<br>Des souterrains aux toits. Explorez à votre rythme.</p>
      <button id="enter" class="enter-button">Explorer la ville <span>↗</span></button>
      <div class="entry-note">Clavier & souris · Échap pour les réglages · F3 diagnostics</div>
      <p id="error" role="alert" hidden></p>
    </div>
    <aside class="chapter"><span class="chapter-number">04 /</span><span>DOWNTOWN<br>OLD GOTHAM<br>INDUSTRIAL DISTRICT<br>DOCKS</span><i></i><small>48° N &nbsp; / &nbsp; 02° E<br>UNE NUIT SANS FIN</small></aside>
    <div class="controls-guide"><div><span class="key-group"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd><span class="or">/</span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><small>SE DÉPLACER</small></div><div><span class="control-text">↔ &nbsp; SOURIS</span><small>REGARDER</small></div><div><kbd>MAJ</kbd><small>COURIR</small></div><div><kbd>ÉCHAP</kbd><small>PAUSE</small></div></div>
  </main>
  <div id="reticle" hidden></div><div id="walking-hint" hidden>ESPACE <span>saut</span> · CTRL <span>accroupir</span> · E <span>interaction</span> · ÉCHAP <span>pause</span></div>
  <aside class="map-panel"><div class="map-heading"><span><i></i> <span id="district-name">VERTICAL CITY</span></span><span>N ↑</span></div><canvas id="minimap" width="224" height="170" aria-label="Plan du quartier et position du joueur"></canvas><div class="district-legend"><span class="downtown">Downtown</span><span class="old">Old Gotham</span><span class="industrial">Industrial</span><span class="docks">Docks</span></div><div class="landmark-legend" title="Cathédrale des Veilleurs · Tour Meridian · Hôtel de la Garde">C Cathédrale · T Tour · M Mairie</div><div class="map-footer"><span id="coordinates">X 000 · Z 000</span><span id="sector">CHUNK 4,4</span></div></aside>
  <footer><span><i></i> LIBRE D’EXPLORER</span><span class="world-details">4 QUARTIERS <b>·</b> 64 CHUNKS <b>·</b> GRAINE ${CITY_SEED}</span><span class="footer-actions"><button id="quality" title="Changer la qualité graphique">QUALITÉ : MEDIUM</button><button id="settings-toggle" aria-expanded="false" aria-controls="settings-panel">RÉGLAGES ☷</button></span></footer>
`;

}

export function bindSettings(living, signal) {
  const panel = document.createElement('aside');
  panel.id = 'settings-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Réglages de Vertical City');
  panel.innerHTML = `<div class="settings-title">ATMOSPHÈRE <button id="settings-close" aria-label="Fermer les réglages">×</button></div>
    <label>Qualité <select id="quality-select"><option>LOW</option><option selected>MEDIUM</option><option>HIGH</option></select></label>
    <label>Pluie <input id="rain-enabled" type="checkbox" checked></label>
    <label>Intensité <input id="rain-intensity" type="range" min="0" max="1" step="0.05" value="1" aria-label="Intensité de la pluie"></label>
    <label>Volume <input id="master-volume" type="range" min="0" max="1" step="0.01" value="0.22" aria-label="Volume global"></label>
    <small>Ambiance sonore générée localement.<br>F3 : performances et état de la ville.</small>`;
  document.querySelector('#app').appendChild(panel);
  const options = { signal }, toggle = document.querySelector('#settings-toggle');
  const setOpen = open => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setOpen(panel.hidden), options);
  panel.querySelector('#settings-close').addEventListener('click', () => setOpen(false), options);
  const applyQuality = level => {
    living.setQuality(level); document.querySelector('#quality').textContent = `QUALITÉ : ${level}`;
    panel.querySelector('#quality-select').value = level;
  };
  document.querySelector('#quality').addEventListener('click', () => {
    const levels = ['LOW', 'MEDIUM', 'HIGH']; applyQuality(levels[(levels.indexOf(living.performance.level) + 1) % levels.length]);
  }, options);
  panel.querySelector('#quality-select').addEventListener('change', e => applyQuality(e.target.value), options);
  panel.querySelector('#rain-enabled').addEventListener('change', e => living.rain.setEnabled(e.target.checked), options);
  panel.querySelector('#rain-intensity').addEventListener('input', e => living.rain.setIntensity(Number(e.target.value)), options);
  panel.querySelector('#master-volume').addEventListener('input', e => living.audio.setVolume(Number(e.target.value)), options);
}

