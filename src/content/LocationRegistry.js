import { selectAccessibleRoofs, generateInteriors } from '../interiors/InteriorGenerator.js';

export const LOCATION_TYPES = Object.freeze(['LANDMARK','SECRET','LORE','MISSION_LOCATION','ROOFTOP']);
const interiors = [
  ['archive','Maison des Veilles','Les registres ont des pages neuves au milieu des anciennes.'],
  ['meridian','Meridian · Chambre des relais','Sept relais alimentent la couronne, mais un huitième câble descend au sous-sol.'],
  ['theatre','Théâtre des Marées','Une affiche annonce une représentation à une heure qui ne figure sur aucune horloge.'],
  ['hotel','Hôtel Sélénite','Les clefs de chambres vides portent toutes le même numéro de dépôt.'],
  ['observatory','Observatoire des Traverses','Les voyageurs ont transformé le poste de contrôle en observatoire des lumières.'],
  ['foundry','Fonderie des Courants','Des caisses froides portent les traces chaudes des machines.'],
  ['workshop','Atelier du Dernier Quart','Un établi abrite des compteurs sauvés de la destruction.'],
  ['coldstore','Hangar des Brumes','La livraison ne contient rien de périssable. Pourquoi payer le froid ?'],
];

// Semantic anchors bind authored content to existing access geometry, never to
// graphics quality. Positions use eye height, including underground locations.
export class LocationRegistry {
  constructor(city, vertical = {}) {
    this.city = city;
    this.roofs = vertical.roofs ?? selectAccessibleRoofs(city);
    this.specs = vertical.specs ?? generateInteriors(city, this.roofs);
    this.locations = this.specs.map((s,i) => {
      const [id,name,note]=interiors[i],b=s.building;
      return {id,name,note,district:b.districtId,type:b.landmark?'LANDMARK':'MISSION_LOCATION',
        position:[b.x,1.99,b.z+s.depth/2-3],outside:[s.entrance.x,1.99,s.entrance.z+1.6],
        roof:[b.x,s.roofY+1.8,b.z+(b.roofDepth??b.depth)/2-1.3],
        domain:s.id,interiorId:s.id,discovered:false,tags:['INTERIOR','MISSION',...(b.landmark?['LANDMARK']:[])],safe:['archive','theatre','workshop','coldstore'].includes(id)};
    });
    for(const [id,name,x,z,note] of [
      ['station','Station des Retards',-80,64,'Le dernier train a laissé un journal daté du lendemain.'],
      ['tunnel','Galerie des Soupapes',-48,64,'Les vannes tournent vers le quartier qui manque déjà de courant.'],
      ['collector','Collecteur des Échos',-64,82,'Des numéros de portes sont gravés au-dessus du niveau des eaux.'],
      ['maintenance','Bureau sous la Pluie',-64,98,'Une chaise sèche fait face à un mur de relevés humides.'],
    ]) this.locations.push({id,name,note,district:'industrial',type:'MISSION_LOCATION',position:[x,-6.25,z],outside:[-78,1.99,72.8],domain:'underground',tags:['UNDERGROUND','MISSION'],discovered:false});
    const roof=(id,name,x,z,note)=>{
      const b=this.roofs.find(b=>b.x===x&&b.z===z);if(!b)throw Error(`Missing authored roof ${id}`);
      return {id,name,note,district:b.districtId,type:'ROOFTOP',position:[x,(b.roofY??b.height)+1.95,z+(b.roofDepth??b.depth)/2-1.3],
        outside:[x+4.5,1.99,b.maxZ+1.8],domain:'exterior',tags:['ROOFTOP','MISSION'],discovered:false};
    };
    const old=this.roofs.filter(b=>b.districtId==='old'&&!b.landmark).sort((a,b)=>Math.hypot(a.x+32,a.z+96)-Math.hypot(b.x+32,b.z+96))[0];
    const dock=[...city.chunks.values()].find(c=>c.waterfront),crane=[dock.x,23.75,dock.z-12];
    this.locations.push(
      {id:'garage',name:'Garage des Veilleurs',note:'Un moteur réparé, une radio branchée sur les urgences oubliées.',district:'industrial',type:'MISSION_LOCATION',position:[-7,1.75,35.5],outside:[-7,1.75,35.5],domain:'exterior',safe:true,tags:['MISSION'],discovered:false},
      roof('court','Cour des Veilleurs',old.x,old.z,'Des fils de cuivre relient la cathédrale aux fenêtres condamnées.'),
      roof('relay','Relais des Sept Nuits',87.5,-168.5,'Le signal est plus ancien que son antenne.'),
      roof('works','Chantier des Hautes Lignes',104.5,-168.5,'Un pont inachevé sépare deux équipes qui ne se parlent plus.'),
      {id:'crane',name:'Grue du Dernier Départ',note:'Le carnet de quart annonce des cargaisons sans navire.',district:'docks',type:'ROOFTOP',position:vertical.routes?.crane?[vertical.routes.crane.x,vertical.routes.crane.y,vertical.routes.crane.z]:crane,outside:[dock.x+2,1.99,dock.z-9],domain:'exterior',tags:['ROOFTOP','MISSION'],discovered:false},
      {id:'depot',name:'Dépôt des Lignes Basses',note:'Une pancarte manuscrite : ne coupez pas le dernier circuit.',district:'downtown',type:'MISSION_LOCATION',position:[64,12.25,-124.8],outside:[45.9,1.99,-118.1],domain:'exterior',tags:['MISSION'],discovered:false},
    );
    this.byId=new Map(this.locations.map(l=>[l.id,l]));
  }
  get(id){const location=this.byId.get(id);if(!location)throw Error(`Unknown content location: ${id}`);return location;}
  point(id,spot='position') {const l=this.get(id);return {locationId:id,position:[...(l[spot]??l.position)],domain:spot==='outside'||spot==='roof'?'exterior':l.domain};}
  discover(id){const l=this.get(id);if(l.discovered)return false;l.discovered=true;return true;}
  restore(ids=[]){const found=new Set(ids);for(const l of this.locations)l.discovered=found.has(l.id);}
}
