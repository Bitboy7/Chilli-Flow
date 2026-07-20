export function comparisonGains(
  aLufs: number | null | undefined,
  bLufs: number | null | undefined,
  enabled: boolean,
) {
  if (!enabled || aLufs == null || bLufs == null || !Number.isFinite(aLufs) || !Number.isFinite(bLufs)) {
    return { a: 1, b: 1 };
  }
  const target = Math.min(aLufs, bLufs);
  return {
    a: Math.min(1, 10 ** ((target - aLufs) / 20)),
    b: Math.min(1, 10 ** ((target - bLufs) / 20)),
  };
}
