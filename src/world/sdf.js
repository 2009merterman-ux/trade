// Signed-distance sculpting: build one smooth mesh from blended shapes (surface nets).
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
export function smax(a, b, k) { return -smin(-a, -b, k); }
export const sphere = (c, r) => (x, y, z) => Math.hypot(x - c.x, y - c.y, z - c.z) - r;
export const ellipsoid = (c, r) => (x, y, z) => { const px = (x - c.x) / r.x, py = (y - c.y) / r.y, pz = (z - c.z) / r.z; const k0 = Math.hypot(px, py, pz); const k1 = Math.hypot(px / r.x, py / r.y, pz / r.z); return k1 === 0 ? -Math.min(r.x, r.y, r.z) : k0 * (k0 - 1) / k1; };
export const capsule = (a, b, ra, rb = ra) => (x, y, z) => {
  const pax = x - a.x, pay = y - a.y, paz = z - a.z, bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
};
export const roundBox = (c, b, r) => (x, y, z) => { const qx = Math.abs(x - c.x) - b.x + r, qy = Math.abs(y - c.y) - b.y + r, qz = Math.abs(z - c.z) - b.z + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r; };
export const torusY = (c, R, r) => (x, y, z) => { const q = Math.hypot(x - c.x, z - c.z) - R; return Math.hypot(q, y - c.y) - r; };
export const cylY = (c, r, h, round = 0) => (x, y, z) => { const dx = Math.hypot(x - c.x, z - c.z) - r + round, dy = Math.abs(y - c.y) - h + round; return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - round; };
// rotate a point field: returns sdf evaluated in a rotated frame around pivot
export const rotated = (f, pivot, euler) => { const m = new THREE.Matrix4().makeRotationFromEuler(euler).invert(); const v = new THREE.Vector3(); return (x, y, z) => { v.set(x - pivot.x, y - pivot.y, z - pivot.z).applyMatrix4(m); return f(v.x + pivot.x, v.y + pivot.y, v.z + pivot.z); }; };

function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
}

// parts: [{ f, k, color: Color | (x,y,z)=>Color, sub? }] combined left to right with smooth union (or smooth subtraction)
export function sculpt(parts, { min, max, step, material, smoothIters = 1 }) {
  const field = (x, y, z) => { let d = 1e9; for (const p of parts) { const v = p.f(x, y, z); d = p.sub ? smax(d, -v, p.k ?? 0) : smin(d, v, p.k ?? 0); } return d; };
  const colorAt = (x, y, z, out) => {
    let best = 1e9, bc = null, w = 0; out.setRGB(0, 0, 0);
    const tmp = new THREE.Color();
    for (const p of parts) { if (p.sub) continue; const v = p.f(x, y, z); const c = typeof p.color === 'function' ? p.color(x, y, z) : p.color; const wi = Math.exp(-Math.max(v, 0) * (p.sharp ?? 60)) * (v < best + 0.03 ? 1 : 0.0); if (wi > 0) { tmp.copy(c); out.r += tmp.r * wi; out.g += tmp.g * wi; out.b += tmp.b * wi; w += wi; } if (v < best) { best = v; bc = c; } }
    if (w > 0) { out.r /= w; out.g /= w; out.b /= w; } else out.copy(typeof bc === 'function' ? bc(x, y, z) : bc);
    return out;
  };
  const nx = Math.ceil((max.x - min.x) / step) + 1, ny = Math.ceil((max.y - min.y) / step) + 1, nz = Math.ceil((max.z - min.z) / step) + 1;
  const vals = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[id(i, j, k)] = field(min.x + i * step, min.y + j * step, min.z + k * step);
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { cv[c] = vals[id(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; if (cv[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) { const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue; const t = va / (va - vb); sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t; sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t; sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t; n++; }
    cellV[id(i, j, k)] = pos.length / 3;
    pos.push(min.x + (i + sx / n) * step, min.y + (j + sy / n) * step, min.z + (k + sz / n) * step);
  }
  const idx = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = vals[id(i, j, k)];
    // x edge
    { const v1 = vals[id(i + 1, j, k)]; if ((v0 < 0) !== (v1 < 0)) { const a = cellV[id(i, j - 1, k - 1)], b = cellV[id(i, j, k - 1)], c = cellV[id(i, j, k)], d = cellV[id(i, j - 1, k)]; if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (v0 < 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); } } }
    { const v1 = vals[id(i, j + 1, k)]; if ((v0 < 0) !== (v1 < 0)) { const a = cellV[id(i - 1, j, k - 1)], b = cellV[id(i - 1, j, k)], c = cellV[id(i, j, k)], d = cellV[id(i, j, k - 1)]; if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (v0 < 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); } } }
    { const v1 = vals[id(i, j, k + 1)]; if ((v0 < 0) !== (v1 < 0)) { const a = cellV[id(i - 1, j - 1, k)], b = cellV[id(i, j - 1, k)], c = cellV[id(i, j, k)], d = cellV[id(i - 1, j, k)]; if (a >= 0 && b >= 0 && c >= 0 && d >= 0) { if (v0 < 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); } } }
  }
  // light smoothing of vertex positions toward the surface (project using gradient)
  const e = step * 0.5;
  for (let it = 0; it < smoothIters; it++) for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2]; const d = field(x, y, z);
    const gx = field(x + e, y, z) - field(x - e, y, z), gy = field(x, y + e, z) - field(x, y - e, z), gz = field(x, y, z + e) - field(x, y, z - e); const gl = Math.hypot(gx, gy, gz) || 1;
    pos[v] -= d * gx / gl; pos[v + 1] -= d * gy / gl; pos[v + 2] -= d * gz / gl;
  }
  const nor = [], col = []; const c = new THREE.Color();
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    const gx = field(x + e, y, z) - field(x - e, y, z), gy = field(x, y + e, z) - field(x, y - e, z), gz = field(x, y, z + e) - field(x, y, z - e); const gl = Math.hypot(gx, gy, gz) || 1;
    nor.push(gx / gl, gy / gl, gz / gl);
    colorAt(x, y, z, c); col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material ?? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
