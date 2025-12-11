export const toNumber = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const safe = <T,>(arr: T[] | null | undefined): T[] => Array.isArray(arr) ? arr : [];
