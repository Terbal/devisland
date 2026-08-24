// Collision.js
// A deliberately lightweight XZ-plane collision solver for the character
// against static world obstacles (trees, rocks) and the boundary walls.
//
// Why not a full physics engine for the character too? On a small arena with
// a handful of static props, a circle-vs-circle push-out is both cheaper and
// more predictable than a general physics body — it never jitters, never
// tunnels at low frame rates, and needs no tuning of mass/friction. The spec's
// own priority order (PERFORMANCE > LISIBILITÉ > ESTHÉTIQUE) is exactly the
// case for this choice. Thrown stones, which really do need bouncing/rolling
// behaviour, use cannon-es instead — see physics/CannonPhysics.js.

/**
 * Pushes `position` (a THREE.Vector3, mutated in place) out of any
 * overlapping circular obstacle, then clamps it to the rectangular boundary.
 *
 * @param {THREE.Vector3} position
 * @param {number} radius - character's collision radius
 * @param {{x:number, z:number, radius:number}[]} obstacles
 * @param {{minX:number,maxX:number,minZ:number,maxZ:number}} boundary
 */
export function resolveCharacterCollisions(position, radius, obstacles, boundary) {
  for (const obstacle of obstacles) {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + obstacle.radius;

    if (distSq < minDist * minDist && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      position.x += nx * overlap;
      position.z += nz * overlap;
    }
  }

  // Outer boundary acts like invisible walls: clamping here gives the same
  // result as colliding with four static walls placed on the boundary edges
  // (which is exactly what the thrown-stone physics world uses for real bouncing).
  position.x = Math.min(Math.max(position.x, boundary.minX), boundary.maxX);
  position.z = Math.min(Math.max(position.z, boundary.minZ), boundary.maxZ);
}
