import { chileSort } from './chilesort.js';
import { CARD_WIDTH, ROW_PITCH, MIN_GRID_WIDTH, canvasHeight, columnPositions, shuffleOrder, gridPositions, gridHeight } from './layout.js';

const $ = id => document.getElementById(id);
const input = $('items');
const stage = $('stage');
const canvas = $('canvas');
const tiles = $('tiles');
const emptyState = document.createElement('p');
emptyState.className = 'empty-state';
emptyState.textContent = 'Chile exists :(';
emptyState.hidden = true;
emptyState.setAttribute('role', 'status');
stage.append(emptyState);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let items = [];
let mode = 'idle';
let run = 0;
let positions = [];
let previousWidth = 0;
let arrangement = 'grid';
let gridOrder = [];
let followFrame = 0;
let resetFrame = 0;
let followTarget = 0;
let followCards = null;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cardTilt = index => [-3, 2, -2, 3, 1, -1][index % 6];

function stopFollowing() {
  cancelAnimationFrame(followFrame);
  cancelAnimationFrame(resetFrame);
  followFrame = 0;
  resetFrame = 0;
  followCards = null;
}

function scrollToTop(currentRun) {
  if (reducedMotion.matches) { stage.scrollTop = 0; return; }
  const start = stage.scrollTop;
  const started = performance.now();
  const frame = time => {
    if (currentRun !== run) return;
    const progress = Math.min(1, (time - started) / 450);
    stage.scrollTop = start * (1 - progress) ** 3;
    resetFrame = progress < 1 ? requestAnimationFrame(frame) : 0;
  };
  resetFrame = requestAnimationFrame(frame);
}

function updateFollowTarget() {
  if (!followCards?.length) return;
  const centerX = canvas.getBoundingClientRect().left + canvas.clientWidth / 2;
  const top = stage.getBoundingClientRect().top + stage.clientTop;
  let frontier = 0;
  // Follow the visible column as it forms, including cards still moving into it.
  // Cards that have not reached the column must not pull the view into empty space.
  for (const card of followCards) {
    const bounds = card.getBoundingClientRect();
    if (bounds.left > centerX || bounds.right < centerX) continue;
    frontier = Math.max(frontier, bounds.top + bounds.height / 2 - top + stage.scrollTop);
  }
  followTarget = Math.max(followTarget, 0, Math.min(stage.scrollHeight - stage.clientHeight, frontier - stage.clientHeight / 2));
}

function startFollowing(currentRun, cards) {
  stopFollowing();
  followCards = cards;
  followTarget = 0;
  if (reducedMotion.matches) { stage.scrollTop = 0; return; }
  const frame = () => {
    if (currentRun !== run || mode !== 'running') { stopFollowing(); return; }
    updateFollowTarget();
    stage.scrollTop = followTarget;
    followFrame = requestAnimationFrame(frame);
  };
  followFrame = requestAnimationFrame(frame);
}

async function finishFollowing(currentRun) {
  followCards = null;
  followTarget = Math.max(0, stage.scrollHeight - stage.clientHeight);
  if (reducedMotion.matches) stage.scrollTop = followTarget;
  else await new Promise(resolve => {
    const check = () => {
      if (currentRun !== run || Math.abs(stage.scrollTop - followTarget) < 1) { resolve(); return; }
      requestAnimationFrame(check);
    };
    check();
  });
  if (currentRun !== run) return false;
  stopFollowing();
  return true;
}

function readInput() {
  const values = input.value.split(',').map(value => value.trim()).filter(Boolean);
  if (values.some(value => [...value].length > 12)) throw new Error('Keep each element to 12 characters or fewer. Narrow country, remember?');
  return values;
}

function validate() {
  try {
    const values = readInput();
    $('input-error').hidden = true;
    $('item-count').textContent = `${values.length} element${values.length === 1 ? '' : 's'}`;
    $('sort').disabled = mode !== 'idle' || values.length === 0;
    return values;
  } catch (error) {
    $('input-error').textContent = error.message;
    $('input-error').hidden = false;
    $('item-count').textContent = 'Invalid array';
    $('sort').disabled = true;
    return null;
  }
}

function resizeCanvas() {
  const width = Math.max(MIN_GRID_WIDTH, stage.clientWidth);
  canvas.style.width = `${width}px`;
  const slotCount = Math.max(items.length, ...gridOrder.map(slot => slot + 1));
  const height = arrangement === 'grid' ? gridHeight(slotCount) : canvasHeight(items.length, width);
  canvas.style.height = `${Math.max(stage.clientHeight, height)}px`;
}

function applyPosition(tile, position) {
  const x = position.x + (CARD_WIDTH - tile.offsetWidth) / 2;
  tile.style.transform = `translate(${x}px, ${position.y}px) rotate(${position.angle}deg)`;
}

function shuffleGrid() {
  arrangement = 'grid';
  resizeCanvas();
  const order = shuffleOrder(items.length);
  const currentSlots = gridOrder.length === items.length ? gridOrder : items.map((_, index) => index);
  gridOrder = order.map(index => currentSlots[index]);
  const slots = gridPositions(Math.max(items.length, ...gridOrder.map(slot => slot + 1)), canvas.clientWidth);
  positions = gridOrder.map((slot, index) => ({ ...slots[slot], angle: cardTilt(index) }));
  [...tiles.children].forEach((tile, index) => {
    tile.classList.remove('chilean', 'settled');
    applyPosition(tile, positions[index]);
  });
}

function arrangeGrid(restoreOrder = true) {
  arrangement = 'grid';
  resizeCanvas();
  if (restoreOrder || gridOrder.length !== items.length) gridOrder = items.map((_, index) => index);
  const slots = gridPositions(Math.max(items.length, ...gridOrder.map(slot => slot + 1)), canvas.clientWidth);
  positions = gridOrder.map((slot, index) => ({ ...slots[slot], angle: cardTilt(index) }));
  [...tiles.children].forEach((tile, index) => {
    tile.classList.remove('chilean', 'settled');
    applyPosition(tile, positions[index]);
  });
}

// Only add/remove when the input length changes. Surviving cards keep identity.
function syncCards(values) {
  const existingCount = tiles.children.length;
  gridOrder = gridOrder.slice(0, values.length);
  const usedSlots = new Set(gridOrder);
  while (gridOrder.length < values.length) {
    let slot = 0;
    while (usedSlots.has(slot)) slot++;
    gridOrder.push(slot);
    usedSlots.add(slot);
  }
  while (tiles.children.length > values.length) tiles.lastElementChild.remove();
  while (tiles.children.length < values.length) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('role', 'listitem');
    tiles.append(tile);
  }
  items = values;
  emptyState.hidden = values.length > 0;
  [...tiles.children].forEach((tile, index) => {
    if (tile.textContent !== values[index]) tile.textContent = values[index];
    tile.title = values[index];
  });
  resizeCanvas();
  if (existingCount !== values.length || positions.length !== values.length) arrangeGrid(false);
}

function clearResult() {
  stopFollowing();
  $('status').className = 'status';
  $('status').textContent = '● UNSORTED';
  stage.classList.remove('finished');
  $('result').className = 'result';
  $('result').textContent = 'Ready to make a geographical mistake.';
  $('width-value').textContent = 'Too much';
  $('sorted-value').textContent = 'Who cares.';
  $('stage-caption').textContent = 'A perfectly ordinary mess.';
  $('sort').innerHTML = 'ChileSort <span>↓</span>';
}

function unlock() {
  input.disabled = false;
  $('shuffle').disabled = false;
}

function reset() {
  run++;
  mode = 'idle';
  unlock();
  clearResult();
  const values = validate();
  if (values) { syncCards(values); arrangeGrid(); }
  scrollToTop(run);
}

function editInput() {
  run++;
  mode = 'idle';
  unlock();
  clearResult();
  const values = validate();
  if (!values) return;
  syncCards(values);
  arrangeGrid(false);
}

async function sort() {
  if (mode === 'running') return;
  const values = validate();
  if (!values || !values.length) return;
  // Never rebuild or scatter on Sort. These exact nodes move from where they are.
  syncCards(values);
  const column = chileSort(values);
  const currentRun = ++run;
  mode = 'running';
  arrangement = 'column';
  resizeCanvas();
  input.disabled = true;
  $('shuffle').disabled = true;
  $('sort').disabled = true;
  $('sort').innerHTML = 'Going south… <span>↓</span>';
  $('status').className = 'status';
  $('status').textContent = '● CHILIFYING';
  stage.classList.remove('finished');
  $('result').className = 'result';
  $('result').textContent = 'Moving everything south. Please respect the borders.';
  $('stage-caption').textContent = 'The Pacific is on your left.';
  const cards = [...tiles.children];
  const duration = reducedMotion.matches ? 0 : Math.min(1400, cards.length * 65);
  const started = performance.now();
  const movements = [];
  const movingCards = [];
  startFollowing(currentRun, movingCards);
  for (let index = 0; index < cards.length; index++) {
    const delay = cards.length <= 1 ? 0 : index * duration / (cards.length - 1);
    if (!reducedMotion.matches) await wait(Math.max(0, delay - (performance.now() - started)));
    if (currentRun !== run) return { cancelled: true };
    const target = { x: (canvas.clientWidth - CARD_WIDTH) / 2, y: 44 + index * ROW_PITCH, angle: 0 };
    positions[index] = target;
    applyPosition(cards[index], target);
    cards[index].classList.add('chilean');
    // Read animations after the style change so the transform transition exists.
    const transitions = cards[index].getAnimations().filter(animation => animation.transitionProperty === 'transform');
    movingCards.push(cards[index]);
    movements.push(Promise.all(transitions.map(animation => animation.finished)).then(() => {
      if (currentRun !== run || mode !== 'running') return;
      cards[index].classList.add('settled');
    }).catch(() => { /* Reset or a layout change can cancel a transition. */ }));
  }
  await Promise.all(movements);
  if (currentRun !== run) return { cancelled: true };
  if (!await finishFollowing(currentRun)) return { cancelled: true };
  mode = 'done';
  stage.classList.add('finished');
  $('status').classList.add('done');
  $('status').textContent = '● SORTED*';
  $('width-value').textContent = '1 element';
  $('sorted-value').textContent = 'Geographically.';
  const flag = document.createElement('img');
  flag.src = 'chile-flag.svg';
  flag.alt = 'Chile flag';
  flag.className = 'chile-flag';
  flag.width = 30;
  flag.height = 20;
  $('result').replaceChildren(document.createTextNode('Sorted. '), flag);
  $('result').classList.add('done');
  $('stage-caption').textContent = '* According to geography.';
  $('sort').innerHTML = 'Sorted <span>↓</span>';
  await wait(reducedMotion.matches ? 0 : 500);
  if (currentRun !== run) return { cancelled: true };
  unlock();
  $('sort').disabled = true;
  return { rows: column, status: 'geographically sorted' };
}

input.addEventListener('input', editInput);
$('sort').addEventListener('click', sort);
$('reset').addEventListener('click', reset);
$('shuffle').addEventListener('click', () => {
  run++;
  mode = 'idle';
  unlock();
  clearResult();
  const values = validate();
  if (values) { syncCards(values); shuffleGrid(); }
});
new ResizeObserver(() => {
  const width = stage.clientWidth;
  if (width === previousWidth) return;
  const oldWidth = previousWidth;
  const oldHeight = canvas.clientHeight;
  previousWidth = width;
  if (!oldWidth) return;
  resizeCanvas();
  if (arrangement === 'grid') { arrangeGrid(false); return; }
  const height = canvas.clientHeight;
  const column = columnPositions(items.length, canvas.clientWidth);
  [...tiles.children].forEach((tile, index) => {
    const position = mode === 'done' || tile.classList.contains('chilean')
      ? column[index]
      : {
        ...positions[index],
        x: 24 + Math.max(0, positions[index].x - 24) * Math.max(0, width - 108) / Math.max(1, oldWidth - 108),
        y: 52 + Math.max(0, positions[index].y - 52) * Math.max(0, height - 142) / Math.max(1, oldHeight - 142)
      };
    positions[index] = position;
    applyPosition(tile, position);
  });
}).observe(stage);
reset();
document.fonts.ready.then(() => {
  [...tiles.children].forEach((tile, index) => {
    if (positions[index]) applyPosition(tile, positions[index]);
  });
});

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'chilesort_array',
      description: 'Arrange the supplied array into a single vertical column in the ChileSort playground, preserving its order.',
      inputSchema: { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1, maxLength: 12 } } }, required: ['items'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(args) {
        if (!args || !Array.isArray(args.items) || !args.items.length || args.items.some(item => typeof item !== 'string' || !item.trim() || [...item].length > 12 || item.includes(','))) throw new Error('Use nonempty strings, at most 12 characters each, without commas.');
        if (mode === 'running') throw new Error('ChileSort is already running.');
        input.value = args.items.join(', ');
        editInput();
        return await sort();
      }
    }, { signal: lifecycle.signal })).catch(() => {});
    addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch { /* Ordinary browsers do not need WebMCP. */ }
}
