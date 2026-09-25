# TypeScript to GML for Visual Studio Code

This companion extension adds editor support to projects that use
[typescript-to-gml](https://github.com/Rhemery/Typescript-to-GML):

- `TS2GML` compiler diagnostics appear while editing TypeScript.
- A complete project check runs after a TypeScript file is saved and is also available as **TypeScript to GML: Check Project**.
- GameMaker built-ins from the project's generated runtime declarations link to their exact pages in the official GameMaker manual without adding visible underlines. Middle-click a built-in to open its topic, or use **TypeScript to GML: Open GameMaker Manual for Symbol**.

The extension activates only for TypeScript files beneath a directory containing one GameMaker `.yyp` project. Run the CLI's `init` command first so the project-local runtime declarations exist.

Project checks require Node.js 22+ and TypeScript 5.9.x installed in the game (`npm install --save-dev typescript@5.9`) or globally (`npm install --global typescript@5.9`). The editor's built-in TypeScript language service is separate from the CLI's library installation.

The extension uses the official manual's published topic index. The Monthly channel is used by default; set `typescriptToGml.manualChannel` to `lts` for an LTS project.
