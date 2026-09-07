import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { Ts2GmlError } from "../src/compiler/compile.js";
import {
  buildGameMakerProject,
  applyRuntimeGuardProfile,
  checkGameMakerProject,
  prepareTypeScriptProject,
  ResourceConflictError,
} from "../src/compiler/project.js";
import { watchGameMakerProject } from "../src/compiler/watch.js";
import {
  defaultRuntimeGuardConfiguration,
  detectRuntimeGuardConfiguration,
  detectRuntimeGuardProfile,
} from "../src/compiler/runtime-guards.js";

const execFileAsync = promisify(execFile);
const emptyProgramData = path.join(os.tmpdir(), `ts2gml-no-runtime-${process.pid}`);
await fs.mkdir(emptyProgramData, { recursive: true });
process.env.ProgramData = emptyProgramData;
process.env.PROGRAMDATA = emptyProgramData;
process.env.GAMEMAKER_GML_SPEC = "";

const testRuntimeDeclarations = `
declare namespace GM {
  namespace Asset {
    type GMObject = number | GMObjectClass;
    type GMRoom = number;
    type GMScript = number;
    type GMSprite = number;
  }
  namespace Id { type Instance = number; }
  namespace Constant { type All = number; }
}
interface GMObject { [name: string]: any; }
declare const c_white: number;
declare const gm_global: GMGlobal;
declare function abs(value: number): number;
declare function draw_self(): void;
declare function font_add_sprite(...args: any[]): number;
declare function font_add_sprite_ext(...args: any[]): number;
declare function instance_create_layer(...args: any[]): any;
declare function room_goto(room: any): void;
declare function show_debug_message(value: any): void;
`;

async function createEmptyProject(directory: string, name: string): Promise<string> {
  const projectPath = path.join(directory, `${name}.yyp`);
  await fs.writeFile(
    projectPath,
    JSON.stringify(
      {
        $GMProject: "v1",
        "%Name": name,
        name,
        resources: [],
        resourceType: "GMProject",
        resourceVersion: "2.0",
      },
      null,
      2,
    ),
  );
  return projectPath;
}

async function installTool(directory: string): Promise<string> {
  const toolDirectory = path.join(directory, "datafiles", "ts2gml");
  await fs.cp(path.resolve("dist", "ts2gml"), toolDirectory, { recursive: true });
  await fs.writeFile(
    path.join(toolDirectory, "types", "gamemaker.generated.d.ts"),
    testRuntimeDeclarations,
  );
  return toolDirectory;
}

async function addRoom(
  directory: string,
  projectPath: string,
  name: string,
  creationCodeFile = "",
): Promise<void> {
  const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string; path: string } }>;
  };
  const resourcePath = `rooms/${name}/${name}.yy`;
  project.resources.push({ id: { name, path: resourcePath } });
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
  const absolute = path.join(directory, resourcePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(
    absolute,
    JSON.stringify({
      $GMRoom: "v1",
      "%Name": name,
      creationCodeFile,
      name,
      resourceType: "GMRoom",
      resourceVersion: "2.0",
    }),
  );
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for the watched project to rebuild.");
}

test("generates shared object statics across files and removes stale static scripts", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-statics-"));
  try {
    const projectPath = await createEmptyProject(temporary, "Statics");
    await installTool(temporary);
    const sourceDirectory = path.join(temporary, "typescript");
    await fs.mkdir(sourceDirectory);
    const objectPath = path.join(sourceDirectory, "obj_counter.ts");
    await fs.writeFile(objectPath, `
class obj_counter extends GMObject {
  static count = 1;
  static increment(): number { this.count += 1; return this.count; }
  static onStep(value: number): number { return value; }
  count = 10;
  protected onCreate() { obj_counter.increment(); }
}
class obj_child_counter extends obj_counter {}
`);
    const utilityPath = path.join(sourceDirectory, "static_use.ts");
    await fs.writeFile(utilityPath, `
function readStatic(): number {
  const Alias = obj_child_counter;
  Alias.count += 1;
  return Alias.increment() + obj_counter.onStep(2);
}
`);
    const first = await buildGameMakerProject([], projectPath);
    assert.deepEqual(first.scripts, ["__ts2gml_class_statics", "obj_counter_statics", "static_use"]);
    const statics = await fs.readFile(path.join(temporary, "scripts/obj_counter_statics/obj_counter_statics.gml"), "utf8");
    assert.match(statics, /__ts2gml_class_statics\(obj_counter, true\)/);
    assert.match(statics, /static_set\(self, __ts2gml_class_statics\(obj_counter\)\)/);
    assert.match(statics, /self\.onStep = method/);
    const create = await fs.readFile(path.join(temporary, "objects/obj_counter/Create_0.gml"), "utf8");
    assert.match(create, /__ts2gml_class_statics\(obj_counter\)\.increment\(\)/);
    assert.doesNotMatch(create, /self\.(?:increment|onStep) =/);
    const resource = JSON.parse(await fs.readFile(path.join(temporary, "objects/obj_counter/obj_counter.yy"), "utf8")) as {
      properties: Array<{ name: string; value: string }>;
    };
    assert.deepEqual(resource.properties.map((property) => [property.name, property.value]), [["count", "10"]]);
    const utility = await fs.readFile(path.join(temporary, "scripts/static_use/static_use.gml"), "utf8");
    assert.match(utility, /__ts2gml_class_statics\(Alias\)\.count \+= 1/);
    assert.deepEqual((await buildGameMakerProject([], projectPath)).writtenFiles, []);

    await fs.writeFile(objectPath, "class obj_counter extends GMObject { count = 10; }");
    await fs.writeFile(utilityPath, "function readStatic(): number { return 0; }");
    const cleaned = await buildGameMakerProject([], projectPath);
    assert.deepEqual(cleaned.scripts, ["static_use"]);
    for (const script of ["__ts2gml_class_statics", "obj_counter_statics"]) {
      await assert.rejects(fs.access(path.join(temporary, "scripts", script, `${script}.gml`)),
        (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT");
    }
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test("writes scripts and event-driven objects into a GameMaker project idempotently", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-project-"));
  const projectPath = await createEmptyProject(temporary, "Fixture");
  const fixtureProject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string; path: string } }>;
  };
  fixtureProject.resources.push({ id: { name: "Sprite1", path: "sprites/Sprite1/Sprite1.yy" } });
  await fs.writeFile(projectPath, JSON.stringify(fixtureProject, null, 2));
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "utility.ts"),
    "export function twice(value: number): number { return value * 2; }",
  );
  const objectSource = path.join(sourceDirectory, "objects.ts");
  await fs.writeFile(
    objectSource,
    `
class obj_enemy extends GMObject {
  health = 10;
  constructor() { super(); this.takeDamage(1); }
  protected onCreate() { this.takeDamage(1); }
  protected onStep() { this.x += 1; }
  protected onDraw() { draw_self(); }
  takeDamage(value: number) { this.health -= value; }
}
class obj_fast_enemy extends obj_enemy {
  speed = 2;
  protected onAlarm0() { this.health = 10; }
  protected onCollision_obj_enemy(other: GMInstance<obj_enemy>) {
    this.health -= 1;
    other.health -= 1;
  }
}
`,
  );

  const first = await buildGameMakerProject([], projectPath);
  assert.deepEqual(first.objects, ["obj_enemy", "obj_fast_enemy"]);
  assert.deepEqual(first.scripts, ["utility"]);
  assert.equal(first.typescriptDirectory, sourceDirectory);
  await fs.access(
    path.join(temporary, "datafiles", "ts2gml", "types", "gamemaker.generated.d.ts"),
  );
  const typeScriptConfig = JSON.parse(
    await fs.readFile(path.join(sourceDirectory, "tsconfig.json"), "utf8"),
  ) as { include: string[] };
  assert.deepEqual(typeScriptConfig.include, [
    "**/*.ts",
    "../datafiles/ts2gml/types/**/*.d.ts",
  ]);
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(temporary, "ts2gml.config.json"), "utf8")),
    {
      runtimeGuards: {
        run: "standard",
        build: "standard",
        configurations: {},
      },
    },
  );
  await fs.access(path.join(temporary, "pre_run_step.bat"));
  await fs.access(path.join(temporary, "pre_build_step.sh"));
  await fs.access(path.join(temporary, "pre_project_step.bat"));
  const enemyCreate = await fs.readFile(
    path.join(temporary, "objects", "obj_enemy", "Create_0.gml"),
    "utf8",
  );
  const enemyStep = await fs.readFile(
    path.join(temporary, "objects", "obj_enemy", "Step_0.gml"),
    "utf8",
  );
  const enemyCollision = await fs.readFile(
    path.join(temporary, "objects", "obj_fast_enemy", "Collision_obj_enemy.gml"),
    "utf8",
  );
  assert.match(enemyCreate, /self\.takeDamage = function\(_value\)/);
  assert.ok(
    enemyCreate.indexOf("self.takeDamage = function") < enemyCreate.indexOf("self.takeDamage(1)"),
  );
  assert.match(enemyStep, /self\.x \+= 1/);
  assert.match(enemyCollision, /other\.health -= 1/);
  await assert.rejects(
    fs.access(path.join(temporary, "objects", "obj_enemy", "PreCreate_0.gml")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  const childResource = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_fast_enemy", "obj_fast_enemy.yy"), "utf8"),
  ) as {
    parentObjectId: { name: string };
    persistent: boolean;
    properties: Array<{ name: string; value: string; varType: number }>;
    visible: boolean;
    eventList: Array<{ eventType: number; collisionObjectId: { name: string } | null }>;
  };
  assert.equal(childResource.parentObjectId.name, "obj_enemy");
  assert.equal(childResource.persistent, false);
  assert.deepEqual(
    childResource.properties.map((property) => [property.name, property.value, property.varType]),
    [["speed", "2", 4]],
  );
  assert.equal(childResource.visible, true);
  const enemyResource = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"), "utf8"),
  ) as {
    properties: Array<{ name: string; value: string; varType: number }>;
    solid: boolean;
    spriteId: { name: string; path: string } | null;
  };
  assert.equal(enemyResource.solid, false);
  assert.equal(enemyResource.spriteId, null);
  assert.deepEqual(
    enemyResource.properties.map((property) => [property.name, property.value, property.varType]),
    [["health", "10", 4]],
  );
  assert.ok(
    childResource.eventList.some(
      (event) => event.eventType === 4 && event.collisionObjectId?.name === "obj_enemy",
    ),
  );
  const firstDeclarations = await fs.readFile(first.declarations.outputPath, "utf8");
  assert.match(
    firstDeclarations,
    /onCollision_obj_enemy\?\(other: GMInstance<obj_enemy>\): void;/,
  );
  assert.match(
    firstDeclarations,
    /onCollision_obj_fast_enemy\?\(other: GMInstance<obj_fast_enemy>\): void;/,
  );

  enemyResource.solid = true;
  enemyResource.spriteId = { name: "Sprite1", path: "sprites/Sprite1/Sprite1.yy" };
  enemyResource.properties.push({ name: "ideVariable", value: "5", varType: 0 });
  childResource.persistent = true;
  childResource.visible = false;
  await fs.writeFile(
    path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"),
    JSON.stringify(enemyResource, null, 2),
  );
  await fs.writeFile(
    path.join(temporary, "objects", "obj_fast_enemy", "obj_fast_enemy.yy"),
    JSON.stringify(childResource, null, 2),
  );
  await buildGameMakerProject([], projectPath);
  const configuredEnemy = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"), "utf8"),
  ) as {
    properties: Array<{ name: string; value: string }>;
    solid: boolean;
    spriteId: { name: string };
  };
  const configuredChild = JSON.parse(
    await fs.readFile(
      path.join(temporary, "objects", "obj_fast_enemy", "obj_fast_enemy.yy"),
      "utf8",
    ),
  ) as { persistent: boolean; visible: boolean };
  assert.equal(configuredEnemy.solid, true);
  assert.equal(configuredEnemy.spriteId.name, "Sprite1");
  assert.deepEqual(
    configuredEnemy.properties.map((property) => [property.name, property.value]),
    [["ideVariable", "5"], ["health", "10"]],
  );
  assert.equal(configuredChild.persistent, true);
  assert.equal(configuredChild.visible, false);

  await fs.writeFile(
    objectSource,
    "class obj_enemy extends GMObject { protected onCollision_obj_fast_enemy() { this.x += 1; } }",
  );
  await assert.rejects(
    buildGameMakerProject([], projectPath),
    /collision event references missing object 'obj_fast_enemy'/,
  );

  await fs.writeFile(
    objectSource,
    "class obj_enemy extends GMObject { protected onStep() { this.x += 1; } }",
  );
  const second = await buildGameMakerProject([], projectPath);
  assert.deepEqual(second.objects, ["obj_enemy"]);
  const finalEnemyResource = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"), "utf8"),
  ) as { properties: Array<{ name: string }> };
  assert.deepEqual(finalEnemyResource.properties.map((property) => property.name), ["ideVariable"]);
  const secondDeclarations = await fs.readFile(second.declarations.outputPath, "utf8");
  assert.match(
    secondDeclarations,
    /onCollision_obj_enemy\?\(other: GMInstance<obj_enemy>\): void;/,
  );
  assert.doesNotMatch(secondDeclarations, /onCollision_obj_fast_enemy/);
  await assert.rejects(
    fs.access(path.join(temporary, "objects", "obj_enemy", "Draw_0.gml")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  await assert.rejects(
    fs.access(path.join(temporary, "objects", "obj_fast_enemy", "obj_fast_enemy.yy")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  await assert.rejects(
    fs.access(path.join(temporary, "objects", "obj_fast_enemy")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string } }>;
  };
  assert.deepEqual(
    project.resources.map((resource) => resource.id.name).sort(),
    ["Sprite1", "obj_enemy", "utility"],
  );
});

test("removes the former compiler-owned event dispatcher during migration", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-event-migration-"));
  const projectPath = await createEmptyProject(temporary, "MigratedEvents");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "player.ts"),
    "class obj_player extends GMObject { protected onCreate() { this.x = 1; } }",
  );
  await buildGameMakerProject([], projectPath);

  const legacyDirectory = path.join(temporary, "scripts", "__ts2gml_events");
  const legacyGml = "function __ts2gml_event_obj_player_Create_0() { self.x = 1; }\n";
  const legacyResource = `${JSON.stringify({
    $GMScript: "v1",
    "%Name": "__ts2gml_events",
    name: "__ts2gml_events",
    resourceType: "GMScript",
    resourceVersion: "2.0",
  }, null, 2)}\n`;
  await fs.mkdir(legacyDirectory, { recursive: true });
  await fs.writeFile(path.join(legacyDirectory, "__ts2gml_events.gml"), legacyGml);
  await fs.writeFile(path.join(legacyDirectory, "__ts2gml_events.yy"), legacyResource);

  const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string; path: string } }>;
  };
  project.resources.push({
    id: {
      name: "__ts2gml_events",
      path: "scripts/__ts2gml_events/__ts2gml_events.yy",
    },
  });
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2));

  const manifestPath = path.join(temporary, ".ts2gml", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
    files: string[];
    generatedFileHashes: Record<string, string>;
    resources: string[];
  };
  for (const [relativePath, contents] of [
    ["scripts/__ts2gml_events/__ts2gml_events.gml", legacyGml],
    ["scripts/__ts2gml_events/__ts2gml_events.yy", legacyResource],
  ] as const) {
    manifest.files.push(relativePath);
    manifest.generatedFileHashes[relativePath] = createHash("sha256")
      .update(contents)
      .digest("hex");
  }
  manifest.resources.push("scripts/__ts2gml_events/__ts2gml_events.yy");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  await buildGameMakerProject([], projectPath);

  await assert.rejects(
    fs.access(legacyDirectory),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  const migratedProject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string } }>;
  };
  assert.doesNotMatch(
    migratedProject.resources.map((resource) => resource.id.name).join("\n"),
    /__ts2gml_events/,
  );
});

test("rejects bare references to top-level variables across source files", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-global-scope-"));
  const projectPath = await createEmptyProject(temporary, "GlobalScope");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(path.join(sourceDirectory, "globals.ts"), "const sharedValue = 1;");
  await fs.writeFile(
    path.join(sourceDirectory, "reader.ts"),
    "function readSharedValue(): number { return sharedValue; }",
  );

  await assert.rejects(
    buildGameMakerProject([], projectPath),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics.some((diagnostic) => diagnostic.code === "TS2GML1067"),
  );
});

test("rejects bindings that collide with GameMaker runtime names", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-names-"));
  const projectPath = await createEmptyProject(temporary, "RuntimeNames");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "collisions.ts"),
    `class obj_player extends GMObject {}
function collide() {
  const abs = 1;
  const c_white = 2;
  const obj_player = 3;
  return abs + c_white + obj_player;
}`,
  );

  await assert.rejects(
    buildGameMakerProject([], projectPath),
    (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.deepEqual(
        error.diagnostics
          .filter((diagnostic) => diagnostic.code === "TS2GML1068")
          .map((diagnostic) => diagnostic.sourceLine?.trim()),
        ["const abs = 1;", "const c_white = 2;", "const obj_player = 3;"],
      );
      return true;
    },
  );
});

test("refreshes and removes managed files even after external edits or deletion", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-generated-edits-"));
  const projectPath = await createEmptyProject(temporary, "GeneratedEdits");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const firstSource = path.join(sourceDirectory, "first.ts");
  const secondSource = path.join(sourceDirectory, "second.ts");
  await fs.writeFile(firstSource, "function first_value() { return 1; }");
  await fs.writeFile(secondSource, "function second_value() { return 1; }");

  await buildGameMakerProject([], projectPath);
  const manifestPath = path.join(temporary, ".ts2gml", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
    generatedFileHashes: Record<string, string>;
  };
  assert.deepEqual(Object.keys(manifest.generatedFileHashes), [
    "pre_build_step.bat",
    "pre_build_step.sh",
    "pre_project_step.bat",
    "pre_project_step.sh",
    "pre_run_step.bat",
    "pre_run_step.sh",
    "scripts/first/first.gml",
    "scripts/first/first.gml.map.json",
    "scripts/first/first.yy",
    "scripts/second/second.gml",
    "scripts/second/second.gml.map.json",
    "scripts/second/second.yy",
  ]);

  const firstOutput = path.join(temporary, "scripts", "first", "first.gml");
  const secondOutput = path.join(temporary, "scripts", "second", "second.gml");
  const manualFix = "function first_value() { return 99; } // Manual hotfix.\n";
  await fs.writeFile(firstOutput, manualFix);
  await fs.writeFile(secondSource, "function second_value() { return 2; }");

  await buildGameMakerProject([], projectPath, { hotReloadOnly: true });
  assert.doesNotMatch(await fs.readFile(firstOutput, "utf8"), /Manual hotfix/);
  assert.match(await fs.readFile(secondOutput, "utf8"), /return 2;/);

  await fs.rm(secondOutput);
  await buildGameMakerProject([], projectPath);
  assert.match(await fs.readFile(secondOutput, "utf8"), /return 2;/);

  await fs.writeFile(firstOutput, manualFix);
  const unmanagedNote = path.join(path.dirname(firstOutput), "manual-notes.txt");
  await fs.writeFile(unmanagedNote, "Keep this untracked file.");
  await fs.rm(firstSource);
  await buildGameMakerProject([], projectPath);
  await assert.rejects(
    fs.access(firstOutput),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  assert.equal(await fs.readFile(unmanagedNote, "utf8"), "Keep this untracked file.");
});

test("does not touch unchanged GameMaker files during an incremental build", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-incremental-"));
  const projectPath = await createEmptyProject(temporary, "IncrementalBuild");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const firstSource = path.join(sourceDirectory, "first.ts");
  await fs.writeFile(firstSource, "function first_value() { return 1; }");
  await fs.writeFile(
    path.join(sourceDirectory, "second.ts"),
    "function second_value() { return 2; }",
  );
  await buildGameMakerProject([], projectPath);

  const firstGml = path.join(temporary, "scripts", "first", "first.gml");
  const firstResource = path.join(temporary, "scripts", "first", "first.yy");
  const secondGml = path.join(temporary, "scripts", "second", "second.gml");
  const manifestPath = path.join(temporary, ".ts2gml", "manifest.json");
  const stableFiles = [projectPath, firstGml, firstResource, secondGml, manifestPath];
  const fixedTime = new Date("2001-02-03T04:05:06.000Z");
  for (const fileName of stableFiles) await fs.utimes(fileName, fixedTime, fixedTime);
  const stableTimes = new Map(
    await Promise.all(stableFiles.map(async (fileName) => [
      fileName,
      (await fs.stat(fileName)).mtimeMs,
    ] as const)),
  );

  const unchanged = await buildGameMakerProject([], projectPath);
  assert.deepEqual(unchanged.writtenFiles, []);
  for (const fileName of stableFiles) {
    assert.equal((await fs.stat(fileName)).mtimeMs, stableTimes.get(fileName));
  }

  await fs.writeFile(firstSource, "function first_value() { return 3; }");
  const changed = await buildGameMakerProject([], projectPath);
  assert.deepEqual(changed.writtenFiles, ["scripts/first/first.gml"]);
  assert.notEqual((await fs.stat(firstGml)).mtimeMs, stableTimes.get(firstGml));
  for (const fileName of [projectPath, firstResource, secondGml]) {
    assert.equal((await fs.stat(fileName)).mtimeMs, stableTimes.get(fileName));
  }
});

test("preserves IDE resource formatting and project order across repeated saves", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-ide-save-"));
  const projectPath = await createEmptyProject(temporary, "IdeSave");
  await installTool(temporary);
  for (const name of ["first", "second"]) {
    const directory = path.join(temporary, "typescript", name);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${name}.ts`), `function ${name}_value() { return 1; }`);
  }
  await buildGameMakerProject([], projectPath);
  const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: unknown[];
    Folders: unknown[];
  };
  project.resources.reverse();
  project.Folders.reverse();
  const savedProject = JSON.stringify(project);
  await fs.writeFile(projectPath, savedProject);
  const resourcePath = path.join(temporary, "scripts", "first", "first.yy");
  const savedResource = JSON.stringify(JSON.parse(await fs.readFile(resourcePath, "utf8")));
  await fs.writeFile(resourcePath, savedResource);
  const fixedTime = new Date("2001-02-03T04:05:06.000Z");
  await fs.utimes(projectPath, fixedTime, fixedTime);
  await fs.utimes(resourcePath, fixedTime, fixedTime);

  for (const hotReloadOnly of [false, true, false]) {
    assert.deepEqual((await buildGameMakerProject([], projectPath, { hotReloadOnly })).writtenFiles, []);
    assert.equal(await fs.readFile(projectPath, "utf8"), savedProject);
    assert.equal(await fs.readFile(resourcePath, "utf8"), savedResource);
    assert.equal((await fs.stat(projectPath)).mtimeMs, fixedTime.getTime());
    assert.equal((await fs.stat(resourcePath)).mtimeMs, fixedTime.getTime());
  }

  const script = JSON.parse(savedResource) as { isDnD: boolean };
  script.isDnD = true;
  await fs.writeFile(resourcePath, JSON.stringify(script));
  await buildGameMakerProject([], projectPath);
  assert.equal(JSON.parse(await fs.readFile(resourcePath, "utf8")).isDnD, false);
  assert.deepEqual((await buildGameMakerProject([], projectPath)).writtenFiles, []);
});

test("writes creation code for existing rooms and restores the room when source is removed", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-room-code-"));
  const projectPath = await createEmptyProject(temporary, "RoomFixture");
  await addRoom(temporary, projectPath, "Room1");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const sourcePath = path.join(sourceDirectory, "room1.ts");
  await fs.writeFile(
    sourcePath,
    `class Room1 extends GMRoom {
      onCreate() {
        function room_test() { show_debug_message("room test"); }
        room_test();
        room_goto(Room1);
      }
    }`,
  );

  const first = await buildGameMakerProject([], projectPath);
  assert.deepEqual(first.rooms, ["Room1"]);
  assert.deepEqual(first.objects, []);
  assert.deepEqual(first.scripts, []);
  const roomPath = path.join(temporary, "rooms", "Room1", "Room1.yy");
  const creationCodePath = path.join(temporary, "rooms", "Room1", "RoomCreationCode.gml");
  const room = JSON.parse(await fs.readFile(roomPath, "utf8")) as {
    creationCodeFile: string;
  };
  assert.equal(room.creationCodeFile, "RoomCreationCode.gml");
  const roomCreationCode = await fs.readFile(creationCodePath, "utf8");
  assert.match(roomCreationCode, /function room_test\(\)/);
  assert.match(roomCreationCode, /room_goto\(Room1\);/);
  await fs.writeFile(creationCodePath, "// Edited in GameMaker.\n");
  await buildGameMakerProject([], projectPath, { hotReloadOnly: true });
  assert.equal(await fs.readFile(creationCodePath, "utf8"), roomCreationCode);
  const declarations = await fs.readFile(first.declarations.outputPath, "utf8");
  assert.doesNotMatch(declarations, /declare const Room1/);
  await execFileAsync(
    process.execPath,
    [path.resolve("node_modules", "typescript", "bin", "tsc"), "-p", sourceDirectory],
  );

  await fs.rm(sourcePath);
  const second = await buildGameMakerProject([], projectPath);
  assert.deepEqual(second.rooms, []);
  const restoredRoom = JSON.parse(await fs.readFile(roomPath, "utf8")) as {
    creationCodeFile: string;
  };
  assert.equal(restoredRoom.creationCodeFile, "");
  await assert.rejects(
    fs.access(creationCodePath),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  const manifest = JSON.parse(
    await fs.readFile(path.join(temporary, ".ts2gml", "manifest.json"), "utf8"),
  ) as { roomCreationCodes: string[] };
  assert.deepEqual(manifest.roomCreationCodes, []);
});

test("rejects room classes that would overwrite missing or unmanaged room creation code", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-room-conflict-"));
  const projectPath = await createEmptyProject(temporary, "RoomConflict");
  await addRoom(temporary, projectPath, "Room1", "ManualCreationCode.gml");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const sourcePath = path.join(sourceDirectory, "rooms.ts");
  await fs.writeFile(
    sourcePath,
    "class Room1 extends GMRoom { onCreate() { show_debug_message(1); } }",
  );
  await assert.rejects(
    buildGameMakerProject([], projectPath),
    /already uses unmanaged creation code/,
  );

  await fs.writeFile(
    sourcePath,
    "class MissingRoom extends GMRoom { onCreate() { show_debug_message(1); } }",
  );
  await assert.rejects(
    buildGameMakerProject([], projectPath),
    /does not match an existing GameMaker room asset/,
  );
});

test("protects object events while preserving overrides and ordinary methods", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-event-access-"));
  const projectPath = await createEmptyProject(temporary, "Fixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const sourcePath = path.join(sourceDirectory, "events.ts");
  const source = `
class obj_target extends GMObject {}
class obj_parent extends GMObject {
  onGround = true;
  protected onStep() {}
  protected onKeyDown_32() {}
  protected onCollision_obj_target(other: GMInstance<obj_target>) {}
  run() {}
}

class obj_child extends obj_parent {
  protected override onStep() { this.run(); }
  protected override onCollision_obj_target(other: GMInstance<obj_target>) {}
}
class EventReceiver {
  onStep() {}
  run() { this.onStep(); }
}
function useInstance(target: GMInstance<obj_child>) { target.run(); return target.onGround; }
`;
  await fs.writeFile(sourcePath, source);
  const built = await buildGameMakerProject([], projectPath);
  assert.match(
    await fs.readFile(path.join(temporary, "objects", "obj_child", "Step_0.gml"), "utf8"),
    /self\.run\(\);/,
  );
  const declarations = await fs.readFile(built.declarations.outputPath, "utf8");
  assert.match(declarations, /declare abstract class GMObjectCollisionEvents/);
  assert.match(declarations, /protected onCollision_obj_target\?\(other: GMInstance<obj_target>\): void;/);
  assert.match(declarations, /interface GMObject extends GMObjectCollisionEvents/);

  for (const access of [
    "target.onStep();",
    "target.onKeyDown_32();",
    "target.onCollision_obj_target(gm_self<obj_target>());",
    "target.onCollision_obj_parent!(target);",
    "gm_self().onDraw!();",
  ]) {
    await fs.writeFile(sourcePath, `${source}\nfunction invalid(target: GMInstance<obj_child>) { ${access} }`);
    await assert.rejects(checkGameMakerProject([], projectPath), (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.ok(error.diagnostics.some((diagnostic) => diagnostic.code === "TS2445"), `${access}\n${error.message}`);
      return true;
    });
  }

  for (const access of [
    "this.onStep();",
    "this.onKeyDown_32();",
    "this.onCollision_obj_target(gm_self<obj_target>());",
    "this.onDraw!();",
    "this.onStep.call(this);",
    "const callback = this.onStep;",
    'this["onStep"]();',
    'const key = "onStep"; this[key]();',
    'const key = this.onGround ? "onStep" : "onKeyDown_32"; this[key]();',
    "const { onStep: callback } = this;",
    "gm_self<obj_parent>().onStep();",
  ]) {
    await fs.writeFile(sourcePath, source.replace("run() {}", `run() { ${access} }`));
    await assert.rejects(checkGameMakerProject([], projectPath), (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.ok(error.diagnostics.some((diagnostic) =>
        diagnostic.code === "TS2GML3001" &&
        diagnostic.message.includes("cannot be called or referenced directly") &&
        path.resolve(diagnostic.fileName) === sourcePath && diagnostic.line > 0 && diagnostic.column > 0
      ), `${access}\n${error.message}`);
      return true;
    });
  }
  await fs.writeFile(sourcePath, source.replace("this.run();", "super.onStep();"));
  await assert.rejects(checkGameMakerProject([], projectPath), /Use event_inherited\(\) in GameMaker object events/);

  for (const event of ["onStep", "onKeyDown_32", "onCollision_obj_target"]) {
    await fs.writeFile(sourcePath, source
      .replace(`protected ${event}`, event)
      .replace(`protected override ${event}`, `override ${event}`));
    await assert.rejects(checkGameMakerProject([], projectPath), /must be protected/);
  }
});

test("maps every named object event family to its GameMaker event subtype", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-events-"));
  const projectPath = await createEmptyProject(temporary, "EventFixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);

  const expected: Array<[string, number, number, string?]> = [
    ["onKeyDown_A", 5, 65],
    ["onKeyPressed_Space", 9, 32],
    ["onKeyUp_F12", 10, 123],
    ...Array.from({ length: 8 }, (_, index): [string, number, number] => [
      `onOutsideView${index}`,
      7,
      40 + index,
    ]),
    ...Array.from({ length: 8 }, (_, index): [string, number, number] => [
      `onBoundaryView${index}`,
      7,
      50 + index,
    ]),
    ["onAnimationUpdate", 7, 58],
    ["onAnimationEvent", 7, 59],
    ["onAsyncImageLoaded", 7, 60],
    ["onAsyncHTTP", 7, 62],
    ["onAsyncDialog", 7, 63],
    ["onAsyncIAP", 7, 66],
    ["onAsyncCloud", 7, 67],
    ["onAsyncNetworking", 7, 68],
    ["onAsyncSteam", 7, 69],
    ["onAsyncSocial", 7, 70],
    ["onAsyncPushNotification", 7, 71],
    ["onAsyncSaveLoad", 7, 72],
    ["onAsyncAudioRecording", 7, 73],
    ["onAsyncAudioPlayback", 7, 74],
    ["onAsyncSystemEvent", 7, 75],
    ["onBroadcastMessage", 7, 76],
    ["onRollbackStart", 7, 77],
    ["onRollbackEvent", 7, 78],
    ["onWallpaperConfig", 7, 79],
    ["onAsyncAudioPlaybackEnded", 7, 80],
    ["onWallpaperSubscriptionData", 7, 81],
    ...[
      ["onMouseLeftButton", 0],
      ["onMouseRightButton", 1],
      ["onMouseMiddleButton", 2],
      ["onMouseNoButton", 3],
      ["onMouseLeftPressed", 4],
      ["onMouseRightPressed", 5],
      ["onMouseMiddlePressed", 6],
      ["onMouseLeftReleased", 7],
      ["onMouseRightReleased", 8],
      ["onMouseMiddleReleased", 9],
      ["onMouseEnter", 10],
      ["onMouseLeave", 11],
      ["onGlobalMouseLeftButton", 50],
      ["onGlobalMouseRightButton", 51],
      ["onGlobalMouseMiddleButton", 52],
      ["onGlobalMouseLeftPressed", 53],
      ["onGlobalMouseRightPressed", 54],
      ["onGlobalMouseMiddlePressed", 55],
      ["onGlobalMouseLeftReleased", 56],
      ["onGlobalMouseRightReleased", 57],
      ["onGlobalMouseMiddleReleased", 58],
      ["onMouseWheelUp", 60],
      ["onMouseWheelDown", 61],
    ].map(([name, eventNum]): [string, number, number] => [name as string, 6, eventNum as number]),
    ...[
      ["onGestureTap", 0],
      ["onGestureDoubleTap", 1],
      ["onGestureDragStart", 2],
      ["onGestureDragging", 3],
      ["onGestureDragEnd", 4],
      ["onGestureFlick", 5],
      ["onGesturePinchStart", 6],
      ["onGesturePinchIn", 7],
      ["onGesturePinchOut", 8],
      ["onGesturePinchEnd", 9],
      ["onGestureRotateStart", 10],
      ["onGestureRotating", 11],
      ["onGestureRotateEnd", 12],
      ["onGlobalGestureTap", 64],
      ["onGlobalGestureDoubleTap", 65],
      ["onGlobalGestureDragStart", 66],
      ["onGlobalGestureDragging", 67],
      ["onGlobalGestureDragEnd", 68],
      ["onGlobalGestureFlick", 69],
      ["onGlobalGesturePinchStart", 70],
      ["onGlobalGesturePinchIn", 71],
      ["onGlobalGesturePinchOut", 72],
      ["onGlobalGesturePinchEnd", 73],
      ["onGlobalGestureRotateStart", 74],
      ["onGlobalGestureRotating", 75],
      ["onGlobalGestureRotateEnd", 76],
    ].map(([name, eventNum]): [string, number, number] => [name as string, 13, eventNum as number]),
    ["onCollision_obj_target", 4, 0, "obj_target"],
  ];
  await fs.writeFile(
    path.join(sourceDirectory, "events.ts"),
    `class obj_target extends GMObject {}
class obj_events extends GMObject {
${expected.map(([name]) => `  protected ${name}() { show_debug_message("${name}"); }`).join("\n")}
}`,
  );

  await buildGameMakerProject([], projectPath);
  const resource = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_events", "obj_events.yy"), "utf8"),
  ) as {
    eventList: Array<{
      eventType: number;
      eventNum: number;
      collisionObjectId: { name: string } | null;
    }>;
  };
  assert.deepEqual(
    resource.eventList.map((event) => [
      event.eventType,
      event.eventNum,
      event.collisionObjectId?.name,
    ]),
    expected.map(([, eventType, eventNum, collisionObject]) => [
      eventType,
      eventNum,
      collisionObject,
    ]),
  );
});

test("writes typed raw macros for use across generated GameMaker assets", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-macros-"));
  const projectPath = await createEmptyProject(temporary, "MacroFixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(path.join(sourceDirectory, "objects"), { recursive: true });
  await fs.writeFile(
    path.join(sourceDirectory, "macros.ts"),
    `
const PLAYER_SPEED = gm_macro<number>("4");
const AD_ID = gm_macro<string>('""', {
  Android: '"com.example.android"',
  iOS: '"com.example.ios"',
});
`,
  );
  await fs.writeFile(
    path.join(sourceDirectory, "objects", "obj_player.ts"),
    `class obj_player extends GMObject {
      speed = PLAYER_SPEED;
      protected onStep() { this.x += PLAYER_SPEED; }
    }`,
  );

  const summary = await buildGameMakerProject([], projectPath);
  assert.deepEqual(summary.scripts, ["macros"]);
  assert.deepEqual(summary.objects, ["obj_player"]);
  const macros = await fs.readFile(
    path.join(temporary, "scripts", "macros", "macros.gml"),
    "utf8",
  );
  assert.equal(
    macros,
    '#macro PLAYER_SPEED 4\n\n#macro AD_ID ""\n#macro Android:AD_ID "com.example.android"\n#macro iOS:AD_ID "com.example.ios"\n',
  );
  const playerResource = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_player", "obj_player.yy"), "utf8"),
  ) as { properties: Array<{ name: string; value: string; varType: number }> };
  assert.deepEqual(
    playerResource.properties.map((property) => [property.name, property.value, property.varType]),
    [["speed", "PLAYER_SPEED", 4]],
  );
  assert.match(
    await fs.readFile(
      path.join(temporary, "objects", "obj_player", "Step_0.gml"),
      "utf8",
    ),
    /x \+= PLAYER_SPEED;/,
  );
  await execFileAsync(
    process.execPath,
    [path.resolve("node_modules", "typescript", "bin", "tsc"), "-p", sourceDirectory],
  );
});

test("generates configurable run and build runtime guard profiles", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-guards-"));
  const projectPath = await createEmptyProject(temporary, "GuardFixture");
  await installTool(temporary);
  await fs.writeFile(
    path.join(temporary, "ts2gml.config.json"),
    JSON.stringify({
      runtimeGuards: {
        run: "maximum",
        build: "off",
        configurations: {
          Debug: { run: "standard", build: "maximum" },
        },
      },
    }, null, 2),
  );
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "guards.ts"),
    `class obj_guard_entity extends GMObject {}
function append_guarded(values: number[], value: number) {
  values.push(value);
  const list = new List<number>();
  list.add(value);
  const scores = new Map<string, number>();
  scores.set("current", value);
  const first = gm_self<obj_guard_entity>();
  const second = gm_self<obj_guard_entity>();
  return first === second;
}
`,
  );

  const summary = await buildGameMakerProject([], projectPath);
  assert.deepEqual(summary.scripts, [
    "__ts2gml_collections",
    "__ts2gml_runtime_guards",
    "__ts2gml_values",
    "guards",
  ]);
  const sourceGml = await fs.readFile(
    path.join(temporary, "scripts", "guards", "guards.gml"),
    "utf8",
  );
  assert.doesNotMatch(sourceGml, /__ts2gml_guard_/);
  assert.match(sourceGml, /__ts2gml_collection_push\(values, \[value\]\);/);
  assert.equal(sourceGml.match(/var (?:first|second) = self;/g)?.length, 2);

  const guardPath = path.join(
    temporary,
    "scripts",
    "__ts2gml_runtime_guards",
    "__ts2gml_runtime_guards.gml",
  );
  const buildGuards = await fs.readFile(guardPath, "utf8");
  assert.doesNotMatch(buildGuards, /__TS2GML_RUNTIME_GUARD_LEVEL/);

  await buildGameMakerProject([], projectPath, {
    guardConfiguration: "Debug",
    guardProfile: "run",
  });
  const debugRunGml = await fs.readFile(
    path.join(temporary, "scripts", "guards", "guards.gml"),
    "utf8",
  );
  assert.equal(debugRunGml.match(/__ts2gml_guard_object\(self, obj_guard_entity/g)?.length, 1);
  assert.doesNotMatch(debugRunGml, /__ts2gml_guard_value/);

  await applyRuntimeGuardProfile(projectPath, "run");
  const runGml = await fs.readFile(
    path.join(temporary, "scripts", "guards", "guards.gml"),
    "utf8",
  );
  assert.equal(runGml.match(/__ts2gml_guard_object\(self, obj_guard_entity/g)?.length, 1);
  assert.match(
    runGml,
    /__ts2gml_guard_value\(value, \["number"\], "number", "push\(\) argument 1"\)/,
  );
  assert.match(
    runGml,
    /__ts2gml_guard_value\(value, \["number"\], "number", "add\(\) argument 1"\)/,
  );
  assert.match(
    runGml,
    /__ts2gml_guard_value\(value, \["number"\], "number", "set\(\) argument 2"\)/,
  );
  assert.doesNotMatch(runGml, /__TS2GML_RUNTIME_GUARD_LEVEL|\? __ts2gml_guard_/);
  const preservedRun = await applyRuntimeGuardProfile(projectPath, "build");
  assert.equal(preservedRun.skippedForRun, true);
  assert.equal(
    await fs.readFile(path.join(temporary, "scripts", "guards", "guards.gml"), "utf8"),
    runGml,
  );
  await applyRuntimeGuardProfile(projectPath, "build");
  assert.equal(
    await fs.readFile(path.join(temporary, "scripts", "guards", "guards.gml"), "utf8"),
    sourceGml,
  );
  assert.equal(await fs.readFile(guardPath, "utf8"), buildGuards);

  await buildGameMakerProject([], projectPath, {
    guardConfiguration: "Debug",
    guardProfile: "build",
  });
  const debugBuildGml = await fs.readFile(
    path.join(temporary, "scripts", "guards", "guards.gml"),
    "utf8",
  );
  assert.match(debugBuildGml, /__ts2gml_guard_object\(self, obj_guard_entity/);
  assert.match(debugBuildGml, /__ts2gml_guard_value\(value, \["number"\]/);

  assert.match(
    await fs.readFile(path.join(temporary, "pre_project_step.bat"), "utf8"),
    /guard-profile auto/,
  );
  assert.match(
    await fs.readFile(path.join(temporary, "pre_run_step.bat"), "utf8"),
    /guard-profile run/,
  );
  assert.match(
    await fs.readFile(path.join(temporary, "pre_build_step.sh"), "utf8"),
    /guard-profile build/,
  );
});

test("selects runtime guard profiles and GameMaker configurations from hook variables", () => {
  const config = structuredClone(defaultRuntimeGuardConfiguration);
  config.runtimeGuards.configurations.Debug = { run: "maximum" };
  assert.equal(
    detectRuntimeGuardConfiguration(config, { YYconfig: "Debug" }),
    "Debug",
  );
  assert.equal(detectRuntimeGuardProfile({ YYtargetFile: "" }), "run");
  assert.equal(detectRuntimeGuardProfile({ YYtargetFile: "Game.zip" }), "build");
  assert.equal(
    detectRuntimeGuardProfile({ TS2GML_PROFILE: "build", YYtargetFile: "" }),
    "build",
  );
});

test("rejects context guard types that cannot become one GameMaker object check", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-runtime-guard-type-"));
  const projectPath = await createEmptyProject(temporary, "GuardTypeFixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "guard_type.ts"),
    "function current<T extends GMObject>() { return gm_self<T>(); }",
  );

  await assert.rejects(
    checkGameMakerProject([], projectPath),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics.some((diagnostic) => diagnostic.code === "TS2GML1064"),
  );
});

test("checks unsupported features without writing generated assets", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-check-"));
  const projectPath = await createEmptyProject(temporary, "CheckedGame");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const sourcePath = path.join(sourceDirectory, "unsafe.ts");
  await fs.writeFile(
    sourcePath,
    "function createAdder(amount: number) { return (value: number) => value + amount; }",
  );

  await assert.rejects(
    checkGameMakerProject([], projectPath),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1014" &&
      path.resolve(error.diagnostics[0].fileName) === path.resolve(sourcePath),
  );
  await assert.rejects(
    fs.access(path.join(temporary, "scripts", "unsafe", "unsafe.gml")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );

  await fs.writeFile(sourcePath, "function later() { setTimeout(later, 100); }");
  await assert.rejects(
    checkGameMakerProject([], projectPath),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics.some(
        (diagnostic) => diagnostic.code === "TS2304" && /setTimeout/.test(diagnostic.message),
      ),
  );

  await fs.writeFile(sourcePath, "function add(value: number, amount: number) { return value + amount; }");
  const summary = await checkGameMakerProject([], projectPath);
  assert.deepEqual(summary.scripts, ["unsafe"]);
  assert.deepEqual(summary.objects, []);
  await assert.rejects(
    fs.access(path.join(temporary, ".ts2gml", "manifest.json")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );

  await buildGameMakerProject([], projectPath);
  const outputPath = path.join(temporary, "scripts", "unsafe", "unsafe.gml");
  const previousOutput = await fs.readFile(outputPath, "utf8");
  await fs.writeFile(
    sourcePath,
    "function createAdder(amount: number) { return (value: number) => value + amount; }",
  );
  await assert.rejects(buildGameMakerProject([], projectPath), Ts2GmlError);
  assert.equal(await fs.readFile(outputPath, "utf8"), previousOutput);
});

test("rejects project-wide GameMaker global symbol collisions", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-symbols-"));
  const projectPath = await createEmptyProject(temporary, "SymbolFixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "first.ts"),
    "export function shared_name() { return 1; }",
  );
  await fs.writeFile(
    path.join(sourceDirectory, "second.ts"),
    "export function shared_name() { return 2; }",
  );

  await assert.rejects(
    checkGameMakerProject([], projectPath),
    /Generated global 'shared_name' is defined by both/,
  );
});

test("mirrors TypeScript source folders into GameMaker and preserves folders used by IDE assets", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-folders-"));
  const projectPath = await createEmptyProject(temporary, "FolderFixture");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  const objectSource = path.join(sourceDirectory, "objects", "enemies", "obj_enemy.ts");
  const scriptSource = path.join(sourceDirectory, "gameplay", "helpers.ts");
  await fs.mkdir(path.dirname(objectSource), { recursive: true });
  await fs.mkdir(path.dirname(scriptSource), { recursive: true });
  await fs.writeFile(
    objectSource,
    "class obj_enemy extends GMObject { protected onCreate() { this.x = 1; } }",
  );
  await fs.writeFile(scriptSource, "function helper_value() { return 1; }");

  await buildGameMakerProject([], projectPath);
  const firstProject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    Folders: Array<{ folderPath: string }>;
  };
  assert.deepEqual(
    firstProject.Folders.map((folder) => folder.folderPath),
    ["folders/gameplay.yy", "folders/objects.yy", "folders/objects/enemies.yy"],
  );
  const firstObject = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"), "utf8"),
  ) as { parent: { name: string; path: string } };
  const firstScript = JSON.parse(
    await fs.readFile(path.join(temporary, "scripts", "helpers", "helpers.yy"), "utf8"),
  ) as { parent: { name: string; path: string } };
  assert.deepEqual(firstObject.parent, {
    name: "enemies",
    path: "folders/objects/enemies.yy",
  });
  assert.deepEqual(firstScript.parent, {
    name: "gameplay",
    path: "folders/gameplay.yy",
  });

  const projectWithManualObject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string; path: string } }>;
  };
  projectWithManualObject.resources.push({
    id: { name: "obj_manual", path: "objects/obj_manual/obj_manual.yy" },
  });
  await fs.writeFile(projectPath, JSON.stringify(projectWithManualObject, null, 2));
  const manualObjectPath = path.join(temporary, "objects", "obj_manual", "obj_manual.yy");
  await fs.mkdir(path.dirname(manualObjectPath), { recursive: true });
  await fs.writeFile(
    manualObjectPath,
    JSON.stringify({ parent: { name: "objects", path: "folders/objects.yy" } }),
  );
  const movedSource = path.join(sourceDirectory, "actors", "obj_enemy.ts");
  await fs.mkdir(path.dirname(movedSource), { recursive: true });
  await fs.rename(objectSource, movedSource);

  await buildGameMakerProject([], projectPath);
  const movedProject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    Folders: Array<{ folderPath: string }>;
  };
  assert.deepEqual(
    movedProject.Folders.map((folder) => folder.folderPath),
    ["folders/gameplay.yy", "folders/objects.yy", "folders/actors.yy"],
  );
  const movedObject = JSON.parse(
    await fs.readFile(path.join(temporary, "objects", "obj_enemy", "obj_enemy.yy"), "utf8"),
  ) as { parent: { name: string; path: string } };
  assert.deepEqual(movedObject.parent, {
    name: "actors",
    path: "folders/actors.yy",
  });
  const manifest = JSON.parse(
    await fs.readFile(path.join(temporary, ".ts2gml", "manifest.json"), "utf8"),
  ) as { folders: string[] };
  assert.deepEqual(manifest.folders, ["folders/actors.yy", "folders/gameplay.yy"]);
});

test("declares IDE assets without managing or overwriting them", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-assets-"));
  const projectPath = await createEmptyProject(temporary, "ImportedAssets");
  await installTool(temporary);
  const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string; path: string } }>;
  };
  project.resources.push(
    { id: { name: "Sprite1", path: "sprites/Sprite1/Sprite1.yy" } },
    { id: { name: "obj_manual", path: "objects/obj_manual/obj_manual.yy" } },
    { id: { name: "manual_script", path: "scripts/manual_script/manual_script.yy" } },
  );
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
  const manualObjectPath = path.join(temporary, "objects", "obj_manual", "obj_manual.yy");
  const manualScriptPath = path.join(temporary, "scripts", "manual_script", "manual_script.gml");
  const manualScriptSource = `/// @desc Returns the imported value.
/// @param {String} value Value to return.
/// @param {Real} increment Amount to add.
/// @returns {String} The imported value.
function manual_script(_value, _increment = 1) { global.import_count += _increment; return _value; }
/// @param {Real} value Initial value.
/// @returns {Struct} Imported data.
function ManualData(_value = 0) constructor { value = _value; }
/// Returns whether a verb was newly activated.
///
/// @param {Enum.INPUT_VERB,Real} verb
/// @param {Real} [playerIndex=0]
function InputPressed(_verb, _playerIndex = 0) { return true; }
function ConfigureInput() {
  enum INPUT_VERB { Move, Confirm }
}
global.import_count = 0;
globalvar imported_enabled;
#macro IMPORTED_LIMIT 12
#macro Windows:IMPORTED_TITLE "Desktop"
#macro HTML5:IMPORTED_TITLE "Browser"
#macro font_add_sprite __scribble_font_add_sprite
#macro __font_add_sprite__ font_add_sprite
#macro font_add_sprite_ext __scribble_font_add_sprite_ext
#macro __font_add_sprite_ext__ font_add_sprite_ext
enum ImportedState { Idle, Active = 4, Done }`;
  await fs.mkdir(path.dirname(manualObjectPath), { recursive: true });
  await fs.mkdir(path.dirname(manualScriptPath), { recursive: true });
  await fs.writeFile(manualObjectPath, "user object");
  await fs.writeFile(manualScriptPath, manualScriptSource);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "obj_player.ts"),
    `
class obj_player extends GMObject {
  protected onCreate() {
    this.sprite_index = Sprite1;
    instance_create_layer(0, 0, "Instances", obj_manual);
    const data = new ManualData(9);
    gm_global.import_count = manual_script("value");
    imported_enabled = true;
  }
}
`,
  );

  await buildGameMakerProject([], projectPath);
  const playerResourcePath = path.join(temporary, "objects", "obj_player", "obj_player.yy");
  const playerResource = JSON.parse(await fs.readFile(playerResourcePath, "utf8")) as {
    parentObjectId: { name: string; path: string } | null;
  };
  assert.equal(playerResource.parentObjectId, null);
  playerResource.parentObjectId = {
    name: "obj_manual",
    path: "objects/obj_manual/obj_manual.yy",
  };
  await fs.writeFile(playerResourcePath, JSON.stringify(playerResource, null, 2));

  const summary = await buildGameMakerProject([], projectPath);
  const declarations = await fs.readFile(summary.declarations.outputPath, "utf8");
  const configuredPlayer = JSON.parse(await fs.readFile(playerResourcePath, "utf8")) as {
    parentObjectId: { name: string };
  };
  assert.equal(configuredPlayer.parentObjectId.name, "obj_manual");
  assert.match(
    await fs.readFile(path.join(temporary, "objects", "obj_player", "Create_0.gml"), "utf8"),
    /event_inherited\(\);/,
  );
  assert.match(declarations, /declare const Sprite1: GM\.Asset\.GMSprite;/);
  assert.match(declarations, /declare const obj_manual: GM\.Asset\.GMObject;/);
  assert.match(declarations, /onCollision_obj_manual\?\(other: GMInstance\): void;/);
  assert.match(
    declarations,
    /onCollision_obj_player\?\(other: GMInstance<obj_player>\): void;/,
  );
  assert.match(
    declarations,
    /declare function manual_script\(_value: string, _increment\?: number\): string;/,
  );
  assert.match(declarations, /\* Returns whether a verb was newly activated\./);
  assert.match(
    declarations,
    /declare function InputPressed\(_verb: INPUT_VERB \| number, _playerIndex\?: number\): any;/,
  );
  assert.match(declarations, /\* @param _value Value to return\./);
  assert.match(declarations, /\* @returns The imported value\./);
  assert.match(
    declarations,
    /declare const ManualData: \{[\s\S]*new \(_value\?: number\): GMStruct;/,
  );
  assert.doesNotMatch(declarations, /declare const manual_script/);
  assert.match(declarations, /interface GMGlobal \{[\s\S]*import_count: any;/);
  assert.match(declarations, /declare let imported_enabled: any;/);
  assert.match(declarations, /declare const IMPORTED_LIMIT: number;/);
  assert.match(declarations, /declare const IMPORTED_TITLE: string;/);
  assert.doesNotMatch(declarations, /declare const font_add_sprite:/);
  assert.doesNotMatch(declarations, /declare const font_add_sprite_ext:/);
  assert.match(declarations, /declare const __font_add_sprite__: any;/);
  assert.match(declarations, /declare const __font_add_sprite_ext__: any;/);
  assert.match(declarations, /declare enum ImportedState \{[\s\S]*Idle,[\s\S]*Active,[\s\S]*Done,/);
  assert.match(declarations, /declare enum INPUT_VERB \{[\s\S]*Move,[\s\S]*Confirm,/);
  assert.doesNotMatch(declarations, /declare const obj_player/);
  const manifest = JSON.parse(
    await fs.readFile(path.join(temporary, ".ts2gml", "manifest.json"), "utf8"),
  ) as { resources: string[] };
  assert.deepEqual(manifest.resources, ["objects/obj_player/obj_player.yy"]);
  assert.equal(await fs.readFile(manualObjectPath, "utf8"), "user object");
  assert.equal(
    await fs.readFile(manualScriptPath, "utf8"),
    manualScriptSource,
  );
  const builtProject = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
    resources: Array<{ id: { name: string } }>;
  };
  assert.deepEqual(
    builtProject.resources.map((resource) => resource.id.name).sort(),
    ["Sprite1", "manual_script", "obj_manual", "obj_player"],
  );
  await execFileAsync(
    process.execPath,
    [path.resolve("node_modules", "typescript", "bin", "tsc"), "-p", sourceDirectory],
  );

  await fs.writeFile(
    path.join(sourceDirectory, "obj_manual.ts"),
    "class obj_manual extends GMObject { protected onCreate() { this.x = 1; } }",
  );
  await assert.rejects(
    checkGameMakerProject([], projectPath),
    /both GameMaker and TypeScript claim the same asset/,
  );
  await assert.rejects(
    buildGameMakerProject([], projectPath),
    /both GameMaker and TypeScript claim the same asset/,
  );
  assert.equal(await fs.readFile(manualObjectPath, "utf8"), "user object");
});

test("rejects unmanaged resources until the GameMaker asset is deleted", async () => {
  for (const registered of [true, false]) {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-conflict-"));
    const projectPath = await createEmptyProject(temporary, "Conflict");
    await installTool(temporary);
    const resourcePath = "scripts/shared/shared.yy";
    const resourceDirectory = path.join(temporary, "scripts", "shared");
    const sourcePath = path.join(temporary, "typescript", "shared.ts");
    await fs.mkdir(resourceDirectory, { recursive: true });
    await fs.mkdir(path.dirname(sourcePath));
    const resourceFile = path.join(resourceDirectory, "shared.yy");
    const gmlFile = path.join(resourceDirectory, "shared.gml");
    const resource = JSON.stringify({ name: "shared", resourceType: "GMScript", resourceVersion: "2.0" });
    const manualCode = "function manual_shared() {}\n";
    const source = "function generated_shared() { return 7; }\n";
    await fs.writeFile(resourceFile, resource);
    await fs.writeFile(gmlFile, manualCode);
    await fs.writeFile(sourcePath, source);
    const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
      resources: Array<{ id: { name: string; path: string } }>;
    };
    if (registered) project.resources.push({ id: { name: "shared", path: resourcePath } });
    await fs.writeFile(projectPath, JSON.stringify(project));
    const savedProject = await fs.readFile(projectPath, "utf8");

    for (const operation of [
      () => checkGameMakerProject([], projectPath),
      () => buildGameMakerProject([], projectPath),
      () => buildGameMakerProject([], projectPath, { overwriteChangedGeneratedFiles: true }),
    ]) {
      await assert.rejects(operation, (error: unknown) => {
        assert.ok(error instanceof ResourceConflictError);
        assert.match(error.message, /Delete the conflicting asset in GameMaker and save/);
        assert.equal(error.conflicts[0]?.typeScriptFile, sourcePath);
        assert.equal(error.conflicts[0]?.gameMakerResourcePath, resourcePath);
        return true;
      });
      assert.equal(await fs.readFile(projectPath, "utf8"), savedProject);
      assert.equal(await fs.readFile(resourceFile, "utf8"), resource);
      assert.equal(await fs.readFile(gmlFile, "utf8"), manualCode);
      assert.equal(await fs.readFile(sourcePath, "utf8"), source);
    }

    // Removing just the project reference or metadata cannot authorize overwriting manual code.
    project.resources = [];
    await fs.writeFile(projectPath, JSON.stringify(project));
    await fs.rm(resourceFile);
    await assert.rejects(buildGameMakerProject([], projectPath), /file already exists and is unmanaged/);
    assert.equal(await fs.readFile(gmlFile, "utf8"), manualCode);
    await fs.rm(gmlFile);
    await buildGameMakerProject([], projectPath);
    assert.match(await fs.readFile(gmlFile, "utf8"), /generated_shared/);
    assert.deepEqual((await buildGameMakerProject([], projectPath)).writtenFiles, []);
  }
});

test("project-local distribution discovers and builds its GameMaker project", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-cli-"));
  await createEmptyProject(temporary, "PortableGame");
  const toolDirectory = await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    path.join(sourceDirectory, "portable.ts"),
    "function portable_value(): number { return 42; }",
  );

  const cliPath = path.join(toolDirectory, "cli.cjs");
  const checked = await execFileAsync(process.execPath, [cliPath, "check"], {
    cwd: sourceDirectory,
  });
  assert.match(checked.stdout, /Checked 1 source file\(s\)/);
  await assert.rejects(
    fs.access(path.join(temporary, "scripts", "portable", "portable.gml")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
  const result = await execFileAsync(process.execPath, [cliPath, "build", "--project-saved"], {
    cwd: sourceDirectory,
  });

  assert.match(
    result.stdout,
    /Built 1 script\(s\), 0 object\(s\), and 0 room creation code file\(s\)/,
  );
  await fs.access(path.join(temporary, "scripts", "portable", "portable.gml"));
  await fs.access(path.join(toolDirectory, "types", "index.d.ts"));
  assert.match(
    await fs.readFile(path.join(toolDirectory, "ts2gml.bat"), "utf8"),
    /pushd "%TS2GML_DIR%\.\.\\\.\."[\s\S]*node "%TS2GML_DIR%cli\.cjs" watch/,
  );
  await fs.access(path.join(sourceDirectory, "tsconfig.json"));
});

test("project-local CLI remembers an explicit Beta or LTS runtime selection", {
  skip: process.platform !== "win32",
}, async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-cli-runtime-"));
  const projectPath = await createEmptyProject(temporary, "RuntimeGame");
  const toolDirectory = await installTool(temporary);
  const programData = path.join(temporary, "ProgramData");
  for (const [installationName, runtimeVersion, functionName] of [
    ["GameMakerStudio2-LTS2026", "2026.0.0.23", "lts_runtime_function"],
    ["GameMakerStudio2-Beta", "2026.0.0.24", "beta_runtime_function"],
  ] as const) {
    const installationDirectory = path.join(programData, installationName);
    const runtimeDirectory = path.join(
      installationDirectory,
      "Cache",
      "runtimes",
      `runtime-${runtimeVersion}`,
    );
    await fs.mkdir(runtimeDirectory, { recursive: true });
    await fs.writeFile(
      path.join(runtimeDirectory, "GmlSpec.xml"),
      `<GameMakerLanguageSpec RuntimeVersion="test"><Functions><Function><Name>${functionName}</Name><ReturnType>Real</ReturnType></Function></Functions><Variables/><Constants/><Structures/><Enumerations/></GameMakerLanguageSpec>`,
    );
    await fs.writeFile(
      path.join(installationDirectory, "runtime.json"),
      JSON.stringify({
        active: runtimeVersion,
        [runtimeVersion]: `${runtimeDirectory}&https://example.invalid/runtime.rss`,
      }),
    );
  }

  const cliPath = path.join(toolDirectory, "cli.cjs");
  const environment = {
    ...process.env,
    ProgramData: programData,
    PROGRAMDATA: programData,
    GAMEMAKER_GML_SPEC: "",
  };
  const selected = await execFileAsync(
    process.execPath,
    [
      cliPath,
      "runtime",
      "--project",
      projectPath,
      "--installation",
      "GameMakerStudio2-Beta",
    ],
    { cwd: temporary, env: environment },
  );

  assert.match(selected.stdout, /Selected Beta runtime 2026\.0\.0\.24/);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(
        path.join(temporary, ".ts2gml", "runtime-selection.json"),
        "utf8",
      ),
    ),
    { installationDirectory: path.join(programData, "GameMakerStudio2-Beta") },
  );
  assert.match(
    await fs.readFile(
      path.join(toolDirectory, "types", "gamemaker.generated.d.ts"),
      "utf8",
    ),
    /declare function beta_runtime_function\(\): number;/,
  );

  await execFileAsync(
    process.execPath,
    [cliPath, "runtime", "--project", projectPath, "--auto"],
    { cwd: temporary, env: environment },
  );
  await assert.rejects(
    fs.access(path.join(temporary, ".ts2gml", "runtime-selection.json")),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
  );
});

test("migrates TypeScript configs that reference the former root-level tool", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-config-migration-"));
  const projectPath = await createEmptyProject(temporary, "MigratedGame");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  await fs.mkdir(sourceDirectory);
  const configPath = path.join(sourceDirectory, "tsconfig.json");
  await fs.writeFile(
    configPath,
    JSON.stringify({ include: ["**/*.ts", "../ts2gml/types/**/*.d.ts"] }, null, 2),
  );

  const summary = await prepareTypeScriptProject(projectPath);
  const config = JSON.parse(await fs.readFile(configPath, "utf8")) as { include: string[] };

  assert.equal(summary.createdConfig, false);
  assert.equal(
    summary.typeDirectory,
    path.join(temporary, "datafiles", "ts2gml", "types"),
  );
  assert.deepEqual(config.include, ["**/*.ts", "../datafiles/ts2gml/types/**/*.d.ts"]);
});

test("watch rebuilds source and project configuration through Windows short paths", {
  skip: process.platform !== "win32",
}, async (context) => {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-watch-short-path-")));
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-Command",
    "(New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:TS2GML_WATCH_TEST_DIRECTORY).ShortPath",
  ], { env: { ...process.env, TS2GML_WATCH_TEST_DIRECTORY: directory } });
  const shortDirectory = stdout.trim();
  assert.ok(shortDirectory);
  if (shortDirectory.toLowerCase() === directory.toLowerCase()) {
    context.skip("The temporary volume does not provide Windows 8.3 path aliases.");
    return;
  }
  assert.equal(await fs.realpath(shortDirectory), directory);
  const project = await createEmptyProject(shortDirectory, "ShortPath");
  await installTool(shortDirectory);
  const prepared = await prepareTypeScriptProject(project);
  const source = path.join(directory, "typescript", "short_path.ts");
  const output = path.join(directory, "scripts", "short_path", "short_path.gml");
  await fs.writeFile(source, "function short_path_value(): number { return 1; }");
  await buildGameMakerProject([], project);
  const controller = new AbortController();
  const results: Array<Error | object> = [];
  const watching = watchGameMakerProject(project, {
    debounceMs: 20,
    saveSettleMs: 0,
    signal: controller.signal,
    confirmStructuralChanges: () => true,
    onBuild: (result) => results.push(result),
  });
  context.after(async () => { controller.abort(); await watching; });
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  await fs.writeFile(source, "function short_path_value(): number { return 2; }");
  await waitFor(async () => (await fs.readFile(output, "utf8")).includes("return 2"));
  assert.ok(results.every((result) => !(result instanceof Error)));

  const config = await fs.readFile(prepared.runtimeGuardConfigPath, "utf8");
  results.length = 0;
  await fs.writeFile(path.join(directory, "ts2gml.config.json"), "{ broken guards");
  await waitFor(async () => results.some((result) => result instanceof Error));
  results.length = 0;
  await fs.writeFile(prepared.runtimeGuardConfigPath, config);
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
});

test("watch hot-reloads code and confirms saved IDE state before structural changes", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-watch-"));
  const projectPath = await createEmptyProject(temporary, "WatchedGame");
  await installTool(temporary);
  const sourceDirectory = path.join(temporary, "typescript");
  const sourcePath = path.join(sourceDirectory, "watched.ts");
  const outputPath = path.join(temporary, "scripts", "watched", "watched.gml");
  const objectPath = path.join(temporary, "objects", "obj_player", "obj_player.yy");
  const createEventPath = path.join(temporary, "objects", "obj_player", "Create_0.gml");
  const stepEventPath = path.join(temporary, "objects", "obj_player", "Step_0.gml");
  const controller = new AbortController();
  const results: Array<Error | object> = [];
  let confirmationChanges: readonly string[] | undefined;
  let resolveConfirmation!: (confirmed: boolean) => void;
  const confirmation = new Promise<boolean>((resolve) => {
    resolveConfirmation = resolve;
  });

  await fs.mkdir(sourceDirectory);
  await fs.writeFile(
    sourcePath,
    `function watched_value(): number { return 1; }
class obj_player extends GMObject { protected onCreate() { this.x = 1; } }`,
  );
  await buildGameMakerProject([], projectPath);
  const gameMakerObject = JSON.parse(await fs.readFile(objectPath, "utf8")) as {
    persistent: boolean;
  };
  gameMakerObject.persistent = true;
  const stableObject = JSON.stringify(gameMakerObject);
  await fs.writeFile(objectPath, stableObject);
  const stableProject = await fs.readFile(projectPath, "utf8");

  const watching = watchGameMakerProject(projectPath, {
    confirmStructuralChanges: (changes) => {
      confirmationChanges = changes;
      return confirmation;
    },
    debounceMs: 10,
    saveSettleMs: 0,
    signal: controller.signal,
    onBuild: (result) => results.push(result),
  });
  try {
    await waitFor(async () => results.some((result) => !(result instanceof Error)));
    await fs.writeFile(outputPath, "function watched_value() { return 99; }");
    await fs.writeFile(createEventPath, "self.x = 99;");
    const scriptPath = path.join(temporary, "scripts", "watched", "watched.yy");
    await fs.writeFile(scriptPath, JSON.stringify(JSON.parse(await fs.readFile(scriptPath, "utf8"))));
    await fs.writeFile(
      sourcePath,
      `function watched_value(): number { return 7; }
class obj_player extends GMObject { protected onCreate() { this.x = 2; } }`,
    );
    await waitFor(async () =>
      (await fs.readFile(outputPath, "utf8")).includes("return 7") &&
      (await fs.readFile(createEventPath, "utf8")).includes("self.x = 2")
    );
    assert.equal(await fs.readFile(objectPath, "utf8"), stableObject);
    assert.equal(await fs.readFile(projectPath, "utf8"), stableProject);

    const project = JSON.parse(await fs.readFile(projectPath, "utf8")) as {
      resources: Array<{ id: { name: string; path: string } }>;
    };
    project.resources.push({
      id: { name: "Sprite1", path: "sprites/Sprite1/Sprite1.yy" },
    });
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
    const declarationPath = path.join(
      temporary,
      "datafiles",
      "ts2gml",
      "types",
      "gamemaker.project.generated.d.ts",
    );
    await waitFor(async () =>
      (await fs.readFile(declarationPath, "utf8")).includes(
        "declare const Sprite1: GM.Asset.GMSprite;",
      )
    );

    const scriptBeforeStructuralChange = await fs.readFile(outputPath, "utf8");
    const createEventBeforeStructuralChange = await fs.readFile(createEventPath, "utf8");
    await fs.writeFile(
      sourcePath,
      `function watched_value(): number { return 8; }
class obj_player extends GMObject {
  protected onCreate() { this.x = 3; }
  protected onStep() { this.x += 1; }
}`,
    );
    await waitFor(async () => results.some((result) =>
      result instanceof Error && /structural GameMaker changes/.test(result.message)
    ));
    await waitFor(async () => confirmationChanges !== undefined);
    assert.ok(confirmationChanges?.includes("objects/obj_player/Step_0.gml"));
    assert.ok(confirmationChanges?.includes("objects/obj_player/obj_player.yy"));
    assert.equal(await fs.readFile(outputPath, "utf8"), scriptBeforeStructuralChange);
    assert.equal(await fs.readFile(createEventPath, "utf8"), createEventBeforeStructuralChange);
    assert.equal(await fs.readFile(objectPath, "utf8"), stableObject);
    await assert.rejects(
      fs.access(stepEventPath),
      (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT",
    );

    resolveConfirmation(true);
    await waitFor(async () =>
      (await fs.readFile(outputPath, "utf8")).includes("return 8") &&
      (await fs.readFile(createEventPath, "utf8")).includes("self.x = 3") &&
      (await fs.readFile(stepEventPath, "utf8")).includes("self.x += 1")
    );
    const savedObject = JSON.parse(await fs.readFile(objectPath, "utf8")) as {
      eventList: Array<{ eventType: number }>;
      persistent: boolean;
    };
    assert.equal(savedObject.persistent, true);
    assert.ok(savedObject.eventList.some((event) => event.eventType === 3));

    await fs.writeFile(
      sourcePath,
      `function watched_value(): number { return 9; }
class obj_player extends GMObject {
  protected onCreate() { this.x = 4; }
  protected onStep() { this.x += 2; }
}`,
    );
    await waitFor(async () =>
      (await fs.readFile(outputPath, "utf8")).includes("return 9") &&
      (await fs.readFile(createEventPath, "utf8")).includes("self.x = 4") &&
      (await fs.readFile(stepEventPath, "utf8")).includes("self.x += 2")
    );
    await execFileAsync(
      process.execPath,
      [path.resolve("node_modules", "typescript", "bin", "tsc"), "-p", sourceDirectory],
    );
  } finally {
    controller.abort();
    await watching;
  }

  assert.ok(results.some((result) => !(result instanceof Error)));
  assert.ok(results.some((result) => result instanceof Error));
  assert.ok(confirmationChanges);
});


test("watch rechecks declarations, TypeScript options, guard configuration, and unmanaged GML", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-watch-inputs-"));
  const project = await createEmptyProject(directory, "Dependencies");
  await installTool(directory);
  const prepared = await prepareTypeScriptProject(project);
  const source = path.join(prepared.sourceDirectory, "dependency.ts");
  const types = path.join(prepared.sourceDirectory, "globals.d.ts");
  await fs.writeFile(types, "type DependencyValue = number;");
  await fs.writeFile(source, "function dependency(value: DependencyValue): number { return value; }");
  const controller = new AbortController();
  const results: Array<Error | object> = [];
  const watching = watchGameMakerProject(project, { debounceMs: 20, signal: controller.signal,
    onBuild: (result) => results.push(result), confirmStructuralChanges: () => true, saveSettleMs: 0 });
  context.after(async () => { controller.abort(); await watching; });
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  results.length = 0;
  await fs.writeFile(types, "type DependencyValue = string;");
  await waitFor(async () => results.some((result) => result instanceof Error && /not assignable/.test(result.message)));
  results.length = 0;
  await fs.writeFile(types, "type DependencyValue = number;");
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  results.length = 0;
  const config = await fs.readFile(prepared.configPath, "utf8");
  await fs.writeFile(prepared.configPath, "{ broken tsconfig");
  await waitFor(async () => results.some((result) => result instanceof Ts2GmlError));
  await fs.writeFile(prepared.configPath, config);
  results.length = 0;
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  const guards = await fs.readFile(prepared.runtimeGuardConfigPath, "utf8");
  results.length = 0;
  await fs.writeFile(prepared.runtimeGuardConfigPath, "{ broken guards");
  await waitFor(async () => results.some((result) => result instanceof Error));
  await fs.writeFile(prepared.runtimeGuardConfigPath, guards);
  results.length = 0;
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  const resource = "scripts/native_dependency/native_dependency.yy";
  await fs.mkdir(path.join(directory, "scripts/native_dependency"), { recursive: true });
  await fs.writeFile(path.join(directory, resource), JSON.stringify({ name: "native_dependency", resourceType: "GMScript" }));
  const native = path.join(directory, "scripts/native_dependency/native_dependency.gml");
  await fs.writeFile(native, "/// @param {real} value\nfunction native_dependency(value) { return value; }");
  const metadata = JSON.parse(await fs.readFile(project, "utf8")) as { resources: Array<{ id: { name: string; path: string } }> };
  metadata.resources.push({ id: { name: "native_dependency", path: resource } });
  await fs.writeFile(project, JSON.stringify(metadata));
  await fs.writeFile(source, "function dependency(value: DependencyValue): number { return native_dependency(value); }");
  results.length = 0;
  await waitFor(async () => results.some((result) => !(result instanceof Error)));
  results.length = 0;
  await fs.writeFile(native, "/// @param {string} value\nfunction native_dependency(value) { return value; }");
  await waitFor(async () => results.some((result) => result instanceof Error && /not assignable/.test(result.message)), 10_000);
});
