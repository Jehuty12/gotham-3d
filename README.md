# World Polish & Persistence — V7

V7 conserve les systèmes V2 à V6 et ajoute une sauvegarde locale versionnée, une reprise sécurisée, le streaming effectif des instances et collisions, une vraie pause et des réglages d’accessibilité. Le monde reste déterministe : **CITY_SEED = 1989, quatre quartiers, 64 chunks logiques, 210 bâtiments et trois landmarks**.

## Sauvegarde, menu et pause

**NOUVELLE PARTIE** utilise le mode EXPLORATION ou VIGILANTE choisi dans le menu. Une confirmation est demandée seulement si une sauvegarde valide sera remplacée. **CONTINUER** apparaît uniquement lorsqu’une sauvegarde valide existe. Échap ouvre **REPRENDRE / OPTIONS / SAUVEGARDER / RETOUR AU MENU**. La pause arrête physique, IA, circulation, train et temps météo ; le rendu et la file de streaming restent disponibles. Les touches et accumulateurs sont réinitialisés à la reprise.

La sauvegarde `localStorage['world-polish:save']`, `SAVE_VERSION = 1`, contient position/orientation, mode, santé, point sûr, découvertes, landmarks visités, missions terminées et mission active, événements résolus liés aux missions, réglages et NIGHTRIDER (position, rotation, intégrité, boost, caméra, garage). Les petits crimes et l’IA sont reconstruits, pas sérialisés. Les identifiants de progression sont dédupliqués et limités à 512 entrées par catégorie. Une future migration s’ajoute comme fonction pure dans `SaveMigrations.js` ; une version future inconnue est refusée.

Autosauvegarde aux découvertes, points sûrs, fins de mission, retour au garage, pause, modifications des options et toutes les 40 secondes de jeu. Les demandes sont regroupées, avec au moins trois secondes entre écritures automatiques. Le bouton manuel et la fermeture de page effectuent une écriture immédiate. Les erreurs de quota ou de stockage sont signalées discrètement sans interrompre le jeu.

À la reprise, le chunk et ses collisions sont chargés avant validation de la capsule. Une position bloquée ou sous le sol est remplacée par le point sûr validé, puis le départ si nécessaire. Un véhicule invalide revient au garage déterministe. Les vitesses ne sont pas restaurées. Une mission active reconstruit son événement et ses ennemis ; une mission automobile reconstruit sa route à partir de son numéro et de la seed.

**Le stockage dépend de l’origine du navigateur** : `localhost:5173`, `127.0.0.1:5177` et la preview ont des sauvegardes distinctes. Effacer les données du site efface la progression. Aucun cloud ni fichier disque n’est utilisé.

## Streaming et budgets V7

`ChunkStreamingManager` conserve les descriptions déterministes des 64 chunks, mais retire réellement les groupes éloignés de la scène, libère leurs buffers `InstancedMesh` et retire leurs volumes de l’index de collision. Le rechargement réutilise les mêmes transformations/couleurs, géométries et matériaux partagés. Une couronne de collision d’un chunk est synchronisée avant les déplacements. Le déplacement précharge environ 2,5 secondes devant le joueur ; une marge de 70 m évite les oscillations au bord des zones. Le chunk joueur et la mission active sont prioritaires. Trafic, piétons, ennemis, vapeur, feux et marqueurs respectent les zones chargées. Trois petites silhouettes gardent les monuments lisibles dans le lointain.

Le budget indicatif est **2 ms/frame**, avec une construction par lot instancié. Il est souple : un lot individuel, la préparation initiale, une téléportation ou une reprise peuvent dépasser ce budget. Le démarrage génère encore les descriptions de toute la ville, par étapes avec rendu de la progression. Les métadonnées, tableaux CPU des transformations, ressources partagées et quelques objets interactifs restent en mémoire ; il ne s’agit pas encore d’un monde illimité ni d’une génération dans un Worker.

| Profil | Préchargement | Pluie max | Trafic | Piétons | IA complexe max | Police max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 160 m | 450 | 10 | 0 | 6 | 2 |
| MEDIUM | 224 m | 1 800 | 20 | 10 | 12 | 3 |
| HIGH | 288 m | 4 000 | 40 | 25 | 20 | 4 |
| AUTO | 160–288 m | 2 200–4 000 | 22–40 | 14–25 | 11–20 | 4 |

AUTO part du budget HIGH et évalue les FPS toutes les quatre secondes. Il réduit les budgets de 5 % ou les remonte de 2,5 % par étape, entre 55 % et 100 %. Seuls populations, pluie, distances et détails sont ajustés ; aucune régénération de la ville. Les rayons et distances de détail sont internes aux profils. Le paramètre de distance des détails de toit est réservé : les lots historiques mélangent certains accessoires à l’architecture et ne sont pas supprimés arbitrairement.

## Présentation et accessibilité V7

Le ciel utilise un dôme à gradient, lune, étoiles déterministes et sept nuages légers. Un seul brouillard évolue progressivement selon quartier et pluie. Les routes s’humidifient puis sèchent, avec au maximum 48 flaques instanciées (12 en LOW), sans réflexion coûteuse. Les lampes restent limitées au pool existant ; les enseignes utilisent surtout leurs matériaux lumineux.

OPTIONS ajoute mouvement de caméra, secousses, FOV, sensibilité, volumes global/ambiance/effets, taille de carte, taille du HUD, marqueurs contrastés et rotation de carte. **Mouvement caméra à 0 désactive bob, impulsions, secousses et variations dynamiques de FOV**. Les offsets sont appliqués uniquement au rendu, jamais à la position physique. La carte élargit progressivement son zoom en conduite et regroupe les découvertes proches. Les bus audio MASTER / AMBIENCE / VEHICLES / UI / GAMEPLAY utilisent Web Audio, avec fondus et une légère atténuation d’ambiance pendant les notifications. UI/GAMEPLAY sont prêts pour des sons futurs, sans assets téléchargés.

## Nouveaux modules V7

```text
src/save/SaveSchema.js             DTO versionné, validation et normalisation
src/save/SaveMigrations.js         Registre de migrations pures
src/save/SaveManager.js            Stockage, erreurs, autosave et indicateur
src/save/WorldPersistence.js       Adaptation explicite runtime ↔ DTO
src/world/ChunkStreamingManager.js File de reconstruction et collisions
src/rendering/MaterialManager.js   Cache et propriété des matériaux partagés
src/rendering/SkySystem.js         Dôme, lune, étoiles et nuages
src/rendering/WeatherPolish.js     Brouillard, humidité et flaques
src/rendering/LandmarkSilhouettes.js Repères de skyline hors résidence
src/camera/CameraEffects.js        Effets subtils appliqués au rendu
src/systems/WorldRuntime.js        Coordination session, streaming et persistance
src/systems/SessionState.js        Pause et garde du delta
src/systems/FramePacing.js          Fenêtre glissante de 600 frames
src/systems/RuntimeDiagnostics.js  Objets et ressources Three.js observables
src/systems/PoolRegistry.js        Observation des pools existants, sans réécriture
src/ui/OptionsController.js        Réglages d’accessibilité persistants
src/ui/LoadingScreen.js            Étapes pondérées du chargement
src/ui/Transitions.js              Fondus courts sans timers
tests/persistence.test.js          Schéma, streaming, budget, caméra et ressources
tests/resume.test.js               Reprise réelle des objets runtime et pause
scripts/persistence-browser-check.mjs Scénario reload / continuer
scripts/cdp.mjs                    Client DevTools léger
scripts/soak-test.mjs              Circuits, pause, véhicule et reload (~80 s)
```

F3 conserve les compteurs historiques et ajoute chunks chargés/en attente, file, coût de streaming, FPS moyen, 1 % low approximatif, temps de frame, géométries, textures, programmes, objets et occupation des pools. Le heap JavaScript est affiché si Chrome le fournit ; aucune estimation précise de mémoire GPU n’est inventée. Le compteur de listeners couvre les abonnements possédés par la session, pas les internes de Three.js.

Vertical City conserve **quatre quartiers, 64 chunks, CITY_SEED = 1989, 210 bâtiments et trois landmarks**, ainsi que tous les systèmes vivants de V3. V4 ajoute la navigation verticale, des intérieurs et un réseau souterrain limité.

V5 ajoute un mode d’action/infiltration original, **VIGILANTE**, tout en conservant le mode **EXPLORATION** et les fonctionnalités V2/V3/V4. Choisir le mode dans le menu avant de cliquer sur **NOUVELLE PARTIE** ; Échap permet de revenir au menu et de changer de mode. Exploration désactive crimes, ennemis, combat, scanner et déplacements spéciaux V5. Changer de mode réinitialise les missions et ennemis, sans régénérer la ville.

V6 ajoute **NIGHTRIDER**, une voiture sportive originale en primitives, des garages, une conduite arcade, six missions de conduite et des poursuites limitées. Le véhicule est disponible en Exploration comme en Vigilante. Exploration ne déclenche aucune poursuite hostile ni mission obligatoire. Tous les systèmes V5 restent disponibles à pied en Vigilante.

Vite, JavaScript, Three.js et modules officiels `three/addons`. Audio via Web Audio natif. Aucun modèle externe, bibliothèque de physique ou téléchargement d’assets. Le contrôleur FPS et les collisions sont étendus à la verticale.

## Lancer

Node.js 22.12+ ou 24 ; navigateur de bureau avec WebGL 2, clavier et souris.

```powershell
cd C:\Users\Maxime\Documents\Town\gotham-3d
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite, généralement http://localhost:5173, puis **NOUVELLE PARTIE**. Le clic autorise Pointer Lock et initialise le son. Ne pas ouvrir `index.html` directement.

```powershell
npm test
npm run build
npm run preview
```

La production est dans `dist/`, servie localement par défaut sur http://localhost:4173.

| Commande | Action |
| --- | --- |
| ZQSD / WASD ou flèches | Déplacement à la première personne |
| Souris | Orientation avec PointerLockControls |
| Maj | Sprint |
| Espace | Saut ; en Vigilante, maintenir pendant une chute haute pour planer, relâcher pour tomber normalement |
| Ctrl | S’accroupir ; se relever nécessite de la place |
| E | Porte, échelle, ascenseur, accès souterrain ; neutraliser par derrière / inspecter lorsque proposé |
| 1 / 2 / 3 dans la cabine | RDC / mezzanine / toit |
| G / clic droit | Vigilante : grappin sur cible valide ; G ou Espace annule la traction |
| M | Vigilante : accepter la mission disponible la plus proche |
| V | Vigilante : scanner temporaire |
| Clic gauche | Vigilante : attaque courte portée |
| Alt + direction | Vigilante : esquive courte au sol ; Maj reste le sprint |
| Échap | Pause complète, libération de la souris, atténuation du son |
| Qualité, dans le pied de page | Cycle LOW → MEDIUM → HIGH → AUTO |
| Réglages | Choix direct de qualité, pluie activée/désactivée, intensité, volume global |
| F3 | Affichage/masquage des diagnostics |

Le rendu reste affiché derrière le menu ; les simulations sont en pause. Les draw calls incluent le post-traitement. Le nombre de bâtiments visibles est une estimation par boîtes englobantes/frustum des chunks chargés, sans calcul d’occlusion.

## Conduite V6

Le garage principal se trouve près du départ, dans Industrial District : **X −7, Z 32**, sous un petit auvent éclairé. La mini-carte le marque **G**, avec la voiture en rectangle clair. Depuis le départ `(0, 1.75, 54)`, marcher vers le nord et légèrement à gauche. Approcher le côté du véhicule jusqu’à **[E] Entrer · NIGHTRIDER**. Deux autres zones de réparation sont placées en **(−71, 96)** et **(−7, 160)**. Les positions et routes initiales sont reproductibles avec la seed 1989.

| En conduite | Action |
| --- | --- |
| Z / W / flèche haut | Accélérer |
| S / flèche bas | Freiner, puis reculer |
| Q / A / flèche gauche, D / flèche droite | Tourner |
| Espace | Frein à main, légère dérive |
| Maj maintenu | Boost |
| V | Caméra CHASE → CLOSE → HOOD |
| E | Sortir à faible vitesse, si un côté est dégagé ; réparer dans un garage |
| M | Accepter une mission de conduite, uniquement en Vigilante |
| Échap | Pause et réglages ; choisir le type de mission de conduite |

Les commandes sont interprétées par `VehicleController` ; `PlayerController` reste consacré au personnage. En sortant, la caméra et la physique à pied sont restaurées. Une sortie demande moins de 1,2 m/s et un emplacement libre à côté. La caméra de conduite est pilotée automatiquement : la souris reprend son rôle normal à pied. V retrouve alors le scanner.

### Physique, intégrité et garage

Simulation à **120 Hz**, accélération progressive de 10 m/s², freinage de 22 m/s², friction, direction atténuée à grande vitesse, gravité et contact avec le sol. Vitesse maximale normale **27 m/s (97 km/h)** ; boost jusqu’à **32,94 m/s (119 km/h)**. La marche arrière est limitée à 8 m/s. Le boost augmente l’accélération de 45 %, consomme 24 points/s et récupère 12 points/s hors utilisation. Il modifie légèrement le FOV, le son et les surfaces lumineuses arrière. La pluie réduit faiblement l’adhérence.

Les collisions utilisent trois cercles le long du châssis et les volumes AABB du monde, avec des déplacements balayés par intervalles de 25 cm maximum. Les gros poteaux et feux ont un index complémentaire ; les autres voitures utilisent une grille dynamique de 16 m. Pas de collision triangle par triangle, suspension, boîte de vitesses ou moteur physique externe. Une collision freine, provoque un faible rebond et un retour caméra discret. Un impact fort retire une quantité limitée d’intégrité. À zéro, **VEHICLE DISABLED**, aucun feu ou explosion : il reste possible de sortir.

À l’arrêt dans un garage, E lance la réparation à 22 points/s. E de nouveau sort ; accélérer interrompt la réparation. Le garage est un auvent ouvert dans le monde extérieur, accessible directement à pied et en voiture, avec éclairage, signalétique et équipements. Il ne remplace aucun intérieur V4.

### Trafic, poursuites et missions

Les catégories **CIVILIAN, TAXI, POLICE, DELIVERY** partagent les lots du trafic. Les voitures détectent les véhicules pilotables/de mission/poursuite, ralentissent, puis s’arrêtent devant un obstacle. Leur évitement est conservateur : elles attendent un passage libre sans changement de voie ou contournement complexe. Les véhicules lointains passent à une simulation de 10 Hz, contre 30 Hz à proximité.

En Vigilante, une poursuite peut être déclenchée par la mission « Semer la poursuite », l’approche d’un événement de vol surveillé ou une attaque réussie près d’une patrouille du trafic. Les unités suivent les axes existants et la dernière position connue. Détection à portée limitée, avec au plus **un raycast local toutes les 0,25 s**, réparti entre unités. Après trois secondes sans contact : **PURSUIT → SEARCHING**. Après dix secondes de recherche infructueuse : **LOST**, puis **NONE** trois secondes plus tard. Un nouveau contact pendant SEARCHING reprend PURSUIT. Aucun système permanent de criminalité ou d’arrestation.

Six objectifs courts : rejoindre un point en voiture, suivre une cible huit secondes, semer une poursuite, rejoindre une destination en 75 secondes, intercepter en restant deux secondes à moins de neuf mètres, escorter une cible douze secondes. Les autres missions disposent de 150 secondes. Les cibles suivent une boucle déterministe sur les routes, sans combat automobile. Dans **Réglages → Mission de conduite**, choisir un objectif ou la séquence automatique, puis **M au volant**. Les missions à pied V5 restent gérées séparément. Les missions de conduite ne démarrent pas en Exploration.

Le HUD de conduite affiche vitesse, boost, intégrité, poursuite, objectif et temps. Une mission de fuite demande de rompre le contact visuel, sans destination artificielle. La mini-carte ajoute voiture, cible `T`, garages `G`, destination et unités proches `P` ; elle ne révèle pas toute la police de la ville. F3 conserve les mesures antérieures et ajoute vitesse/accélération/direction, intégrité, boost, caméra, identifiant du véhicule, trafic simplifié, collisions, unités et dernière position connue, coûts CPU et nombre de colliders locaux.

### Architecture et budgets V6

```text
src/vehicles/
  Vehicle.js                 État et caractéristiques génériques
  VehicleController.js       Traduction des commandes de conduite
  VehiclePhysics.js          Physique fixe et collisions locales
  VehicleManager.js          Entrée/sortie, garage, acteurs et intégration
  VehicleCamera.js           CHASE / CLOSE / HOOD, obstacles et FOV
  VehicleRenderer.js         Deux pools instanciés et un phare dynamique
  RoadVehicleAgent.js        Routes et cibles à pas fixe de 30 Hz
  Garage.js                  Placement seedé, volumes et décor par chunk
  VehicleAudio.js            Six canaux procéduraux créés à la première conduite
src/gameplay/
  PursuitSystem.js            Détection, unités et états de poursuite
  VehicleMissionManager.js    Six objectifs automobiles
src/ui/VehicleHUD.js
tests/vehicles.test.js
scripts/vehicle-browser-check.mjs
```

`GameDirector` coordonne missions et poursuites ; `VehicleManager` possède un véhicule joueur, quatre slots de police et un slot cible. `TrafficSystem` conserve le trafic ordinaire. Les objets partagent géométries et matériaux ; corps et surfaces lumineuses des véhicules V6 tiennent dans deux lots `InstancedMesh`. Un seul `SpotLight` sans ombres équipe le véhicule joueur en MEDIUM/HIGH ; LOW conserve les phares emissive. Le trafic n’ajoute aucune lumière par voiture. Les garages sont rattachés aux chunks.

| Profil | Trafic | Police hostile max | Distance trafic à 30 Hz | Phare dynamique joueur |
| --- | ---: | ---: | ---: | ---: |
| LOW | 10 | 2 | 80 m | 0 |
| MEDIUM | 20 | 3 | 120 m | 1 |
| HIGH | 40 | 4 | 175 m | 1 |

Le véhicule joueur et une cible éventuelle s’ajoutent à ces budgets. Les poursuites ne créent jamais plus de quatre unités ; elles abandonnent à grande distance. Audio moteur, accélération, frein, pneus, boost et collision est généré localement et raccordé au volume général de `AudioManager`. Le canal sirènes existant sert également aux poursuites. Des buffers peuvent remplacer les sons procéduraux via `VehicleAudio.registerBuffer`.

Limites : les poursuites suivent les rues sans tactique d’encerclement, les véhicules NPC attendent les obstacles, la voiture ne circule pas dans les domaines d’intérieur/souterrain. Pas de remorquage ni d’appel à distance : une voiture immobilisée loin d’un garage reste sur place, y compris après sauvegarde. Une nouvelle partie la réinitialise ; seule une position invalide est récupérée au garage. Les agents V5 ne combattent pas le conducteur à travers la carrosserie. Les essais ergonomiques et longs trajets sont décrits dans `VALIDATION.md`.

## Gameplay V5 conservé

**Déplacement.** Le grappin vise des points compatibles sur corniches, toits, stations, grues et monuments. Le raycast depuis la caméra sélectionne un point dans une sphère de tolérance, à **55 m maximum** (`GrappleSystem.maxDistance`) ; une croix verte indique une cible valide. La visibilité et le trajet du joueur sont vérifiés contre les volumes solides locaux. La traction accélère de 3 à 24 m/s, à pas fixe de 120 Hz. G/Espace annule et conserve une partie de l’élan ; recharge de 0,18 s. Maintenir Espace après le lâcher permet la transition impulsion → chute → planage. Le planage demande plus de 3 m sous les pieds et une vitesse verticale descendante ; il est interdit dans les intérieurs, souterrains, échelles et ascenseurs. Descente cible 2,8 m/s, vitesse horizontale cible 11 m/s et virage progressif. Les plafonds de momentum sont 24 m/s horizontal et −35/+18 m/s vertical. L’esquive dure 0,18 s à 17 m/s, avec recharge 0,85 s et collisions normales.

**Crimes et missions.** Des sites déterministes appartiennent aux chunks : agression simulée, cambriolage, groupe hostile, vol de véhicule simulé, activité sur un toit et entrepôt occupé. Un site de toit sans toit compatible devient un groupe hostile. Les événements apparaissent entre 35 et 110 m du joueur, jamais directement à ses pieds. Les événements éloignés non suivis sont recyclés ; les événements résolus restent huit secondes avant recyclage. LOW/MEDIUM/HIGH autorisent respectivement 1/2/3 événements. Une seule mission peut être ACTIVE : rejoindre, observer deux secondes, neutraliser le groupe, atteindre un toit, inspecter avec E ou entrer dans un bâtiment. Les autres états sont AVAILABLE, COMPLETED et FAILED ; un objectif expire après 240 secondes. M accepte l’offre la plus proche. Les accès RUE/TOIT et parfois INTÉRIEUR réutilisent les ruelles, toits et accès V4 ; tous les sites n’offrent pas les trois approches.

**Infiltration et combat.** Patrouilleurs, gardes et guetteurs utilisent les états IDLE, PATROL, SUSPICIOUS, ALERT, SEARCHING et DISABLED. La perception teste distance, angle, hauteur et occlusion par les AABB proches. La pluie réduit légèrement la portée visuelle et celle du bruit. Marcher accroupi est discret ; courir, sauter et atterrir fortement attire l’attention. Approcher derrière un ennemi non alerté à moins de 2,1 m affiche `[E] Neutraliser`. Le clic gauche porte à 2,3 m, avec recharge de 0,4 s : trois impacts désactivent un ennemi. Le réticule réagit, sans sang ni animation graphique. Un ennemi alerté proche inflige 8 PV par attaque. À zéro PV, écran assombri puis réapparition après 1,5 s au dernier point sûr, avec 100 PV. Les checkpoints de découverte en surface/hauteur sont sauvegardés en mémoire lorsque le joueur les atteint au sol, sans ennemi alerté proche.

**Scanner et interface.** V révèle pendant 4 s les ennemis proches, interactions et points de grappin, à 55 m maximum ; recharge de 7 s depuis l’activation. Les silhouettes changent de couleur et des marqueurs instanciés apparaissent, sans passe graphique supplémentaire. Les marqueurs 3D respectent la profondeur et les limites de distance. La mini-carte ajoute événements, zone d’objectif et altitude relative ; les ennemis n’apparaissent que pendant le scanner. Le HUD indique objectif, distance, approches et santé. F3 conserve tous les compteurs historiques et ajoute mode, mission, crimes, vitesse XYZ, santé, grappin, planage, états ennemis, coût CPU IA et raycasts de visibilité gameplay.

### Architecture V5 et budgets

```text
src/
  player/
    GrappleSystem.js       Visée, traction et annulation
    GlideSystem.js         Planage conditionnel
    Momentum.js            Limites et transfert de vitesse
    PlayerTraversal.js     Coordination avec la physique et esquive
    PlayerHealth.js        Santé, checkpoint et réapparition
  gameplay/
    GameDirector.js        Assemblage gameplay, modes, horloge 30 Hz
    CrimeSystem.js         Sites seedés, budgets et recyclage
    MissionManager.js      Objectifs et transitions
    NoiseSystem.js         Bruits temporaires bornés
    CombatSystem.js        Attaque et neutralisation
    ScannerSystem.js       Durée, portée et recharge
    WorldMarkers.js        Pool de marqueurs 3D
  ai/
    Enemy.js              État individuel et archétypes
    EnemyManager.js       Pool, mise à jour répartie et rendu instancié
    EnemyPerception.js    Cône de vision, occlusion et approche arrière
  ui/MissionHUD.js         Objectif, distance, santé et feedback
  utils/spatialQueries.js  Requêtes locales, balayage et ligne de vue
tests/gameplay.test.js
scripts/gameplay-browser-check.mjs
```

`LivingCity` conserve les systèmes urbains ; `VerticalCity` conserve les accès V4 ; `PlayerController` et `PlayerPhysics` conservent le mouvement. `GameDirector` les assemble sans dépendance circulaire. La physique reste à 120 Hz ; gameplay et IA tournent à 30 Hz lorsque la session est active. V7 interrompt aussi météo et circulation pendant la pause.

| Profil | Crimes | Plafond IA complexe | Ennemis par événement |
| --- | ---: | ---: | ---: |
| LOW | 1 | 6 | 3 |
| MEDIUM | 2 | 12 | 4 |
| HIGH | 3 | 20 | 6 |

Le pool contient 20 slots ennemis, avec deux lots instanciés pour corps/têtes et un lot de marqueurs réutilisé. L’IA complexe exige proximité (95 m) et visibilité approximative ; les ennemis hors zone sont suspendus. Deux échantillons de perception maximum par tick, au plus un contrôle de ligne de vue d’attaque rapprochée par tick. Aucun raycast sur tous les triangles de la ville, aucun matériau par ennemi, aucune lumière par marqueur. Les placements initiaux des sites, missions, patrouilles et checkpoints sont reproductibles avec la seed 1989 ; les interactions et déplacements du joueur font naturellement diverger les comportements suivants.

Les événements sont des scénarios abstraits avec silhouettes, sans véhicule volé animé ni simulation de cambriolage. L’IA reste locale, sans navigation globale ou poursuite dans les escaliers et intérieurs ; les gardes d’un objectif intérieur restent dehors. Aucun nouveau conduit complexe n’est généré. V7 persiste les points sûrs et découvertes dans localStorage.

## Exploration verticale V4 conservée

**53 toits accessibles**, soit 25 % des 210 bâtiments : 25 escaliers de secours, des échelles, huit ascenseurs et une passerelle entre voisins. Les équipements de RoofDetails sont conservés et leurs principaux volumes deviennent solides. Les deux stations aériennes ont aussi des escaliers depuis les trottoirs, des quais, bancs et panneaux. Le métro reste visible depuis les quais, sans embarquement.

**Huit intérieurs** représentent hall, commerce abandonné, entrepôt, bâtiment municipal, station et local industriel. Ils comportent un RDC, un escalier intérieur, une mezzanine et un ascenseur à trois destinations. E ouvre une porte ; après l’animation, E entre. La sortie fonctionne de la même manière. Les états fermé/ouvert/verrouillé sont pris en charge. Les échelles marquées s’utilisent en visant avec E ; une trajectoire contrôlée relie leurs extrémités.

L’ascenseur est appelé avec E s’il est ailleurs ; lorsqu’il est présent, E permet d’entrer. Choisir 1, 2 ou 3. La cabine ferme ses portes et transporte le joueur. Un panneau sur le toit permet le retour. La terrasse accessible de Meridian se trouve vers **Y 156**, sous la couronne et la flèche de 190 unités.

**Quatre zones souterraines reliées** en T : station abandonnée, tunnel industriel, collecteur et maintenance. Tuyaux, flaques, vapeur locale, éclairage intermittent et ambiance métro/industrie réutilisent les systèmes V3. Les découvertes sont mémorisées une seule fois jusqu’au rechargement. La mini-carte indique les entrées et stations, révèle les points visités et affiche `▼` sous terre.

Près du départ, aller vers l’ouest : la porte municipale est à **X −32, Z 48 environ**. Les Fonderies se trouvent autour de **X −64, Z 64** ; leur entrée technique est à **X −78, Z 71**. Les panneaux `ACCÈS / [E]` signalent portes et échelles.

### Physique, interactions et chargement

`PlayerPhysics` simule à **120 Hz**. Le joueur est approché par un cercle horizontal et une hauteur verticale : gravité, saut, plafonds, chute, accroupissement et glissement contre les murs. Marche automatique jusqu’à 0,38 m ; franchissement d’obstacles isolés jusqu’à 1,2 m en avançant, si le dégagement est suffisant. Un décalage temporaire de caméra accompagne le franchissement. Les marches des escaliers sont limitées à 18 cm ; les paliers permettent le demi-tour.

Les surfaces praticables sont horizontales ou composées de marches ; les façades et toitures inclinées ne sont pas des rampes grimpables. `CollisionWorld` indexe les AABB par cellules de 64 m puis filtre les voisins en X/Z et altitude, sans tester les triangles du décor. Les collisions 2D de `City` restent utilisées par le trafic et les piétons. Le raycast d’interaction est limité à 2,8 m et vérifie l’occlusion par les solides proches.

Les intérieurs utilisent une **transition explicite à la porte**, aux coordonnées de leur bâtiment dans un domaine de collision distinct. Le chunk de façade est masqué pendant la visite. Cela préserve les façades instanciées V3 ; il n’y a pas de vue continue rue/intérieur par la porte ouverte. Le cache conserve au maximum deux intérieurs construits, dont un seul visible. Une éviction libère instances et interactions. Le réseau souterrain est construit à sa première visite.

Dehors, les intérieurs sont masqués ; sous terre, les extérieurs invisibles sont cachés. La vapeur est filtrée par altitude et les catégories audio s’adaptent à la zone. Les accès V4 restent identiques entre LOW/MEDIUM/HIGH.

Le mode Exploration conserve le défaut V4 `ENABLE_GRAPPLE = false`. Le mode Vigilante active automatiquement le grappin V5, sans modification du code. La traction vérifie les collisions par petits déplacements. Désactivé, il n’effectue aucune recherche de cible.

### Architecture ajoutée

```text
src/
  player/
    PlayerPhysics.js             Physique à pas fixe
    PlayerInteraction.js         Raycast et registre générique
    GrappleSystem.js             Grappin activé par le mode Vigilante
  interiors/
    InteriorGenerator.js         Sélection déterministe
    Interior.js                  Pièces, mezzanine, portes et cabine
    InteriorManager.js           Transitions et cache borné
  world/
    CollisionWorld.js            Index local des volumes 3D
    VerticalRoutes.js            Accès aux toits et stations
    FireEscape.js, Ladder.js      Escaliers et ascensions
    Door.js, Elevator.js          Composants interactifs
    Underground.js               Réseau technique limité
    NavigationSigns.js           Panneaux partagés et instanciés
  systems/
    VerticalCity.js              Orchestration V4
    VisibilityManager.js         Visibilité par zone
    DiscoverySystem.js           Découvertes en mémoire
tests/vertical.test.js
scripts/vertical-browser-check.mjs
```

`LivingCity` reste l’orchestrateur V3 ; `VerticalCity` coordonne V4 sans ajouter cette logique au rendu. Géométries et matériaux sont partagés ; marches, garde-corps et panneaux sont instanciés par chunk. V7 conserve les 64 descriptions mais gère la résidence graphique et les collisions via `ChunkStreamingManager`.

F3 ajoute état du joueur, zone, altitude, intérieur actif, étage de cabine, colliders proches, tests de collision et triangles. Les compteurs incluent toutes les passes : ce sont des primitives soumises au GPU, pas des triangles uniques après occlusion.

## Quartiers et repères conservés

La carte fait 512 × 512 unités. Chaque quartier contient 16 chunks de 64 × 64. Le nord correspond à Z négatif ; l’est à X positif. Le départ reste `(0, 1.75, 54)`.

| Quartier | Position | Hauteur moyenne ± variation | Occupation | Rue intérieure | Néons | Occupation des groupes de fenêtres |
| --- | --- | --- | --- | --- | --- | --- |
| Old Gotham | Nord-ouest | 27 ± 12 | 87 % | 10 | 16 % | 43 % |
| Downtown | Nord-est | 83 ± 39 | 97 % | 24 | 48 % | 72 % |
| Industrial District | Sud-ouest | 13 ± 6 | 86 % | 18 | 10 % | 25 % |
| Docks | Sud-est | 9 ± 3 | 64 % | 22 | 12 % | 20 % |

Downtown possède quatre parcelles par chunk, Old Gotham huit autour d’une petite place, l’industrie deux grandes parcelles et les docks un emplacement de hangar avec conteneurs. Les probabilités concernent les parcelles éligibles hors monuments. Le total varie avec d’autres seeds.

- Downtown : grands volumes à retraits successifs, nervures art déco, antennes, tons froids.
- Old Gotham : corniches, flèches gothiques, cours avec fontaines et bancs, ruelles accessibles.
- Industrial District : volumes bas et massifs, portes de livraison, toits techniques, cheminées et vapeur.
- Docks : hangars, conteneurs empilés, quatre bassins à l’est, quais et grues simplifiées. L’eau se trouve sous le niveau des quais ; les bassins bloquent le joueur.

Les axes des rues sont continus. Les retraits des trottoirs font varier leur largeur ; entre quartiers, elle correspond à la moyenne des paramètres voisins. Passages piétons et marquages s’adaptent à ces limites.

| Monument | X / Z | Hauteur | Mini-carte |
| --- | --- | --- | --- |
| Cathédrale des Veilleurs | −32 / −96 | 108 | C |
| Tour Meridian | 32 / −96 | 190 | T |
| Hôtel de la Garde | −32 / 32 | 91 | M |

La cathédrale conserve tours, transept, contreforts, rosace et flèche. Meridian garde son architecture art déco monumentale ; le bâtiment municipal sa colonnade et sa tour éclairée. La mini-carte distingue les quartiers, bassins et conteneurs et maintient les repères lointains sur ses bords.

## Les nouveaux systèmes

### Pluie et sol humide

`RainSystem` utilise **un LineSegments et un BufferGeometry**, avec une allocation maximale de 4 000 gouttes / 8 000 sommets. Il réécrit le même tableau de positions. Le volume de 48 × 48 × 26 unités suit le joueur ; la chute et les variations de vent dépendent du temps de simulation et de la seed. Intensité entre 0 et 1, activation indépendante du niveau de qualité. À zéro, aucune goutte n’est dessinée.

L’asphalte et les trottoirs partagés ajustent leur rugosité et leur métallicité suivant la pluie. Cet effet donne un aspect humide sous les lumières locales, sans miroir, shader personnalisé ou passe de réflexion. Il ne simule ni accumulation d’eau ni protection contre la pluie sous les ponts.

### Vapeur

`SteamSystem` place des grilles déterministes près des égouts, dans les ruelles, dans l’industrie et aux docks. Un seul `Points`, un atlas radial généré en mémoire et des buffers fixes animent les bouffées. Seules les douze sources les plus proches dans un rayon de 65 unités participent au rendu, avec au plus 36 particules par source et le plafond du profil.

### Voitures, feux et événements

`RoadNetwork` dérive un graphe des axes intérieurs de la grille existante, avec 49 intersections et des arêtes orientées. Les voitures suivent des voies à droite, puis des courbes quadratiques dans les intersections. Elles ne coupent pas les parcelles. Le pool contient au maximum 40 véhicules ; les voitures lointaines sont replacées sur des routes proches et libres. Si aucune position ne convient, le slot attend le prochain pas de simulation.

Les pièces des voitures partagent six lots dynamiques : carrosserie, vitrage, roues, phares, feux arrière et gyrophares. Les phares sont des surfaces lumineuses, sans PointLight par véhicule. Une séparation simple limite les collisions entre voitures ; elles ralentissent/s’arrêtent devant un autre véhicule ou le joueur. Il n’y a pas de physique automobile ni de collision solide entre le joueur et les véhicules.

`TrafficLights` commande les ampoules des feux V2 et les décisions des voitures. Cycle de 34 secondes : 12 s de vert, 3 s d’orange, 2 s de rouge commun, puis l’autre axe. Chaque intersection a un décalage stable dérivé de la seed. Les voitures attendent au rouge/orange avant l’intersection ; un véhicule déjà engagé termine son virage. Une réservation simple évite plusieurs virages simultanés au même carrefour.

Quelques véhicules du pool sont de type `police`. À distance, des épisodes intermittents de neuf secondes produisent des gyrophares rouge/bleu. **Une seule lumière ponctuelle mobile** est réutilisée pour ces événements en MEDIUM/HIGH. Ces patrouilles d’ambiance sont distinctes des unités de poursuite V6. `VEHICLE_TYPES` contient voitures civiles, police, taxis et livraisons ; les futurs grands gabarits comme les bus devront aussi adapter les marges de circulation.

### Métro aérien

`ElevatedRail` construit une boucle en L le long des axes existants, reliant notamment Downtown et Industrial District. Les coins sont arrondis sans dépasser largement les carrefours. Trois voitures à fenêtres éclairées parcourent la boucle en continu, avec une vibration visuelle discrète. Le sens de circulation et la phase initiale dépendent de la seed.

Rails, tablier, piliers et deux petites stations — Meridian et Fonderies — sont instanciés dans leurs chunks propriétaires. Les piliers sont posés sur des emplacements de trottoir libres et ajoutés aux collisions ; les axes routiers restent libres. Le train se calcule à chaque frame sur une courbe parcourue à vitesse régulière. Il reste présent dans les trois profils. Pas d’embarquement ni de simulation de service/stationnement.

### Piétons

Pool de 25 silhouettes maximum, composé de capsules, têtes et jambes instanciées : trois lots de rendu. Les parcours longent les trottoirs des chunks, avec un tracé spécifique aux quais. Les personnages se retournent devant les obstacles et sont recyclés à distance. Les animations de pas restent simples ; pas de traversée des rues ni d’intelligence de foule.

### Fenêtres, enseignes et publicité

Les huit générateurs de bâtiments V2 sont conservés : retraits, toits techniques, art déco, antennes, corniches, gothique, usines et hangars. Les toitures gardent climatisations, réservoirs, antennes, cheminées et enseignes.

`windowState` regroupe les fenêtres en petites unités de deux colonnes sur trois étages, puis ajoute des exceptions individuelles. Fenêtres éteintes, teintes chaudes/froides et variations de luminosité sont déterministes. Les fenêtres sombres sont dessinées avec le matériau métallique partagé ; elles ne créent pas un matériau par fenêtre.

`CityLights` anime les matériaux partagés des enseignes : variation lente et quelques clignotements. Des publicités procédurales complètent Downtown et l’industrie. Les panneaux utilisent des surfaces HDR non éclairées (`MeshBasicMaterial`) et le bloom, sans multiplier les lumières ponctuelles. Les panneaux de rue restent stables et lisibles.

### Audio

`AudioManager` réserve six catégories : `rain`, `traffic`, `sirens`, `metro`, `wind`, `industrial`. En l’absence de fichiers audio, du bruit filtré et des oscillateurs doux fournissent une ambiance de substitution, générée localement. Le son n’est initialisé qu’après un clic ; il s’atténue en pause. Le volume global est réglable, y compris à zéro.

Pour remplacer une catégorie ultérieurement : `audio.registerBuffer('rain', audioBuffer)`. Le buffer remplace les sources procédurales de la catégorie. Aucun fichier n’est chargé ou téléchargé automatiquement. Les gains de contexte varient avec la pluie, le quartier, la proximité du métro et les événements lointains.

## Budgets et optimisation

| Profil | Pluie max. | Vapeur : budget | Voitures max. | Piétons max. | Rayon d’activité | Distance des chunks | Ratio pixels max. | Bloom | Lampes proches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LOW | 450 | 100 | 10 | 0 | 110 | 205 | 1 | non | 2 |
| MEDIUM | 1 800 | 320 | 20 | 10 | 150 | 335 | 1,25 | oui | 4 |
| HIGH | 4 000 | 600 | 40 | 25 | 200 | 520 | 1,5 | oui | 6 |

Les limites sont des budgets, pas une garantie de remplissage dans chaque zone. La vapeur dépend des sources proches ; son maximum effectif est également borné par 12 × 36 particules. Les chunks des landmarks restent visibles, même en LOW. Le ciel, le brouillard, les quatre quartiers et le métro sont conservés dans chaque profil.

- Géométries et neuf matériaux de base partagés, couleurs par instance ; cache borné des enseignes.
- InstancedMesh par chunk pour la ville ; pools dynamiques fixes pour véhicules, piétons et train.
- Deux objets de particules pour toute la pluie et la vapeur, sans milliers de Mesh.
- Au maximum six lumières de lampadaire plus une lumière événementielle ; aucune ombre dynamique.
- Frustum culling et masquage des chunks éloignés ; aucune suppression des données ou collisions.
- Simulation du trafic/piétons à pas fixe de 1/30 s ; pluie et train calculés au temps de rendu.
- Mise à jour des diagnostics/visibilité à fréquence réduite ; mini-carte plafonnée à environ 10 Hz.
- Compteurs Three.js agrégés sur toutes les passes pour mesurer les draw calls ; aucune bibliothèque de FPS.
- Bundles séparés pour le cœur et le rendu Three.js.

## Seed et architecture

La configuration reste dans `src/world/districts.js` :

```js
export const CITY_SEED = 1989;
```

La même seed et les mêmes paramètres produisent les mêmes bâtiments, couleurs, fenêtres, toitures, enseignes et sources. `deriveSeed` fournit des flux indépendants par chunk et par système. Ni l’ordre de génération des chunks, ni l’animation des voitures ne modifient la ville statique.

Pour les systèmes vivants, la reproductibilité suppose aussi le même temps simulé, les mêmes réglages et le même parcours du joueur : le recyclage dépend de sa position. Le trafic à pas fixe est testé avec des fréquences de rendu de 30 et 60 FPS. À moins de 10 FPS, ou après une suspension de l’onglet, le rattrapage est limité pour éviter une surcharge ; le temps simulé peut alors différer du temps réel.

```text
src/
  main.js                       Assemblage, boucle de rendu, Pointer Lock et nettoyage
  style.css
  player/PlayerController.js     Clavier FPS, sprint et physique V4
  systems/
    LivingCity.js                Coordination et horloge de simulation
    RainSystem.js               Pluie locale, réutilisation des buffers
    SteamSystem.js              Sources et particules de vapeur proches
    TrafficSystem.js            Pool de voitures, routes et événements policiers
    TrafficLights.js            Cycles et ampoules des feux
    PedestrianSystem.js         Silhouettes et parcours sur les trottoirs
    AudioManager.js             Catégories, synthèse, buffers futurs et volume
    PerformanceManager.js       Profils, visibilité et compteurs
  world/
    districts.js                Seed et paramètres des quatre quartiers
    City.js                     Registre spatial et collisions
    CityChunk.js                Génération indépendante et groupe par chunk
    CityResources.js            Géométries et matériaux partagés
    Building.js                 Volumes et fenêtres
    RoofDetails.js              Équipements de toiture
    Landmarks.js                Les trois monuments
    Dock.js                     Quais, eau, conteneurs et grues
    Road.js                     Sols, trottoirs, marquages et emplacements de feux
    ElevatedRail.js             Rails, piliers, stations et train
  lighting/CityLights.js         Éclairage nocturne, ciel et enseignes animées
  ui/
    Interface.js                Accueil et réglages
    Minimap.js                  Quartiers, entrées, stations et découvertes
    DebugPanel.js               Diagnostics F3
  utils/
    procedural.js               PRNG, seeds dérivées, instances statiques
    DynamicInstances.js         Pools d’instances et texture de particules
    routes.js                   Graphe routier et boucle arrondie
    windows.js                  Groupes déterministes de fenêtres

tests/world.test.js             Régressions Districts V2
tests/systems.test.js           Tests Living City
scripts/browser-check.mjs      Contrôle Chrome et benchmark sans dépendance
artifacts/                     Rapports JSON et captures de validation
```

Les descriptions des chunks sont créées par étapes au démarrage. `City.createChunk` génère indépendamment et `ChunkStreamingManager` gère ensuite les instances résidentes et les collisions. `CityResources` possède les ressources partagées. Les décorations statiques appartiennent aux groupes de chunks ; les pools animés conservent leurs propriétaires séparés.

Les collisions des acteurs d’ambiance restent une approximation 2D ; celles du joueur utilisent les volumes 3D locaux de V4. Les lampadaires principaux sont solides pour la conduite V6 ; les très petits accessoires restent décoratifs. Pas de nage, dégâts de chute, commandes tactiles ou embarquement dans le métro. La pluie est masquée en intérieur et sous terre, mais pas individuellement sous chaque pont. Le grappin exige encore une validation ergonomique en jeu.

## Validation et mesures

`npm test` exécute **131 tests** : les 102 tests historiques V2 à V6 conservés et 29 nouveaux tests V7. La physique, le grappin, le planage et la conduite sont comparés à 30, 60 et 120 FPS. Les nouveaux tests couvrent schéma, migrations, stockage indisponible, autosave, reprise, sécurité des positions, missions, streaming déterministe, ressources partagées, pause, caméra et AUTO.

Le contrôle Chrome V5 ajoute Exploration/Vigilante, apparition et activation de mission, scanner et HUD dans les deux builds. En développement, des fixtures sur les objets réels vérifient aussi neutralisation, dégâts, réapparition et transition grappin/planage. Elles ne sont pas exposées dans le produit. La procédure manuelle complémentaire et l’inventaire complet des fichiers figurent dans [VALIDATION.md](VALIDATION.md).

V7 ajoute sauvegarde, reload complet, CONTINUER, restauration de la voiture, progression et options, pause et streaming aux contrôles V6. La production rejoint le garage par de vraies commandes clavier. Les benchmarks séparent exploration à pied et conduite avec police active, avec LOW/MEDIUM/HIGH/AUTO à pied. Les chiffres à jour et limites de mesure figurent dans `VALIDATION.md`.

Le contrôle Chrome vérifie en développement et en production les commandes FPS, sprint, souris, mini-carte, pluie, réglages, volume, audio, train, trafic, F3 et absence d’erreurs/avertissements du navigateur. En développement, il contrôle aussi les quatre quartiers et une collision par saisie réelle. Les tests de trajet et de collision indépendants du navigateur couvrent les rues complètes.

Pour reproduire, lancer Vite ou preview, puis Chrome avec un **profil de test dédié** et `--remote-debugging-port=9222`. Sous Windows :

```powershell
Start-Process -FilePath 'C:/Program Files/Google/Chrome/Application/chrome.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--remote-debugging-port=9222','--user-data-dir=C:/Users/Maxime/Documents/Town/gotham-3d/node_modules/.cache/living-city-browser','--no-first-run','about:blank'
npm run test:browser
npm run test:browser -- http://127.0.0.1:4173/ --production
npm run test:soak -- http://127.0.0.1:5173/
```

Le script utilise uniquement les API intégrées à Node et le protocole DevTools de Chrome. Il génère les rapports dans `artifacts/benchmark-development.json` et `artifacts/benchmark-production.json`, ainsi que des captures. Les résultats chiffrés et le matériel de mesure sont détaillés dans `VALIDATION.md`. Ce sont des mesures courtes sur une vue fixe, pas une garantie pour tous les appareils ou tous les quartiers.
