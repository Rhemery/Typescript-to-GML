import { promises as fs } from "node:fs";

export interface Manifest {
  files: string[];
  generatedFileHashes: Record<string, string>;
  folders: string[];
  objectVariables: Record<string, string[]>;
  resources: string[];
  roomCreationCodes: string[];
}

export async function readManifest(manifestPath: string): Promise<Manifest> {
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Partial<Manifest>;
    return {
      files: Array.isArray(parsed.files) ? parsed.files : [],
      generatedFileHashes: readStringRecord(parsed.generatedFileHashes),
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      objectVariables: readObjectVariables(parsed.objectVariables),
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      roomCreationCodes: Array.isArray(parsed.roomCreationCodes)
        ? parsed.roomCreationCodes
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        files: [],
        generatedFileHashes: {},
        folders: [],
        objectVariables: {},
        resources: [],
        roomCreationCodes: [],
      };
    }
    throw error;
  }
}

function readStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string"
    ),
  );
}

function readObjectVariables(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((name) => typeof name === "string")
      ),
  );
}
