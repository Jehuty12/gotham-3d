export class NoiseSystem {
  constructor(capacity=16){this.capacity=capacity;this.events=[];this.sequence=0;}
  emit(position,strength,type,time,rain=0) {
    const event={id:++this.sequence,position:position.clone(),radius:strength*(1-rain*.18),type,expires:time+1.5};
    if(this.events.length===this.capacity)this.events.shift();this.events.push(event);return event;
  }
  hear(position,range,time,lastId=0) {
    return this.events.find(e=>e.id>lastId&&e.expires>time&&position.distanceTo(e.position)<=Math.min(range,e.radius));
  }
  update(time){this.events=this.events.filter(e=>e.expires>time);}
  clear(){this.events.length=0;}
}
