export class PoolRegistry {
  constructor(){this.pools=new Map();}
  register(name,capacity,count){if(this.pools.has(name))throw new Error(`Duplicate pool: ${name}`);this.pools.set(name,{capacity,count});return ()=>this.pools.delete(name);}
  snapshot(){return [...this.pools].map(([name,p])=>({name,capacity:p.capacity,active:p.count()}));}
  clear(){this.pools.clear();}
}
