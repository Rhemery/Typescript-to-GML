import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
const displayName = "TypeScript to GML";
const packageId = "ts2gml";
const projectFileName = `${displayName}.yyp`;
const resourceOrderFileName = `${displayName}.resource_order`;
// ZIP stores a timezone-free DOS timestamp. Local midnight produces identical
// header fields regardless of the machine's timezone.
const fixedArchiveTime = new Date(2000, 0, 1);

const args = process.argv.slice(2);
const takeOption = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  args.splice(index, 2);
  return value;
};
const outputFile = path.resolve(
  takeOption("--out") ?? path.join("release", `typescript-to-gml-${packageJson.version}.yymps`),
);
const ideVersion = takeOption("--ide-version") ?? "2026.0.0.16";
const publisher = takeOption("--publisher") ?? packageJson.author ?? "";
if (args.length > 0) throw new Error(`Unexpected argument(s): ${args.join(" ")}`);
if (path.extname(outputFile).toLowerCase() !== ".yymps") {
  throw new Error("The package output must use the .yymps extension.");
}

const distributionDirectory = path.resolve("dist", "ts2gml");
const distributionFiles = [];
const visit = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing to package symbolic link: ${absolute}`);
    if (entry.isDirectory()) await visit(absolute);
    else if (entry.isFile()) distributionFiles.push(absolute);
  }
};
await visit(distributionDirectory);
if (distributionFiles.length === 0) {
  throw new Error("dist/ts2gml is empty. Run npm run build before creating a YYMPS package.");
}

const includedFiles = [];
const archiveEntries = new Map();
for (const absolute of distributionFiles) {
  const relative = path.relative(distributionDirectory, absolute).split(path.sep).join("/");
  const archivePath = `datafiles/ts2gml/${relative}`;
  archiveEntries.set(archivePath, new Uint8Array(await fs.readFile(absolute)));
  includedFiles.push({
    $GMIncludedFile: "",
    "%Name": path.posix.basename(relative),
    CopyToMask: 0,
    filePath: path.posix.dirname(archivePath),
    name: path.posix.basename(relative),
    resourceType: "GMIncludedFile",
    resourceVersion: "2.0",
  });
}

const metadata = {
  package_id: packageId,
  display_name: displayName,
  version: packageJson.version,
  package_type: "asset",
  ide_version: ideVersion,
};
const resourceOrder = {
  FolderOrderSettings: [],
  ResourceOrderSettings: [],
};
const project = {
  $GMProject: "v1",
  "%Name": displayName,
  AudioGroups: [
    {
      $GMAudioGroup: "v1",
      "%Name": "audiogroup_default",
      exportDir: "",
      name: "audiogroup_default",
      resourceType: "GMAudioGroup",
      resourceVersion: "2.0",
      targets: -1,
    },
  ],
  configs: { children: [], name: "Default" },
  defaultScriptType: 1,
  Folders: [],
  ForcedPrefabProjectReferences: [],
  IncludedFiles: includedFiles,
  isEcma: false,
  LibraryEmitters: [],
  MetaData: {
    IDEVersion: ideVersion,
    PackageType: "Asset",
    PackageName: displayName,
    PackageID: packageId,
    PackagePublisher: publisher,
    PackageVersion: packageJson.version,
  },
  name: displayName,
  resources: [],
  resourceType: "GMProject",
  resourceVersion: "2.0",
  RoomOrderNodes: [],
  templateType: null,
  TextureGroups: [
    {
      $GMTextureGroup: "",
      "%Name": "Default",
      autocrop: true,
      border: 2,
      compressFormat: "bz2",
      customOptions: "",
      directory: "",
      groupParent: null,
      isScaled: true,
      loadType: "default",
      mipsToGenerate: 0,
      name: "Default",
      resourceType: "GMTextureGroup",
      resourceVersion: "2.0",
      targets: -1,
    },
  ],
};

const jsonBytes = (value) => strToU8(`${JSON.stringify(value, null, 2)}\n`);
const orderedEntries = new Map([
  ["metadata.json", jsonBytes(metadata)],
  [resourceOrderFileName, jsonBytes(resourceOrder)],
  [projectFileName, jsonBytes(project)],
  ...archiveEntries,
]);
const manifestLines = ['<?xml version="1.0" encoding="utf-8"?>', "<files>"];
for (const [archivePath, contents] of orderedEntries) {
  const md5 = createHash("md5").update(contents).digest("hex").toUpperCase();
  const manifestPath = archivePath
    .replaceAll("/", "\\")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  manifestLines.push(
    `\t<file md5="${md5}">${manifestPath}</file>`,
  );
}
manifestLines.push("</files>");
orderedEntries.set("yymanifest.xml", strToU8(`\uFEFF${manifestLines.join("\n")}\n`));

const zipEntries = {};
for (const [archivePath, contents] of orderedEntries) {
  zipEntries[archivePath] = [contents, { mtime: fixedArchiveTime }];
}
const archive = zipSync(zipEntries, { level: 9 });
await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, archive);

const extracted = unzipSync(archive);
const extractedNames = Object.keys(extracted).sort();
const expectedNames = [...orderedEntries.keys()].sort();
if (JSON.stringify(extractedNames) !== JSON.stringify(expectedNames)) {
  throw new Error("YYMPS verification failed: archive entries differ from the package plan.");
}
const extractedProject = JSON.parse(strFromU8(extracted[projectFileName]));
const packagedFiles = new Set(
  extractedProject.IncludedFiles.map((file) => `${file.filePath}/${file.name}`),
);
for (const archivePath of archiveEntries.keys()) {
  if (!packagedFiles.has(archivePath)) {
    throw new Error(`YYMPS verification failed: ${archivePath} is missing from IncludedFiles.`);
  }
}
const extractedManifest = strFromU8(extracted["yymanifest.xml"]).replace(/^\uFEFF/, "");
const manifestFiles = [...extractedManifest.matchAll(/<file md5="([A-F0-9]{32})">([^<]+)<\/file>/g)];
if (manifestFiles.length !== orderedEntries.size - 1) {
  throw new Error("YYMPS verification failed: manifest entry count is incorrect.");
}
for (const [, expectedMd5, manifestPath] of manifestFiles) {
  const archivePath = manifestPath.replaceAll("\\", "/");
  const contents = extracted[archivePath];
  if (!contents) throw new Error(`YYMPS verification failed: missing ${archivePath}.`);
  const actualMd5 = createHash("md5").update(contents).digest("hex").toUpperCase();
  if (actualMd5 !== expectedMd5) {
    throw new Error(`YYMPS verification failed: checksum mismatch for ${archivePath}.`);
  }
}

console.log(
  `Created ${outputFile} with ${distributionFiles.length} included file(s) for version ${packageJson.version}.`,
);
