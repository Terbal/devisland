Déposez ici un personnage riggé pour remplacer le personnage procédural.

Deux formats acceptés (essayés dans cet ordre) :
  - character.glb   (un seul fichier binaire — le plus simple)
  - character.gltf  (+ ses fichiers .bin et textures à côté, si votre export
                      est au format "glTF Separate" plutôt que binaire —
                      déposez TOUT le dossier ici, pas juste le .gltf)

Aucune animation "Idle/Walk/Run/..." nommée exactement comme ça n'est requise :
CharacterAnimations.js fait une correspondance approximative par mots-clés
(voir STATE_ALIASES dans ce fichier). Si un état n'a aucun clip correspondant,
le jeu reste jouable, il gardera juste la dernière animation affichée pour cet
état précis en attendant qu'un clip adapté soit ajouté.

Pour ajouter des animations qui NE SONT PAS déjà dans ce character.glb/.gltf
(par exemple téléchargées séparément depuis un pack comme "KayKit - Character
Animations"), utilisez le dossier animations/ à côté — voir son README.txt.

100% navigateur, sans Blender : voir la section "Personnage réel (.glb)" du
README principal du projet pour un exemple concret avec les packs KayKit
(personnage + bibliothèque d'animations, tous deux au format .GLTF).
