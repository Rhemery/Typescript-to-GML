import { atomicWriteFile } from "../files.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import JSON5 from "json5";

export type RuntimeGuardLevel = "off" | "standard" | "maximum";
export type RuntimeGuardProfile = "run" | "build";

export interface RuntimeGuardConfiguration {
  runtimeGuards: {
    run: RuntimeGuardLevel;
    build: RuntimeGuardLevel;
    configurations: Record<string, Partial<Record<RuntimeGuardProfile, RuntimeGuardLevel>>>;
  };
}

export interface RuntimeGuardProfileResult {
  profile: RuntimeGuardProfile;
  level: RuntimeGuardLevel;
  configuration?: string;
  skippedForRun: boolean;
  written: boolean;
}

export interface RuntimeGuardProfileApplyOptions {
  configuration?: string;
  preserveRunProfile?: boolean;
}

export const runtimeGuardConfigFileName = "ts2gml.config.json";
export const runtimeGuardScriptName = "__ts2gml_runtime_guards";
export const runtimeGuardHookPaths = [
  "pre_project_step.bat",
  "pre_run_step.bat",
  "pre_build_step.bat",
  "pre_project_step.sh",
  "pre_run_step.sh",
  "pre_build_step.sh",
] as const;

const runMarkerFileName = "runtime-guard-run.json";
const runMarkerLifetimeMs = 10 * 60 * 1_000;

export const defaultRuntimeGuardConfiguration: RuntimeGuardConfiguration = {
  runtimeGuards: {
    run: "standard",
    build: "standard",
    configurations: {},
  },
};

export async function ensureRuntimeGuardConfiguration(
  projectDirectory: string,
): Promise<{ path: string; created: boolean }> {
  const configPath = path.join(projectDirectory, runtimeGuardConfigFileName);
  try {
    await fs.access(configPath);
    return { path: configPath, created: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await atomicWriteFile(
    configPath,
    `${JSON.stringify(defaultRuntimeGuardConfiguration, null, 2)}\n`);
  return { path: configPath, created: true };
}

export async function readRuntimeGuardConfiguration(
  projectDirectory: string,
): Promise<RuntimeGuardConfiguration> {
  const configPath = path.join(projectDirectory, runtimeGuardConfigFileName);
  let parsed: unknown;
  try {
    parsed = JSON5.parse(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return structuredClone(defaultRuntimeGuardConfiguration);
    }
    throw new Error(
      `Cannot read runtime guard configuration '${configPath}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a JSON object.`);
  }
  const runtimeGuards = (parsed as { runtimeGuards?: unknown }).runtimeGuards;
  if (!runtimeGuards || typeof runtimeGuards !== "object" || Array.isArray(runtimeGuards)) {
    throw new Error(`${configPath} must define a runtimeGuards object.`);
  }
  const raw = runtimeGuards as Record<string, unknown>;
  const configurations = readConfigurationOverrides(raw.configurations, configPath);
  return {
    runtimeGuards: {
      run: readLevel(raw.run, "runtimeGuards.run", configPath),
      build: readLevel(raw.build, "runtimeGuards.build", configPath),
      configurations,
    },
  };
}

export function resolveRuntimeGuardLevel(
  config: RuntimeGuardConfiguration,
  profile: RuntimeGuardProfile,
  configuration?: string,
): RuntimeGuardLevel {
  return configuration
    ? config.runtimeGuards.configurations[configuration]?.[profile] ??
      config.runtimeGuards[profile]
    : config.runtimeGuards[profile];
}

export function detectRuntimeGuardConfiguration(
  config: RuntimeGuardConfiguration,
  environment: NodeJS.ProcessEnv,
): string | undefined {
  const configuredNames = Object.keys(config.runtimeGuards.configurations);
  if (configuredNames.length === 0) return undefined;

  const matchingName = (value: string | undefined): string | undefined =>
    value
      ? configuredNames.find((name) => name.toLowerCase() === value.toLowerCase())
      : undefined;
  const preferredKeys = [
    "TS2GML_CONFIGURATION",
    "YYCONFIG_NAME",
    "YYCONFIG",
    "GAMEMAKER_CONFIGURATION",
    "GAMEMAKER_CONFIG",
  ];
  for (const key of preferredKeys) {
    const name = matchingName(readEnvironmentVariable(environment, key));
    if (name) return name;
  }
  return undefined;
}

export function detectRuntimeGuardProfile(
  environment: NodeJS.ProcessEnv,
): RuntimeGuardProfile {
  const explicitProfile = readEnvironmentVariable(
    environment,
    "TS2GML_PROFILE",
  )?.toLowerCase();
  if (explicitProfile === "run" || explicitProfile === "build") {
    return explicitProfile;
  }
  return readEnvironmentVariable(environment, "YYTARGETFILE")?.trim()
    ? "build"
    : "run";
}

export function createRuntimeGuardGml(): string {
  return `${runtimeGuardFunctions.trim()}\n`;
}

export function createRuntimeGuardHooks(projectFileName: string): Map<string, string> {
  const cli = "datafiles\\ts2gml\\cli.cjs";
  const batchProject = projectFileName.replaceAll("%", "%%");
  const shellProject = projectFileName.replaceAll("'", `'"'"'`);
  const batch = (profile: RuntimeGuardProfile | "auto") => `@echo off\r
node "%~dp0${cli}" guard-profile ${profile} "%~dp0${batchProject}"\r
exit /b %ERRORLEVEL%\r
`;
  const shell = (profile: RuntimeGuardProfile | "auto") => `#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node "$SCRIPT_DIR/datafiles/ts2gml/cli.cjs" guard-profile ${profile} "$SCRIPT_DIR"/'${shellProject}'
`;
  return new Map([
    ["pre_project_step.bat", batch("auto")],
    ["pre_run_step.bat", batch("run")],
    ["pre_build_step.bat", batch("build")],
    ["pre_project_step.sh", shell("auto")],
    ["pre_run_step.sh", shell("run")],
    ["pre_build_step.sh", shell("build")],
  ]);
}

export async function consumeRuntimeGuardRunMarker(projectFile: string): Promise<boolean> {
  const projectPath = path.resolve(projectFile);
  const markerPath = path.join(path.dirname(projectPath), ".ts2gml", runMarkerFileName);
  return consumeFreshRunMarker(markerPath, projectPath);
}

export async function writeRuntimeGuardRunMarker(projectFile: string): Promise<void> {
  const projectPath = path.resolve(projectFile);
  const markerPath = path.join(path.dirname(projectPath), ".ts2gml", runMarkerFileName);
  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  await atomicWriteFile(
    markerPath,
    `${JSON.stringify({ projectPath, createdAt: Date.now() })}\n`);
}

function readConfigurationOverrides(
  value: unknown,
  configPath: string,
): Record<string, Partial<Record<RuntimeGuardProfile, RuntimeGuardLevel>>> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${configPath}: runtimeGuards.configurations must be an object.`);
  }
  const result: Record<string, Partial<Record<RuntimeGuardProfile, RuntimeGuardLevel>>> = {};
  for (const [name, profiles] of Object.entries(value)) {
    if (!name || /[\s:]/.test(name)) {
      throw new Error(
        `${configPath}: GameMaker configuration '${name}' cannot be empty or contain whitespace or a colon.`,
      );
    }
    if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) {
      throw new Error(`${configPath}: runtimeGuards.configurations.${name} must be an object.`);
    }
    const raw = profiles as Record<string, unknown>;
    const entry: Partial<Record<RuntimeGuardProfile, RuntimeGuardLevel>> = {};
    if (raw.run !== undefined) entry.run = readLevel(raw.run, `configurations.${name}.run`, configPath);
    if (raw.build !== undefined) {
      entry.build = readLevel(raw.build, `configurations.${name}.build`, configPath);
    }
    result[name] = entry;
  }
  return result;
}

function readLevel(value: unknown, property: string, configPath: string): RuntimeGuardLevel {
  if (value === "off" || value === "standard" || value === "maximum") return value;
  throw new Error(
    `${configPath}: ${property} must be 'off', 'standard', or 'maximum'.`,
  );
}

function readEnvironmentVariable(
  environment: NodeJS.ProcessEnv,
  requestedName: string,
): string | undefined {
  return Object.entries(environment).find(([name]) =>
    name.toUpperCase() === requestedName
  )?.[1];
}

async function consumeFreshRunMarker(markerPath: string, projectPath: string): Promise<boolean> {
  let marker: { projectPath?: unknown; createdAt?: unknown };
  try {
    marker = JSON.parse(await fs.readFile(markerPath, "utf8")) as typeof marker;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    marker = {};
  }
  await fs.rm(markerPath, { force: true });
  return marker.projectPath === projectPath &&
    typeof marker.createdAt === "number" &&
    Date.now() - marker.createdAt <= runMarkerLifetimeMs;
}

const runtimeGuardFunctions = `function __ts2gml_guard_object(_value, _expected, _context) {
    if (!instance_exists(_value)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " is not an instance of ", object_get_name(_expected));
    }
    var _actual = _value.object_index;
    if (_actual != _expected && !object_is_ancestor(_actual, _expected)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " is ", object_get_name(_actual), ", expected ", object_get_name(_expected));
    }
    return _value;
}

function __ts2gml_value_matches(_value, _descriptor) {
    var _kind = _descriptor[0];
    var _actual;
    var _index;
    var _members;
    switch (_kind) {
        case "number": return is_real(_value);
        case "string": return is_string(_value);
        case "boolean": return is_bool(_value);
        case "undefined": return is_undefined(_value);
        case "null": return is_ptr(_value) && _value == pointer_null;
        case "literal": return __ts2gml_value_equal(_value, _descriptor[1]);
        case "object":
            if (!instance_exists(_value)) return false;
            _actual = _value.object_index;
            return _actual == _descriptor[1] || object_is_ancestor(_actual, _descriptor[1]);
        case "constructor": return is_struct(_value) && is_instanceof(_value, _descriptor[1]);
        case "array":
            if (!is_array(_value)) return false;
            for (_index = 0; _index < array_length(_value); _index += 1) {
                if (!__ts2gml_value_matches(_value[_index], _descriptor[1])) return false;
            }
            return true;
        case "union":
            _members = _descriptor[1];
            for (_index = 0; _index < array_length(_members); _index += 1) {
                if (__ts2gml_value_matches(_value, _members[_index])) return true;
            }
            return false;
        case "never": return false;
    }
    return true;
}

function __ts2gml_guard_value(_value, _descriptor, _expected, _context) {
    if (!__ts2gml_value_matches(_value, _descriptor)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " expected ", _expected);
    }
    return _value;
}`;
