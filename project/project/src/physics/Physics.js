// Physics.js
//
// NOTE: as of the physics upgrade, thrown-stone physics is handled by
// CannonPhysics.js (real cannon-es rigid bodies, with bouncing off trees/
// rocks/walls). This file is kept as a minimal, dependency-free reference
// implementation of the original hand-rolled approach described in the
// spec ("physique simple ... codée directement en JavaScript") — useful if
// you ever want to strip the cannon-es dependency back out.
//
// Minimal hand-rolled physics: gravity + integration + ground plane collision.
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
