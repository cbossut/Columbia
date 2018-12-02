*** Titre ***
Nom de la conduite précédemment chargée. * = modification non sauvegardée

*** Indicateur d'état ***
En haut à droite, un gros rond. Vert, c'est bon, rouge c'est déconnecté, bleu sauvegarde en cours. S'il reste bleu, il y a probablement un problème, tenter d'actualiser la page.

*** Ligne Général ***
Menu déroulant listant les conduites présentes en mémoire.
Bouton charger pour charger.
Bouton choisir comme conduite pour modifier la conduite qui se charge automatiquement au démarrage.
Bouton éditer pour ouvrir/fermer les éléments permettant de modifier la conduite actuelle.

*** Ligne Édition ***
Bouton nouveau pour démarrer une nouvelle conduite vide.
Bouton sauvegarder pour sauver la conduite actuelle sous le nom entré dans le champ juste à gauche.
En cas d'édition, il y a aussi une sauvegarde automatique toutes les minutes sous le nom 'autosave', ainsi qu'une copie de sauvegarde toute les 5 minutes nommé de la date inexacte du système.
Bouton patch pour faire apparaître/disparaître la zone d'édition du patch (qu'il faut sauvegarder aussi).
Bouton quitter pour fermer l'application (qu'il faudra relancer en ligne de commande).

*** Ligne Son ***
Menu déroulant des pistes son disponibles.
Bouton charger pour charger la piste son sélectionnée sur la conduite actuelle.
Bouton lire pour lancer la lecture de la conduite depuis le curseur de lecture.
Indicateur du temps écoulé sur temps total de la piste son.

En haut à gauche et à droite de la barre verte sont indiqué les dates de début et de fin de l'affichage. Ces dates sont cliquer-glissable pour zoomer/dézoomer l'affichage.
Sur la barre sont représentés :
Le curseur de lecture, par la délimitation vert clair / vert foncé, cliquer-glissable pour changer la position de lecture (y compris en cours de lecture).
Les dates des mémoires associées à leur numéro, cliquer-glissable pour modifier leur date.

*** Panneau Conduite ***
Bouton ajouter pour ajouter une mémoire portant le numéro entré dans le champ juste à gauche. Elle viendra s'insérer dans l'ordre croissant parmi les mémoires existantes. Pour insérer entre deux mémoires consécutives, la notation x.y peut être utilisée (voire x.y.z).
Bouton supprimer pour effacer de la conduite la mémoire sélectionnée au-dessous.
Bouton GO pour lancer la conduite (sans le son) à partir de la mémoire sélectionnée au-dessous.

Pour chaque mémoire :
Nom, aide à l'organisation, aucune influence sur l'exécution.
Seq, ordre dans la séquence (première, deuxième, etc ...).
Mem, numéro de la mémoire, tel qu'entré à la création de celle-ci.
Modifier, permet de changer l'état lumineux associé à la mémoire pour celui en cours. Pour se faire, cliquer une première fois sur le bouton (il deviens vert), et recliquer dessus dans les 5sec pour valider.
Durées, permet d'attribuer simultanément la même valeur aux deux durées de transition.
Montée, durée d'allumage de la mémoire à partir de sa date.
Descente, durée d'extinction de la mémoire précedente à partir de la date de celle-ci.
Date de déclenchement de la transition vers la mémoire.

Pour sélectionner une mémoire, cliquer dessus (ailleurs que sur un bouton ou dans un champ éditable).

*** Panneau Jeu d'Orgue ***
Chaque case représente un circuit, avec son numéro et sa valeur actuelle en %.
Cliquer-glisser verticalement pour changer la valeur.

*** Panneau Patch ***
Pour chaque circuit :
Voie, le numéro du circuit, permettant de l'identifier dans le jeu d'orgue.
Nom, aide à l'organisation, aucune influence sur l'exécution.
Addresse, addresse physique (I2C) de la carte PCA et numéro du circuit sur cette carte.
Courbe, valeur d'exposant de la courbe associée au circuit.

*** Raccourcis clavier ***
Flèches haut/bas : sélection de la mémoire précédente/suivante.
Barre Espace : bouton GO, ou si lecture déjà en cours, sauter à la mémoire suivante.
Touches 5/T : Augmenter/diminuer la date de la mémoire sélectionnée de 1mn.
Touches 6/Y : ... de 1sec.

Pour sélectionner un circuit du jeu d'orgue, cliquer dessus.
Pour sélectionner tous les circuits allumés dans la mémoire sélectionnée, cliquer sur le bouton All dans le coin supérieur droit du panneau Conduite.
Flèches gauche/droite : sélection du circuit précédent/suivant.
Touche Échap : désélectionner tous les circuits.
Touches 1/A : augmenter/diminuer la valeur des circuits sélectionnés de 1%.
Touches 2/Z : ... de 0.1%.
Touches 3/E : ... de la valeur minimum (~0.02%).
Touches I/O : ... de 100% (full/off).
Touche P : éteindre les circuits sélectionnés, sélectionner le circuit suivant et l'allumer à 100%.
