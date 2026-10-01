# Art Pass & Atmosphere — V8

La ville conserve son plan, ses quatre quartiers et ses fonctions. Son langage visuel associe pierre sombre, proportions gothiques, retraits art déco et structures industrielles. Les volumes et emblèmes sont procéduraux et originaux. Aucun asset externe n'est nécessaire.

La source des palettes, formats de fenêtres, règles de façade et budgets est [ArtDirection.js](src/art/ArtDirection.js).

| Quartier | Volumes | Surface | Lumière et signalétique |
| --- | --- | --- | --- |
| Downtown | Podiums, tours fines, retraits successifs | Pierre bleutée, métal, corniches verticales | Blanc et or, panneaux à doubles filets |
| Old Gotham | Ailes, cours sur socle, volumes irréguliers, pinacles | Pierre chaude, grain minéral, plinthes sombres | Fenêtres d'appartements, cuivre, lettrage à empattements |
| Industrial | Masses compactes, entrepôts, volumes techniques | Béton, métal, touches de rouille | Lumière froide, panneaux utilitaires |
| Docks | Hangars bas, structures portuaires | Béton humide, métal bleu gris | Lumière diffuse, enseignes peintes |

Les transitions occupent 128 mètres autour des deux axes de quartiers. La teinte des façades et les enseignes mélangent les identités de façon déterministe. Les hauteurs sont composées autour d'un centre vertical ; les voies existantes gardent les approches des trois monuments dégagées.

Les fenêtres emploient des cadres instanciés et un shader de profondeur simulée : bord sombre, rideaux, luminosité variable. Aucun intérieur supplémentaire n'est généré derrière ces fenêtres. Les neuf matériaux historiques restent partagés ; le grain, les traces de pluie et la rugosité varient dans le shader et par couleur d'instance.

Les nouveaux détails de façade, de toit et de rue sont dans les chunks. Ils sont supprimés au déchargement, puis reconstruits depuis leurs recettes immuables. Changer de qualité sélectionne un niveau de détail et un sous-ensemble du décor ; cela ne relance aucun générateur aléatoire.

Les enseignes commerciales utilisent seize noms fictifs réutilisés, avec un cache de textures limité par quartier/type/variante. Les panneaux techniques utilisent un petit alphabet géométrique partagé. Les néons sont essentiellement emissive, avec animation de luminosité et segments éteints. Les lampes de rue gardent leur pool de six lumières maximum ; l'intérieur actif dispose d'une lumière locale.

La pluie, les éclaboussures, les cônes et les réflexions approximatives utilisent des buffers et pools bornés. Les orages sont désactivés par défaut, avec des intervalles déterministes de quatre à onze minutes de pluie soutenue. L'étalonnage réutilise la passe de sortie existante ; LOW utilise seulement l'exposition. Pas de TAA, de SSR ni de réflexion planaire.

Les captures de [artifacts/visual](artifacts/visual) documentent dix caméras fixes avec seed, météo, horloge et compteurs de rendu. Il ne s'agit pas d'une comparaison perceptuelle automatisée.

Les combinaisons de shaders et de lumières sont préparées derrière l'écran de chargement. La visibilité des zones est synchronisée même pendant un fondu ou une pause, afin qu'une entrée dans un intérieur ne cumule pas temporairement éclairage de rue et éclairage local. Les buffers de couleur des acteurs sont alloués dès la création des pools pour éviter une compilation lors de leur première apparition.
