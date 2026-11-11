# Reel of the Gods

A first-person 3D fishing game across 100 islands. This is **Phase 1**: one full island to fish, plus preview trips to islands 20, 50, 80 and 100.

The full design is in the design doc: https://claude.ai/code/artifact/0d52dee6-4038-484c-896a-1efda2af6067

## Play

- **In the browser:** https://claude.ai/artifact/AHtRvEqjugAbPyGUpcYxWZ (private to the owner until shared).
- **Offline:** download `dist/index.html` and double-click it. The whole game is one file and needs no internet or server. (`npm run build` regenerates it after code changes.)
- **From source:**
  ```bash
  npm install
  npm run dev      # opens a local server with live reload
  npm run build    # writes the single-file game to dist/index.html
  ```

Use a desktop browser (Chrome, Edge or Firefox) on a computer with a graphics card. The game saves to your browser automatically every 10 seconds.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look around (click the game first to capture the mouse) |
| W A S D | Walk · Shift to run |
| Hold LMB, let go | Charge a cast and release inside a zone on the cast circle |
| LMB / Space | Reel in during a fight |
| A / D | Pull left or right (tug-of-war fights) |
| LMB / Space on the ring | Time a jumping fish |
| E | Talk / shop / upgrader (when near someone) |
| Tab | Bag (rods, bait, fish, stats) |
| C | Fish collection |
| T | Travel (preview islands) |
| Esc | Give up a fight · close a menu · pause |

## What's in Phase 1

- **Islands:** Driftwood Cove (1) is fully playable, with a village, dock, market, upgrader and villagers. Preview trips go to Pinecrest Isle (20), Siren's Reach (50), Ashen Quay (80, abandoned) and THE Island (100, the temple and the faceless statue, with echoes).
- **World:** a 20-minute day/night cycle, a galaxy sky at night, a weather forecast (sunny, cloudy, rain, fog, storm), waves and lightning.
- **Casting:** the cast circle. 6 o'clock is 0%, the zones move every cast, gold is 0.5% and epic is 10%.
- **Fights:** tension, zone and tug-of-war mini-games, plus jumping-fish timing. Rarer fish are harder.
- **Fish:** all 3,001 fish across 12 rarity tiers, with catch cards, a collection with silhouettes, and weight records.
- **Rods:** 1,000 rods (40 models × 25 finishes) with wear, pattern number, catch counter and auras. There's a showroom for all of them.
- **Bait:** 100 kinds.
- **Economy:**
  - shop: rods, bait, cases, selling fish
  - case opening with the published odds
  - upgrader: rods and bait only; chance = value ÷ target × 0.95, capped at 95%
- **Sound:** sound effects only, no music.

## Characters: adding a Sketchfab model

The villagers are stand-ins until the real models are in. To use a model:

1. Download it from Sketchfab as **glTF (.glb)**. Check that its license allows use in a game.
2. Put the file in `src/assets/characters/`, e.g. `src/assets/characters/fisherman.glb`.
3. Register it in `src/characters/index.js`:
   ```js
   import fisherman from '../assets/characters/fisherman.glb?url';
   MODELS.elder = fisherman;
   ```
   Roles: `elder`, `market`, `upgrader`, `sailor`, `kid`, `cook`, `captain`.
4. `npm run build`. The model is scaled to about 1.9 m and plays its first animation if it has one.

## Project layout

```
src/
  main.js            game loop, island loading, keys
  state.js           save data (localStorage)
  engine/            renderer, input, sound effects, static batching
  world/             islands and villages, sky, water, weather
  player/            first-person controller, rod visuals and skins
  fishing/           casting, fights, mini-games, fish meshes and icons
  data/              rarity tiers, fish, rods, baits, islands (all generated from seeds)
  characters/        NPC stand-ins and the model registry
  ui/                HUD, menus, catch card, case opening, upgrader
```

## Also in this repo: Rare Air

`leftfield/` is a separate, self-contained trivia game (no build step). Each flight is seven Krillion-style "Name ..." prompts ("Name a bird that can't fly", "Name a country with no coastline", "Name a word with a silent letter") with 25 seconds each. Every real answer fires a rocket's engine: Common +10 km, Uncommon +25, Rare +50, Epic +75, Legendary +100. An answer that is on none of the lists is sent to Claude to judge, and if it is a real answer it scores One in a Krillion: +150 km. The rocket climbs past real landmarks (Everest, the Kármán line at 100 km, the ISS, Hubble). Typos are corrected to the closest listed answer. After every answer the game shows that prompt's One in a Krillion (an obscure real answer Claude picks) with one sentence on what it is. Prompts come from a saved deck and don't repeat until all 93 have been played.

- Play: the published artifact, where the Claude judge works. Opened as a local file, `leftfield/index.html` still plays, but answers that aren't on a list count as misses.
- `leftfield/prompts.js` holds the prompts (each one's own lists plus categories pulled from `leftfield/data.js`), and `leftfield/match.js` is the typo-tolerant matcher.
