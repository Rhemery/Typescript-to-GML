import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const messages = new Map();
for (const name of (await fs.readdir("src/compiler")).filter((name) => name.endsWith(".ts")).sort()) {
  const file = path.join("src/compiler", name);
  const source = ts.createSourceFile(file, await fs.readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const index = node.arguments.findIndex((argument) => ts.isStringLiteral(argument) && /^TS2GML\d+$/.test(argument.text));
      const code = node.arguments[index];
      const message = node.arguments[index + 1];
      if (index >= 0 && message && (ts.isStringLiteralLike(message) || ts.isTemplateExpression(message))) {
        const text = ts.isTemplateExpression(message)
          ? message.head.text + message.templateSpans.map((span) => `…${span.literal.text}`).join("") : message.text;
        const entries = messages.get(code.text) ?? new Set();
        entries.add(text.replace(/\s+/g, " ").replaceAll("|", "\\|"));
        messages.set(code.text, entries);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const output = ["# Compiler diagnostic catalog", "",
  "Generated from compiler diagnostic call sites by `npm run docs:diagnostics`. Dynamic values are shown as …; source ranges and actionable suggestions are included in CLI/editor output.", "",
  "This inventories stable compiler codes, not an exhaustive compatibility or execution-coverage claim. Ordinary type diagnostics retain their TypeScript TS codes.", "",
  "| Code | Message templates |", "| --- | --- |",
  ...[...messages].sort(([left], [right]) => left.localeCompare(right)).map(([code, texts]) =>
    `| ${code} | ${[...texts].join("<br>")} |`), ""].join("\n");
const destination = "docs/Diagnostics.md";
if (process.argv.includes("--check")) {
  if (await fs.readFile(destination, "utf8") !== output) throw new Error("Diagnostic catalog is stale; run npm run docs:diagnostics.");
} else await fs.writeFile(destination, output);
console.log(`Validated ${messages.size} compiler diagnostic codes.`);
