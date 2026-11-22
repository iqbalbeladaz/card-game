// Ember Clash, wired up: clicks, turns, Pyra's turn, screens, and the
// ?shot= scenes the screenshots are taken from. The game state itself lives
// in state.js; this file only drives it and hands it to the renderer.
import { cardDef } from './cards.js';
import { attack, endTurn, newGame, playCard, startGame } from './state.js';
import { chooseAction } from './ai.js';
import { render } from './render.js';
import { sfx } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '') || (Date.now() % 100000);

let state = newGame(seed);
const ui = { selectedHand: null, selectedAttacker: null, pendingTarget: null, seen: new Set(), targetUids: new Set() };
let aiRunning = false;
let confettiDone = false;

function clearSelection() {
  ui.selectedHand = null;
  ui.selectedAttacker = null;
  ui.pendingTarget = null;
}

function afterPlayerAction() {
  render(state, ui);
  if (state.phase === 'won') {
    sfx.win();
    celebrate();
  } else if (state.phase === 'lost') {
    sfx.lose();
  }
}

function celebrate() {
  if (confettiDone) return;
  confettiDone = true;
  const host = document.getElementById('screen-win');
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#ffd97a', '#e2483d', '#2f7fe0', '#3da35d', '#c98a2b'];
  for (let i = 0; i < 70; i += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 1.2}s`;
    layer.append(piece);
  }
  host.prepend(layer);
}

function freshGame(nextSeed) {
  state = newGame(nextSeed);
  ui.seen = new Set();
  confettiDone = false;
  clearSelection();
  render(state, ui);
}

function onHandCard(index) {
  if (state.phase !== 'play' || state.active !== 'player' || aiRunning) return;
  const card = state.player.hand[index];
  if (!card) return;
  const def = cardDef(card.defId);
  if (ui.selectedHand === index) {
    clearSelection();
    render(state, ui);
    return;
  }
  if (def.type === 'creature' || def.target === 'none') {
    if (playCard(state, 'player', index)) afterPlayerAction();
    else sfx.error();
    return;
  }
  clearSelection();
  ui.selectedHand = index;
  ui.pendingTarget = { handIndex: index, def };
  render(state, ui);
}

function onPlayerCreature(uid) {
  if (state.phase !== 'play' || state.active !== 'player' || aiRunning) return;
  if (ui.pendingTarget && ui.pendingTarget.def.target === 'friendly-creature') {
    resolveTarget(uid);
    return;
  }
  const creature = state.player.board.find((c) => c.uid === uid);
  if (!creature || !creature.canAttack) return;
  const wasSelected = ui.selectedAttacker === uid;
  clearSelection();
  if (!wasSelected) ui.selectedAttacker = uid;
  render(state, ui);
}

function onEnemyCreature(uid) {
  if (state.phase !== 'play' || state.active !== 'player' || aiRunning) return;
  if (ui.pendingTarget) {
    resolveTarget(uid);
    return;
  }
  if (ui.selectedAttacker) {
    const attacker = ui.selectedAttacker;
    clearSelection();
    if (attack(state, 'player', attacker, uid)) afterPlayerAction();
    else sfx.error();
  }
}

function onHero(sideKey) {
  if (state.phase !== 'play' || state.active !== 'player' || aiRunning) return;
  if (sideKey !== 'enemy') return;
  if (ui.pendingTarget) {
    resolveTarget('hero');
    return;
  }
  if (ui.selectedAttacker) {
    const attacker = ui.selectedAttacker;
    clearSelection();
    if (attack(state, 'player', attacker, 'hero')) afterPlayerAction();
    else sfx.error();
  }
}

function resolveTarget(target) {
  const pending = ui.pendingTarget;
  if (!pending) return;
  clearSelection();
  if (playCard(state, 'player', pending.handIndex, target)) afterPlayerAction();
  else sfx.error();
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function runAiTurn() {
  if (aiRunning) return;
  aiRunning = true;
  while (state.phase === 'play' && state.active === 'enemy') {
    const action = chooseAction(state, 'enemy');
    if (action.kind === 'end') break;
    if (action.kind === 'play') playCard(state, 'enemy', action.handIndex, action.target);
    else if (action.kind === 'attack') attack(state, 'enemy', action.attackerUid, action.target);
    render(state, ui);
    await sleep(520);
  }
  if (state.phase === 'play' && state.active === 'enemy') {
    endTurn(state);
    sfx.turn();
    render(state, ui);
  }
  aiRunning = false;
  if (state.phase === 'won') {
    sfx.win();
    celebrate();
  } else if (state.phase === 'lost') {
    sfx.lose();
  }
}

function onEndTurn() {
  if (state.phase !== 'play' || state.active !== 'player' || aiRunning) return;
  clearSelection();
  endTurn(state);
  sfx.turn();
  render(state, ui);
  void runAiTurn();
}

function wireClicks() {
  document.getElementById('stage').addEventListener('click', (event) => {
    const target = event.target;
    const card = target.closest('.card');
    const hero = target.closest('.hero');
    if (event.target.id === 'start-btn') {
      startGame(state);
      sfx.turn();
      render(state, ui);
      return;
    }
    if (event.target.id === 'again-win' || event.target.id === 'again-loss') {
      freshGame((Date.now() % 100000) + 1);
      return;
    }
    if (event.target.id === 'end-turn') {
      onEndTurn();
      return;
    }
    if (card) {
      if (card.dataset.handIndex !== undefined) onHandCard(Number(card.dataset.handIndex));
      else if (card.dataset.side === 'player') onPlayerCreature(card.dataset.uid);
      else if (card.dataset.side === 'enemy') onEnemyCreature(card.dataset.uid);
      return;
    }
    if (hero && hero.dataset.hero) {
      onHero(hero.dataset.hero);
      return;
    }
    if (ui.selectedHand !== null || ui.selectedAttacker !== null) {
      clearSelection();
      render(state, ui);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearSelection();
      render(state, ui);
    }
    if ((event.key === 'e' || event.key === 'E') && !shotName) onEndTurn();
  });
}

/** Fit the 1280×800 table into any window, keeping its proportions. */
function fitStage() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  document.getElementById('stage').style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitStage);
fitStage();
wireClicks();

if (shotName) {
  state = stageShot(shotName, seed);
  ui.seen = new Set();
  render(state, ui);
  if (state.phase === 'won') celebrate();
} else {
  render(state, ui);
}
