export {
  compileTypeScript,
  formatDiagnostic,
  Ts2GmlError,
  validateTypeScriptSource,
  type CompileResult,
  type CompilerDiagnostic,
} from "./compiler/compile.js";
export {
  buildGameMakerProject,
  checkGameMakerProject,
  prepareTypeScriptProject,
  StructuralGameMakerChangesError,
  type BuildOptions,
  type BuildSummary,
  type CheckSummary,
  type TypeScriptProjectSummary,
} from "./compiler/project.js";
export {
  watchGameMakerProject,
  type WatchOptions,
} from "./compiler/watch.js";
export {
  clearProjectRuntimeSelection,
  discoverInstalledGmlSpecs,
  ensureProjectRuntimeDeclarations,
  findInstalledGmlSpec,
  generateDeclarations,
  renderDeclarations,
  saveProjectRuntimeSelection,
  type DeclarationSummary,
  type GmlSpecDiscoveryOptions,
  GmlSpecAmbiguityError,
  GmlSpecNotFoundError,
  GmlSpecSelectionError,
  type InstalledGmlSpec,
  type RuntimeDeclarationSyncSummary,
} from "./declarations/generate.js";
export {
  generateProjectDeclarations,
  type ProjectAssetDeclaration,
  type ProjectDeclarationSummary,
  type ProjectFunctionDeclaration,
} from "./declarations/project.js";
export {
  extractGmlDeclarations,
  type GmlFunctionDeclaration,
  type GmlParameterDeclaration,
  type GmlSourceDeclarations,
} from "./declarations/gml.js";
export {
  extractFunctionJsDocs,
  mapGmlJsDocType,
  type GmlJsDoc,
  type GmlJsDocParameter,
} from "./declarations/jsdoc.js";
export { VERSION } from "./version.js";
