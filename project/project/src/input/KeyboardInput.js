// KeyboardInput.js
// Raw keyboard listener. Does NOT know anything about the character —
// it just exposes which logical actions are currently active.

const KEY_MAP = {
  forward: ['KeyW', 'KeyZ', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'KeyQ', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  pickup: ['KeyE'],
  inventory: ['KeyI'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  slot5: ['Digit5'],
};

export class KeyboardInput {
  constructor() {
    this.state = {};
    this._justPressed = new Set();
    Object.keys(KEY_MAP).forEach((k) => (this.state[k] = false));

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _actionsForCode(code) {
    return Object.keys(KEY_MAP).filter((action) => KEY_MAP[action].includes(code));
  }

  _onKeyDown(e) {
    const actions = this._actionsForCode(e.code);
    if (actions.length === 0) return;
    actions.forEach((action) => {
      if (!this.state[action]) this._justPressed.add(action);
      this.state[action] = true;
    });
  }

  _onKeyUp(e) {
    const actions = this._actionsForCode(e.code);
    actions.forEach((action) => (this.state[action] = false));
  }

  /** Returns true exactly once, on the frame the key was pressed. */
  consumeJustPressed(action) {
    if (this._justPressed.has(action)) {
      this._justPressed.delete(action);
      return true;
    }
    return false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
