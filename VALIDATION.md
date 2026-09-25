# Validation — Vehicles & Pursuit V6

## Résultats

- **102 tests Node réussis**, aucun ignoré : les 77 tests V2/V3/V4/V5 conservés et 25 tests V6.
- `npm run build` réussi : **90 modules**, aucune erreur ni avertissement. Application **166,54 kB / 54,38 kB gzip**, cœur Three.js 218,54 kB, renderer 352,31 kB, CSS 10,13 kB.
- Contrôles Chrome développement et production réussis, zéro erreur console et zéro avertissement. Les rapports JSON contiennent la date et les détails de chaque exécution finale.
- Seed **1989**, **64 chunks**, quatre quartiers, 210 bâtiments et trois landmarks conservés. Les 53 toits, huit intérieurs, 27 escaliers et quatre zones souterraines restent disponibles.
- Exploration/Vigilante, grappin, planage, momentum, crimes, missions à pied, scanner, IA, combat, santé/réapparition, métro, météo, trafic, découvertes, mini-carte et profils restent présents.
- Aucun moteur physique, bibliothèque ou asset externe ajouté.

## Mesures et protocole

Chrome headless 154 sous Windows, **1440 × 900, DPR 1**, GPU `ANGLE / Intel(R) Graphics (0x00007D45) / Direct3D11`. Mesures du 25 septembre 2026. Chaque fenêtre dure environ six secondes après une chauffe. La souris est capturée : les systèmes gameplay simulent réellement. Après une déconnexion de DevTools pendant une exécution intermédiaire, le navigateur de test a été relancé ; le script rejette désormais explicitement les commandes déconnectées ou expirées. La dernière exécution de production utilise les options `--disable-extensions` et `--disable-features=BackForwardCache` dans le profil isolé.

Deux scénarios sont mesurés séparément :

1. **À pied, Vigilante** : même point de départ et même orientation vers l’est que le benchmark V5. Les ennemis proches restent actifs (3/8/18 IA complexes selon le profil).
2. **Au volant, poursuite active** : véhicule à l’arrêt dans le garage initial, caméra CHASE vers le nord, météo et trafic actifs, mission « Semer la poursuite ». Deux/trois/quatre voitures de police simulent réellement. La logique des ennemis à pied est suspendue lorsque le joueur conduit. Ce scénario mesure une vue et une charge différentes de celles du benchmark à pied.

Les résultats exacts sont dans [benchmark-development.json](artifacts/benchmark-development.json) et [benchmark-production.json](artifacts/benchmark-production.json). `benchmark` contient la série à pied ; `drivingBenchmark` contient la série conduite/poursuite.

Résultats finaux en production, **au volant avec poursuite active** :

| Profil | FPS | Draw calls moyens | Triangles/frame | CPU véhicules ms/frame | Police active |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 318 | 271 078 | 0,343 | 2 |
| MEDIUM | 60,0 | 569 | 489 852 | 0,303 | 3 |
| HIGH | 60,0 | 571 | 495 184 | 0,295 | 4 |

Résultats finaux en production, **à pied en Vigilante** :

| Profil | FPS | Draw calls moyens | Triangles/frame, environ | CPU IA ms/tick | IA complexe |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 309 | 190 484 | 0,032 | 3 |
| MEDIUM | 60,0 | 412 | 280 090 | 0,039 | 8 |
| HIGH | 60,0 | 416 | 285 442 | 0,036 | 18 |

La dernière série développement mesure respectivement **56,3 / 56,1 / 56,3 FPS en conduite**, avec **0,373 / 0,318 / 0,327 ms/frame** pour les véhicules ; à pied environ 56,3 FPS. Des exécutions précédentes atteignaient 60 FPS. Les draw calls et triangles de conduite sont les mêmes qu’en production. La variation observée n’est pas attribuée à une cause matérielle précise sans profilage supplémentaire.

Le compteur **CPU véhicules** mesure le temps JavaScript passé par frame dans la physique/gestion du véhicule, les ticks de poursuite et mission automobile, ainsi que la préparation du rendu/HUD V6. Il est lissé puis échantillonné pendant la fenêtre. **CPU IA** reste le temps de `EnemyManager.update` par tick de 30 Hz. Ces mesures n’incluent pas tout le coût du moteur, de l’audio natif ou du GPU. Les draw calls et triangles incluent le post-traitement.

Il s’agit de fenêtres courtes, plafonnées autour de 60 Hz et sensibles à la charge de la machine. Elles ne garantissent pas 50/60 FPS sur tous les appareils ou pendant de longs trajets. Le benchmark conduite est stationnaire avec poursuite simulée ; ce n’est pas un parcours automobile chronométré à travers toute la carte.

| Profil | Trafic actif attendu | Police max | Véhicule joueur | Cible éventuelle | Total max |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOW | 10 | 2 | 1 | 1 | 14 |
| MEDIUM | 20 | 3 | 1 | 1 | 25 |
| HIGH | 40 | 4 | 1 | 1 | 46 |

La mission de fuite mesurée n’utilise pas de cible : totaux **13/24/45 véhicules**. Les patrouilles ordinaires de catégorie POLICE font déjà partie du trafic ; seules les unités de poursuite s’ajoutent. Les plafonds restent valables si une mission cible est active simultanément avec une poursuite déclenchée par un événement.

## Tests unitaires

Les **77 tests historiques ne sont pas modifiés**. Ils couvrent génération seedée, indépendance des chunks, architecture urbaine, collisions, ZQSD/WASD, sprint, météo, circulation et feux, train, piétons, audio, physique verticale, portes, ascenseurs, échelles, souterrains, découvertes, grappin/planage, IA et gameplay V5.

Les 25 tests de `tests/vehicles.test.js` couvrent :

1. Accélération progressive et résultat identique à 30/60/120 FPS.
2. Freinage avant marche arrière et vitesse de recul bornée.
3. Friction et frein à main.
4. Direction liée au mouvement et inversion en marche arrière.
5. Vitesse maximale, boost et recharge.
6. Correspondance WASD/ZQSD.
7. Épuisement du boost sans clignotement permanent tant que Maj reste maintenu.
8. Collision balayée contre un mur fin, absence de traversée et dégâts limités.
9. Collision avec un autre véhicule via l’index dynamique.
10. Gravité et contact stable au sol.
11. Désactivation à zéro intégrité et réparation progressive.
12. Garages et spawn principal déterministes, seed et 64 chunks conservés.
13. Entrée/sortie, restauration des commandes et refus si vitesse/espace incompatibles.
14. Réparation en garage, interruption et sortie d’un véhicule désactivé.
15. Refus de sortie à travers une barrière fine, même si la destination est libre.
16. Modes caméra, obstacle sur le bras de caméra et restauration du FOV.
17. Détection policière limitée par distance et murs.
18. États PURSUIT/SEARCHING/LOST/NONE et absence de déclenchement en Exploration.
19. Budgets par profil et au plus un rayon par échantillon de détection.
20. Routes de mission déterministes et axes routiers connectés.
21. Véhicule cible reproductible à 30/60/120 FPS et trajet hors bâtiments.
22. Recalcul de route policier sans demi-tours répétés entre intersections.
23. Six types de missions, conditions de réussite et expiration.
24. Trafic arrêté devant le véhicule pilotable et quatre catégories disponibles.
25. Audio procédural borné et libération des sources.

## Contrôles Chrome

Le script utilise le protocole Chrome DevTools natif. Aucun framework d’automatisation supplémentaire n’est installé.

**Conservé dans les deux builds** : chargement, seed, quartiers/chunks, bâtiments/landmarks, Pointer Lock, W/Z, sprint, souris, saut, accroupissement, pause, mini-carte, pluie/intensité, son/volume, train, trafic, profils et F3. Passage Exploration/Vigilante, mission V5, scanner et HUD.

**Conservé en développement** : changements de quartier, collision de façade, portes, entrée/sortie d’intérieur, ascenseur vers le toit municipal, découverte, échelle, souterrain, neutralisation, dégâts, réapparition, grappin, impulsion et planage. Des fixtures placent les objets réels avant les commandes ; aucune variable de test n’est livrée dans le produit.

**Conservé en production** : trajet à pied depuis le départ jusqu’à la porte municipale, ouverture, entrée, demi-tour et sortie par clavier/souris et interface publique. Les fixtures internes d’ascenseur/grappin ne sont pas rejouées dans le bundle compilé.

**V6 dans les deux builds** : mode Vigilante, entrée dans NIGHTRIDER, accélération, boost, direction, frein à main, caméras CLOSE/HOOD/CHASE, HUD, sélection de la mission de fuite, état PURSUIT et unités, sortie puis retour Exploration sans police hostile. En production, le script **rejoint réellement le garage à pied depuis le départ**, en utilisant uniquement les commandes et diagnostics publics. Le benchmark répète aussi l’entrée au garage et le déclenchement de poursuite dans les trois profils.

**V6 supplémentaire en développement** : collision contrôlée contre une façade et perte d’intégrité. Le joueur sort réellement avec E ; une fixture le déplace loin des policiers, puis le test attend les délais normaux et vérifie SEARCHING → LOST → NONE. La conduite pour semer la police sur un parcours complet reste un contrôle manuel.

Captures inspectées : [poursuite en développement](artifacts/vehicles-development-pursuit.png), [caméra capot](artifacts/vehicles-development-hood.png). Captures finales : [production CHASE](artifacts/vehicles-production-pursuit.png), [production HOOD](artifacts/vehicles-production-hood.png), [diagnostics production](artifacts/vehicles-production-debug.png). Les captures V4/V5 restent générées par les contrôles historiques.

## Reproduire

Dans des terminaux séparés pour les serveurs :

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
```

Chrome avec un profil isolé, puis un contrôle à la fois :

```powershell
Start-Process -FilePath 'C:/Program Files/Google/Chrome/Application/chrome.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--remote-debugging-port=9222','--user-data-dir=C:/Users/Maxime/Documents/Town/gotham-3d/node_modules/.cache/vehicles-browser','--no-first-run','about:blank'
npm run test:browser -- http://127.0.0.1:5177/
npm run test:browser -- http://127.0.0.1:4177/ --production
```

## Procédure manuelle complémentaire

Ces contrôles de confort et de durée ne sont pas déclarés effectués par un joueur humain.

1. En Exploration, rejoindre le garage **G**, près de `(−7, 32)`. Entrer avec E, conduire sans mission et vérifier l’absence de poursuite hostile.
2. Faire le tour des quatre quartiers. Tester ZQSD et WASD, marche arrière, manœuvres lentes, frein à main, freinage depuis le boost, chaussée mouillée et chaque caméra. Ne pas maintenir la souris pour tourner : la caméra est automatique en conduite.
3. Vérifier les collisions avec façades, colonnes, feux/poteaux, garages, barrières et voitures. Essayer E en roulant, près d’un mur, entre deux obstacles et après immobilisation : ne jamais apparaître à travers un mur.
4. Entrer dans un garage endommagé, s’arrêter et appuyer sur E : intégrité progressive. Accélérer pour interrompre, ou E pour sortir. Tester zéro intégrité : arrêt, message VEHICLE DISABLED, aucune explosion, sortie possible.
5. En Vigilante, choisir « Semer la poursuite » dans Réglages, puis M au volant. Vérifier les gyrophares/sirènes, la carte et les états F3. Tourner dans plusieurs rues, rompre la ligne de vue et s’éloigner jusqu’à SEARCHING, LOST puis NONE. Se montrer pendant SEARCHING pour vérifier la reprise.
6. Jouer les six missions via le sélecteur : suivre/intercepter/escorter utilisent une cible T ; les autres montrent une destination ou un objectif de fuite. Vérifier la réussite, le délai et l’échec sans mort complexe.
7. Quitter le véhicule puis tester les commandes V5 : V scanner, G grappin, E interaction/neutralisation, planage, esquive, combat et santé. Visiter les intérieurs, souterrains, quais et ascenseurs pour vérifier la continuité de l’exploration.
8. Changer LOW/MEDIUM/HIGH en cours de poursuite : budgets bornés, trafic vivant et pluie conservée. Repasser en Exploration : poursuite et missions automobiles nettoyées, véhicule toujours utilisable.
9. Écouter moteur, frein, pneus, boost, choc et sirène au casque, vérifier volume/pause. Mesurer un parcours de plusieurs minutes sur d’autres GPU, résolutions et DPR ; surveiller mémoire, saccades et confort de caméra.

## Fichiers créés pour V6 — 14

- `src/vehicles/Vehicle.js`
- `src/vehicles/VehicleController.js`
- `src/vehicles/VehiclePhysics.js`
- `src/vehicles/VehicleManager.js`
- `src/vehicles/VehicleCamera.js`
- `src/vehicles/VehicleRenderer.js`
- `src/vehicles/RoadVehicleAgent.js`
- `src/vehicles/Garage.js`
- `src/vehicles/VehicleAudio.js`
- `src/gameplay/PursuitSystem.js`
- `src/gameplay/VehicleMissionManager.js`
- `src/ui/VehicleHUD.js`
- `tests/vehicles.test.js`
- `scripts/vehicle-browser-check.mjs`

Captures ajoutées séparément : `artifacts/vehicles-development-hood.png`, `vehicles-development-pursuit.png`, `vehicles-development-debug.png` et équivalents `production`.

## Fichiers modifiés pour V6 — 17

- `src/main.js` : alternance des contrôleurs, mise à jour automobile.
- `src/gameplay/GameDirector.js` : coordination, actions, modes, poursuites, missions et métriques.
- `src/systems/TrafficSystem.js` : catégories, obstacles véhicules et simulation distante.
- `src/systems/PerformanceManager.js` : budgets policiers, distance et phare.
- `src/systems/AudioManager.js` : couche automobile paresseuse, sirènes et nettoyage.
- `src/systems/LivingCity.js` : position de référence en conduite et statistiques trafic.
- `src/ui/Interface.js` : identité V6 et sélection d’objectif automobile.
- `src/ui/MissionHUD.js` : masquage au volant.
- `src/ui/Minimap.js` : voiture, garage, cible, destination et poursuite proche.
- `src/ui/DebugPanel.js` : statistiques supplémentaires F3.
- `src/style.css` : HUD automobile et réglages.
- `index.html`, `package.json`, `package-lock.json` : version et identité V6.
- `scripts/browser-check.mjs` : contrôles automobiles et deux séries de mesures.
- `README.md`, `VALIDATION.md` : architecture, commandes et résultats.

Rapports régénérés en plus : `artifacts/benchmark-development.json`, `artifacts/benchmark-production.json` et captures historiques de régression. Aucun fichier de test historique supprimé ou modifié.

## Optimisations et limites connues

Physique joueur automobile à 120 Hz, agents routiers et poursuite à 30 Hz, trafic éloigné à 10 Hz. Trois cercles par châssis, balayage de 25 cm, index spatial des solides par cellules de 64 m, grille dynamique de 16 m pour les voitures. Détection policière limitée à quatre échantillons/s au total ; bras de caméra limité à cinq requêtes locales/frame lorsqu’il est obstrué. Pools fixes, deux lots instanciés V6, ressources partagées, un phare sans ombres au maximum, HUD limité à 10 Hz. Toutes les optimisations antérieures de météo, culling, intérieurs et IA restent présentes.

La physique est arcade : contact simple au terrain, pas de suspensions, pneus individuels ou rampes automobiles complexes. Les volumes de collision sont conservateurs ; les accessoires très fins ne sont pas tous solides. Le garage ouvert évite une transition véhicule/intérieur : la voiture ne pénètre pas dans les domaines V4 fermés ou souterrains.

Les policiers suivent les routes et attendent les obstacles ; pas d’encerclement, arrestation, combat automobile ou dommages infligés au conducteur. L’IA ennemie à pied est suspendue pour le conducteur. Le trafic ralentit/s’arrête, sans dépassement ; plusieurs voitures peuvent former une file prolongée. La police ordinaire du trafic garde ses effets d’ambiance, distincts des unités de poursuite.

Une voiture désactivée loin d’un garage reste sur place jusqu’au rechargement : pas d’appel, remorquage ou sauvegarde dans V6. La voiture ne transporte pas le joueur dans le métro. Les 64 chunks restent en mémoire, sans streaming réel. Les mesures de performance stationnaires ne remplacent pas une validation longue de la conduite à travers toute la carte.
