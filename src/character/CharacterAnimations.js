// CharacterAnimations.js
//
// V1 has no external animation clips (no .glb), so poses are generated
// procedurally each frame from the current state + a phase timer.
//
// IMPORTANT — designed for an easy upgrade path:
// If a rigged .glb with real clips (Idle/Walk/Run/Jump/Fall/Pickup/Throw)
// becomes available, replace the body of `update()` with:
//
//   this.mixer.update(delta);
//   const action = this.actions[state];
//   if (action && this.currentAction !== action) {
//     this.currentAction?.fadeOut(0.2);
//     action.reset().fadeIn(0.2).play();
//     this.currentAction = action;
//   }
//
// using THREE.AnimationMixer + THREE.AnimationClip exactly as noted in the spec.
// Nothing outside this file needs to change.

export class CharacterAnimations {
  constructor(character) {
    this.parts = character.userData.parts;
    this.phase = 0;
    this.pickupTimer = 0;
    this.throwTimer = 0;
    this.currentState = 'IDLE';
  }

  setState(state) {
    if (state === 'PICKUP' && this.currentState !== 'PICKUP') this.pickupTimer = 0;
    if (state === 'THROW' && this.currentState !== 'THROW') this.throwTimer = 0;
    this.currentState = state;
  }

  update(delta, state, speedFactor = 1) {
    const { head, armL, armR, legL, legR, hips } = this.parts;
    this.phase += delta * (6 + speedFactor * 6);

    // Reset bias every frame, then apply per-state pose.
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);

    switch (state) {
      case 'WALK':
      case 'RUN': {
        const amp = state === 'RUN' ? 0.9 : 0.55;
        legL.hip.rotation.x = s * amp;
        legR.hip.rotation.x = -s * amp;
        legL.knee.rotation.x = Math.max(0, -c * amp * 0.8);
        legR.knee.rotation.x = Math.max(0, c * amp * 0.8);
        armL.shoulder.rotation.x = -s * amp * 0.8;
        armR.shoulder.rotation.x = s * amp * 0.8;
        hips.position.y = 0.9 + Math.abs(s) * (state === 'RUN' ? 0.05 : 0.02);
        head.rotation.x = 0;
        break;
      }
      case 'JUMP': {
        legL.hip.rotation.x = -0.5;
        legR.hip.rotation.x = -0.3;
        legL.knee.rotation.x = 0.9;
        legR.knee.rotation.x = 0.5;
        armL.shoulder.rotation.x = -1.4;
        armR.shoulder.rotation.x = -1.4;
        break;
      }
      case 'FALL': {
        legL.hip.rotation.x = -0.2;
        legR.hip.rotation.x = -0.2;
        legL.knee.rotation.x = 0.3;
        legR.knee.rotation.x = 0.3;
        armL.shoulder.rotation.x = -0.6;
        armR.shoulder.rotation.x = -0.6;
        break;
      }
      case 'PICKUP': {
        this.pickupTimer += delta;
        const t = Math.min(this.pickupTimer / 0.6, 1);
        const bend = Math.sin(t * Math.PI); // 0 -> 1 -> 0
        hips.position.y = 0.9 - bend * 0.32;
        legL.hip.rotation.x = bend * 0.9;
        legR.hip.rotation.x = bend * 0.9;
        legL.knee.rotation.x = bend * 1.1;
        legR.knee.rotation.x = bend * 1.1;
        armL.shoulder.rotation.x = -bend * 1.2;
        armR.shoulder.rotation.x = -bend * 1.2;
        head.rotation.x = bend * 0.5;
        break;
      }
      case 'THROW': {
        this.throwTimer += delta;
        const t = Math.min(this.throwTimer / 0.45, 1);
        const wind = Math.sin(t * Math.PI);
        armR.shoulder.rotation.x = -1.6 + wind * 2.2;
        armR.elbow.rotation.x = -0.6 * wind;
        armL.shoulder.rotation.x = -0.3;
        break;
      }
      case 'IDLE':
      default: {
        const breathe = Math.sin(this.phase * 0.3);
        hips.position.y = 0.9 + breathe * 0.01;
        head.rotation.y = Math.sin(this.phase * 0.15) * 0.08;
        legL.hip.rotation.x = 0;
        legR.hip.rotation.x = 0;
        legL.knee.rotation.x = 0;
        legR.knee.rotation.x = 0;
        armL.shoulder.rotation.x = Math.sin(this.phase * 0.3) * 0.03;
        armR.shoulder.rotation.x = -Math.sin(this.phase * 0.3) * 0.03;
        break;
      }
    }
  }

  isPickupFinished() {
    return this.pickupTimer >= 0.6;
  }

  isThrowFinished() {
    return this.throwTimer >= 0.45;
  }
}

/** Fraction (0..1) of the throw animation at which the stone leaves the hand. */
export const THROW_RELEASE_FRACTION = 0.5; // ~0.22s into the 0.45s swing
