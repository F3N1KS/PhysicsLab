import type { Flight, State } from "../physics/types";
import { clipSegment, screen } from "./camera";
import type { Camera, Size } from "./camera";
export function projectedLine(
  states: State[],
  camera: Camera,
  size: Size,
): string {
  let path = "",
    previousEnd = "";
  for (let i = 1; i < states.length; i++) {
    const a = screen(camera, size, states[i - 1].x, states[i - 1].y),
      b = screen(camera, size, states[i].x, states[i].y);
    const segment = clipSegment(a, b, size);
    if (segment) {
      const start = `${segment[0].x.toFixed(3)},${segment[0].y.toFixed(3)}`;
      const end = `${segment[1].x.toFixed(3)},${segment[1].y.toFixed(3)}`;
      // Preserve dash continuity and line joins within each visible subpath.
      path += `${start === previousEnd ? "" : `M${start}`}L${end}`;
      previousEnd = end;
    } else previousEnd = "";
  }
  return path;
}
/** Refine visible curved segments at the current screen resolution; cap work. */
export function trajectory(
  flight: Flight,
  camera: Camera,
  size: Size,
  end = flight.duration,
): State[] {
  const points: State[] = [flight.at(0)];
  let budget = 8192;
  const refine = (a: State, b: State, depth: number) => {
    const pa = screen(camera, size, a.x, a.y),
      pb = screen(camera, size, b.x, b.y);
    const mid = flight.at((a.t + b.t) / 2),
      pm = screen(camera, size, mid.x, mid.y);
    const visible = !(
      Math.max(pa.x, pb.x, pm.x) < -40 ||
      Math.min(pa.x, pb.x, pm.x) > size.w + 40 ||
      Math.max(pa.y, pb.y, pm.y) < -40 ||
      Math.min(pa.y, pb.y, pm.y) > size.h + 40
    );
    if (
      visible &&
      depth < 16 &&
      budget-- > 0 &&
      Math.hypot(pm.x - (pa.x + pb.x) / 2, pm.y - (pa.y + pb.y) / 2) > 0.35
    ) {
      refine(a, mid, depth + 1);
      refine(mid, b, depth + 1);
    } else points.push(b);
  };
  for (let i = 1; i < flight.samples.length; i++) {
    const a = flight.samples[i - 1],
      b = flight.samples[i];
    if (a.t >= end) break;
    refine(a, b.t > end ? flight.at(end) : b, 0);
  }
  return points;
}
