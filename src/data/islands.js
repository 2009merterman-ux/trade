// All 100 islands. Each one belongs to a band that sets its look, its fish names and its danger.
import { rng } from '../engine/util.js';

export const BANDS = [
  { id: 0, from: 1, to: 10, name: 'Sunny shallows', danger: 'None' },
  { id: 1, from: 11, to: 35, name: 'Wide waters', danger: 'Light' },
  { id: 2, from: 36, to: 60, name: 'Storm belt', danger: 'Storms, megasharks, giant squid' },
  { id: 3, from: 61, to: 90, name: 'The strange sea', danger: 'Kraken, leviathan, whirlpools' },
  { id: 4, from: 91, to: 100, name: 'Islands of the gods', danger: 'Mythic monsters' },
];
export const bandOf = n => BANDS.find(b => n >= b.from && n <= b.to);

const named = {
  1: 'Driftwood Cove', 2: 'Pebble Bay', 3: 'Gull Rock', 4: 'Sandy Hollow', 5: 'Lanternfish Key', 6: 'Mussel Point', 7: 'Breezy Atoll', 8: 'Tidepool Isle', 9: 'Coconut Reach', 10: 'Old Harbor',
  20: 'Pinecrest Isle', 35: 'Last Light Key', 50: "Siren's Reach", 63: 'Hollowmere', 80: 'Ashen Quay', 99: 'The Final Shore', 100: 'THE Island',
};
const parts = [
  [['Coral', 'Shell', 'Palm', 'Sun', 'Gull', 'Pearl', 'Kelp', 'Driftwood', 'Sandy', 'Mango'], ['Bay', 'Cove', 'Key', 'Isle', 'Point', 'Atoll', 'Reef', 'Harbor', 'Beach', 'Lagoon']],
  [['Pine', 'Copper', 'Whale', 'Cedar', 'Otter', 'Salt', 'Amber', 'Heron', 'Cliff', 'Fern'], ['Isle', 'Crest', 'Rock', 'Haven', 'Sound', 'Point', 'Ridge', 'Landing', 'Shoals', 'Hollow']],
  [['Grey', 'Storm', 'Raven', 'Thunder', 'Iron', 'Gale', 'Fog', 'Wreck', 'Black', 'Squall'], ['hallow', 'watch', 'spire', 'reach', 'breaker', 'moor', 'fang', 'gate', 'rock', 'maw']],
  [['Ashen', 'Hollow', 'Pale', 'Whisper', 'Gloam', 'Moon', 'Bone', 'Silent', 'Velvet', 'Ghost'], [' Quay', 'mere', ' Fen', ' Marsh', ' Reach', 'wood', ' Shallows', ' Rest', ' Deep', ' Vale']],
  [['Aurelian', 'Halo', 'Ichor', 'Laurel', 'Oracle', 'Aether', 'Gilded', 'Seraph', 'Olympian', 'Titan'], [' Terrace', ' Sanctum', ' Steps', ' Gardens', ' Heights', ' Spire', ' Colonnade', ' Shrine', ' Crown', ' Gate']],
];

export const ISLANDS = [];
{
  const r = rng(1009); const used = new Set(Object.values(named));
  for (let n = 1; n <= 100; n++) {
    const band = bandOf(n);
    let name = named[n];
    while (!name) {
      const [a, b] = parts[band.id];
      const cand = a[Math.floor(r() * a.length)] + (band.id === 2 ? '' : band.id === 3 || band.id === 4 ? '' : ' ') + b[Math.floor(r() * b.length)];
      const fixed = band.id === 2 ? cand.charAt(0).toUpperCase() + cand.slice(1) : cand;
      if (!used.has(fixed)) { used.add(fixed); name = fixed; }
    }
    // the theme decides which scene builder is used for the island
    const theme = n === 100 ? 'gods' : n === 63 || (n >= 61 && n <= 90 && n % 2 === 0) ? 'abandoned' : band.id === 0 ? 'tropical' : band.id === 1 ? 'pine' : band.id === 2 ? 'storm' : band.id === 3 ? 'eerie' : 'marble';
    ISLANDS.push({ n, name, band: band.id, theme, level: Math.floor((n - 1) / 2.6) });
  }
}
// Phase 1: these islands can be visited from the travel menu as previews.
export const PREVIEW_ISLANDS = [1, 20, 50, 80, 100];
