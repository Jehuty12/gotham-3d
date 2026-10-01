import { Interior } from '../interiors/Interior.js';

// Compile the finite lighting combinations behind the loading screen. New
// interiors share these materials; entering one must not discover its shader.
export async function warmArtShaders(living,player){
  const {scene,renderer,camera,composer,vertical,city}=living;
  const room=new Interior(vertical.specs[0],city.resources,vertical.interaction,player.physics,()=>{},()=>{});
  room.group.visible=false;scene.add(room.group);vertical.underground.build();
  const lights=[...living.lights.localLights,living.traffic.eventLight];
  const visible=lights.map(light=>light.visible),target=renderer.getRenderTarget();
  try {
    for(const count of [0,1,3,5,7]){
      lights.forEach((light,i)=>{light.visible=i<count;});
      // LOW draws directly; the other profiles use the existing HDR compositor.
      renderer.setRenderTarget(count===3?null:composer.readBuffer);
      await renderer.compileAsync(scene,camera);
    }
  } finally {
    lights.forEach((light,i)=>{light.visible=visible[i];});renderer.setRenderTarget(target);
    room.dispose(vertical.interaction);
  }
}
