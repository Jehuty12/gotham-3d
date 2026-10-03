# Content & Level Design V9 — Les heures effacées

## Intention

Nacre, opératrice de la régie de nuit, reçoit des appels pendant des coupures absentes des registres. Iris, archiviste, a conservé les doubles des habitants. Le joueur remonte un circuit de délestage clandestin : théâtre, fonderie, docks, relais de Meridian, métro et archives municipales. La conclusion rétablit la diffusion des preuves, sans personnage sous licence ni boss supplémentaire.

La campagne comporte sept missions, et huit interventions indépendantes sont rejouables. La cible de conception est 60–90 minutes pour une première campagne et 5–10 minutes par intervention. **Ces durées demandent un playtest humain ; les tests accélérés ne les mesurent pas.** Il n'y a pas de temporisation artificielle destinée à atteindre cette durée.

## Jouer

- Choisir VIGILANTE, puis **TAB → MISSIONS**. Sélectionner une mission disponible et une approche RUE / TOIT / INTÉRIEUR. Les principales se débloquent dans l'ordre ; les secondaires sont disponibles indépendamment.
- **E** examine les pièces et archives proches ; **V** active le scanner à pied ; **G / clic droit** utilise le grappin ; le planage et les commandes de conduite restent ceux de V8. Les objectifs décrivent l'action attendue.
- **TAB** ouvre carte et journal en pause. Le bouton REPRENDRE rend la souris au jeu ; Échap referme le journal et conserve la pause. Les missions procédurales historiques restent sur **M** lorsqu'aucune mission narrative n'est active.
- Chaque objectif validé crée un checkpoint. La pause et le journal proposent **RESTART CHECKPOINT / RESTART MISSION**. Une mise hors combat ou un convoi perdu trop longtemps reprend le checkpoint. Les preuves déjà découvertes restent acquises.
- Le voyage rapide relie cinq refuges découverts : garage, théâtre, atelier, hangar et archives. Il est refusé pendant une mission, une poursuite ou un combat proche. Le voyage charge la destination avant de rendre le contrôle.
- OPTIONS propose **MISSION GUIDANCE : OFF / MINIMAL / FULL**. OFF conserve les instructions textuelles ; MINIMAL ajoute la destination sur la carte et la mini-carte ; FULL ajoute le marqueur dans le monde et la distance.
- En Exploration, les missions sont suspendues. **DISCOVERIES ONLY**, désactivé par défaut, permet de découvrir les lieux et archives sans ennemi imposé par le contenu V9.

## Missions principales

| Mission | Quartier principal | Séquence conçue | Approches |
| --- | --- | --- | --- |
| 01 — Les heures effacées | Industrial / municipal | Toit municipal, scanner, observation des manutentionnaires, atelier, trois gardiens, radio du garage | Accès municipal par rue, toit ou hall |
| 02 — Le programme de minuit | Old Gotham | Programme du théâtre, clefs de l'hôtel, cour haute près de la cathédrale, écoute et bobine | Rue, échelle de toiture ou passage intérieur |
| 03 — Livraison sans chaleur | Industrial | Caisses, machine, passerelle de toiture, station souterraine, vanne, bureau technique, sortie de l'atelier | Rue, toit ou intérieur de la fonderie |
| 04 — Le manifeste des Brumes | Docks | Hangar, grue, scanner, NIGHTRIDER, livraison routière et suivi du convoi | Quai, toiture ou intérieur du hangar |
| 05 — Les hautes lignes | Downtown | Hall Meridian, relais haut, traversée par grappin/planage vers le toit voisin, shunt, couronne | Rue, toiture ou hall / ascenseur |
| 06 — Le dernier circuit | Downtown / réseau technique | Observatoire, quai aérien, surveillance, station abandonnée, collecteur, signatures municipales | Rue, toit ou hall de l'observatoire |
| 07 — La ville témoigne | Plusieurs quartiers | NIGHTRIDER, livraison, poursuite, atelier, sous-sol, archives, ascenseur ou échelle, combat en toiture, transmission | Trois accès au bâtiment municipal |

Les approches changent le chemin d'entrée puis convergent vers les mêmes preuves. Les toits difficiles gardent les accès V4 et les ascenseurs. La traversée Relais → Chantier utilise deux toits voisins, une différence de hauteur modérée et un ancrage existant vérifié à moins de 55 mètres avec ligne de vue. La couronne de Meridian reste accessible par ascenseur ; elle n'impose pas un saut irréalisable depuis le sol.

## Interventions secondaires

| Intervention | Activité |
| --- | --- |
| Les toits se souviennent | Enquête de toiture et carnet de l'hôtel |
| Numéro de série | Conduite puis interception sur une boucle des docks |
| Les portes muettes | Infiltration d'entrepôt et sécurisation de la sortie |
| Une voix sans adresse | Signal perdu et plaque du quai |
| Niveau des eaux | Inspection du collecteur et d'une vanne |
| Dernière veille | Poste d'observation des ruelles |
| Retour de quart | Livraison et fuite d'une poursuite |
| Exercice des Veilleurs | Simulation de secours et point de rassemblement |

Des sous-seeds fixent l'ordre de certains relevés et le bloc utilisé par un convoi secondaire. Les routes principales restent fixes avec CITY_SEED = 1989. Une reprise de secondaire ne verse pas une seconde récompense.

## Dix-huit lieux

Huit intérieurs existants deviennent Maison des Veilles, Chambre des relais de Meridian, Théâtre des Marées, Hôtel Sélénite, Observatoire des Traverses, Fonderie des Courants, Atelier du Dernier Quart et Hangar des Brumes. Les quatre zones techniques deviennent Station des Retards, Galerie des Soupapes, Collecteur des Échos et Bureau sous la Pluie. Six lieux extérieurs complètent le parcours : Garage des Veilleurs, Cour des Veilleurs, Relais des Sept Nuits, Chantier des Hautes Lignes, Grue du Dernier Départ et Dépôt des Lignes Basses.

Chaque lieu a une identité, une note courte, des tags et des positions distinctes pour l'accès et l'objectif. Les compositions utilisent archives, établis, relais et équipements démontés dans des lots réutilisés. Le bureau de maintenance découvre un raccourci vers l'atelier en réutilisant la sortie du domaine souterrain.

Vingt pièces textuelles — rapports, photos décrites, affiches, notes, archives et enregistrements — composent le journal LORE. Dix secrets sont placés hors du passage principal, dans des loges, caches, toits et bureaux. Ils n'ont aucun marqueur de carte avant découverte. Les photos sont décrites en texte, sans téléchargement d'images.

## Progression

Une première réussite rapporte un point, parfois une archive et une adresse révélée. Aucun gain répété ni monnaie supplémentaire.

| Amélioration | Coût | Effet |
| --- | ---: | --- |
| Gilet de quart | 2 | Santé maximale 110 |
| Mémoire du scanner | 1 | Impulsion de cinq secondes |
| Antenne accordée | 1 | Portée de 65 mètres |
| Treuil révisé | 2 | Recharge de 0,12 seconde |
| Récupération moteur | 2 | Boost : 20 unités/seconde au lieu de 24 |
| Signal ambre | 1 | Accent ambre du HUD de contenu et du journal |

Les petites communications passent par AudioManager. La queue est limitée à six lignes, sans voix synthétique. Un seul événement ponctuel peut être actif : délestage local, alerte radio, arrêt de régulation du métro ou averse renforcée. Ils réutilisent les systèmes existants et restaurent leur modification temporaire.

## Intégration et limites

Le contenu est distinct du générateur : LocationRegistry décrit les ancrages physiques, MissionRegistry contient les séquences écrites, StoryMission porte l'état, ContentManager raccorde les actions aux systèmes existants. Les ennemis utilisent le pool historique de vingt acteurs ; les combats narratifs ont lieu dans les espaces extérieurs existants. Les approches intérieures privilégient infiltration et examen des preuves.

SAVE_VERSION = 2 conserve la clef localStorage historique. La migration V1 ajoute une progression narrative vide sans perdre la position, la voiture, les options ou les missions historiques. Les checkpoints sont dérivés des objectifs connus ; les tableaux sont bornés et les identifiants inconnus rejetés à la restauration. Nouvelle partie efface missions, archives, secrets, points, upgrades et refuges V9, tout en conservant les options.

Les données descriptives sont petites et résident en mémoire ; aucune scène de mission complète ni ressource de dialogue multimédia n'est préchargée. Le décor actif utilise deux buffers fixes, réécrits pour les lieux proches dans les chunks chargés et le domaine courant. Les intérieurs gardent leur cache de deux entrées. Les messages, effets transitoires et marqueurs sont bornés.

Le content-check contrôle positions, sols, capsules, identifiants, domaines, streaming, routes routières et un lien de toiture. Il ne prouve pas à lui seul la qualité des parcours humains. Les walkthroughs automatisés simulent déplacements et résultats de combat ; ils valident progression et persistance, sans certifier le temps de jeu ou l'équilibrage de toute la campagne.
