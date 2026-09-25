# Validation — World Polish & Persistence V7

## Résultats

- **131 tests Node réussis**, aucun ignoré : les **102 tests historiques inchangés**, plus 29 tests V7.
- **Build réussi : 108 modules**, sans erreur ni avertissement. Application **205,34 kB / 66,34 kB gzip** ; Three.js core 218,55 kB ; renderer 352,37 kB ; CSS 12,21 kB.
- **Chrome développement et production : contrôles complets réussis**, zéro erreur console, zéro avertissement dans les deux rapports.
- **Soak : 75,8 secondes**, neuf circuits, 45 changements de zone, entrées/sorties de véhicule, missions, pluie, pause et un reload complet ; zéro erreur/avertissement.
- **Seed 1989, 64 chunks logiques, quatre quartiers, 210 bâtiments, trois landmarks**, 53 toits, huit intérieurs, 27 escaliers et quatre zones souterraines conservés. Les modes, grappin/planage, crimes, IA/combat, véhicules/poursuites, métro et systèmes d’ambiance restent testés.
- Aucune dépendance, physique externe ni asset téléchargé.

Rapports : [développement](artifacts/benchmark-development.json), [production](artifacts/benchmark-production.json), [soak](artifacts/soak-development.json). Dates exactes : développement 2026-09-25T16:14:13.123Z, production 2026-09-25T16:19:06.368Z, soak 2026-09-25T20:44:39.195Z.

Un [contrôle final du démarrage de production](artifacts/startup-production.json) vérifie également le mode du menu après CONTINUER et une nouvelle partie lorsque getItem/setItem/removeItem refusent tous le stockage : le jeu reste jouable et affiche « Sauvegarde indisponible ». Une déconnexion DevTools pendant un essai supplémentaire a nécessité de relancer le profil Chrome de test ; ce contrôle a ensuite réussi, sans erreur ni avertissement dans l’application.

## Mesures

Chrome headless 154 sous Windows, 1440 × 900, DPR 1 ; GPU **ANGLE (Intel, Intel(R) Graphics (0x00007D45) Direct3D11 vs_5_0 ps_5_0, D3D11)**. La souris est capturée et la session PLAYING pendant les mesures de jeu. Chaque benchmark mesure environ six secondes après chauffe. La préparation initiale des programmes graphiques et textures partagées s’effectue derrière l’écran de chargement.

À pied, Vigilante, vue fixe :

| Profil | FPS moyen mesuré | 1 % low F3 approximatif | Draw calls moyens | Triangles/frame | Chunks chargés | CPU IA ms/tick / IA active |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 35,0 | 241 | 68 342 | 36 | 0,004 / 0 |
| MEDIUM | 60,0 | 57,9 | 267 | 71 722 | 36 | 0,038 / 4 |
| HIGH | 60,0 | 38,8 | 352 | 107 366 | 56 | 0,048 / 6 |
| AUTO | 60,0 | 58,1 | 352 | 107 366 | 56 | 0,039 / 6 |

Le 1 % low est le réciproque du temps moyen des 1 % de frames les plus lentes dans une fenêtre glissante de **600 frames**. Cette fenêtre n’est pas réinitialisée au changement de profil : elle peut inclure démarrage, chargements et changement de qualité, alors que les FPS du benchmark couvrent la fenêtre stabilisée de six secondes. Les chiffres ne sont donc pas interchangeables. LOW peut avoir zéro IA complexe dans cette vue : le nombre actif réel figure dans la dernière colonne, ce n’est pas un stress test de six ennemis.

Au volant, CHASE au garage avec poursuite active :

| Profil | FPS | Draw calls moyens | Triangles/frame | CPU véhicules ms/frame | Police active |
| --- | ---: | ---: | ---: | ---: | ---: |
| LOW | 60,0 | 313 | 271 718 | 0,455 | 2 |
| MEDIUM | 60,0 | 338 | 275 382 | 0,425 | 3 |
| HIGH | 60,0 | 464 | 394 144 | 0,416 | 4 |

Les plafonds du trafic restent 10/20/40, police 2/3/4, un NIGHTRIDER et une cible éventuelle. AUTO part de HIGH, réduit progressivement pluie/populations/distances entre 55 et 100 % ; aucun changement n’était nécessaire dans la vue à 60 FPS. Son adaptation sous charge est également testée avec un rythme synthétique de 35 FPS.

CPU IA mesure EnemyManager par tick de 30 Hz ; CPU véhicules inclut physique, poursuite/mission et préparation du rendu/HUD. Draw calls et triangles incluent le post-traitement. Le budget de génération ne mesure pas le temps GPU.

## Streaming, mémoire et sauvegarde

- Moyenne de chunks chargés sur les **45 échantillons du parcours** : **30,7 / 64**. Au même point de retour après stabilisation : 44 chunks.
- Budget souple de reconstruction : **2 ms/frame** ; pic observé de ChunkStreamingManager.update pendant le soak : **3,20 ms**. Les constructions synchrones de secours lors d’une reprise/téléportation ne sont pas incluses dans ce compteur. En vue stabilisée, le coût de planification observé est généralement proche de 0–0,1 ms/frame.
- Géométries après chauffe → fin : **18 → 18**.
- Textures après chauffe → fin : **44 → 44**.
- Objets Three.js au même point : **1051 → 1051**. Les variations pendant le parcours correspondent aux groupes résidents, pas à une accumulation monotone.
- Sauvegarde en fin de soak : **1181 octets** (UTF-8 du JSON). Une partie peu avancée mesurée pendant les benchmarks : 831 octets. Les identifiants sont bornés ; limite de sécurité globale 256 KiB.
- Plus grande frame dans les fenêtres glissantes échantillonnées du parcours : **33,1 ms**. Le parcours impose des téléportations et un reload : des pics ponctuels subsistent. Les FPS échantillonnés après stabilisation sont proches de 60, mais cela ne garantit pas chaque frame à 16,7 ms.

Le soak compare les ressources après chauffe et répète le même point final. Il surveille aussi populations, pools et nombre de chunks. Le registre de pools observe les allocations existantes sans recréer les particules ou acteurs. Géométries/textures/programmes viennent de renderer.info ; objets viennent de la scène. Le heap JavaScript de Chrome est indicatif et dépend du GC. **Aucune mesure précise de mémoire GPU n’est prétendue.** Les compteurs de timers/listeners portent sur les nouveaux systèmes de session, pas sur tous les composants internes du navigateur.

Le streaming libère réellement les buffers d’instances et enlève les collisions de l’index. Les tableaux CPU déterministes, métadonnées, matériaux/géométries partagés et petits groupes de portes/halos référencés restent conservés. Ils sont bornés par les 64 chunks. Décharger un chunk ne dispose jamais une ressource partagée encore utilisée ; les intérieurs gardent leur cache historique de deux entrées avec disposal local.

## Couverture automatisée

Les 29 nouveaux tests couvrent round-trip DTO, validation de types/bornes/seed/version, migrations contiguës, refus de données futures, stockage refusé/quota, regroupement et périodicité des écritures, nouvelle partie, chargement/déchargement effectifs, égalité exacte des buffers, collisions après rechargement, absence de doublons, préchargement, budget, ownership des ressources, génération asynchrone, pause/delta, fenêtre FPS, AUTO, matériaux, pools, caméra à zéro, restauration runtime, position invalide, garage de récupération, véhicule désactivé, caméra automobile, missions à pied et automobiles, progression et arrêt des simulations.

Le browser-check garde les scénarios V2–V6. Les délais des assertions de transitions V4 ont été allongés pour inclure le fondu de 240 ms et l’échantillonnage F3 de 250 ms ; aucune assertion historique supprimée. En développement, des fixtures temporaires accèdent aux classes Vite pour placer le joueur, puis les interactions passent par les vraies touches. **Aucun global de test n’est livré dans l’application.** La production utilise les contrôles clavier/souris, le menu, les diagnostics publics et localStorage.

V7 automatise nouvelle partie (confirmation si nécessaire), découverte du garage, entrée dans NIGHTRIDER, conduite/freinage, pause avec position/temps/train figés, sauvegarde des options, reload complet, CONTINUER, restauration du mode/véhicule/intégrité/découvertes/options, sortie, déplacement et F3. Le développement vérifie en plus des déplacements entre quatre quartiers avec chargements/déchargements et collisions présentes. Les reprises de position à pied et de missions sont couvertes par les tests runtime.

## Reproduire

Utiliser un profil Chrome de test isolé : le scénario remplace volontairement sa sauvegarde. Serveurs et Chrome doivent être démarrés séparément.

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
# Dans un autre terminal :
npm run preview -- --host 127.0.0.1 --port 4177 --strictPort
Start-Process -FilePath 'C:/Program Files/Google/Chrome/Application/chrome.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--remote-debugging-port=9222','--user-data-dir=C:/Users/Maxime/Documents/Town/gotham-3d/node_modules/.cache/v7-browser','--disable-extensions','--disable-features=BackForwardCache','--no-first-run','about:blank'
npm run test:browser -- http://127.0.0.1:5177/
npm run test:browser -- http://127.0.0.1:4177/ --production
npm run test:soak -- http://127.0.0.1:5177/
```

Ne pas lancer deux scénarios simultanément sur le même port DevTools. Le soak utilise les fixtures du serveur de développement et dure environ 80 secondes ; le parcours de production est couvert séparément par browser-check. Les scripts utilisent uniquement Node et le protocole Chrome DevTools.

## Contrôles manuels complémentaires

1. Jouer 20–30 minutes sur la machine cible, parcourir toute la ville à pied, en boost et avec grappin/planage. Surveiller les 1 % low et pics F3 ; tester plusieurs résolutions/GPU.
2. Tester les trois caméras de conduite, collision contre une façade, freinage, sortie bloquée des deux côtés, réparation et poursuite. Vérifier le confort avec mouvement caméra 0 puis 100 %, secousses indépendantes, FOV et sensibilité extrêmes.
3. Sauvegarder sur un toit, dans un intérieur, dans le souterrain et près d’un ascenseur. Après CONTINUER, vérifier le sol et les interactions. Une position dans une cage d’ascenseur sans support reconstruit peut revenir au point sûr.
4. Terminer une mission, découvrir un landmark, sauvegarder et recharger. Vérifier progression, nouvelle partie/annulation de confirmation, retour au menu et alternance Exploration/Vigilante.
5. Dans un profil de test, rendre localStorage indisponible ou remplir son quota : le jeu doit rester utilisable et afficher le statut d’échec. Injecter JSON invalide/version future : CONTINUER doit disparaître sans charger des données arbitraires.
6. Écouter au casque MASTER/AMBIENCE/effets, moteur, pluie, sirène et notifications. Les tests headless ne jugent pas le mix perçu.
7. Maintenir une touche puis Échap/Alt-Tab et reprendre : pas de touche bloquée ni rattrapage de delta. Vérifier les fondus d’intérieur et de respawn sans écran noir prolongé.
8. Réduire les performances de la machine pour observer AUTO sur plusieurs minutes. L’unitaire valide les bornes ; la vue de référence à 60 FPS ne force pas sa réduction.

## Limites connues

La ville reste finie et les recettes CPU sont conservées : pas de Worker, de chargement réseau ni de sérialisation intégrale de l’IA. Les missions sont restaurées avec leur état minimal, les poursuites repartent depuis leur contexte de mission plutôt qu’avec les positions exactes de toutes les unités. Le stockage est propre à l’origine, sans chiffrement ni synchronisation cloud.

Le budget 2 ms est une limite souple entre lots, pas une garantie temps réel ni une mesure des uploads GPU. Des pics subsistent sur téléportation, nouveau domaine, changement de profil et reload. Les silhouettes lointaines des landmarks sont simplifiées. Les paramètres de détails de toiture sont préparés mais certains lots historiques restent groupés pour préserver escaliers et accès. Pluie non occluse individuellement sous chaque pont, flaques et humidité sans réflexion de scène.

L’IA et la physique restent arcade. Les voitures peuvent attendre longtemps derrière un obstacle, sans dépassement ni remorquage ; NIGHTRIDER désactivé conserve son intégrité à la reprise. Les véhicules ne pénètrent pas dans les domaines intérieurs fermés. Le test de durée de ~80 secondes recherche une dérive évidente ; il ne prouve pas l’absence de fuite sur plusieurs heures. Les valeurs proches de 60 FPS sont mesurées sur ce matériel et ces vues, sans garantie universelle de 50/60 FPS.

## Fichiers créés — 23 hors artefacts

- [scripts/cdp.mjs](scripts/cdp.mjs)
- [scripts/persistence-browser-check.mjs](scripts/persistence-browser-check.mjs)
- [scripts/soak-test.mjs](scripts/soak-test.mjs)
- [src/camera/CameraEffects.js](src/camera/CameraEffects.js)
- [src/rendering/LandmarkSilhouettes.js](src/rendering/LandmarkSilhouettes.js)
- [src/rendering/MaterialManager.js](src/rendering/MaterialManager.js)
- [src/rendering/SkySystem.js](src/rendering/SkySystem.js)
- [src/rendering/WeatherPolish.js](src/rendering/WeatherPolish.js)
- [src/save/SaveManager.js](src/save/SaveManager.js)
- [src/save/SaveMigrations.js](src/save/SaveMigrations.js)
- [src/save/SaveSchema.js](src/save/SaveSchema.js)
- [src/save/WorldPersistence.js](src/save/WorldPersistence.js)
- [src/systems/FramePacing.js](src/systems/FramePacing.js)
- [src/systems/PoolRegistry.js](src/systems/PoolRegistry.js)
- [src/systems/RuntimeDiagnostics.js](src/systems/RuntimeDiagnostics.js)
- [src/systems/SessionState.js](src/systems/SessionState.js)
- [src/systems/WorldRuntime.js](src/systems/WorldRuntime.js)
- [src/ui/LoadingScreen.js](src/ui/LoadingScreen.js)
- [src/ui/OptionsController.js](src/ui/OptionsController.js)
- [src/ui/Transitions.js](src/ui/Transitions.js)
- [src/world/ChunkStreamingManager.js](src/world/ChunkStreamingManager.js)
- [tests/persistence.test.js](tests/persistence.test.js)
- [tests/resume.test.js](tests/resume.test.js)

## Fichiers modifiés — 31 hors artefacts

- [README.md](README.md)
- [VALIDATION.md](VALIDATION.md)
- [index.html](index.html)
- [package-lock.json](package-lock.json)
- [package.json](package.json)
- [scripts/browser-check.mjs](scripts/browser-check.mjs)
- [scripts/vertical-browser-check.mjs](scripts/vertical-browser-check.mjs)
- [src/ai/EnemyManager.js](src/ai/EnemyManager.js)
- [src/gameplay/CrimeSystem.js](src/gameplay/CrimeSystem.js)
- [src/gameplay/WorldMarkers.js](src/gameplay/WorldMarkers.js)
- [src/lighting/CityLights.js](src/lighting/CityLights.js)
- [src/main.js](src/main.js)
- [src/style.css](src/style.css)
- [src/systems/AudioManager.js](src/systems/AudioManager.js)
- [src/systems/LivingCity.js](src/systems/LivingCity.js)
- [src/systems/PedestrianSystem.js](src/systems/PedestrianSystem.js)
- [src/systems/PerformanceManager.js](src/systems/PerformanceManager.js)
- [src/systems/SteamSystem.js](src/systems/SteamSystem.js)
- [src/systems/TrafficLights.js](src/systems/TrafficLights.js)
- [src/systems/TrafficSystem.js](src/systems/TrafficSystem.js)
- [src/ui/DebugPanel.js](src/ui/DebugPanel.js)
- [src/ui/Interface.js](src/ui/Interface.js)
- [src/ui/Minimap.js](src/ui/Minimap.js)
- [src/utils/spatialQueries.js](src/utils/spatialQueries.js)
- [src/vehicles/VehicleCamera.js](src/vehicles/VehicleCamera.js)
- [src/vehicles/VehicleManager.js](src/vehicles/VehicleManager.js)
- [src/vehicles/VehiclePhysics.js](src/vehicles/VehiclePhysics.js)
- [src/vehicles/VehicleRenderer.js](src/vehicles/VehicleRenderer.js)
- [src/world/City.js](src/world/City.js)
- [src/world/CityResources.js](src/world/CityResources.js)
- [src/world/CollisionWorld.js](src/world/CollisionWorld.js)

Rapports et captures régénérés dans artifacts/ ; nouveaux artefacts persistence-development.png, persistence-production.png, soak-development.json et startup-production.json. Les cinq fichiers de tests historiques n’ont pas été modifiés. Le fichier package-lock.json ne change que d’identité/version et de formatage ; aucune dépendance ajoutée.
