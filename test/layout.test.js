import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_WIDTH, CARD_HEIGHT, ROW_PITCH, canvasHeight, columnPositions, scatteredPositions, gridPositions, gridHeight, GRID_ROW_PITCH, shuffleOrder } from '../dist/layout.js';
import { ease, sampleMotion, intersectsViewport, intersectsColumn } from '../dist/motion.js';

test('initial layout keeps four cards per row and adds complete new rows', () => {
  for (const width of [340, 424, 720]) {
    const positions = gridPositions(60, width);
    assert.equal(new Set(positions.slice(0, 4).map(p => p.y)).size, 1);
    assert.equal(new Set(positions.slice(0, 4).map(p => p.x)).size, 4);
    assert.ok(positions[0].x >= 24);
    assert.ok(positions[3].x + CARD_WIDTH <= width - 24);
    assert.equal(positions[0].x, width - positions[3].x - CARD_WIDTH);
    assert.equal(positions[4].y - positions[0].y, GRID_ROW_PITCH);
    assert.ok(positions.every(p => p.angle === 0));
    assert.ok(positions.at(-1).y + CARD_HEIGHT < gridHeight(60));
    assert.deepEqual(gridPositions(61, width).slice(0, 60), positions);
    for (const count of [1, 2, 3, 5, 6, 7, 11]) {
      assert.deepEqual(gridPositions(count + 1, width).slice(0, count), gridPositions(count, width));
    }
  }
  assert.equal(gridHeight(60), gridHeight(59));
  assert.equal(gridHeight(61) - gridHeight(60), GRID_ROW_PITCH);
});

test('shuffle only permutes existing grid slots, including partial rows and duplicates', () => {
  for (const count of [0, 1, 2, 5, 12, 61, 200]) {
    const order = shuffleOrder(count, () => .999);
    assert.deepEqual([...order].sort((a,b) => a-b), Array.from({length:count},(_,index)=>index));
    if (count > 1) assert.notDeepEqual(order, Array.from({length:count},(_,index)=>index));
    const slots = gridPositions(count, 720);
    const targets = order.map(index => slots[index]);
    assert.equal(new Set(targets.map(p=>`${p.x},${p.y}`)).size, count);
    assert.ok(targets.every(p=>p.angle === 0));
  }
});

test('long columns grow without shrinking cards or their spacing', () => {
  for (const width of [180, 340, 720]) for (const count of [1, 12, 25, 200, 1000]) {
    const height = canvasHeight(count, width);
    const positions = columnPositions(count, width);
    assert.equal(positions.length, count);
    assert.ok(positions.at(-1).y + CARD_HEIGHT < height - 40);
    positions.forEach((position, index) => {
      assert.equal(position.x, (width - CARD_WIDTH) / 2);
      if (index) assert.equal(position.y - positions[index - 1].y, ROW_PITCH);
    });
  }
});

test('scattered cards remain in bounds in narrow and long canvases', () => {
  let seed = 123;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const width of [180, 340, 720]) for (const count of [1, 12, 25, 200, 1000]) {
    const height = canvasHeight(count, width);
    const positions = scatteredPositions(count, width, height, random);
    assert.equal(positions.length, count);
    positions.forEach(position => {
      assert.ok(position.x >= 8 && position.x + CARD_WIDTH <= width - 8);
      assert.ok(position.y >= 40 && position.y + CARD_HEIGHT < height - 30);
    });
    const next = scatteredPositions(count, width, height, random);
    assert.notDeepEqual(next, positions);
  }
});

test('motion keeps exact endpoints, waits for its start and resumes without a jump', () => {
  const from = { x: 10, y: 40, angle: -3 };
  const to = { x: 300, y: 1000, angle: 0 };
  const motion = { from, to, start: 100, duration: 650 };
  const output = {};
  assert.equal(sampleMotion(motion, 99, output), false);
  assert.deepEqual(output, from);
  sampleMotion(motion, 350, output);
  const interrupted = { ...output };
  assert.ok(output.y > from.y && output.y < to.y);
  sampleMotion({ from: interrupted, to: from, start: 350, duration: 650 }, 350, output);
  assert.deepEqual(output, interrupted);
  assert.equal(sampleMotion(motion, 750, output), true);
  assert.deepEqual(output, to);
  assert.equal(sampleMotion({ ...motion, duration: 0 }, 99, output), false);
  assert.equal(sampleMotion({ ...motion, duration: 0 }, 100, output), true);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  let previous = 0;
  for (let step = 1; step <= 1000; step++) {
    const value = ease(step / 1000);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
});

test('a 4270-card column renders only a nearby window, including its final card', () => {
  const column = columnPositions(4270, 720);
  for (const top of [0, 40000, canvasHeight(4270) - 490]) {
    const visible = column.filter(p => intersectsViewport(p, 160, CARD_HEIGHT, top, 490));
    assert.ok(visible.length > 0 && visible.length < 30);
  }
  assert.ok(intersectsViewport(column.at(-1), 160, CARD_HEIGHT, canvasHeight(4270) - 490, 490));
  assert.ok(intersectsColumn(column[0], 160, CARD_HEIGHT, 360, CARD_WIDTH));
  assert.equal(intersectsColumn({ x: 0, y: 0, angle: -3 }, 60, CARD_HEIGHT, 360, CARD_WIDTH), false);
});
