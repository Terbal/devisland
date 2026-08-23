// HUD.js — small floating notifications + quality button wiring.

const LEVELS = ['basse', 'moyenne', 'elevee'];
const LABELS = { basse: 'BASSE', moyenne: 'MOYENNE', elevee: 'ÉLEVÉE' };

export class HUD {
  constructor({ onQualityChange } = {}) {
    this.container = document.getElementById('notification-container');
    this.qualityBtn = document.getElementById('quality-toggle');
    this.onQualityChange = onQualityChange;
    this.qualityIndex = 1; // 'moyenne'

    this.qualityBtn.addEventListener('click', () => {
      this.qualityIndex = (this.qualityIndex + 1) % LEVELS.length;
      this._renderQualityLabel();
      this.onQualityChange && this.onQualityChange(LEVELS[this.qualityIndex]);
    });
  }

  _renderQualityLabel() {
    this.qualityBtn.textContent = `QUALITÉ: ${LABELS[LEVELS[this.qualityIndex]]}`;
  }

  /** Sets the quality level (e.g. restored from a save file) without emitting onQualityChange. */
  setQuality(levelKey) {
    const idx = LEVELS.indexOf(levelKey);
    if (idx === -1) return;
    this.qualityIndex = idx;
    this._renderQualityLabel();
  }

  getQuality() {
    return LEVELS[this.qualityIndex];
  }

  notify(text) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = text;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 700);
  }

  setLoadingProgress(fraction) {
    const bar = document.getElementById('loading-bar-fill');
    if (bar) bar.style.width = `${Math.round(fraction * 100)}%`;
  }
}
