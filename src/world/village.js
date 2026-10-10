// Village builder: houses (lived-in or abandoned) and props.
import * as THREE from 'three';
import { canvasTex, rng } from './common.js';

const texCache = {};
function cached(key, make) { return texCache[key] ?? (texCache[key] = make()); }
function rep(tex, x, y) { const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); t.needsUpdate = true; return t; }

export function planksTex(color = '#9a7650', seed = 1, broken = false) {
  return cached(`pl${color}${seed}${broken}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => {
    const n = 8, bw = w / n; const base = new THREE.Color(color);
    for (let i = 0; i < n; i++) { const c = base.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12); g.fillStyle = '#' + c.getHexString(); g.fillRect(i * bw, 0, bw, h);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(30,18,8,${0.06 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; const x = i * bw + r() * bw; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 10, h * 0.3, x + (r() - 0.5) * 10, h * 0.7, x, h); g.stroke(); }
      g.fillStyle = 'rgba(20,12,6,0.55)'; g.fillRect(i * bw, 0, 3, h);
      for (const y of [h * 0.12, h * 0.88]) { g.fillStyle = 'rgba(30,30,30,0.7)'; g.beginPath(); g.arc(i * bw + bw / 2, y, 3, 0, 7); g.fill(); }
      if (broken && r() < 0.25) { const y0 = r() * h * 0.7; g.fillStyle = '#0b0805'; g.fillRect(i * bw + 3, y0, bw - 3, h * (0.1 + r() * 0.25)); }
    }
    if (broken) { for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,80,40,${r() * 0.35})`; g.beginPath(); g.arc(r() * w, h - r() * h * 0.4, 10 + r() * 30, 0, 7); g.fill(); } }
  }); });
}
export function stoneTex(color = '#a39a8a', seed = 2, broken = false) {
  return cached(`st${color}${seed}${broken}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5f594f'; g.fillRect(0, 0, w, h); const base = new THREE.Color(color);
    for (let y = 0; y < h; y += 42) { let x = (y / 42) % 2 ? -30 : 0; while (x < w) { const sw = 50 + r() * 50; const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.18); g.fillStyle = '#' + c.getHexString(); g.beginPath(); g.roundRect(x + 3, y + 3, sw - 6, 36, 10); g.fill(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 6, y + 5, sw - 14, 6); x += sw; } }
    if (broken) { for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(50,75,35,${r() * 0.45})`; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 26, 0, 7); g.fill(); } }
  }); });
}
export function plasterTex(color = '#efe6d2', seed = 3, broken = false) {
  return cached(`pt${color}${seed}${broken}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 3, 3); }
    g.strokeStyle = '#6b4a2e'; g.lineWidth = 22; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    if (broken) { for (let i = 0; i < 9; i++) { g.fillStyle = '#7b6e5c'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 50, 12 + r() * 30, r(), 0, 7); g.fill(); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(50,75,35,${r() * 0.4})`; g.beginPath(); g.arc(r() * w, h - r() * h * 0.5, 8 + r() * 24, 0, 7); g.fill(); } }
  }); });
}
export function shingleTex(color = '#a5482f', seed = 4, broken = false) {
  return cached(`sh${color}${seed}${broken}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => {
    const base = new THREE.Color(color); g.fillStyle = '#2a1a12'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { let x = (y / 32) % 2 ? -24 : 0; while (x < w) { const c = base.clone().offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.14); g.fillStyle = '#' + c.getHexString(); g.beginPath(); g.roundRect(x + 2, y, 46, 30, [0, 0, 10, 10]); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, y + 24, 46, 6); x += 48; } }
    if (broken) { for (let i = 0; i < 26; i++) { g.fillStyle = '#120c08'; g.fillRect(Math.floor(r() * 10) * 48, Math.floor(r() * 16) * 32, 48, 32); } for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(70,95,40,${r() * 0.5})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 22, 0, 7); g.fill(); } }
  }); });
}
export function thatchTex(color = '#c9a86a', seed = 5) {
  return cached(`th${color}${seed}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const x = r() * w, y = r() * h; g.strokeStyle = `rgba(${90 + r() * 60},${60 + r() * 40},${20},${0.25 + r() * 0.3})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 14 + r() * 16); g.stroke(); } for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(40,25,10,0.25)'; g.fillRect(0, y + 56, w, 8); } }); });
}

export function marbleTex(color = '#efeae0', seed = 6) {
  return cached(`mb${color}${seed}`, () => { const r = rng(seed); return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(150,140,125,${0.1 + r() * 0.25})`; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (r() - 0.5) * 40; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(120,110,95,0.35)'; g.lineWidth = 2; for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 128) % 2 ? 0 : 128; x < w; x += 256) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); } }
  }); });
}
export function pavingTex(color = '#d9d2c3', seed = 7, mud = false) {
  return cached(`pv${color}${seed}${mud}`, () => { const r = rng(seed); return canvasTex(1024, 1024, (g, w, h) => {
    if (mud) { g.fillStyle = '#4a4034'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${40 + r() * 50},${32 + r() * 40},${22 + r() * 30},0.5)`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 14, 0, 7); g.fill(); } for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(70,74,80,0.85)'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 70, 10 + r() * 30, r() * 3, 0, 7); g.fill(); } for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(110,105,95,${0.5 + r() * 0.4})`; g.beginPath(); g.roundRect(r() * w, r() * h, 18 + r() * 30, 12 + r() * 20, 6); g.fill(); } return; }
    g.fillStyle = '#8a8274'; g.fillRect(0, 0, w, h); const base = new THREE.Color(color);
    for (let y = 0; y < h; y += 64) { let x = (y / 64) % 2 ? -48 : 0; while (x < w) { const sw = 96 + r() * 40; const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.1); g.fillStyle = '#' + c.getHexString(); g.fillRect(x + 2, y + 2, sw - 4, 60); x += sw; } }
  }); });
}
const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

export function makeHouse(o = {}) {
  const { w = 5, d = 4, h = 2.8, roofH = 1.9, wall = 'planks', roofType = 'shingle', stilts = 0, broken = false, seed = 1, lit = false, chimney = true, porch = false, flowers = true } = o;
  const r = rng(seed * 31 + 7);
  const wallColor = o.wallColor ?? (wall === 'stone' ? '#a39a8a' : wall === 'plaster' ? '#efe6d2' : '#9a7650');
  const roofColor = o.roofColor ?? (roofType === 'thatch' ? '#c9a86a' : '#a5482f');
  const g = new THREE.Group();
  const base = stilts > 0 ? stilts : 0.35;
  const wt = wall === 'stone' ? stoneTex(wallColor, seed, broken) : wall === 'plaster' ? plasterTex(wallColor, seed, broken) : wall === 'marble' ? marbleTex(wallColor, seed) : planksTex(wallColor, seed, broken);
  const tile = wall === 'plaster' ? 3 : wall === 'marble' ? 4 : 2;
  const front = M({ map: rep(wt, w / tile, h / tile) }), side = M({ map: rep(wt, d / tile, h / tile) }), plain = M({ color: 0x3a2f25 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, plain, plain, front, front]);
  walls.position.y = base + h / 2; g.add(walls);
  if (stilts > 0) { const pm = M({ map: rep(planksTex('#5e4630', 9), 0.3, 1) }); for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, stilts + 2, 8), pm); p.position.set(sx * (w / 2 - 0.2), (stilts - 2) / 2, sz * (d / 2 - 0.2)); g.add(p); } const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 0.15, d + 1.2), M({ map: rep(planksTex('#8c6a48', 21), (w + 1.6) / 2, (d + 1.2) / 2) })); deck.position.set(0, stilts - 0.05, 0.4); g.add(deck); }
  else { const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, base + 0.6, d + 0.3), M({ map: rep(stoneTex('#8f877a', 77), (w + 0.3) / 2, 0.5) })); f.position.y = (base - 0.6) / 2; g.add(f); }
  const top = base + h;
  const rt = roofType === 'thatch' ? thatchTex(roofColor, seed) : shingleTex(roofColor, seed, broken);
  if (roofType === 'flat') {
    const slabM = M({ map: rep(o.wall === 'marble' ? marbleTex(wallColor, seed) : wt, (w + 0.4) / 4, 0.2) });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), slabM); slab.position.y = top + 0.15; g.add(slab);
    const goldM = M({ color: 0xd8a93a, metalness: 1, roughness: 0.3, emissive: 0xb07818, emissiveIntensity: 0.35 });
    if (o.goldTrim) { const tr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.12, d + 0.45), goldM); tr.position.y = top + 0.02; g.add(tr); }
    for (const [px, pz, sx, sz] of [[0, d / 2 + 0.15, w + 0.4, 0.15], [0, -d / 2 - 0.15, w + 0.4, 0.15], [w / 2 + 0.15, 0, 0.15, d + 0.4], [-w / 2 - 0.15, 0, 0.15, d + 0.4]]) { const pp = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.5, sz), slabM); pp.position.set(px, top + 0.55, pz); g.add(pp); }
    if (o.dome) { const dm = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), o.dome === 'gold' ? goldM : M({ color: 0x3f6f9f, roughness: 0.4 })); dm.position.y = top + 0.3; g.add(dm); }
    if (o.portico) { for (const s2 of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, h, 16), M({ color: 0xf2eee6, roughness: 0.5 })); col.position.set(s2 * (w / 2 - 0.5), base + h / 2, d / 2 + 1.2); g.add(col); } const pr = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 1.7), slabM); pr.position.set(0, top - 0.1, d / 2 + 0.9); g.add(pr); }
  } else {
  // gables
  const gable = new THREE.Shape(); gable.moveTo(-w / 2, 0); gable.lineTo(w / 2, 0); gable.lineTo(0, roofH); gable.lineTo(-w / 2, 0);
  const gt = rep(wall === 'stone' ? planksTex('#8a6a48', seed + 3, broken) : wt, 0.5, 0.5);
  for (const sz of [1, -1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), M({ map: gt, side: THREE.DoubleSide })); gm.position.set(0, top, sz * d / 2); g.add(gm); }
  // roof
  const over = 0.45, L = Math.hypot(w / 2 + over, roofH * (w / 2 + over) / (w / 2)), ang = Math.atan2(roofH, w / 2);
  const thick = roofType === 'thatch' ? 0.35 : 0.14;
  for (const s of [-1, 1]) {
    if (broken) {
      const strips = 9; for (let i = 0; i < strips; i++) { if (r() < 0.28) continue; const len = (d + 0.8) / strips; const slab = new THREE.Mesh(new THREE.BoxGeometry(L * (r() < 0.2 ? 0.55 : 1), thick, len * 0.96), M({ map: rep(rt, L / 2, 0.3) })); slab.position.set(s * (w / 4 + over / 2 - 0.05), top + roofH / 2 - 0.05, -(d + 0.8) / 2 + len * (i + 0.5)); slab.rotation.z = -s * ang + (r() - 0.5) * 0.08; g.add(slab); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, d + 0.6), M({ color: 0x3b2a1c })); beam.position.set(s * w / 4, top + roofH / 2, 0); beam.rotation.z = -s * ang; g.add(beam);
    } else {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(L, thick, d + 0.9), M({ map: rep(rt, L / 2, (d + 0.9) / 2) })); slab.position.set(s * (w / 4 + over / 2 - 0.05), top + roofH / 2 - 0.05 + (roofType === 'thatch' ? 0.1 : 0), 0); slab.rotation.z = -s * ang; g.add(slab);
    }
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, d + 0.95), M({ color: roofType === 'thatch' ? 0x8a6a3a : 0x5a2a1a })); ridge.position.y = top + roofH + 0.02; if (!broken || r() < 0.5) g.add(ridge);
  if (chimney && !broken || (chimney && r() < 0.6)) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), M({ map: rep(stoneTex('#8a8276', 12), 0.3, 0.8) })); ch.position.set(w * 0.22, top + roofH * 0.75, -d * 0.15); g.add(ch); }
  }
  // door
  const doorM = M({ map: rep(planksTex(o.doorColor ?? '#5a3b25', seed + 9), 0.5, 1) });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 0.08), doorM);
  const dx = (r() - 0.5) * (w - 2.4);
  if (broken && r() < 0.5) { const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.85), M({ color: 0x050403 })); hole.position.set(dx, base + 0.93, d / 2 + 0.01); g.add(hole); door.position.set(dx + 0.6, base + 0.93, d / 2 + 0.35); door.rotation.y = -1.0; }
  else door.position.set(dx, base + 0.93, d / 2 + 0.03);
  g.add(door);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.0, 0.06), M({ color: 0x3b2a1c })); frame.position.set(dx, base + 1.0, d / 2 + 0.01); g.add(frame);
  // windows
  const glassLit = M({ color: 0xffd28a, emissive: 0xffaa44, emissiveIntensity: 2.6 });
  const glassDark = new THREE.MeshStandardMaterial({ color: 0x1d2a35, roughness: 0.15, metalness: 0.6 });
  const holeM = M({ color: 0x040302 });
  const shutterC = new THREE.Color(o.shutter ?? ['#3f6f8f', '#7a3b2e', '#4f7a3a', '#c99a3a'][Math.floor(r() * 4)]);
  const winXs = [];
  for (let x = -w / 2 + 0.9; x <= w / 2 - 0.9; x += 1.5) if (Math.abs(x - dx) > 1.0) winXs.push(x);
  const addWindow = (x, y, z, ry) => {
    const wg = new THREE.Group(); wg.position.set(x, y, z); wg.rotation.y = ry; g.add(wg);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.1), M({ color: 0xe8e0cc })); wg.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), broken ? holeM : (lit && r() < 0.7 ? glassLit : glassDark)); gl.position.z = 0.055; wg.add(gl);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.03), M({ color: 0xe8e0cc })); bar.position.z = 0.07; wg.add(bar); const bar2 = bar.clone(); bar2.rotation.z = Math.PI / 2; wg.add(bar2);
    if (!broken) { for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.95, 0.05), M({ color: shutterC })); sh.position.set(s * 0.68, 0, 0.04); wg.add(sh); } if (flowers && r() < 0.6) { const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.25), M({ color: 0x6b4a2e })); box.position.set(0, -0.58, 0.15); wg.add(box); for (let i = 0; i < 7; i++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), M({ color: i % 2 ? 0x4f8a3a : [0xe8506a, 0xf2c94c, 0xf5f0e0][i % 3], flatShading: true })); fl.position.set(-0.4 + i * 0.13, -0.42, 0.18); wg.add(fl); } } }
    else { for (const a of [0.6, -0.5]) { const bd = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.05), M({ map: rep(planksTex('#6e6253', seed + 5), 1, 0.2) })); bd.position.z = 0.1; bd.rotation.z = a; wg.add(bd); } }
  };
  for (const x of winXs) addWindow(x, base + h * 0.55, d / 2 + 0.03, 0);
  addWindow(0, base + h * 0.55, -d / 2 - 0.03, Math.PI);
  for (const s of [-1, 1]) addWindow(s * (w / 2 + 0.03), base + h * 0.55, 0, s * Math.PI / 2);
  if (porch && !stilts) { const pd = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 1.6), M({ map: rep(planksTex('#8c6a48', 33), w / 2, 0.8) })); pd.position.set(0, base, d / 2 + 0.8); g.add(pd); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), M({ color: 0x5e4630 })); p.position.set(s * (w / 2 - 0.2), base + 1.2, d / 2 + 1.45); g.add(p); } const pr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.1, 1.9), M({ map: rep(rt, w / 2, 1) })); pr.position.set(0, base + 2.45, d / 2 + 0.85); pr.rotation.x = 0.2; g.add(pr); }
  if (broken) {
    // vines and moss creeping up
    const vm = M({ color: 0x2f4424, flatShading: true });
    for (let i = 0; i < 46; i++) { const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + r() * 0.13, 0), vm); const onFront = r() < 0.6; v.position.set(onFront ? (r() - 0.5) * w : (r() < 0.5 ? -1 : 1) * w / 2, base + r() * h * (0.3 + r() * 0.8), onFront ? d / 2 + 0.05 : (r() - 0.5) * d); g.add(v); }
    g.rotation.z = (r() - 0.5) * 0.06; g.rotation.x = (r() - 0.5) * 0.03;
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

export function lanternPost(lit = true, light = false) {
  const g = new THREE.Group(); const dark = M({ color: 0x2a221c });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), dark); post.position.y = 1.3; g.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), dark); arm.position.set(0.25, 2.5, 0); g.add(arm);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), lit ? M({ color: 0xffd28a, emissive: 0xffaa44, emissiveIntensity: 2.2 }) : M({ color: 0x2b2b2b })); box.position.set(0.5, 2.3, 0); g.add(box);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 4), dark); cap.position.set(0.5, 2.55, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
  if (light) { const pl = new THREE.PointLight(0xffa04a, 8, 14, 1.6); pl.position.set(0.5, 2.2, 0); g.add(pl); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
export function barrel(color = '#8a6240') { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.85, 16), M({ map: rep(planksTex(color, 44), 2, 0.5) })); b.scale.set(1, 1, 1); b.position.y = 0.43; g.add(b); for (const y of [0.15, 0.71]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.02, 6, 24), M({ color: 0x333333, metalness: 0.6 })); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); } g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return g; }
export function netRack(broken = false) {
  const g = new THREE.Group(); const pm = M({ color: 0x5e4630 });
  for (const x of [-1.6, 1.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 8), pm); p.position.set(x, 1.1, 0); g.add(p); }
  const nt = canvasTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = broken ? 'rgba(90,85,70,0.9)' : 'rgba(60,50,35,0.95)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + (broken ? Math.sin(i) * 6 : 0), h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } if (broken) c.clearRect(60, 90, 90, 70); });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.7, 12, 6), M({ map: nt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  const p = net.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) - (1 - (x / 1.6) ** 2) * 0.25); } net.geometry.computeVertexNormals();
  net.position.y = 1.25; g.add(net);
  for (let i = 0; i < 5; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M({ color: i % 2 ? 0xe85a3a : 0xf2f2f2 })); fl.position.set(-1.2 + i * 0.6, 2.05 - Math.sin(i / 4 * Math.PI) * 0.2, 0.02); g.add(fl); }
  return g;
}
export function rowboat(color = 0x3f6f8f, flipped = false, broken = false) {
  const g = new THREE.Group();
  const hullGeo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, M({ map: rep(planksTex('#' + new THREE.Color(color).getHexString(), 55, broken), 3, 1), side: THREE.DoubleSide }));
  hull.scale.set(2.1, 0.55, 0.72); hull.position.y = 0.5; g.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 40), M({ color: 0xe8e0cc })); rim.scale.set(2.1, 0.72, 1); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; g.add(rim);
  for (const x of [-0.6, 0.5]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 1.2), M({ color: 0x8c6a48 })); seat.position.set(x, 0.35, 0); g.add(seat); }
  if (flipped) { g.rotation.z = Math.PI; g.position.y = 0.95; }
  if (broken) { g.rotation.set(0.25, 0, 0.35); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function well() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.9, 20, 1, true), M({ map: rep(stoneTex('#9a9182', 66), 3, 0.5), side: THREE.DoubleSide })); ring.position.y = 0.45; g.add(ring);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 6, 20), M({ color: 0x8a8276 })); cap.rotation.x = Math.PI / 2; cap.position.y = 0.9; g.add(cap);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), M({ color: 0x14303a, roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.5; g.add(water);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.9, 0.14), M({ color: 0x5e4630 })); p.position.set(s * 0.85, 1.4, 0); g.add(p); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.8, 4), M({ map: rep(shingleTex('#7a3b2e', 8), 1, 1) })); roof.position.y = 2.6; roof.rotation.y = Math.PI / 4; g.add(roof);
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function lighthouse(lit = true) {
  const g = new THREE.Group();
  const st = canvasTex(64, 512, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#c8402e' : '#f2efe6'; c.fillRect(0, i * h / 6, w, h / 6); } });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 14, 24), M({ map: st })); tower.position.y = 7; g.add(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.3, 24), M({ color: 0x2a2a2a })); gallery.position.y = 14.1; g.add(gallery);
  const room = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 16), lit ? M({ color: 0xfff1c0, emissive: 0xffe08a, emissiveIntensity: 1.6 }) : M({ color: 0x1d2a35, metalness: 0.6, roughness: 0.2 })); room.position.y = 15.05; g.add(room);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.2, 16), M({ color: 0xc8402e })); roof.position.y = 16.45; g.add(roof);
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function deadTree(seed = 1, size = 1) {
  const g = new THREE.Group(); const r = rng(seed); const mat = M({ color: 0x3b332c, roughness: 1 });
  const branch = (start, dir, len, rad, depth) => {
    const end = start.clone().add(dir.clone().multiplyScalar(len));
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((r() - 0.5) * len * 0.2, 0, (r() - 0.5) * len * 0.2));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start, mid, end), 6, rad, 6), mat); tube.castShadow = true; g.add(tube);
    if (depth <= 0) return;
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) { const nd = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.4, 0.2 + r() * 0.5, (r() - 0.5) * 1.4)).normalize(); branch(end, nd, len * (0.55 + r() * 0.2), rad * 0.6, depth - 1); }
  };
  branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), 3.2 * size, 0.22 * size, 4);
  return g;
}
export function crow() {
  const g = new THREE.Group(); const m = M({ color: 0x0d0d10, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), m); body.scale.set(1, 0.85, 1.6); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), m); head.position.set(0, 0.1, 0.22); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), M({ color: 0x222222 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.09, 0.33); g.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.2), m); tail.position.set(0, 0.0, -0.3); tail.rotation.x = 0.3; g.add(tail);
  return g;
}
export function fence(len = 6, broken = false, seed = 3) {
  const g = new THREE.Group(); const r = rng(seed); const m = M({ map: rep(planksTex(broken ? '#7a6f60' : '#a07b52', 88), 0.2, 0.5) });
  for (let x = 0; x <= len; x += 1.2) { if (broken && r() < 0.25) continue; const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), m); p.position.set(x, 0.55, 0); if (broken) p.rotation.z = (r() - 0.5) * 0.4; g.add(p); }
  for (const y of [0.35, 0.8]) { if (broken && r() < 0.4) continue; const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.05), m); rail.position.set(len / 2, y, 0.06); if (broken) rail.rotation.z = (r() - 0.5) * 0.15; g.add(rail); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
export function roundTree(seed = 1, size = 1, color = 0x4f8a34) {
  const g = new THREE.Group(); const r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * size, 0.24 * size, 2.6 * size, 8), M({ color: 0x6b4a2e })); trunk.position.y = 1.3 * size; g.add(trunk);
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * size, 1), M({ color: new THREE.Color(color).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.1), flatShading: true })); c.position.set((r() - 0.5) * 1.6 * size, (2.8 + r() * 1.3) * size, (r() - 0.5) * 1.6 * size); g.add(c); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function cypress(seed = 1, h = 8) {
  const g = new THREE.Group(); const r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 8), M({ color: 0x4a3a2a })); trunk.position.y = 0.7; g.add(trunk);
  const geo = new THREE.SphereGeometry(1, 16, 16); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + (Math.sin(v.y * 9 + v.x * 5) * 0.06 + (r() - 0.5) * 0.08); p.setXYZ(i, v.x * k, v.y, v.z * k); }
  geo.computeVertexNormals();
  const c = new THREE.Mesh(geo, M({ color: 0x2c4a2c, flatShading: true })); c.scale.set(h * 0.13, h * 0.5, h * 0.13); c.position.y = 1.0 + h * 0.48; g.add(c);
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function oliveTree(seed = 1, size = 1) { return roundTree(seed, size, 0x7d8a5a); }
export function fountain({ gold = true } = {}) {
  const g = new THREE.Group(); const mm = M({ map: rep(marbleTex('#efeae0', 9), 2, 0.5), roughness: 0.5 }); const gm = M({ color: 0xd8a93a, metalness: 1, roughness: 0.3, emissive: 0xb07818, emissiveIntensity: 0.4 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.8, 32, 1, true), mm); basin.position.y = 0.4; g.add(basin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.18, 8, 40), mm); rim.rotation.x = Math.PI / 2; rim.position.y = 0.8; g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), M({ color: 0x2a6f8a, roughness: 0.05, metalness: 0.3, emissive: 0x0f4a5a, emissiveIntensity: 0.6 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.65; g.add(water);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.0, 20), mm); ped.position.y = 1.4; g.add(ped);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold ? gm : mm); bowl.position.y = 2.6; g.add(bowl);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), gold ? gm : mm); top.position.y = 3.0; g.add(top);
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function brazierStand(light = false) {
  const g = new THREE.Group(); const gm = M({ color: 0xd8a93a, metalness: 1, roughness: 0.3, emissive: 0xb07818, emissiveIntensity: 0.5 });
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 1.5, 12), gm); st.position.y = 0.75; g.add(st);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gm); bowl.position.y = 1.65; g.add(bowl);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.1, 0.3) })); fl.position.y = 2.1; g.add(fl);
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.8, 1.2) })); core.position.y = 2.0; g.add(core);
  if (light) { const pl = new THREE.PointLight(0xffa04a, 12, 22, 1.6); pl.position.y = 2.4; g.add(pl); }
  return g;
}
export function cart(broken = false) {
  const g = new THREE.Group(); const wm = M({ map: rep(planksTex(broken ? '#6e6253' : '#8c6a48', 17), 1, 0.5) });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.3), wm); bed.position.y = 0.75; g.add(bed);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.08), wm); side.position.set(0, 1.0, s * 0.62); g.add(side); }
  const wheelM = M({ color: 0x4a3a2a });
  for (const s of [-1, 1]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 20), wheelM); wh.position.set(0.3, 0.45, s * 0.72); g.add(wh); for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.04), wheelM); sp.rotation.z = k * Math.PI / 4; sp.position.copy(wh.position); g.add(sp); } }
  for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), wm); sh.position.set(-1.9, 0.7, s * 0.4); sh.rotation.z = -0.2; g.add(sh); }
  if (broken) { g.rotation.set(0.25, 0, 0.18); g.position.y = -0.1; }
  g.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
  return g;
}
export function laundryLine(len = 8, torn = true, seed = 5) {
  const g = new THREE.Group(); const r = rng(seed);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(len / 2, -0.6, 0), new THREE.Vector3(len, 0, 0)), 20, 0.015, 4), M({ color: 0x3a3228 })); g.add(rope);
  const cols = torn ? [0x8a8070, 0x6f6a60, 0x7a6a58, 0x5f6a6e] : [0xf2f2f2, 0xe8506a, 0x3f6f9f, 0xf2c94c];
  for (let x = 0.8; x < len - 0.6; x += 0.9 + r() * 0.5) { const t = x / len; const y = -0.6 * 4 * t * (1 - t); const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.7 + r() * 0.4, 4, 4), M({ color: cols[Math.floor(r() * cols.length)], side: THREE.DoubleSide })); const p = cl.geometry.attributes.position; for (let i = 0; i < p.count; i++) { if (torn && p.getY(i) < -0.2 && r() < 0.5) p.setY(i, p.getY(i) + 0.25); p.setZ(i, Math.sin(p.getY(i) * 3 + x) * 0.05); } cl.geometry.computeVertexNormals(); cl.position.set(x, y - 0.4, 0); g.add(cl); }
  return g;
}
