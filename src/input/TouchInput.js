// TouchInput.js
// Virtual joystick (movement) + swipe zone (camera) + tap buttons (jump/pickup/throw/run).

export class TouchInput {
  constructor() {
    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      run: false,
      jumpPressed: false,
      pickupPressed: false,
      throwPressed: false,
    };

    this.lookDelta = { x: 0, y: 0 };
    this.moveVector = { x: 0, y: 0 }; // -1..1 on each axis

    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (this.isTouchDevice) {
      document.body.classList.add('is-touch');
      this._setupJoystick();
      this._setupCameraZone();
      this._setupButtons();
    }
  }

  _setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const nub = document.getElementById('joystick-nub');
    const maxRadius = 48;

    let activeId = null;
    let origin = { x: 0, y: 0 };

    const start = (touch) => {
      activeId = touch.identifier;
      origin = { x: touch.clientX, y: touch.clientY };
      base.style.display = 'block';
      base.style.left = `${origin.x - 55}px`;
      base.style.top = `${origin.y - 55}px`;
      nub.style.left = '32px';
      nub.style.top = '32px';
    };

    const move = (touch) => {
      let dx = touch.clientX - origin.x;
      let dy = touch.clientY - origin.y;
      const dist = Math.min(Math.hypot(dx, dy), maxRadius);
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * dist;
      dy = Math.sin(angle) * dist;
      nub.style.left = `${32 + dx}px`;
      nub.style.top = `${32 + dy}px`;

      this.moveVector.x = dx / maxRadius;
      this.moveVector.y = dy / maxRadius;

      const deadzone = 0.25;
      this.state.forward = this.moveVector.y < -deadzone;
      this.state.backward = this.moveVector.y > deadzone;
      this.state.left = this.moveVector.x < -deadzone;
      this.state.right = this.moveVector.x > deadzone;
    };

    const end = () => {
      activeId = null;
      base.style.display = 'none';
      this.moveVector.x = 0;
      this.moveVector.y = 0;
      this.state.forward = this.state.backward = false;
      this.state.left = this.state.right = false;
    };

    zone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      start(t);
      e.preventDefault();
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) move(t);
      }
      e.preventDefault();
    }, { passive: false });

    ['touchend', 'touchcancel'].forEach((evt) => {
      zone.addEventListener(evt, (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === activeId) end();
        }
      });
    });
  }

  _setupCameraZone() {
    const zone = document.getElementById('camera-touch-zone');
    let activeId = null;
    let last = { x: 0, y: 0 };

    zone.addEventListener('touchstart', (e) => {
      // Ignore touches that start on the left movement zone or on buttons.
      const t = e.changedTouches[0];
      if (t.clientX < window.innerWidth * 0.42) return;
      activeId = t.identifier;
      last = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) {
          this.lookDelta.x += t.clientX - last.x;
          this.lookDelta.y += t.clientY - last.y;
          last = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: true });

    ['touchend', 'touchcancel'].forEach((evt) => {
      zone.addEventListener(evt, (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === activeId) activeId = null;
        }
      });
    });
  }

  _setupButtons() {
    const jump = document.getElementById('btn-jump');
    const pickup = document.getElementById('btn-pickup');
    const throwBtn = document.getElementById('btn-throw');
    const run = document.getElementById('btn-run');

    jump.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.jumpPressed = true; });
    pickup.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.pickupPressed = true; });
    throwBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.throwPressed = true; });

    run.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.run = true; run.classList.add('active'); });
    run.addEventListener('touchend', (e) => { e.preventDefault(); this.state.run = false; run.classList.remove('active'); });
  }

  /** Consumes and resets the per-frame "just pressed" style button flags. */
  consumeButtonFlags() {
    const flags = {
      jump: this.state.jumpPressed,
      pickup: this.state.pickupPressed,
      throw: this.state.throwPressed,
    };
    this.state.jumpPressed = false;
    this.state.pickupPressed = false;
    this.state.throwPressed = false;
    return flags;
  }

  /** Consumes accumulated look delta since last call. */
  consumeLookDelta() {
    const d = { ...this.lookDelta };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return d;
  }
}
