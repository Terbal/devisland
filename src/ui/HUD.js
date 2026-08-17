// HUD.js — small floating notifications + quality button wiring.

export class HUD {
  constructor({ onQualityChange } = {}) {
    this.container = document.getElementById('notification-container');
    this.qualityBtn = document.getElementById('quality-toggle');
    this.qualityLevels = ['BASSE', 'MOYENNE', 'ELEVEE'];
    this.qualityIndex = 1;

    this.qualityBtn.addEventListener('click', () => {
      this.qualityIndex = (this.qualityIndex + 1) % this.qualityLevels.length;
      this.qualityBtn.textContent = `QUALITÉ: ${this.qualityLevels[this.qualityIndex]}`;
      onQualityChange && onQualityChange(this.qualityLevels[this.qualityIndex].toLowerCase() === 'elevee' ? 'high' : this.qualityLevels[this.qualityIndex].toLowerCase());
    });
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
