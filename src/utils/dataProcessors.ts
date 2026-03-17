export const groupBy = (arr: Record<string, any>[], key: string): Record<string, Record<string, any>[]> => {
  const m: Record<string, Record<string, any>[]> = {};
  arr.forEach(r => {
    const k = (r[key] || '').toString().trim() || '(blank)';
    (m[k] = m[k] || []).push(r);
  });
  return m;
};

export const sumBy = (arr: Record<string, any>[], key: string): number =>
  arr.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);

export const avgBy = (arr: Record<string, any>[], key: string): number => {
  const v = arr.map(r => parseFloat(r[key])).filter(x => !isNaN(x) && x !== 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};

export const topN = (obj: Record<string, number>, n = 10): [string, number][] =>
  Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

export const parseDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = v.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || /T\d{2}:/.test(s)) return new Date(s);
  return null;
};

export const excelDate = (v: any): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === 'number' && v > 25000 && v < 60000) return new Date((v - 25569) * 864e5);
  return parseDate(v);
};
