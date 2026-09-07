# Visual Studio Code extension

The companion extension is shipped as `typescript-to-gml-vscode-<version>.vsix` beside the GameMaker `.yymps` release artifact. It requires Visual Studio Code 1.134 or newer.

## Install

1. Download the VSIX matching the compiler release.
2. In Visual Studio Code, run **Extensions: Install from VSIX...**.
3. Open the directory containing one GameMaker `.yyp` project.
4. Run `datafiles\ts2gml\ts2gml.bat init` once if the project-local runtime declarations do not exist yet.
5. Open a file below the project's `typescript/` directory.

## Diagnostics

The extension invokes `node datafiles/ts2gml/cli.cjs` from the current game in a separate process. Unsaved text is sent to `diagnose --json`; saved projects use `check --json`. Checks are debounced, superseded processes are cancelled, and stale results are discarded. Visual Studio Code's built-in TypeScript service continues to provide ordinary type errors.

Install Node 22+ on PATH and compiler beta.5 or newer in each game. A missing or incompatible diagnostic protocol produces an actionable error; the extension does not substitute its own compiler. Its numeric extension version is `0.2.5`, matching compiler `0.2.0-beta.5` in its metadata.

After a TypeScript file is saved, the extension also runs the complete project check. This covers cross-file bindings, Object and room rules, strict TypeScript checking, GameMaker resource references, and ownership collisions. Run **TypeScript to GML: Check Project** to request the same check explicitly. Generated GameMaker assets are not written by this check; continue running the CLI watcher to produce GML.

## GameMaker manual links

Use **TypeScript to GML: Open Generated GML** from TypeScript to open the closest generated statement beside the source. It uses the last build's owned `.gml.map.json` files. Save and build first when you need the preview to reflect current edits.

The extension reads built-in names from `datafiles/ts2gml/types/gamemaker.generated.d.ts`, so links match the runtime selected for the project instead of a bundled API snapshot. It resolves those names through the selected official manual channel's published topic index and only creates links for exact topics. Strings and comments are not linked.

Middle-click a linked built-in to open its exact topic in the official GameMaker manual. Manual links are deliberately rendered without underlines so built-ins retain the editor's normal code appearance. The extension supplies Visual Studio Code's `editor.mouseMiddleClickAction: openLink` default for TypeScript. A user or workspace setting can override it; if middle-click does not open a link, set that value explicitly or run **TypeScript to GML: Open GameMaker Manual for Symbol** with the cursor on the built-in.

The Monthly manual is used by default. Set this for an LTS project:

```json
{
  "typescriptToGml.manualChannel": "lts"
}
```
