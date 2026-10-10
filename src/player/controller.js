// First-person walking: WASD to move, mouse to look. Stays on land and docks, bumps into houses and trees.
import * as THREE from 'three';

export class Player {
  constructor(camera, input, audio) {
    this.camera = camera; this.input = input; this.audio = audio;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.eye = 1.62; this.bob = 0; this.stepAcc = 0;
    this.sensitivity = 0.0022; this.frozen = false; this.lookFrozen = false;
    camera.rotation.order = 'YXZ';
  }
  place(def) {
    this.def = def; const s = def.spawn;
    this.pos.set(s.x, def.ground(s.x, s.z), s.z); this.yaw = s.yaw; this.pitch = s.pitch ?? 0; this.vel.set(0, 0, 0);
    this.apply(0);
  }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  update(dt) {
    const [mx, my] = this.input.takeMouse();
    if (!this.lookFrozen) {
      this.yaw -= mx * this.sensitivity; this.pitch -= my * this.sensitivity;
      if (this.input.down('ArrowLeft')) this.yaw += dt * 1.8; if (this.input.down('ArrowRight')) this.yaw -= dt * 1.8;
      this.pitch = Math.max(-1.45, Math.min(1.35, this.pitch));
    }
    const wish = new THREE.Vector3();
    if (!this.frozen) {
      const f = this.forward(), rgt = new THREE.Vector3(-f.z, 0, f.x);
      if (this.input.down('KeyW') || this.input.down('ArrowUp')) wish.add(f);
      if (this.input.down('KeyS') || this.input.down('ArrowDown')) wish.sub(f);
      if (this.input.down('KeyD')) wish.add(rgt);
      if (this.input.down('KeyA')) wish.sub(rgt);
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(this.input.down('ShiftLeft') ? 7.5 : 4.4);
    }
    this.vel.lerp(wish, 1 - Math.exp(-dt * 10));
    const step = this.vel.clone().multiplyScalar(dt);
    const def = this.def; const cur = def.ground(this.pos.x, this.pos.z);
    const tryMove = (nx, nz) => { if (!def.walkable(nx, nz)) return false; const g = def.ground(nx, nz); return g - cur < 0.55 + step.length() * 1.2; };
    if (tryMove(this.pos.x + step.x, this.pos.z)) this.pos.x += step.x; else this.vel.x = 0;
    if (tryMove(this.pos.x, this.pos.z + step.z)) this.pos.z += step.z; else this.vel.z = 0;
    const g = def.ground(this.pos.x, this.pos.z);
    this.pos.y += (g - this.pos.y) * Math.min(1, dt * 14);
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.bob += speed * dt * 1.9;
    this.stepAcc += speed * dt; if (this.stepAcc > 1.6) { this.stepAcc = 0; this.audio?.play('step'); }
    this.apply(speed);
  }
  apply(speed) {
    const b = Math.sin(this.bob * Math.PI) * 0.035 * Math.min(1, speed / 4);
    this.camera.position.set(this.pos.x, this.pos.y + this.eye + b, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
