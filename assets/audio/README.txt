Déposez ici votre musique de fond, sous le nom exact :

    ambient-music.mp3

Formats acceptés : tout ce que le navigateur sait lire nativement (mp3, ogg,
wav...). Si vous utilisez un autre format, changez juste l'extension dans
MUSIC_PATH, en haut de src/audio/AudioManager.js.

Rien à configurer d'autre : AudioManager.js essaie de charger ce fichier au
démarrage, la joue en boucle (volume 35% par défaut), et démarre dès le
premier clic/touche pressée par le joueur (obligatoire — les navigateurs
bloquent l'audio automatique tant qu'il n'y a pas eu d'interaction).

Si le fichier est absent, rien ne se passe, pas d'erreur : juste un message
informatif dans la console.
