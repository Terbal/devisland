// InteractionPrompt.js — shows/hides the "[E] Ramasser" style prompt.

export class InteractionPrompt {
  constructor() {
    this.el = document.getElementById('interaction-prompt');
    this.keyEl = document.getElementById('prompt-key');
    this.isTouchDevice = document.body.classList.contains('is-touch');
  }

  show() {
    this.el.classList.remove('hidden');
    this.keyEl.textContent = this.isTouchDevice ? 'Toucher [RAMASSER]' : '[E] Ramasser';
  }

  hide() {
    this.el.classList.add('hidden');
  }
}
