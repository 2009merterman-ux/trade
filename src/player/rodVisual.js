// Rod meshes with painted finishes, wear scratches and auras. Used in first person, in the bag and in the gallery.
import * as THREE from 'three';
import { rng } from '../engine/util.js';
import { FINISHES, rodById } from '../data/rods.js';

const cache = new Map();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function paintFinish(finishIdx, pattern = 0, wear = 0) {
  const key = `${finishIdx}|${pattern}|${Math.round(wear * 20)}`;
  if (cache.has(key)) return cache.get(key);
  const f = FINISHES[finishIdx]; const r = rng(pattern * 7919 + finishIdx * 31 + 1);
  const c = canvas(256, 1024), g = c.getContext('2d'); const W = 256, H = 1024; const [c0, c1, c2] = f.c;
  const lin = (stops) => { const gr = g.createLinearGradient(0, H, 0, 0); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  switch (f.type) {
    case 'wood': g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(40,24,10,${0.08 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H * 0.3, x - 8, H * 0.7, x + (r() - 0.5) * 10, H); g.stroke(); } break;
    case 'solid': g.fillStyle = c0; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, W * 0.3, H); break;
    case 'stripe': g.fillStyle = c0; g.fillRect(0, 0, W, H); g.fillStyle = c1; { const step = 50 + Math.floor(r() * 40); const off = r() * step; for (let y = -off; y < H; y += step) { g.save(); g.translate(0, y); g.transform(1, 0.35, 0, 1, 0, 0); g.fillRect(0, 0, W, step * (0.25 + r() * 0.2)); g.restore(); } } break;
    case 'camo': g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { g.fillStyle = f.c[1 + Math.floor(r() * 2)]; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, 7); g.fill(); } break;
    case 'fade': g.fillStyle = lin(f.c); g.fillRect(0, 0, W, H); break;
    case 'carbon': g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#2a2e35' : '#14161a'; g.fillRect(x, y, 8, 8); } g.strokeStyle = c1; g.lineWidth = 3; g.shadowColor = c1; g.shadowBlur = 8; g.beginPath(); { let x = W / 2; g.moveTo(x, 0); for (let y = 0; y < H; y += 40) { x = W / 2 + (r() - 0.5) * 140; g.lineTo(x, y); } } g.stroke(); g.shadowBlur = 0; break;
    case 'marble': g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let i = 0; i < 60; i++) { g.strokeStyle = c1 + Math.floor(40 + r() * 180).toString(16).padStart(2, '0'); g.lineWidth = 1 + r() * 4; g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 60; y += r() * 50; g.lineTo(x, y); } g.stroke(); } break;
    case 'damascus': { const a = new THREE.Color(c0), b = new THREE.Color(c1); const ph = r() * 10; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 4) { const v = Math.sin(y * 0.06 + Math.sin(x * 0.05 + ph) * 3 + Math.sin(y * 0.013) * 4); const t = (v + 1) / 2; g.fillStyle = '#' + a.clone().lerp(b, t).getHexString(); g.fillRect(x, y, 4, 2); } break; }
    case 'drip': g.fillStyle = c0; g.fillRect(0, 0, W, H); g.fillStyle = c1; for (let i = 0; i < 26; i++) { const x = r() * W, len = 60 + r() * 300, y0 = r() * H * 0.6; g.fillRect(x, y0, 8 + r() * 10, len); g.beginPath(); g.arc(x + 8, y0 + len, 10, 0, 7); g.fill(); } break;
    case 'spots': g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let i = 0; i < 90; i++) { g.fillStyle = f.c[1 + Math.floor(r() * 2)]; g.beginPath(); g.arc(r() * W, r() * H, 4 + r() * 16, 0, 7); g.fill(); } break;
    case 'pearl': { const gr = g.createLinearGradient(0, 0, W, H); f.c.concat(f.c).forEach((s, i, arr) => gr.addColorStop(i / (arr.length - 1), s)); g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.25})`; g.beginPath(); g.ellipse(r() * W, r() * H, 30, 80, r() * 3, 0, 7); g.fill(); } break; }
    case 'crack': g.fillStyle = c0; g.fillRect(0, 0, W, H); g.strokeStyle = c1; g.shadowColor = c1; g.shadowBlur = 12; for (let i = 0; i < 18; i++) { g.lineWidth = 1 + r() * 3; g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 70; y += (r() - 0.3) * 70; g.lineTo(x, y); } g.stroke(); } g.shadowBlur = 0; break;
    case 'gem': { g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? -24 : 0; x < W; x += 48) { const gr = g.createLinearGradient(x, y, x + 48, y + 48); gr.addColorStop(0, c1); gr.addColorStop(0.5, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.moveTo(x + 24, y); g.lineTo(x + 48, y + 24); g.lineTo(x + 24, y + 48); g.lineTo(x, y + 24); g.fill(); } break; }
    case 'galaxy': { g.fillStyle = c0; g.fillRect(0, 0, W, H); for (let i = 0; i < 30; i++) { const gr = g.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 60 + r() * 120); gr.addColorStop(0, (r() < 0.5 ? c1 : c2) + '88'); gr.addColorStop(1, '#00000000'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${r()})`; g.fillRect(r() * W, r() * H, 2, 2); } break; }
    case 'divine': { g.fillStyle = lin([c0, c1, '#fff4c2', c1]); g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,60,0,0.55)'; g.lineWidth = 3; for (let y = 30; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? 10 : -10)); g.stroke(); } break; }
    default: g.fillStyle = c0; g.fillRect(0, 0, W, H);
  }
  // wear: scratches and dull patches, more on worn rods
  const n = Math.floor(wear * 260);
  for (let i = 0; i < n; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '30,20,10'},${0.1 + r() * 0.3})`; g.lineWidth = 0.5 + r() * 1.5; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 12); g.stroke(); }
  if (wear > 0.38) { for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(120,110,95,${(wear - 0.3) * 0.5})`; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 40, 8 + r() * 20, r(), 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(key, t); return t;
}

const corkTex = (() => { let t; return () => t ??= (() => { const c = canvas(64, 128), g = c.getContext('2d'); g.fillStyle = '#c49a6c'; g.fillRect(0, 0, 64, 128); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(80,50,20,${Math.random() * 0.4})`; g.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); } const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })(); })();

// Builds a rod: grip at the origin, pointing up +Y. userData.tip is the tip in local space.
export function buildRod(inst, { length = 2.3, auraWidth = 0.3, auraBoost = 1 } = {}) {
  const rod = rodById(inst.rodId); const fin = FINISHES[rod.finish];
  const grp = new THREE.Group();
  const tex = paintFinish(rod.finish, inst.pattern, inst.wear);
  const divine = fin.type === 'divine';
  const blankMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 + inst.wear * 0.5, metalness: divine ? 0.85 : fin.type === 'gem' || fin.type === 'pearl' ? 0.4 : 0.25, emissive: rod.aura ? new THREE.Color(rod.aura) : new THREE.Color(0), emissiveMap: rod.aura ? tex : null, emissiveIntensity: rod.aura ? 0.18 * rod.auraStrength * auraBoost : 0 });
  const blank = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.02, length, 16), blankMat); blank.position.y = length / 2; grp.add(blank);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.42, 16), new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 0.9 })); grip.position.y = -0.18; grp.add(grip);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.18, 16), new THREE.MeshStandardMaterial({ map: corkTex(), roughness: 1 })); cork.position.y = 0.12; grp.add(cork);
  const metal = divine ? 0xf2c14e : rod.grade >= 4 ? 0x9a9aa6 : 0xc9c9c9;
  const metalM = new THREE.MeshStandardMaterial({ color: metal, metalness: 0.9, roughness: 0.25 });
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 24), metalM); spool.rotation.z = Math.PI / 2; spool.position.set(0, 0, 0.05); grp.add(spool);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.008), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 })); handle.position.set(0.035, 0.03, 0.05); grp.add(handle); grp.userData.reelHandle = handle;
  for (let i = 1; i <= 6; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012 - i * 0.0012, 0.0018, 6, 16), metalM); ring.position.set(0, length * (i / 6.4), 0.02); grp.add(ring); }
  if (rod.aura) {
    const s = rod.auraStrength * auraBoost;
    const auraMat = new THREE.MeshBasicMaterial({ color: rod.aura, transparent: true, opacity: Math.min(0.3, 0.12 * s), blending: THREE.AdditiveBlending, depthWrite: false });
    for (let k = 1; k <= 3; k++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.006 + k * 0.012 * auraWidth, 0.02 + k * 0.018 * auraWidth, length * 1.02, 16, 1, true), auraMat); a.position.y = length / 2; grp.add(a); }
    const r = rng(inst.pattern + 3); const pp = [];
    for (let i = 0; i < 40 + 120 * Math.min(1, s); i++) { const y = r() * length; const rad = (0.03 + r() * 0.12) * auraWidth; const a = r() * 6.28; pp.push(Math.cos(a) * rad, y, Math.sin(a) * rad); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: rod.aura, size: 0.012, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); grp.add(pts); grp.userData.sparkles = pts;
  }
  grp.userData.tip = new THREE.Vector3(0, length, 0);
  return grp;
}
