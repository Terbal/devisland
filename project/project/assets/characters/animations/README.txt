Ce dossier reçoit des fichiers d'animation .glb/.gltf SÉPARÉS du personnage lui-même (ex: exportés depuis le pack 'KayKit - Character Animations', ou n'importe quel autre pack qui partage le même squelette que votre character.glb).

Comment ça marche :
1. Déposez vos fichiers .glb/.gltf ici (ex: Walk.gltf, Idle.gltf, Interact_PickUp.gltf...).
2. Listez leurs chemins dans manifest.json, un tableau JSON simple, ex:
   ["./assets/characters/animations/Idle.gltf", "./assets/characters/animations/Walk.gltf"]
3. Rechargez la page. CharacterLoader.js les charge tous et fusionne leurs clips
   avec ceux déjà présents dans character.glb (si il y en a).
4. CharacterAnimations.js fait correspondre chaque état du jeu (Idle/Walk/Run/
   Jump/Fall/Pickup/Throw) au clip dont le NOM CONTIENT un mot-clé proche —
   pas besoin de renommer quoi que ce soit à la main. Voir STATE_ALIASES dans
   CharacterAnimations.js si vous voulez ajouter des synonymes pour votre pack.

Si manifest.json reste vide ([]) ou absent, ce dossier est simplement ignoré —
aucune erreur, le jeu utilise les clips de character.glb (ou le personnage
procédural si aucun n'est trouvé).
