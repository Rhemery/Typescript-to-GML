import ts from "typescript";

export type ManualChannel = "monthly" | "lts";

export interface ManualLinkRange {
  start: number;
  end: number;
  symbol: string;
  manualSymbol: string;
  manualPath: string;
}

const manualAliases = new Map([
  ["gm_global", "global"],
  ["gm_instanceof", "instanceof"],
  ["gm_self", "self"],
  ["gm_typeof", "typeof"],
]);

export function collectRuntimeBuiltIns(declarations: string): Map<string, string> {
  const sourceFile = ts.createSourceFile(
    "gamemaker.generated.d.ts",
    declarations,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const builtIns = new Map<string, string>();
  const add = (name: ts.PropertyName | ts.BindingName | undefined): void => {
    if (!name || !ts.isIdentifier(name)) return;
    builtIns.set(name.text, manualAliases.get(name.text) ?? name.text);
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      add(statement.name);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) add(declaration.name);
      continue;
    }
    if (ts.isEnumDeclaration(statement)) {
      add(statement.name);
      for (const member of statement.members) add(member.name);
      continue;
    }
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === "GMObject") {
      for (const member of statement.members) add(member.name);
    }
  }
  return builtIns;
}

export function collectManualLinkRanges(
  source: string,
  builtIns: ReadonlyMap<string, string>,
  manualTopics: ReadonlyMap<string, string>,
): ManualLinkRange[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    source,
  );
  const links: ManualLinkRange[] = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.Identifier) continue;
    const symbol = scanner.getTokenText();
    const manualSymbol = builtIns.get(symbol);
    if (!manualSymbol) continue;
    const manualPath = manualTopics.get(manualSymbol);
    if (!manualPath) continue;
    links.push({
      start: scanner.getTokenPos(),
      end: scanner.getTextPos(),
      symbol,
      manualSymbol,
      manualPath,
    });
  }
  return links;
}

export function collectManualTopics(index: unknown): Map<string, string> {
  if (!index || typeof index !== "object" || Array.isArray(index)) return new Map();
  const topics = new Map<string, { path: string; exactPage: boolean }>();
  for (const [rawPath, rawTags] of Object.entries(index)) {
    if (typeof rawTags !== "string") continue;
    const manualPath = rawPath.replaceAll("\\", "/").replace(/^\/+/, "");
    if (
      !manualPath.toLowerCase().endsWith(".htm") ||
      /^[a-z][a-z\d+.-]*:/i.test(manualPath) ||
      manualPath.split("/").includes("..")
    ) {
      continue;
    }
    const pageName = manualPath.slice(
      manualPath.lastIndexOf("/") + 1,
      -".htm".length,
    ).toLowerCase();
    for (const tag of rawTags.split(",").map((item) => item.trim()).filter(Boolean)) {
      const exactPage = pageName === tag.toLowerCase();
      const existing = topics.get(tag);
      if (!existing || (!existing.exactPage && exactPage)) {
        topics.set(tag, { path: manualPath, exactPage });
      }
    }
  }
  return new Map([...topics].map(([tag, topic]) => [tag, topic.path]));
}

export function gameMakerManualIndexUrl(channel: ManualChannel = "monthly"): string {
  return `https://manual.gamemaker.io/${channel}/en/helpdocs_tags.json`;
}

export function gameMakerManualUrl(
  manualPath: string,
  channel: ManualChannel = "monthly",
): string {
  return `https://manual.gamemaker.io/${channel}/en/#t=${encodeURIComponent(manualPath)}`;
}
