# Lumi's Starlight Quest

A colorful, kid-friendly 2D platformer built with Phaser 3 + TypeScript + Vite. All art is drawn procedurally in code, so the project has no image assets.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Dev URL flags: `?level=1` skips the title screen, `?heroes` opens hero select, `?debug` shows physics bodies.

**Controls:** ← → / A D to move · Space / ↑ / W / Z to jump · jump again in mid-air to double-jump · hold jump for higher jumps and bigger bounces off enemies · Esc / P to pause.

## Concept

Wish Stars have fallen across the Glimmerwood. Pick a hero and hop through each world to bring them home through the rainbow Wish Portals.

**Heroes** (cartoon puppets with squash/stretch, floppy ears, swishing tails and expressions):

| Hero | Unlock | Perk |
|---|---|---|
| Lumi, Star Sprite | free | all-rounder |
| Nova, Space Kitten | $120 | jumps higher |
| Bo, Honey Bear | $250 | faster, 4 hearts |

**Cash rewards:** gold coins ($1, coin pitch rises as your combo grows), diamonds ($5), big jackpot coins ($10, tucked in tricky spots), treasure chests ($25 coin fountain) and Wish Stars (three per level). Clearing a level rates you 1-3 stars and pays into your saved wallet: cash found + $10 per star + a $25 bonus for all three.

**Daily gift:** a free gift on the title screen once a day. The payout grows with your streak ($20 on day 1, up to $70 on day 6+). A "!" badge on HEROES shows when you can afford a new hero.

**Sound:** all music and sound effects are synthesized live with the Web Audio API (`src/audio/`), so there are no audio files. There are two chiptune songs (menu and meadow) and 26 effects. Music and sound toggles are on the title screen and in the pause menu, and they are saved. Music is muffled while paused.

Best scores, stars, wallet, unlocked heroes, gift streak and audio settings persist in localStorage.

- **Bloblets** (sleepy jelly walkers) and **Fluffmoths** (fluffy flyers): bop them from above
- **Prickle crystals** (hazard), **Glow Bloom** checkpoints, moving platforms and lifts
- 3 lives. Falling costs a heart and returns you to the last checkpoint.

## Project layout

```
src/
  config/      constants (physics/feel tuning, scoring, scene keys) + Phaser config
  characters/  hero definitions (look, colors, stats, unlock cost)
  art/         procedural textures (hi-res canvas for heroes/rewards), CharacterRig puppet, parallax themes
  levels/      level format: legend, parser, and level data per world
  world/       Terrain: tiles, merged collision bodies, decorations
  entities/    Player, enemies/, Collectible, Chest, Checkpoint, Portal, MovingPlatform
  systems/     Effects (particles, popups), ParallaxBackground
  scenes/      Boot → Menu ⇄ CharacterSelect → Game (+ UI overlay, Pause) → LevelComplete / GameOver
  state/       RunState (this session), SaveData (persistent wallet, heroes, records)
  audio/       AudioEngine (Web Audio synth, music sequencer, SFX), songs, note helpers
  input/       Controls (keyboard; touch/gamepad can plug in here)
  ui/          kit: panels, pills, 3D buttons, audio toggles, wallet, count-up, coin rain, confetti; DailyGift
```

## Level format

Levels are ASCII chunks joined left to right (`src/levels/world1/level1.ts`). Chunks are reusable and easy to produce with a generator or an LLM.

| Char | Meaning | Char | Meaning |
|---|---|---|---|
| `.` | empty | `b` | Bloblet |
| `#` | ground | `f` | Fluffmoth |
| `=` | one-way platform | `^` | prickle crystals |
| `P` | player start | `C` | checkpoint |
| `*` | $1 coin | `E` | exit portal |
| `D` | $5 diamond | `G` | $10 big coin |
| `S` | Wish Star | `M` | moving platform (→) |
| `H` | heart | `V` | lift (↑) |
| `T` | treasure chest | | |

To add a hero, append a `CharacterDef` to `src/characters/characters.ts` (pick ear/tail/marking styles and colors).

To add a level, create a `LevelDefinition` and append it to `LEVELS` in `src/levels/index.ts`. To add a world look, add a theme in `src/art/themes.ts`.
