// Everything the player owns and has done. Saved to the browser automatically.
import { newRodInstance, rodById } from './data/rods.js';

const KEY = 'reel-of-the-gods.save.v1';
export function freshState() {
  const starter = newRodInstance(0, Math.random, { wear: 0.2, pattern: 1, locked: true, counter: false });
  return {
    version: 1, coins: 250, island: 1, visited: [1], hour: 9,
    rods: [starter], equippedRod: starter.uid,
    baits: { 0: 10 }, equippedBait: 0,
    fishBag: [], collection: {},
    stats: { casts: 0, catches: 0, lost: 0, gold: 0, biggest: null, upgrades: 0, cases: 0, earned: 0 },
    settings: { volume: 0.7, sensitivity: 1, quality: 'high' },
    tutorial: true,
  };
}
export let state = load();
export function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s.version === 1) return { ...freshState(), ...s }; } } catch (_) {}
  return freshState();
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
export function reset() { state = freshState(); save(); return state; }
export function setState(s) { state = s; }

export const equippedRod = () => state.rods.find(r => r.uid === state.equippedRod) ?? state.rods[0];
export const equippedRodDef = () => rodById(equippedRod().rodId);
export function addCoins(n) { state.coins = Math.max(0, Math.round(state.coins + n)); if (n > 0) state.stats.earned += n; }
export function addRod(inst) { state.rods.push(inst); return inst; }
export function removeRod(uid) {
  const inst = state.rods.find(r => r.uid === uid); if (!inst || inst.locked) return false;
  state.rods = state.rods.filter(r => r.uid !== uid);
  if (state.equippedRod === uid) state.equippedRod = state.rods[0].uid;
  return true;
}
export function addBait(id, n) { state.baits[id] = (state.baits[id] ?? 0) + n; if (state.baits[id] <= 0) { delete state.baits[id]; if (state.equippedBait === id) state.equippedBait = null; } }
export function recordCatch(fish, kg) {
  const c = state.collection[fish.id] ?? { count: 0, bestKg: 0 };
  const isNew = c.count === 0, isRecord = kg > c.bestKg;
  c.count++; if (isRecord) c.bestKg = kg; state.collection[fish.id] = c;
  state.stats.catches++;
  if (!state.stats.biggest || kg > state.stats.biggest.kg) state.stats.biggest = { id: fish.id, kg };
  return { isNew, isRecord: isRecord && !isNew };
}
