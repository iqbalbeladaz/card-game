// Pyra, the Ashen Warden: a readable opponent. She plays her best affordable
// card, holds her removal for real threats, saves her burn for lethal, and
// attacks the hero unless a trade clearly favours her. One action at a time —
// the UI (and the screenshot scenes) apply each action, then ask for the next.
import { cardDef } from './cards.js';
import { effectiveCost, guardOnBoard, other, sideOf, targetIsLegal } from './state.js';

/** The next thing `sideKey` should do: a play, an attack, or end the turn. */
export function chooseAction(state, sideKey) {
  const side = sideOf(state, sideKey);
  const foe = sideOf(state, other(sideKey));

  const play = choosePlay(state, sideKey);
  if (play) return play;

  for (const creature of side.board) {
    if (!creature.canAttack) continue;
    const attack = chooseAttack(state, sideKey, creature);
    if (attack) return attack;
  }
  return { kind: 'end' };
}

function choosePlay(state, sideKey) {
  const side = sideOf(state, sideKey);
  const foe = sideOf(state, other(sideKey));
  let best = null;

  for (let i = 0; i < side.hand.length; i += 1) {
    const card = side.hand[i];
    const def = cardDef(card.defId);
    const cost = effectiveCost(state, sideKey, def);
    if (cost > side.ember) continue;
    const scored = scoreCard(state, sideKey, def, cost);
    if (scored && (!best || scored.score > best.score)) {
      best = { ...scored, handIndex: i };
    }
  }
  if (!best) return null;
  return { kind: 'play', handIndex: best.handIndex, target: best.target ?? null };
}

/** How much this card is worth right now, and what it should target. Null means hold it. */
function scoreCard(state, sideKey, def, cost) {
  const side = sideOf(state, sideKey);
  const foe = sideOf(state, other(sideKey));
  const resonance = side.lastElement === def.element ? 0.4 : 0;

  if (def.type === 'creature') {
    if (side.board.length >= 7) return null;
    let score = (def.atk + def.hp) / Math.max(1, cost) + resonance;
    if (def.guard) score += 0.4;
    if (def.burn) score += 0.3;
    return { score, target: null };
  }

  switch (def.id) {
    case 'pyroblast': {
      if (foe.hp <= 4) return { score: 9, target: 'hero' };
      const prey = foe.board
        .filter((c) => c.hp <= 4 && c.atk >= 3)
        .sort((a, b) => b.atk - a.atk)[0];
      if (prey) return { score: 5, target: prey.uid };
      return null;
    }
    case 'ignite': {
      const prey = foe.board
        .filter((c) => c.hp <= 3 && c.atk >= 3)
        .sort((a, b) => b.atk - a.atk)[0];
      if (prey) return { score: 4.5, target: prey.uid };
      return null;
    }
    case 'healing-rain':
      return side.hp <= 18 ? { score: 4, target: null } : null;
    case 'deep-draw':
      return side.hand.length <= 3 ? { score: 3.5, target: null } : null;
    case 'overgrowth':
      return side.board.length >= 2 ? { score: 4.5, target: null } : null;
    case 'quake': {
      const soft = foe.board.filter((c) => c.hp <= 2).length;
      return soft >= 2 ? { score: 5, target: null } : null;
    }
    case 'sharpen': {
      const big = [...side.board]
        .filter((c) => c.canAttack)
        .sort((a, b) => b.atk - a.atk)[0];
      if (big && big.atk >= 2) return { score: 3, target: big.uid };
      return null;
    }
    default:
      return null;
  }
}

function chooseAttack(state, sideKey, creature) {
  const side = sideOf(state, sideKey);
  const foeKey = other(sideKey);
  const foe = sideOf(state, foeKey);
  const def = cardDef(creature.defId);

  if (foe.hp <= creature.atk) return { kind: 'attack', attackerUid: creature.uid, target: 'hero' };

  if (guardOnBoard(state, foeKey)) {
    const guards = foe.board.filter((c) => cardDef(c.defId).guard);
    const killable = guards.filter((g) => g.hp <= creature.atk).sort((a, b) => a.hp - b.hp)[0];
    const target = killable ?? guards.sort((a, b) => b.atk - a.atk)[0];
    return { kind: 'attack', attackerUid: creature.uid, target: target.uid };
  }

  const threat = foe.board
    .filter((c) => c.atk >= 4 && c.hp <= creature.atk && creature.hp > c.atk)
    .sort((a, b) => b.atk - a.atk)[0];
  if (threat) return { kind: 'attack', attackerUid: creature.uid, target: threat.uid };

  return { kind: 'attack', attackerUid: creature.uid, target: 'hero' };
}
