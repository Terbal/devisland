// MobileControls.js — mobile-only UI affordances layered on top of TouchInput.
// (TouchInput.js owns the raw joystick/buttons/camera-drag logic; this module
// wires up secondary mobile UI behaviour like opening the inventory panel.)

export class MobileControls {
  constructor({ hotbar }) {
    this.isTouchDevice = document.body.classList.contains('is-touch');
    if (!this.isTouchDevice) return;

    const hotbarEl = document.getElementById('hotbar');
    let lastTap = 0;
    hotbarEl.addEventListener('touchend', () => {
      const now = Date.now();
      if (now - lastTap < 320) {
        hotbar.toggleInventoryPanel();
      }
      lastTap = now;
    });

    this._maybeShowOrientationHint();
    window.addEventListener('resize', () => this._maybeShowOrientationHint());
  }

  _maybeShowOrientationHint() {
    if (!this.isTouchDevice) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    let hint = document.getElementById('rotate-hint');
    if (isPortrait) {
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'rotate-hint';
        hint.style.cssText = `
          position:fixed; inset:0; z-index:2000; display:flex; align-items:center;
          justify-content:center; background:rgba(5,8,10,0.85); color:#eafff1;
          font-size:14px; text-align:center; padding:24px; pointer-events:none;
        `;
        hint.textContent = 'Tournez votre téléphone en mode paysage pour une meilleure expérience 🔄';
        document.body.appendChild(hint);
      }
    } else if (hint) {
      hint.remove();
    }
  }
}
