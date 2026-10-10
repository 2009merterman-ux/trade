// The fishing loop: charge the cast circle, the line flies, a fish bites at once, then the fight.
import * as THREE from 'three';
import { state, equippedRod, equippedRodDef, addBait, recordCatch, removeRod, save } from '../state.js';
import { TIERS, rollTier } from '../data/rarity.js';
import { pickFish, rollWeight, fishPrice } from '../data/fish.js';
import { baitById } from '../data/baits.js';
import { snapRisk } from '../data/rods.js';
import { buildRod } from '../player/rodVisual.js';
import { makeFishMesh } from './fishArt.js';
import { GAMES, JumpEvent } from './minigames.js';
if (typeof window !== 'undefined') window.__GAMES = GAMES;

// zones on the cast circle: share of the circle (percent), luck, and how far the cast goes
export const ZONES = [
  { key: 'weak', label: 'Weak', size: 39.5, color: '#3d4552', luck: 0.75, dist: 0.45 },
  { key: 'normal', label: 'Normal', size: 30, color: '#38c47a', luck: 1.0, dist: 0.7 },
  { key: 'good', label: 'Good', size: 20, color: '#3a8cff', luck: 1.3, dist: 0.85 },
  { key: 'epic', label: 'Epic', size: 10, color: '#a64dff', luck: 1.85, dist: 0.97 },
  { key: 'gold', label: 'GOLD', size: 0.5, color: '#ffd23f', luck: 3.2, dist: 1.15 },
];

export class Fishing {
  constructor(game) {
    this.g = game; this.mode = 'idle'; this.t = 0;
    const scene = game.scene;
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
    this.line.frustumCulled = false; this.line.visible = false; scene.add(this.line);
    this.bobber = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff2a2a, roughness: 0.4 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    this.bobber.add(top, bot); this.bobber.visible = false; scene.add(this.bobber);
    this.ripples = [];
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; scene.add(r); this.ripples.push({ m: r, t: 9 }); }
    this.splashPts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
    this.splashPts.frustumCulled = false; scene.add(this.splashPts); this.splash = [];
    this.rebuildRod();
  }
  rebuildRod() {
    const cam = this.g.camera;
    if (this.rod) cam.remove(this.rod);
    this.rod = buildRod(equippedRod(), { length: 2.3, auraWidth: 0.25, auraBoost: 0.8 });
    this.rodBase = { pos: new THREE.Vector3(0.42, -0.62, -0.75), rot: new THREE.Euler(-1.0, 0.1, -0.32) };
    this.rod.position.copy(this.rodBase.pos); this.rod.rotation.copy(this.rodBase.rot);
    cam.add(this.rod);
  }
  get busy() { return this.mode !== 'idle'; }
  tip() { this.rod.updateMatrixWorld(true); return this.rod.localToWorld(this.rod.userData.tip.clone()); }

  // ---------- input ----------
  pressDown() {
    if (this.mode === 'idle') return this.startCharge();
    this.pressed = true;
  }
  pressUp() { if (this.mode === 'charging') this.release(); }
  cancel(msg) { this.cleanup(); if (msg) this.g.ui.toast(msg); }

  startCharge() {
    if (this.g.ui.modal) return;
    this.mode = 'charging'; this.angle = 0; this.speed = 230 * (0.85 + Math.random() * 0.3);
    // a new random layout for the zones every cast
    const order = [...ZONES].sort(() => Math.random() - 0.5); let a = Math.random() * 360; this.layout = [];
    for (const z of order) { this.layout.push({ ...z, from: a, to: a + z.size * 3.6 }); a += z.size * 3.6; }
    this.g.ui.castRing.show(this.layout);
    this.g.audio.play('click');
  }
  zoneAt(angle) {
    for (const z of this.layout) { const span = z.to - z.from; const rel = ((angle - z.from) % 360 + 360) % 360; if (rel <= span) return z; }
    return this.layout[0];
  }
  release() {
    const z = this.zoneAt(this.angle);
    this.g.ui.castRing.flash(z);
    setTimeout(() => this.g.ui.castRing.hide(), 450);
    const rod = equippedRodDef();
    const dist = Math.max(6, rod.cast * z.dist);
    // find water in front of the player, coming closer until the line lands in water
    const cam = this.g.camera; const f = this.g.player.forward(); const def = this.g.def;
    let land = null;
    for (let d = dist; d >= 5; d -= 1) { const p = cam.position.clone().addScaledVector(f, d); if (def.ground(p.x, p.z) < -0.4) { land = new THREE.Vector3(p.x, 0.12, p.z); break; } }
    if (!land) { this.mode = 'idle'; this.g.ui.toast('Face the water to cast'); return; }
    state.stats.casts++; if (z.key === 'gold') state.stats.gold++;
    this.zone = z; this.land = land; this.mode = 'flying'; this.t = 0; this.from = this.tip();
    this.flight = 0.55 + land.distanceTo(cam.position) * 0.012;
    this.line.visible = true; this.bobber.visible = true;
    this.g.audio.play('cast');
    // bait: one piece per cast
    this.baitLuck = 1; this.baitLikes = [];
    if (state.equippedBait !== null && (state.baits[state.equippedBait] ?? 0) > 0) { const b = baitById(state.equippedBait); this.baitLuck = b.luck; this.baitLikes = b.likes; addBait(b.id, -1); }
    this.g.ui.refreshHud();
  }

  // ---------- per frame ----------
  update(dt, inp) {
    this.t += dt;
    this.updateFx(dt);
    const rod = this.rod; const base = this.rodBase;
    let targetRot = base.rot.x, shake = 0, bend = 0;
    if (this.mode === 'charging') {
      this.angle += this.speed * dt;
      this.g.ui.castRing.needle(this.angle % 360, this.zoneAt(this.angle));
      targetRot = -0.7; // wind-up, kept low so the rod does not cover the cast ring
    } else if (this.mode === 'flying') {
      const k = Math.min(1, this.t / this.flight);
      const p = this.from.clone().lerp(this.land, k); p.y += Math.sin(Math.PI * k) * (3 + this.land.distanceTo(this.from) * 0.12) - (1 - k) * 0;
      p.y = Math.max(p.y, this.land.y);
      this.bobber.position.copy(p);
      targetRot = k < 0.3 ? -1.45 : -1.15;
      if (k >= 1) { this.mode = 'landed'; this.t = 0; this.splashAt(this.land, 1); this.g.audio.play('splash'); this.biteIn = 0.35 + Math.random() * 0.5; }
    } else if (this.mode === 'landed') {
      this.bobber.position.y = 0.12 + Math.sin(this.t * 3) * 0.03;
      targetRot = -1.1;
      if (this.t > this.biteIn) this.hook();
    } else if (this.mode === 'fight') {
      const res = this.fightUpdate(dt, inp);
      targetRot = -0.75; shake = 0.012 + this.d * 0.02; bend = 0.15;
      if (inp.reel) { const h = rod.userData.reelHandle; if (h) h.rotation.x += dt * 25; this.reelTick = (this.reelTick ?? 0) + dt; if (this.reelTick > 0.08) { this.reelTick = 0; this.g.audio.play('reel'); } }
      if (res) this.finish(res);
    }
    rod.rotation.x += (targetRot - rod.rotation.x) * Math.min(1, dt * 10);
    rod.rotation.z = base.rot.z + (Math.random() - 0.5) * shake + bend * Math.sin(this.t * 7) * 0.1;
    rod.position.x = base.pos.x + Math.sin(this.t * 1.3) * 0.004; rod.position.y = base.pos.y + Math.sin(this.t * 2.1) * 0.004;
    if (rod.userData.sparkles) rod.userData.sparkles.rotation.y += dt * 0.6;
    // line from the tip to the bobber
    if (this.line.visible) {
      const a = this.tip(), b = this.bobber.position; const pts = this.line.geometry.attributes.position;
      const sag = this.mode === 'fight' ? 0.15 : 1.2;
      for (let i = 0; i < 32; i++) { const t = i / 31; const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * sag, z = a.z + (b.z - a.z) * t; pts.setXYZ(i, x, y, z); }
      pts.needsUpdate = true;
    }
  }

  hook() {
    const rod = equippedRodDef(); const isl = this.g.island;
    let luck = rod.luck * this.zone.luck * this.baitLuck * (this.g.env.night > 0.5 ? 1.08 : 1);
    const tier = rollTier(luck, Math.random, 9);
    let fish = pickFish(isl.n, tier);
    if (this.baitLikes.length && !this.baitLikes.includes(fish.shape) && Math.random() < 0.25) fish = pickFish(isl.n, tier); // liked shapes bite a little more
    this.fish = fish; this.kg = rollWeight(fish);
    // difficulty: the fish's tier, eased by a stronger rod
    const base = TIERS[fish.tier].diff;
    this.d = Math.max(0.03, Math.min(1, base - (rod.power - fish.tier * 0.9) * 0.025));
    const tol = 1 + Math.max(0, rod.power - fish.tier) * 0.04;
    const kind = fish.games[Math.floor(Math.random() * fish.games.length)];
    this.game = new GAMES[kind](this.g.ui.mgRoot, this.d, fish, tol);
    this.mode = 'fight'; this.t = 0; this.nextJump = 1.5 + Math.random() * 3; this.jump = null; this.jumps = 0;
    this.g.ui.biteFlash(TIERS[fish.tier]);
    this.splashAt(this.land, 0.6);
  }
  fightUpdate(dt, inp) {
    const pressed = this.pressed; this.pressed = false;
    if (this.jump) {
      const r = this.jump.update(dt, pressed);
      if (r) {
        this.jump.end(); this.jump = null; this.game.paused = false;
        if (r === 'ok') { this.game.progress += 0.1; this.g.ui.toast('Nice slack!', 'good'); }
        else { this.game.spike?.(0.35 + this.d * 0.4); this.g.ui.toast('Too tight!', 'bad'); if (this.d > 0.6 && Math.random() < this.d * 0.35) return 'snap'; }
      }
    } else {
      this.nextJump -= dt;
      if (this.nextJump <= 0 && Math.random() < this.fish.jump && this.game.t > 1) {
        this.jump = new JumpEvent(this.g.ui.mgRoot, this.d); this.game.paused = true; this.jumps++;
        this.spawnJump();
      }
      if (this.nextJump <= 0) this.nextJump = 2 + Math.random() * 4 / (0.5 + this.d);
    }
    const res = this.jump ? null : this.game.update(dt, inp);
    // the bobber is dragged around and comes closer as you win
    const cam = this.g.camera.position; const prog = Math.max(0, Math.min(1, this.game.progress));
    const near = new THREE.Vector3(cam.x, 0, cam.z).lerp(this.land, 0.2);
    const p = this.land.clone().lerp(near, prog * 0.8);
    p.x += Math.sin(this.t * (1.4 + this.d * 2)) * (0.6 + this.d * 1.5); p.z += Math.cos(this.t * (1.1 + this.d)) * 0.5;
    p.y = 0.05 + Math.sin(this.t * 9) * 0.04 - (this.game.paused ? 0 : 0.06);
    this.bobber.position.lerp(p, Math.min(1, dt * 4));
    if (Math.random() < dt * 2) this.splashAt(this.bobber.position, 0.25);
    return res;
  }
  spawnJump() {
    const m = makeFishMesh(this.fish, this.kg); m.position.copy(this.bobber.position);
    this.g.scene.add(m); this.jumpFish = { m, t: 0, from: this.bobber.position.clone(), dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), h: 1.6 + this.d * 2.5 + Math.cbrt(this.kg) * 0.3 };
    this.splashAt(this.bobber.position, 1.2); this.g.audio.play('jump');
  }
  finish(res) {
    const fish = this.fish, kg = this.kg;
    this.game.end(); if (this.jump) { this.jump.end(); this.jump = null; }
    const inst = equippedRod();
    if (res === 'win') {
      inst.catches = (inst.catches ?? 0) + 1;
      if (!inst.locked) inst.wear = Math.min(1, inst.wear + 0.002 + fish.tier * 0.0015);
      const rec = recordCatch(fish, kg);
      const price = fishPrice(fish, kg);
      this.g.audio.play('catch', { tier: fish.tier });
      this.splashAt(this.bobber.position, 1);
      this.cleanup();
      this.g.ui.catchCard({ fish, kg, price, ...rec });
    } else {
      state.stats.lost++;
      if (res === 'snap') {
        this.g.audio.play('snap');
        const risk = inst.locked ? 0 : snapRisk(inst, fish.tier);
        if (Math.random() < risk) { const name = equippedRodDef().name; removeRod(inst.uid); this.rebuildRod(); this.g.ui.toast(`Your rod snapped! ${name} is gone.`, 'bad', 4000); }
        else this.g.ui.toast('The line snapped! It got away.', 'bad');
      } else { this.g.audio.play('lose'); this.g.ui.toast('It got away...', 'bad'); }
      this.cleanup();
    }
    save(); this.g.ui.refreshHud();
  }
  cleanup() {
    if (this.game) { this.game.end(); this.game = null; }
    if (this.jump) { this.jump.end(); this.jump = null; }
    this.mode = 'idle'; this.line.visible = false; this.bobber.visible = false; this.g.ui.castRing.hide();
  }

  // ---------- effects ----------
  splashAt(p, power) {
    const n = Math.floor(30 * power);
    for (let i = 0; i < n; i++) this.splash.push({ p: new THREE.Vector3(p.x, 0.1, p.z), v: new THREE.Vector3((Math.random() - 0.5) * 2.5, 2 + Math.random() * 3 * power, (Math.random() - 0.5) * 2.5), life: 0.6 + Math.random() * 0.5 });
    const rp = this.ripples.find(r => r.t > 1.5) ?? this.ripples[0]; rp.t = 0; rp.m.position.set(p.x, 0.15, p.z); rp.power = power;
  }
  updateFx(dt) {
    for (const r of this.ripples) { r.t += dt; const k = r.t / 1.5; r.m.material.opacity = k < 1 ? (1 - k) * 0.5 : 0; const s = 0.3 + k * 2.2 * (r.power ?? 1); r.m.scale.set(s, s, s); }
    this.splash = this.splash.filter(s => (s.life -= dt) > 0);
    for (const s of this.splash) { s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); }
    const arr = new Float32Array(this.splash.length * 3); this.splash.forEach((s, i) => arr.set([s.p.x, s.p.y, s.p.z], i * 3));
    this.splashPts.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    if (this.jumpFish) {
      const j = this.jumpFish; j.t += dt; const T = 0.9; const k = j.t / T;
      j.m.position.copy(j.from).addScaledVector(j.dir, k * 2.5); j.m.position.y = Math.sin(Math.PI * Math.min(1, k)) * j.h;
      j.m.rotation.set(0, Math.atan2(-j.dir.z, j.dir.x), (0.5 - k) * 2.4 + Math.sin(j.t * 30) * 0.15);
      if (k >= 1) { this.splashAt(j.m.position, 1); this.g.audio.play('splash', { big: true }); this.g.scene.remove(j.m); this.jumpFish = null; }
    }
  }
}
