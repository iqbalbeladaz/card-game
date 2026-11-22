// The screenshot scenes: each one plays the real rules forward from a fresh
// game, steered by the same autopilot that drives Pyra, so every frame is
// what a short real game looks like — and the same seed always gives the same
// frame. Title shows the opening screen; play stops mid-duel with full
// boards; win and loss search seeds until the autopilot truly wins or loses.
import { attack, endTurn, newGame, playCard, startGame } from './state.js';
import { chooseAction } from './ai.js';

/** Apply one autopilot action for `side`; false when the side ends its turn. */
function autoStep(state, side) {
  const action = chooseAction(state, side);
  if (action.kind === 'end') return false;
  if (action.kind === 'play') playCard(state, side, action.handIndex, action.target);
  else if (action.kind === 'attack') attack(state, side, action.attackerUid, action.target);
  return state.phase === 'play';
}

/** Play one whole side's turn, then pass. */
function autoTurn(state) {
  const side = state.active;
  let guard = 0;
  while (state.phase === 'play' && state.active === side && guard < 60) {
    guard += 1;
    if (!autoStep(state, side)) break;
  }
  if (state.phase === 'play') endTurn(state);
}

/** A full autopilot duel from a seed. */
export function autoGame(seed) {
  const state = newGame(seed);
  startGame(state);
  let guard = 0;
  while (state.phase === 'play' && guard < 80) {
    guard += 1;
    autoTurn(state);
  }
  return state;
}

/**
 * Stage a named scene and return its state (main.js renders it):
 *   title — the opening screen over a fresh table;
 *   play  — mid-duel: both boards crewed, hands full, health dented;
 *   win   — a duel the autopilot truly won;
 *   loss  — a duel the autopilot truly lost.
 */
export function stageShot(name, seed = 7) {
  if (name === 'title') return newGame(seed);

  if (name === 'play') {
    const state = newGame(seed);
    startGame(state);
    let guard = 0;
    while (state.phase === 'play' && guard < 80) {
      guard += 1;
      autoTurn(state);
      const rich =
        state.active === 'player' &&
        state.turn >= 5 &&
        state.player.board.length >= 2 &&
        state.enemy.board.length >= 1 &&
        state.player.hand.length >= 3;
      if (rich) return state;
    }
    return state;
  }

  const wanted = name === 'win' ? 'won' : 'lost';
  for (let trySeed = 1; trySeed <= 400; trySeed += 1) {
    const state = autoGame(trySeed * 31 + 7);
    if (state.phase === wanted) return state;
  }
  return autoGame(seed);
}
