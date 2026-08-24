// CannonPhysics.js
// Real rigid-body physics (cannon-es) for thrown stones only.
//
// Why cannon-es just for stones, and the lightweight solver (Collision.js)
// for the character? See the note at the top of Collision.js — this keeps
// the expensive, general-purpose physics engine limited to the handful of
// dynamic objects that actually need rolling/bouncing/multi-body collision,
// which is both cheaper and matches the spec's "prévoir architecture
// permettant d'intégrer ultérieurement Rapier ou Cannon-es" requirement.
//
// cannon-es is loaded via the import map (CDN, no local install needed) —
// see index.html.

import * as CANNON from 'cannon-es';

const STONE_RADIUS = 0.16;

export class CannonPhysics {
  constructor({ boundary, obstacles, groundY = 0 }) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this.stoneMaterial = new CANNON.Material('stone');
    this.groundMaterial = new CANNON.Material('ground');
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.groundMaterial, {
      friction: 0.5,
      restitution: 0.35,
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.stoneMaterial, {
      friction: 0.4,
      restitution: 0.3,
    }));

    // ---- Static ground plane ----
    const groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, groundY, 0);
    this.world.addBody(groundBody);

    // ---- Static obstacle colliders (trees & rocks), from Environment.js ----
    obstacles.forEach((o) => {
      const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      body.addShape(new CANNON.Cylinder(o.radius, o.radius, o.height || 1, 8));
      body.position.set(o.x, (o.height || 1) / 2, o.z);
      this.world.addBody(body);
    });

    // ---- Static boundary walls (replaces a bare clamp for anything thrown) ----
    const wallHeight = 4;
    const wallThickness = 0.5;
    const walls = [
      { x: (boundary.minX + boundary.maxX) / 2, z: boundary.minZ - wallThickness / 2, w: boundary.maxX - boundary.minX + wallThickness * 2, d: wallThickness },
      { x: (boundary.minX + boundary.maxX) / 2, z: boundary.maxZ + wallThickness / 2, w: boundary.maxX - boundary.minX + wallThickness * 2, d: wallThickness },
      { x: boundary.minX - wallThickness / 2, z: (boundary.minZ + boundary.maxZ) / 2, w: wallThickness, d: boundary.maxZ - boundary.minZ + wallThickness * 2 },
      { x: boundary.maxX + wallThickness / 2, z: (boundary.minZ + boundary.maxZ) / 2, w: wallThickness, d: boundary.maxZ - boundary.minZ + wallThickness * 2 },
    ];
    walls.forEach((w) => {
      const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w.w / 2, wallHeight / 2, w.d / 2)));
      body.position.set(w.x, wallHeight / 2, w.z);
      this.world.addBody(body);
    });

    this.stones = []; // { mesh, body }
  }

  /** Spawns a dynamic physics stone at `origin` with initial `velocity` (THREE.Vector3-like). */
  throwStone(mesh, origin, velocity) {
    const body = new CANNON.Body({
      mass: 0.4,
      shape: new CANNON.Sphere(STONE_RADIUS),
      material: this.stoneMaterial,
      linearDamping: 0.05,
      angularDamping: 0.4,
    });
    body.position.set(origin.x, origin.y, origin.z);
    body.velocity.set(velocity.x, velocity.y, velocity.z);
    body.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    this.world.addBody(body);

    const entry = { mesh, body, life: 0 };
    this.stones.push(entry);
    return entry;
  }

  update(delta) {
    this.world.step(1 / 60, delta, 3);
    for (const s of this.stones) {
      s.life += delta;
      s.mesh.position.set(s.body.position.x, s.body.position.y, s.body.position.z);
      s.mesh.quaternion.set(s.body.quaternion.x, s.body.quaternion.y, s.body.quaternion.z, s.body.quaternion.w);
    }
  }

  /** Removes stones that have been resting for a while, to keep the scene light. */
  cleanup(scene, maxLife = 12) {
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i];
      const resting = s.body.sleepState === CANNON.Body.SLEEPING;
      if ((resting && s.life > 3) || s.life > maxLife) {
        this.world.removeBody(s.body);
        scene.remove(s.mesh);
        this.stones.splice(i, 1);
      }
    }
  }
}
