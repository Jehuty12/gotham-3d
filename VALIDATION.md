# Validation — Art Pass & Atmosphere V8

## Résultats du 1er octobre 2026

- **157 tests réussis**, aucun ignoré : **131 tests historiques V2–V7 inchangés**, plus 26 tests V8. [Résultat Node](artifacts/tests-v8.txt), [référence V7 avant modifications](artifacts/tests-v7-baseline.txt).
- **Build réussi : 123 modules**, sans erreur ni avertissement. Application **232,87 kB / 76,56 kB gzip** ; Three.js core 220,25 / 58,12 kB ; renderer 352,36 / 84,71 kB ; CSS 12,21 / 3,72 kB. [Journal du build](artifacts/build-v8.txt).
- **Chrome développement et production : contrôles complets réussis**, zéro erreur et zéro avertissement. Rapports : [développement](artifacts/benchmark-development.json), daté 2026-10-01T17:37:57.217Z ; [production](artifacts/benchmark-production.json), daté 2026-10-01T17:44:24.780Z.
- **Visual-check réussi : dix captures déterministes**, images revues, zéro erreur et zéro avertissement. [Métriques des captures](artifacts/visual/metrics.json), datées 2026-10-01T17:49:00.970Z.
- **Soak V2 réussi : 94,3 secondes**, neuf circuits, 45 échantillons de déplacement et 27 échantillons art : pluie, conduite réelle, huit intérieurs, souterrains, métro, pause et reload complet. Zéro erreur et zéro avertissement. [Rapport](artifacts/soak-development.json), daté 2026-10-01T12:56:03.919Z.
- **CITY_SEED = 1989, 64 chunks, quatre quartiers, 210 bâtiments, trois landmarks, 53 toits accessibles, huit intérieurs et 27 escaliers conservés.** Sauvegarde/reprise, modes Exploration/Vigilante, grappin/planage, véhicules/poursuites, crimes/missions/ennemis, métro, mini-carte, F3, mémoire, pause/options restent couverts par les vérifications historiques.
- Aucun nouveau système de gameplay majeur, aucune dépendance supplémentaire, aucun asset téléchargé.

## Performances mesurées

Chrome headless 154, Windows, **NVIDIA GeForce RTX 3070 via ANGLE D3D11**, 1440 × 900, DPR 1. Chaque mesure couvre environ six secondes après chauffe, session PLAYING, souris capturée. Ce matériel diffère de celui du rapport V7 : ces résultats ne constituent pas une comparaison de performances V7/V8 à matériel identique.

À pied, Vigilante, vue fixe, **production** :

| Profil | FPS moyen | 1 % low | Frame moyenne / max (ms) | Draw calls | Triangles/frame | Props | Enseignes | Lumières dynamiques |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,02 | 59,00 | 16,66 / 17,2 | 249 | 74 152 | 3 | 4 | 2 |
| MEDIUM | 60,01 | 58,06 | 16,66 / 18,1 | 281 | 80 400 | 16 | 10 | 6 |
| HIGH | 60,02 | 59,08 | 16,66 / 17,0 | 383 | 121 757 | 36 | 22 | 8 |
| AUTO | 60,01 | 59,17 | 16,66 / 16,9 | 383 | 121 746 | 36 | 22 | 7 |

En développement, les quatre profils mesurent également 60,01–60,02 FPS. Leurs 1 % low respectifs sont 59,35 / 59,26 / 59,44 / 59,17 FPS, avec des maxima de 16,9 ms.

Le FPS, le 1 % low et les temps de frame mesurés portent sur **la même fenêtre** de six secondes. Le 1 % low est le réciproque du temps moyen des 1 % de frames les plus lentes. F3 expose séparément une fenêtre glissante de 600 frames, susceptible d'inclure chargements et changements de qualité. Draw calls : moyenne des compteurs F3 échantillonnés. Triangles et décor à pied : dernier échantillon F3 agrégé, sans prétendre à une mesure par pixel. Les noms exacts de ces champs sont conservés dans les JSON.

Les compteurs de props, enseignes, néons et façades utilisent les lots visibles dans le frustum, sans occlusion individuelle. Les lumières dynamiques comptent les PointLight/SpotLight visibles d'intensité positive, y compris trafic et NIGHTRIDER ; ce total n'est pas seulement le pool des lampadaires. HIGH affiche ici 8 néons, 288 instances de façade, 105 détails de toit et 40 962 instances décoratives chargées sur 56 chunks. LOW/MEDIUM conservent 36 chunks. Ces nombres dépendent de la caméra.

Au volant, caméra CHASE, poursuite active, **production** :

| Profil | FPS moyen | 1 % low | Draw calls moyens | Triangles/frame moyens | CPU véhicules ms/frame | Police active |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,02 | 56,74 | 318 | 220 403 | 0,155 | 2 |
| MEDIUM | 60,02 | 59,17 | 343 | 239 034 | 0,240 | 3 |
| HIGH | 60,02 | 58,65 | 487 | 385 369 | 0,217 | 4 |

Les maxima de frame en conduite sont respectivement 19,8 / 16,9 / 17,1 ms. En développement, les trois profils mesurent également environ 60,02 FPS, avec 59,17 / 59,52 / 59,35 FPS en 1 % low.

Les objectifs de FPS sont atteints dans ces fenêtres sur cette machine. AUTO reste au budget HIGH dans cette vue proche de 60 FPS ; sa réduction progressive sous charge est aussi testée avec des deltas synthétiques à 35 FPS. Aucun résultat n'est présenté comme une garantie pour tous les GPU ou toutes les scènes. Les draw calls incluent le post-traitement existant. LOW désactive le compositeur ; les autres profils ajoutent l'étalonnage dans la passe de sortie existante, sans passe supplémentaire.

## Stabilité, streaming et mémoire

Comparaison après chauffe (cycle 2) et dernier retour au même point, après stabilisation et remise à la même résidence de chunks :

| Ressource | Après chauffe | Fin du soak |
| --- | ---: | ---: |
| Géométries GPU suivies | 23 | 23 |
| Textures GPU suivies | 47 | 47 |
| Programmes graphiques | 159 | 159 |
| Objets de scène | 1 088 | 1 088 |
| Instances décoratives chargées | 24 252 | 24 252 |
| Chunks résidents | 36 | 36 |
| Heap JS indicatif (MiB) | 101,56 | 98,58 |

La moyenne de résidence sur le parcours est **29,8 / 64 chunks**. Le pic observé de streaming est **3,9 ms**, pour un budget souple de 2 ms ; une reconstruction de lot ou une téléportation peut le dépasser. Le plus grand temps de frame récent enregistré parmi les échantillons du parcours est **33,2 ms**. Ce compteur glissant échantillonné ne constitue pas une trace exhaustive de toutes les frames depuis le démarrage.

Au point de comparaison : FPS moyen 60,02 → 60,01 ; 1 % low glissant 55,10 → 59,00 ; frame moyenne 16,66 → 16,66 ms ; maximum récent 23,1 → 17,2 ms. La sauvegarde progresse de 1 015 à 1 188 octets avec les découvertes et missions.

Les buffers d'instances décoratives sont réellement libérés au déchargement, puis reconstruits à l'identique depuis leurs recettes. Les matériaux, géométries partagées, recettes CPU et métadonnées restent bornés par les 64 chunks. Les intérieurs gardent le cache historique de deux entrées et libèrent leurs ressources locales. Pluie, éclaboussures, cônes et reflets utilisent des capacités fixes. Le catalogue commercial comporte seize noms, avec un cache de textures borné à quarante clés.

Les combinaisons de shaders/lumières sont préparées derrière l'écran de chargement. Les transitions d'intérieur synchronisent leur visibilité même avec delta nul ; elles ne découvrent plus de programme temporaire combinant éclairage de rue et éclairage intérieur. Les acteurs disposent de leur buffer de couleur dès la création du pool.

Géométries/textures/programmes proviennent de renderer.info ; les objets sont comptés dans la scène. Le heap dépend du ramasse-miettes. **Aucune mesure précise des octets de mémoire GPU n'est prétendue.** Ce soak d'environ une minute et demie confirme le plateau sur neuf cycles, pas une stabilité démontrée sur plusieurs heures.

## Couverture et captures

Les 26 tests V8 couvrent profils/palettes, transitions continues, hiérarchie de skyline, déterminisme des façades et matériaux, silhouettes dans les parcelles, signalétique bornée, formats/teintes de fenêtres, budgets de distance, LOD des props et fenêtres lointaines, identité entre profils, streaming exact des transformations/couleurs/métadonnées, propriété des matériaux, pooling, paramètres de pluie et brouillard, éclaboussures, orages déterministes et désactivation, compatibilité des options sauvegardées, adaptation AUTO, collisions des ailes décalées et nettoyage de la préparation des shaders en succès comme en échec.

Le browser-check garde ses scénarios historiques et vérifie en plus les compteurs ART/RENDER/STREAMING, les trois profils de couleur, les options d'orage/vignette et leur sauvegarde/reprise. Les quatre quartiers, pluie, véhicule, intérieur, streaming, pause, reload et F3 sont couverts en développement. La production emploie les vraies commandes clavier/souris et l'interface publique ; les fixtures détaillées des quartiers restent propres au développement. Les fixtures Vite ne sont pas livrées comme globals dans l'application.

Le visual-check capture **Downtown, Old Gotham, Industrial, Docks, cathédrale, Meridian Tower, bâtiment municipal, métro, intérieur municipal et pluie** à des positions et orientations fixes. Chaque vue repart d'un chargement neuf, seed 1989, HIGH, horloge 180 s, grading DEFAULT et météo prescrite. Il écrit les PNG et les compteurs draw calls, triangles, bâtiments visibles, props, enseignes et lumières dans [artifacts/visual](artifacts/visual). **Aucune comparaison perceptuelle ou pixel à pixel n'est implémentée.** Les captures servent à la revue visuelle et les métriques à une comparaison quantitative explicite.

## Limites connues

- Géométrie et textures procédurales stylisées : pas de matériaux photographiques ni d'intérieurs réels derrière les fenêtres. Les formes en L/U et cours reposent sur un socle continu qui conserve les accès historiques.
- Reflets, profondeur des fenêtres et cônes lumineux sont des approximations. Aucun SSR, TAA complexe, éclairage volumétrique réel ou réflexion planaire. LOW ne conserve que l'exposition pour l'étalonnage.
- Les niveaux de détail ont des seuils discrets ; les budgets AUTO évoluent progressivement mais un détail peut apparaître à une frontière de distance. Les petits accessoires restent décoratifs, sans nouveau collider.
- La pluie est cachée en intérieur et sous terre, sans test individuel sous chaque pont. Le métro reste visuel, sans embarquement supplémentaire.
- Les mesures sont courtes, sur une seule configuration matérielle. La préparation des shaders alourdit le chargement initial ; les téléportations peuvent dépasser le budget souple de streaming.
- Une session manuelle complémentaire de 20–30 minutes reste utile pour juger confort du grappin, conduite, lisibilité, audio et préférences artistiques ; elle n'est pas revendiquée comme effectuée par les scripts.

## Fichiers créés — 19, hors artefacts

```text
ART_DIRECTION.md
scripts/art-browser-check.mjs
scripts/visual-check.mjs
src/art/ArtDirection.js
src/art/ArtVisibility.js
src/art/BuildingSilhouettes.js
src/art/FacadeGenerator.js
src/art/InteriorArt.js
src/art/MaterialVariation.js
src/art/SignageSystem.js
src/art/TechnicalMarks.js
src/rendering/BackgroundSkyline.js
src/rendering/ColorGrading.js
src/rendering/LightAtmosphere.js
src/rendering/ShaderWarmup.js
src/rendering/WeatherParameters.js
src/systems/StormSystem.js
src/world/StreetProps.js
tests/art.test.js
```

## Fichiers modifiés — 38, hors artefacts

```text
README.md
VALIDATION.md
index.html
package.json
package-lock.json
scripts/browser-check.mjs
scripts/cdp.mjs
scripts/persistence-browser-check.mjs
scripts/soak-test.mjs
scripts/vertical-browser-check.mjs
src/interiors/Interior.js
src/lighting/CityLights.js
src/main.js
src/rendering/WeatherPolish.js
src/save/SaveSchema.js
src/systems/AudioManager.js
src/systems/LivingCity.js
src/systems/PerformanceManager.js
src/systems/RainSystem.js
src/systems/RuntimeDiagnostics.js
src/systems/VisibilityManager.js
src/systems/WorldRuntime.js
src/ui/DebugPanel.js
src/ui/Interface.js
src/ui/OptionsController.js
src/utils/DynamicInstances.js
src/utils/procedural.js
src/utils/windows.js
src/world/Building.js
src/world/ChunkStreamingManager.js
src/world/CityChunk.js
src/world/CityResources.js
src/world/CollisionWorld.js
src/world/ElevatedRail.js
src/world/Landmarks.js
src/world/Road.js
src/world/RoofDetails.js
src/world/Underground.js
```

Artefacts mis à jour : rapports développement/production/soak et captures historiques correspondantes. Artefacts créés : trois journaux de tests/build, dix captures V8 et leur fichier metrics.json. Les anciens artefacts non régénérés restent des références historiques ; seuls les rapports datés et cités ci-dessus constituent les mesures V8.

## Reproduire

Depuis le dossier du projet, avec les dépendances installées :

```powershell
npm.cmd test
npm.cmd run build
# Dans deux terminaux dédiés :
npm.cmd run dev -- --host 127.0.0.1 --port 5177
npm.cmd run preview -- --host 127.0.0.1 --port 4177
```

Démarrer un Chrome de test distinct avec son profil dédié et le port DevTools 9222, comme décrit dans [README.md](README.md), puis exécuter **successivement** :

```powershell
npm.cmd run test:browser -- http://127.0.0.1:5177/
npm.cmd run test:browser -- http://127.0.0.1:4177/ --production
npm.cmd run test:visual -- http://127.0.0.1:5177/
npm.cmd run test:soak -- http://127.0.0.1:5177/
```

Le visual-check et le soak instrumentent les modules du serveur de développement. Le browser-check valide séparément le build de production. Ne pas lancer simultanément plusieurs scripts sur le même port DevTools.
