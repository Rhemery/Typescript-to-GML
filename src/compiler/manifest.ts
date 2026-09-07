import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { VERSION } from "../version.js";

export interface Manifest {
  formatVersion: 1;
  compilerVersion: string;
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      (parsed.formatVersion !== undefined && parsed.formatVersion !== 1)) {
      throw new Error(`Invalid or unsupported manifest format: ${manifestPath}`);
    }
    for (const key of ["files", "folders", "resources", "roomCreationCodes"] as const) {
      const entries = parsed[key];
      if (entries !== undefined && (!Array.isArray(entries) || entries.some((entry) =>
        !isManifestPath(entry)
      ))) throw new Error(`Invalid manifest ${key}: ${manifestPath}`);
    }
    if (parsed.compilerVersion !== undefined && (typeof parsed.compilerVersion !== "string" || !parsed.compilerVersion)) {
      throw new Error(`Invalid manifest compilerVersion: ${manifestPath}`);
    }
    return {
      formatVersion: 1,
      compilerVersion: parsed.compilerVersion ?? VERSION,
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
        formatVersion: 1,
        compilerVersion: VERSION,
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

export function hashGeneratedContents(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function readStringRecord(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.entries(value).some(([key, hash]) => !isManifestPath(key) ||
      typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash))) {
    throw new Error("Invalid manifest generatedFileHashes; expected relative paths and SHA-256 hashes.");
  }
  return value as Record<string, string>;
}

function readObjectVariables(value: unknown): Record<string, string[]> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.entries(value).some(([key, names]) => !isManifestPath(key) || !Array.isArray(names) ||
      names.some((name) => typeof name !== "string" || !name))) {
    throw new Error("Invalid manifest objectVariables; expected resource names and arrays of variable names.");
  }
  return value as Record<string, string[]>;
}

function isManifestPath(value: unknown): value is string {
  return typeof value === "string" && !/[\\:\x00]/.test(value) &&
    value.split("/").every((part) => !!part && part !== ".." && part !== ".");
}
