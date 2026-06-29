import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

export class AuditLogger {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async log(event, details = {}) {
    const payload = {
      at: new Date().toISOString(),
      event,
      ...details
    };

    const line = `${JSON.stringify(payload)}\n`;
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, line, "utf8");
  }
}
