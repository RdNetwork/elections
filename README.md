# Visualisation des tendances électorales en France

Petit projet maison de dataviz (?) pour observer l'évolution de tendances électorales de la Cinquième République en France. Ce projet a été majoritairement développé en avril 2023 et repris fin janvier 2025.

## Description

Ce code génère un graphique en aires empilées, qui montre l'évolution des scores aux élections par tendance politique depuis les présidentielles de 1965.
Il y a différentes variables d'ajustement et filtres disponibles : 

* Afficher les premiers ou seconds tours des élections compilées (les élections à tour unique sont incluses dans tous les cas). Par défaut, les premiers tours sont affichés. Il n'est pas possible d'afficher les deux tours en même temps, car je considère que les contextes sont très différents dans les deux cas.
* Afficher les résultats en pourcentage des votes exprimés (c'est le résultat par défaut) ou en valeurs absolues du nombre de voix exprimées.
* Filtrer selon le type d'élection.


## Comment utiliser ce code

### Ce dont vous avez besoin

* Les fichiers de ce dépôt
* Un navigateur web récent et ne bloquant pas JavaScript
* Un serveur Web : si vous essayez de générer le graphique en local, votre navigateur va vraisemblablement vous hurler
 dessus à cause des [requêtes CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS).
Le plus simple est d'utiliser un petit serveur web minimal (comme `http-server` sur Node.js ou `http-server` via Python).
Je n'ai pour le moment pas prévu d'héberger ce projet sur un site dédié.

### Fonctionnement

Ce projet utilise la librairie [D3.js](https://d3js.org/) pour la gestion des données et leur représentation graphique.
Il utilise également la librairie annexe [d3-area-label](https://github.com/curran/d3-area-label) pour annoter les zones directement sur le graphique.

Les données compilées dans le fichier JSON sont interprétées par le code et regroupées ensemble par courant politique identique. 
On dessine ensuite un "*stacked area chart*" (graphique en aires empilées) en calculant les dimensions de chaque zone à chaque point de l'axe X (axe des dates), sa couleur dépendant du courant politique.

## Améliorations prévues

* Faire apparaître l'abstention
* Faire mieux apparaître les coalitions entre courants politiques (par exemple via des hachures)
* Ajouter d'autres élections (notamment les municipales, si tant est que ça ait du sens)
* Vérifier les améliorations apportées par l'équipe de D3.js ces dernières années (vu que l'exemple dont je me suis inspiré a été mis à jour)

## Données

Les données des élections proviennent le plus possible des données du Ministère de l'Intérieur,
parfois trouvées directement sur leur site, et sinon compilées par ailleurs. Par exemple, j'ai parfois utilisé :
* [Wikipédia](https://fr.wikipedia.org/wiki/Scrutins_en_France_sous_la_Cinqui%C3%A8me_R%C3%A9publique)
* [Data.Gouv](https://www.data.gouv.fr/fr/posts/les-donnees-des-elections/)
* [France-Politique](https://www.france-politique.fr/) et les travaux de Laurent de Boisseau

Je compile ces données manuellement dans un format JSON créé pour l'occasion, où je classe également
chaque candidat dans un "pool" politique. Ce choix est subjectif, mais j'essaye de le faire de la façon la plus logique
et consensuelle possible :
* Le pool `Extrême gauche` regroupe tous les partis explicitement trotskistes, communistes radicaux, et révolutionnaires (LO, LCR, NPA...)
* Le pool `Gauche radicale/communiste` regroupe tous les partis communistes et trotskistes modérés et réformistes, de gauche antilibérale et progressiste (PCF post-1945, FG/LFI, PSU...)
* Le pool `Gauche` regroupe tous les partis socialistes et socio-démocrates réformistes et aux tendances progressistes (PS...) 
* Le pool `Gauche écologiste` regroupe tous les partis centrés sur les enjeux écologiques dans sa conceptoion majeure depuis les années 1990, à savoir une gauche sociale large (Europe-Ecologie Les Verts). Note : les formations écologistes plus anciennes ou les formations actuelles se réclamant d'une écologie apartisane ou non-classée à gauche sont regroupées au sein de la famille centriste, et non ici (Cap21, EàC, LV pré-1993, GE pré-2018...)
* Le pool `Centre-gauche` regroupe tous les partis socio-démocrates, les courants de gauche se réclamant non-marxistes et communistes, et les partis centristes se réclamant de la gauche et du centre (MRG/PRG, Place Publique...) 
* Le pool `Centre` regroupe tous les partis du centre historique, oscillants entre social-démocratie et libéralisme mais sans accent prononcé sur le capitalisme, le conservatisme ou le socialisme, ainsi que les partis de type "Troisième Voie" (UDF post-2000, MODEM, LREM-TDP...)
* Le pool `Centre-droit` regroupe les partis centristes à tendance libérale/capitaliste assumée ou se réclamant du centre et de la droite (UDF pré-2000, LREM-HOR, CNIP pré-1980, UDI...)
* Le pool `Droite` regroupe tous les partis gaullistes, libéraux-conservateurs et capitalistes, appartenant historiquement à la droite (RPR/UMP/LR...)
* Le pool `Droite radicale/souverainiste` regroupe tous les partis de droite marqués par une idéologique plus spécifiquement conservatrice, religieuse ou souverainistes mais se réclamant de la droite, qu'elle soit "gaulliste-sociale" ou capitaliste (MPF/DLF, Via...)
* Le pool `Extrême droite` regroupe tous les partis les plus conservateurs, anti-immigration ou à ligne xénophobe ou fasciste, peu importe leur ligne économique (FN/RN, CTV, MNR...)
* Le pool `Divers` regroupe tous les autres partis, à tendance non-clairement définie sur l'échiquier politique (ou dont ce n'est pas l'aspect principal) : régionalistes, fédéralistes, animalistes, ultramarins, "attrape-tout", écologistes hors gauche, sans étiquette... 

Ces "pools" sont classés dans des blocs plus larges (affichés si vous cochez la case idoine) comme suit : 
* Le bloc `Gauche` cumule les résultats des pools `Extrême gauche`, `Gauche radicale/communiste`, `Gauche`, `Gauche écologiste`, et `Centre-gauche`.
* Le bloc `Centre` cummule les résultats des pools `Divers` et `Centre`.
* Le bloc `Droite` cummule les résultats des pools `Centre-droit`, `Droite`, `Droite radicale/souverainiste` et `Extrême droite`.

Évidemment, ce n'est pas toujours parfait (par exemple pour les partis écologistes et les coalitions, sans compter les partis dont la ligne évolue).
Je suis conscient qu'il peut exister des désaccords. Sachez toutefois que vous pouvez très simplement réaligner les pools et blocs vous-mêmes dans le code.

Dans les élections avec énormément de candidats/listes dont beaucoup de petites (typiquement : les élections européennes), j'ai fait le choix de grouper les petits candidats (moins de 1-2% des suffrages exprimés) directement dans leur pool le plus pertinent, en totalisant leurs voix (par exemple, des listes mineures d'extrême droite n'apparaissent pas individuellement dans les données JSON, maias dans un item unique de type `Divers extrême droite`).

## Contact

Si vous rencontrez un souci ou que vous voulez proposer une amélioration, utilisez les Issues.

Pour toute autre demande, contactez-moi directement : Rémy Delanaux [@RdNetwork](https://bsky.app/profile/rdnetwork.bsky.social)


## Licence

Ce projet est sous licence MIT (voir le fichier LICENSE.md pour les détails, en anglais).
Le code de génération du graphique en aires est [fourni par Observable sous licence ISC](https://observablehq.com/@d3/normalized-stacked-area-chart)
à partir d'un exemple de code datant de 2021.