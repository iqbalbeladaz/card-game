# Ember Clash

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/iqbalbeladaz/card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/iqbalbeladaz/card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Ember Clash is an original duel card game: you against Pyra, the Ashen Warden,
across a felt table. Each hero has 30 health and ember crystals for mana — 1 on
the first turn, one more each turn up to 10, refilled every turn. Play creatures
and spells from a 30-card deck of four elements — Flame ▲, Tide ●, Leaf ◆,
Stone ■ — each told apart by colour and shape.

## The rules

- **Resonance:** playing a card of the same element as the last card you played
  this turn costs 1 ember less. Chain one element to press an advantage.
- **Guard:** enemies must attack a Guard creature before your hero or your others.
- **Burn:** a Burn creature scorches the enemy hero at the start of your turn.
- **Swift** creatures may attack the turn they are played; the rest wait a turn.
- Reduce Pyra to 0 health to win. Run out of cards and fatigue bites instead.

Pyra plays by a readable plan: she spends her ember on her best card, holds her
removal for real threats, saves her burn for lethal, and attacks your hero
unless a trade clearly favours her.

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no network request: `game/index.html` and its modules play
offline in a desktop browser. Keyboard: `E` ends your turn, `Esc` clears a
selection. The screenshots in `screenshots/` are real renders of the game,
staged with `?shot=title|play|win|loss`.

## Layout

- `game/` — the game: `index.html`, `styles.css`, `src/` (rules, cards, AI,
  rendering, sound, screenshot scenes)
- `screenshots/` — title, mid-duel, victory and defeat, taken in headless Chromium
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
