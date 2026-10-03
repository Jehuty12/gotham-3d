import { deriveSeed } from '../utils/procedural.js';
import { roadRoute } from '../vehicles/RoadVehicleAgent.js';
import { Vector3 } from 'three';

export class MissionRegistry {
  constructor(locations,network,seed=1989){
    this.locations=locations;this.missions=[];
    const at=(kind,id,text,spot='position',extra={})=>({kind,text,...locations.point(id,spot),radius:kind==='inspect'?2.8:kind==='defeat'?14:6,checkpoint:true,...extra});
    const inspect=(id,text,spot)=>at('inspect',id,text,spot);
    const reach=(id,text,spot)=>at('reach',id,text,spot);
    const scan=(id,text,spot)=>at('scan',id,text,spot,{duration:2});
    const fight=(id,text,spot='outside')=>at('defeat',id,text,spot,{count:3});
    const drive=(id,text)=>{
      const l=locations.get(id),route=roadRoute(network,new Vector3(-7,0,32),new Vector3(...l.outside));
      const p=route.at(-1);return {...at('drive',id,text,'outside'),position:[p.x,1.75,p.z],radius:12,vehicleRoute:route.map(p=>p.toArray()),critical:true};
    };
    const routes=id=>({
      STREET:{label:'RUE · accès principal',objectives:[reach(id,'Rejoindre l’accès de rue','outside')]},
      ROOFTOP:{label:'TOIT · échelle / grappin',objectives:[reach(id,'Atteindre le toit par les accès existants','roof')]},
      INTERIOR:{label:'INTÉRIEUR · hall et ascenseur',objectives:[reach(id,'Entrer par le hall ; l’ascenseur offre une sortie en toiture')]},
    });
    const story=(n,title,description,id,objectives,briefing,ending)=>{
      this.missions.push({id:`story-${n}`,kind:'story',title,description,district:locations.get(id).district,start:locations.point(id,'outside'),prerequisites:n===1?[]:[`story-${n-1}`],routes:routes(id),objectives,checkpoints:objectives.map((_,i)=>i),rewards:{points:1,reveal:[id],lore:`lore-${String(n).padStart(2,'0')}`},briefing,ending,targetMinutes:[8,13]});
    };
    story(1,'Les heures effacées','Une opératrice entend des appels pendant des coupures qui n’ont jamais été déclarées.','archive',[
      reach('archive','Rejoindre le toit municipal · échelle ou ascenseur','roof'),
      scan('archive','[V] Lire le signal au bord du toit','roof'),
      at('observe','workshop','Observer les manutentionnaires depuis la rue, sans les approcher','outside',{duration:8,radius:24}),
      inspect('workshop','[E] Examiner le compteur dans l’atelier'),
      fight('workshop','Neutraliser les trois gardiens du chargement'),
      inspect('garage','[E] Transmettre le premier relevé à la radio du garage'),
    ],'Nacre, régie de nuit. On nous demande de fermer des circuits déjà coupés. Ramenez-moi une mesure réelle.','Ces heures ont été vendues deux fois. Quelqu’un efface les preuves entre deux quarts.');
    story(2,'Le programme de minuit','Une représentation annulée relie les ruelles anciennes à la cathédrale.','theatre',[
      inspect('theatre','[E] Lire le programme abandonné dans le théâtre'),
      scan('hotel','[V] Relever la fréquence derrière les clefs de l’hôtel'),
      reach('court','Rejoindre la cour haute près de la cathédrale'),
      at('observe','court','Écouter la répétition du signal depuis le toit','position',{duration:10}),
      inspect('court','[E] Récupérer la bobine dans la cour haute'),
      inspect('theatre','[E] Déposer la bobine au théâtre par la rue ou le toit'),
    ],'Iris, archiviste. Le théâtre projetait les horaires sur ses murs. Les ouvriers y ont caché un autre programme.','Ce n’est pas une panne. Le réseau retire du courant aux adresses qui ont contesté leurs factures.');
    story(3,'Livraison sans chaleur','Un stock de relais traverse les fonderies et le réseau technique.','foundry',[
      inspect('foundry','[E] Examiner les caisses derrière la porte du hangar'),
      scan('foundry','[V] Mesurer la machine dans l’entrepôt'),
      reach('foundry','Rejoindre la passerelle de maintenance sur le toit','roof'),
      reach('station','Descendre par la trappe industrielle : X −78, Z 71'),
      inspect('tunnel','[E] Relever le numéro de la soupape'),
      inspect('maintenance','[E] Comparer les ordres dans le bureau souterrain'),
      fight('workshop','Remonter et sécuriser les compteurs de l’atelier'),
    ],'Nacre. Les relais ont quitté la fonderie sans bordereau. La vapeur couvre leurs traces, pas leur consommation.','Le refroidissement des docks masque un poste d’aiguillage électrique.');
    story(4,'Le manifeste des Brumes','Suivre une livraison depuis les quais avant son départ.','coldstore',[
      inspect('coldstore','[E] Photographier le manifeste à l’intérieur du hangar'),
      reach('crane','Monter sur la grue par son échelle de maintenance'),
      scan('crane','[V] Repérer le convoi entre les conteneurs'),
      reach('garage','Rejoindre NIGHTRIDER au garage'),
      drive('coldstore','Conduire NIGHTRIDER jusqu’à la route des quais'),
      at('vehicle','coldstore','Suivre le convoi dans NIGHTRIDER pendant huit secondes','outside',{vehicleType:'follow',critical:true}),
      inspect('coldstore','[E] Déposer les plaques du convoi dans le hangar'),
    ],'Iris. Le manifeste parle de glace. La grue ne soulève que du cuivre. Prenez de la hauteur, puis prenez la route.','Une seule tour reçoit toutes ces lignes. Meridian.');
    story(5,'Les hautes lignes','Relier les toits pour atteindre la couronne de Meridian.','meridian',[
      inspect('meridian','[E] Lire le plan des relais dans le hall'),
      reach('relay','Monter au Relais des Sept Nuits par l’échelle ou le grappin'),
      scan('relay','[V] Calibrer le relais inférieur'),
      at('traverse','works','[G] Rejoindre le toit voisin ; utiliser un ancrage ou planer','position',{traversal:'either',radius:7}),
      inspect('works','[E] Récupérer le shunt sur le chantier suspendu'),
      reach('meridian','Atteindre la couronne par le hall / ascenseur ou les ancrages','roof'),
      scan('meridian','[V] Retracer la ligne maîtresse depuis la couronne','roof'),
    ],'Nacre. Deux relais voisins peuvent isoler Meridian sans éteindre les logements. Gardez les accès de secours en tête.','Le registre public est sous la ville. La tour n’en est que la signature.');
    story(6,'Le dernier circuit','Une ancienne ligne de métro protège une archive que personne ne doit voir.','observatory',[
      inspect('observatory','[E] Consulter le tableau des départs dans l’observatoire'),
      reach('depot','Rejoindre le quai aérien du dépôt des Lignes Basses'),
      at('observe','depot','Surveiller la ligne sans monter sur les voies','position',{duration:12}),
      inspect('station','[E] Retrouver le journal du dernier train sous terre'),
      inspect('collector','[E] Ouvrir la boîte étanche du collecteur'),
      inspect('archive','[E] Comparer les signatures aux archives municipales'),
    ],'Iris. Le métro portait les horaires, mais aussi les plaintes. Trouvez ce que le dernier conducteur a laissé.','Les habitants ont conservé leurs doubles. Il nous reste à rétablir le circuit de preuve.');
    story(7,'La ville témoigne','Livrer les preuves et couper le réseau clandestin sans couper la ville.','archive',[
      reach('garage','Récupérer NIGHTRIDER et le dossier au garage'),
      drive('workshop','Livrer le dossier à l’atelier en NIGHTRIDER'),
      at('vehicle','workshop','Semer la patrouille qui a repéré le dossier','outside',{vehicleType:'evade',critical:true}),
      inspect('workshop','[E] Assembler les preuves à l’intérieur de l’atelier'),
      inspect('maintenance','[E] Isoler la ligne clandestine au sous-sol'),
      inspect('archive','[E] Préparer la transmission dans le bâtiment municipal'),
      reach('archive','Prendre l’ascenseur ou l’échelle jusqu’au toit municipal','roof'),
      fight('archive','Neutraliser les gardiens de l’émetteur','roof'),
      inspect('archive','[E] Diffuser les registres depuis le toit','roof'),
    ],'Nacre. Nous avons les noms et les mesures. Faites trois copies. Une au garage, une aux archives, une à toute la ville.','Iris. Les lumières reviennent quartier par quartier. Cette fois, les heures manquantes ont des témoins. Merci.');
    const sides=[
      ['Les toits se souviennent','court',[scan('court','[V] Lire les empreintes du relais'),inspect('hotel','[E] Comparer le carnet de l’hôtel')]],
      ['Numéro de série','coldstore',[drive('coldstore','Rejoindre les quais en NIGHTRIDER'),at('vehicle','coldstore','Intercepter le véhicule à moins de neuf mètres','outside',{vehicleType:'intercept',critical:true})]],
      ['Les portes muettes','foundry',[inspect('foundry','[E] Lire la note laissée dans le hangar'),fight('foundry','Sécuriser la sortie du hangar')]],
      ['Une voix sans adresse','observatory',[scan('observatory','[V] Isoler le signal dans le poste'),inspect('depot','[E] Relever la plaque du quai')]],
      ['Niveau des eaux','workshop',[inspect('collector','[E] Mesurer la marque des eaux'),inspect('tunnel','[E] Vérifier la soupape de délestage')]],
      ['Dernière veille','theatre',[reach('court','Rejoindre le poste haut'),at('observe','court','Veiller sur les ruelles depuis le toit','position',{duration:15})]],
      ['Retour de quart','garage',[drive('workshop','Rejoindre l’atelier en véhicule'),at('vehicle','workshop','Échapper à la poursuite','outside',{vehicleType:'evade',critical:true})]],
      ['Exercice des Veilleurs','archive',[inspect('station','[E] Relever la balise de simulation'),reach('archive','Rejoindre le point de rassemblement','outside'),inspect('archive','[E] Valider le compte rendu de l’exercice')]],
    ];
    sides.forEach(([title,id,objectives],i)=>{
      const variant=deriveSeed(seed,'side-content',i)%2;
      this.missions.push({id:`side-${i+1}`,kind:'side',title,description:'Une intervention indépendante pour les habitants. Rejouable sans gain supplémentaire.',district:locations.get(id).district,start:locations.point(id,'outside'),prerequisites:[],routes:{STREET:{label:'RUE',objectives:[reach(id,'Rejoindre le point de contact','outside')]},ROOFTOP:{label:'TOIT',objectives:[reach(id,'Retrouver le contact en hauteur',locations.get(id).roof?'roof':locations.get(id).tags.includes('ROOFTOP')?'position':'outside')]}},objectives:variant&&i===0?[...objectives].reverse():objectives,variant,rewards:{points:1,reveal:[id]},checkpoints:objectives.map((_,n)=>n),briefing:`Iris. ${title} : une équipe attend votre relevé.`,ending:'Le relevé est transmis. Une adresse de moins laissée dans le noir.',targetMinutes:[5,10]});
    });
    for(const mission of this.missions)for(const o of mission.objectives)if(o.kind==='vehicle'&&o.vehicleType!=='evade'){
      const shift=mission.kind==='side'?(deriveSeed(seed,mission.id)%2)*64:0;
      o.vehicleLoop=[{x:64+shift,z:128},{x:128+shift,z:128},{x:128+shift,z:192},{x:64+shift,z:192}];
    }
    this.byId=new Map(this.missions.map(m=>[m.id,m]));
  }
  get(id){return this.byId.get(id);}
}
