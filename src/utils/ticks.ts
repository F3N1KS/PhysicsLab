/** A shared, step-aware scale for SVG and analytical axes. */
export function niceStep(target: number): number {
  if (!(target > 0) || !Number.isFinite(target)) return 1;
  const power = 10 ** Math.floor(Math.log10(target));
  return (
    ([1, 2, 2.5, 5, 10].find((n) => n * power >= target * (1 - 1e-12)) ?? 10) *
    power
  );
}
export function ticks(min: number, max: number, step: number): number[] {
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min)
    return [];
  const first = Math.ceil(min / step - 1e-10);
  const count = Math.min(
    200,
    Math.max(0, Math.floor(max / step + 1e-10) - first + 1),
  );
  return Array.from({ length: count }, (_, i) => (first + i) * step);
}
export function formatTick(value: number, step: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < Math.abs(step) * 1e-8) return "0";
  let decimals = Math.max(0, -Math.floor(Math.log10(Math.abs(step) || 1)));
  while (
    decimals < 15 &&
    Math.abs(step * 10 ** decimals - Math.round(step * 10 ** decimals)) > 1e-7
  )
    decimals++;
  // Significant digits include the offset of a zoomed axis far from zero.
  if (Math.abs(value) >= 1e7 || Math.abs(value) < 1e-5 || decimals > 10) {
    const digits = Math.min(
      17,
      Math.max(1, Math.ceil(Math.log10(Math.abs(value) / Math.abs(step))) + 2),
    );
    return Number(value.toPrecision(digits))
      .toExponential()
      .replace(/\.?(0+)(?=e)/, "");
  }
  return Number(value.toFixed(decimals)).toLocaleString("ru-RU", {
    maximumFractionDigits: decimals,
    useGrouping: false,
  });
}
export function axisTicks(min: number, max: number, count = 5) {
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, 1e-6);
    min -= pad;
    max += pad;
  }
  const step = niceStep((max - min) / count);
  return { min, max, step, values: ticks(min, max, step) };
}
