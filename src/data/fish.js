// About 2,000 fish: 20 per island plus 1,000 that live only in the open ocean.
// Generated from fixed seeds, so every player gets the same fish with the same names.
import { rng } from '../engine/util.js';
import { TIERS } from './rarity.js';
import { ISLANDS } from './islands.js';

const WORDS = [
  { // band 0: islands 1-10, real-sounding fish
    a: ['Spotted', 'Striped', 'Golden', 'Silver', 'Blue', 'Freckled', 'Lazy', 'Little', 'Bigmouth', 'Sand', 'Reef', 'Harbor', 'Dock', 'Mud', 'Yellowtail', 'Red', 'Speckled', 'Green', 'Bucktooth', 'Sleepy'],
    b: ['Perch', 'Carp', 'Snapper', 'Minnow', 'Bass', 'Sardine', 'Mackerel', 'Grouper', 'Trout', 'Flounder', 'Mullet', 'Goby', 'Herring', 'Bream', 'Pike', 'Catfish', 'Anchovy', 'Halibut', 'Wrasse', 'Sunfish'],
  },
  { // band 1: islands 11-35, a little fanciful
    a: ['Coral', 'Sunback', 'Glassfin', 'Tidewing', 'Pebble', 'Kelp', 'Saltjaw', 'Ripple', 'Copper', 'Moonscale', 'Breezy', 'Driftfin', 'Thornback', 'Lantern', 'Cinder', 'Pine', 'Amber', 'Otterkin', 'Fernfin', 'Cliffside'],
    b: ['Snapper', 'Darter', 'Grouper', 'Ray', 'Tang', 'Eel', 'Barracuda', 'Puffer', 'Marlin', 'Wahoo', 'Cod', 'Skate', 'Gar', 'Tarpon', 'Char', 'Pollock', 'Dory', 'Bonito', 'Lingcod', 'Smelt'],
  },
  { // band 2: islands 36-60, stormy fantasy
    a: ['Stormfin', 'Thunderjaw', 'Wraithscale', 'Galecrest', 'Ironfin', 'Abyssal', 'Gloomtide', 'Fogborn', 'Rimeback', 'Shardgill', 'Mistcoil', 'Bramblefin', 'Squall', 'Riptide', 'Hollowmaw', 'Wreckborn', 'Ravenfin', 'Spirebone', 'Breakwater', 'Sirensong'],
    b: ['Lurker', 'Leviathan', 'Serpent', 'Reaver', 'Skulker', 'Drifter', 'Maw', 'Coilfish', 'Strider', 'Wyrmling', 'Gulper', 'Thrasher', 'Shrike', 'Howler', 'Brute', 'Lancer', 'Ripper', 'Crusher', 'Wailer', 'Stalker'],
  },
  { // band 3: islands 61-90, eerie
    a: ['Hollow-eyed', 'Whispering', 'Glimmering', 'Pale', 'Weeping', 'Starving', 'Lantern-jawed', 'Ashen', 'Moonblind', 'Nameless', 'Velvet', 'Bone', 'Dreaming', 'Sorrow', 'Ghostlit', 'Silent', 'Grinning', 'Forgotten', 'Mourning', 'Faceless'],
    b: ['Gloamcarp', 'Duskling', 'Wraith', 'Moth-ray', 'Eyeless Eel', 'Murmur', 'Revenant', 'Shiverfin', 'Umbral Pike', 'Nightglass', 'Hush', 'Lament', 'Shade', 'Veilfish', 'Dirge', 'Wisp', 'Echo', 'Fathom', 'Grave Gar', 'Nocturne'],
  },
  { // band 4: islands 91-100, divine
    a: ['Aurelian', 'Celestine', 'Olympian', 'Ichor', 'Halo', 'Empyrean', 'Radiant', 'Gilded', 'Ambrosial', 'Seraph', "Titan's", 'Oracle', 'Hallowed', 'Sunforged', 'Aetherial', 'Laurel', 'Starborn', 'Choir', 'Immortal', 'Heavenlit'],
    b: ['Tidebearer', 'Choirfish', 'Leviathan', 'Sovereign', 'Herald', 'Lyrefin', 'Sunwhale', 'Tidemother', 'Crowned Eel', 'Laurelback', 'Seraphin', 'Oracle Ray', 'Dawnfin', 'Gloryfish', 'Aegis', 'Hymnscale', 'Halo Koi', 'Templefin', 'Starwhale', 'Godling'],
  },
];
const TRASH = [
  ['Soggy Boot', 'Tin Can', 'Seaweed Clump', 'Broken Oar', 'Rusty Hook', 'Old Tire', 'Waterlogged Hat', 'Driftwood Stick', 'Cracked Pot', 'Snapped Rod'],
  ['Barnacled Kettle', 'Lost Anchor Chain', 'Mossy Lantern', 'Torn Sail', 'Sunken Crate', 'Rotten Net', 'Bent Spoon', 'Rusty Key', 'Muddy Bucket', 'Broken Compass'],
  ['Shipwreck Plank', 'Ghost Net', 'Storm-bent Helm', 'Sailor Bones', 'Captain\'s Boot', 'Shattered Mast', 'Rusted Harpoon', 'Waterlogged Map', 'Smashed Barrel', 'Iron Shackle'],
  ['Cursed Lantern', 'Weeping Doll', 'Blank Portrait', 'Rotting Letter', 'Ashen Candle', 'Cracked Mirror', 'Silent Bell', 'Bone Comb', 'Grave Ribbon', 'Unlit Lamp'],
  ['Marble Shard', 'Broken Laurel', 'Tarnished Coin', 'Cracked Amphora', 'Chipped Column', 'Faded Mosaic', 'Bronze Fragment', 'Temple Dust', 'Torn Offering', 'Snapped Lyre String'],
];
const PLASTIC = ['Plastic Bag', 'Bottle Cap', 'Rubber Duck', 'Flip-flop', 'Six-pack Rings', 'Bottle with a Note', 'Sunglasses', 'Toy Boat', 'Straw', 'Beach Ball', 'Snorkel', 'Water Bottle', 'Lighter', 'Toy Shovel', 'Plastic Fork', 'Inflatable Ring', 'Bucket Lid', 'Phone Case', 'Plastic Crab', 'Swim Goggles'];
const SHAPES = ['round', 'long', 'eel', 'flat', 'spiky', 'round', 'long'];
const PALETTES = [
  ['#e8823a', '#f6c46a'], ['#3f7fbf', '#a6d3f0'], ['#6fae4f', '#d9e89a'], ['#c44d5a', '#f2a6a0'], ['#8a6fc9', '#d6c4f2'], ['#d9b43a', '#fff0a8'],
  ['#2f8f8a', '#9fe0d6'], ['#5a5f6a', '#c9ced6'], ['#c9663a', '#3a2a22'], ['#1f3f6f', '#6fa6e0'], ['#e85a9a', '#ffd0e6'], ['#4a4a4a', '#e8e8e8'],
];
// fish per tier on each island: 2 trash, 2 plastic, 3 kinda common, 3 common, 3 okay, 2 rare, 2 epic, 1 each above
const ISLAND_TIERS = [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 9];
const KG = [[0.2, 1.5], [0.05, 0.6], [0.3, 2], [0.5, 4], [1, 7], [2, 12], [4, 25], [8, 60], [20, 160], [50, 400], [120, 900], [600, 2400]];

export const FISH = [];
const byId = new Map();
const usedNames = new Set();

function uniqueName(make) {
  for (let i = 0; i < 40; i++) { const n = make(); if (!usedNames.has(n)) { usedNames.add(n); return n; } }
  let k = 2, base = make(); while (usedNames.has(`${base} ${roman(k)}`)) k++;
  const n = `${base} ${roman(k)}`; usedNames.add(n); return n;
}
function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] ?? String(n); }

function makeFish({ id, tier, band, home, r, ocean = false }) {
  const w = WORDS[band];
  const pick = arr => arr[Math.floor(r() * arr.length)];
  let name, shape;
  if (tier === 0) { name = uniqueName(() => pick(TRASH[band]) + (r() < 0.5 ? '' : ` (${pick(['soaked', 'slimy', 'tangled', 'chewed', 'ancient', 'crusty'])})`)); shape = 'trash'; }
  else if (tier === 1) { name = uniqueName(() => pick(['Faded', 'Sun-bleached', 'Chewed', 'Neon', 'Tiny', 'Giant', 'Crumpled', 'Lost', 'Squeaky', 'Sticky']) + ' ' + pick(PLASTIC)); shape = 'trash'; }
  else {
    const pre = ocean ? pick(['Deepwater ', 'Bluewater ', 'Open-sea ', 'Pelagic ', 'Trench ', 'Far-sea ', 'Current ', 'Wandering ', '', '']) : '';
    name = uniqueName(() => pre + pick(w.a) + ' ' + pick(w.b));
    shape = name.includes('Eel') || name.includes('Serpent') || name.includes('Coil') ? 'eel' : name.includes('Ray') || name.includes('Skate') || name.includes('Flounder') || name.includes('Halibut') ? 'flat' : pick(SHAPES);
  }
  const [k0, k1] = KG[tier];
  const bandMul = 1 + band * 0.45;
  const minKg = +(k0 * bandMul * (0.8 + r() * 0.4)).toFixed(2), maxKg = +(k1 * bandMul * (0.8 + r() * 0.4)).toFixed(2);
  const islandMul = Math.pow(1 + ((home ?? (band * 22 + 5)) - 1) * 0.11, 1.35);
  const fish = {
    id, name, tier, band, home, ocean, shape,
    colors: tier <= 1 ? ['#8a7f6a', '#c9c0a8'] : PALETTES[Math.floor(r() * PALETTES.length)],
    minKg, maxKg,
    value: Math.max(1, Math.round(TIERS[tier].value * islandMul * (0.85 + r() * 0.3))),
    // how it fights: which mini-games it likes and how often it jumps
    games: tier <= 1 ? ['tension'] : [['tension', 'zone'], ['zone', 'tug'], ['tension', 'tug'], ['tension', 'zone', 'tug']][Math.floor(r() * 4)],
    jump: tier <= 1 ? 0 : Math.min(0.85, 0.08 + tier * 0.07 + (shape === 'long' ? 0.1 : 0)),
    speed: 0.8 + r() * 0.4,
  };
  FISH.push(fish); byId.set(id, fish);
  return fish;
}

for (const isl of ISLANDS) {
  const r = rng(5000 + isl.n);
  ISLAND_TIERS.forEach((tier, k) => makeFish({ id: `i${isl.n}-${k}`, tier, band: isl.band, home: isl.n, r }));
}
// open ocean: 1,000 fish spread over five sea zones, including the truth-too-heavy tier
{
  const r = rng(77777);
  const oceanTiers = [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 9];
  for (let k = 0; k < 1000; k++) {
    const band = Math.floor(k / 200);
    const tier = k % 200 === 199 ? 10 : oceanTiers[k % 20];
    makeFish({ id: `o${band}-${k % 200}`, tier, band, home: null, r, ocean: true });
  }
}
// the god fish: only ever caught at island 100, and only with the god rod and god bait
makeFish({ id: 'god', tier: 11, band: 4, home: 100, r: rng(1) });
FISH.at(-1).name = 'The One Whose Name Was Erased';
FISH.at(-1).games = ['boss'];

export const fishById = id => byId.get(id);
export const fishOfIsland = n => FISH.filter(f => f.home === n && f.tier <= 10);
export const fishOfOcean = band => FISH.filter(f => f.ocean && f.band === band);

// Pick a fish of the rolled tier that lives here; fall back to lower tiers if none.
export function pickFish(islandN, tier, r = Math.random) {
  const pool = fishOfIsland(islandN);
  for (let t = tier; t >= 0; t--) {
    const c = pool.filter(f => f.tier === t);
    if (c.length) return c[Math.floor(r() * c.length)];
  }
  return pool[0];
}
export function rollWeight(f, r = Math.random) {
  const t = Math.pow(r(), 1.8); // big ones are rarer
  return +(f.minKg + (f.maxKg - f.minKg) * t).toFixed(2);
}
export function fishPrice(f, kg) {
  const sizeMul = 0.7 + 0.6 * ((kg - f.minKg) / Math.max(0.01, f.maxKg - f.minKg));
  return Math.max(1, Math.round(f.value * sizeMul));
}
