// Merge static scenery into a few big meshes (one per look), so villages with thousands of parts stay fast.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// material color is baked into vertex colors, so only texture, emissive and surface settings split meshes apart
const sigOf = (m) => [
  m.type, m.type === 'MeshBasicMaterial' ? m.color?.getHexString() : '', m.map?.source?.uuid ?? '', m.emissive?.getHexString() ?? '', (m.emissiveIntensity ?? 0).toFixed(2),
  (Math.round((m.roughness ?? 0) * 10) / 10).toFixed(1), (Math.round((m.metalness ?? 0) * 10) / 10).toFixed(1), m.side, m.alphaTest, m.flatShading, m.transparent, m.opacity,
].join('|');

export function bakeStatic(root, { keep = () => false } = {}) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const toRemove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic || keep(p)) return;
    if (Array.isArray(o.material)) return;
    const m = o.material;
    if (m.transparent || m.type === 'ShaderMaterial' || m.type === 'MeshBasicMaterial' && m.blending !== THREE.NormalBlending) return;
    const sig = sigOf(m);
    let g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    if (m.map) {
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      // bake the texture's repeat/offset/rotation into the UVs so differently tiled copies can share a material
      m.map.updateMatrix(); const mat = m.map.matrix; const uv = g.attributes.uv; const v = new THREE.Vector2();
      for (let i = 0; i < n; i++) { v.set(uv.getX(i), uv.getY(i)).applyMatrix3(mat); uv.setXY(i, v.x, v.y); }
    }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!m.map && g.attributes.uv) g.deleteAttribute('uv');
    // vertex color = existing vertex color (if used) x material color
    const col = new Float32Array(n * 3); const mc = m.type === 'MeshBasicMaterial' ? new THREE.Color(1, 1, 1) : m.color ?? new THREE.Color(1, 1, 1);
    const had = m.vertexColors && g.attributes.color ? g.attributes.color : null;
    for (let i = 0; i < n; i++) { const r = had ? had.getX(i) : 1, gg = had ? had.getY(i) : 1, bb = had ? had.getZ(i) : 1; col[i * 3] = r * mc.r; col[i * 3 + 1] = gg * mc.g; col[i * 3 + 2] = bb * mc.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    let b = buckets.get(sig);
    if (!b) { b = { mat: m, geos: [], cast: false, receive: false }; buckets.set(sig, b); }
    b.geos.push(g); b.cast ||= o.castShadow; b.receive ||= o.receiveShadow;
    toRemove.push(o);
  });
  for (const o of toRemove) o.parent.remove(o);
  const out = new THREE.Group(); out.name = 'baked';
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false); if (!merged) continue;
    merged.computeBoundingSphere();
    const mat = b.mat.clone(); mat.vertexColors = b.mat.type !== 'MeshBasicMaterial'; if (mat.vertexColors) mat.color = new THREE.Color(1, 1, 1);
    if (mat.map) { const t = mat.map.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.offset.set(0, 0); t.rotation = 0; t.needsUpdate = true; mat.map = t; }
    const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
    out.add(mesh);
  }
  root.add(out);
  return { buckets: buckets.size, removed: toRemove.length };
}
