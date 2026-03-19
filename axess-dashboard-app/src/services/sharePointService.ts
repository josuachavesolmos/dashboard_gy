import { Client } from '@microsoft/microsoft-graph-client';
import * as XLSX from 'xlsx';

export interface SharePointFileInfo {
  path: string;
  eTag?: string;
}

export class SharePointService {
  private client: Client;
  private siteId: string;
  private driveId: string;
  private eTags: Record<string, string> = {};

  constructor(accessToken: string, siteId: string, driveId: string) {
    this.siteId = siteId;
    this.driveId = driveId;
    this.client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async downloadFile(filePath: string): Promise<{ workbook: XLSX.WorkBook; changed: boolean }> {
    const endpoint = this.driveId
      ? `/drives/${this.driveId}/root:/${filePath}`
      : `/sites/${this.siteId}/drive/root:/${filePath}`;

    // Check if file changed via ETag
    const meta = await this.client.api(endpoint).get();
    const currentETag = meta.eTag || '';
    const changed = this.eTags[filePath] !== currentETag;

    if (!changed) {
      return { workbook: null as any, changed: false };
    }

    // Download content
    const content = await this.client.api(`${endpoint}:/content`).responseType('arraybuffer' as any).get();
    const data = new Uint8Array(content);
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(data, { type: 'array', cellDates: true, WTF: false });
    } catch {
      wb = XLSX.read(data, { type: 'array', cellDates: false, WTF: false });
    }

    this.eTags[filePath] = currentETag;
    return { workbook: wb, changed: true };
  }
}
