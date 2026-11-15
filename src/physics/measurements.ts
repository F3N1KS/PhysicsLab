/** Geometric angles to the positive axes, in degrees. A zero vector has no direction. */
export function velocityAngles(vx: number, vy: number) {
  const speed = Math.hypot(vx, vy);
  if (speed === 0 || !Number.isFinite(speed))
    return { thetaX: null, thetaY: null };
  const angle = (component: number) =>
    (Math.acos(Math.max(-1, Math.min(1, component / speed))) * 180) / Math.PI;
  return { thetaX: angle(vx), thetaY: angle(vy) };
}
