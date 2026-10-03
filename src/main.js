import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ColorGrading } from './rendering/ColorGrading.js';
import { ART_DIRECTION } from './art/ArtDirection.js';
import { warmArtShaders } from './rendering/ShaderWarmup.js';
import { City } from './world/City.js';
import { CityLights } from './lighting/CityLights.js';
import { PlayerController } from './player/PlayerController.js';
import { CITY_SEED } from './world/districts.js';
import { Minimap } from './ui/Minimap.js';
import { VerticalCity } from './systems/VerticalCity.js';
import { GameDirector } from './gameplay/GameDirector.js';
import { LivingCity } from './systems/LivingCity.js';
import { DebugPanel } from './ui/DebugPanel.js';
import { mountInterface, bindSettings } from './ui/Interface.js';
import { WorldRuntime } from './systems/WorldRuntime.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { showFatal } from './ui/FatalScreen.js';
import './style.css';

mountInterface();

const enter = document.querySelector('#enter');
const error = document.querySelector('#error');
function showError(message) { error.textContent = message; error.hidden = false; }

async function start() {
  const loading=new LoadingScreen();loading.phase('Génération des districts',.05);
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
  const city = await City.create(scene,CITY_SEED,(count,total,district)=>loading.phase('Génération des districts',.05+count/total*.5,district));
  loading.phase('Éclairage et trafic',.6);await new Promise(requestAnimationFrame);
  const lights = new CityLights(scene, city);
  const player = new PlayerController(camera, renderer.domElement, city);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), ART_DIRECTION.lighting.bloom, 0.4, ART_DIRECTION.lighting.bloomThreshold));
  const output=new OutputPass();composer.addPass(output);
  const grading=new ColorGrading(renderer,output);
  renderer.info.autoReset = false;
  const living = new LivingCity({ scene, city, camera, renderer, composer, lights });
  const events = new AbortController();
  const options = { signal: events.signal };
  loading.phase('Accès et intérieurs',.75);await new Promise(requestAnimationFrame);
  living.vertical = new VerticalCity(living, player, events.signal);
  loading.phase('Initialisation du gameplay',.9);await new Promise(requestAnimationFrame);
  living.gameplay = new GameDirector(living, player, events.signal);
  const debug = new DebugPanel(living, events.signal);
  bindSettings(living, events.signal);
  const runtime=new WorldRuntime(living,player,events.signal,showError);
  living.session=runtime;
  if(import.meta.env.DEV){const {installDevCommands}=await import('./systems/DevCommands.js');runtime.cleanups.push(installDevCommands(living));}
  living.update(1/30);living.vertical.update(0);living.gameplay.update(0);
  city.resources.materialManager.adoptScene(scene);
  // Warm shader variants and shared textures behind the loading screen, before
  // frame pacing starts. Later residency changes mainly upload instance buffers.
  loading.phase('Préparation graphique',.96);await new Promise(requestAnimationFrame);
  await renderer.compileAsync(scene,camera);
  await warmArtShaders(living,player);
  const initialTextures=new Set();for(const material of city.resources.materialManager.materials.values())for(const value of Object.values(material))if(value?.isTexture)initialTextures.add(value);
  for(const texture of initialTextures)renderer.initTexture(texture);
  composer.render(0);await new Promise(requestAnimationFrame);
  loading.dispose();
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
    const updateStart=performance.now();
    const rawDelta = (now - previous) / 1000; previous = now;
    const delta = runtime.profiler.measure('runtimeUpdate',()=>runtime.update(rawDelta));
    city.collisionWorld.raycasts=0;city.collisionWorld.extraTests=0;
    if(delta>0)living.gameplay.vehicles?.update(delta);
    if(delta>0&&!living.gameplay.vehicles?.driving)player.update(delta);
    if(delta>0){living.update(delta);living.vertical.update(delta);living.gameplay.update(delta);}else{living.update(0);living.gameplay.vehicles?.render(living.gameplay);}
    living.content.update(delta);
    runtime.tutorials.update(delta);
    mapElapsed += Math.min(rawDelta,.1);
    if (mapElapsed > 0.1) { runtime.profiler.measure('minimapUpdate',()=>minimap.draw()); mapElapsed = 0; }
    runtime.profiler.record('update',performance.now()-updateStart);const renderStart=performance.now();
    renderer.info.reset();
    runtime.camera.apply(delta,living,player,runtime.options.settings);
    grading.update(delta,living,runtime.options.settings,runtime.storm.flash);
    if (living.performance.profile.bloom) composer.render(delta); else renderer.render(scene, camera);
    runtime.camera.restore();runtime.profiler.record('render',performance.now()-renderStart);runtime.afterFrame(rawDelta);
    living.performance.recordFrame(rawDelta, renderer.info.render.calls, renderer.info.render.triangles);
    debug.update(Math.min(rawDelta, 0.25));
  });
  if (import.meta.hot) import.meta.hot.dispose(() => {
    renderer.setAnimationLoop(null);
    if (player.controls.isLocked) player.controls.unlock();
    runtime.dispose();living.dispose(); debug.dispose(); player.dispose(); events.abort();
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
    city.resources.dispose();
    for (const pass of composer.passes) pass.dispose();
    composer.dispose(); renderer.dispose(); renderer.domElement.remove();
  });
}

start().catch(cause => {
  showFatal(cause,document.querySelector('#loading-screen')?.textContent??'Initialisation');
  enter.disabled = true;
});
