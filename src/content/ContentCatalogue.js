const archiveTexts=[
  ['rapport','Un quart absent','Le compteur municipal enregistre vingt-cinq heures. La feuille de service en déclare vingt-quatre.','archive'],
  ['affiche','Dernière représentation','Le Théâtre des Marées ferme à minuit. Une correction au crayon ajoute : « Nous restons pour ceux qui travaillent. »','theatre'],
  ['rapport','Livraison 08','Poids facturé : cuivre. Température demandée : négative. Destination rayée deux fois.','foundry'],
  ['photo','Un quai sans navire','Sur cette photo fictive, trois camions attendent une grue, mais aucune coque ne longe le quai.','coldstore'],
  ['note','Le huitième câble','Sept gaines montent. La dernière descend. Ne suivez pas les numéros peints.','meridian'],
  ['archive','Copie carbone','Le conducteur a gardé les plaintes sous son siège. Chaque signature correspond à une coupure.','station'],
  ['enregistrement','Les voix reviennent','Nacre : « Les adresses répondent. Vous pouvez garder la radio allumée. »','garage'],
  ['note','Clef 014','Ne pas rendre la clef au comptoir. La chambre sert aux relayeurs du théâtre.','hotel'],
  ['photo','Ligne d’horizon','Une image fictive annotée relie deux antennes voisines. La plus basse regarde la plus haute.','relay'],
  ['rapport','Charge suspendue','Le chantier est fermé sur le papier. Ses outils sont encore tièdes.','works'],
  ['note','Ne rien jeter','Les compteurs cassés gardent parfois les mesures que les neufs ont oubliées.','workshop'],
  ['archive','Ville haute','Le poste des Traverses a pris le nom d’observatoire le jour où les horaires ont cessé d’être fiables.','observatory'],
  ['rapport','Soupape inversée','La flèche de maintenance a été repeinte. La vanne fonctionne, c’est la destination qui a changé.','tunnel'],
  ['photo','Marque des eaux','Une photo fictive montre des numéros de portes gravés juste au-dessus de la dernière crue.','collector'],
  ['note','Chaise sèche','Quelqu’un vient ici chaque nuit. Il essuie seulement la chaise et laisse le reste à la pluie.','maintenance'],
  ['enregistrement','Trois coups','Un gardien de la cour répond par trois coups quand le théâtre perd sa lumière.','court'],
  ['rapport','Dernier départ','Le carnet de grue conserve un voyage annulé. La cargaison est partie quand même.','crane'],
  ['affiche','Service maintenu','Une main a ajouté sous le panneau du dépôt : « Tant qu’une fenêtre reste allumée. »','depot'],
  ['archive','Les doubles','Chaque habitant avait une copie. Il suffisait de les mettre côte à côte.','archive'],
  ['enregistrement','La première veille','Iris : « Nous ne cherchons pas un héros. Nous cherchons quelqu’un qui reste jusqu’à la relève. »','theatre'],
];
export function createCatalogue(locations){
  const lore=archiveTexts.map(([type,title,text,id],i)=>({id:`lore-${String(i+1).padStart(2,'0')}`,type,title,text,...locations.point(id),offset:i>=18?1.4:0}));
  // No undiscovered secret is returned by mapEntries. Their physical traces are
  // inspectable only nearby, with no distant marker or notification beforehand.
  const ids=['theatre','hotel','archive','coldstore','relay','works','station','tunnel','collector','maintenance'];
  const names=['Loge condamnée','Bureau des clefs','Dossier sous la mezzanine','Cache du froid','Veille au-dessus des nuages','Pièce de rechange','Casier du conducteur','Registre de vanne','Boîte au sec','Bureau oublié'];
  const secrets=ids.map((id,i)=>{
    const l=locations.get(id),spot=l.roof&&i%2===0?'roof':'position',point=locations.point(id,spot);
    point.position[0]+=(i%2?1.2:-1.2);
    return {id:`secret-${i+1}`,title:names[i],text:'Une trace conservée à l’écart du passage. Les Veilleurs ont maintenant son adresse.',...point};
  });
  return {lore,secrets};
}
