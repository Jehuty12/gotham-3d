export class DiscoverySystem {
  constructor(points,onDiscover=()=>{}) {this.points=points;this.visited=new Set();this.onDiscover=onDiscover;}
  update(p) {
    for(const point of this.points) {
      if(this.visited.has(point.id))continue;
      if(Math.hypot(p.x-point.x,p.z-point.z)<(point.radius??4) && Math.abs(p.y-point.y)<3) {this.visited.add(point.id);this.onDiscover(point);}
    }
  }
}
