import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { City } from './world/City.js';
import { CityLights } from './lighting/CityLights.js';
import { PlayerController } from './player/PlayerController.js';
import { CITY_SEED } from './world/districts.js';
import { Minimap } from './ui/Minimap.js';
import { VerticalCity } from './systems/VerticalCity.js';
import { LivingCity } from './systems/LivingCity.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { mountInterface, bindSettings } from './ui/Interface.js';
import './style.css';

mountInterface();

const enter = document.querySelector('#enter');
const error = document.querySelector('#error');
function showError(message) { error.textContent = message; error.hidden = false; }

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.querySelector('#viewport').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1a27');
  scene.fog = new THREE.FogExp2('#172e3b', 0.0035);
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 800);
  camera.position.set(0, 1.75, 54); camera.lookAt(11, 12, -65);
  const city = new City(scene, CITY_SEED);
  const lights = new CityLights(scene, city);
  const player = new PlayerController(camera, renderer.domElement, city);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.45, 1.25));
  composer.addPass(new OutputPass());
  renderer.info.autoReset = false;
  const living = new LivingCity({ scene, city, camera, renderer, composer, lights });
  const events = new AbortController();
  const options = { signal: events.signal };
  living.vertical = new VerticalCity(living, player, events.signal);
  const debug = new DebugPanel(living, events.signal);
  bindSettings(living, events.signal);
  const menu = document.querySelector('#menu');
  const reticle = document.querySelector('#reticle');
  const hint = document.querySelector('#walking-hint');
  let hasEntered = false;
  enter.addEventListener('click', () => {
    error.hidden = true;
    living.audio.activate();
    if (!renderer.domElement.requestPointerLock) {
      showError('Utilisez un navigateur sur ordinateur compatible avec le verrouillage de la souris.'); return;
    }
    // PointerLockControls listens to the native lock event. Keep the request's
    // promise here because its lock() helper does not return it on all versions.
    const rejected = () => showError('La souris n’a pas pu être activée. Cliquez à nouveau pour réessayer.');
    try { Promise.resolve(renderer.domElement.requestPointerLock()).catch(rejected); } catch { rejected(); }
  }, options);
  document.addEventListener('pointerlockerror', () => showError('Le navigateur a refusé le verrouillage de la souris. Réessayez avec le bouton Explorer.'), options);
  player.controls.addEventListener('lock', () => {
    hasEntered = true; menu.hidden = true; reticle.hidden = false; hint.hidden = false;
    document.body.classList.add('playing');
    document.querySelector('#settings-panel').hidden = true;
    document.querySelector('#settings-toggle').setAttribute('aria-expanded', 'false');
    living.audio.setActive(true);
  });
  player.controls.addEventListener('unlock', () => {
    menu.hidden = false; reticle.hidden = true; hint.hidden = true;
    document.body.classList.remove('playing');
    living.audio.setActive(false);
    if (hasEntered) enter.innerHTML = 'Reprendre l’exploration <span>↗</span>';
    enter.focus();
  });
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  }, options);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); renderer.setAnimationLoop(null); player.controls.unlock();
    showError('Le contexte graphique a été interrompu. Rechargez la page pour reprendre.'); enter.disabled = true;
  }, options);
  const minimap = new Minimap(document.querySelector('#minimap'), city, camera, living.vertical);
  let previous = performance.now();
  let mapElapsed = 1;
  renderer.setAnimationLoop(now => {
    const rawDelta = (now - previous) / 1000; previous = now;
    const delta = Math.min(rawDelta, 0.05);
    if (!living.vertical.grapple.active) player.update(delta);
    living.update(Math.min(rawDelta, 0.1)); living.vertical.update(delta); mapElapsed += delta;
    if (mapElapsed > 0.1) { minimap.draw(); mapElapsed = 0; }
    renderer.info.reset();
    const mantleOffset=player.physics.mantleOffset;
    camera.position.y+=mantleOffset;
    if (living.performance.profile.bloom) composer.render(delta); else renderer.render(scene, camera);
    camera.position.y-=mantleOffset;
    living.performance.recordFrame(rawDelta, renderer.info.render.calls, renderer.info.render.triangles);
    debug.update(Math.min(rawDelta, 0.25));
  });
  if (import.meta.hot) import.meta.hot.dispose(() => {
    renderer.setAnimationLoop(null);
    if (player.controls.isLocked) player.controls.unlock();
    living.dispose(); debug.dispose(); player.dispose(); events.abort();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.isInstancedMesh) object.dispose();
      if (object.material) for (const material of [object.material].flat()) materials.add(material);
    });
    for (const material of materials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const pass of composer.passes) pass.dispose();
    composer.dispose(); renderer.dispose(); renderer.domElement.remove();
  });
}

try { start(); } catch (cause) {
  console.error(cause);
  showError('Impossible de démarrer la scène 3D. Vérifiez que WebGL 2 et l’accélération graphique sont activés.');
  enter.disabled = true;
}


