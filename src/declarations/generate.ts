import { atomicWriteFile } from "../files.js";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import JSON5 from "json5";
import { getProjectTypesDirectory } from "../project-layout.js";

interface ParameterSpec {
  Name: string;
  Type?: string;
  Optional?: string;
  text?: string;
}

interface FunctionSpec {
  Name: string;
  ReturnType?: string;
  Deprecated?: string;
  Description?: string;
  Parameter?: ParameterSpec[];
}

interface VariableSpec {
  Name: string;
  Type?: string;
  Set?: string;
  Instance?: string;
  Deprecated?: string;
  text?: string;
}

interface ConstantSpec {
  Name: string;
  Type?: string;
  Class?: string;
  Deprecated?: string;
  text?: string;
}

interface StructureSpec {
  Name: string;
  Field?: Array<{
    Name: string;
    Type?: string;
    Set?: string;
    text?: string;
  }>;
}

interface EnumerationSpec {
  Name: string;
  Member?: Array<{ Name: string; Value?: string; Deprecated?: string; text?: string }>;
}

interface LanguageSpec {
  RuntimeVersion?: string;
  Functions?: { Function?: FunctionSpec[] };
  Variables?: { Variable?: VariableSpec[] };
  Constants?: { Constant?: ConstantSpec[] };
  Structures?: { Structure?: StructureSpec[] };
  Enumerations?: { Enumeration?: EnumerationSpec[] };
}

export interface DeclarationSummary {
  specPath: string;
  outputPath: string;
  sourceHash: string;
  runtimeVersion: string;
  functions: number;
  constants: number;
  variables: number;
  structures: number;
  enumerations: number;
}

export interface GmlSpecDiscoveryOptions {
  projectFile?: string;
  installationDirectories?: readonly string[];
  environment?: NodeJS.ProcessEnv;
}

export interface InstalledGmlSpec {
  specPath: string;
  runtimeVersion: string;
  installationDirectory: string;
  installationName: string;
  active: boolean;
  familyMatch: boolean;
  commonVersionParts: number;
}

export interface RuntimeDeclarationSyncSummary {
  outputPath: string;
  specPath: string | null;
  sourceHash: string | null;
  written: boolean;
  usedCachedDeclarations: boolean;
}

export class GmlSpecNotFoundError extends Error {
  constructor() {
    super("Could not locate GmlSpec.xml. Run 'ts2gml runtime', pass --spec, or set GAMEMAKER_GML_SPEC.");
    this.name = "GmlSpecNotFoundError";
  }
}

export class GmlSpecAmbiguityError extends Error {
  readonly candidates: readonly InstalledGmlSpec[];

  constructor(candidates: readonly InstalledGmlSpec[]) {
    super(
      `Multiple GameMaker installations are equally compatible with this project:\n${
        candidates.map((candidate) =>
          `  - ${candidate.installationName}: runtime ${candidate.runtimeVersion} (${candidate.installationDirectory})`
        ).join("\n")
      }\nRun 'ts2gml runtime' to select the installation this project uses.`,
    );
    this.name = "GmlSpecAmbiguityError";
    this.candidates = candidates;
  }
}

export class GmlSpecSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmlSpecSelectionError";
  }
}

const runtimeSelectionFileName = "runtime-selection.json";
const runtimeDeclarationFormatVersion = 5;
const runtimeDeclarationCompletionMarker = "// Runtime declaration generation complete.";

const invalidGlobalNames = new Set([
  "NaN",
  "Infinity",
  "undefined",
  "true",
  "false",
]);
const functionAliases = new Map([
  ["instanceof", "gm_instanceof"],
  ["typeof", "gm_typeof"],
]);
const globalAliases = new Map([
  ["global", "gm_global"],
]);
const authoredObjectOverloads = new Map<string, string>([
  [
    "instance_create_depth",
    "declare function instance_create_depth<T extends GMObject>(x: number, y: number, depth: number, obj: GMObjectClass<T>, var_struct?: Partial<T>): GMInstance<T>;",
  ],
  [
    "instance_create_layer",
    "declare function instance_create_layer<T extends GMObject>(x: number, y: number, layer_id: string | GM.Id.Layer, obj: GMObjectClass<T>, var_struct?: Partial<T>): GMInstance<T>;",
  ],
  [
    "instance_find",
    "declare function instance_find<T extends GMObject>(obj: GMObjectClass<T>, n: number): GMInstance<T>;",
  ],
  [
    "instance_furthest",
    "declare function instance_furthest<T extends GMObject>(x: number, y: number, obj: GMObjectClass<T>): GMInstance<T>;",
  ],
  [
    "instance_nearest",
    "declare function instance_nearest<T extends GMObject>(x: number, y: number, obj: GMObjectClass<T>): GMInstance<T>;",
  ],
]);

interface FunctionTypeSpecialization {
  typeParameters: string;
  parameterTypes: ReadonlyMap<number, string>;
  returnType: string | undefined;
}

const dataStructureAliases: ReadonlyMap<string, readonly [string, string]> = new Map([
  ["DsGrid", ["<T = unknown>", "readonly __gmDsGridType?: T"]],
  ["DsList", ["<T = unknown>", "readonly __gmDsListType?: T"]],
  ["DsMap", ["<K = unknown, V = unknown>", "readonly __gmDsMapTypes?: readonly [K, V]"]],
  ["DsPriority", ["<T = unknown>", "readonly __gmDsPriorityType?: T"]],
  ["DsQueue", ["<T = unknown>", "readonly __gmDsQueueType?: T"]],
  ["DsStack", ["<T = unknown>", "readonly __gmDsStackType?: T"]],
]);
const reservedParameterNames = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export async function generateDeclarations(
  outputFile: string,
  explicitSpecPath?: string,
): Promise<DeclarationSummary> {
  const specPath = explicitSpecPath
    ? path.resolve(explicitSpecPath)
    : await findInstalledGmlSpec();
  const xml = await fs.readFile(specPath, "utf8");
  const sourceHash = createHash("sha256").update(xml).digest("hex");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "text",
    isArray: (tagName) =>
      ["Function", "Parameter", "Variable", "Constant", "Structure", "Field", "Enumeration", "Member"].includes(tagName),
  });
  const parsed = parser.parse(xml) as { GameMakerLanguageSpec: LanguageSpec };
  const spec = parsed.GameMakerLanguageSpec;
  if (!spec) throw new Error(`${specPath} does not contain a GameMaker language specification.`);

  const functions = spec.Functions?.Function ?? [];
  const variables = spec.Variables?.Variable ?? [];
  const constants = spec.Constants?.Constant ?? [];
  const structures = spec.Structures?.Structure ?? [];
  const enumerations = spec.Enumerations?.Enumeration ?? [];
  const output = renderDeclarations({
    runtimeVersion: spec.RuntimeVersion ?? "unknown",
    sourceHash,
    functions,
    variables,
    constants,
    structures,
    enumerations,
  });

  const outputPath = path.resolve(outputFile);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await atomicWriteFile(outputPath, output);
  return {
    specPath,
    outputPath,
    sourceHash,
    runtimeVersion: spec.RuntimeVersion ?? "unknown",
    functions: functions.length,
    constants: constants.length,
    variables: variables.length,
    structures: structures.length,
    enumerations: enumerations.length,
  };
}

export function renderDeclarations(input: {
  runtimeVersion: string;
  sourceHash?: string;
  functions: FunctionSpec[];
  variables: VariableSpec[];
  constants: ConstantSpec[];
  structures: StructureSpec[];
  enumerations: EnumerationSpec[];
}): string {
  const allTypes = [
    ...input.functions.flatMap((fn) => [fn.ReturnType, ...(fn.Parameter ?? []).map((parameter) => parameter.Type)]),
    ...input.variables.map((variable) => variable.Type),
    ...input.constants.map((constant) => constant.Class ? `Constant.${constant.Class}` : constant.Type),
    ...input.structures.flatMap((structure) => (structure.Field ?? []).map((field) => field.Type)),
  ].filter((type): type is string => Boolean(type));

  const namespaces = collectNamespacedTypes(allTypes);
  const declaredStructures = new Set(input.structures.map((structure) => structure.Name));
  const lines: string[] = [
    "// Generated by typescript-to-gml from GameMaker GmlSpec.xml, including its documentation.",
    `// Declaration format version: ${runtimeDeclarationFormatVersion}`,
    `// Runtime specification version: ${input.runtimeVersion}`,
    ...(input.sourceHash ? [`// GmlSpec SHA-256: ${input.sourceHash}`] : []),
    "// Do not edit this file manually.",
    "",
    "declare namespace GM {",
    "  type RuntimeReference<Kind extends string, Name extends string = string> = number & { readonly __gmRuntimeType?: `${Kind}.${Name}` };",
    "  type AssetReference<Name extends string = string> = RuntimeReference<\"Asset\", Name>;",
    "  type IdReference<Name extends string = string> = RuntimeReference<\"Id\", Name>;",
    "  type PointerReference<Name extends string = string> = RuntimeReference<\"Pointer\", Name>;",
    "  type ConstantValue<Name extends string = string> = RuntimeReference<\"Constant\", Name>;",
  ];

  appendAliasNamespace(lines, "Asset", namespaces.Asset, "AssetReference");
  appendAliasNamespace(lines, "Id", namespaces.Id, "IdReference");
  appendAliasNamespace(lines, "Pointer", namespaces.Pointer, "PointerReference");
  appendAliasNamespace(lines, "Constant", namespaces.Constant, "ConstantValue");

  lines.push("  namespace Struct {");
  for (const structure of input.structures.filter((item) => isIdentifier(item.Name))) {
    lines.push(`    interface ${structure.Name} extends GMStruct {`);
    for (const field of structure.Field ?? []) {
      if (!isIdentifier(field.Name)) continue;
      const readOnly = field.Set === "false" ? "readonly " : "";
      appendDocumentation(lines, { description: field.text }, "      ");
      lines.push(`      ${readOnly}${field.Name}: ${mapType(field.Type)};`);
    }
    lines.push("    }");
  }
  for (const name of namespaces.Struct.filter((item) => !declaredStructures.has(item))) {
    lines.push(`    interface ${name} extends GMStruct {}`);
  }
  lines.push("  }", "}", "");

  for (const enumeration of input.enumerations.filter((item) => isIdentifier(item.Name))) {
    lines.push(`declare enum ${enumeration.Name} {`);
    for (const member of enumeration.Member ?? []) {
      if (!isIdentifier(member.Name)) continue;
      appendDocumentation(lines, {
        description: member.text,
        deprecated: member.Deprecated === "true",
      }, "  ");
      lines.push(`  ${member.Name} = ${Number(member.Value ?? 0)},`);
    }
    lines.push("}", "");
  }

  const groupedFunctions = new Map<string, FunctionSpec[]>();
  for (const fn of input.functions.filter(
    (item) => isIdentifier(item.Name) && !invalidGlobalNames.has(item.Name),
  )) {
    const declarationName = functionAliases.get(fn.Name) ?? fn.Name;
    const overloads = groupedFunctions.get(declarationName) ?? [];
    overloads.push(fn);
    groupedFunctions.set(declarationName, overloads);
  }
  for (const [name, overloads] of [...groupedFunctions].sort(([left], [right]) => left.localeCompare(right))) {
    const authoredObjectOverload = authoredObjectOverloads.get(name);
    if (authoredObjectOverload) lines.push(authoredObjectOverload);
    for (const fn of overloads) {
      const usedParameterNames = new Map<string, number>();
      const specialization = specializeDataStructureFunction(fn);
      const parameters = (fn.Parameter ?? []).map((parameter, index) => {
        const baseName = isIdentifier(parameter.Name) ? parameter.Name : `argument${index}`;
        const safeName = reservedParameterNames.has(baseName) ? `_${baseName}` : baseName;
        const occurrence = (usedParameterNames.get(safeName) ?? 0) + 1;
        usedParameterNames.set(safeName, occurrence);
        const parameterName = occurrence === 1 ? safeName : `${safeName}${occurrence}`;
        const optional = parameter.Optional === "true" ? "?" : "";
        return {
          declaration: `${parameterName}${optional}: ${
            specialization?.parameterTypes.get(index) ?? mapType(parameter.Type, "unknown[]")
          }`,
          name: parameterName,
          description: parameter.text,
        };
      });
      appendDocumentation(lines, {
        description: fn.Description,
        parameters,
        deprecated: fn.Deprecated === "true",
      });
      lines.push(`declare function ${name}${specialization?.typeParameters ?? ""}(${parameters.map((parameter) => parameter.declaration).join(", ")}): ${specialization?.returnType ?? mapType(fn.ReturnType)};`);
    }
  }
  lines.push("");

  for (const constant of input.constants
    .filter((item) => isIdentifier(item.Name) && !invalidGlobalNames.has(item.Name))
    .sort((left, right) => left.Name.localeCompare(right.Name))) {
    appendDocumentation(lines, {
      description: constant.text,
      deprecated: constant.Deprecated === "true",
    });
    const type = constant.Class
      ? `GM.Constant.${constant.Class}`
      : constant.Name === "global"
        ? "GMGlobal"
        : mapType(constant.Type);
    const declarationName = globalAliases.get(constant.Name) ?? constant.Name;
    lines.push(`declare const ${declarationName}: ${type};`);
  }
  lines.push("");

  for (const variable of input.variables
    .filter((item) => isIdentifier(item.Name) && !invalidGlobalNames.has(item.Name))
    .sort((left, right) => left.Name.localeCompare(right.Name))) {
    appendDocumentation(lines, {
      description: variable.text,
      deprecated: variable.Deprecated === "true",
    });
    const declaration = variable.Set === "false" ? "const" : "let";
    lines.push(`declare ${declaration} ${variable.Name}: ${mapType(variable.Type)};`);
  }
  lines.push("", "interface GMObject {");
  for (const variable of input.variables
    .filter((item) => item.Instance === "true" && isIdentifier(item.Name))
    .sort((left, right) => left.Name.localeCompare(right.Name))) {
    const readOnly = variable.Set === "false" ? "readonly " : "";
    appendDocumentation(lines, {
      description: variable.text,
      deprecated: variable.Deprecated === "true",
    }, "  ");
    lines.push(`  ${readOnly}${variable.Name}: ${mapType(variable.Type)};`);
  }
  lines.push("}", "", runtimeDeclarationCompletionMarker);
  return `${lines.join("\n")}\n`;
}

export async function ensureProjectRuntimeDeclarations(
  projectFile: string,
  discoveryOptions: GmlSpecDiscoveryOptions = {},
): Promise<RuntimeDeclarationSyncSummary> {
  const projectPath = path.resolve(projectFile);
  const outputPath = path.join(
    getProjectTypesDirectory(path.dirname(projectPath)),
    "gamemaker.generated.d.ts",
  );
  let existingDeclarations: string | undefined;
  try {
    existingDeclarations = await fs.readFile(outputPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  let specPath: string;
  try {
    specPath = await findInstalledGmlSpec({ ...discoveryOptions, projectFile: projectPath });
  } catch (error) {
    if (error instanceof GmlSpecNotFoundError && existingDeclarations !== undefined) {
      return {
        outputPath,
        specPath: null,
        sourceHash: null,
        written: false,
        usedCachedDeclarations: true,
      };
    }
    if (existingDeclarations !== undefined) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `The project-local GameMaker declarations are missing and could not be generated. ${reason}`,
    );
  }

  const xml = await fs.readFile(specPath, "utf8");
  const sourceHash = createHash("sha256").update(xml).digest("hex");
  const existingHash = existingDeclarations
    ?.match(/^\/\/ GmlSpec SHA-256: ([a-f\d]{64})$/m)?.[1];
  const existingFormatVersion = Number(
    existingDeclarations?.match(/^\/\/ Declaration format version: (\d+)$/m)?.[1],
  );
  if (
    existingHash === sourceHash &&
    existingFormatVersion === runtimeDeclarationFormatVersion &&
    existingDeclarations?.trimEnd().endsWith(runtimeDeclarationCompletionMarker)
  ) {
    return {
      outputPath,
      specPath,
      sourceHash,
      written: false,
      usedCachedDeclarations: false,
    };
  }

  await generateDeclarations(outputPath, specPath);
  return {
    outputPath,
    specPath,
    sourceHash,
    written: true,
    usedCachedDeclarations: false,
  };
}

export async function findInstalledGmlSpec(
  options: GmlSpecDiscoveryOptions = {},
): Promise<string> {
  const environment = options.environment ?? process.env;
  const environmentPath = environment.GAMEMAKER_GML_SPEC;
  if (environmentPath) {
    await fs.access(environmentPath);
    return path.resolve(environmentPath);
  }

  const candidates = await discoverInstalledGmlSpecs(options);
  if (candidates.length === 0) throw new GmlSpecNotFoundError();

  if (options.projectFile) {
    const selectionPath = getRuntimeSelectionPath(options.projectFile);
    try {
      const selection = JSON.parse(await fs.readFile(selectionPath, "utf8")) as {
        installationDirectory?: unknown;
      };
      if (typeof selection.installationDirectory !== "string") {
        throw new GmlSpecSelectionError(
          `${selectionPath} does not contain a valid GameMaker installation selection. Run 'ts2gml runtime --auto' to remove it.`,
        );
      }
      const matching = candidates.filter((candidate) =>
        normalizeFileSystemPath(candidate.installationDirectory) ===
          normalizeFileSystemPath(selection.installationDirectory as string)
      );
      if (matching.length === 0) {
        throw new GmlSpecSelectionError(
          `The selected GameMaker installation is unavailable: ${selection.installationDirectory}. Run 'ts2gml runtime' to choose another installation or 'ts2gml runtime --auto' to restore automatic selection.`,
        );
      }
      return matching[0]!.specPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const hasCompatibleFamily = candidates.some((candidate) => candidate.familyMatch);
  let bestCandidates = candidates.filter((candidate) =>
    !hasCompatibleFamily || candidate.familyMatch
  );
  const mostCommonVersionParts = Math.max(
    ...bestCandidates.map((candidate) => candidate.commonVersionParts),
  );
  bestCandidates = bestCandidates.filter((candidate) =>
    candidate.commonVersionParts === mostCommonVersionParts
  );
  if (bestCandidates.some((candidate) => candidate.active)) {
    bestCandidates = bestCandidates.filter((candidate) => candidate.active);
  }
  if (bestCandidates.length === 1) return bestCandidates[0]!.specPath;

  const hashes = await Promise.all(
    bestCandidates.map(async (candidate) =>
      createHash("sha256").update(await fs.readFile(candidate.specPath)).digest("hex")
    ),
  );
  if (hashes.every((hash) => hash === hashes[0])) return bestCandidates[0]!.specPath;
  throw new GmlSpecAmbiguityError(bestCandidates);
}

export async function discoverInstalledGmlSpecs(
  options: GmlSpecDiscoveryOptions = {},
): Promise<InstalledGmlSpec[]> {
  const environment = options.environment ?? process.env;

  let installationDirectories: string[];
  if (options.installationDirectories) {
    installationDirectories = options.installationDirectories.map((directory) =>
      path.resolve(directory)
    );
  } else {
    const searchDirectories = process.platform === "win32"
      ? [environment.ProgramData ?? environment.PROGRAMDATA].filter(
        (directory): directory is string => Boolean(directory),
      )
      : process.platform === "darwin"
        ? ["/Users/Shared"]
        : [
          "/var/opt",
          environment.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
          environment.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"),
        ];
    installationDirectories = [];
    for (const searchDirectory of searchDirectories) {
      try {
        const entries = await fs.readdir(searchDirectory, { withFileTypes: true });
        installationDirectories.push(
          ...entries
            .filter((entry) =>
              entry.isDirectory() && entry.name.startsWith("GameMakerStudio2")
            )
            .map((entry) => path.join(searchDirectory, entry.name)),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  const candidates: Array<InstalledGmlSpec & {
    versionParts: number[];
  }> = [];
  const seenSpecPaths = new Set<string>();
  let projectIdeVersion = "";
  if (options.projectFile) {
    const project = JSON5.parse(await fs.readFile(options.projectFile, "utf8")) as {
      MetaData?: { IDEVersion?: unknown };
    };
    if (typeof project.MetaData?.IDEVersion === "string") {
      projectIdeVersion = project.MetaData.IDEVersion;
    }
  }
  const ideVersionParts = (projectIdeVersion.match(/\d+/g) ?? []).map(Number);

  for (const installationDirectory of installationDirectories.sort((left, right) =>
    left.localeCompare(right)
  )) {
    let foundActiveRuntime = false;
    try {
      const runtime = JSON.parse(
        await fs.readFile(path.join(installationDirectory, "runtime.json"), "utf8"),
      ) as Record<string, string>;
      const active = runtime.active;
      const runtimeEntry = active ? runtime[active] : undefined;
      if (active && runtimeEntry) {
        const specPath = path.resolve(
          runtimeEntry.split("&", 1)[0]!,
          "GmlSpec.xml",
        );
        await fs.access(specPath);
        const normalizedPath = process.platform === "win32" ? specPath.toLowerCase() : specPath;
        seenSpecPaths.add(normalizedPath);
        const versionParts = (active.match(/\d+/g) ?? []).map(Number);
        let commonVersionParts = 0;
        while (
          commonVersionParts < ideVersionParts.length &&
          commonVersionParts < versionParts.length &&
          ideVersionParts[commonVersionParts] === versionParts[commonVersionParts]
        ) {
          commonVersionParts += 1;
        }
        candidates.push({
          specPath,
          runtimeVersion: active,
          versionParts,
          active: true,
          installationDirectory,
          installationName: path.basename(installationDirectory),
          familyMatch: ideVersionParts.length >= 2 && commonVersionParts >= 2,
          commonVersionParts,
        });
        foundActiveRuntime = true;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (foundActiveRuntime) continue;

    const runtimesDirectory = path.join(installationDirectory, "Cache", "runtimes");
    try {
      const runtimes = (await fs.readdir(runtimesDirectory))
        .filter((entry) => entry.startsWith("runtime-"));
      for (const runtime of runtimes) {
        const specPath = path.resolve(runtimesDirectory, runtime, "GmlSpec.xml");
        try {
          await fs.access(specPath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        const normalizedPath = process.platform === "win32" ? specPath.toLowerCase() : specPath;
        if (seenSpecPaths.has(normalizedPath)) continue;
        seenSpecPaths.add(normalizedPath);
        const runtimeVersion = runtime.slice("runtime-".length);
        const versionParts = (runtimeVersion.match(/\d+/g) ?? []).map(Number);
        let commonVersionParts = 0;
        while (
          commonVersionParts < ideVersionParts.length &&
          commonVersionParts < versionParts.length &&
          ideVersionParts[commonVersionParts] === versionParts[commonVersionParts]
        ) {
          commonVersionParts += 1;
        }
        candidates.push({
          specPath,
          runtimeVersion,
          versionParts,
          active: false,
          installationDirectory,
          installationName: path.basename(installationDirectory),
          familyMatch: ideVersionParts.length >= 2 && commonVersionParts >= 2,
          commonVersionParts,
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return candidates
    .sort((left, right) => {
      if (left.familyMatch !== right.familyMatch) return left.familyMatch ? -1 : 1;
      if (left.commonVersionParts !== right.commonVersionParts) {
        return right.commonVersionParts - left.commonVersionParts;
      }
      if (left.active !== right.active) return left.active ? -1 : 1;
      const length = Math.max(left.versionParts.length, right.versionParts.length);
      for (let index = 0; index < length; index += 1) {
        const difference = (right.versionParts[index] ?? 0) - (left.versionParts[index] ?? 0);
        if (difference !== 0) return difference;
      }
      return left.installationDirectory.localeCompare(right.installationDirectory);
    })
    .map(({ versionParts: _versionParts, ...candidate }) => candidate);
}

export async function saveProjectRuntimeSelection(
  projectFile: string,
  installationDirectory: string,
): Promise<string> {
  const selectionPath = getRuntimeSelectionPath(projectFile);
  await fs.mkdir(path.dirname(selectionPath), { recursive: true });
  await atomicWriteFile(
    selectionPath,
    `${JSON.stringify({ installationDirectory: path.resolve(installationDirectory) }, null, 2)}\n`);
  return selectionPath;
}

export async function clearProjectRuntimeSelection(projectFile: string): Promise<void> {
  await fs.rm(getRuntimeSelectionPath(projectFile), { force: true });
}

function getRuntimeSelectionPath(projectFile: string): string {
  return path.join(path.dirname(path.resolve(projectFile)), ".ts2gml", runtimeSelectionFileName);
}

function normalizeFileSystemPath(fileName: string): string {
  const resolved = path.resolve(fileName);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function collectNamespacedTypes(types: readonly string[]): Record<"Asset" | "Id" | "Pointer" | "Constant" | "Struct", string[]> {
  const values = {
    Asset: new Set<string>(),
    Id: new Set<string>(),
    Pointer: new Set<string>(),
    Constant: new Set<string>(),
    Struct: new Set<string>(),
  };
  for (const type of types) {
    for (const match of type.matchAll(/\b(Asset|Id|Pointer|Constant|Struct)\.([$A-Z_a-z][$\w]*)/g)) {
      const namespace = match[1] as keyof typeof values;
      values[namespace].add(match[2]!);
    }
  }
  return {
    Asset: [...values.Asset].sort(),
    Id: [...values.Id].sort(),
    Pointer: [...values.Pointer].sort(),
    Constant: [...values.Constant].sort(),
    Struct: [...values.Struct].sort(),
  };
}

function appendAliasNamespace(
  lines: string[],
  namespace: "Asset" | "Id" | "Pointer" | "Constant",
  names: readonly string[],
  reference: string,
): void {
  lines.push(`  namespace ${namespace} {`);
  for (const name of names.filter(isIdentifier)) {
    const dataStructure = namespace === "Id" ? dataStructureAliases.get(name) : undefined;
    if (dataStructure) {
      lines.push(
        `    type ${name}${dataStructure[0]} = ${reference}<"${name}"> & { ${dataStructure[1]} };`,
      );
      continue;
    }
    const authoredClass = namespace === "Asset" && name === "GMRoom"
      ? " | GMRoomClass"
      : namespace === "Asset" && name === "GMObject"
        ? " | GMObjectClass"
        : "";
    lines.push(`    type ${name} = ${reference}<"${name}">${authoredClass};`);
  }
  lines.push("  }");
}

function specializeDataStructureFunction(fn: FunctionSpec): FunctionTypeSpecialization | undefined {
  const name = fn.Name;
  const parameters = fn.Parameter ?? [];
  const parameterTypes = new Map<number, string>();
  const arrayFunctions = new Set([
    "array_create", "array_create_ext", "array_get", "array_set", "array_first", "array_last",
    "array_push", "array_pop", "array_shift", "array_insert", "array_copy", "array_concat",
    "array_filter", "array_filter_ext", "array_map", "array_map_ext", "array_sort",
    "array_reverse", "array_shuffle", "array_unique", "array_get_index", "array_contains",
    "array_all", "array_any", "array_contains_ext", "array_copy_while", "array_delete",
    "array_equals", "array_find_index", "array_foreach", "array_height_2d", "array_intersection",
    "array_length", "array_length_1d", "array_length_2d", "array_resize", "array_reverse_ext",
    "array_shuffle_ext", "array_union", "array_unique_ext",
  ]);
  if (arrayFunctions.has(name)) {
    const preservesElementType = ![
      "array_delete", "array_equals", "array_height_2d", "array_length", "array_length_1d",
      "array_length_2d", "array_resize", "array_reverse_ext", "array_shuffle_ext", "array_unique_ext",
    ].includes(name);
    const mutatingArrayFunctions = new Set([
      "array_set", "array_push", "array_pop", "array_shift", "array_insert", "array_copy",
      "array_filter_ext", "array_map_ext", "array_sort", "array_delete", "array_resize",
      "array_reverse_ext", "array_shuffle_ext", "array_unique_ext",
    ]);
    parameters.forEach((parameter, index) => {
      if (mapType(parameter.Type) === "GMValue[]") {
        const element = !preservesElementType ? "unknown" : index === 0 ? "T"
          : name === "array_union" ? "U" : name === "array_intersection" ? "unknown" : "NoInfer<T>";
        const readOnly = index === 0 && mutatingArrayFunctions.has(name) ? "" : "readonly ";
        parameterTypes.set(index, `${readOnly}${element}[]`);
      }
      if (["value", "argument1"].includes(parameter.Name) && mapType(parameter.Type) === "any") {
        parameterTypes.set(index, name === "array_create" ? "T" : "NoInfer<T>");
      }
      if ((name === "array_push" && index > 0) || (name === "array_insert" && index > 1)) {
        parameterTypes.set(index, "NoInfer<T>");
      }
      if (["function", "sorttype_or_function"].includes(parameter.Name)) {
        const callback = name === "array_sort" ? "boolean | ((left: T, right: T) => number)"
          : name === "array_create_ext" ? "(index: number) => T"
          : name === "array_map" ? "(value: T, index: number) => U"
          : name === "array_map_ext" ? "(value: T, index: number) => NoInfer<T>"
          : name === "array_foreach" ? "(value: T, index: number) => void"
          : "(value: T, index: number) => boolean";
        parameterTypes.set(index, callback);
      }
    });
    const elementReturns = ["array_get", "array_first", "array_last", "array_pop", "array_shift"];
    const arrayReturn = mapType(fn.ReturnType) === "GMValue[]" || name === "array_create";
    const typeParameters = !preservesElementType ? "" : ["array_map", "array_union"].includes(name)
      ? "<T, U>" : name === "array_create" ? "<T = number>" : "<T>";
    let returnType: string | undefined;
    if (elementReturns.includes(name)) returnType = "T | undefined";
    else if (arrayReturn) {
      returnType = name === "array_map" ? "U[]" : name === "array_union" ? "(T | U)[]" : "T[]";
    }
    return { typeParameters, parameterTypes, returnType };
  }
  const setHandles = (type: string, names: readonly string[]) => {
    parameters.forEach((parameter, index) => {
      if (names.includes(parameter.Name)) parameterTypes.set(index, type);
    });
  };
  const setValues = (type: string, names: readonly string[]) => {
    parameters.forEach((parameter, index) => {
      if (names.includes(parameter.Name)) parameterTypes.set(index, type);
    });
  };

  if (name.startsWith("ds_list_")) {
    if (name === "ds_list_create") {
      return { typeParameters: "<T = unknown>", parameterTypes, returnType: "GM.Id.DsList<T>" };
    }
    setHandles("GM.Id.DsList<T>", ["id", "destination", "source"]);
    setValues("NoInfer<T>", ["val", "value", "argument1", "argument2"]);
    parameters.forEach((parameter, index) => {
      if (mapType(parameter.Type) === "any") parameterTypes.set(index, "NoInfer<T>");
    });
    const returnType = name === "ds_list_find_value" ? "T | undefined" : undefined;
    return { typeParameters: "<T>", parameterTypes, returnType };
  }

  if (name.startsWith("ds_map_")) {
    if (["ds_map_create", "ds_map_secure_load", "ds_map_secure_load_buffer"].includes(name)) {
      return {
        typeParameters: "<K = unknown, V = unknown>",
        parameterTypes,
        returnType: "GM.Id.DsMap<K, V>",
      };
    }
    setHandles("GM.Id.DsMap<K, V>", ["id", "map", "destination", "source"]);
    setValues("NoInfer<K>", ["key"]);
    setValues("NoInfer<V>", ["val", "value"]);
    parameters.forEach((parameter, index) => {
      if (mapType(parameter.Type) !== "any" || parameterTypes.has(index)) return;
      parameterTypes.set(index, index === 1 ? "NoInfer<K>" : "NoInfer<V>");
    });
    const keyReturns = new Set([
      "ds_map_find_first",
      "ds_map_find_last",
      "ds_map_find_next",
      "ds_map_find_previous",
    ]);
    let returnType: string | undefined;
    if (keyReturns.has(name)) returnType = "K | undefined";
    else if (name === "ds_map_find_value") returnType = "V | undefined";
    else if (name === "ds_map_keys_to_array") returnType = "K[]";
    else if (name === "ds_map_values_to_array") returnType = "V[]";
    parameters.forEach((parameter, index) => {
      if (name === "ds_map_keys_to_array" && parameter.Name === "array") {
        parameterTypes.set(index, "K[]");
      } else if (name === "ds_map_values_to_array" && parameter.Name === "array") {
        parameterTypes.set(index, "V[]");
      }
    });
    return { typeParameters: "<K, V>", parameterTypes, returnType };
  }

  const valueStructures = [
    ["ds_grid_", "DsGrid", "index", ["val", "value"]],
    ["ds_priority_", "DsPriority", "id", ["val", "value"]],
    ["ds_queue_", "DsQueue", "id", ["val", "value", "argument1"]],
    ["ds_stack_", "DsStack", "id", ["val", "value", "argument1"]],
  ] as const;
  for (const [prefix, typeName, primaryHandle, valueNames] of valueStructures) {
    if (!name.startsWith(prefix)) continue;
    if (name === `${prefix}create`) {
      return {
        typeParameters: "<T = unknown>",
        parameterTypes,
        returnType: `GM.Id.${typeName}<T>`,
      };
    }
    setHandles(`GM.Id.${typeName}<T>`, [primaryHandle, "destination", "source", "src"]);
    setValues("NoInfer<T>", valueNames);
    parameters.forEach((parameter, index) => {
      if (mapType(parameter.Type) === "any") parameterTypes.set(index, "NoInfer<T>");
    });
    const valueReturns = new Set([
      "ds_grid_get",
      "ds_grid_get_disk_max",
      "ds_grid_get_disk_mean",
      "ds_grid_get_disk_min",
      "ds_grid_get_disk_sum",
      "ds_grid_get_max",
      "ds_grid_get_mean",
      "ds_grid_get_min",
      "ds_priority_delete_max",
      "ds_priority_delete_min",
      "ds_priority_find_max",
      "ds_priority_find_min",
      "ds_queue_dequeue",
      "ds_queue_head",
      "ds_queue_tail",
      "ds_stack_pop",
      "ds_stack_top",
    ]);
    return {
      typeParameters: "<T>",
      parameterTypes,
      returnType: valueReturns.has(name) ? "T | undefined" : undefined,
    };
  }
  return undefined;
}

function appendDocumentation(
  lines: string[],
  documentation: {
    description?: string | undefined;
    parameters?: Array<{ name: string; description?: string | undefined }>;
    deprecated?: boolean;
  },
  indent = "",
): void {
  const description = documentation.description?.trim();
  const parameters = documentation.parameters?.filter((parameter) => parameter.description?.trim()) ?? [];
  if (!description && parameters.length === 0 && !documentation.deprecated) return;

  lines.push(`${indent}/**`);
  if (description) {
    for (const line of description.split(/\r?\n/)) {
      lines.push(`${indent} * ${escapeDocumentation(line.trim())}`.trimEnd());
    }
  }
  for (const parameter of parameters) {
    const parameterDescription = parameter.description!.trim().replace(/\s+/g, " ");
    lines.push(`${indent} * @param ${parameter.name} ${escapeDocumentation(parameterDescription)}`);
  }
  if (documentation.deprecated) lines.push(`${indent} * @deprecated`);
  lines.push(`${indent} */`);
}

function escapeDocumentation(value: string): string {
  return value.replaceAll("*/", "*\\/");
}

function mapType(rawType?: string, untypedArray = "GMValue[]"): string {
  const raw = rawType?.trim();
  if (!raw) return "GMValue";
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return splitUnion(raw.slice(1, -1)).map((type) => mapType(type, untypedArray)).join(" | ");
  }
  const union = splitUnion(raw);
  if (union.length > 1) return union.map((type) => mapType(type, untypedArray)).join(" | ");
  const array = /^Array\[(.*)]$/.exec(raw);
  if (array) return `Array<${mapType(array[1], untypedArray)}>`;
  // Unspecified input elements may be authored classes or interfaces without a GMStruct index signature.
  if (raw === "Array" || raw === "Array.String") return untypedArray;

  const primitives = new Map<string, string>([
    ["Any", "any"],
    ["ArgumentIdentity", "any"],
    ["Bool", "boolean"],
    ["Function", "GMFunction"],
    ["Real", "number"],
    ["Rela", "number"],
    ["String", "string"],
    ["Struct", "GMStruct"],
    ["Undefined", "undefined"],
    ["undefined", "undefined"],
    ["Pointer", "GM.PointerReference"],
    ["Asset", "GM.AssetReference"],
  ]);
  const primitive = primitives.get(raw);
  if (primitive) return primitive;
  if (/^(Asset|Id|Pointer|Constant|Struct)\.[$A-Z_a-z][$\w]*$/.test(raw)) {
    return `GM.${raw}`;
  }
  if (/^Enum\.([$A-Z_a-z][$\w]*)$/.test(raw)) return raw.slice(5);
  if (isIdentifier(raw)) return raw;
  return "GMValue";
}

function splitUnion(type: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < type.length; index += 1) {
    const character = type[index];
    if (character === "[") depth += 1;
    else if (character === "]") depth -= 1;
    else if ((character === "," || character === "|") && depth === 0) {
      parts.push(type.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}

function isIdentifier(value: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/.test(value);
}
