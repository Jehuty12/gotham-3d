# Vertical City — V4

Vertical City conserve **quatre quartiers, 64 chunks, CITY_SEED = 1989, 210 bâtiments et trois landmarks**, ainsi que tous les systèmes vivants de V3. V4 ajoute la navigation verticale, des intérieurs et un réseau souterrain limité.

Vite, JavaScript, Three.js et modules officiels `three/addons`. Audio via Web Audio natif. Aucun modèle externe, bibliothèque de physique ou téléchargement d’assets. Le contrôleur FPS et les collisions sont étendus à la verticale.

## Lancer

Node.js 22.12+ ou 24 ; navigateur de bureau avec WebGL 2, clavier et souris.

```powershell
cd C:\Users\Maxime\Documents\Town\gotham-3d
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite, généralement http://localhost:5173, puis **Explorer la ville**. Le clic autorise Pointer Lock et initialise le son. Ne pas ouvrir `index.html` directement.

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
| Espace | Saut depuis le sol, un saut par pression |
| Ctrl | S’accroupir ; se relever nécessite de la place |
| E | Porte, échelle, ascenseur, accès souterrain |
| 1 / 2 / 3 dans la cabine | RDC / mezzanine / toit |
| G / clic droit | Grappin si activé dans le code |
| Échap | Pause du déplacement, libération de la souris, atténuation du son |
| Qualité, dans le pied de page | Cycle LOW → MEDIUM → HIGH |
| Réglages | Choix direct de qualité, pluie activée/désactivée, intensité, volume global |
| F3 | Affichage/masquage des diagnostics |

La ville continue de s’animer derrière le menu, comme une scène d’accueil vivante. Le panneau F3 indique FPS, draw calls, position, quartier, chunk, bâtiments dans le champ, voitures actives, piétons et particules. Les draw calls incluent le post-traitement. Le nombre de bâtiments est une estimation par boîtes englobantes/frustum, sans calcul d’occlusion.

## Exploration verticale V4

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

Le grappin expérimental est désactivé par défaut : `ENABLE_GRAPPLE = false` dans `src/player/GrappleSystem.js`. Activé, il ne sélectionne que des points explicitement compatibles, élevés, dans l’axe de visée et à moins de 45 unités. La traction vérifie les collisions par petits déplacements. Désactivé, il n’effectue aucune recherche de cible.

### Architecture ajoutée

```text
src/
  player/
    PlayerPhysics.js             Physique à pas fixe
    PlayerInteraction.js         Raycast et registre générique
    GrappleSystem.js             Option expérimentale
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

`LivingCity` reste l’orchestrateur V3 ; `VerticalCity` coordonne V4 sans ajouter cette logique au rendu. Géométries et matériaux sont partagés ; marches, garde-corps et panneaux sont instanciés par chunk. Les 64 chunks restent en mémoire : le masquage prépare le streaming, sans simuler un déchargement réel.

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

Quelques véhicules du pool sont de type `police`. À distance, des épisodes intermittents de neuf secondes produisent des gyrophares rouge/bleu. **Une seule lumière ponctuelle mobile** est réutilisée pour ces événements en MEDIUM/HIGH. Aucun gameplay policier. `VEHICLE_TYPES` sépare les caractéristiques des véhicules pour préparer taxis, bus et véhicules spéciaux ; les futurs grands gabarits devront aussi adapter les marges de circulation.

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

Tous les chunks sont encore créés au démarrage. `City.createChunk` génère indépendamment, `attach`/`detach` contrôlent le groupe, `disposeInstances` libère ses buffers et `CityResources` possède les ressources partagées. Le masquage par distance n’est pas du streaming. Un futur chargeur devra coordonner collisions, éclairage, voies et populations lors des chargements/déchargements. Les décorations statiques nouvelles appartiennent aux groupes de chunks ; les pools animés ont leurs propriétaires séparés.

Les collisions des acteurs d’ambiance restent une approximation 2D ; celles du joueur utilisent les volumes 3D locaux de V4. Les lampadaires et très petits accessoires sont décoratifs. Pas de nage, dégâts de chute, commandes tactiles, embarquement dans le métro ou gameplay policier. La pluie est masquée en intérieur et sous terre, mais pas individuellement sous chaque pont. Le grappin exige encore une validation ergonomique en jeu.

## Validation et mesures

`npm test` exécute **53 tests** : les 30 régressions V2/V3, plus physique, plafonds, accroupissement, marches, escaliers à plusieurs volées, parcours complets vers les deux quais, sélection des toits, intérieurs, portes, ascenseurs, interactions, échelles, souterrains, découvertes, grappin et moyennes de triangles. La physique est comparée à 30, 60 et 120 FPS.

Le contrôle Chrome vérifie en développement et en production les commandes FPS, sprint, souris, mini-carte, pluie, réglages, volume, audio, train, trafic, F3 et absence d’erreurs/avertissements du navigateur. En développement, il contrôle aussi les quatre quartiers et une collision par saisie réelle. Les tests de trajet et de collision indépendants du navigateur couvrent les rues complètes.

Pour reproduire, lancer Vite ou preview, puis Chrome avec un **profil de test dédié** et `--remote-debugging-port=9222`. Sous Windows :

```powershell
Start-Process -FilePath 'C:/Program Files/Google/Chrome/Application/chrome.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--remote-debugging-port=9222','--user-data-dir=C:/Users/Maxime/Documents/Town/gotham-3d/node_modules/.cache/living-city-browser','--no-first-run','about:blank'
npm run test:browser
npm run test:browser -- http://127.0.0.1:4173/ --production
```

Le script utilise uniquement les API intégrées à Node et le protocole DevTools de Chrome. Il génère les rapports dans `artifacts/benchmark-development.json` et `artifacts/benchmark-production.json`, ainsi que des captures. Les résultats chiffrés et le matériel de mesure sont détaillés dans `VALIDATION.md`. Ce sont des mesures courtes sur une vue fixe, pas une garantie pour tous les appareils ou tous les quartiers.
