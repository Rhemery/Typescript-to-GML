import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export function sameFilePath(left: string, right: string): boolean {
  const normalize = (value: string): string => process.platform === "win32"
    ? path.resolve(value).toLowerCase()
    : path.resolve(value);
  return normalize(left) === normalize(right);
}

export async function atomicWriteFile(fileName: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(fileName), { recursive: true });
  const temporary = `${fileName}.${process.pid}.${randomUUID()}.tmp`;
  try {
    const previous = await fs.stat(fileName).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    const handle = await fs.open(temporary, "wx", previous?.mode);
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally { await handle.close(); }
    const deadline = Date.now() + 2_000;
    while (true) {
      try { await fs.rename(temporary, fileName); break; }
      catch (error) {
        if (!["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "") || Date.now() >= deadline) throw error;
        // Windows readers and antivirus scanners can briefly deny replacement.
        // Keep the old destination intact while waiting; never unlink it first.
        await delay(25);
      }
    }
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
