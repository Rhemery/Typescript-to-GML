import { promises as fs } from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { readManifest } from "../compiler/manifest.js";
import { getProjectTypesDirectory } from "../project-layout.js";
import {
  extractGmlDeclarations,
  type GmlEnumerationDeclaration,
  type GmlFunctionDeclaration,
  type GmlMacroDeclaration,
  type GmlParameterDeclaration,
} from "./gml.js";
import { mapGmlJsDocType } from "./jsdoc.js";
import { readRuntimeDeclarationBindings } from "./runtime.js";

interface ProjectResource {
  id: {
    name: string;
    path: string;
  };
}

interface GMProject {
  resources: ProjectResource[];
}

export interface ProjectAssetDeclaration {
  name: string;
  resourcePath: string;
  type: string;
}

export interface ProjectDeclarationSummary {
  outputPath: string;
  assets: ProjectAssetDeclaration[];
  functions: ProjectFunctionDeclaration[];
  macros: ProjectMacroDeclaration[];
  enumerations: ProjectEnumerationDeclaration[];
  globals: string[];
  written: boolean;
}

export interface ProjectFunctionDeclaration extends GmlFunctionDeclaration {
  resourcePath: string;
}

export interface ProjectMacroDeclaration extends GmlMacroDeclaration {
  resourcePath: string;
}

export interface ProjectEnumerationDeclaration extends GmlEnumerationDeclaration {
  resourcePath: string;
}

export interface ProjectDeclarationOptions {
  excludedAssetNames?: ReadonlySet<string>;
  additionalObjectNames?: ReadonlySet<string>;
}

const assetTypes = new Map<string, string>([
  ["animcurves", "GMAnimCurve"],
  ["audiogroups", "GMAudioGroup"],
  ["fonts", "GMFont"],
  ["objects", "GMObject"],
  ["particles", "GMParticleSystem"],
  ["particlesystems", "GMParticleSystem"],
  ["paths", "GMPath"],
  ["rooms", "GMRoom"],
  ["scripts", "GMScript"],
  ["sequences", "GMSequence"],
  ["shaders", "GMShader"],
  ["sounds", "GMSound"],
  ["sprites", "GMSprite"],
  ["tilesets", "GMTileSet"],
  ["timelines", "GMTimeline"],
]);

export async function generateProjectDeclarations(
  projectFile: string,
  options: ProjectDeclarationOptions = {},
): Promise<ProjectDeclarationSummary> {
  const projectPath = path.resolve(projectFile);
  const projectDirectory = path.dirname(projectPath);
  const typeDirectory = getProjectTypesDirectory(projectDirectory);
  const outputPath = path.join(typeDirectory, "gamemaker.project.generated.d.ts");
  const runtimeDeclarationBindings = await readRuntimeDeclarationBindings(typeDirectory);
  const project = JSON5.parse(await fs.readFile(projectPath, "utf8")) as GMProject;
  if (!Array.isArray(project.resources)) {
    throw new Error(`${projectPath} is not a valid GameMaker project.`);
  }

  const manifest = await readManifest(path.join(projectDirectory, ".ts2gml", "manifest.json"));
  const managedResources = new Set(manifest.resources.map(normalizeResourcePath));
  const declarations = new Map<string, ProjectAssetDeclaration>();
  const functions = new Map<string, ProjectFunctionDeclaration>();
  const macros = new Map<string, ProjectMacroDeclaration>();
  const enumerations = new Map<string, ProjectEnumerationDeclaration>();
  const globals = new Set<string>();
  const globalVariables = new Set<string>();
  const objectNames = new Set(options.additionalObjectNames);

  for (const resource of project.resources) {
    if (!resource.id?.name || !resource.id.path) continue;
    const resourcePath = normalizeResourcePath(resource.id.path);
    if (
      resourcePath.toLowerCase().startsWith("objects/") &&
      !managedResources.has(resourcePath)
    ) {
      objectNames.add(resource.id.name);
    }
    if (options.excludedAssetNames?.has(resource.id.name)) continue;
    if (managedResources.has(resourcePath)) continue;
    const type = assetTypes.get(resourcePath.split("/", 1)[0]!.toLowerCase());
    if (!type) continue;
    if (!/^[$A-Z_a-z][$\w]*$/.test(resource.id.name)) {
      throw new Error(
        `Cannot declare GameMaker asset '${resource.id.name}': its name is not a TypeScript identifier.`,
      );
    }
    if (declarations.has(resource.id.name)) {
      throw new Error(`Cannot declare duplicate GameMaker asset '${resource.id.name}'.`);
    }
    declarations.set(resource.id.name, {
      name: resource.id.name,
      resourcePath,
      type,
    });

    if (type === "GMScript") {
      const relativeGmlPath = resourcePath.replace(/\.yy$/i, ".gml");
      const gmlPath = path.resolve(projectDirectory, relativeGmlPath);
      const relativePath = path.relative(projectDirectory, gmlPath);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error(`Script resource '${resourcePath}' is outside the GameMaker project.`);
      }
      let source: string;
      try {
        source = await fs.readFile(gmlPath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      const extracted = extractGmlDeclarations(source);
      for (const fn of extracted.functions) {
        const previous = functions.get(fn.name);
        if (previous) {
          throw new Error(
            `Duplicate global GML function '${fn.name}' in '${previous.resourcePath}' and '${resourcePath}'.`,
          );
        }
        functions.set(fn.name, { ...fn, resourcePath });
      }
      for (const macro of extracted.macros) {
        const previous = macros.get(macro.name);
        if (previous) {
          throw new Error(
            `Duplicate global GML macro '${macro.name}' in '${previous.resourcePath}' and '${resourcePath}'.`,
          );
        }
        macros.set(macro.name, { ...macro, resourcePath });
      }
      for (const enumeration of extracted.enumerations) {
        const previous = enumerations.get(enumeration.name);
        if (previous) {
          throw new Error(
            `Duplicate global GML enum '${enumeration.name}' in '${previous.resourcePath}' and '${resourcePath}'.`,
          );
        }
        enumerations.set(enumeration.name, { ...enumeration, resourcePath });
      }
      for (const name of extracted.globals) globals.add(name);
      for (const name of extracted.globalVariables) globalVariables.add(name);
    }
  }

  const assets = [...declarations.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const scriptFunctions = [...functions.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const scriptMacros = [...macros.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const scriptEnumerations = [...enumerations.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const globalSymbols = new Map<string, { kind: string; resourcePath: string }>();
  for (const [kind, symbols] of [
    ["function", scriptFunctions],
    ["macro", scriptMacros],
    ["enum", scriptEnumerations],
  ] as const) {
    for (const symbol of symbols) {
      const previous = globalSymbols.get(symbol.name);
      if (previous) {
        throw new Error(
          `Global GML ${kind} '${symbol.name}' in '${symbol.resourcePath}' conflicts with ${previous.kind} in '${previous.resourcePath}'.`,
        );
      }
      globalSymbols.set(symbol.name, { kind, resourcePath: symbol.resourcePath });
    }
  }
  for (const [name, symbol] of globalSymbols) {
    const asset = declarations.get(name);
    if (asset && asset.resourcePath !== symbol.resourcePath) {
      throw new Error(
        `Global GML ${symbol.kind} '${name}' in '${symbol.resourcePath}' conflicts with asset '${asset.resourcePath}'.`,
      );
    }
  }
  const globalNames = [...globals].sort();
  const authoredObjectNames = new Set(options.additionalObjectNames);
  const collisionObjectNames = [...objectNames]
    .filter((name) => /^[$A-Z_a-z][$\w]*$/.test(name))
    .sort((left, right) => left.localeCompare(right));
  const lines = [
    "// Generated by typescript-to-gml from the GameMaker project.",
    "// Unmanaged IDE assets and GML script globals are declared here; do not edit manually.",
    "",
    ...assets
      .filter((asset) => !globalSymbols.has(asset.name))
      .map((asset) => `declare const ${asset.name}: GM.Asset.${asset.type};`),
    ...scriptFunctions.flatMap((fn) => {
      const parameters = renderFunctionParameters(fn.parameters);
      const documentation = renderFunctionDocumentation(fn);
      const returnType = fn.constructor ? "GMStruct" : mapGmlJsDocType(fn.returnType);
      return fn.constructor
        ? [
            ...documentation,
            `declare const ${fn.name}: {`,
            `  (${parameters}): ${returnType};`,
            `  new (${parameters}): ${returnType};`,
            "};",
          ]
        : [
            ...documentation,
            `declare function ${fn.name}(${parameters}): ${returnType};`,
          ];
    }),
    ...scriptMacros
      .filter((macro) => !runtimeDeclarationBindings.has(macro.name))
      .map((macro) => `declare const ${macro.name}: ${macro.type};`),
    ...scriptEnumerations.flatMap((enumeration) => [
      `declare enum ${enumeration.name} {`,
      ...enumeration.members.map((member) => `  ${member},`),
      "}",
    ]),
    ...(globalNames.length > 0
      ? [
          "",
          "interface GMGlobal {",
          ...globalNames.map((name) => `  ${name}: any;`),
          "}",
        ]
      : []),
    ...[...globalVariables]
      .sort()
      .map((name) => `declare let ${name}: any;`),
    ...(collisionObjectNames.length > 0
      ? [
          "",
          "interface GMObject {",
          ...collisionObjectNames.map((name) => {
            const otherType = authoredObjectNames.has(name)
              ? `GMInstance<${name}>`
              : "GMInstance";
            return `  onCollision_${name}?(other: ${otherType}): void;`;
          }),
          "}",
        ]
      : []),
    "",
  ];
  const contents = lines.join("\n");
  let previous: string | undefined;
  try {
    previous = await fs.readFile(outputPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const written = previous !== contents;
  if (written) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, contents, "utf8");
  }

  return {
    outputPath,
    assets,
    functions: scriptFunctions,
    macros: scriptMacros,
    enumerations: scriptEnumerations,
    globals: globalNames,
    written,
  };
}

function normalizeResourcePath(resourcePath: string): string {
  return resourcePath.replaceAll("\\", "/");
}

function renderFunctionParameters(parameters?: readonly GmlParameterDeclaration[]): string {
  if (!parameters) return "...args: any[]";
  let lastRequired = -1;
  for (let index = 0; index < parameters.length; index += 1) {
    if (!parameters[index]!.optional) lastRequired = index;
  }
  return parameters.map((parameter, index) => {
    const type = mapGmlJsDocType(parameter.type);
    if (!parameter.optional) return `${parameter.name}: ${type}`;
    return index > lastRequired
      ? `${parameter.name}?: ${type}`
      : `${parameter.name}: ${type} | undefined`;
  }).join(", ");
}

function renderFunctionDocumentation(fn: ProjectFunctionDeclaration): string[] {
  const parameterDocs = fn.parameters?.filter((parameter) => parameter.description) ?? [];
  if (!fn.description && parameterDocs.length === 0 && !fn.returnDescription) return [];
  const lines = ["/**"];
  if (fn.description) {
    for (const line of fn.description.split("\n")) lines.push(` * ${escapeDocumentation(line)}`);
  }
  for (const parameter of parameterDocs) {
    lines.push(` * @param ${parameter.name} ${escapeDocumentation(parameter.description!)}`);
  }
  if (fn.returnDescription) {
    lines.push(` * @returns ${escapeDocumentation(fn.returnDescription)}`);
  }
  lines.push(" */");
  return lines;
}

function escapeDocumentation(value: string): string {
  return value.replaceAll("*/", "*\\/");
}
