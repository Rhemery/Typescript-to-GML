import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import JSON5 from "json5";
import ts from "typescript";
import {
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
} from "./compile.js";
import {
  compileObjectClass,
  isObjectClass,
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
import { readManifest, type Manifest } from "./manifest.js";
import { isGmlIdentifier } from "./gml-identifiers.js";
import { isGameMakerProjectOpen } from "./gamemaker-ide.js";

interface SourceUnit {
  fileName: string;
  folder: string[];
  sourceFile: ts.SourceFile;
  typeScriptSourceFile: ts.SourceFile;
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
  hotReloadOnly?: boolean;
  ideProjectSaved?: boolean;
  overwriteChangedGeneratedFiles?: boolean;
}

export class StructuralGameMakerChangesError extends Error {
  readonly changes: readonly string[];

  constructor(changes: readonly string[]) {
    const sortedChanges = [...changes].sort();
    super(
      `Cannot apply structural GameMaker changes until the project is saved in the IDE:\n${
        sortedChanges.map((fileName) => `  - ${fileName}`).join("\n")
      }\nNo generated GameMaker assets were changed. Save the project, then confirm the pending update in watch mode or run build --project-saved.`,
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
  typeDirectory: string;
  createdConfig: boolean;
}

export async function buildGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
  options: BuildOptions = {},
): Promise<BuildSummary> {
  const compiled = await compileGameMakerProject(inputs, projectFile);
  const blockStructuralChanges = options.hotReloadOnly ||
    (!options.ideProjectSaved && await isGameMakerProjectOpen(compiled.projectPath));
  const summary = await writeGeneratedAssets(compiled, { ...options, blockStructuralChanges });
  return {
    ...summary,
    declarations: compiled.declarations,
  };
}

export async function checkGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
): Promise<CheckSummary> {
  const compiled = await compileGameMakerProject(inputs, projectFile);
  return {
    projectPath: compiled.projectPath,
    typescriptDirectory: compiled.typeScriptDirectory,
    sourceFiles: compiled.sourceFiles,
    objects: compiled.objects.map((object) => object.name).sort(),
    rooms: compiled.rooms.map((room) => room.name).sort(),
    scripts: [...compiled.scripts.keys()].sort(),
  };
}

async function compileGameMakerProject(
  inputs: readonly string[],
  projectFile: string,
): Promise<CompiledProject> {
  const projectPath = path.resolve(projectFile);
  const projectDirectory = path.dirname(projectPath);
  const projectText = await fs.readFile(projectPath, "utf8");
  const project = JSON5.parse(projectText) as GMProject;
  if (!project.name || !Array.isArray(project.resources)) {
    throw new Error(`${projectPath} is not a valid GameMaker project.`);
  }

  const typeScriptProject = await prepareTypeScriptProject(projectPath);
  const sourceInputs = inputs.length > 0 ? inputs : [typeScriptProject.sourceDirectory];
  const sourceFiles = await discoverTypeScriptFiles(sourceInputs);
  const unitResults = await Promise.all(
    sourceFiles.map(async (fileName): Promise<SourceUnit | Error> => {
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
        const javascript = toJavaScript(source, fileName);
        const sourceFile = parseJavaScript(javascript, fileName);
        validateJavaScript(sourceFile);
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
        return { fileName, folder, sourceFile, typeScriptSourceFile };
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error));
      }
    }),
  );
  const diagnostics = unitResults.flatMap((result) =>
    result instanceof Ts2GmlError ? result.diagnostics : []
  );
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
  const otherFailure = unitResults.find((result) => result instanceof Error);
  if (otherFailure instanceof Error) throw otherFailure;
  const units = unitResults.filter((result): result is SourceUnit => !(result instanceof Error));

  const projectGlobalBindings = new Set(
    units.flatMap((unit) => [...collectTopLevelVariableBindings(unit.typeScriptSourceFile)]),
  );
  for (const unit of units) {
    try {
      validateTopLevelVariableReferences(unit.typeScriptSourceFile, projectGlobalBindings);
    } catch (error) {
      if (error instanceof Ts2GmlError) diagnostics.push(...error.diagnostics);
      else throw error;
    }
  }
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);

  const objectNames = findObjectNames(units);
  const objectResources = await readManagedObjectResources(projectDirectory, objectNames);
  const objects: CompiledObject[] = [];
  const rooms: CompiledRoomCreationCode[] = [];
  const scripts = new Map<string, string>();
  const generatedSymbols: GeneratedGlobalSymbol[] = [];
  const assetFolders = new Map<string, string[]>();
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
          assetFolders.set(object.name, unit.folder);
          continue;
        }
        if (ts.isClassDeclaration(statement) && isRoomClass(statement)) {
          rooms.push(compileRoomClass(statement, unit.sourceFile));
          continue;
        }
        unitSymbols.push(...topLevelGeneratedNames(statement));
        const gml = emitTopLevelGml(statement, unit.sourceFile);
        if (gml.trim()) scriptChunks.push(gml);
      }

      if (scriptChunks.length > 0) {
        const scriptName = path.basename(unit.fileName, path.extname(unit.fileName));
        assertIdentifier(scriptName, "script", unit.fileName);
        if (scripts.has(scriptName)) {
          throw new Error(`Multiple source files would generate the script '${scriptName}'.`);
        }
        scripts.set(scriptName, `${scriptChunks.join("\n\n").trim()}\n`);
        assetFolders.set(scriptName, unit.folder);
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

  assertUniqueAssets(objects, scripts);
  const roomResources = resolveRoomResources(rooms, project.resources);
  await validateObjectReferences(objects, project.resources, projectDirectory);
  await assertNoUnmanagedAssetConflicts(project, projectDirectory, objects, scripts);
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
    ...units.flatMap((unit) =>
      unit.sourceFile.statements.flatMap((statement) => {
        if (
          (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
          statement.name
        ) return [statement.name.text];
        if (!ts.isVariableStatement(statement)) return [];
        return statement.declarationList.declarations.flatMap((declaration) =>
          declaration.initializer &&
            ts.isCallExpression(declaration.initializer) &&
            ts.isIdentifier(declaration.initializer.expression) &&
            declaration.initializer.expression.text === "gm_macro" &&
            ts.isIdentifier(declaration.name)
            ? [declaration.name.text]
            : []
        );
      })
    ),
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
    typeScriptProject.typeDirectory,
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
  const names: string[] = [];
  const collect = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) {
      names.push(name.text);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) collect(element.name);
    }
  };
  for (const declaration of statement.declarationList.declarations) collect(declaration.name);
  return names;
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
  await ensureProjectRuntimeDeclarations(projectPath);

  let createdConfig = false;

  await fs.mkdir(sourceDirectory, { recursive: true });

  try {
    const contents = await fs.readFile(configPath, "utf8");
    const config = JSON5.parse(contents) as { include?: unknown };
    const oldTypesIncludes = new Set(["../.env/**/*.d.ts", "../ts2gml/types/**/*.d.ts"]);
    if (
      Array.isArray(config.include) &&
      config.include.some((entry) => typeof entry === "string" && oldTypesIncludes.has(entry))
    ) {
      config.include = config.include.map((entry) =>
        typeof entry === "string" && oldTypesIncludes.has(entry) ? projectTypesInclude : entry,
      );
      await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
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
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    createdConfig = true;
  }

  return { sourceDirectory, configPath, typeDirectory, createdConfig };
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
  typeDirectory: string,
  sourceFiles: readonly string[],
): void {
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
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
  compilerHost.getDefaultLibLocation = () => path.join(
    path.dirname(typeDirectory),
    "typescript",
    "lib",
  );
  programOptions.host = compilerHost;
  const program = ts.createProgram(programOptions);
  const diagnostics = [
    ...(loaded.error ? [loaded.error] : []),
    ...parsed.errors,
    ...ts.getPreEmitDiagnostics(program),
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
}

function findObjectNames(units: readonly SourceUnit[]): Set<string> {
  const classes = units.flatMap((unit) =>
    unit.sourceFile.statements.filter(ts.isClassDeclaration),
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
  projectDirectory: string,
  objects: readonly CompiledObject[],
  scripts: ReadonlyMap<string, string>,
): Promise<void> {
  const previous = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedPaths = new Set(previous.resources.map(normalizeResourcePath));
  const generatedResources = generatedResourceReferences(objects, scripts);
  const generatedPaths = new Set(
    generatedResources.map((resource) => normalizeResourcePath(resource.id.path)),
  );
  const generatedNames = new Set(generatedResources.map((resource) => resource.id.name));
  for (const resource of project.resources) {
    const resourcePath = normalizeResourcePath(resource.id.path);
    if (managedPaths.has(resourcePath)) continue;
    if (generatedPaths.has(resourcePath) || generatedNames.has(resource.id.name)) {
      throw new Error(
        `Cannot generate '${resource.id.name}': the project already has an unmanaged asset with that name or path.`,
      );
    }
  }
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

  if (!options.overwriteChangedGeneratedFiles) {
    await assertGeneratedFilesUnchanged(input.projectDirectory, previous);
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
  input.project.Folders = [...retainedFolders.values()].sort((left, right) =>
    left.folderPath.localeCompare(right.folderPath),
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

  for (const [relativePath, contents] of generatedFiles) {
    const absolute = safeProjectPath(input.projectDirectory, relativePath);
    if (await writeFileIfChanged(absolute, contents)) writtenGeneratedFiles.add(relativePath);
  }

  const writtenRoomResources = new Set<string>();
  for (const resourcePath of currentRoomResourcePaths) {
    if (
      await setRoomCreationCodeFile(
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
    if (await setRoomCreationCodeFile(input.projectDirectory, resourcePath, "", true)) {
      writtenRoomResources.add(resourcePath);
    }
  }

  if (!options.blockStructuralChanges) {
    await writeFileIfChanged(input.projectPath, projectContents);
  }

  for (const stalePath of previous.files) {
    if (currentPaths.has(stalePath)) continue;
    const absolute = safeProjectPath(input.projectDirectory, stalePath);
    await fs.rm(absolute, { force: true });
    await removeEmptyAssetDirectories(input.projectDirectory, stalePath);
  }

  const manifest: Manifest = {
    files: [...generatedFiles.keys()].sort(),
    generatedFileHashes: Object.fromEntries(
      [...generatedFiles.entries()]
        .filter(([relativePath]) => !generatedObjectResourcePaths.has(relativePath))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([relativePath, contents]) => [relativePath, hashContents(contents)]),
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
  await writeFileIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

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

function isHotReloadableCodePath(relativePath: string): boolean {
  return normalizeResourcePath(relativePath).toLowerCase().endsWith(".gml");
}

function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

async function assertGeneratedFilesUnchanged(
  projectDirectory: string,
  previous: Manifest,
): Promise<void> {
  const changes: string[] = [];
  for (const relativePath of previous.files) {
    const expectedHash = previous.generatedFileHashes[relativePath];
    if (!expectedHash) continue;
    try {
      const contents = await fs.readFile(safeProjectPath(projectDirectory, relativePath), "utf8");
      if (hashContents(contents) !== expectedHash) changes.push(`modified: ${relativePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        changes.push(`deleted: ${relativePath}`);
        continue;
      }
      throw error;
    }
  }
  if (changes.length === 0) return;
  throw new Error(
    `Cannot update generated files because they were changed outside ts2gml:\n${changes
      .map((change) => `  - ${change}`)
      .join("\n")}\nMove the changes into TypeScript, restore the generated files, or run build with --overwrite-generated to discard them.`,
  );
}

function hashContents(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
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
  return writeFileIfChanged(
    safeProjectPath(projectDirectory, resourcePath),
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
  const normalized = relativePath.replaceAll("/", path.sep);
  const absolute = path.resolve(projectDirectory, normalized);
  const prefix = `${path.resolve(projectDirectory)}${path.sep}`;
  if (!absolute.startsWith(prefix)) {
    throw new Error(`Generated path escapes the GameMaker project: ${relativePath}`);
  }
  return absolute;
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

async function writeFileIfChanged(fileName: string, contents: string): Promise<boolean> {
  const current = await readFileIfPresent(fileName);
  if (current !== undefined && fileContentsEqual(fileName, current, contents)) return false;
  await fs.mkdir(path.dirname(fileName), { recursive: true });
  await fs.writeFile(fileName, contents, "utf8");
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
