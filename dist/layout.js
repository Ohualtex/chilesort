export const CARD_WIDTH = 60;
export const CARD_HEIGHT = 34;
export const ROW_PITCH = 42;
export const GRID_COLUMNS = 4;
export const GRID_ROW_PITCH = 52;
export const GRID_EDGE_GAP = 24;
export const MIN_GRID_WIDTH = 0;

export function shuffleOrder(count, random = Math.random) {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  if (count > 1 && order.every((value, index) => value === index)) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export function gridPositions(count, width) {
  const availableWidth = Math.max(MIN_GRID_WIDTH, width);
  const pitch = (availableWidth - GRID_EDGE_GAP * 2) / GRID_COLUMNS;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / GRID_COLUMNS);
    return {
      x: GRID_EDGE_GAP + ((index % GRID_COLUMNS) + .5) * pitch - CARD_WIDTH / 2,
      y: 44 + row * GRID_ROW_PITCH,
      angle: 0
    };
  });
}

export function gridHeight(count) {
  return Math.max(490, Math.ceil(count / GRID_COLUMNS) * GRID_ROW_PITCH + 104);
}

export function canvasHeight(count, width = 720) {
  const columns = Math.max(1, Math.floor((width - 48) / 84));
  return Math.max(490, count * ROW_PITCH + 104, Math.ceil(count / columns) * 62 + 120);
}

export function columnPositions(count, width) {
  return Array.from({ length: count }, (_, index) => ({ x: (width - CARD_WIDTH) / 2, y: 44 + index * ROW_PITCH, angle: 0 }));
}

// Shuffle roomy cells, then jitter within each cell. Cards never shrink.
export function scatteredPositions(count, width, height, random = Math.random) {
  const columns = Math.max(1, Math.floor((width - 48) / 84));
  const rows = Math.max(Math.ceil(count / columns), Math.floor((height - 110) / 62));
  const cells = Array.from({ length: columns * rows }, (_, index) => index);
  for (let index = cells.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [cells[index], cells[other]] = [cells[other], cells[index]];
  }
  const pitch = (width - 48) / columns;
  return cells.slice(0, count).map(cell => ({
    x: 24 + (cell % columns + .5) * pitch - CARD_WIDTH / 2 + (random() - .5) * 8,
    y: 52 + Math.floor(cell / columns) * 62 + (random() - .5) * 8,
    angle: (random() - .5) * 10
  }));
}
