import * as THREE from 'three';
import { deriveSeed } from '../utils/procedural.js';
import { DynamicInstances } from '../utils/DynamicInstances.js';

export class TrafficLights {
  constructor(scene, city) {
    this.seed = city.seed; this.time = 0;
    this.signals = [...city.chunks.values()].flatMap(c => c.trafficSignals);
    this.bulbs = new DynamicInstances(scene, city.resources.box,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }), this.signals.length * 3);
    this.colors = { red: new THREE.Color('#ff362a'), amber: new THREE.Color('#ffbd43'), green: new THREE.Color('#69e0ac'), off: new THREE.Color('#172027') };
  }
  phase(node, time = this.time) { return (time + deriveSeed(this.seed, 'signal', node.x, node.z) % 34) % 34; }
  state(node, axis, time = this.time) {
    const phase = this.phase(node, time);
    if (axis === 'z') return phase < 12 ? 'green' : phase < 15 ? 'amber' : 'red';
    return phase >= 17 && phase < 29 ? 'green' : phase >= 29 && phase < 32 ? 'amber' : 'red';
  }
  canEnter(node, dir) { return this.state(node, dir.x === 0 ? 'z' : 'x') === 'green'; }
  update(time, player, distance = 180) {
    this.time = time; this.bulbs.begin();
    for (const signal of this.signals) {
      if ((signal.x - player.x) ** 2 + (signal.z - player.z) ** 2 > distance ** 2) continue;
      const active = this.state({ x: signal.nodeX, z: signal.nodeZ }, signal.axis);
      ['red', 'amber', 'green'].forEach((color, i) => {
        const east = signal.axis === 'x';
        this.bulbs.add(signal.x + (east ? 0.27 : 0), 4.25 - i * 0.35, signal.z + (east ? 0 : 0.27),
          east ? 0.06 : 0.22, 0.22, east ? 0.22 : 0.06, 0, this.colors[active === color ? color : 'off']);
      });
    }
    this.bulbs.end();
  }
}
