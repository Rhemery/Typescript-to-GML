import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const releasesUrl =
  "https://api.github.com/repos/Rhemery/Typescript-to-GML/releases?per_page=10";
const releasePageUrl = "https://github.com/Rhemery/Typescript-to-GML/releases";
const cacheLifetimeMilliseconds = 24 * 60 * 60 * 1_000;

interface ParsedVersion {
  core: readonly number[];
  prerelease: readonly (number | string)[];
}

interface ReleaseCache {
  checkedAt: number;
  releases: unknown[];
}

export interface AvailableUpdate {
  version: string;
  url: string;
}

export interface UpdateCheckOptions {
  cachePath?: string;
  fetcher?: typeof fetch;
  now?: number;
}

export async function checkForUpdate(
  currentVersion: string,
  options: UpdateCheckOptions = {},
): Promise<AvailableUpdate | undefined> {
  const cachePath = options.cachePath ??
    path.join(os.tmpdir(), "typescript-to-gml", "update-check.json");
  const now = options.now ?? Date.now();
  let releases: unknown[] | undefined;

  try {
    const cache = JSON.parse(await fs.readFile(cachePath, "utf8")) as Partial<ReleaseCache>;
    if (
      typeof cache.checkedAt === "number" &&
      cache.checkedAt <= now &&
      now - cache.checkedAt < cacheLifetimeMilliseconds &&
      Array.isArray(cache.releases)
    ) {
      releases = cache.releases;
    }
  } catch {
    // A missing or damaged cache is refreshed below.
  }

  if (!releases) {
    releases = [];
    try {
      const response = await (options.fetcher ?? globalThis.fetch)(releasesUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `typescript-to-gml/${currentVersion}`,
        },
        signal: AbortSignal.timeout(2_000),
      });
      const payload: unknown = response.ok ? await response.json() : undefined;
      if (Array.isArray(payload)) releases = payload;
    } catch {
      // Update checks must not interfere with compiler commands.
    }

    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, `${JSON.stringify({ checkedAt: now, releases })}\n`, "utf8");
    } catch {
      // The cache is optional, including on read-only systems.
    }
  }

  return findAvailableUpdate(currentVersion, releases);
}

export function findAvailableUpdate(
  currentVersion: string,
  releases: readonly unknown[],
): AvailableUpdate | undefined {
  const current = parseVersion(currentVersion);
  if (!current) return undefined;
  const acceptsPrereleases = current.prerelease.length > 0;
  let newest: { parsed: ParsedVersion; update: AvailableUpdate } | undefined;

  for (const value of releases) {
    if (!value || typeof value !== "object") continue;
    const release = value as Record<string, unknown>;
    if (release.draft === true || (!acceptsPrereleases && release.prerelease === true)) continue;
    if (typeof release.tag_name !== "string") continue;
    const parsed = parseVersion(release.tag_name);
    if (!parsed || (!acceptsPrereleases && parsed.prerelease.length > 0)) continue;
    if (compareVersions(parsed, current) <= 0) continue;
    if (newest && compareVersions(parsed, newest.parsed) <= 0) continue;

    newest = {
      parsed,
      update: {
        version: release.tag_name.replace(/^v/i, ""),
        url: typeof release.html_url === "string" &&
            release.html_url.startsWith(`${releasePageUrl}/`)
          ? release.html_url
          : releasePageUrl,
      },
    };
  }

  return newest?.update;
}

function parseVersion(value: string): ParsedVersion | undefined {
  const match = value.match(
    /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".").map((identifier) =>
      /^\d+$/.test(identifier) ? Number(identifier) : identifier
    ) ?? [],
  };
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  for (let index = 0; index < left.core.length; index += 1) {
    const difference = left.core[index]! - right.core[index]!;
    if (difference !== 0) return difference;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return right.prerelease.length - left.prerelease.length;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    if (typeof leftIdentifier === "number" && typeof rightIdentifier === "number") {
      return leftIdentifier - rightIdentifier;
    }
    if (typeof leftIdentifier === "number") return -1;
    if (typeof rightIdentifier === "number") return 1;
    return leftIdentifier.localeCompare(rightIdentifier);
  }
  return 0;
}
