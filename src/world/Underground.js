import { Group, Color, Vector3 } from 'three';
import { box } from './CollisionWorld.js';

export class Underground {
  constructor(scene,city,interaction,physics,steam) {
    Object.assign(this,{city,interaction,physics});this.group=new Group();this.group.name='underground';this.group.visible=false;scene.add(this.group);
    this.colliders=[];this.loaded=false;this.active=false;
    this.entry={x:-78,y:.24,z:71};this.floor=-8;
    this.zones=[{x:-80,z:64,name:'Station abandonnée'},{x:-48,z:64,name:'Tunnel industriel'},{x:-64,z:82,name:'Collecteur des eaux'},{x:-64,z:98,name:'Maintenance'}];
    const batches=city.resources.batches();
    batches.trim.add(this.entry.x,.3,this.entry.z,2,.15,2);
    batches.windows.add(this.entry.x,.4,this.entry.z,.7,.04,.7,0,new Color('#70bba8'));
    for(const batch of Object.values(batches))batch.build(city.chunkAt(this.entry.x,this.entry.z).group);
    interaction.register({owner:this,bounds:box(this.entry.x,1,this.entry.z,2,2,2),label:'Descendre · réseau technique',use:()=>this.enter()});
    interaction.register({owner:this,context:'underground',bounds:box(-80,-6.7,66.7,2,2.6,.5),label:'Remonter vers les Fonderies',use:()=>this.exit()});
    for(const zone of this.zones)steam.sources.push({...zone,y:-7.8,phase:0,kind:'underground'});
  }
  build() {
    if(this.loaded)return;this.loaded=true;
    const batches=this.city.resources.batches(),color=new Color('#3c5758');
    const add=(x,y,z,w,h,d,mat='stone',collision=true)=>{
      batches[mat].add(x,y,z,w,h,d,0,color);if(collision)this.colliders.push(box(x,y,z,w,h,d,'underground'));
    };
    // One T-shaped connected network, with an opening instead of overlapping walls.
    add(-64,-8.2,64,48,.4,8);add(-64,-8.2,86,8,.4,36);
    add(-64,-3.8,64,48,.4,8);add(-64,-3.8,86,8,.4,36);
    add(-64,-6,60,48,4,.3);add(-88,-6,64,.3,4,8);add(-40,-6,64,.3,4,8);
    add(-78,-6,68,20,4,.3);add(-50,-6,68,20,4,.3);
    add(-68,-6,86,.3,4,36);add(-60,-6,86,.3,4,36);add(-64,-6,104,8,4,.3);
    for(let x=-86;x<-40;x+=4) {
      add(x,-4.6,60.6,3.8,.25,.25,'metal',false);
      batches.windows.add(x,-4.1,64,1.5,.08,.2,0,new Color('#91bba9'));
    }
    for(let z=70;z<104;z+=4) {add(-67.5,-4.8,z,.3,.3,3.8,'metal',false);batches.windows.add(-64,-4.1,z,.2,.08,1.3,0,new Color('#8dac78'));}
    for(const zone of this.zones)add(zone.x,-7.97,zone.z,3,.025,2,'water',false);
    add(-83,-7.4,62,3,.8,.7,'trim');add(-64,-7.4,101,2,1,1,'metal');
    for(const batch of Object.values(batches))batch.build(this.group);
    // Low-cost flicker uses an emissive mesh's visibility, no PointLight.
    this.flicker=this.group.children.find(o=>o.material===this.city.resources.materials.windows);
  }
  enter() {this.build();this.active=true;this.group.visible=true;this.city.collisionWorld.domain=this;this.interaction.context='underground';this.physics.teleport(new Vector3(-80,-8+this.physics.height,65));this.physics.camera.lookAt(-48,-6.2,64);}
  exit() {this.active=false;this.group.visible=false;this.city.collisionWorld.domain=null;this.interaction.context='exterior';this.physics.teleport(new Vector3(this.entry.x,.24+this.physics.height,this.entry.z+1.8));}
  update(time) {if(this.active && this.flicker)this.flicker.visible=Math.sin(time*8)*Math.sin(time*1.7)>-.8;}
}
