import type { CompilerDiagnostic } from "./compiler/compile.js";

export interface DiagnosticResponse {
  protocolVersion: 1;
  compilerVersion: string;
  diagnostics: readonly CompilerDiagnostic[];
  sourceFiles?: readonly string[];
  error?: string;
}

export function readDiagnosticResponse(source: string): DiagnosticResponse {
  const value = JSON.parse(source) as DiagnosticResponse;
  if (!value || value.protocolVersion !== 1 || typeof value.compilerVersion !== "string" ||
    !Array.isArray(value.diagnostics) || value.diagnostics.some((item) =>
      !item || typeof item.code !== "string" || typeof item.fileName !== "string" ||
      typeof item.message !== "string" || !["error", "warning"].includes(item.severity) ||
      ![item.line, item.column, item.endLine, item.endColumn].every((position) =>
        Number.isSafeInteger(position) && position > 0)) ||
    (value.sourceFiles !== undefined && (!Array.isArray(value.sourceFiles) ||
      value.sourceFiles.some((file) => typeof file !== "string"))) ||
    (value.error !== undefined && typeof value.error !== "string")) {
    throw new Error("The project compiler returned an unsupported diagnostic protocol. Upgrade datafiles/ts2gml and retry.");
  }
  return value;
}
