// The 12 rarity tiers. Odds are base chances per cast, in percent.
export const TIERS = [
  { name: 'Trash', odds: 25, color: '#8a8f98', diff: 0.05, value: 2 },
  { name: 'Plastic', odds: 20, color: '#9fc3dd', diff: 0.08, value: 3 },
  { name: 'Kinda common', odds: 18, color: '#9fd39b', diff: 0.14, value: 8 },
  { name: 'Common', odds: 15, color: '#5fbf6a', diff: 0.2, value: 14 },
  { name: 'Okay!', odds: 10, color: '#4fb3d9', diff: 0.3, value: 28 },
  { name: 'Rare', odds: 7, color: '#3a7bff', diff: 0.4, value: 60 },
  { name: 'EPIC', odds: 3.5, color: '#a64dff', diff: 0.52, value: 160 },
  { name: 'WOWW!!!', odds: 1, color: '#ff4fd8', diff: 0.63, value: 520 },
  { name: 'MYTHIC !!!!!', odds: 0.4, color: '#ff4d4d', diff: 0.74, value: 1900 },
  { name: 'Touched by the gods', odds: 0.09, color: '#ffd23f', diff: 0.84, value: 9000 },
  { name: 'A truth too heavy for ordinary speech', short: 'A truth too heavy', odds: 0.01, color: '#fff1c1', diff: 0.93, value: 70000 },
  { name: 'Forged in bronze, blood, and the gaze of the immortals', short: 'Forged in bronze', odds: 1e-31, color: '#ff7a2a', diff: 1, value: 1e9 },
];
export const tierShort = t => TIERS[t].short ?? TIERS[t].name;

// Weighted roll. Luck above 1 shifts weight from junk toward the rare end.
export function rollTier(luck = 1, rand = Math.random, maxTier = 10) {
  const w = TIERS.map((t, i) => {
    if (i > maxTier) return 0;
    if (i <= 1) return t.odds / Math.pow(luck, 0.8);
    if (i <= 3) return t.odds;
    return t.odds * Math.pow(luck, (i - 3) * 0.45);
  });
  const total = w.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}

// Chances after luck, for showing the player (percent per tier).
export function tierChances(luck = 1, maxTier = 10) {
  const w = TIERS.map((t, i) => (i > maxTier ? 0 : i <= 1 ? t.odds / Math.pow(luck, 0.8) : i <= 3 ? t.odds : t.odds * Math.pow(luck, (i - 3) * 0.45)));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map(x => (x / total) * 100);
}
