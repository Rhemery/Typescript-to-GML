import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const runtimeDeclarationFileNames = ["core.d.ts", "gamemaker.generated.d.ts"];

export async function readRuntimeDeclarationBindings(
  typeDirectory: string,
): Promise<Set<string>> {
  const bindings = new Set<string>();
  for (const fileName of runtimeDeclarationFileNames) {
    const declarationPath = path.join(typeDirectory, fileName);
    let source: string;
    try {
      source = await fs.readFile(declarationPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    const sourceFile = ts.createSourceFile(
      declarationPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const statement of sourceFile.statements) {
      if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name
      ) {
        bindings.add(statement.name.text);
      } else if (
        ts.isVariableStatement(statement) &&
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
      ) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) bindings.add(declaration.name.text);
        }
      }
    }
  }
  return bindings;
}
