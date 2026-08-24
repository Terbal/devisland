// AudioManager.js
// Looping background music. Entirely optional: if no file is found at
// MUSIC_PATH, this silently does nothing — no crash, no console error spam
// beyond a single informational log. See assets/audio/README.txt (and the
// "Audio" section of the project README) for exactly where to drop a file.

import * as THREE from 'three';

const MUSIC_PATH = './assets/audio/ambient-music.mp3';
const DEFAULT_VOLUME = 0.35;

export class AudioManager {
  /** @param {THREE.Camera} camera - the AudioListener is attached here, as three.js requires. */
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.music = new THREE.Audio(this.listener);
    this._ready = false;
    this._unlocked = false;

    const loader = new THREE.AudioLoader();
    loader.load(
      MUSIC_PATH,
      (buffer) => {
        this.music.setBuffer(buffer);
        this.music.setLoop(true);
        this.music.setVolume(DEFAULT_VOLUME);
        this._ready = true;
        if (this._unlocked) this._play();
        console.info('[AudioManager] Background music loaded from ' + MUSIC_PATH + '.');
      },
      undefined,
      () => {
        console.info(`[AudioManager] No background music file at ${MUSIC_PATH} — skipping (this is normal until you add one).`);
      }
    );

    // Browsers block audio playback until a user gesture. Start it on the
    // first click/tap/keypress rather than fighting the autoplay policy.
    const unlock = () => {
      this._unlocked = true;
      if (this._ready) this._play();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  _play() {
    if (!this.music.isPlaying) this.music.play();
  }

  setVolume(v) {
    this.music.setVolume(v);
  }

  toggleMute() {
    if (this.music.isPlaying) {
      this.music.pause();
    } else if (this._ready) {
      this._play();
    }
  }
}
