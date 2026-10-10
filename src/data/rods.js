// 1,000 rods: 40 models x 25 finishes. Each copy you own also has its own wear and pattern.
import { rng } from '../engine/util.js';

export const GRADES = [
  { name: 'Common', color: '#a9b1bb' },
  { name: 'Uncommon', color: '#5fbf6a' },
  { name: 'Rare', color: '#3a7bff' },
  { name: 'Epic', color: '#a64dff' },
  { name: 'Mythic', color: '#ff4d4d' },
  { name: 'Divine', color: '#ffd23f' },
];
const MODELS = [
  'Driftwood Classic', 'Dockhand', 'Pebble Popper', 'Gull Catcher', 'Harbor Hand', 'Reedwhip', 'Sandpiper', 'Bamboo Breeze', 'Shellback', 'Tidepool Twig',
  'Gale Runner', 'Copperline', 'Pine Spire', 'Otter\'s Paw', 'Saltcaster', 'Heron Reach', 'Amberline', 'Whalebone', 'Cliffhanger', 'Fernwhip',
  'Tidebreaker', 'Stormcaller', 'Ironreel', 'Riptide', 'Wreckseeker', 'Squallbreaker', 'Ravenline', 'Thunderthread',
  'Kraken\'s Spine', 'Siren\'s Lure', 'Gloamcaster', 'Moonblind', 'Bonehook', 'Leviathan\'s Rib',
  'Ashen Oath', 'Hollow Crown', 'Abyss Warden', 'Nightglass',
  'Laurel of Dawn', 'Aurelian Scepter',
];
// finish: how the rod looks. type picks the texture painter; aura is the glow color (if any)
export const FINISHES = [
  { name: 'Bare Wood', type: 'wood', c: ['#9a7650'], mult: 1 },
  { name: 'Sea Green', type: 'solid', c: ['#3f8f6a'], mult: 1.05 },
  { name: 'Harbor Red', type: 'solid', c: ['#b8402e'], mult: 1.05 },
  { name: 'Navy Stripe', type: 'stripe', c: ['#1f3a6a', '#e8e0cc'], mult: 1.1 },
  { name: 'Sand Camo', type: 'camo', c: ['#c9b48a', '#8a7a5a', '#6a5a40'], mult: 1.1 },
  { name: 'Sunset Fade', type: 'fade', c: ['#ffd23f', '#ff5e8a', '#6a3cff'], mult: 1.3, aura: '#ff7ab6' },
  { name: 'Ocean Fade', type: 'fade', c: ['#7af0ff', '#2f7fd0', '#0f2a6a'], mult: 1.3, aura: '#5ad6ff' },
  { name: 'Carbon Storm', type: 'carbon', c: ['#1a1c20', '#8fd3ff'], mult: 1.35, aura: '#8fd3ff' },
  { name: 'Abyss Marble', type: 'marble', c: ['#0b1e3a', '#5ad6ff'], mult: 1.45, aura: '#7a9cff' },
  { name: 'Rose Marble', type: 'marble', c: ['#3a0b22', '#ff8fc0'], mult: 1.45, aura: '#ff8fc0' },
  { name: 'Ember Damascus', type: 'damascus', c: ['#3c140a', '#ff7a2a'], mult: 1.6, aura: '#ff5a2a' },
  { name: 'Frost Damascus', type: 'damascus', c: ['#0a1e3c', '#bfe8ff'], mult: 1.6, aura: '#bfe8ff' },
  { name: 'Toxic Drip', type: 'drip', c: ['#1a2a12', '#9aff3a'], mult: 1.5, aura: '#9aff3a' },
  { name: 'Coral Reef', type: 'spots', c: ['#ff8a6a', '#ffd0a0', '#3fb8b0'], mult: 1.4 },
  { name: 'Tiger Tooth', type: 'stripe', c: ['#f2a530', '#2a1a0a'], mult: 1.55, aura: '#ffb44a' },
  { name: 'Mother of Pearl', type: 'pearl', c: ['#f4f0ff', '#c9b0ff', '#a0f0e0'], mult: 1.7, aura: '#e6d6ff' },
  { name: 'Lava Crack', type: 'crack', c: ['#1a0a08', '#ff4a1a'], mult: 1.75, aura: '#ff3a1a' },
  { name: 'Glacier Crack', type: 'crack', c: ['#0a1a2a', '#7ae0ff'], mult: 1.75, aura: '#7ae0ff' },
  { name: 'Emerald Gem', type: 'gem', c: ['#0a3a22', '#3aff9a'], mult: 1.9, aura: '#3aff9a' },
  { name: 'Sapphire Gem', type: 'gem', c: ['#0a1a4a', '#4a8aff'], mult: 1.9, aura: '#4a8aff' },
  { name: 'Ruby Gem', type: 'gem', c: ['#4a0a12', '#ff3a5a'], mult: 1.95, aura: '#ff3a5a' },
  { name: 'Nebula', type: 'galaxy', c: ['#0a0418', '#a64dff', '#ff7ab6'], mult: 2.2, aura: '#b07aff' },
  { name: 'Aurora', type: 'fade', c: ['#3affb0', '#3a8aff', '#c94aff'], mult: 2.3, aura: '#6affd0' },
  { name: 'Black Gold', type: 'divine', c: ['#14100a', '#d8a93a'], mult: 2.6, aura: '#d8a93a' },
  { name: 'Olympian Gold', type: 'divine', c: ['#7a4a0c', '#fff4c2'], mult: 3, aura: '#ffd34a' },
];

export const RODS = [];
for (let m = 0; m < MODELS.length; m++) {
  const grade = m < 10 ? 0 : m < 20 ? 1 : m < 28 ? 2 : m < 34 ? 3 : m < 38 ? 4 : 5;
  for (let f = 0; f < FINISHES.length; f++) {
    const fin = FINISHES[f];
    RODS.push({
      id: m * 100 + f, model: m, finish: f, grade,
      name: `${MODELS[m]} | ${fin.name}`,
      price: Math.round(60 * Math.pow(1.3, m) * fin.mult / 5) * 5,
      power: +(1 + m * 0.32).toFixed(2), // handles harder fights
      luck: +(1 + m * 0.045 + (fin.mult - 1) * 0.08).toFixed(3),
      cast: Math.round(18 + m * 1.6),
      aura: fin.aura && (grade >= 2 || fin.mult >= 1.3) ? fin.aura : null,
      auraStrength: Math.min(1.4, 0.2 + grade * 0.2 + (fin.mult - 1) * 0.3),
    });
  }
}
export const rodById = id => RODS.find(r => r.id === id);

export const WEAR = [
  { name: 'Fresh', max: 0.07, mult: 1 },
  { name: 'Minimal wear', max: 0.15, mult: 0.9 },
  { name: 'Field-worn', max: 0.38, mult: 0.78 },
  { name: 'Well-worn', max: 0.45, mult: 0.68 },
  { name: 'Destroyed', max: 1, mult: 0.55 },
];
export const wearOf = w => WEAR.find(x => w <= x.max);

let uidCounter = Date.now() % 100000;
export function newRodInstance(rodId, r = Math.random, opts = {}) {
  return { uid: `r${uidCounter++}${Math.floor(r() * 1e6)}`, rodId, wear: opts.wear ?? +Math.pow(r(), 1.6).toFixed(4), pattern: opts.pattern ?? Math.floor(r() * 1000), catches: 0, counter: opts.counter ?? r() < 0.1, locked: !!opts.locked };
}
export function rodValue(inst) {
  const rod = rodById(inst.rodId); const w = wearOf(inst.wear);
  return Math.max(1, Math.round(rod.price * w.mult * (inst.counter ? 1.15 : 1)));
}
// chance a worn rod snaps on a hard pull: grows with wear and with how far above its power the fish is
export function snapRisk(inst, fishTier) {
  const rod = rodById(inst.rodId);
  const over = Math.max(0, fishTier * 0.9 - rod.power);
  return Math.min(0.9, inst.wear * 0.25 + over * 0.12);
}

// Shop stock for an island: rods near the island's level, priced high.
export function shopRods(level, seed) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < 8; i++) {
    const m = Math.max(0, Math.min(MODELS.length - 1, level + Math.floor(r() * 4) - 1));
    const f = Math.floor(Math.pow(r(), 1.5) * FINISHES.length);
    out.push(m * 100 + f);
  }
  return [...new Set(out)].sort((a, b) => rodById(a).price - rodById(b).price);
}

// Cases: weighted by grade, limited to models around the island's level.
export const CASE_ODDS = [55, 25, 12, 5.5, 2.2, 0.3];
export function caseContents(level, wide) {
  const lo = Math.max(0, level - (wide ? 6 : 2)), hi = Math.min(MODELS.length - 1, level + (wide ? 10 : 4));
  return RODS.filter(r => r.model >= lo && r.model <= hi);
}
export function caseInfo(level, wide) {
  const items = caseContents(level, wide);
  const grades = [...new Set(items.map(r => r.grade))].sort();
  // a rod's grade odds are split evenly between the rods of that grade in the case
  const wsum = grades.reduce((a, g) => a + CASE_ODDS[g], 0);
  const odds = items.map(r => ({ rod: r, p: CASE_ODDS[r.grade] / wsum / items.filter(x => x.grade === r.grade).length }));
  const ev = odds.reduce((a, o) => a + o.p * o.rod.price * 0.8, 0);
  return { name: wide ? 'Gamble Case' : 'Island Case', price: Math.round(ev * 1.12 / 5) * 5, odds, grades: grades.map(g => ({ g, p: CASE_ODDS[g] / wsum })) };
}
export function openCase(info, r = Math.random) {
  let x = r();
  for (const o of info.odds) { x -= o.p; if (x <= 0) return o.rod; }
  return info.odds.at(-1).rod;
}
