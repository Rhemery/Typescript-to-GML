import { promises as fs } from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import type { CompilerDiagnostic } from "../../src/compiler/compile.js";
import { checkWithProjectCompiler, findGeneratedLocation } from "../../src/vscode/project-client.js";
import { getProjectTypesDirectory } from "../../src/project-layout.js";
import {
  collectManualLinkRanges,
  collectManualTopics,
  collectRuntimeBuiltIns,
  gameMakerManualIndexUrl,
  gameMakerManualUrl,
  type ManualChannel,
} from "../../src/vscode/manual-links.js";

const languageSelector: vscode.DocumentSelector = [
  { language: "typescript", scheme: "file" },
  { language: "typescriptreact", scheme: "file" },
];

interface BuiltInCacheEntry {
  modified: number;
  names: Map<string, string>;
}

function createDiagnostic(item: CompilerDiagnostic): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(
      Math.max(0, item.line - 1),
      Math.max(0, item.column - 1),
      Math.max(0, item.endLine - 1),
      Math.max(0, item.endColumn - 1),
    ),
    item.suggestion ? `${item.message} ${item.suggestion}` : item.message,
    item.severity === "warning"
      ? vscode.DiagnosticSeverity.Warning
      : vscode.DiagnosticSeverity.Error,
  );
  diagnostic.code = item.code;
  diagnostic.source = "ts2gml";
  return diagnostic;
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("typescript-to-gml");
  const output = vscode.window.createOutputChannel("TypeScript to GML", { log: true });
  const manualLinkAppearance = vscode.window.createTextEditorDecorationType({
    textDecoration: "none !important",
  });
  const builtInCache = new Map<string, BuiltInCacheEntry>();
  const manualTopicCache = new Map<ManualChannel, Promise<Map<string, string>>>();
  const documentTimers = new Map<string, NodeJS.Timeout>();
  const projectTimers = new Map<string, NodeJS.Timeout>();
  const projectRuns = new Map<string, number>();
  const projectDiagnosticFiles = new Map<string, Set<string>>();

  const documentRuns = new Map<string, AbortController>();
  const projectControllers = new Map<string, AbortController>();

  const updateDocument = async (document: vscode.TextDocument): Promise<void> => {
    const key = document.uri.toString();
    documentRuns.get(key)?.abort();
    if (!isTypeScriptDocument(document)) return;
    const project = await findGameMakerProject(document.uri.fsPath);
    if (!project) { diagnostics.delete(document.uri); return; }
    const controller = new AbortController();
    documentRuns.set(key, controller);
    const version = document.version;
    try {
      const result = await checkWithProjectCompiler(project,
        { fileName: document.uri.fsPath, source: document.getText() }, controller.signal);
      if (controller.signal.aborted || document.isClosed || document.version !== version) return;
      diagnostics.set(document.uri, result.diagnostics.map(createDiagnostic));
      if (result.error && result.diagnostics.length === 0) output.error(result.error);
    } catch (error) {
      if (!controller.signal.aborted) output.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (documentRuns.get(key) === controller) documentRuns.delete(key);
    }
  };

  const checkProject = async (projectPath: string, showResult: boolean): Promise<void> => {
    projectControllers.get(projectPath)?.abort();
    const controller = new AbortController();
    projectControllers.set(projectPath, controller);
    const run = (projectRuns.get(projectPath) ?? 0) + 1;
    projectRuns.set(projectPath, run);
    const previousFiles = projectDiagnosticFiles.get(projectPath) ?? new Set<string>();
    try {
      const result = await checkWithProjectCompiler(projectPath, undefined, controller.signal);
      if (projectRuns.get(projectPath) !== run) return;
      const grouped = new Map<string, vscode.Diagnostic[]>();
      for (const item of result.diagnostics) {
        const document = vscode.workspace.textDocuments.find((candidate) =>
          sameFile(candidate.uri.fsPath, item.fileName));
        if (document?.isDirty) continue;
        const items = grouped.get(item.fileName) ?? [];
        items.push(createDiagnostic(item));
        grouped.set(item.fileName, items);
      }
      for (const fileName of previousFiles) {
        if (!grouped.has(fileName)) diagnostics.delete(vscode.Uri.file(fileName));
      }
      for (const [fileName, items] of grouped) diagnostics.set(vscode.Uri.file(fileName), items);
      projectDiagnosticFiles.set(projectPath, new Set(grouped.keys()));
      for (const document of vscode.workspace.textDocuments) {
        if (document.isDirty && isTypeScriptDocument(document)) void updateDocument(document);
      }
      if (result.error) {
        output.error(result.error);
        if (showResult) void vscode.window.showErrorMessage(result.error);
      } else {
        const message = `Compiler ${result.compilerVersion}: checked ${result.sourceFiles?.length ?? 0} file(s) in ${projectPath}.`;
        output.info(message);
        if (showResult) void vscode.window.showInformationMessage(message);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      output.error(message);
      if (showResult) void vscode.window.showErrorMessage(`TypeScript to GML: ${message}`);
    } finally {
      if (projectControllers.get(projectPath) === controller) projectControllers.delete(projectPath);
    }
  };

  const scheduleDocument = (document: vscode.TextDocument): void => {
    const key = document.uri.toString();
    const previous = documentTimers.get(key);
    if (previous) clearTimeout(previous);
    documentTimers.set(key, setTimeout(() => {
      documentTimers.delete(key);
      void updateDocument(document);
    }, 250));
  };

  const scheduleProject = async (document: vscode.TextDocument): Promise<void> => {
    const projectPath = await findGameMakerProject(document.uri.fsPath);
    if (!projectPath) return;
    const previous = projectTimers.get(projectPath);
    if (previous) clearTimeout(previous);
    projectTimers.set(projectPath, setTimeout(() => {
      projectTimers.delete(projectPath);
      void checkProject(projectPath, false);
    }, 350));
  };

  const loadBuiltIns = async (document: vscode.TextDocument): Promise<Map<string, string>> => {
    const projectPath = await findGameMakerProject(document.uri.fsPath);
    if (!projectPath) return new Map();
    const declarationsPath = path.join(
      getProjectTypesDirectory(path.dirname(projectPath)),
      "gamemaker.generated.d.ts",
    );
    try {
      const stat = await fs.stat(declarationsPath);
      const cached = builtInCache.get(declarationsPath);
      if (cached?.modified === stat.mtimeMs) return cached.names;
      const names = collectRuntimeBuiltIns(await fs.readFile(declarationsPath, "utf8"));
      builtInCache.set(declarationsPath, { modified: stat.mtimeMs, names });
      return names;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        output.error(error instanceof Error ? error.message : String(error));
      }
      return new Map();
    }
  };

  const loadManualTopics = (channel: ManualChannel): Promise<Map<string, string>> => {
    const cached = manualTopicCache.get(channel);
    if (cached) return cached;
    const request = (async () => {
      try {
        const response = await fetch(gameMakerManualIndexUrl(channel), {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const topics = collectManualTopics(await response.json());
        if (topics.size === 0) throw new Error("the manual index was empty or invalid");
        return topics;
      } catch (error) {
        output.error(
          `Could not load the ${channel} GameMaker manual index: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return new Map();
      }
    })();
    manualTopicCache.set(channel, request);
    return request;
  };

  context.subscriptions.push(
    { dispose: () => {
      for (const timer of [...documentTimers.values(), ...projectTimers.values()]) clearTimeout(timer);
      for (const controller of [...documentRuns.values(), ...projectControllers.values()]) controller.abort();
    } },
    diagnostics,
    output,
    manualLinkAppearance,
    vscode.workspace.onDidOpenTextDocument((document) => scheduleDocument(document)),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleDocument(event.document)),
    vscode.workspace.onDidSaveTextDocument((document) => {
      scheduleDocument(document);
      void scheduleProject(document);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString();
      const timer = documentTimers.get(key);
      if (timer) clearTimeout(timer);
      documentTimers.delete(key);
      documentRuns.get(key)?.abort();
      diagnostics.delete(document.uri);
    }),
    vscode.languages.registerDocumentLinkProvider(languageSelector, {
      async provideDocumentLinks(document) {
        if (!isTypeScriptDocument(document)) return [];
        const channel = manualChannel();
        const [builtIns, manualTopics] = await Promise.all([
          loadBuiltIns(document),
          loadManualTopics(channel),
        ]);
        const manualLinks = collectManualLinkRanges(document.getText(), builtIns, manualTopics);
        const ranges = manualLinks.map((item) => new vscode.Range(
          document.positionAt(item.start),
          document.positionAt(item.end),
        ));
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === document) {
            editor.setDecorations(manualLinkAppearance, ranges);
          }
        }
        return manualLinks.map((item, index) => {
          const link = new vscode.DocumentLink(
            ranges[index]!,
            vscode.Uri.parse(gameMakerManualUrl(item.manualPath, channel)),
          );
          link.tooltip = `Open the GameMaker manual for ${item.manualSymbol}`;
          return link;
        });
      },
    }),
    vscode.commands.registerCommand("typescriptToGml.openManual", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isTypeScriptDocument(editor.document)) return;
      const range = editor.document.getWordRangeAtPosition(editor.selection.active);
      const symbol = range && editor.document.getText(range);
      const channel = manualChannel();
      const [builtIns, manualTopics] = await Promise.all([
        loadBuiltIns(editor.document),
        loadManualTopics(channel),
      ]);
      const manualSymbol = symbol && builtIns.get(symbol);
      const manualPath = manualSymbol && manualTopics.get(manualSymbol);
      if (!manualPath) {
        void vscode.window.showWarningMessage(
          "No exact GameMaker manual page was found for the selected runtime built-in.",
        );
        return;
      }
      await vscode.env.openExternal(vscode.Uri.parse(gameMakerManualUrl(manualPath, channel)));
    }),
    vscode.commands.registerCommand("typescriptToGml.checkProject", async () => {
      const editor = vscode.window.activeTextEditor;
      const projectPath = editor && await findGameMakerProject(editor.document.uri.fsPath);
      if (!projectPath) {
        void vscode.window.showErrorMessage("TypeScript to GML: no parent GameMaker .yyp project found.");
        return;
      }
      await checkProject(projectPath, true);
    }),
    vscode.commands.registerCommand("typescriptToGml.openGeneratedGml", async () => {
      const editor = vscode.window.activeTextEditor;
      const project = editor && await findGameMakerProject(editor.document.uri.fsPath);
      if (!editor || !project) return;
      try {
        const location = await findGeneratedLocation(project, editor.document.uri.fsPath, editor.selection.active.line + 1);
        if (!location) {
          void vscode.window.showInformationMessage("Build this project with compiler beta.5 or newer to generate GML source maps.");
          return;
        }
        const document = await vscode.workspace.openTextDocument(location.fileName);
        const line = Math.min(location.line - 1, document.lineCount - 1);
        await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside,
          selection: new vscode.Range(line, 0, line, 0) });
      } catch (error) { output.error(error instanceof Error ? error.message : String(error)); }
    }),
  );

  const declarationsWatcher = vscode.workspace.createFileSystemWatcher(
    "**/datafiles/ts2gml/types/gamemaker.generated.d.ts",
  );
  const invalidateBuiltIns = (uri: vscode.Uri): void => {
    builtInCache.delete(uri.fsPath);
  };
  declarationsWatcher.onDidCreate(invalidateBuiltIns);
  declarationsWatcher.onDidChange(invalidateBuiltIns);
  declarationsWatcher.onDidDelete(invalidateBuiltIns);
  context.subscriptions.push(declarationsWatcher);

  for (const document of vscode.workspace.textDocuments) scheduleDocument(document);
}

export function deactivate(): void {}

function isTypeScriptDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" &&
    !document.uri.fsPath.toLowerCase().endsWith(".d.ts") &&
    (document.languageId === "typescript" || document.languageId === "typescriptreact");
}

async function findGameMakerProject(fileName: string): Promise<string | undefined> {
  if (!fileName) return undefined;
  let directory = path.dirname(path.resolve(fileName));
  while (true) {
    try {
      const projects = (await fs.readdir(directory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".yyp"));
      if (projects.length === 1) {
        const relative = path.relative(directory, path.resolve(fileName));
        const sourcePrefix = relative.split(path.sep)[0];
        return sourcePrefix?.toLowerCase() === "typescript"
          ? path.join(directory, projects[0]!.name)
          : undefined;
      }
      if (projects.length > 1) return undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function manualChannel(): ManualChannel {
  return vscode.workspace.getConfiguration("typescriptToGml").get<ManualChannel>(
    "manualChannel",
    "monthly",
  );
}

function sameFile(left: string, right: string): boolean {
  return process.platform === "win32"
    ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
    : path.resolve(left) === path.resolve(right);
}
