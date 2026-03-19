import * as XLSX from 'xlsx';
import { RawRow } from '../types';

export function processQuoteWorkbook(wb: XLSX.WorkBook): RawRow[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

export function processPersonnelWorkbook(wb: XLSX.WorkBook): RawRow[] {
  const sn = wb.SheetNames.find(s => s.toLowerCase().includes('planner')) || wb.SheetNames[0];
  return (XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' } as any) as RawRow[])
    .filter((r: any) => r['Technician Name']);
}

export function processMasterWorkbook(wb: XLSX.WorkBook): RawRow[] {
  let sn = wb.SheetNames.find(s => s.includes('Axess Glass'));
  if (!sn) sn = wb.SheetNames.find(s => s.toLowerCase().includes('glass'));
  if (!sn) sn = wb.SheetNames.find(s => s.toLowerCase().includes('guyana'));
  if (!sn) sn = wb.SheetNames[0];

  const ws = wb.Sheets[sn];
  if (!ws) throw new Error('Could not find data sheet in Master Project file.');

  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' } as any);
  if (!raw || raw.length < 3) throw new Error(`Sheet "${sn}" appears empty.`);

  let hi = 0;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    if (raw[i] && raw[i].some((c: any) => (c || '').toString().toLowerCase().includes('work order'))) {
      hi = i;
      break;
    }
  }

  const headers = (raw[hi] || []).map((h: any) => (h || '').toString().trim());
  const rows: RawRow[] = [];
  for (let i = hi + 1; i < raw.length; i++) {
    if (!raw[i]) continue;
    const obj: RawRow = {};
    let has = false;
    headers.forEach((h, j) => {
      if (h) {
        obj[h] = raw[i][j] ?? '';
        if (raw[i][j] != null && raw[i][j] !== '') has = true;
      }
    });
    if (has && obj['Work Order Number']) rows.push(obj);
  }
  return rows;
}

export function readFileAsWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      try {
        resolve(XLSX.read(data, { type: 'array', cellDates: true, WTF: false }));
      } catch {
        try {
          resolve(XLSX.read(data, { type: 'array', cellDates: false, WTF: false }));
        } catch (err) {
          reject(err);
        }
      }
    };
    reader.onerror = () => reject(new Error('Error reading file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}
