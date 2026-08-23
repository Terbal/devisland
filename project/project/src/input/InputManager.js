// InputManager.js
// Single source of truth for gameplay input. The rest of the game only
// ever reads from `input.*` — it never touches the DOM or raw events.

import { KeyboardInput } from './KeyboardInput.js';
import { TouchInput } from './TouchInput.js';

export class InputManager {
  constructor() {
    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput();

    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.run = false;
    this.jump = false; // edge-triggered
    this.pickup = false; // edge-triggered
    this.throwAction = false; // edge-triggered
    this.toggleInventory = false; // edge-triggered

    this.lookDeltaX = 0;
    this.lookDeltaY = 0;

    this.selectSlot = null; // 0-based index or null

    // Mouse look (desktop) — pointer lock style drag.
    this._mouseDown = false;
    this._lastMouse = { x: 0, y: 0 };
    this._setupMouse();
  }

  _setupMouse() {
    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this._mouseDown = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };
        this.throwAction = true; // left click = throw (edge, consumed each frame)
      }
    });
    window.addEventListener('mouseup', () => (this._mouseDown = false));
    window.addEventListener('mousemove', (e) => {
      if (this._mouseDown) {
        this.lookDeltaX += e.clientX - this._lastMouse.x;
        this.lookDeltaY += e.clientY - this._lastMouse.y;
        this._lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    // Right-drag also rotates camera without throwing, feels nicer.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this._mouseDown = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };
      }
    });
  }

  /** Call once per frame from the main loop. */
  update() {
    const kb = this.keyboard.state;
    const tState = this.touch.state;
    const tMove = this.touch.moveVector;

    this.forward = kb.forward || tState.forward;
    this.backward = kb.backward || tState.backward;
    this.left = kb.left || tState.left;
    this.right = kb.right || tState.right;
    this.run = kb.run || tState.run;

    // Analog strafe strength from joystick (used for smoother turning input).
    this.moveX = tState.forward || tState.backward || tState.left || tState.right
      ? tMove.x
      : (this.left ? -1 : 0) + (this.right ? 1 : 0);
    this.moveY = tState.forward || tState.backward || tState.left || tState.right
      ? tMove.y
      : (this.forward ? -1 : 0) + (this.backward ? 1 : 0);

    const touchFlags = this.touch.consumeButtonFlags();
    this.jump = this.keyboard.consumeJustPressed('jump') || touchFlags.jump;
    this.pickup = this.keyboard.consumeJustPressed('pickup') || touchFlags.pickup;
    this.toggleInventory = this.keyboard.consumeJustPressed('inventory');

    // throwAction: edge from mouse click already set true this frame; also touch button.
    this.throwAction = this.throwAction || touchFlags.throw;

    this.selectSlot = null;
    for (let i = 1; i <= 5; i++) {
      if (this.keyboard.consumeJustPressed(`slot${i}`)) this.selectSlot = i - 1;
    }

    const touchLook = this.touch.consumeLookDelta();
    this.lookDeltaX += touchLook.x;
    this.lookDeltaY += touchLook.y;
  }

  /** Call at the very end of the frame after everyone consumed input. */
  postUpdate() {
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.throwAction = false;
  }
}
