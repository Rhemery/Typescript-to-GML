import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { atomicWriteFile } from "../files.js";

interface JournalEntry { path: string; before: string | null; after: string | null }

export function projectFilePath(directory: string, relative: string): string {
  const result = path.resolve(directory, relative);
  const local = path.relative(path.resolve(directory), result);
  if (!local || local === ".." || local.startsWith(`..${path.sep}`) || path.isAbsolute(local)) {
    throw new Error(`Generated path escapes the GameMaker project: ${relative}`);
  }
  return result;
}

export async function withProjectLock<T>(projectFile: string, action: () => Promise<T>): Promise<T> {
  const directory = path.dirname(path.resolve(projectFile));
  const stateDirectory = path.join(directory, ".ts2gml");
  await validatedProjectFile(directory, ".ts2gml/build.lock");
  await fs.mkdir(stateDirectory, { recursive: true });
  const lock = path.join(stateDirectory, "build.lock");
  const owner = `${process.pid}:${randomUUID()}`;
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await fs.writeFile(lock, owner, { flag: "wx" });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let current: string;
      try { current = await fs.readFile(lock, "utf8"); }
      catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw readError;
      }
      const pid = Number(current.split(":")[0]);
      if (Number.isSafeInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); }
        catch (aliveError) {
          if ((aliveError as NodeJS.ErrnoException).code === "ESRCH") {
            // Serialize stale-owner recovery separately from normal lock acquisition.
            const recoveryLock = `${lock}.recovery`;
            let recovery;
            try { recovery = await fs.open(recoveryLock, "wx"); }
            catch (recoveryError) {
              if ((recoveryError as NodeJS.ErrnoException).code !== "EEXIST") throw recoveryError;
            }
            if (recovery) {
              try {
                if (await fs.readFile(lock, "utf8").catch(() => "") === current) await fs.rm(lock, { force: true });
              } finally {
                await recovery.close();
                await fs.rm(recoveryLock, { force: true });
              }
              continue;
            }
          }
        }
      }
      if (Date.now() >= deadline) throw new Error(`Another compiler owns ${lock}. Wait for it to finish; owner: ${current || "initializing"}.`);
      await delay(50);
    }
  }
  try {
    await recoverProjectFiles(directory);
    return await action();
  } finally {
    if (await fs.readFile(lock, "utf8").catch(() => "") === owner) await fs.rm(lock, { force: true });
  }
}

export async function recoverProjectFiles(directory: string): Promise<void> {
  const journalPath = await validatedProjectFile(directory, ".ts2gml/pending-write.json");
  let source: string;
  try { source = await fs.readFile(journalPath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const journal = JSON.parse(source) as { version?: number; entries?: JournalEntry[] };
  if (!journal || journal.version !== 1 || !Array.isArray(journal.entries) || journal.entries.some((entry) =>
    !entry || typeof entry.path !== "string" ||
    (entry.before !== null && typeof entry.before !== "string") ||
    (entry.after !== null && typeof entry.after !== "string"))) {
    throw new Error(`Invalid recovery journal: ${journalPath}`);
  }
  if (new Set(journal.entries.map((entry) => entry.path)).size !== journal.entries.length ||
    journal.entries.some((entry) => entry.path === ".ts2gml/pending-write.json" || entry.path.startsWith(".ts2gml/build.lock"))) {
    throw new Error(`Invalid recovery journal destinations: ${journalPath}`);
  }
  // Validate every destination before restoring any of them. An IDE save after
  // a crash must never be silently replaced by an older project snapshot.
  for (const entry of journal.entries) {
    const file = await validatedProjectFile(directory, entry.path);
    const current = await readContents(file);
    if (current !== entry.before && current !== entry.after) {
      throw new Error(`Cannot recover '${entry.path}': it changed after the interrupted build. Preserve the recovery journal at ${journalPath} and reconcile this file first.`);
    }
  }
  for (const entry of [...journal.entries].reverse()) {
    const file = projectFilePath(directory, entry.path);
    if (await readContents(file) === entry.before) continue;
    if (entry.before === null) await fs.rm(file, { force: true });
    else await atomicWriteFile(file, entry.before);
  }
  await fs.rm(journalPath);
}

export async function commitProjectFiles(
  directory: string,
  writes: ReadonlyMap<string, string>,
  deletions: readonly string[],
  afterWrite?: (relativePath: string) => void,
): Promise<void> {
  const entries: JournalEntry[] = [];
  for (const relative of new Set([...writes.keys(), ...deletions])) {
    if (relative === ".ts2gml/pending-write.json" || relative.startsWith(".ts2gml/build.lock")) {
      throw new Error(`Cannot generate a compiler coordination file: ${relative}`);
    }
    const file = await validatedProjectFile(directory, relative);
    const before = await readContents(file);
    const after = writes.get(relative) ?? null;
    if (before !== after) entries.push({ path: relative, before, after });
  }
  if (entries.length === 0) return;
  const journalPath = await validatedProjectFile(directory, ".ts2gml/pending-write.json");
  await atomicWriteFile(journalPath, `${JSON.stringify({ version: 1, entries })}\n`);
  try {
    for (const entry of entries) {
      const file = projectFilePath(directory, entry.path);
      if (entry.after === null) await fs.rm(file, { force: true });
      else await atomicWriteFile(file, entry.after);
      if (entry.after !== null && entry.path.endsWith(".sh")) await fs.chmod(file, 0o755);
      afterWrite?.(entry.path);
    }
    await fs.rm(journalPath);
  } catch (error) {
    await recoverProjectFiles(directory);
    throw error;
  }
}

async function validatedProjectFile(directory: string, relative: string): Promise<string> {
  const file = projectFilePath(directory, relative);
  let parent = file;
  while (parent !== path.resolve(directory)) {
    const stat = await fs.lstat(parent).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (stat?.isSymbolicLink()) throw new Error(`Generated path traverses a symbolic link: ${relative}`);
    parent = path.dirname(parent);
  }
  return file;
}

async function readContents(file: string): Promise<string | null> {
  try { return await fs.readFile(file, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
