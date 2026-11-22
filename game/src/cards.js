// The card pool of Ember Clash: four original elements, each told apart by colour
// and by shape (Flame ▲, Tide ●, Leaf ◆, Stone ■), never by text alone.
// A deck holds 30 cards: two copies of most faces, one of the heavy finishers.
export const ELEMENTS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e2483d', dark: '#7d1a12', light: '#ffb3a3' },
  tide: { name: 'Tide', glyph: '●', color: '#2f7fe0', dark: '#123f7d', light: '#a8ccff' },
  leaf: { name: 'Leaf', glyph: '◆', color: '#3da35d', dark: '#14532a', light: '#a9e6bd' },
  stone: { name: 'Stone', glyph: '■', color: '#c98a2b', dark: '#6b4410', light: '#f2d49b' },
};

// Keywords, in plain words on the card:
//   Guard  — enemies must attack this creature before your hero or your others.
//   Burn n — at the start of your turn this creature scorches the enemy hero for n.
//   Swift  — this creature may attack the turn it is played.
export const CARD_DEFS = [
  { id: 'ember-imp', name: 'Ember Imp', element: 'flame', type: 'creature', cost: 1, atk: 2, hp: 1, text: 'A spark with teeth.' },
  { id: 'cinder-wolf', name: 'Cinder Wolf', element: 'flame', type: 'creature', cost: 2, atk: 3, hp: 2, text: 'It hunts in the smoke.' },
  { id: 'flame-drake', name: 'Flame Drake', element: 'flame', type: 'creature', cost: 4, atk: 5, hp: 4, burn: 1, text: 'Burn 1. Its breath never cools.' },
  { id: 'pyroblast', name: 'Pyroblast', element: 'flame', type: 'spell', cost: 3, target: 'enemy', text: 'Deal 4 damage to any enemy.' },
  { id: 'ignite', name: 'Ignite', element: 'flame', type: 'spell', cost: 2, target: 'enemy-creature', text: 'Deal 3 damage to an enemy creature.' },
  { id: 'tide-sprite', name: 'Tide Sprite', element: 'tide', type: 'creature', cost: 1, atk: 1, hp: 3, text: 'Small, slippery, stubborn.' },
  { id: 'wave-serpent', name: 'Wave Serpent', element: 'tide', type: 'creature', cost: 3, atk: 3, hp: 4, text: 'It rides the swell.' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', type: 'creature', cost: 5, atk: 4, hp: 6, guard: true, text: 'Guard. The sea stands in your way.' },
  { id: 'healing-rain', name: 'Healing Rain', element: 'tide', type: 'spell', cost: 2, target: 'none', text: 'Restore 6 health to your hero.' },
  { id: 'deep-draw', name: 'Deep Draw', element: 'tide', type: 'spell', cost: 2, target: 'none', text: 'Draw 2 cards.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', element: 'leaf', type: 'creature', cost: 1, atk: 1, hp: 2, guard: true, text: 'Guard. It grew overnight.' },
  { id: 'briar-wolf', name: 'Briar Wolf', element: 'leaf', type: 'creature', cost: 2, atk: 2, hp: 3, guard: true, text: 'Guard. Vines for a mane.' },
  { id: 'ancient-treant', name: 'Ancient Treant', element: 'leaf', type: 'creature', cost: 5, atk: 5, hp: 7, guard: true, text: 'Guard. Older than the road.' },
  { id: 'overgrowth', name: 'Overgrowth', element: 'leaf', type: 'spell', cost: 3, target: 'none', text: 'Give your creatures +2/+2.' },
  { id: 'pebble-golem', name: 'Pebble Golem', element: 'stone', type: 'creature', cost: 2, atk: 2, hp: 4, text: 'Patient as a hillside.' },
  { id: 'granite-colossus', name: 'Granite Colossus', element: 'stone', type: 'creature', cost: 6, atk: 7, hp: 7, text: 'The mountain decided to walk.' },
  { id: 'quake', name: 'Quake', element: 'stone', type: 'spell', cost: 4, target: 'none', text: 'Deal 2 damage to all enemy creatures.' },
  { id: 'sharpen', name: 'Sharpen', element: 'stone', type: 'spell', cost: 1, target: 'friendly-creature', text: 'Give a friendly creature +3 attack.' },
];

const DECK_COUNTS = {
  'ember-imp': 2, 'cinder-wolf': 2, 'flame-drake': 2, pyroblast: 2, ignite: 1,
  'tide-sprite': 2, 'wave-serpent': 2, tidecaller: 1, 'healing-rain': 2, 'deep-draw': 2,
  'thorn-sprout': 2, 'briar-wolf': 2, 'ancient-treant': 1, overgrowth: 2,
  'pebble-golem': 2, 'granite-colossus': 1, quake: 1, sharpen: 1,
};

export function cardDef(id) {
  return CARD_DEFS.find((card) => card.id === id);
}

/** A fresh 30-card deck of { defId, uid } in the order the stream shuffles them. */
export function buildDeck(rand, owner) {
  const cards = [];
  for (const def of CARD_DEFS) {
    for (let n = 0; n < (DECK_COUNTS[def.id] ?? 0); n += 1) {
      cards.push({ defId: def.id, uid: `${owner}-${def.id}-${n}` });
    }
  }
  return cards;
}
