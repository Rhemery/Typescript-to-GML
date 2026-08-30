import ts from "typescript";
import { createNodeDiagnostic, emitGml, Ts2GmlError } from "./compile.js";
import { isGmlIdentifier } from "./gml-identifiers.js";

export interface CompiledRoomCreationCode {
  name: string;
  code: string;
}

export function isRoomClass(classNode: ts.ClassDeclaration): boolean {
  const baseType = classNode.heritageClauses
    ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
    ?.types[0];
  return Boolean(
    baseType && ts.isIdentifier(baseType.expression) && baseType.expression.text === "GMRoom",
  );
}

export function compileRoomClass(
  classNode: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): CompiledRoomCreationCode {
  const name = classNode.name?.text;
  if (!name) throw roomError(classNode, sourceFile, "GameMaker rooms must have a class name.");
  if (!isGmlIdentifier(name)) {
    throw roomError(classNode.name!, sourceFile, `Invalid GameMaker room name '${name}'.`);
  }

  let code: string | undefined;
  for (const member of classNode.members) {
    if (
      !ts.isMethodDeclaration(member) ||
      !member.body ||
      !ts.isIdentifier(member.name) ||
      member.name.text !== "onCreate"
    ) {
      throw roomError(
        member,
        sourceFile,
        "GMRoom classes may only define onCreate().",
      );
    }
    if (member.parameters.length > 0) {
      throw roomError(member, sourceFile, "Room creation code cannot receive parameters.");
    }
    if (code !== undefined) {
      throw roomError(member, sourceFile, "Room creation code may only be defined once.");
    }
    code = member.body.statements.map((statement) => emitGml(statement, sourceFile)).join("\n");
  }

  if (code === undefined) {
    throw roomError(classNode, sourceFile, "GMRoom classes must define onCreate().");
  }
  return { name, code: `${code.trim()}\n` };
}

function roomError(node: ts.Node, sourceFile: ts.SourceFile, message: string): Ts2GmlError {
  return new Ts2GmlError([
    createNodeDiagnostic(node, sourceFile, "TS2GML3002", message),
  ]);
}
