import * as THREE from 'three';

export const QUALITY_PROFILES = Object.freeze({
  LOW: Object.freeze({ chunkPreloadRadius:160, rooftopDetailDistance:95, neonDistance:110, fakeDetail:false, aiBudget:6, policeVehicles: 2, vehicleSimulationDistance: 80, vehicleHeadlight: false, rain: 450, steam: 100, cars: 10, pedestrians: 0, activityRadius: 110, viewDistance: 205, pixelRatio: 1, bloom: false, lamps: 2, haloDistance: 55, policeLight: false }),
  MEDIUM: Object.freeze({ chunkPreloadRadius:224, rooftopDetailDistance:150, neonDistance:175, fakeDetail:true, aiBudget:12, policeVehicles: 3, vehicleSimulationDistance: 120, vehicleHeadlight: true, rain: 1800, steam: 320, cars: 20, pedestrians: 10, activityRadius: 150, viewDistance: 335, pixelRatio: 1.25, bloom: true, lamps: 4, haloDistance: 80, policeLight: true }),
  HIGH: Object.freeze({ chunkPreloadRadius:288, rooftopDetailDistance:210, neonDistance:250, fakeDetail:true, aiBudget:20, policeVehicles: 4, vehicleSimulationDistance: 175, vehicleHeadlight: true, rain: 4000, steam: 600, cars: 40, pedestrians: 25, activityRadius: 200, viewDistance: 520, pixelRatio: 1.5, bloom: true, lamps: 6, haloDistance: 100, policeLight: true }),
});

export class PerformanceManager {
  constructor(city) {
    this.city = city; this.level = 'MEDIUM'; this.profile = QUALITY_PROFILES.MEDIUM;
    this.fps = 0; this.drawCalls = 0; this.visibleBuildings = 0;
    this.frames = 0; this.elapsed = 0; this.calls = 0; this.triangleSum=0; this.triangles=0;
    this.frustum = new THREE.Frustum(); this.matrix = new THREE.Matrix4(); this.box = new THREE.Box3();
  }
  setLevel(level) {
    this.requestedLevel=level;if(level==='AUTO')level='HIGH';this.autoFactor=1;this.autoElapsed=0;this.autoFrames=0;
    if (!QUALITY_PROFILES[level]) throw new RangeError(`Unknown quality: ${level}`);
    this.level = level; this.profile = QUALITY_PROFILES[level];
    this.frames = this.elapsed = this.calls = this.triangleSum = 0;
    return this.profile;
  }
  adjustAuto(dt){
    if(this.requestedLevel!=='AUTO'||dt<=0||dt>.5)return false;
    this.autoElapsed+=dt;this.autoFrames++;if(this.autoElapsed<4)return false;
    const fps=this.autoFrames/this.autoElapsed,previous=this.autoFactor;this.autoElapsed=0;this.autoFrames=0;
    this.autoFactor=Math.max(.55,Math.min(1,previous+(fps<53?-.05:fps>59?.025:0)));
    if(previous===this.autoFactor)return false;const base=QUALITY_PROFILES.HIGH,f=this.autoFactor;
    this.profile={...base,aiBudget:Math.floor(20*f),rain:Math.round(base.rain*f),cars:Math.round(base.cars*f),pedestrians:Math.round(base.pedestrians*f),viewDistance:base.viewDistance*f,activityRadius:base.activityRadius*f,haloDistance:base.haloDistance*f,chunkPreloadRadius:Math.max(160,288*f)};return true;
  }
  updateVisibility(camera) {
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    this.visibleBuildings = 0;
    for (const chunk of this.city.chunks.values()) {
      const distance = Math.hypot(chunk.x - camera.position.x, chunk.z - camera.position.z);
      chunk.group.visible = distance < this.profile.viewDistance + 46 || chunk.landmarks.length > 0;
      for(const mesh of chunk.group.children)if(mesh.material?.userData.animation)mesh.visible=distance<this.profile.neonDistance;
      if (!chunk.group.visible || chunk.loaded===false) continue;
      for (const building of chunk.buildings) {
        this.box.min.set(building.minX, 0, building.minZ);
        this.box.max.set(building.maxX, building.height + 20, building.maxZ);
        if (this.frustum.intersectsBox(this.box)) this.visibleBuildings++;
      }
    }
  }
  recordFrame(delta, calls, triangles=0) {
    if (delta <= 0 || delta > 0.5) return;
    this.frames++; this.elapsed += delta; this.calls += calls; this.triangleSum+=triangles;
    if (this.elapsed >= 0.75) {
      this.fps = this.frames / this.elapsed; this.drawCalls = this.calls / this.frames; this.triangles=this.triangleSum/this.frames;
      this.frames = this.elapsed = this.calls = this.triangleSum = 0;
    }
  }
}

