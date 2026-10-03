import { Scene, PerspectiveCamera, Vector3 } from 'three';
import { City } from '../src/world/City.js';
import { CollisionWorld } from '../src/world/CollisionWorld.js';
import { PlayerPhysics } from '../src/player/PlayerPhysics.js';
import { PlayerInteraction } from '../src/player/PlayerInteraction.js';
import { GrappleSystem } from '../src/player/GrappleSystem.js';
import { selectAccessibleRoofs, generateInteriors } from '../src/interiors/InteriorGenerator.js';
import { InteriorManager } from '../src/interiors/InteriorManager.js';
import { VerticalRoutes } from '../src/world/VerticalRoutes.js';
import { Underground } from '../src/world/Underground.js';
import { ElevatedRail } from '../src/world/ElevatedRail.js';
import { RoadNetwork } from '../src/utils/routes.js';
import { DiscoverySystem } from '../src/systems/DiscoverySystem.js';
import { GameDirector } from '../src/gameplay/GameDirector.js';
import { ContentManager } from '../src/content/ContentManager.js';
import { ChunkStreamingManager } from '../src/world/ChunkStreamingManager.js';
import { normalizeSettings } from '../src/save/SaveSchema.js';
import { WorldPersistence } from '../src/save/WorldPersistence.js';

export function contentFixture(){
  const scene=new Scene(),city=new City(scene),camera=new PerspectiveCamera(72);camera.position.set(0,1.75,54);city.collisionWorld=new CollisionWorld(city);
  const physics=new PlayerPhysics(camera,city.collisionWorld),interaction=new PlayerInteraction(camera,city.collisionWorld);
  const player={physics,camera,keys:new Set(),wish:new Vector3(),controls:{pointerSpeed:.65,isLocked:true},resetInput(){this.keys.clear();},onAction(){}};
  const rail=new ElevatedRail(scene,city),roofs=selectAccessibleRoofs(city),specs=generateInteriors(city,roofs),steam={sources:[]};
  const vertical={player,roofs,specs,interaction,routes:new VerticalRoutes(city,roofs,rail,interaction,physics),interiors:new InteriorManager(scene,city,specs,interaction,physics),underground:new Underground(scene,city,interaction,physics,steam),discoveries:new DiscoverySystem([]),prompt:{},notify(){}};
  vertical.grapple=new GrappleSystem(camera,physics,vertical.routes.grapplePoints);
  const living={scene,city,camera,vertical,rail,performance:{level:'HIGH',profile:{art:{near:100}}},rain:{enabled:true,intensity:1,setIntensity(v){this.intensity=v;}},traffic:{cars:[],count:0,network:new RoadNetwork(city)},audio:{},lights:{lastPosition:new Vector3()}};
  living.gameplay=new GameDirector(living,player,undefined,{ui:false});
  const options={settings:normalizeSettings({}),capture(){return this.settings;},apply(s){this.settings=normalizeSettings(s);}};
  const content=new ContentManager(living,player,{ui:false});
  const streaming=new ChunkStreamingManager(city);living.runtime={options,streaming,save:{request(){}},transitions:{trigger(){}}};
  return {living,player,content,options,persistence:new WorldPersistence(living,player,options),dispose(){content.dispose();vertical.interiors.dispose();streaming.dispose();living.gameplay.dispose();city.dispose();}};
}
