// Island scenes. Each preview island has its own village and look; all share the same layout rules:
// the island sits at the origin, its dock runs out to the south (+z), and you arrive at the dock's end.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeIsland, sampleHeight, makePalm, makeRock, makeBush, makeColumn, woodTex, canvasTex, makeRod, makeNightSky } from './common.js';
import { makeHouse, lanternPost, barrel, netRack, rowboat, well, lighthouse, fence, deadTree, crow, cart, laundryLine, roundTree, cypress, fountain, brazierStand, pavingTex, marbleTex, planksTex } from './village.js';
import { makeGodStatue } from './statue.js';
import { makeNPC } from '../characters/index.js';
import { rng } from '../engine/util.js';
import { bakeStatic } from '../engine/bake.js';

export class SceneDef {
  constructor() { this.root = new THREE.Group(); this.terrain = null; this.docks = []; this.colliders = []; this.npcs = []; this.waterIslands = []; this.flats = []; this.animated = []; }
  ground(x, z) {
    let h = this.terrain ? sampleHeight(this.terrain, x, z) : -6;
    for (const f of this.flats) if (f.test(x, z)) h = Math.max(h, f.y(x, z));
    for (const d of this.docks) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) h = Math.max(h, d.y);
    return h;
  }
  walkable(x, z) {
    if (this.ground(x, z) < -0.35) return false;
    for (const c of this.colliders) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.r * c.r) return false; }
    return true;
  }
  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }
}

const M = o => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

function pineTree(seed, size = 1, color = 0x2f5a3a, snow = false) {
  const g = new THREE.Group(); const r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * size, 0.28 * size, 2.2 * size, 8), M({ color: 0x5a4030 })); trunk.position.y = 1.1 * size; g.add(trunk);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.9 - i * 0.38) * size, (2.2 - i * 0.2) * size, 9), M({ color: new THREE.Color(color).offsetHSL(0, 0, (r() - 0.5) * 0.06 + (snow && i === 3 ? 0.3 : 0)), flatShading: true })); c.position.y = (2.0 + i * 1.15) * size; c.rotation.y = r() * 3; g.add(c); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}

function repaint(terrain, fn) {
  const p = terrain.geometry.attributes.position, c = terrain.geometry.attributes.color; const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const out = fn(p.getX(i), p.getZ(i), p.getY(i)); if (out) { col.set(out); c.setXYZ(i, col.r, col.g, col.b); } }
  c.needsUpdate = true;
}

function findCoast(def, x = 0) { for (let z = 0; z < 220; z += 0.5) if (def.ground(x, z) < 0.45) return z; return 60; }

function marketStall({ stripe = '#2f7fb5', sign = 'RODS & BAIT', wood = '#9b7651' } = {}) {
  const s = new THREE.Group(); const postMat = M({ map: woodTex('#5e4630', 31) });
  const counter = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.0, 1.0, 2, 0.05), M({ map: woodTex(wood, 51) })); counter.position.y = 0.5; s.add(counter);
  for (const sx of [-1.7, 1.7]) for (const sz of [-1.2, 0.45]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 8), postMat); p.position.set(sx, 1.4, sz); s.add(p); }
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.2), M({ map: canvasTex(512, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4efe4' : stripe; g.fillRect(i * w / 8, 0, w / 8, h); } }), side: THREE.DoubleSide })); awn.position.set(0, 2.85, -0.35); awn.rotation.x = -Math.PI / 2 + 0.3; s.add(awn);
  const signM = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.5), M({ map: canvasTex(512, 116, (g, w, h) => { g.fillStyle = '#2d2116'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6d47a'; g.font = 'bold 60px sans-serif'; g.textAlign = 'center'; g.fillText(sign, w / 2, 80); }) })); signM.position.set(0, 2.3, 0.52); s.add(signM);
  for (let i = 0; i < 5; i++) { const rd = makeRod({ finish: ['driftwood', 'sunsetFade', 'carbonStorm', 'driftwood', 'abyssMarble'][i], length: 1.9 }); rd.position.set(-1.2 + i * 0.6, 1.05, -1.0); s.add(rd); }
  s.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return s;
}
function upgraderBoard(dark = false) {
  const g = new THREE.Group(); const postMat = M({ map: woodTex(dark ? '#3f352c' : '#5e4630', 31) });
  const tex = canvasTex(512, 640, (c, w, h) => { c.fillStyle = '#1b1530'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d6b25a'; c.lineWidth = 10; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#f2d98a'; c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.fillText('UPGRADER', w / 2, 100); c.lineWidth = 34; c.strokeStyle = '#3a2f5a'; c.beginPath(); c.arc(w / 2, 330, 150, 0, 7); c.stroke(); c.strokeStyle = '#38e08a'; c.beginPath(); c.arc(w / 2, 330, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.95); c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 72px sans-serif'; c.fillText('47.5%', w / 2, 355); c.font = '30px sans-serif'; c.fillStyle = '#c8bfe6'; c.fillText('try your luck', w / 2, 560); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 0.12), [postMat, postMat, postMat, postMat, M({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }), postMat]); board.position.y = 2.2; g.add(board);
  for (const sx of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), postMat); p.position.set(sx, 1.4, -0.1); g.add(p); }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}

function buildDock(def, { x = 0, z0, z1, y = 1.0, width = 2.6, broken = false, seed = 3 }) {
  const r = rng(seed); const g = new THREE.Group();
  const plankMat = M({ map: broken ? planksTex('#6e6253', 91) : woodTex('#8c6a48', 21) }), postMat = M({ map: woodTex(broken ? '#4f4338' : '#5e4630', 31) });
  for (let z = z0; z < z1; z += 0.32) { if (broken && r() < 0.14) continue; const pl = new THREE.Mesh(new THREE.BoxGeometry(width * (broken && r() < 0.1 ? 0.6 : 1), 0.08, 0.28), plankMat); pl.position.set(x + (r() - 0.5) * (broken ? 0.12 : 0.02), y + (r() - 0.5) * (broken ? 0.05 : 0.012), z); if (broken) pl.rotation.y = (r() - 0.5) * 0.08; g.add(pl); }
  for (let z = z0 + 0.5; z < z1; z += 3) for (const s of [-1, 1]) { if (broken && r() < 0.15) continue; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 3.4, 10), postMat); p.position.set(x + s * (width / 2 + 0.05), y - 1.2, z); if (broken) p.rotation.set((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15); g.add(p); }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  def.root.add(g);
  def.docks.push({ x0: x - width / 2, x1: x + width / 2, z0, z1, y: y + 0.04 });
  return g;
}

// ---------- shared village island ----------
function villageIsland(def, o) {
  const r = rng(o.seed);
  const R = o.radius;
  const terrain = makeIsland({ radius: R, height: o.height, seed: o.seed % 50, peakX: o.peak?.[0] ?? 0.1, peakZ: o.peak?.[1] ?? -0.55, edgeVar: 0.28, segments: 240, size: 2.3, ...o.colors, cliff: o.cliff ?? 0, terrace: { cx: 0, cz: R * 0.45, r: R * 0.7, step: 3.2 } });
  def.terrain = terrain; def.root.add(terrain);
  const coast = findCoast(def);
  const pathX = z => Math.sin(z * 0.08) * 5;
  repaint(terrain, (x, z, y) => { if (y < 0.9) return null; if (Math.hypot(x, z - (coast - 6)) < 9 && y < 3.5) return o.plaza; if (Math.abs(x - pathX(z)) < 1.1 && z > 5 && z < coast) return o.dirt; return null; });
  def.waterIslands.push(new THREE.Vector4(0, 0, R * 0.85, 26));
  const L = (x, z) => new THREE.Vector3(x, def.ground(x, z), z);
  const camPos = new THREE.Vector3(0, 0, coast + o.dockLen);
  const face = (obj, j = 0.15) => { obj.rotation.y = Math.atan2(camPos.x - obj.position.x, camPos.z - obj.position.z) * 0.6 + (r() - 0.5) * j; };

  // houses on the terraces facing the sea
  const occupied = [];
  let n = 0;
  for (let row = 0; row < 7; row++) {
    const lz = coast - 9 - row * 9.5;
    for (let lx = -R * 0.62; lx <= R * 0.62; lx += 9 + r() * 4) {
      const x = lx + (r() - 0.5) * 2, z = lz + (r() - 0.5) * 2;
      if (Math.abs(x - pathX(z)) < 4.5 || Math.hypot(x, z - (coast - 6)) < 13) continue;
      const p = L(x, z); if (p.y < 1.2 || p.y > o.height * 0.9) continue;
      const ys = [L(x + 2.5, z).y, L(x - 2.5, z).y, L(x, z + 2).y, L(x, z - 2).y];
      if (Math.max(...ys) - Math.min(...ys) > 2.2) continue;
      if (occupied.some(q => q.distanceTo(p) < 8)) continue;
      const hopts = o.house(r, n);
      const hse = makeHouse({ w: 4.5 + r() * 2, d: 3.8 + r() * 1.5, h: 2.6 + r() * 0.8, roofH: 1.6 + r() * 0.8, seed: n + o.seed, ...hopts });
      hse.position.set(p.x, Math.min(...ys) - 0.05, p.z); face(hse); def.root.add(hse);
      def.addCollider(p.x, p.z, 3.4);
      occupied.push(p); n++;
      if (hopts.broken && r() < 0.4) { for (let k = 0; k < 1 + Math.floor(r() * 2); k++) { const c = crow(); c.position.set(p.x + (r() - 0.5) * 2, p.y + 5.2, p.z); c.rotation.y = r() * 6; def.root.add(c); } }
      if (r() < 0.45) { const b = barrel(hopts.broken ? '#6e6253' : '#8a6240'); b.position.set(p.x + 3, p.y, p.z + 2.5); def.root.add(b); }
    }
  }
  def.houses = occupied;
  // the one lit window in an abandoned village
  if (o.litHouse) {
    const p = L(-14, coast - 18.5);
    const hse = makeHouse({ w: 5.5, d: 4.5, h: 3, roofH: 2, wall: 'stone', wallColor: '#7f786c', roofColor: '#4a4f55', seed: 909, lit: true, flowers: false, shutter: '#3a3a3a' });
    hse.position.copy(p); face(hse, 0); def.root.add(hse); def.addCollider(p.x, p.z, 3.4);
    const pl = new THREE.PointLight(0xffa04a, 10, 14, 1.5); pl.position.set(0, 1.8, 3); hse.add(pl);
  }
  // trees and bushes
  for (let i = 0, k = 0; i < 900 && k < o.treeCount; i++) {
    const a = r() * Math.PI * 2, rad = R * (0.15 + r() * 0.95);
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad; const p = L(x, z);
    if (p.y < (o.treeMinY ?? 0.9) || p.y > o.height * 1.2) continue;
    if (occupied.some(q => q.distanceTo(p) < 6) || Math.abs(x - pathX(z)) < 3 || (Math.abs(x) < 14 && z > coast - 18)) continue;
    const t = o.tree(r, i, p.y); if (!t) continue;
    t.position.copy(p).y -= 0.2; t.rotation.y = r() * 6.28; def.root.add(t); def.addCollider(p.x, p.z, 0.6); k++;
  }
  for (let i = 0, k = 0; i < 400 && k < (o.bushes ?? 40); i++) { const x = (r() - 0.5) * R * 1.8, z = (r() - 0.5) * R * 1.8; const p = L(x, z); if (p.y < 2 || occupied.some(q => q.distanceTo(p) < 5) || Math.abs(x - pathX(z)) < 3) continue; const b = makeBush(0.6 + r() * 0.9, i + 90, o.bushColor ?? 0x4f7f30); b.position.copy(p).y -= 0.3; def.root.add(b); k++; }
  for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2; const p = L(Math.cos(a) * R * (0.85 + r() * 0.25), Math.sin(a) * R * (0.85 + r() * 0.25)); if (Math.abs(p.x) < 8 && p.z > 0) continue; const k2 = makeRock(0.8 + r() * 1.8, i + 7, o.rockColor ?? 0x77726a); k2.position.copy(p); def.root.add(k2); }
  // lanterns up the path
  for (let z = coast - 6; z > 8; z -= 8) { const p = L(pathX(z) + 2.2, z); if (p.y < 0.8) continue; const lp = lanternPost(!!o.lanternsLit); lp.position.copy(p); lp.rotation.y = Math.PI; def.root.add(lp); def.addCollider(p.x, p.z, 0.3); }
  // plaza: well, market stall, upgrader chart
  { const p = L(6, coast - 9); const w = well(); w.position.copy(p); w.rotation.y = 0.4; def.root.add(w); def.addCollider(p.x, p.z, 1.3); }
  const stall = marketStall(o.stall ?? {}); stall.position.copy(L(-9, coast - 5)); face(stall, 0); def.root.add(stall); def.addCollider(stall.position.x, stall.position.z - 0.3, 2.0);
  const board = upgraderBoard(o.dark); board.position.copy(L(9, coast - 5)); face(board, 0); def.root.add(board); def.addCollider(board.position.x, board.position.z, 1.2);
  // beach props
  for (const [lx, flip, col] of [[-24, true, 0x3f6f8f], [-31, false, 0xc45a4a], [22, false, 0xd9a441]]) { const b = rowboat(o.broken ? 0x5f6a6e : col, flip, !!o.broken && !flip); b.position.copy(L(lx, coast - 2.5)); b.rotation.y = 1.2 + r() * 0.5; def.root.add(b); }
  for (const lx of [-17, 28]) { const nr = netRack(!!o.broken); nr.position.copy(L(lx, coast - 4)); face(nr, 0.3); def.root.add(nr); }
  { const f = fence(10, !!o.broken, o.seed); f.position.copy(L(14, coast - 10)); f.rotation.y = 0.1; def.root.add(f); }
  if (o.lighthouse) { const p = L(R * 0.58, coast - 26); if (p.y > 0.5) { const lh = lighthouse(o.lighthouse === 'lit'); lh.position.copy(p); if (o.broken) lh.rotation.z = 0.05; def.root.add(lh); def.addCollider(p.x, p.z, 2.6); } }
  // dock
  const dockY = 1.0;
  buildDock(def, { z0: coast - 4, z1: coast + o.dockLen + 1, y: dockY, broken: !!o.broken, seed: o.seed });
  { const b = rowboat(o.broken ? 0x5f6a6e : 0x7fae8a, false, !!o.broken); b.position.set(3.2, o.broken ? -0.5 : -0.25, coast + o.dockLen * 0.55); b.rotation.y = 0.08; def.root.add(b); }
  { const b = barrel(); b.position.set(-0.8, dockY, coast + o.dockLen - 4.4); def.root.add(b); def.addCollider(-0.8, coast + o.dockLen - 4.4, 0.45); }

  // NPCs
  const market = makeNPC('market'); market.position.copy(stall.position).add(new THREE.Vector3(0, 0, -0.85).applyAxisAngle(new THREE.Vector3(0, 1, 0), stall.rotation.y)); market.rotation.y = stall.rotation.y; def.root.add(market);
  def.npcs.push({ role: 'market', obj: market, name: o.marketName ?? 'Market', action: 'shop' });
  const up = makeNPC('upgrader'); up.position.copy(board.position).add(new THREE.Vector3(-1.7, 0, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), board.rotation.y)); up.rotation.y = board.rotation.y + 0.5; def.root.add(up);
  def.npcs.push({ role: 'upgrader', obj: up, name: 'Upgrader', action: 'upgrader' });
  if (o.talker) {
    const t = makeNPC(o.talker.role); t.position.set(o.talker.x ?? 0.8, dockY + 0.04, coast + o.dockLen - (o.talker.back ?? 7)); t.rotation.y = -0.3; def.root.add(t);
    def.npcs.push({ role: o.talker.role, obj: t, name: o.talker.name, action: 'talk', lines: o.talker.lines });
  }
  for (const v of o.villagers ?? []) { const vv = makeNPC(v.role); vv.position.copy(L(v.x, coast - v.back)); face(vv, 0.6); def.root.add(vv); def.npcs.push({ role: v.role, obj: vv, name: v.name, action: 'talk', lines: v.lines }); }
  for (const npc of def.npcs) def.addCollider(npc.obj.position.x, npc.obj.position.z, 0.55);
  def.spawn = { x: 0, z: coast + o.dockLen - 0.4, yaw: 0, pitch: -0.05 };
  def.coast = coast;
}

// ---------- the five preview islands ----------
function tropical(def) {
  const walls = ['planks', 'planks', 'plaster', 'stone'];
  const cols = { planks: ['#6f9fc0', '#e8dcc0', '#d9a441', '#9a7650', '#c45a4a', '#7fae8a'], plaster: ['#efe6d2', '#f2e2c4'], stone: ['#a39a8a', '#b8ae9a'] };
  const roofs = ['#a5482f', '#3f6f8f', '#5a5f66', '#7a3b2e', 'thatch'];
  villageIsland(def, {
    seed: 4, radius: 82, height: 30, dockLen: 34, treeCount: 70, lighthouse: 'unlit',
    colors: { sand: 0xe8d7a8, grass: 0x5d8f3a, rock: 0x7d776c, wet: 0xb8a57a }, dirt: 0xb59d6e, plaza: 0xc9b48a,
    house: (r) => { const wall = walls[Math.floor(r() * 4)]; const roof = roofs[Math.floor(r() * 5)]; return { wall, wallColor: cols[wall][Math.floor(r() * cols[wall].length)], roofType: roof === 'thatch' ? 'thatch' : 'shingle', roofColor: roof === 'thatch' ? '#c9a86a' : roof, porch: r() < 0.3 }; },
    tree: (r, i, y) => (y < 4 ? makePalm(7 + r() * 5, 0.2 + r() * 0.4, i + 1) : roundTree(i + 5, 0.9 + r() * 0.6)),
    talker: { role: 'elder', name: 'Old fisherman', lines: ['Welcome to Driftwood Cove, young one! Hold the left mouse button to cast, and let go inside a colored zone.', 'The gold zone is tiny, but it sends your line furthest. The best fish live out there.', 'Sell what you catch at the market, buy better rods, and one day... you might reach THE Island.'] },
    villagers: [{ role: 'kid', name: 'Pip', x: -5, back: 22, lines: ['Did you know some fish jump out of the water? When they do, press Space to give them slack!'] }, { role: 'cook', name: 'Marla', x: -20, back: 3, lines: ['I only cook what you catch. Bring me something rare one day!'] }],
    stall: { stripe: '#2f7fb5' }, marketName: 'Driftwood Market',
  });
  def.fogBase = 0.0016; def.lagoon = 0x47e0cf; def.shallow = 0x0f8f99; def.deep = 0x05324a;
  for (const [x, z, rr, hh, sd] of [[420, -900, 90, 50, 5], [-650, -1300, 130, 70, 8]]) { const f = makeIsland({ radius: rr, height: hh, seed: sd, cliff: 20, segments: 80 }); f.position.set(x, 0, z); def.root.add(f); }
}
function pine(def) {
  villageIsland(def, {
    seed: 21, radius: 86, height: 38, dockLen: 30, treeCount: 110, lighthouse: 'lit', cliff: 8,
    colors: { sand: 0xb7ab92, grass: 0x4a7a3e, rock: 0x7a7570, wet: 0x8a7f68 }, dirt: 0x8f7a58, plaza: 0xa39478, rockColor: 0x6f6c68, bushColor: 0x3f6a34,
    house: (r) => { const wall = r() < 0.55 ? 'stone' : 'planks'; return { wall, wallColor: wall === 'stone' ? ['#9a9488', '#8a857a', '#a8a094'][Math.floor(r() * 3)] : ['#7a5a3e', '#8f6a48', '#5f6a4e'][Math.floor(r() * 3)], roofType: 'shingle', roofColor: ['#3f4650', '#5a2f2a', '#46504a'][Math.floor(r() * 3)], porch: r() < 0.35 }; },
    tree: (r, i) => pineTree(i + 3, 0.9 + r() * 0.7),
    talker: { role: 'captain', name: 'Harbor master', lines: ['Pinecrest Isle! The water is colder here, and the fish fight harder.', 'Better rods hold heavier fish. A weak rod on a big fish? It snaps.'] },
    villagers: [{ role: 'kid', name: 'Fenn', x: 5, back: 30, lines: ['The pines here are older than the lighthouse.'] }],
    stall: { stripe: '#3f6a34', sign: 'TACKLE & BAIT' }, marketName: 'Pinecrest Tackle',
  });
  def.fogBase = 0.0022; def.lagoon = 0x3fa89a; def.shallow = 0x1d6f74; def.deep = 0x062a3a; def.cloudColor = 0xeef2f6;
}
function storm(def) {
  villageIsland(def, {
    seed: 50, radius: 78, height: 34, dockLen: 30, treeCount: 30, lighthouse: 'lit', cliff: 14, lanternsLit: true,
    colors: { sand: 0x8f877a, grass: 0x56634a, rock: 0x5f5d5a, wet: 0x5c574e }, dirt: 0x6f6658, plaza: 0x807868, rockColor: 0x55534f, bushColor: 0x45523a,
    house: (r) => ({ wall: 'stone', wallColor: ['#7f7a70', '#6f6c66', '#8a857c'][Math.floor(r() * 3)], roofType: 'shingle', roofColor: ['#3a3f46', '#2f3438'][Math.floor(r() * 2)], flowers: false, lit: r() < 0.5 }),
    tree: (r, i) => (r() < 0.6 ? deadTree(i + 2, 0.8 + r() * 0.4) : pineTree(i + 9, 0.8, 0x34503c)),
    talker: { role: 'sailor', name: 'Old sailor', lines: ["Siren's Reach. You hear the singing too? Don't listen too long.", 'Storms roll in fast out here, and something big circles the island at night.', "I'd keep my eyes on the water, if I were you."] },
    stall: { stripe: '#4a5562', sign: 'BAIT · ROPE · RODS' }, marketName: "Siren's Reach Market",
  });
  def.fogBase = 0.0032; def.lagoon = 0x3a5a58; def.shallow = 0x1f3f45; def.deep = 0x071a22; def.cloudColor = 0xb8bcc6;
  for (let i = 0; i < 6; i++) { const sp = makeRock(12 + i * 3, i + 30, 0x4a4a4c); sp.scale.set(0.5, 2.8 + i * 0.4, 0.5); sp.position.set(-160 + i * 60, 6, -260 - i * 25); def.root.add(sp); }
}
function abandoned(def) {
  const wallsC = { planks: ['#7a6f60', '#6e665a', '#857a68', '#5f6a6e'], stone: ['#7f786c', '#6f6a60'], plaster: ['#a49c8a', '#9a9284'] };
  villageIsland(def, {
    seed: 80, radius: 76, height: 28, dockLen: 30, treeCount: 40, lighthouse: 'unlit', broken: true, dark: true, litHouse: true,
    colors: { sand: 0x8a8272, grass: 0x56603e, rock: 0x5d5a55, wet: 0x4f4a42 }, dirt: 0x5a5040, plaza: 0x6a6252, rockColor: 0x5a5650, bushColor: 0x4a5233,
    house: (r) => { const wall = ['planks', 'planks', 'stone', 'plaster'][Math.floor(r() * 4)]; return { wall, wallColor: wallsC[wall][Math.floor(r() * wallsC[wall].length)], roofColor: ['#5a3a2e', '#4a4f55', '#5e5040'][Math.floor(r() * 3)], broken: true, flowers: false, shutter: '#4a4a4a' }; },
    tree: (r, i) => deadTree(i + 11, 0.8 + r() * 0.6),
    talker: { role: 'sailor', name: 'Old sailor', lines: ['Nobody has lived here for forty years.', 'The lamp in that window? It never goes out. Don\'t ask who lights it.', "And don't fish after dark. The things that bite here don't let go."] },
    stall: { stripe: '#5a5048', sign: 'WHAT\'S LEFT', wood: '#6e6253' }, marketName: 'The last trader',
  });
  def.fogBase = 0.0042; def.lagoon = 0x34433b; def.shallow = 0x26332f; def.deep = 0x0d1718; def.cloudColor = 0x8f8a98;
  { const ll = laundryLine(12, true, 7); ll.position.set(-20, 4.4 + def.ground(-20, def.coast - 14), def.coast - 14); def.root.add(ll); }
  { const ct = cart(true); ct.position.set(5, def.ground(5, def.coast - 15), def.coast - 15); ct.rotation.y = 0.5; def.root.add(ct); def.addCollider(5, def.coast - 15, 1.6); }
}
function gods(def) {
  const r = rng(100);
  const plateauY = 1.4, R = 110;
  // a marble plateau rising from the sea
  const marbleM = M({ map: (() => { const t = marbleTex('#ece6da', 3).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); t.needsUpdate = true; return t; })(), roughness: 0.5 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 4, 10, 96, 1, true), marbleM); wall.position.y = plateauY - 5; def.root.add(wall);
  const top = new THREE.Mesh(new THREE.CircleGeometry(R, 96), M({ map: (() => { const t = pavingTex('#d9d2c3', 7).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.needsUpdate = true; return t; })(), roughness: 0.6 }));
  top.rotation.x = -Math.PI / 2; top.position.y = plateauY; top.receiveShadow = true; def.root.add(top);
  def.flats.push({ test: (x, z) => x * x + z * z < R * R, y: () => plateauY });
  const goldM = M({ color: 0xd8a93a, metalness: 1, roughness: 0.3, emissive: 0xb07818, emissiveIntensity: 0.5 });
  for (const sx of [-5.6, 5.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 140), goldM); l.position.set(sx, plateauY + 0.02, 38); def.root.add(l); }
  // houses of the gods along the avenue
  for (const side of [-1, 1]) {
    let z = 104;
    while (z > -10) {
      const w = 6 + r() * 3, d = 6 + r() * 2, h = 3.6 + (r() < 0.4 ? 2.6 : 0) + r() * 0.8;
      const hse = makeHouse({ w, d, h, wall: 'marble', wallColor: ['#efeae0', '#f2ecdf', '#e8e1d2'][Math.floor(r() * 3)], roofType: 'flat', dome: r() < 0.45 ? 'gold' : false, goldTrim: true, portico: r() < 0.4, lit: r() < 0.35, seed: Math.floor(r() * 999), flowers: false, shutter: '#c9a14a', doorColor: '#7a5a2a' });
      const x = side * (10.5 + d / 2), zz = z - w / 2;
      hse.position.set(x, plateauY - 0.35, zz); hse.rotation.y = -side * Math.PI / 2; def.root.add(hse);
      def.colliders.push({ x, z: zz, r: Math.max(w, d) / 2 + 0.3 });
      const cy = cypress(Math.floor(r() * 99), 7 + r() * 4); cy.position.set(side * 9.2, plateauY, z - w - 1.2); def.root.add(cy); def.addCollider(side * 9.2, z - w - 1.2, 0.6);
      z -= w + 3 + r() * 2;
    }
  }
  for (const sx of [-7.4, 7.4]) for (let z = 102; z > -8; z -= 7) { const c = makeColumn(5.5, 0.38); c.position.set(sx, plateauY, z); def.root.add(c); def.addCollider(sx, z, 0.5); }
  for (const sx of [-7.4, 7.4]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 112), marbleM); beam.position.set(sx, plateauY + 6.6, 47); def.root.add(beam); }
  for (let z = 98, i = 0; z > -6; z -= 14, i++) for (const sx of [-5.2, 5.2]) { const b = brazierStand(i % 3 === 1); b.position.set(sx, plateauY, z); def.root.add(b); def.addCollider(sx, z, 0.4); }
  { const f = fountain(); f.position.set(0, plateauY, 50); def.root.add(f); def.addCollider(0, 50, 3.5); const fl = new THREE.PointLight(0x6fd6ff, 18, 20, 1.6); fl.position.set(0, plateauY + 2, 50); def.root.add(fl); }
  // temple
  const T = new THREE.Group(); T.position.set(0, plateauY, -38); def.root.add(T);
  for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(70 - i * 2, 0.7, 50 - i * 2), marbleM); st.position.y = 0.35 + i * 0.7; T.add(st); }
  const tb = 5.6, colH = 16;
  for (let i = 0; i < 8; i++) for (const cz of [12, -10]) { const c = makeColumn(colH, 1.15); c.position.set(-24.5 + i * 7, tb, cz); T.add(c); }
  const ent = new THREE.Mesh(new THREE.BoxGeometry(58, 3.2, 28), marbleM); ent.position.y = tb + colH + 2.4; T.add(ent);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(58.3, 0.8, 28.3), goldM); fr.position.y = tb + colH + 1.2; T.add(fr);
  const ped = new THREE.Shape(); ped.moveTo(-30, 0); ped.lineTo(30, 0); ped.lineTo(0, 8); ped.lineTo(-30, 0);
  const pedM = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 28, bevelEnabled: false }), marbleM); pedM.position.set(0, tb + colH + 4, -14); T.add(pedM);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(46, 15), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.62, 0.22) })); inner.position.set(0, tb + 7.5, -11); T.add(inner);
  const tl = new THREE.PointLight(0xffb060, 400, 90, 1.5); tl.position.set(0, tb + 10, 4); T.add(tl);
  def.colliders.push({ x: -30, z: -38, r: 8 }, { x: 30, z: -38, r: 8 });
  // stairs of the temple are walkable: rise toward the colonnade
  def.flats.push({ test: (x, z) => Math.abs(x) < 34 && z < -13 && z > -63, y: (x, z) => plateauY + Math.min(5.6, Math.max(0, (-13 - z) * 0.7)) });
  // the faceless god
  const god = makeGodStatue({ step: 0.05 }); god.scale.setScalar(10.5); god.position.set(0, plateauY + 9, -92); god.rotation.y = 0.08; def.root.add(god);
  const pd = new THREE.Mesh(new THREE.BoxGeometry(34, 9, 34), marbleM); pd.position.set(0, plateauY + 4.5, -92); def.root.add(pd); def.addCollider(0, -92, 20);
  for (const [x, z] of [[-16, 18], [16, 18], [0, 22]]) { const s = new THREE.SpotLight(0xffc56a, 700, 260, 0.5, 0.7, 1.4); s.position.set(x, plateauY + 10, -92 + z); s.target.position.set(0, 70, -92); def.root.add(s, s.target); }
  // marble pier out to sea, lined with braziers
  const pierY = 0.9;
  const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 46), marbleM); pier.position.set(0, pierY - 0.6, R + 21); def.root.add(pier);
  def.docks.push({ x0: -4, x1: 4, z0: R - 3, z1: R + 44, y: pierY });
  for (let z = R + 4; z < R + 44; z += 12) for (const sx of [-3.6, 3.6]) { const b = brazierStand(z > R + 30); b.position.set(sx, pierY, z); def.root.add(b); def.addCollider(sx, z, 0.4); }
  def.waterIslands.push(new THREE.Vector4(0, 0, R, 30));
  def.spawn = { x: 0, z: R + 42, yaw: 0, pitch: 0.08 };
  def.coast = R;
  def.fogBase = 0.0011; def.lagoon = 0x0d3442; def.shallow = 0x0a1c2c; def.deep = 0x01040a; def.startHour = 22; def.cloudColor = 0xd8d0ff;
  def.echo = true;
}

const BUILDERS = { tropical, pine, storm, abandoned, eerie: abandoned, marble: gods, gods };

export function buildIsland(isl) {
  const def = new SceneDef();
  (BUILDERS[isl.theme] ?? tropical)(def);
  // keep characters and lights out of the merge; everything else becomes a few big meshes
  const stats = bakeStatic(def.root, { keep: o => o.userData.dynamic || o === def.terrain || o.isLight });
  def.stats = stats;
  return def;
}
