// The table itself: turns game state into DOM, and drains the state's event
// queue into floating damage numbers and sounds. All clicks are delegated —
// the renderer only stamps data attributes; main.js decides what a click means.
import { ELEMENTS, cardDef } from './cards.js';
import { effectiveCost, guardOnBoard, label } from './state.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function keywords(def) {
  const tags = [];
  if (def.guard) tags.push('GUARD');
  if (def.burn) tags.push(`BURN ${def.burn}`);
  if (def.swift) tags.push('SWIFT');
  return tags.map((t) => `<span class="kw">${t}</span>`).join('');
}

/** One card face. opts: { handIndex, side, fresh, tilt } — data attributes drive clicks. */
function cardElement(card, state, ui, opts = {}) {
  const def = cardDef(card.defId);
  const element = ELEMENTS[def.element];
  const node = el('div', `card el-${def.element}${def.type === 'spell' ? ' spell' : ''}`);
  node.dataset.defId = def.id;
  if (opts.handIndex !== undefined) node.dataset.handIndex = String(opts.handIndex);
  if (opts.side) {
    node.dataset.uid = card.uid;
    node.dataset.side = opts.side;
  }
  if (opts.fresh) node.classList.add('fresh');
  if (opts.tilt !== undefined) node.style.setProperty('--tilt', `${opts.tilt}deg`);

  const isBoard = opts.side !== undefined;
  const creature = isBoard ? card : null;
  if (isBoard && !creature.canAttack) node.classList.add('exhausted');
  if (isBoard && creature.canAttack && state.active === 'player' && state.phase === 'play' && opts.side === 'player') {
    node.classList.add('can-attack');
  }
  if (ui.selectedAttacker === card.uid) node.classList.add('attacker-selected');
  if (isBoard && ui.targetUids.has(card.uid)) node.classList.add('targetable');

  if (!isBoard && state.active === 'player' && state.phase === 'play') {
    const cost = effectiveCost(state, 'player', def);
    if (cost <= state.player.ember) node.classList.add('playable');
    else node.classList.add('cant-afford');
  }
  if (ui.selectedHand === opts.handIndex) node.classList.add('selected');

  const cost = isBoard ? def.cost : effectiveCost(state, 'player', def);
  const discounted = !isBoard && cost < def.cost;
  node.innerHTML = `
    <div class="cost${discounted ? ' discounted' : ''}">${cost}</div>
    <div class="el-tag">${element.glyph} ${element.name.toUpperCase()}</div>
    <div class="art">${element.glyph}</div>
    <div class="name">${def.name}</div>
    <div class="kw-row">${keywords(def)}</div>
    <div class="text">${def.text}</div>
    ${def.type === 'creature' ? `<div class="stats"><span class="atk">${creature ? creature.atk : def.atk}</span><span class="hp">${creature ? creature.hp : def.hp}</span></div>` : ''}`;
  return node;
}

function heroPanel(state, sideKey, ui) {
  const side = state[sideKey];
  const isPlayer = sideKey === 'player';
  const panel = $(isPlayer ? 'player-hero' : 'enemy-hero');
  panel.dataset.hero = sideKey;
  panel.classList.toggle('targetable', ui.targetUids.has('hero'));
  const pips = Array.from({ length: 10 }, (_, i) =>
    `<span class="ember-pip${i < side.ember ? ' full' : ''}"></span>`).join('');
  panel.innerHTML = `
    <div class="hero-name"><span>${isPlayer ? 'YOU' : 'PYRA'}</span><span class="avatar">${isPlayer ? 'Y' : 'P'}</span></div>
    <div class="hp-row"><span class="hp-num">${side.hp}<span class="max"> / ${side.maxHp}</span></span>
    <div class="hp-bar"><div class="hp-fill" style="width:${(side.hp / side.maxHp) * 100}%"></div></div></div>
    <div class="ember-row">${pips}<span>${side.ember}/${side.maxEmber}</span></div>`;
}

function renderHeroes(state, ui) {
  heroPanel(state, 'player', ui);
  heroPanel(state, 'enemy', ui);
}

function renderBoards(state, ui) {
  const enemyBoard = $('enemy-board');
  enemyBoard.innerHTML = '';
  if (state.enemy.board.length === 0) enemyBoard.append(el('div', 'empty-note', 'No creatures yet'));
  for (const creature of state.enemy.board) {
    const fresh = !ui.seen.has(creature.uid);
    ui.seen.add(creature.uid);
    enemyBoard.append(cardElement(creature, state, ui, { side: 'enemy', fresh }));
  }

  const playerBoard = $('player-board');
  playerBoard.innerHTML = '';
  if (state.player.board.length === 0) playerBoard.append(el('div', 'empty-note', 'Your creatures gather here'));
  for (const creature of state.player.board) {
    const fresh = !ui.seen.has(creature.uid);
    ui.seen.add(creature.uid);
    playerBoard.append(cardElement(creature, state, ui, { side: 'player', fresh }));
  }
}

function renderHands(state, ui) {
  const enemyHand = $('enemy-hand');
  enemyHand.innerHTML = '';
  for (let i = 0; i < state.enemy.hand.length; i += 1) enemyHand.append(el('div', 'mini-card'));

  const hand = $('player-hand');
  hand.innerHTML = '';
  const n = state.player.hand.length;
  state.player.hand.forEach((card, i) => {
    const fresh = !ui.seen.has(card.uid);
    ui.seen.add(card.uid);
    const tilt = (i - (n - 1) / 2) * 3.5;
    hand.append(cardElement(card, state, ui, { handIndex: i, fresh, tilt }));
  });
}

function renderChrome(state) {
  const badge = $('turn-badge');
  if (state.phase === 'play') {
    badge.textContent = state.active === 'player' ? 'Your turn — play a card or attack' : "Pyra's turn…";
    badge.classList.toggle('enemy-turn', state.active !== 'player');
  } else if (state.phase === 'won') {
    badge.textContent = 'Victory';
    badge.classList.remove('enemy-turn');
  } else if (state.phase === 'lost') {
    badge.textContent = 'Defeat';
    badge.classList.add('enemy-turn');
  } else {
    badge.textContent = 'Ember Clash';
    badge.classList.remove('enemy-turn');
  }
  $('round-label').textContent = `Round ${state.turn} · You ${state.player.hp} — Pyra ${state.enemy.hp}`;
  $('end-turn').disabled = !(state.phase === 'play' && state.active === 'player');
  const log = $('mid-log');
  log.innerHTML = state.log.slice(-3).map((line) => `<div class="log-line">${line}</div>`).join('');
}

/** Which enemy hero / creature uids are legal targets right now (for the glow). */
export function computeTargets(state, ui) {
  const targets = new Set();
  if (state.phase !== 'play' || state.active !== 'player') return targets;
  if (ui.pendingTarget) {
    const def = ui.pendingTarget.def;
    if (def.target === 'enemy') {
      targets.add('hero');
      for (const c of state.enemy.board) targets.add(c.uid);
    } else if (def.target === 'enemy-creature') {
      for (const c of state.enemy.board) targets.add(c.uid);
    } else if (def.target === 'friendly-creature') {
      for (const c of state.player.board) targets.add(c.uid);
    }
    return targets;
  }
  if (ui.selectedAttacker) {
    if (!guardOnBoard(state, 'enemy')) targets.add('hero');
    for (const c of state.enemy.board) {
      if (!guardOnBoard(state, 'enemy') || cardDef(c.defId).guard) targets.add(c.uid);
    }
  }
  return targets;
}

function floater(text, anchor, cls = '') {
  const stage = $('stage');
  const box = anchor.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const node = el('div', `floater ${cls}`, text);
  node.style.left = `${box.left - stageBox.left + box.width / 2 - 14}px`;
  node.style.top = `${box.top - stageBox.top + 6}px`;
  $('floaters').append(node);
  window.setTimeout(() => node.remove(), 1200);
}

/** Turn the state's queued events into floaters, shakes and sounds. */
function drainEvents(state) {
  for (const event of state.events) {
    if (event.type === 'damage-hero') {
      const panel = $(event.side === 'player' ? 'player-hero' : 'enemy-hero');
      floater(`-${event.amount}`, panel);
      panel.classList.remove('shake');
      void panel.offsetWidth;
      panel.classList.add('shake');
      sfx.hurt();
    } else if (event.type === 'heal-hero') {
      floater(`+${event.amount}`, $(event.side === 'player' ? 'player-hero' : 'enemy-hero'), 'heal');
      sfx.heal();
    } else if (event.type === 'damage-creature') {
      const card = document.querySelector(`[data-uid="${event.uid}"]`);
      if (card) {
        floater(`-${event.amount}`, card);
        card.classList.remove('damaged');
        void card.offsetWidth;
        card.classList.add('damaged');
      }
    } else if (event.type === 'attack') {
      const card = document.querySelector(`[data-uid="${event.uid}"]`);
      if (card) {
        card.classList.remove('lunge');
        void card.offsetWidth;
        card.classList.add('lunge');
      }
      sfx.attack();
    } else if (event.type === 'play') {
      sfx.play();
    } else if (event.type === 'draw') {
      // A drawn card slides in through the .fresh animation.
    }
  }
  state.events.length = 0;
}

function renderScreens(state) {
  $('screen-title').classList.toggle('hidden', state.phase !== 'title');
  $('screen-win').classList.toggle('hidden', state.phase !== 'won');
  $('screen-loss').classList.toggle('hidden', state.phase !== 'lost');
  if (state.phase === 'won') {
    $('win-detail').textContent =
      `Final health — You ${state.player.hp} · Pyra ${state.enemy.hp} · settled in round ${state.turn}.`;
  }
  if (state.phase === 'lost') {
    $('loss-detail').textContent =
      `Final health — You ${state.player.hp} · Pyra ${state.enemy.hp} · settled in round ${state.turn}.`;
  }
}

export function render(state, ui) {
  ui.targetUids = computeTargets(state, ui);
  renderHeroes(state, ui);
  renderBoards(state, ui);
  renderHands(state, ui);
  renderChrome(state);
  renderScreens(state);
  drainEvents(state);
  $('status').textContent =
    state.phase === 'play'
      ? `Round ${state.turn}. Your health ${state.player.hp}, Pyra's ${state.enemy.hp}. ${state.active === 'player' ? 'Your turn.' : "Pyra's turn."}`
      : '';
}
