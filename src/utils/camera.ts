export interface Camera {
  x: number;
  y: number;
  scale: number;
}
export interface Size {
  w: number;
  h: number;
}
export const MIN_SCALE = 1e-7,
  MAX_SCALE = 1e7;
export const screen = (c: Camera, size: Size, x: number, y: number) => ({
  x: size.w / 2 + (x - c.x) * c.scale,
  y: size.h / 2 - (y - c.y) * c.scale,
});
export const world = (c: Camera, size: Size, x: number, y: number) => ({
  x: c.x + (x - size.w / 2) / c.scale,
  y: c.y - (y - size.h / 2) / c.scale,
});
export function zoomAt(
  c: Camera,
  size: Size,
  factor: number,
  x: number,
  y: number,
): Camera {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, c.scale * factor));
  const point = world(c, size, x, y);
  return {
    scale,
    x: point.x - (x - size.w / 2) / scale,
    y: point.y + (y - size.h / 2) / scale,
  };
}
export interface Point {
  x: number;
  y: number;
}
/** Move the world point at the old pinch midpoint to the new midpoint while zooming. */
export function pinchCamera(
  camera: Camera,
  size: Size,
  start: readonly [Point, Point],
  end: readonly [Point, Point],
): Camera {
  const distance = (points: readonly [Point, Point]) =>
    Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  // Keep coincident fingers finite without resetting the gesture's camera.
  const before = Math.max(1, distance(start)),
    after = Math.max(1, distance(end));
  const oldX = (start[0].x + start[1].x) / 2,
    oldY = (start[0].y + start[1].y) / 2,
    newX = (end[0].x + end[1].x) / 2,
    newY = (end[0].y + end[1].y) / 2;
  const next = zoomAt(camera, size, after / before, oldX, oldY);
  return {
    scale: next.scale,
    x: next.x - (newX - oldX) / next.scale,
    y: next.y + (newY - oldY) / next.scale,
  };
}
export function fitCamera(
  size: Size,
  minX: number,
  maxX: number,
  height: number,
): Camera {
  const scale = Math.max(
    MIN_SCALE,
    Math.min(
      MAX_SCALE,
      Math.max(1, size.w - 120) / Math.max(15, maxX - minX),
      Math.max(1, size.h - 150) / Math.max(10, height),
    ),
  );
  return {
    scale,
    x: minX + (size.w / 2 - 64) / scale,
    y: (size.h / 2 - 68) / scale,
  };
}
/** Clip before sending coordinates to SVG, including at extreme camera scales. */
export function clipSegment(
  a: { x: number; y: number },
  b: { x: number; y: number },
  size: Size,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  let lo = 0,
    hi = 1;
  for (const [p, q] of [
    [-dx, a.x + 40],
    [dx, size.w + 40 - a.x],
    [-dy, a.y + 40],
    [dy, size.h + 40 - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) lo = Math.max(lo, r);
      else hi = Math.min(hi, r);
    }
    if (lo > hi) return null;
  }
  return [
    { x: a.x + lo * dx, y: a.y + lo * dy },
    { x: a.x + hi * dx, y: a.y + hi * dy },
  ];
}
