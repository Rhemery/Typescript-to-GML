import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  clearProjectRuntimeSelection,
  ensureProjectRuntimeDeclarations,
  findInstalledGmlSpec,
  GmlSpecAmbiguityError,
  renderDeclarations,
  saveProjectRuntimeSelection,
} from "../src/declarations/generate.js";

function renderRuntimeSpec(functionName: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GameMakerLanguageSpec RuntimeVersion="test">
  <Functions>
    <Function Name="${functionName}" ReturnType="Real" />
    <Function Name="time_source_create" ReturnType="Id.TimeSource">
      <Parameter Name="parent" Type="Id.TimeSource,Constant.TimeSource" Optional="false" />
      <Parameter Name="period" Type="Real" Optional="false" />
      <Parameter Name="units" Type="Constant.TimeSourceUnits" Optional="false" />
    </Function>
  </Functions>
  <Variables />
  <Constants>
    <Constant Name="time_source_global" Type="Real" Class="TimeSource">The global time source.</Constant>
    <Constant Name="time_source_units_frames" Type="Real" Class="TimeSourceUnits">Use frames for the period.</Constant>
  </Constants>
  <Structures />
  <Enumerations />
</GameMakerLanguageSpec>
`;
}

async function createRuntimeInstallation(
  installationDirectory: string,
  runtimeVersion: string,
  spec: string,
): Promise<string> {
  const runtimeDirectory = path.join(
    installationDirectory,
    "Cache",
    "runtimes",
    `runtime-${runtimeVersion}`,
  );
  const specPath = path.join(runtimeDirectory, "GmlSpec.xml");
  await fs.mkdir(runtimeDirectory, { recursive: true });
  await fs.writeFile(specPath, spec);
  await fs.writeFile(
    path.join(installationDirectory, "runtime.json"),
    JSON.stringify({
      active: runtimeVersion,
      [runtimeVersion]: `${runtimeDirectory}&https://example.invalid/runtime.rss`,
    }),
  );
  return specPath;
}

test("renders runtime functions, constants, structs, and instance variables", () => {
  const declarations = renderDeclarations({
    runtimeVersion: "test",
    functions: [
      {
        Name: "point_distance",
        ReturnType: "Real",
        Description: "Returns the distance between two points.",
        Parameter: [
          { Name: "x1", Type: "Real", Optional: "false", text: "The first x coordinate." },
          {
            Name: "target",
            Type: "Asset.GMObject,Id.Instance",
            Optional: "true",
            text: "The target object or instance.",
          },
        ],
      },
      {
        Name: "room_goto",
        ReturnType: "Undefined",
        Parameter: [{ Name: "room", Type: "Asset.GMRoom", Optional: "false" }],
      },
      {
        Name: "instance_create_layer",
        ReturnType: "Id.Instance",
        Parameter: [
          { Name: "x", Type: "Real", Optional: "false" },
          { Name: "y", Type: "Real", Optional: "false" },
          { Name: "layer_id", Type: "String,Id.Layer", Optional: "false" },
          { Name: "obj", Type: "Asset.GMObject", Optional: "false" },
        ],
      },
    ],
    constants: [
      {
        Name: "vk_space",
        Class: "VirtualKey",
        Type: "Real",
        Deprecated: "true",
        text: "The space key.",
      },
      { Name: "global", Type: "Real" },
      { Name: "time_source_global", Type: "Real", Class: "TimeSource" },
      { Name: "time_source_units_frames", Type: "Real", Class: "TimeSourceUnits" },
    ],
    variables: [
      {
        Name: "x",
        Type: "Real",
        Set: "true",
        Instance: "true",
        text: "The instance x position.",
      },
      { Name: "id", Type: "Id.Instance", Set: "false", Instance: "true" },
    ],
    structures: [
      {
        Name: "Point",
        Field: [{ Name: "x", Type: "Real", Set: "true", text: "The point x coordinate." }],
      },
    ],
    enumerations: [
      {
        Name: "Direction",
        Member: [{ Name: "left", Value: "0", text: "The left direction." }],
      },
    ],
  });

  assert.match(
    declarations,
    /declare function point_distance\(x1: number, target\?: GM\.Asset\.GMObject \| GM\.Id\.Instance\): number;/,
  );
  assert.match(
    declarations,
    /type RuntimeReference<Kind extends string, Name extends string = string> = number & \{ readonly __gmRuntimeType\?: `\$\{Kind\}\.\$\{Name\}` \};/,
  );
  assert.match(declarations, /\* Returns the distance between two points\./);
  assert.match(declarations, /\* @param x1 The first x coordinate\./);
  assert.match(declarations, /\* @param target The target object or instance\./);
  assert.match(
    declarations,
    /\/\*\*\n \* The space key\.\n \* @deprecated\n \*\/\ndeclare const vk_space/,
  );
  assert.match(declarations, /\* The point x coordinate\.[\s\S]*x: number;/);
  assert.match(declarations, /\* The left direction\.[\s\S]*left = 0/);
  assert.equal(declarations.match(/\* The instance x position\./g)?.length, 2);
  assert.match(declarations, /declare const vk_space: GM\.Constant\.VirtualKey;/);
  assert.match(declarations, /declare const time_source_global: GM\.Constant\.TimeSource;/);
  assert.match(
    declarations,
    /declare const time_source_units_frames: GM\.Constant\.TimeSourceUnits;/,
  );
  assert.match(declarations, /declare const gm_global: GMGlobal;/);
  assert.match(declarations, /interface Point extends GMStruct/);
  assert.match(declarations, /readonly id: GM\.Id\.Instance;/);
  assert.match(declarations, /declare enum Direction/);
  assert.match(
    declarations,
    /type GMRoom = AssetReference<"GMRoom"> \| GMRoomClass;/,
  );
  assert.match(
    declarations,
    /type GMObject = AssetReference<"GMObject"> \| GMObjectClass;/,
  );
  assert.match(
    declarations,
    /instance_create_layer<T extends GMObject>\([^)]+obj: GMObjectClass<T>[^)]*\): GMInstance<T>;/,
  );
});

test("selects the active runtime compatible with the project IDE family", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-discovery-"));
  const projectPath = path.join(temporary, "Fixture.yyp");
  await fs.writeFile(
    projectPath,
    JSON.stringify({ MetaData: { IDEVersion: "2026.0.0.16" } }),
  );
  const compatibleInstallation = path.join(temporary, "GameMakerStudio2-LTS2026");
  const otherInstallation = path.join(temporary, "GameMakerStudio2");
  const compatibleSpec = await createRuntimeInstallation(
    compatibleInstallation,
    "2026.0.0.23",
    renderRuntimeSpec("lts_function"),
  );
  await createRuntimeInstallation(
    otherInstallation,
    "2026.100.0.1090",
    renderRuntimeSpec("monthly_function"),
  );

  const discovered = await findInstalledGmlSpec({
    projectFile: projectPath,
    installationDirectories: [otherInstallation, compatibleInstallation],
    environment: {},
  });

  assert.equal(discovered, compatibleSpec);
});

test("requires and remembers a project selection for equally compatible installations", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-selection-"));
  const projectPath = path.join(temporary, "Fixture.yyp");
  await fs.writeFile(
    projectPath,
    JSON.stringify({ MetaData: { IDEVersion: "2026.0.0.16" } }),
  );
  const ltsInstallation = path.join(temporary, "GameMakerStudio2-LTS2026");
  const betaInstallation = path.join(temporary, "GameMakerStudio2-Beta");
  await createRuntimeInstallation(
    ltsInstallation,
    "2026.0.0.23",
    renderRuntimeSpec("lts_function"),
  );
  const betaSpec = await createRuntimeInstallation(
    betaInstallation,
    "2026.0.0.24",
    renderRuntimeSpec("beta_function"),
  );
  const discovery = {
    projectFile: projectPath,
    installationDirectories: [ltsInstallation, betaInstallation],
    environment: {},
  };

  await assert.rejects(
    findInstalledGmlSpec(discovery),
    (error: unknown) =>
      error instanceof GmlSpecAmbiguityError && error.candidates.length === 2,
  );
  const typeDirectory = path.join(temporary, "datafiles", "ts2gml", "types");
  await fs.mkdir(typeDirectory, { recursive: true });
  await fs.writeFile(
    path.join(typeDirectory, "gamemaker.generated.d.ts"),
    "declare function existing_local_declaration(): number;\n",
  );
  await assert.rejects(
    ensureProjectRuntimeDeclarations(projectPath, discovery),
    GmlSpecAmbiguityError,
  );

  const selectionPath = await saveProjectRuntimeSelection(projectPath, betaInstallation);
  assert.deepEqual(JSON.parse(await fs.readFile(selectionPath, "utf8")), {
    installationDirectory: betaInstallation,
  });
  assert.equal(await findInstalledGmlSpec(discovery), betaSpec);

  await clearProjectRuntimeSelection(projectPath);
  await assert.rejects(findInstalledGmlSpec(discovery), GmlSpecAmbiguityError);
});

test("generates and refreshes project-local runtime declarations from GmlSpec", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-sync-"));
  const projectPath = path.join(temporary, "Fixture.yyp");
  await fs.writeFile(
    projectPath,
    JSON.stringify({ MetaData: { IDEVersion: "2026.0.0.16" } }),
  );
  const typeDirectory = path.join(temporary, "datafiles", "ts2gml", "types");
  await fs.mkdir(typeDirectory, { recursive: true });
  await fs.writeFile(path.join(typeDirectory, "core.d.ts"), "interface GMObject {}\n");
  await fs.writeFile(
    path.join(typeDirectory, "index.d.ts"),
    '/// <reference path="./core.d.ts" />\n/// <reference path="./gamemaker.generated.d.ts" />\n',
  );
  const installationDirectory = path.join(temporary, "GameMakerStudio2-LTS2026");
  const firstSpec = renderRuntimeSpec("runtime_first");
  const specPath = await createRuntimeInstallation(
    installationDirectory,
    "2026.0.0.23",
    firstSpec,
  );
  const discovery = {
    installationDirectories: [installationDirectory],
    environment: {},
  };

  const first = await ensureProjectRuntimeDeclarations(projectPath, discovery);
  const declarationPath = path.join(typeDirectory, "gamemaker.generated.d.ts");
  const firstContents = await fs.readFile(declarationPath, "utf8");
  assert.equal(first.written, true);
  assert.equal(first.usedCachedDeclarations, false);
  assert.match(firstContents, /declare function runtime_first\(\): number;/);
  assert.match(
    firstContents,
    /declare const time_source_global: GM\.Constant\.TimeSource;/,
  );
  assert.match(
    firstContents,
    /declare const time_source_units_frames: GM\.Constant\.TimeSourceUnits;/,
  );
  assert.match(
    firstContents,
    new RegExp(createHash("sha256").update(firstSpec).digest("hex")),
  );

  await fs.writeFile(
    declarationPath,
    firstContents.replace(/\/\/ Runtime declaration generation complete\.\s*$/, ""),
  );
  const repaired = await ensureProjectRuntimeDeclarations(projectPath, discovery);
  assert.equal(repaired.written, true);
  assert.equal(await fs.readFile(declarationPath, "utf8"), firstContents);

  const unchanged = await ensureProjectRuntimeDeclarations(projectPath, discovery);
  assert.equal(unchanged.written, false);
  assert.equal(await fs.readFile(declarationPath, "utf8"), firstContents);

  await fs.writeFile(specPath, renderRuntimeSpec("runtime_second"));
  const refreshed = await ensureProjectRuntimeDeclarations(projectPath, discovery);
  const refreshedContents = await fs.readFile(declarationPath, "utf8");
  assert.equal(refreshed.written, true);
  assert.doesNotMatch(refreshedContents, /runtime_first/);
  assert.match(refreshedContents, /declare function runtime_second\(\): number;/);
});

test("keeps locally generated runtime declarations when GameMaker is temporarily unavailable", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-cache-"));
  const projectPath = path.join(temporary, "Fixture.yyp");
  await fs.writeFile(projectPath, JSON.stringify({ resources: [] }));
  const typeDirectory = path.join(temporary, "datafiles", "ts2gml", "types");
  const declarationPath = path.join(typeDirectory, "gamemaker.generated.d.ts");
  await fs.mkdir(typeDirectory, { recursive: true });
  const installationDirectory = path.join(temporary, "GameMakerStudio2-LTS2026");
  await createRuntimeInstallation(
    installationDirectory,
    "2026.0.0.23",
    renderRuntimeSpec("locally_generated"),
  );
  await ensureProjectRuntimeDeclarations(projectPath, {
    installationDirectories: [installationDirectory],
    environment: {},
  });

  const cached = await ensureProjectRuntimeDeclarations(projectPath, {
    installationDirectories: [],
    environment: {},
  });

  assert.equal(cached.written, false);
  assert.equal(cached.usedCachedDeclarations, true);
  assert.match(await fs.readFile(declarationPath, "utf8"), /locally_generated/);

  await fs.rm(declarationPath);
  await assert.rejects(
    ensureProjectRuntimeDeclarations(projectPath, {
      installationDirectories: [],
      environment: {},
    }),
    /declarations are missing and could not be generated/,
  );
});
