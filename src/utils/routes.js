import * as THREE from 'three';

export const LANE_OFFSET = 2.1;
export const TURN_RADIUS = 8;
export function direction(a, b) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
}
export function lanePoint(node, dir, distance) {
  return { x: node.x + dir.x * distance - dir.z * LANE_OFFSET,
    z: node.z + dir.z * distance + dir.x * LANE_OFFSET };
}

export class RoadNetwork {
  constructor(city) {
    this.nodes = []; this.edges = [];
    const spacing = city.config.spacing, extent = city.extent;
    for (let x = -extent + spacing; x < extent; x += spacing) {
      for (let z = -extent + spacing; z < extent; z += spacing) this.nodes.push({ id: `${x},${z}`, x, z, neighbors: [] });
    }
    for (const a of this.nodes) for (const b of this.nodes) {
      if (Math.abs(a.x - b.x) + Math.abs(a.z - b.z) !== spacing) continue;
      a.neighbors.push(b); this.edges.push({ a, b, dir: direction(a, b) });
    }
  }
}

// Rounded corners stay within the intersection, unlike a broad Catmull-Rom overshoot.
export function roundedLoop(points, radius = 5, height = 10.6) {
  const path = new THREE.CurvePath();
  const vector = p => new THREE.Vector3(p.x, height, p.z);
  const corners = points.map((node, i) => {
    const incoming = direction(points[(i + points.length - 1) % points.length], node);
    const outgoing = direction(node, points[(i + 1) % points.length]);
    return { center: vector(node), before: vector({ x: node.x - incoming.x * radius, z: node.z - incoming.z * radius }),
      after: vector({ x: node.x + outgoing.x * radius, z: node.z + outgoing.z * radius }) };
  });
  corners.forEach((corner, i) => {
    path.add(new THREE.QuadraticBezierCurve3(corner.before, corner.center, corner.after));
    path.add(new THREE.LineCurve3(corner.after, corners[(i + 1) % corners.length].before));
  });
  return path;
}
