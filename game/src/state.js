// The rules of Ember Clash, with no DOM in them: a pure state machine the browser
// UI drives, the AI drives, and the screenshot scenes replay headlessly.
//
// A duel: each hero has 30 health and ember crystals for mana — 1 on the first
// turn, one more each turn, up to 10, refilled every turn. Creatures stay on the
// board and attack once a turn (never the turn they are played, unless Swift).
// Resonance: playing a card of the same element as the last card you played
// this turn costs 1 ember less. Guard creatures must be attacked first.
// Burn creatures scorch the enemy hero at the start of your turn.
import { buildDeck, cardDef } from './cards.js';
import { mulberry32, shuffle } from './random.js';

export const START_HP = 30;
export const START_HAND = 4;
export const MAX_BOARD = 7;
export const MAX_EMBER = 10;

function makeSide(owner, rand) {
  return {
    owner,
    hp: START_HP,
    maxHp: START_HP,
    maxEmber: 1,
    ember: 1,
    deck: shuffle(buildDeck(rand, owner), rand),
    hand: [],
    board: [],
    fatigue: 0,
    lastElement: null,
  };
}

export function newGame(seed) {
  const rand = mulberry32(seed);
  const state = {
    seed,
    rand,
    turn: 1,
    phase: 'title',
    active: 'player',
    player: makeSide('player', rand),
    enemy: makeSide('enemy', rand),
    log: [],
    events: [],
    winner: null,
    playsThisTurn: 0,
  };
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(state, 'player', true);
    drawCard(state, 'enemy', true);
  }
  return state;
}

export function other(side) {
  return side === 'player' ? 'enemy' : 'player';
}

export function sideOf(state, key) {
  return state[key];
}

function say(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.shift();
}

function emit(state, event) {
  state.events.push(event);
}

/** Resonance: a card costs 1 less when it shares the element of the last card played this turn. */
export function effectiveCost(state, sideKey, def) {
  const side = sideOf(state, sideKey);
  if (side.lastElement && side.lastElement === def.element) return Math.max(0, def.cost - 1);
  return def.cost;
}

function drawCard(state, sideKey, opening = false) {
  const side = sideOf(state, sideKey);
  if (side.deck.length === 0) {
    side.fatigue += 1;
    damageHero(state, sideKey, side.fatigue, 'fatigue');
    if (!opening) say(state, `${label(sideKey)} runs out of cards and takes ${side.fatigue} fatigue damage.`);
    return null;
  }
  const card = side.deck.pop();
  side.hand.push(card);
  if (!opening) emit(state, { type: 'draw', side: sideKey, uid: card.uid });
  return card;
}

export function label(sideKey) {
  return sideKey === 'player' ? 'You' : 'Pyra';
}

export function startGame(state) {
  state.phase = 'play';
  state.active = 'player';
  say(state, 'The duel begins — your move, challenger.');
}

/** Open a side's turn: ember grows, burn ticks, a card is drawn, creatures wake. */
export function beginTurn(state, sideKey) {
  const side = sideOf(state, sideKey);
  if (state.turn > 1 || sideKey === 'enemy') side.maxEmber = Math.min(MAX_EMBER, side.maxEmber + 1);
  side.ember = side.maxEmber;
  side.lastElement = null;
  for (const creature of side.board) creature.canAttack = true;
  const foe = other(sideKey);
  for (const creature of side.board) {
    const def = cardDef(creature.defId);
    if (def.burn) damageHero(state, foe, def.burn, 'burn');
  }
  if (state.phase === 'play') drawCard(state, sideKey);
  checkEnd(state);
}

export function damageHero(state, sideKey, amount, source = 'damage') {
  const side = sideOf(state, sideKey);
  side.hp = Math.max(0, side.hp - amount);
  emit(state, { type: 'damage-hero', side: sideKey, amount, source });
  checkEnd(state);
}

function healHero(state, sideKey, amount) {
  const side = sideOf(state, sideKey);
  side.hp = Math.min(side.maxHp, side.hp + amount);
  emit(state, { type: 'heal-hero', side: sideKey, amount });
}

function damageCreature(state, sideKey, uid, amount) {
  const side = sideOf(state, sideKey);
  const creature = side.board.find((c) => c.uid === uid);
  if (!creature) return false;
  creature.hp -= amount;
  emit(state, { type: 'damage-creature', side: sideKey, uid, amount });
  if (creature.hp <= 0) removeCreature(state, sideKey, uid);
  return true;
}

function removeCreature(state, sideKey, uid) {
  const side = sideOf(state, sideKey);
  const index = side.board.findIndex((c) => c.uid === uid);
  if (index === -1) return;
  const [gone] = side.board.splice(index, 1);
  emit(state, { type: 'die', side: sideKey, uid });
  say(state, `${cardDef(gone.defId).name} falls.`);
}

export function guardOnBoard(state, sideKey) {
  return sideOf(state, sideKey).board.some((c) => cardDef(c.defId).guard);
}

/** Play the card at handIndex. target is a creature uid, 'hero', or null. */
export function playCard(state, sideKey, handIndex, target = null) {
  const side = sideOf(state, sideKey);
  const card = side.hand[handIndex];
  if (!card || state.phase !== 'play' || state.active !== sideKey) return false;
  const def = cardDef(card.defId);
  const cost = effectiveCost(state, sideKey, def);
  if (side.ember < cost) return false;
  if (def.type === 'creature' && side.board.length >= MAX_BOARD) return false;
  if (!targetIsLegal(state, sideKey, def, target)) return false;

  side.hand.splice(handIndex, 1);
  side.ember -= cost;
  side.lastElement = def.element;
  state.playsThisTurn += 1;
  emit(state, { type: 'play', side: sideKey, uid: card.uid, defId: def.id, cost });

  if (def.type === 'creature') {
    side.board.push({
      uid: card.uid, defId: def.id, atk: def.atk, hp: def.hp, maxHp: def.hp,
      canAttack: Boolean(def.swift), justPlayed: true,
    });
    say(state, `${label(sideKey)} summons ${def.name} (${def.atk}/${def.hp}).`);
  } else {
    resolveSpell(state, sideKey, def, target);
  }
  checkEnd(state);
  return true;
}

function resolveSpell(state, sideKey, def, target) {
  const foe = other(sideKey);
  switch (def.id) {
    case 'pyroblast': {
      if (target === 'hero') damageHero(state, foe, 4, 'spell');
      else damageCreature(state, foe, target, 4);
      say(state, `${label(sideKey)} hurls a Pyroblast for 4 damage.`);
      break;
    }
    case 'ignite':
      damageCreature(state, foe, target, 3);
      say(state, `${label(sideKey)} ignites a creature for 3 damage.`);
      break;
    case 'healing-rain':
      healHero(state, sideKey, 6);
      say(state, `${label(sideKey)} calls down Healing Rain (+6 health).`);
      break;
    case 'deep-draw':
      drawCard(state, sideKey);
      drawCard(state, sideKey);
      say(state, `${label(sideKey)} draws 2 cards from the deep.`);
      break;
    case 'overgrowth':
      for (const c of sideOf(state, sideKey).board) {
        c.atk += 2;
        c.hp += 2;
        c.maxHp += 2;
      }
      emit(state, { type: 'buff', side: sideKey });
      say(state, `${label(sideKey)} casts Overgrowth: creatures +2/+2.`);
      break;
    case 'quake':
      for (const c of [...sideOf(state, foe).board]) damageCreature(state, foe, c.uid, 2);
      say(state, `${label(sideKey)} shakes the table: Quake hits every enemy creature for 2.`);
      break;
    case 'sharpen': {
      const creature = sideOf(state, sideKey).board.find((c) => c.uid === target);
      if (creature) {
        creature.atk += 3;
        emit(state, { type: 'buff-one', side: sideKey, uid: target });
        say(state, `${label(sideKey)} sharpens ${cardDef(creature.defId).name} (+3 attack).`);
      }
      break;
    }
    default:
      break;
  }
}

/** Whether `target` is a legal target for this spell: 'hero', a creature uid, or null. */
export function targetIsLegal(state, sideKey, def, target) {
  if (def.type !== 'spell') return target === null;
  const foe = other(sideKey);
  switch (def.target) {
    case 'none':
      return target === null;
    case 'enemy':
      return target === 'hero' || sideOf(state, foe).board.some((c) => c.uid === target);
    case 'enemy-creature':
      return sideOf(state, foe).board.some((c) => c.uid === target);
    case 'friendly-creature':
      return sideOf(state, sideKey).board.some((c) => c.uid === target);
    default:
      return false;
  }
}

/** A creature attacks an enemy creature (uid) or 'hero'. Both sides trade blows. */
export function attack(state, sideKey, attackerUid, target) {
  const side = sideOf(state, sideKey);
  const foeKey = other(sideKey);
  const foe = sideOf(state, foeKey);
  const attacker = side.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack || state.phase !== 'play' || state.active !== sideKey) return false;
  if (target === 'hero') {
    if (guardOnBoard(state, foeKey)) return false;
  } else {
    const victim = foe.board.find((c) => c.uid === target);
    if (!victim) return false;
    if (guardOnBoard(state, foeKey) && !cardDef(victim.defId).guard) return false;
  }
  attacker.canAttack = false;
  attacker.justPlayed = false;
  emit(state, { type: 'attack', side: sideKey, uid: attackerUid, target });
  if (target === 'hero') {
    damageHero(state, foeKey, attacker.atk, 'attack');
    say(state, `${cardDef(attacker.defId).name} strikes ${label(foeKey)}'s hero for ${attacker.atk}.`);
  } else {
    const victim = foe.board.find((c) => c.uid === target);
    const victimAtk = victim.atk;
    damageCreature(state, foeKey, target, attacker.atk);
    damageCreature(state, sideKey, attackerUid, victimAtk);
    say(state, `${cardDef(attacker.defId).name} trades blows with ${cardDef(victim.defId).name}.`);
  }
  checkEnd(state);
  return true;
}

/** End the active side's turn and open the other's. */
export function endTurn(state) {
  if (state.phase !== 'play') return;
  const next = other(state.active);
  if (next === 'player') state.turn += 1;
  state.active = next;
  state.playsThisTurn = 0;
  beginTurn(state, next);
}

function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.enemy.hp <= 0) {
    state.phase = 'won';
    state.winner = 'player';
    say(state, 'Pyra falls — the table is yours!');
  } else if (state.player.hp <= 0) {
    state.phase = 'lost';
    state.winner = 'enemy';
    say(state, 'Your hero falls. Pyra keeps the table.');
  }
}
