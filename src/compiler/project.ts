import { atomicWriteFile } from "../files.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import JSON5 from "json5";
import ts from "typescript";
import { VERSION } from "../version.js";
import { findTypeScriptLibraries } from "../typescript-libraries.js";
import { collectNativeAccessPlan } from "./access.js";
import { extractGmlSourceMap } from "./source-maps.js";
import { commitProjectFiles, projectFilePath, withProjectLock } from "./project-state.js";
import {
  collectionRuntimeGml,
  collectionRuntimeScriptName,
  classStaticRuntimeGml,
  classStaticRuntimeScriptName,
  collectStaticClassNames,
  collectStaticReceivers,
  emitClassStatics,
  createRuntimeTypeGuardPlan,
  emitTopLevelGml,
  collectTopLevelVariableBindings,
  fromTypeScriptDiagnostic,
  parseJavaScript,
  toJavaScript,
  Ts2GmlError,
  type CompilerDiagnostic,
  validateJavaScript,
  validateGmlBindingConflicts,
  validateTopLevelVariableReferences,
  validateTypeScriptSource,
  validateRuntimeAccesses,
  usesCollectionRuntime,
  type RuntimeTypeGuardPlan,
} from "./compile.js";
import { usesValueRuntime, valueRuntimeGml, valueRuntimeScriptName } from "./values.js";
import {
  compileObjectClass,
  isObjectClass,
  validateObjectEvents,
  type CompiledObject,
} from "./object-events.js";
import {
  compileRoomClass,
  isRoomClass,
  type CompiledRoomCreationCode,
} from "./room-creation.js";
import {
  generateProjectDeclarations,
  type ProjectDeclarationSummary,
} from "../declarations/project.js";
import { ensureProjectRuntimeDeclarations } from "../declarations/generate.js";
import { readRuntimeDeclarationBindings } from "../declarations/runtime.js";
import {
  getProjectTypesDirectory,
  projectTypesInclude,
} from "../project-layout.js";
import { hashGeneratedContents, readManifest, type Manifest } from "./manifest.js";
import { isGmlIdentifier } from "./gml-identifiers.js";
import { isGameMakerProjectOpen } from "./gamemaker-ide.js";
import {
  consumeRuntimeGuardRunMarker,
  createRuntimeGuardGml,
  createRuntimeGuardHooks,
  detectRuntimeGuardConfiguration,
  ensureRuntimeGuardConfiguration,
  readRuntimeGuardConfiguration,
  resolveRuntimeGuardLevel,
  runtimeGuardHookPaths,
  runtimeGuardScriptName,
  type RuntimeGuardProfile,
  type RuntimeGuardProfileApplyOptions,
  type RuntimeGuardProfileResult,
  writeRuntimeGuardRunMarker,
} from "./runtime-guards.js";

interface SourceUnit {
  fileName: string;
  folder: string[];
  source: string;
  sourceFile: ts.SourceFile;
  typeScriptSourceFile: ts.SourceFile;
  runtimeTypeGuards?: RuntimeTypeGuardPlan;
}

interface GeneratedGlobalSymbol {
  name: string;
  fileName: string;
  scriptName: string;
}

interface GMFolder {
  folderPath: string;
  name: string;
  [name: string]: unknown;
}

interface GMProject {
  Folders?: GMFolder[];
  name: string;
  resources: Array<{ id: { name: string; path: string } }>;
  [name: string]: unknown;
}

interface GMRoomResource {
  creationCodeFile?: unknown;
  [name: string]: unknown;
}

interface GMObjectResource {
  parentObjectId?: unknown;
  properties?: unknown;
  [name: string]: unknown;
}

const roomCreationCodeFileName = "RoomCreationCode.gml";
const legacyEventScriptName = "__ts2gml_events";
const legacyEventScriptResourcePath =
  `scripts/${legacyEventScriptName}/${legacyEventScriptName}.yy`;

interface CompiledProject {
  project: GMProject;
  projectPath: string;
  projectDirectory: string;
  typeScriptDirectory: string;
  sourceFiles: string[];
  objects: CompiledObject[];
  objectResources: Map<string, GMObjectResource>;
  rooms: CompiledRoomCreationCode[];
  roomResources: Map<string, string>;
  scripts: Map<string, string>;
  assetFolders: Map<string, string[]>;
  declarations: ProjectDeclarationSummary;
}

export interface BuildSummary {
  projectPath: string;
  typescriptDirectory: string;
  sourceFiles: string[];
  objects: string[];
  rooms: string[];
  scripts: string[];
  writtenFiles: string[];
  declarations: ProjectDeclarationSummary;
}

export interface BuildOptions {
  guardConfiguration?: string;
  guardProfile?: RuntimeGuardProfile;
  hotReloadOnly?: boolean;
  ideProjectSaved?: boolean;
  /** @deprecated Managed output is always refreshed from TypeScript. */
  overwriteChangedGeneratedFiles?: boolean;
}

export interface ResourceConflict {
  assetName: string;
  assetType: "object" | "script";
  gameMakerName: string;
  gameMakerResourcePath: string;
  generatedResourcePath: string;
  typeScriptFile: string;
}

export class ResourceConflictError extends Error {
  constructor(
    readonly projectPath: string,
    readonly conflicts: readonly ResourceConflict[],
  ) {
    super(
      `Cannot generate ${conflicts.length === 1 ? "a resource" : "resources"} because both GameMaker and TypeScript claim the same asset:\n${
        conflicts.map((conflict) =>
          `  - ${conflict.assetName}\n` +
          `    GameMaker: ${conflict.gameMakerResourcePath}\n` +
          `    TypeScript: ${conflict.typeScriptFile}`
        ).join("\n")
      }\nNo generated GameMaker assets were changed. Delete the conflicting asset in GameMaker and save the project if you want ts2gml to manage it, or rename the TypeScript asset and retry.`,
    );
    this.name = "ResourceConflictError";
  }
}

export class StructuralGameMakerChangesError extends Error {
  readonly changes: readonly string[];

  constructor(changes: readonly string[]) {
    const sortedChanges = [...changes].sort();
    super(
      `Cannot apply structural GameMaker changes during a live update:\n${
        sortedChanges.map((fileName) => `  - ${fileName}`).join("\n")
      }\nNo generated GameMaker assets were changed. Save the project, then use Run/Build in GameMaker to apply the update automatically, confirm it in watch mode, or run build --project-saved.`,
    );
    this.name = "StructuralGameMakerChangesError";
    this.changes = sortedChanges;
  }
}

interface WriteOptions extends BuildOptions {
  blockStructuralChanges: boolean;
}

export interface CheckSummary {
  projectPath: string;
  typescriptDirectory: string;
  sourceFiles: string[];
  objects: string[];
  rooms: string[];
  scripts: string[];
}

export interface TypeScriptProjectSummary {
  sourceDirectory: string;
  configPath: string;
  runtimeGuardConfigPath: string;
  typeDirectory: string;
  createdConfig: boolean;
  createdRuntimeGuardConfig: boolean;
}

export async function buildGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
  options: BuildOptions = {},
): Promise<BuildSummary> {
  return withProjectLock(projectFile, async () => {
    const compiled = await compileGameMakerProject(
      inputs,
      projectFile,
      options.guardProfile ?? "build",
      options.guardConfiguration,
    );
    const blockStructuralChanges = options.hotReloadOnly ||
      (!options.ideProjectSaved && await isGameMakerProjectOpen(compiled.projectPath));
    const summary = await writeGeneratedAssets(compiled, { ...options, blockStructuralChanges });
    return {
      ...summary,
      declarations: compiled.declarations,
    };
  });
}

export async function applyRuntimeGuardProfile(
  projectFile: string,
  requestedProfile: RuntimeGuardProfile,
  options: RuntimeGuardProfileApplyOptions = {},
): Promise<RuntimeGuardProfileResult> {
  const projectPath = path.resolve(projectFile);
  const config = await readRuntimeGuardConfiguration(path.dirname(projectPath));
  const activeConfiguration = options.configuration ??
    detectRuntimeGuardConfiguration(config, process.env);

  if (
    requestedProfile === "build" &&
    await consumeRuntimeGuardRunMarker(projectPath) &&
    !options.beforeProjectLoad &&
    options.preserveRunProfile !== false
  ) {
    return {
      profile: "run",
      level: resolveRuntimeGuardLevel(config, "run", activeConfiguration),
      ...(activeConfiguration ? { configuration: activeConfiguration } : {}),
      skippedForRun: true,
      written: false,
    };
  }

  const summary = await buildGameMakerProject([], projectPath, {
    ...(activeConfiguration ? { guardConfiguration: activeConfiguration } : {}),
    guardProfile: requestedProfile,
    // pre_project_step runs against the saved project before the asset compiler
    // loads it. Later hooks and the watcher can only update existing code bodies.
    hotReloadOnly: !options.beforeProjectLoad,
    ideProjectSaved: options.beforeProjectLoad === true,
  });
  if (requestedProfile === "run") await writeRuntimeGuardRunMarker(projectPath);
  return {
    profile: requestedProfile,
    level: resolveRuntimeGuardLevel(config, requestedProfile, activeConfiguration),
    ...(activeConfiguration ? { configuration: activeConfiguration } : {}),
    skippedForRun: false,
    written: summary.writtenFiles.length > 0,
  };
}

export async function checkGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
): Promise<CheckSummary> {
  return withProjectLock(projectFile, async () => {
    const compiled = await compileGameMakerProject(inputs, projectFile, "build");
    return {
      projectPath: compiled.projectPath,
      typescriptDirectory: compiled.typeScriptDirectory,
      sourceFiles: compiled.sourceFiles,
      objects: compiled.objects.map((object) => object.name).sort(),
      rooms: compiled.rooms.map((room) => room.name).sort(),
      scripts: [...compiled.scripts.keys()].sort(),
    };
  });
}

async function compileGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
  guardProfile: RuntimeGuardProfile,
  guardConfiguration?: string,
): Promise<CompiledProject> {
  const projectPath = path.resolve(projectFile);
  const projectDirectory = path.dirname(projectPath);
  const projectText = await fs.readFile(projectPath, "utf8");
  const project = JSON5.parse(projectText) as GMProject;
  if (!project.name || !Array.isArray(project.resources)) {
    throw new Error(`${projectPath} is not a valid GameMaker project.`);
  }

  const typeScriptProject = await prepareTypeScriptProject(projectPath);
  const runtimeGuardConfig = await readRuntimeGuardConfiguration(projectDirectory);
  const runtimeGuardLevel = resolveRuntimeGuardLevel(
    runtimeGuardConfig,
    guardProfile,
    guardConfiguration,
  );
  const sourceInputs = inputs.length > 0 ? inputs : [typeScriptProject.sourceDirectory];
  const sourceFiles = await discoverTypeScriptFiles(sourceInputs);
  const sourceResults = await Promise.all(
    sourceFiles.map(async (fileName): Promise<Omit<SourceUnit, "sourceFile"> | Error> => {
      try {
        const source = await fs.readFile(fileName, "utf8");
        validateTypeScriptSource(source, fileName);
        const typeScriptSourceFile = ts.createSourceFile(
          fileName,
          source,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TS,
        );
        const relativeDirectory = path.relative(
          typeScriptProject.sourceDirectory,
          path.dirname(fileName),
        );
        const folder =
          relativeDirectory &&
          relativeDirectory !== "." &&
          !relativeDirectory.startsWith(`..${path.sep}`) &&
          relativeDirectory !== ".." &&
          !path.isAbsolute(relativeDirectory)
            ? relativeDirectory.split(path.sep).filter(Boolean)
            : [];
        return { fileName, folder, source, typeScriptSourceFile };
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error));
      }
    }),
  );
  const diagnostics = sourceResults.flatMap((result) =>
    result instanceof Ts2GmlError ? result.diagnostics : []
  );
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
  const otherFailure = sourceResults.find((result) => result instanceof Error);
  if (otherFailure instanceof Error) throw otherFailure;
  const parsedUnits = sourceResults.filter(
    (result): result is Omit<SourceUnit, "sourceFile"> => !(result instanceof Error),
  );
  const objectNames = findObjectNames(parsedUnits.map((unit) => unit.typeScriptSourceFile));
  const guardProgram = loadTypeScriptProgram(
    typeScriptProject.configPath,
    sourceFiles,
  ).program;
  const guardChecker = guardProgram.getTypeChecker();
  const staticClasses = collectStaticClassNames(parsedUnits.map((unit) => unit.typeScriptSourceFile));
  const units = parsedUnits.map((unit): SourceUnit => {
    const programSource = guardProgram.getSourceFile(unit.fileName) ??
      [...guardProgram.getSourceFiles()].find((candidate) =>
        path.resolve(candidate.fileName).toLowerCase() === path.resolve(unit.fileName).toLowerCase()
      );
    const runtimeTypeGuards = programSource
      ? createRuntimeTypeGuardPlan(
        programSource,
        guardChecker,
        objectNames,
        runtimeGuardLevel,
      )
      : undefined;
    const staticReceivers = programSource && staticClasses.size > 0
      ? collectStaticReceivers(programSource, guardChecker, staticClasses)
      : undefined;
    if (programSource) validateRuntimeAccesses(programSource, guardChecker);
    const nativeAccess = programSource ? collectNativeAccessPlan(programSource, guardChecker) : undefined;
    const javascript = toJavaScript(unit.source, unit.fileName, runtimeTypeGuards, staticReceivers, nativeAccess,
      programSource ? { sourceFile: programSource, checker: guardChecker } : undefined);
    const sourceFile = parseJavaScript(javascript, unit.fileName);
    validateJavaScript(sourceFile);
    return {
      ...unit,
      sourceFile,
      ...(runtimeTypeGuards ? { runtimeTypeGuards } : {}),
    };
  });

  const projectLocalBindings = new Set(
    units.flatMap((unit) => [...collectTopLevelVariableBindings(unit.typeScriptSourceFile)]),
  );
  for (const unit of units) {
    try {
      validateTopLevelVariableReferences(unit.typeScriptSourceFile, projectLocalBindings);
    } catch (error) {
      if (error instanceof Ts2GmlError) diagnostics.push(...error.diagnostics);
      else throw error;
    }
  }
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);

  const objectResources = await readManagedObjectResources(projectDirectory, objectNames);
  const objects: CompiledObject[] = [];
  const rooms: CompiledRoomCreationCode[] = [];
  const scripts = new Map<string, string>();
  const generatedSymbols: GeneratedGlobalSymbol[] = [];
  const assetFolders = new Map<string, string[]>();
  const assetSourceFiles = new Map<string, string>();
  const emissionDiagnostics: CompilerDiagnostic[] = [];

  for (const unit of units) {
    try {
      const scriptChunks: string[] = [];
      const unitSymbols: string[] = [];
      for (const statement of unit.sourceFile.statements) {
        if (ts.isExportDeclaration(statement)) continue;
        if (ts.isClassDeclaration(statement) && isObjectClass(statement, objectNames)) {
          const objectName = statement.name?.text;
          const object = compileObjectClass(
            statement,
            unit.sourceFile,
            objectNames,
            objectName
              ? editorParentObject(objectResources.get(objectName), objectNames)
              : undefined,
          );
          objects.push(object);
          const statics = emitClassStatics(statement, unit.sourceFile, staticClasses);
          if (statics) scriptChunks.push(statics);
          assetFolders.set(object.name, unit.folder);
          assetSourceFiles.set(object.name, unit.fileName);
          continue;
        }
        if (ts.isClassDeclaration(statement) && isRoomClass(statement)) {
          rooms.push(compileRoomClass(statement, unit.sourceFile));
          continue;
        }
        unitSymbols.push(...topLevelGeneratedNames(statement));
        const gml = emitTopLevelGml(statement, unit.sourceFile, staticClasses);
        if (gml.trim()) scriptChunks.push(gml);
      }

      if (scriptChunks.length > 0) {
        const sourceName = path.basename(unit.fileName, path.extname(unit.fileName));
        const scriptName = objectNames.has(sourceName) || rooms.some((room) => room.name === sourceName)
          ? `${sourceName.slice(0, 56)}_${staticClasses.has(sourceName) ? "statics" : "init"}`
          : sourceName;
        assertIdentifier(scriptName, "script", unit.fileName);
        if (scripts.has(scriptName)) {
          throw new Error(`Multiple source files would generate the script '${scriptName}'.`);
        }
        scripts.set(scriptName, `${scriptChunks.join("\n\n").trim()}\n`);
        assetFolders.set(scriptName, unit.folder);
        assetSourceFiles.set(scriptName, unit.fileName);
        generatedSymbols.push(...unitSymbols.map((name) => ({
          name,
          fileName: unit.fileName,
          scriptName,
        })));
      }
    } catch (error) {
      if (error instanceof Ts2GmlError) emissionDiagnostics.push(...error.diagnostics);
      else throw error;
    }
  }
  if (emissionDiagnostics.length > 0) throw new Ts2GmlError(emissionDiagnostics);

  const staticUnit = units.find((unit) => unit.sourceFile.statements.some((statement) =>
    ts.isClassDeclaration(statement) && statement.name && staticClasses.has(statement.name.text)
  ));
  if (staticUnit) {
    scripts.set(classStaticRuntimeScriptName, `${classStaticRuntimeGml}\n`);
    assetFolders.set(classStaticRuntimeScriptName, []);
    assetSourceFiles.set(classStaticRuntimeScriptName, staticUnit.fileName);
  }

  const collectionUnit = units.find((unit) => usesCollectionRuntime(unit.sourceFile));
  if (collectionUnit) {
    scripts.set(collectionRuntimeScriptName, `${collectionRuntimeGml.trim()}\n`);
    assetFolders.set(collectionRuntimeScriptName, []);
    assetSourceFiles.set(collectionRuntimeScriptName, collectionUnit.fileName);
  }

  const runtimeGuardUnit = units.find((unit) =>
    unit.runtimeTypeGuards &&
    (
      unit.runtimeTypeGuards.contextObjects.size > 0 ||
      unit.runtimeTypeGuards.guardedArguments.size > 0
    )
  );
  if (runtimeGuardUnit) {
    scripts.set(runtimeGuardScriptName, createRuntimeGuardGml());
    assetFolders.set(runtimeGuardScriptName, []);
    assetSourceFiles.set(runtimeGuardScriptName, runtimeGuardUnit.fileName);
  }

  if ([...scripts.values(), ...rooms.map((room) => room.code),
    ...objects.flatMap((object) => object.events.map((event) => event.code))].some(usesValueRuntime)) {
    scripts.set(valueRuntimeScriptName, valueRuntimeGml);
    assetFolders.set(valueRuntimeScriptName, []);
    assetSourceFiles.set(valueRuntimeScriptName, units[0]!.fileName);
  }
  assertUniqueAssets(objects, scripts);
  const roomResources = resolveRoomResources(rooms, project.resources);
  await validateObjectReferences(objects, project.resources, projectDirectory);
  await assertNoUnmanagedAssetConflicts(
    project,
    projectPath,
    projectDirectory,
    objects,
    scripts,
    assetSourceFiles,
  );
  await assertNoRoomCreationCodeConflicts(projectDirectory, rooms, roomResources);
  const declarations = await generateProjectDeclarations(projectPath, {
    excludedAssetNames: new Set(rooms.map((room) => room.name)),
    additionalObjectNames: new Set(objects.map((object) => object.name)),
  });
  assertUniqueGeneratedSymbols(generatedSymbols, objects, rooms, scripts, declarations);
  const generatedAssetNames = new Set([
    ...objects.map((object) => object.name),
    ...rooms.map((room) => room.name),
    ...scripts.keys(),
  ]);
  const runtimeDeclarationBindings = await readRuntimeDeclarationBindings(
    typeScriptProject.typeDirectory,
  );
  for (const asset of declarations.assets) runtimeDeclarationBindings.add(asset.name);
  for (const resource of project.resources) {
    if (!generatedAssetNames.has(resource.id.name)) {
      runtimeDeclarationBindings.add(resource.id.name);
    }
  }
  for (const fn of declarations.functions) runtimeDeclarationBindings.add(fn.name);
  for (const macro of declarations.macros) runtimeDeclarationBindings.add(macro.name);
  for (const enumeration of declarations.enumerations) {
    runtimeDeclarationBindings.add(enumeration.name);
  }
  const generatedRuntimeBindings = new Set([
    ...generatedAssetNames,
    ...units.flatMap((unit) => unit.sourceFile.statements.flatMap(topLevelGeneratedNames)),
  ]);
  const previousManifest = await readManifest(
    path.join(projectDirectory, ".ts2gml", "manifest.json"),
  );
  const hasManagedLegacyEventScript = previousManifest.resources.includes(
    legacyEventScriptResourcePath,
  );
  const internalNameConflict = [...runtimeDeclarationBindings, ...generatedRuntimeBindings]
    .find((name) =>
      name.startsWith("__ts2gml_") &&
      name !== collectionRuntimeScriptName &&
      name !== classStaticRuntimeScriptName &&
      name !== runtimeGuardScriptName &&
      name !== valueRuntimeScriptName &&
      !(name === legacyEventScriptName && hasManagedLegacyEventScript)
    );
  if (internalNameConflict) {
    throw new Error(
      `GameMaker name '${internalNameConflict}' uses the compiler-reserved '__ts2gml_' prefix.`,
    );
  }
  const bindingDiagnostics: CompilerDiagnostic[] = [];
  for (const unit of units) {
    try {
      validateGmlBindingConflicts(
        unit.typeScriptSourceFile,
        runtimeDeclarationBindings,
        generatedRuntimeBindings,
      );
    } catch (error) {
      if (error instanceof Ts2GmlError) bindingDiagnostics.push(...error.diagnostics);
      else throw error;
    }
  }
  if (bindingDiagnostics.length > 0) throw new Ts2GmlError(bindingDiagnostics);
  validateTypeScriptProject(
    typeScriptProject.configPath,
    sourceFiles,
  );
  return {
    project,
    projectPath,
    projectDirectory,
    typeScriptDirectory: typeScriptProject.sourceDirectory,
    sourceFiles,
    objects,
    objectResources,
    rooms,
    roomResources,
    scripts,
    assetFolders,
    declarations,
  };
}

function topLevelGeneratedNames(statement: ts.Statement): string[] {
  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
    return [statement.name.text];
  }
  if (!ts.isVariableStatement(statement)) return [];
  return statement.declarationList.declarations.flatMap((declaration) =>
    declaration.initializer && ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression) && declaration.initializer.expression.text === "gm_macro" &&
      ts.isIdentifier(declaration.name)
      ? [declaration.name.text]
      : []
  );
}

function assertUniqueGeneratedSymbols(
  symbols: readonly GeneratedGlobalSymbol[],
  objects: readonly CompiledObject[],
  rooms: readonly CompiledRoomCreationCode[],
  scripts: ReadonlyMap<string, string>,
  declarations: ProjectDeclarationSummary,
): void {
  const seen = new Map<string, GeneratedGlobalSymbol>();
  for (const symbol of symbols) {
    const previous = seen.get(symbol.name);
    if (previous) {
      throw new Error(
        `Generated global '${symbol.name}' is defined by both '${previous.fileName}' and '${symbol.fileName}'.`,
      );
    }
    seen.set(symbol.name, symbol);
  }

  const generatedAssets = new Map([
    ...objects.map((object): [string, string] => [object.name, `object '${object.name}'`]),
    ...rooms.map((room): [string, string] => [room.name, `room '${room.name}'`]),
    ...[...scripts.keys()].map((name): [string, string] => [name, `script '${name}'`]),
  ]);
  const importedSymbols = new Map<string, string>();
  for (const asset of declarations.assets) importedSymbols.set(asset.name, `asset '${asset.resourcePath}'`);
  for (const fn of declarations.functions) importedSymbols.set(fn.name, `function in '${fn.resourcePath}'`);
  for (const macro of declarations.macros) importedSymbols.set(macro.name, `macro in '${macro.resourcePath}'`);
  for (const enumeration of declarations.enumerations) {
    importedSymbols.set(enumeration.name, `enum in '${enumeration.resourcePath}'`);
  }

  for (const symbol of symbols) {
    const asset = generatedAssets.get(symbol.name);
    if (asset && !(scripts.has(symbol.name) && symbol.scriptName === symbol.name)) {
      throw new Error(
        `Generated global '${symbol.name}' in '${symbol.fileName}' conflicts with generated ${asset}.`,
      );
    }
    const imported = importedSymbols.get(symbol.name);
    if (imported) {
      throw new Error(
        `Generated global '${symbol.name}' in '${symbol.fileName}' conflicts with unmanaged GML ${imported}.`,
      );
    }
  }
}

export async function prepareTypeScriptProject(
  projectFile: string,
): Promise<TypeScriptProjectSummary> {
  const projectPath = path.resolve(projectFile);
  await fs.access(projectPath);
  const projectDirectory = path.dirname(projectPath);
  const sourceDirectory = path.join(projectDirectory, "typescript");
  findTypeScriptLibraries(sourceDirectory);
  const typeDirectory = getProjectTypesDirectory(projectDirectory);
  const configPath = path.join(sourceDirectory, "tsconfig.json");
  try {
    await fs.access(path.join(typeDirectory, "index.d.ts"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(
      `The project-local tool is missing. Copy the built ts2gml folder to datafiles/ts2gml in the project containing ${path.basename(projectPath)}.`,
    );
  }
  const runtimeGuardConfig = await ensureRuntimeGuardConfiguration(projectDirectory);
  await ensureProjectRuntimeDeclarations(projectPath);

  let createdConfig = false;

  await fs.mkdir(sourceDirectory, { recursive: true });

  try {
    const contents = await fs.readFile(configPath, "utf8");
    const parsedConfig = ts.parseConfigFileTextToJson(configPath.split(path.sep).join("/"), contents);
    if (parsedConfig.error) throw new Ts2GmlError([fromTypeScriptDiagnostic(parsedConfig.error, configPath)]);
    const config = parsedConfig.config as { include?: unknown };
    const oldTypesIncludes = new Set(["../.env/**/*.d.ts", "../ts2gml/types/**/*.d.ts"]);
    if (
      Array.isArray(config.include) &&
      config.include.some((entry) => typeof entry === "string" && oldTypesIncludes.has(entry))
    ) {
      config.include = config.include.map((entry) =>
        typeof entry === "string" && oldTypesIncludes.has(entry) ? projectTypesInclude : entry,
      );
      await atomicWriteFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const config = {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: [],
        lib: ["ES2022"],
      },
      include: ["**/*.ts", projectTypesInclude],
    };
    await atomicWriteFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    createdConfig = true;
  }

  return {
    sourceDirectory,
    configPath,
    runtimeGuardConfigPath: runtimeGuardConfig.path,
    typeDirectory,
    createdConfig,
    createdRuntimeGuardConfig: runtimeGuardConfig.created,
  };
}

async function discoverTypeScriptFiles(inputs: readonly string[]): Promise<string[]> {
  const files: string[] = [];
  const visit = async (entry: string): Promise<void> => {
    const absolute = path.resolve(entry);
    const stat = await fs.stat(absolute);
    if (stat.isDirectory()) {
      const children = await fs.readdir(absolute, { withFileTypes: true });
      for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
        if (child.name === "node_modules" || child.name === "dist") continue;
        await visit(path.join(absolute, child.name));
      }
      return;
    }
    if (/\.tsx?$/.test(absolute) && !absolute.endsWith(".d.ts")) files.push(absolute);
  };
  for (const input of inputs) await visit(input);
  return files.sort((left, right) => left.localeCompare(right));
}

function validateTypeScriptProject(
  configPath: string,
  sourceFiles: readonly string[],
): void {
  const loaded = loadTypeScriptProgram(configPath, sourceFiles);
  const diagnostics = [
    ...loaded.configErrors,
    ...ts.getPreEmitDiagnostics(loaded.program),
  ]
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .filter((diagnostic) => sourceFiles.length > 0 || diagnostic.code !== 18003)
    .map((diagnostic) => fromTypeScriptDiagnostic(diagnostic, configPath))
    .sort((left, right) =>
      left.fileName.localeCompare(right.fileName) ||
      left.line - right.line ||
      left.column - right.column ||
      left.code.localeCompare(right.code)
    );
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);

  const sources = loaded.program.getSourceFiles().filter((source) => !source.isDeclarationFile);
  const objectNames = findObjectNames(sources);
  const checker = loaded.program.getTypeChecker();
  for (const source of sources) validateObjectEvents(source, checker, objectNames);
}

function loadTypeScriptProgram(
  configPath: string,
  sourceFiles: readonly string[],
): { program: ts.Program; configErrors: ts.Diagnostic[] } {
  configPath = path.resolve(configPath).split(path.sep).join("/");
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Ts2GmlError([fromTypeScriptDiagnostic(loaded.error, configPath)]);
  const configDirectory = path.dirname(configPath);
  const parsed = ts.parseJsonConfigFileContent(
    loaded.config ?? {},
    ts.sys,
    configDirectory,
    undefined,
    configPath,
  );
  const selectedSources = new Set(sourceFiles.map((fileName) => path.resolve(fileName)));
  const rootNames = parsed.fileNames.filter(
    (fileName) => fileName.endsWith(".d.ts") || selectedSources.has(path.resolve(fileName)),
  );
  for (const fileName of selectedSources) {
    if (!rootNames.some((rootName) => path.resolve(rootName) === fileName)) rootNames.push(fileName);
  }

  const programOptions: ts.CreateProgramOptions = {
    rootNames,
    options: { ...parsed.options, noEmit: true },
  };
  if (parsed.projectReferences) programOptions.projectReferences = parsed.projectReferences;
  const compilerHost = ts.createCompilerHost(programOptions.options);
  const libraries = findTypeScriptLibraries(configDirectory);
  compilerHost.getDefaultLibLocation = () => libraries.directory;
  compilerHost.getDefaultLibFileName = (options) => path.join(libraries.directory, ts.getDefaultLibFileName(options));
  programOptions.host = compilerHost;
  return {
    program: ts.createProgram(programOptions),
    configErrors: [...(loaded.error ? [loaded.error] : []), ...parsed.errors],
  };
}

function findObjectNames(sourceFiles: readonly ts.SourceFile[]): Set<string> {
  const classes = sourceFiles.flatMap((sourceFile) =>
    sourceFile.statements.filter(ts.isClassDeclaration),
  );
  const names = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const classNode of classes) {
      const name = classNode.name?.text;
      if (name && !names.has(name) && isObjectClass(classNode, names)) {
        names.add(name);
        changed = true;
      }
    }
  }
  return names;
}

async function readManagedObjectResources(
  projectDirectory: string,
  objectNames: ReadonlySet<string>,
): Promise<Map<string, GMObjectResource>> {
  const previous = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedPaths = new Set(previous.resources.map(normalizeResourcePath));
  const resources = new Map<string, GMObjectResource>();
  for (const name of objectNames) {
    const resourcePath = `objects/${name}/${name}.yy`;
    if (!managedPaths.has(resourcePath)) continue;
    try {
      const resource = JSON5.parse(
        await fs.readFile(safeProjectPath(projectDirectory, resourcePath), "utf8"),
      ) as GMObjectResource;
      if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
        throw new Error(`${resourcePath} is not a valid GameMaker object resource.`);
      }
      resources.set(name, resource);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return resources;
}

function editorParentObject(
  resource: GMObjectResource | undefined,
  objectNames: ReadonlySet<string>,
): string | undefined {
  const parent = resource?.parentObjectId;
  if (!parent || typeof parent !== "object" || !("name" in parent)) return undefined;
  const name = parent.name;
  return typeof name === "string" && !objectNames.has(name) ? name : undefined;
}

function assertUniqueAssets(
  objects: readonly CompiledObject[],
  scripts: ReadonlyMap<string, string>,
): void {
  const names = new Set<string>();
  for (const name of [...objects.map((object) => object.name), ...scripts.keys()]) {
    if (names.has(name)) throw new Error(`Generated asset name '${name}' is not unique.`);
    names.add(name);
  }
}

function generatedResourceReferences(
  objects: readonly CompiledObject[],
  scripts: ReadonlyMap<string, string>,
): Array<{ id: { name: string; path: string } }> {
  return [
    ...objects.map((object) => ({
      id: { name: object.name, path: `objects/${object.name}/${object.name}.yy` },
    })),
    ...[...scripts.keys()].map((name) => ({
      id: { name, path: `scripts/${name}/${name}.yy` },
    })),
  ];
}

async function assertNoUnmanagedAssetConflicts(
  project: GMProject,
  projectPath: string,
  projectDirectory: string,
  objects: readonly CompiledObject[],
  scripts: ReadonlyMap<string, string>,
  assetSourceFiles: ReadonlyMap<string, string>,
): Promise<void> {
  const previous = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedPaths = new Set(previous.resources.map(normalizeResourcePath));
  const generatedResources = generatedResourceReferences(objects, scripts);
  const generatedPaths = new Set(
    generatedResources.map((resource) => normalizeResourcePath(resource.id.path)),
  );
  const generatedNames = new Set(generatedResources.map((resource) => resource.id.name));
  const generatedByPath = new Map(generatedResources.map((resource) => [
    normalizeResourcePath(resource.id.path),
    resource,
  ]));
  const generatedByName = new Map(generatedResources.map((resource) => [resource.id.name, resource]));
  const objectNames = new Set(objects.map((object) => object.name));
  const conflicts: ResourceConflict[] = [];
  for (const resource of project.resources) {
    const resourcePath = normalizeResourcePath(resource.id.path);
    if (managedPaths.has(resourcePath)) continue;
    if (generatedPaths.has(resourcePath) || generatedNames.has(resource.id.name)) {
      const generated = generatedByPath.get(resourcePath) ?? generatedByName.get(resource.id.name)!;
      conflicts.push({
        assetName: generated.id.name,
        assetType: objectNames.has(generated.id.name) ? "object" : "script",
        gameMakerName: resource.id.name,
        gameMakerResourcePath: resourcePath,
        generatedResourcePath: normalizeResourcePath(generated.id.path),
        typeScriptFile: assetSourceFiles.get(generated.id.name)!,
      });
    }
  }
  // A resource may still exist on disk after its project reference was removed.
  for (const resource of generatedResources) {
    const resourcePath = normalizeResourcePath(resource.id.path);
    if (managedPaths.has(resourcePath) || conflicts.some((conflict) =>
      conflict.generatedResourcePath === resourcePath
    )) continue;
    const contents = await readFileIfPresent(safeProjectPath(projectDirectory, resourcePath));
    if (contents === undefined) continue;
    conflicts.push({
      assetName: resource.id.name,
      assetType: objectNames.has(resource.id.name) ? "object" : "script",
      gameMakerName: resource.id.name,
      gameMakerResourcePath: resourcePath,
      generatedResourcePath: resourcePath,
      typeScriptFile: assetSourceFiles.get(resource.id.name)!,
    });
  }
  if (conflicts.length > 0) throw new ResourceConflictError(projectPath, conflicts);
}

function resolveRoomResources(
  rooms: readonly CompiledRoomCreationCode[],
  resources: readonly { id: { name: string; path: string } }[],
): Map<string, string> {
  const roomResources = new Map(
    resources
      .filter((resource) => normalizeResourcePath(resource.id.path).toLowerCase().startsWith("rooms/"))
      .map((resource) => [resource.id.name, normalizeResourcePath(resource.id.path)]),
  );
  const resolved = new Map<string, string>();
  for (const room of rooms) {
    if (resolved.has(room.name)) {
      throw new Error(`Room creation code for '${room.name}' is defined more than once.`);
    }
    const resourcePath = roomResources.get(room.name);
    if (!resourcePath) {
      throw new Error(
        `Room class '${room.name}' does not match an existing GameMaker room asset.`,
      );
    }
    resolved.set(room.name, resourcePath);
  }
  return resolved;
}

async function assertNoRoomCreationCodeConflicts(
  projectDirectory: string,
  rooms: readonly CompiledRoomCreationCode[],
  roomResources: ReadonlyMap<string, string>,
): Promise<void> {
  const previous = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedRooms = new Set(previous.roomCreationCodes.map(normalizeResourcePath));
  for (const room of rooms) {
    const resourcePath = roomResources.get(room.name)!;
    const resource = await readRoomResource(projectDirectory, resourcePath);
    const managed = managedRooms.has(resourcePath);
    if (
      typeof resource.creationCodeFile !== "string" ||
      (resource.creationCodeFile &&
        (!managed || resource.creationCodeFile !== roomCreationCodeFileName))
    ) {
      throw new Error(
        `Cannot generate creation code for room '${room.name}': the room already uses unmanaged creation code.`,
      );
    }
    if (managed) continue;
    try {
      await fs.access(safeProjectPath(projectDirectory, roomCreationCodePath(resourcePath)));
      throw new Error(
        `Cannot generate creation code for room '${room.name}': '${roomCreationCodeFileName}' already exists and is unmanaged.`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

async function validateObjectReferences(
  objects: readonly CompiledObject[],
  resources: readonly { id: { name: string; path: string } }[],
  projectDirectory: string,
): Promise<void> {
  const previous = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedResources = new Set(previous.resources.map(normalizeResourcePath));
  const knownObjects = new Set(
    resources
      .filter((resource) => {
        const resourcePath = normalizeResourcePath(resource.id.path);
        return resourcePath.toLowerCase().startsWith("objects/") &&
          !managedResources.has(resourcePath);
      })
      .map((resource) => resource.id.name),
  );
  for (const object of objects) knownObjects.add(object.name);
  for (const object of objects) {
    if (object.parentObject && !knownObjects.has(object.parentObject)) {
      throw new Error(`${object.name} references missing parent object '${object.parentObject}'.`);
    }
    for (const event of object.events) {
      if (event.collisionObject && !knownObjects.has(event.collisionObject)) {
        throw new Error(
          `${object.name} collision event references missing object '${event.collisionObject}'.`,
        );
      }
    }
  }
}

async function writeGeneratedAssets(input: {
  project: GMProject;
  projectPath: string;
  projectDirectory: string;
  typeScriptDirectory: string;
  sourceFiles: string[];
  objects: CompiledObject[];
  objectResources: ReadonlyMap<string, GMObjectResource>;
  rooms: CompiledRoomCreationCode[];
  roomResources: ReadonlyMap<string, string>;
  scripts: ReadonlyMap<string, string>;
  assetFolders: ReadonlyMap<string, readonly string[]>;
}, options: WriteOptions): Promise<Omit<BuildSummary, "declarations">> {
  const manifestPath = path.join(input.projectDirectory, ".ts2gml", "manifest.json");
  const previous = await readManifest(manifestPath);
  const projectFileName = path.basename(input.projectPath);
  const generatedResources = generatedResourceReferences(input.objects, input.scripts);
  const generatedFiles = new Map<string, string>();
  const writtenGeneratedFiles = new Set<string>();
  const requiredFolders = new Map<string, GMFolder>();

  for (const folder of input.assetFolders.values()) {
    for (let depth = 1; depth <= folder.length; depth += 1) {
      const parts = folder.slice(0, depth);
      const folderPath = toFolderResourcePath(parts);
      requiredFolders.set(folderPath, {
        $GMFolder: "",
        "%Name": parts.at(-1)!,
        folderPath,
        name: parts.at(-1)!,
        resourceType: "GMFolder",
        resourceVersion: "2.0",
      });
    }
  }

  for (const object of input.objects) {
    const resourcePath = `objects/${object.name}/${object.name}.yy`;
    generatedFiles.set(
      resourcePath,
      stringifyGameMakerResource(
        createObjectResource(
          object,
          assetParent(input.assetFolders.get(object.name), input.project.name, projectFileName),
          input.objectResources.get(object.name),
          previous.objectVariables[resourcePath] ?? [],
        ),
      ),
    );
    for (const event of object.events) {
      generatedFiles.set(
        `objects/${object.name}/${event.fileName}`,
        event.code,
      );
    }
  }

  for (const room of input.rooms) {
    const resourcePath = input.roomResources.get(room.name)!;
    generatedFiles.set(roomCreationCodePath(resourcePath), room.code);
  }

  for (const [name, code] of input.scripts) {
    const resourcePath = `scripts/${name}/${name}.yy`;
    generatedFiles.set(
      resourcePath,
      stringifyGameMakerResource(
        createScriptResource(
          name,
          assetParent(input.assetFolders.get(name), input.project.name, projectFileName),
        ),
      ),
    );
    generatedFiles.set(`scripts/${name}/${name}.gml`, code);
  }

  for (const [relativePath, contents] of createRuntimeGuardHooks(projectFileName)) {
    generatedFiles.set(relativePath, contents);
  }

  await assertNoUnmanagedRuntimeGuardHooks(
    input.projectDirectory,
    generatedFiles,
    previous,
  );

  const managedAssetDirectories = new Set(previous.resources.map((resourcePath) =>
    path.posix.dirname(normalizeResourcePath(resourcePath))
  ));
  for (const relativePath of generatedFiles.keys()) {
    if (
      previous.files.includes(relativePath) ||
      managedAssetDirectories.has(path.posix.dirname(relativePath)) ||
      runtimeGuardHookPaths.some((hookPath) => hookPath === relativePath)
    ) continue;
    if (await readFileIfPresent(safeProjectPath(input.projectDirectory, relativePath)) !== undefined) {
      throw new Error(
        `Cannot generate '${relativePath}': the file already exists and is unmanaged. ` +
        "Delete the conflicting GameMaker asset and save the project if you want ts2gml to manage it.",
      );
    }
  }

  for (const [relativePath, contents] of [...generatedFiles]) {
    if (!relativePath.endsWith(".gml")) continue;
    const mapped = extractGmlSourceMap(contents, relativePath, input.projectDirectory);
    generatedFiles.set(relativePath, mapped.code);
    if (mapped.map.mappings.length > 0) {
      generatedFiles.set(`${relativePath}.map.json`, `${JSON.stringify(mapped.map, null, 2)}\n`);
    }
  }

  const currentPaths = new Set(generatedFiles.keys());
  const previousResources = new Set(previous.resources);
  const generatedResourcePaths = new Set(generatedResources.map((resource) => resource.id.path));
  const generatedObjectResourcePaths = new Set(
    input.objects.map((object) => `objects/${object.name}/${object.name}.yy`),
  );
  const generatedNames = new Set(generatedResources.map((resource) => resource.id.name));
  const existingProjectResources = input.project.resources;
  const retained = existingProjectResources.filter((resource) => {
    if (previousResources.has(resource.id.path)) return false;
    if (
      generatedResourcePaths.has(resource.id.path) ||
      generatedNames.has(resource.id.name)
    ) {
      throw new Error(
        `Cannot generate '${resource.id.name}': the project already has an unmanaged asset with that name or path.`,
      );
    }
    return true;
  });
  const previousFolders = new Set(previous.folders);
  const projectFolders = Array.isArray(input.project.Folders) ? input.project.Folders : [];
  const unmanagedFolders = projectFolders.filter(
    (folder) => !previousFolders.has(folder.folderPath),
  );
  const unmanagedFolderPaths = new Set(unmanagedFolders.map((folder) => folder.folderPath));
  const staleFolders = projectFolders.filter(
    (folder) => previousFolders.has(folder.folderPath) && !requiredFolders.has(folder.folderPath),
  );
  const externallyUsedFolderPaths = new Set(unmanagedFolderPaths);
  if (staleFolders.length > 0) {
    await Promise.all(
      retained.map(async (resource) => {
        try {
          const contents = await fs.readFile(
            safeProjectPath(input.projectDirectory, resource.id.path),
            "utf8",
          );
          const parsed = JSON5.parse(contents) as { parent?: { path?: unknown } };
          if (
            typeof parsed.parent?.path === "string" &&
            parsed.parent.path.startsWith("folders/")
          ) {
            externallyUsedFolderPaths.add(parsed.parent.path);
          }
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "ENOENT" &&
            !(error instanceof SyntaxError)
          ) {
            throw error;
          }
        }
      }),
    );
  }
  const promotedFolders = staleFolders.filter((folder) => {
    const childPrefix = `${folder.folderPath.slice(0, -3)}/`;
    return [...externallyUsedFolderPaths].some(
      (usedPath) => usedPath === folder.folderPath || usedPath.startsWith(childPrefix),
    );
  });
  const managedFolders = [...requiredFolders.values()].filter(
    (folder) => !unmanagedFolderPaths.has(folder.folderPath),
  );
  const retainedFolders = new Map<string, GMFolder>();
  for (const folder of [...unmanagedFolders, ...promotedFolders, ...managedFolders]) {
    retainedFolders.set(folder.folderPath, folder);
  }

  const currentRoomResourcePaths = new Set(input.roomResources.values());
  input.project.resources = [...retained, ...generatedResources].sort((left, right) =>
    left.id.path.localeCompare(right.id.path),
  );
  input.project.resources = preserveEntryOrder(
    input.project.resources,
    existingProjectResources,
    (resource) => normalizeResourcePath(resource.id.path),
  );
  input.project.Folders = [...retainedFolders.values()].sort((left, right) =>
    left.folderPath.localeCompare(right.folderPath),
  );
  input.project.Folders = preserveEntryOrder(
    input.project.Folders,
    projectFolders,
    (folder) => folder.folderPath,
  );
  const projectContents = stringifyGameMakerResource(input.project);
  const currentResourceReferences = new Map(
    existingProjectResources.map((resource) => [
      normalizeResourcePath(resource.id.path),
      resource.id.name,
    ]),
  );
  const managedFolderPaths = new Set(managedFolders.map((folder) => folder.folderPath));
  const currentFolderPaths = new Set(projectFolders.map((folder) => folder.folderPath));
  const projectStructureChanged =
    !setsEqual(previousResources, generatedResourcePaths) ||
    generatedResources.some((resource) =>
      currentResourceReferences.get(normalizeResourcePath(resource.id.path)) !== resource.id.name
    ) ||
    !setsEqual(previousFolders, managedFolderPaths) ||
    [...managedFolderPaths].some((folderPath) => !currentFolderPaths.has(folderPath));

  if (options.blockStructuralChanges) {
    await assertOnlyHotReloadChanges(
      input.projectDirectory,
      path.basename(input.projectPath),
      projectStructureChanged,
      generatedFiles,
      currentPaths,
      currentRoomResourcePaths,
      previous,
    );
  }

  const pendingWrites = new Map<string, string>();
  for (const [relativePath, contents] of generatedFiles) {
    if (await queueFileIfChanged(pendingWrites, input.projectDirectory, relativePath, contents)) {
      writtenGeneratedFiles.add(relativePath);
    }
  }

  const writtenRoomResources = new Set<string>();
  for (const resourcePath of currentRoomResourcePaths) {
    if (
      await setRoomCreationCodeFile(
        pendingWrites,
        input.projectDirectory,
        resourcePath,
        roomCreationCodeFileName,
      )
    ) {
      writtenRoomResources.add(resourcePath);
    }
  }
  for (const staleRoom of previous.roomCreationCodes) {
    const resourcePath = normalizeResourcePath(staleRoom);
    if (currentRoomResourcePaths.has(resourcePath)) continue;
    if (await setRoomCreationCodeFile(pendingWrites, input.projectDirectory, resourcePath, "", true)) {
      writtenRoomResources.add(resourcePath);
    }
  }

  if (!options.blockStructuralChanges) {
    await queueFileIfChanged(pendingWrites, input.projectDirectory, path.basename(input.projectPath), projectContents);
  }

  const stalePaths = previous.files.filter((stalePath) => !currentPaths.has(stalePath));

  const manifest: Manifest = {
    formatVersion: 1,
    compilerVersion: VERSION,
    files: [...generatedFiles.keys()].sort(),
    generatedFileHashes: Object.fromEntries(
      [...generatedFiles.entries()]
        .filter(([relativePath]) => !generatedObjectResourcePaths.has(relativePath))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([relativePath, contents]) => [relativePath, hashGeneratedContents(contents)]),
    ),
    folders: managedFolders.map((folder) => folder.folderPath).sort(),
    objectVariables: Object.fromEntries(
      input.objects
        .filter((object) => object.variables.length > 0)
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((object) => [
          `objects/${object.name}/${object.name}.yy`,
          object.variables.map((variable) => variable.name).sort(),
        ]),
    ),
    resources: [...generatedResourcePaths].sort(),
    roomCreationCodes: [...currentRoomResourcePaths].sort(),
  };
  await queueFileIfChanged(pendingWrites, input.projectDirectory,
    path.relative(input.projectDirectory, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  await commitProjectFiles(input.projectDirectory, pendingWrites, stalePaths);
  for (const stalePath of stalePaths) await removeEmptyAssetDirectories(input.projectDirectory, stalePath);

  return {
    projectPath: input.projectPath,
    typescriptDirectory: input.typeScriptDirectory,
    sourceFiles: input.sourceFiles,
    objects: input.objects.map((object) => object.name).sort(),
    rooms: input.rooms.map((room) => room.name).sort(),
    scripts: [...input.scripts.keys()].sort(),
    writtenFiles: [...writtenGeneratedFiles, ...writtenRoomResources].sort(),
  };
}

async function assertOnlyHotReloadChanges(
  projectDirectory: string,
  projectFileName: string,
  projectStructureChanged: boolean,
  generatedFiles: ReadonlyMap<string, string>,
  currentPaths: ReadonlySet<string>,
  currentRoomResourcePaths: ReadonlySet<string>,
  previous: Manifest,
): Promise<void> {
  const structuralChanges = new Set<string>();
  if (projectStructureChanged) structuralChanges.add(projectFileName);

  for (const [relativePath, contents] of generatedFiles) {
    const absolute = safeProjectPath(projectDirectory, relativePath);
    const current = await readFileIfPresent(absolute);
    if (current !== undefined && fileContentsEqual(absolute, current, contents)) continue;
    if (
      current !== undefined &&
      previous.files.includes(relativePath) &&
      isHotReloadableCodePath(relativePath)
    ) continue;
    structuralChanges.add(relativePath);
  }

  for (const stalePath of previous.files) {
    if (!currentPaths.has(stalePath)) structuralChanges.add(stalePath);
  }

  for (const resourcePath of currentRoomResourcePaths) {
    const room = await readRoomResource(projectDirectory, resourcePath);
    if (room.creationCodeFile !== roomCreationCodeFileName) {
      structuralChanges.add(resourcePath);
    }
  }
  for (const staleRoom of previous.roomCreationCodes) {
    const resourcePath = normalizeResourcePath(staleRoom);
    if (currentRoomResourcePaths.has(resourcePath)) continue;
    try {
      const room = await readRoomResource(projectDirectory, resourcePath);
      if (room.creationCodeFile === roomCreationCodeFileName) {
        structuralChanges.add(resourcePath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  if (structuralChanges.size === 0) return;
  throw new StructuralGameMakerChangesError([...structuralChanges]);
}

async function assertNoUnmanagedRuntimeGuardHooks(
  projectDirectory: string,
  generatedFiles: ReadonlyMap<string, string>,
  previous: Manifest,
): Promise<void> {
  for (const relativePath of runtimeGuardHookPaths) {
    if (previous.files.includes(relativePath)) continue;
    const current = await readFileIfPresent(safeProjectPath(projectDirectory, relativePath));
    const desired = generatedFiles.get(relativePath);
    if (current === undefined || current === desired) continue;
    throw new Error(
      `Cannot install runtime guard hook '${relativePath}' because the project already owns that file. ` +
      "Relocate the existing hook logic or remove the file, then run the build again.",
    );
  }
}

function isHotReloadableCodePath(relativePath: string): boolean {
  return /\.gml(?:\.map\.json)?$/i.test(normalizeResourcePath(relativePath));
}

function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function preserveEntryOrder<T>(entries: readonly T[], previous: readonly T[], key: (entry: T) => string): T[] {
  const remaining = new Map(entries.map((entry) => [key(entry), entry]));
  const ordered: T[] = [];
  for (const entry of previous) {
    const entryKey = key(entry);
    const current = remaining.get(entryKey);
    if (current === undefined) continue;
    ordered.push(current);
    remaining.delete(entryKey);
  }
  return [...ordered, ...remaining.values()];
}

async function readRoomResource(
  projectDirectory: string,
  resourcePath: string,
): Promise<GMRoomResource> {
  const absolute = safeProjectPath(projectDirectory, resourcePath);
  const resource = JSON5.parse(await fs.readFile(absolute, "utf8")) as GMRoomResource;
  if (!resource || typeof resource !== "object") {
    throw new Error(`${absolute} is not a valid GameMaker room resource.`);
  }
  return resource;
}

async function setRoomCreationCodeFile(
  writes: Map<string, string>,
  projectDirectory: string,
  resourcePath: string,
  creationCodeFile: string,
  onlyIfManaged = false,
): Promise<boolean> {
  let resource: GMRoomResource;
  try {
    resource = await readRoomResource(projectDirectory, resourcePath);
  } catch (error) {
    if (onlyIfManaged && (error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  if (onlyIfManaged && resource.creationCodeFile !== roomCreationCodeFileName) return false;
  if (resource.creationCodeFile === creationCodeFile) return false;
  resource.creationCodeFile = creationCodeFile;
  return queueFileIfChanged(
    writes, projectDirectory, resourcePath,
    stringifyGameMakerResource(resource),
  );
}

function roomCreationCodePath(resourcePath: string): string {
  return path.posix.join(path.posix.dirname(resourcePath), roomCreationCodeFileName);
}

function createObjectResource(
  object: CompiledObject,
  parent: { name: string; path: string },
  existing?: GMObjectResource,
  previousVariableNames: readonly string[] = [],
): Record<string, unknown> {
  const eventList = object.events.map((event) => ({
    $GMEvent: "v1",
    "%Name": "",
    collisionObjectId: event.collisionObject
      ? {
          name: event.collisionObject,
          path: `objects/${event.collisionObject}/${event.collisionObject}.yy`,
        }
      : null,
    eventNum: event.eventNum,
    eventType: event.eventType,
    isDnD: false,
    name: "",
    resourceType: "GMEvent",
    resourceVersion: "2.0",
  }));
  const generatedVariableNames = new Set(object.variables.map((variable) => variable.name));
  const replacedVariableNames = new Set([...previousVariableNames, ...generatedVariableNames]);
  const existingProperties = Array.isArray(existing?.properties)
    ? existing.properties.filter((property) =>
        !property ||
        typeof property !== "object" ||
        !("name" in property) ||
        typeof property.name !== "string" ||
        !replacedVariableNames.has(property.name)
      )
    : [];
  const properties = [
    ...existingProperties,
    ...object.variables.map((variable) => ({
      $GMObjectProperty: "v2",
      "%Name": variable.name,
      filters: [],
      listItems: [],
      multiselect: false,
      name: variable.name,
      rangeEnabled: false,
      rangeMax: 10,
      rangeMin: 0,
      resourceType: "GMObjectProperty",
      resourceVersion: "2.0",
      value: variable.value,
      varType: 4,
    })),
  ];
  return {
    $GMObject: "",
    overriddenProperties: [],
    persistent: false,
    physicsAngularDamping: 0.1,
    physicsDensity: 0.5,
    physicsFriction: 0.2,
    physicsGroup: 1,
    physicsKinematic: false,
    physicsLinearDamping: 0.1,
    physicsObject: false,
    physicsRestitution: 0.1,
    physicsSensor: false,
    physicsShape: 1,
    physicsShapePoints: [],
    physicsStartAwake: true,
    resourceVersion: "2.0",
    solid: false,
    spriteId: null,
    spriteMaskId: null,
    visible: true,
    ...existing,
    "%Name": object.name,
    eventList,
    managed: true,
    name: object.name,
    parent,
    parentObjectId: object.parentObject
      ? {
          name: object.parentObject,
          path: `objects/${object.parentObject}/${object.parentObject}.yy`,
        }
      : null,
    properties,
    resourceType: "GMObject",
  };
}

function createScriptResource(
  name: string,
  parent: { name: string; path: string },
): Record<string, unknown> {
  return {
    $GMScript: "v1",
    "%Name": name,
    isCompatibility: false,
    isDnD: false,
    name,
    parent,
    resourceType: "GMScript",
    resourceVersion: "2.0",
  };
}

function assetParent(
  folder: readonly string[] | undefined,
  projectName: string,
  projectFileName: string,
): { name: string; path: string } {
  if (!folder || folder.length === 0) return { name: projectName, path: projectFileName };
  return { name: folder.at(-1)!, path: toFolderResourcePath(folder) };
}

function toFolderResourcePath(folder: readonly string[]): string {
  return `folders/${folder.join("/")}.yy`;
}

function safeProjectPath(projectDirectory: string, relativePath: string): string {
  return projectFilePath(projectDirectory, relativePath);
}

function normalizeResourcePath(resourcePath: string): string {
  return resourcePath.replaceAll("\\", "/");
}

async function removeEmptyAssetDirectories(
  projectDirectory: string,
  relativeFilePath: string,
): Promise<void> {
  const parts = relativeFilePath.replaceAll("\\", "/").split("/");
  if (parts.length < 3) return;
  const assetRoot = safeProjectPath(projectDirectory, parts[0]!);
  let directory = path.dirname(safeProjectPath(projectDirectory, relativeFilePath));

  while (directory !== assetRoot) {
    try {
      await fs.rmdir(directory);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTEMPTY" || code === "EEXIST") return;
      throw error;
    }
    directory = path.dirname(directory);
  }
}

async function queueFileIfChanged(writes: Map<string, string>, directory: string,
  relativePath: string, contents: string): Promise<boolean> {
  const fileName = safeProjectPath(directory, relativePath);
  const current = await readFileIfPresent(fileName);
  if (current !== undefined && fileContentsEqual(fileName, current, contents)) return false;
  writes.set(relativePath, contents);
  return true;
}

async function readFileIfPresent(fileName: string): Promise<string | undefined> {
  try {
    return await fs.readFile(fileName, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function fileContentsEqual(fileName: string, current: string, desired: string): boolean {
  if (current === desired) return true;
  if (!/\.yyp?$/i.test(fileName)) return false;
  try {
    return isDeepStrictEqual(JSON5.parse(current), JSON5.parse(desired));
  } catch {
    return false;
  }
}

function stringifyGameMakerResource(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertIdentifier(name: string, kind: string, fileName: string): void {
  if (!isGmlIdentifier(name)) {
    throw new Ts2GmlError([
      {
        code: "TS2GML4001",
        severity: "error",
        fileName,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 1,
        message: `The ${kind} name '${name}' is not a valid GML identifier.`,
      },
    ]);
  }
}
