// CharacterAnimations.js
//
// Two modes, same public API (setState / update / isPickupFinished / isThrowFinished):
//
//  1) RIGGED MODE — used automatically when CharacterLoader.js successfully
//     loads a real .glb/.gltf with AnimationClips. Driven by a real
//     THREE.AnimationMixer with cross-fades, exactly as described in the spec.
//
//     Clip names are matched FUZZILY against a list of common aliases per
//     state (see STATE_ALIASES below), not by exact name. This matters
//     because most free community character packs (Mixamo, KayKit, Quaternius,
//     etc.) don't use this project's exact state names — e.g. KayKit ships
//     clips like "Idle", "1H_Melee_Idle", "Interact_PickUp", "Throwing"...
//     If a given state has no matching clip at all (e.g. no "Throw"-like clip
//     in the pack you used), that one state simply keeps whatever animation
//     was last playing instead of switching — the game logic (timers, the
//     pickup/throw callbacks) still runs correctly either way, only the
//     visual for that specific action is less polished until you add a
//     matching clip.
//
//  2) PROCEDURAL MODE — the V1 fallback used when no rigged asset is present
//     at all. Poses are computed each frame from the current state + a phase
//     timer, directly rotating the primitive rig built in Character.js.
//
// CharacterController.js never needs to know which mode is active.

import * as THREE from 'three';

// Each state maps to a list of lowercase substrings checked against every
// clip name (also lowercased). First clip whose name contains ANY of a
// state's aliases wins. Order matters: more specific aliases first.
const STATE_ALIASES = {
  IDLE: ['idle', 'stand'],
  WALK: ['walk'],
  RUN: ['run', 'sprint', 'jog'],
  // "Idle"/hold-pose variants first: JUMP loops by default (no LoopOnce set),
  // so a short "start/launch" clip would repeat awkwardly for the whole time
  // the character is airborne. A held mid-air pose (e.g. KayKit's "Jump_Idle")
  // loops naturally; the short launch clip is only used as a last resort.
  JUMP: ['jump_idle', 'jump_loop', 'jumping', 'jump_start', 'jump'],
  FALL: ['fall', 'falling', 'jump_land', 'landing'],
  PICKUP: ['pickup', 'pick_up', 'pick up', 'grab', 'loot', 'interact', 'kneel'],
  THROW: ['throw', 'toss', 'overhand'],
};

/** Fraction (0..1) of the throw animation duration at which the stone leaves the hand. */
export const THROW_RELEASE_FRACTION = 0.5;
const PICKUP_DURATION = 0.7;
const THROW_DURATION = 0.45;

function findBestClip(clips, state) {
  const aliases = STATE_ALIASES[state] || [];
  for (const alias of aliases) {
    const match = clips.find((c) => c.name.toLowerCase().includes(alias));
    if (match) return match;
  }
  return null;
}

export class CharacterAnimations {
  /**
   * @param {THREE.Object3D} character - root returned by buildCharacter() or CharacterLoader
   * @param {{mixer?: THREE.AnimationMixer, clips?: THREE.AnimationClip[]}} riggedData
   */
  constructor(character, riggedData = null) {
    this.parts = character.userData.parts || null;
    this.rigged = Boolean(riggedData && riggedData.mixer && riggedData.clips && riggedData.clips.length);

    this.phase = 0;
    this.pickupTimer = 0;
    this.throwTimer = 0;
    this.currentState = 'IDLE';

    if (this.rigged) {
      this.mixer = riggedData.mixer;
      this.actions = {};
      const unmatched = [];
      Object.keys(STATE_ALIASES).forEach((state) => {
        const clip = findBestClip(riggedData.clips, state);
        if (clip) {
          const action = this.mixer.clipAction(clip);
          if (state === 'PICKUP' || state === 'THROW') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          this.actions[state] = action;
        } else {
          unmatched.push(state);
        }
      });
      if (unmatched.length) {
        console.warn(`[CharacterAnimations] No matching clip found for: ${unmatched.join(', ')}. Those states will keep the last playing animation instead of switching — check the clip names in your character/animation files, or add STATE_ALIASES entries in CharacterAnimations.js.`);
      }
      this.currentAction = null;
    }
  }

  setState(state) {
    if (state === 'PICKUP' && this.currentState !== 'PICKUP') this.pickupTimer = 0;
    if (state === 'THROW' && this.currentState !== 'THROW') this.throwTimer = 0;
    this.currentState = state;

    if (this.rigged) {
      const action = this.actions[state];
      if (action && this.currentAction !== action) {
        this.currentAction?.fadeOut(0.2);
        action.reset().fadeIn(0.2).play();
        this.currentAction = action;
      }
    }
  }

  update(delta, state, speedFactor = 1) {
    if (state !== this.currentState) this.setState(state);
    if (state === 'PICKUP') this.pickupTimer += delta;
    if (state === 'THROW') this.throwTimer += delta;

    if (this.rigged) {
      this.mixer.update(delta);
      return;
    }

    this._updateProcedural(delta, state, speedFactor);
  }

  isPickupFinished() {
    if (this.rigged) {
      const action = this.actions.PICKUP;
      const duration = action ? action.getClip().duration : PICKUP_DURATION;
      return this.pickupTimer >= duration;
    }
    return this.pickupTimer >= PICKUP_DURATION;
  }

  isThrowFinished() {
    if (this.rigged) {
      const action = this.actions.THROW;
      const duration = action ? action.getClip().duration : THROW_DURATION;
      return this.throwTimer >= duration;
    }
    return this.throwTimer >= THROW_DURATION;
  }

  getThrowDuration() {
    if (this.rigged && this.actions.THROW) return this.actions.THROW.getClip().duration;
    return THROW_DURATION;
  }

  // -------------------------------------------------------------------
  // Procedural fallback (no rigged asset available)
  // -------------------------------------------------------------------
  _updateProcedural(delta, state, speedFactor) {
    const { head, spine, armL, armR, legL, legR, hips } = this.parts;
    this.phase += delta * (6 + speedFactor * 6);
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);

    // Reset per-frame pose baseline; each case below only overrides what it needs.
    spine.rotation.x = 0;
    hips.position.y = 0.9;

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
        armL.elbow.rotation.x = 0;
        armR.elbow.rotation.x = 0;
        hips.position.y = 0.9 + Math.abs(s) * (state === 'RUN' ? 0.05 : 0.02);
        spine.rotation.x = state === 'RUN' ? 0.12 : 0.04;
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
        spine.rotation.x = -0.08;
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
        // Realistic forward bend: the whole upper body leans forward from the
        // waist (spine pivot), knees flex into a squat, and both arms reach
        // forward-and-down toward the ground — like actually picking something up,
        // instead of only sinking the hips with no torso lean.
        const t = Math.min(this.pickupTimer / PICKUP_DURATION, 1);
        const bend = Math.sin(t * Math.PI); // 0 -> 1 -> 0, smooth down-and-up

        spine.rotation.x = bend * 0.95; // lean torso/head/arms forward together
        hips.position.y = 0.9 - bend * 0.22; // squat down a bit

        legL.hip.rotation.x = -bend * 0.35;
        legR.hip.rotation.x = -bend * 0.35;
        legL.knee.rotation.x = bend * 1.05;
        legR.knee.rotation.x = bend * 1.05;

        armL.shoulder.rotation.x = -bend * 0.9;
        armR.shoulder.rotation.x = -bend * 0.9;
        armL.elbow.rotation.x = -bend * 0.55;
        armR.elbow.rotation.x = -bend * 0.55;

        head.rotation.x = bend * 0.25; // look down toward the stone
        break;
      }
      case 'THROW': {
        const t = Math.min(this.throwTimer / THROW_DURATION, 1);
        const wind = Math.sin(t * Math.PI);
        spine.rotation.x = -0.05 + wind * 0.1;
        armR.shoulder.rotation.x = -1.6 + wind * 2.2;
        armR.elbow.rotation.x = -0.6 * wind;
        armL.shoulder.rotation.x = -0.3;
        armL.elbow.rotation.x = 0;
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
        armL.elbow.rotation.x = 0;
        armR.elbow.rotation.x = 0;
        break;
      }
    }
  }
}
