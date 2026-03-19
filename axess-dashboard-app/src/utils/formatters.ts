export const fmt = (n: number | null | undefined, d = 0): string => {
  if (n == null || isNaN(n)) return '\u2014';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(d);
};

export const fmtCur = (n: number | null | undefined): string => {
  if (n == null || isNaN(n)) return '\u2014';
  return '$' + fmt(n);
};
