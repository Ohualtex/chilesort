export const MOVE_DURATION = 650;
export const OVERSCAN = 200;

// Sample the existing cubic-bezier(.22, .75, .2, 1) once, not per card/frame.
const curve = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
const easing = Array.from({ length: 1025 }, (_, index) => {
  const x = index / 1024;
  let low = 0, high = 1;
  for (let step = 0; step < 24; step++) {
    const t = (low + high) / 2;
    if (curve(t, .22, .2) < x) low = t;
    else high = t;
  }
  return curve((low + high) / 2, .75, 1);
});
easing[0] = 0;
easing[1024] = 1;

export function ease(progress) {
  const scaled = Math.max(0, Math.min(1, progress)) * 1024;
  const index = Math.min(1023, Math.floor(scaled));
  return easing[index] + (easing[index + 1] - easing[index]) * (scaled - index);
}

export function sampleMotion(motion, time, output) {
  const progress = time < motion.start ? 0 : motion.duration === 0 ? 1 : Math.min(1, (time - motion.start) / motion.duration);
  const amount = ease(progress);
  for (const key of ['x', 'y', 'angle']) output[key] = motion.from[key] + (motion.to[key] - motion.from[key]) * amount;
  return progress === 1;
}

export function intersectsViewport(position, width, height, top, viewportHeight) {
  const radians = position.angle * Math.PI / 180;
  const halfHeight = (Math.abs(Math.sin(radians)) * width + Math.abs(Math.cos(radians)) * height) / 2;
  const center = position.y + height / 2;
  return center + halfHeight >= top - OVERSCAN && center - halfHeight <= top + viewportHeight + OVERSCAN;
}

export function intersectsColumn(position, width, height, columnX, baseWidth) {
  const radians = position.angle * Math.PI / 180;
  const halfWidth = (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height) / 2;
  return Math.abs(position.x + baseWidth / 2 - columnX) <= halfWidth;
}
