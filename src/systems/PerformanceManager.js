import * as THREE from 'three';

export const QUALITY_PROFILES = Object.freeze({
  LOW: Object.freeze({ rain: 450, steam: 100, cars: 10, pedestrians: 0, activityRadius: 110, viewDistance: 205, pixelRatio: 1, bloom: false, lamps: 2, haloDistance: 55, policeLight: false }),
  MEDIUM: Object.freeze({ rain: 1800, steam: 320, cars: 20, pedestrians: 10, activityRadius: 150, viewDistance: 335, pixelRatio: 1.25, bloom: true, lamps: 4, haloDistance: 80, policeLight: true }),
  HIGH: Object.freeze({ rain: 4000, steam: 600, cars: 40, pedestrians: 25, activityRadius: 200, viewDistance: 520, pixelRatio: 1.5, bloom: true, lamps: 6, haloDistance: 100, policeLight: true }),
});

export class PerformanceManager {
  constructor(city) {
    this.city = city; this.level = 'MEDIUM'; this.profile = QUALITY_PROFILES.MEDIUM;
    this.fps = 0; this.drawCalls = 0; this.visibleBuildings = 0;
    this.frames = 0; this.elapsed = 0; this.calls = 0; this.triangleSum=0; this.triangles=0;
    this.frustum = new THREE.Frustum(); this.matrix = new THREE.Matrix4(); this.box = new THREE.Box3();
  }
  setLevel(level) {
    if (!QUALITY_PROFILES[level]) throw new RangeError(`Unknown quality: ${level}`);
    this.level = level; this.profile = QUALITY_PROFILES[level];
    this.frames = this.elapsed = this.calls = this.triangleSum = 0;
    return this.profile;
  }
  updateVisibility(camera) {
    camera.updateMatrixWorld();
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    this.visibleBuildings = 0;
    for (const chunk of this.city.chunks.values()) {
      const distance = Math.hypot(chunk.x - camera.position.x, chunk.z - camera.position.z);
      chunk.group.visible = distance < this.profile.viewDistance + 46 || chunk.landmarks.length > 0;
      if (!chunk.group.visible) continue;
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
