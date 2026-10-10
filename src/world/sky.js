// Day/night sky: blue sky with drifting clouds by day, the galaxy and the moon by night.
import * as THREE from 'three';

const vert = `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix*vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`;
const frag = /* glsl */`
uniform vec3 uSun, uMoon, uZenith, uHorizon, uSunColor, uBand, uCloudC, uCloudS;
uniform float uDay, uCloud, uTime, uStorm, uNightI, uFog;
varying vec3 vDir;
float h3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.07; a*=0.5; } return s; }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
float fbm2(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
float stars(vec3 d, float scale, float thresh){
  vec3 p = d*scale; vec3 c = floor(p); float r = h3(c);
  if(r < thresh) return 0.0;
  vec3 sp = c + 0.5 + (vec3(h3(c+1.3),h3(c+2.7),h3(c+5.1))-0.5)*0.7;
  float b = (r - thresh)/(1.0 - thresh);
  return b*b * smoothstep(0.32, 0.0, length(p - sp)) * 3.0;
}
void main(){
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  // day sky with a warm band near the sun at sunrise and sunset
  vec3 col = mix(uHorizon, uZenith, pow(y, 0.55));
  float sd = max(dot(d, uSun), 0.0);
  col += uSunColor * (pow(sd, 8.0)*0.3 + pow(sd, 64.0)*0.6) * uDay;
  col += uSunColor * smoothstep(0.9994, 0.99975, sd) * 16.0 * smoothstep(-0.05, 0.05, uSun.y) * (1.0 - uCloud*0.8);
  // night: galaxy band, stars, moon
  float night = 1.0 - uDay;
  if (night > 0.01) {
    float bd = dot(d, uBand);
    float band = exp(-bd*bd*14.0), core = exp(-bd*bd*60.0);
    float neb = fbm3(d*3.2 + 4.0);
    float dust = smoothstep(0.42, 0.68, fbm3(d*7.0+11.0));
    vec3 milky = mix(vec3(0.2,0.24,0.55), vec3(0.85,0.55,0.75), neb) * band * (0.35 + 0.9*neb);
    milky += vec3(1.0,0.8,0.55) * core * neb * 0.9;
    milky *= 1.0 - dust*0.75*band;
    float s = stars(d, 180.0, 0.965) + stars(d, 420.0, 0.975)*(0.6+band*1.6) + stars(d, 900.0, 0.985)*(0.4+band*2.5);
    vec3 nightC = vec3(0.004,0.006,0.018) + milky*0.5 + s*mix(vec3(0.7,0.8,1.0), vec3(1.0,0.85,0.7), h3(floor(d*180.0)));
    float md = max(dot(d, uMoon), 0.0);
    nightC += vec3(1.0,0.97,0.9) * smoothstep(0.99955, 0.9998, md) * 6.0 + vec3(0.5,0.6,1.0) * pow(md, 200.0) * 0.6;
    col = mix(col, nightC * uNightI * (1.0 - uCloud*0.85), night * smoothstep(-0.02, 0.15, d.y + 0.1));
  }
  // clouds
  if (d.y > 0.0 && uCloud > 0.01) {
    vec2 uv = d.xz / (d.y + 0.08) * 1.2 + vec2(uTime*0.004, uTime*0.0015);
    float c = fbm2(uv*0.9 + vec2(3.0, 1.0));
    float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, c);
    float thick = fbm2(uv*1.8 + vec2(c*2.0));
    vec3 cc = mix(uCloudS, uCloudC, smoothstep(0.3, 0.75, thick + sd*0.3)) * mix(0.08, 1.0, uDay);
    cc = mix(cc, cc*0.45, uStorm);
    cc += uSunColor * pow(sd, 6.0) * 0.5 * uDay * (1.0 - cov*0.5);
    col = mix(col, cc, cov * smoothstep(0.0, 0.12, d.y) * 0.95);
  }
  col = mix(col, uHorizon, exp(-y*18.0)*0.6);
  col = mix(col, uHorizon, uFog);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor() {
    this.u = {
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, -1, 0) },
      uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() },
      uBand: { value: new THREE.Vector3(0.497, -0.828, -0.262).normalize() },
      uCloudC: { value: new THREE.Color(0xffffff) }, uCloudS: { value: new THREE.Color(0x9fb2c8) },
      uDay: { value: 1 }, uCloud: { value: 0.4 }, uTime: { value: 0 }, uStorm: { value: 0 }, uNightI: { value: 0.9 }, uFog: { value: 0 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -1;
  }
}

// Keys of the day: colors at sun elevations. Interpolated by elevation.
const KEYS = [
  { el: -0.35, zen: 0x02040c, hor: 0x0c1028, sun: 0x8090c0, li: 0.0 },
  { el: -0.08, zen: 0x0a1030, hor: 0x2a2440, sun: 0xff8a50, li: 0.05 },
  { el: 0.02, zen: 0x24346a, hor: 0xe8906a, sun: 0xff9a5a, li: 0.5 },
  { el: 0.15, zen: 0x2a5aa8, hor: 0xf0c49a, sun: 0xffd2a0, li: 1.6 },
  { el: 0.4, zen: 0x1f5fbf, hor: 0xc4ddef, sun: 0xfff0d8, li: 2.8 },
  { el: 1.0, zen: 0x1a55b8, hor: 0xbcd8ee, sun: 0xfff6e8, li: 3.0 },
];
const ca = new THREE.Color(), cb = new THREE.Color();
export function skyAt(el) {
  let i = 0; while (i < KEYS.length - 2 && el > KEYS[i + 1].el) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const t = Math.min(1, Math.max(0, (el - a.el) / (b.el - a.el)));
  const lerpC = (x, y) => ca.set(x).lerp(cb.set(y), t).clone();
  return { zen: lerpC(a.zen, b.zen), hor: lerpC(a.hor, b.hor), sun: lerpC(a.sun, b.sun), li: a.li + (b.li - a.li) * t };
}
