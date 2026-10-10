// 100 baits: 10 critters x 10 qualities. Better bait means more luck; some baits favor certain fish.
export const QUALITIES = [
  { name: 'Plain', luck: 1.0, color: '#b9a68a' },
  { name: 'Juicy', luck: 1.06, color: '#d98a6a' },
  { name: 'Glowing', luck: 1.12, color: '#9aff9a' },
  { name: 'Stormy', luck: 1.2, color: '#8fb8e0' },
  { name: 'Golden', luck: 1.3, color: '#ffd23f' },
  { name: 'Abyssal', luck: 1.42, color: '#3a5aff' },
  { name: 'Spectral', luck: 1.56, color: '#cfe8ff' },
  { name: 'Moonlit', luck: 1.72, color: '#d6c4ff' },
  { name: 'Starlit', luck: 1.9, color: '#fff4c2' },
  { name: 'Divine', luck: 2.1, color: '#ffe08a' },
];
const CRITTERS = [
  { name: 'Worm', likes: ['round', 'flat'] },
  { name: 'Cricket', likes: ['long'] },
  { name: 'Shrimp', likes: ['round', 'spiky'] },
  { name: 'Squid', likes: ['eel', 'long'] },
  { name: 'Minnow', likes: ['long', 'spiky'] },
  { name: 'Grub', likes: ['flat'] },
  { name: 'Fly', likes: ['round'] },
  { name: 'Krill', likes: ['flat', 'round'] },
  { name: 'Leech', likes: ['eel'] },
  { name: 'Crab', likes: ['spiky', 'flat'] },
];
export const BAITS = [];
for (let q = 0; q < QUALITIES.length; q++) for (let c = 0; c < CRITTERS.length; c++) {
  BAITS.push({
    id: q * 10 + c, name: `${QUALITIES[q].name} ${CRITTERS[c].name}`, q, critter: c,
    luck: QUALITIES[q].luck, likes: CRITTERS[c].likes, color: QUALITIES[q].color,
    pack: 10, price: Math.round(12 * Math.pow(1.9, q) * (1 + c * 0.04) / 5) * 5 || 5,
  });
}
export const baitById = id => BAITS[id];
// bait value per single piece, used by the upgrader
export const baitUnitValue = id => Math.max(1, Math.round(BAITS[id].price / BAITS[id].pack));
export function shopBaits(level) {
  const q = Math.min(9, Math.floor(level / 4));
  const out = [];
  for (let qq = Math.max(0, q - 1); qq <= Math.min(9, q + 1); qq++) for (const c of [0, 2, 3, 4]) out.push(qq * 10 + c);
  return out;
}
