import ts from "typescript";
import path from "node:path";

interface Segment { column: number; line: number; character: number }
interface SourceOrigin { source: ts.SourceFile; lines: Segment[][] }
const origins = new WeakMap<ts.SourceFile, SourceOrigin>();
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function parseMappedJavaScript(source: string, fileName: string): ts.SourceFile {
  const match = /\n?\/\/# sourceMappingURL=data:application\/json;base64,([^\r\n]+)\s*$/.exec(source);
  const file = ts.createSourceFile(fileName, match ? source.slice(0, match.index) : source,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (!match) return file;
  const map = JSON.parse(Buffer.from(match[1]!, "base64").toString("utf8")) as {
    mappings: string; sourcesContent: string[];
  };
  let originalLine = 0;
  let originalCharacter = 0;
  const lines = map.mappings.split(";").map((line) => {
    let column = 0;
    const result: Segment[] = [];
    for (const segment of line.split(",").filter(Boolean)) {
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const character of segment) {
        const digit = alphabet.indexOf(character);
        if (digit < 0) throw new Error("Invalid TypeScript source mapping.");
        value += (digit & 31) * 2 ** shift;
        if (digit & 32) shift += 5;
        else {
          values.push((value & 1 ? -1 : 1) * Math.floor(value / 2));
          value = 0; shift = 0;
        }
      }
      column += values[0] ?? 0;
      if (values.length < 4) continue;
      originalLine += values[2]!;
      originalCharacter += values[3]!;
      result.push({ column, line: originalLine, character: originalCharacter });
    }
    return result;
  });
  origins.set(file, { source: ts.createSourceFile(fileName, map.sourcesContent[0]!, ts.ScriptTarget.Latest, true), lines });
  return file;
}

export function originalSourceRange(file: ts.SourceFile, start: number, end: number): {
  source: ts.SourceFile; start: number; end: number;
} {
  const origin = origins.get(file);
  if (!origin) return { source: file, start, end };
  const positions = [start, end].map((offset) => {
    const generated = file.getLineAndCharacterOfPosition(offset);
    const segments = origin.lines[generated.line] ?? [];
    const segment = segments.filter((candidate) => candidate.column <= generated.character).at(-1) ?? segments[0];
    if (!segment) return undefined;
    return origin.source.getPositionOfLineAndCharacter(segment.line, segment.character);
  });
  const first = positions[0] ?? 0;
  return { source: origin.source, start: first, end: Math.max(first + 1, positions[1] ?? first + 1) };
}

export interface GmlSourceMap {
  formatVersion: 1;
  generatedFile: string;
  mappings: Array<{ generatedLine: number; source: string; line: number; column: number }>;
}

export function extractGmlSourceMap(code: string, generatedFile: string, projectDirectory: string): {
  code: string; map: GmlSourceMap;
} {
  const lines: string[] = [];
  const mappings: GmlSourceMap["mappings"] = [];
  for (const line of code.split("\n")) {
    const marker = /^\s*\/\/ @ts2gml-source (.+)\s*$/.exec(line);
    if (!marker) { lines.push(line); continue; }
    const location = JSON.parse(marker[1]!) as { source: string; line: number; column: number };
    mappings.push({ generatedLine: lines.length + 1, ...location,
      source: path.relative(projectDirectory, location.source).split(path.sep).join("/") });
  }
  return { code: lines.join("\n"), map: { formatVersion: 1, generatedFile, mappings } };
}
