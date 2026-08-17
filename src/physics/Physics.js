// Physics.js
// Minimal hand-rolled physics for the V1. Deliberately simple:
// gravity + integration + ground plane collision.
//
// This module is intentionally isolated behind `Physics.update(projectiles, dt)`
// so it can later be swapped for Rapier or Cannon-es without touching
// gameplay code — a projectile only needs { position, velocity, radius, grounded }.

export const GRAVITY = 18; // m/s^2, tuned for a satisfying arc rather than realism

export class Physics {
  constructor({ groundY = 0 } = {}) {
    this.groundY = groundY;
  }

  update(projectiles, delta) {
    for (const p of projectiles) {
      if (p.grounded) continue;

      p.velocity.y -= GRAVITY * delta;
      p.position.addScaledVector(p.velocity, delta);

      // Ground collision: simple stop with a tiny bounce, then settle.
      const floor = this.groundY + (p.radius || 0.15);
      if (p.position.y <= floor) {
        p.position.y = floor;
        if (Math.abs(p.velocity.y) > 1.5) {
          p.velocity.y *= -0.35; // small bounce
          p.velocity.x *= 0.6;
          p.velocity.z *= 0.6;
        } else {
          p.velocity.set(0, 0, 0);
          p.grounded = true;
        }
      }
    }
  }
}
