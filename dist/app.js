import { chileSort, MAX_ITEMS, validateItems } from './chilesort.js';
import { CARD_WIDTH, CARD_HEIGHT, MIN_GRID_WIDTH, canvasHeight, columnPositions, shuffleOrder, gridPositions, gridHeight } from './layout.js';
import { MOVE_DURATION, sampleMotion, intersectsViewport, intersectsColumn } from './motion.js';

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
let renderFrame = 0;
let followTarget = 0;
let motions = [];
let cards = [];
let sortLaunches = [];
let sortCompletion = null;
let resetScroll = null;
let viewportWidth = 0;
let viewportHeight = 0;
let contentHeight = 0;
const cardWidths = new WeakMap();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cardTilt = index => [-3, 2, -2, 3, 1, -1][index % 6];

function stopFollowing() {
  resetScroll = null;
  followTarget = 0;
  sortCompletion?.resolve(false);
  sortCompletion = null;
}

function scrollToTop(currentRun) {
  resetScroll = { run: currentRun, from: stage.scrollTop, start: performance.now() };
  requestRender();
}

function samplePositions(time) {
  let active = false;
  for (let index = 0; index < motions.length; index++) {
    if (!motions[index]) continue;
    if (sampleMotion(motions[index], time, positions[index])) motions[index] = null;
    else active = true;
  }
  return active;
}

function requestRender() {
  if (!renderFrame) renderFrame = requestAnimationFrame(render);
}

function moveCards(targets, stagger = 0) {
  const now = performance.now();
  samplePositions(now);
  motions = targets.map((to, index) => {
    const from = positions[index] ? { ...positions[index] } : { ...to };
    const start = now + (targets.length <= 1 ? 0 : index * stagger / (targets.length - 1));
    if (mode === 'running') sortLaunches[index] = start;
    const unchanged = from.x === to.x && from.y === to.y && from.angle === to.angle;
    return { from, to, start, duration: reducedMotion.matches || unchanged ? 0 : MOVE_DURATION };
  });
  positions = targets.map((to, index) => positions[index] || { ...to });
  requestRender();
}

function render(time) {
  renderFrame = 0;
  const active = samplePositions(time);
  let scrollTop = stage.scrollTop;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (resetScroll?.run === run) {
    const progress = reducedMotion.matches ? 1 : Math.min(1, (time - resetScroll.start) / 450);
    scrollTop = resetScroll.from * (1 - progress) ** 3;
    if (progress === 1) resetScroll = null;
    stage.scrollTop = scrollTop;
  }
  if (mode === 'running') {
    let frontier = 0;
    for (let index = 0; index < cards.length; index++) {
      if (time < sortLaunches[index]) continue;
      if (intersectsColumn(positions[index], cardWidths.get(cards[index]), CARD_HEIGHT, viewportWidth / 2, CARD_WIDTH)) {
        frontier = Math.max(frontier, positions[index].y + CARD_HEIGHT / 2);
      }
    }
    followTarget = active ? Math.max(followTarget, 0, Math.min(maxScroll, frontier - viewportHeight / 2)) : maxScroll;
    scrollTop = followTarget;
    stage.scrollTop = scrollTop;
  }
  // Keep node identity, but only give nearby cards layout and painting work.
  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const position = positions[index];
    if (!position) continue;
    const visible = intersectsViewport(position, cardWidths.get(card), CARD_HEIGHT, scrollTop, viewportHeight);
    if (card.hidden === visible) card.hidden = !visible;
    if (!visible) continue;
    const started = mode === 'done' || (mode === 'running' && time >= sortLaunches[index]);
    card.classList.toggle('chilean', started);
    card.classList.toggle('settled', started && !motions[index]);
    applyPosition(card, position);
  }
  if (!active && mode === 'running' && sortCompletion?.run === run) {
    sortCompletion.resolve(true);
    sortCompletion = null;
  }
  if (active || resetScroll) requestRender();
}

function readInput() {
  const values = input.value.split(',').map(value => value.trim()).filter(Boolean);
  validateItems(values);
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
  viewportWidth = width;
  viewportHeight = stage.clientHeight;
  canvas.style.width = `${width}px`;
  const slotCount = Math.max(items.length, ...gridOrder.map(slot => slot + 1));
  const height = arrangement === 'grid' ? gridHeight(slotCount) : canvasHeight(items.length, width);
  contentHeight = Math.max(viewportHeight, height);
  canvas.style.height = `${contentHeight}px`;
}

function applyPosition(tile, position) {
  const x = position.x + (CARD_WIDTH - cardWidths.get(tile)) / 2;
  tile.style.transform = `translate(${x}px, ${position.y}px) rotate(${position.angle}deg)`;
}

function shuffleGrid() {
  arrangement = 'grid';
  resizeCanvas();
  const order = shuffleOrder(items.length);
  const currentSlots = gridOrder.length === items.length ? gridOrder : items.map((_, index) => index);
  gridOrder = order.map(index => currentSlots[index]);
  const slots = gridPositions(Math.max(items.length, ...gridOrder.map(slot => slot + 1)), canvas.clientWidth);
  moveCards(gridOrder.map((slot, index) => ({ ...slots[slot], angle: cardTilt(index) })));
}

function arrangeGrid(restoreOrder = true) {
  arrangement = 'grid';
  resizeCanvas();
  if (restoreOrder || gridOrder.length !== items.length) gridOrder = items.map((_, index) => index);
  const slots = gridPositions(Math.max(items.length, ...gridOrder.map(slot => slot + 1)), canvas.clientWidth);
  moveCards(gridOrder.map((slot, index) => ({ ...slots[slot], angle: cardTilt(index) })));
}

function measureWidths(measuredCards) {
  const hidden = measuredCards.map(card => card.hidden);
  measuredCards.forEach(card => { card.hidden = false; });
  measuredCards.forEach(card => { cardWidths.set(card, card.offsetWidth); });
  measuredCards.forEach((card, index) => { card.hidden = hidden[index]; });
}

// Only add/remove when the input length changes. Surviving cards keep identity.
function syncCards(values) {
  if (values.length === items.length && values.every((value, index) => value === items[index])) return;
  gridOrder = gridOrder.slice(0, values.length);
  const usedSlots = new Set(gridOrder);
  let slot = 0;
  while (gridOrder.length < values.length) {
    while (usedSlots.has(slot)) slot++;
    gridOrder.push(slot);
    usedSlots.add(slot);
  }
  while (tiles.children.length > values.length) tiles.lastElementChild.remove();
  const additions = document.createDocumentFragment();
  for (let index = tiles.children.length; index < values.length; index++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.hidden = true;
    tile.setAttribute('role', 'listitem');
    additions.append(tile);
  }
  tiles.append(additions);
  items = values;
  cards = [...tiles.children];
  positions.length = Math.min(positions.length, values.length);
  motions.length = Math.min(motions.length, values.length);
  emptyState.hidden = values.length > 0;
  const changed = [];
  cards.forEach((tile, index) => {
    if (tile.textContent !== values[index]) {
      tile.textContent = values[index];
      changed.push(tile);
    }
    tile.title = values[index];
    tile.setAttribute('aria-posinset', index + 1);
    tile.setAttribute('aria-setsize', values.length);
  });
  // Measure widths together after content changes, before any transform writes.
  measureWidths(changed);
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
  stopFollowing();
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
  const duration = reducedMotion.matches ? 0 : Math.min(1400, cards.length * 65);
  const completed = new Promise(resolve => { sortCompletion = { run: currentRun, resolve }; });
  moveCards(columnPositions(items.length, viewportWidth), duration);
  if (!await completed || currentRun !== run) return { cancelled: true };
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
stage.addEventListener('scroll', requestRender, { passive: true });
new ResizeObserver(() => {
  const width = stage.clientWidth;
  if (width === previousWidth) return;
  const oldWidth = previousWidth;
  previousWidth = width;
  if (!oldWidth) return;
  resizeCanvas();
  if (arrangement === 'grid') { arrangeGrid(false); return; }
  const now = performance.now();
  samplePositions(now);
  const column = columnPositions(items.length, viewportWidth);
  if (mode === 'running') {
    motions = column.map((to, index) => {
      const existing = motions[index];
      const start = Math.max(now, sortLaunches[index]);
      const end = existing ? existing.start + existing.duration : now;
      return { from: { ...positions[index] }, to, start, duration: Math.max(0, end - start) };
    });
  } else {
    positions = column;
    motions = [];
  }
  requestRender();
}).observe(stage);
reset();
document.fonts.ready.then(() => {
  measureWidths(cards);
  requestRender();
});

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'chilesort_array',
      description: 'Arrange the supplied array into a single vertical column in the ChileSort playground, preserving its order.',
      inputSchema: { type: 'object', properties: { items: { type: 'array', minItems: 1, maxItems: MAX_ITEMS, items: { type: 'string', minLength: 1, maxLength: 12 } } }, required: ['items'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(args) {
        validateItems(args?.items);
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
