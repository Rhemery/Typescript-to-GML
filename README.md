# TypeScript to GML

TypeScript to GML provides typed declarations for the GameMaker API and compiles a deliberately supported TypeScript/JavaScript subset into GML. Ordinary classes become GML constructors. Classes derived from `GMObject` become GameMaker object assets and event files. Classes derived from `GMRoom` provide creation code for existing rooms.

> [!WARNING]
> Version `0.2.0-beta.6` is a public beta. It is suitable for guarded use in a source-controlled project, but it is not a complete JavaScript runtime and has only been exercised end-to-end on the Windows VM target with GameMaker runtime `2026.0.0.23`. Read [Known issues and beta warnings](docs/Known-Issues.md) before adopting it.

The compiler is intentionally conservative: unsupported syntax produces a source-located `TS2GML` diagnostic instead of known-invalid GML. Generated assets are deterministic, and a manifest records which assets ts2gml owns. Generated content follows TypeScript; unmanaged GameMaker assets are protected from takeover.

## Install into a GameMaker project

The recommended release artifact is `typescript-to-gml-<version>.yymps`.

1. Commit or back up the GameMaker project.
2. Drag the `.yymps` file into the GameMaker IDE, or use **Tools > Import Local Package**.
3. Import all files under `datafiles/ts2gml`.
4. Install [Node.js 22 or newer](https://nodejs.org/) and TypeScript 5.9.x (`npm install --global typescript@5.9`, or `npm install --save-dev typescript@5.9` in the game directory).
5. Save the GameMaker project and run `datafiles\ts2gml\ts2gml.bat build --project-saved` once from the game directory.
6. Install the companion `typescript-to-gml-vscode-<version>.vsix` release artifact in Visual Studio Code.
7. Open the game folder in Visual Studio Code, open **Terminal > New Terminal**, and run `.\datafiles\ts2gml\ts2gml.bat watch`.

The first run creates `typescript/tsconfig.json` and `ts2gml.config.json`, then generates the project-local GameMaker API declarations from the active compatible runtime's installed `GmlSpec.xml`. Put authored `.ts` files in `typescript/`; generated Script, Object, and room creation-code resources are written into the GameMaker project.

TypeScript standard-library declarations are read from your installed TypeScript package and are not included in the YYMPS. The CLI prefers a project installation, then a global installation available through `tsc` on `PATH`. VS Code's built-in TypeScript language support does not install `tsc` for terminal commands. See [TypeScript setup](docs/Getting-Started.md#requirements) for custom installations.

Runtime guards default to `standard`: explicit `gm_self<T>()` and `gm_other<T>()` assertions are checked once per execution scope. The project configuration provides separate `run` and `build` levels, GameMaker configuration overrides, and a `maximum` level that also checks typed array and collection mutations. Generated GameMaker compiler hooks apply the right profile directly to generated GML before GameMaker loads it. See [runtime type guards](docs/Runtime-Guards.md).

The VS Code extension displays compiler diagnostics in the editor and in **Problems**. It resolves names found in the generated runtime declarations through the official manual index and links them to their exact GameMaker manual topics; middle-click a built-in such as `instance_create_layer`, or run **TypeScript to GML: Open GameMaker Manual for Symbol**. Set `typescriptToGml.manualChannel` to `lts` when the project targets the LTS manual.

```ts
class obj_player extends GMObject {
  health = 100;

  protected onCreate() {
    this.x = 64;
  }

  protected onStep() {
    this.x += 2;
  }
}
```

For installation from source, build the distribution and copy `dist/ts2gml` to `<game>/datafiles/ts2gml`:

```powershell
npm ci
npm run build
```

## npm library

The YYMPS remains the supported way to install the project-local CLI into a GameMaker project. For build tooling that calls the compiler programmatically, install the prerelease library from npm:

```powershell
npm install --save-dev typescript-to-gml@beta
```

```ts
import { compileTypeScript } from "typescript-to-gml";

const { gml } = compileTypeScript("const answer = 42;", "example.ts");
```

The npm package intentionally does not install a global `ts2gml` command. GameMaker project commands rely on the complete, pinned distribution under `datafiles/ts2gml`.

## Commands

```bat
datafiles\ts2gml\ts2gml.bat init
datafiles\ts2gml\ts2gml.bat runtime
datafiles\ts2gml\ts2gml.bat check
datafiles\ts2gml\ts2gml.bat build
datafiles\ts2gml\ts2gml.bat watch
datafiles\ts2gml\ts2gml.bat --version
```

If Beta, Stable, or LTS installations are equally compatible with the project, run `runtime` and select the installation GameMaker uses. This machine-local choice follows that installation's active runtime when it updates.

For day-to-day work, run watch mode in the Visual Studio Code terminal from the GameMaker project directory:

```powershell
.\datafiles\ts2gml\ts2gml.bat watch
```

Keep this terminal visible while editing. When a structural change needs GameMaker to be saved, the prompt appears here and waits for Enter. Double-clicking `ts2gml.bat` remains supported and starts the same watch command, but the integrated terminal makes prompts and diagnostics easier to notice.

Use `check` in continuous integration. During `watch`, body-only changes update immediately. For a resource, event, field, room-link, or source-folder change, save GameMaker and press Enter at the watcher prompt. Use `build --project-saved` as the explicit non-interactive equivalent. Compiler-owned output is automatically refreshed from TypeScript, including after GameMaker edits it.

If an unmanaged GameMaker asset has the same name or path as a TypeScript asset, the compiler rejects it and reports both paths. Delete the asset in GameMaker and save the project if you want ts2gml to manage it, or rename the TypeScript asset.

## Documentation

- [Wiki home and project status](docs/Home.md)
- [Getting started](docs/Getting-Started.md)
- [How the compiler works](docs/How-It-Works.md)
- [Authoring guide](docs/Authoring-Guide.md)
- [Supported language subset](docs/Supported-Language.md)
- [Runtime type guards](docs/Runtime-Guards.md)
- [CLI reference](docs/CLI-Reference.md)
- [Visual Studio Code extension](docs/VS-Code-Extension.md)
- [Generated files and ownership](docs/Generated-Files-and-Ownership.md)
- [Known issues and beta warnings](docs/Known-Issues.md)
- [Troubleshooting](docs/Troubleshooting.md)
- [Development and releasing](docs/Development-and-Releasing.md)

The GameMaker API inventory and JSDoc are generated from the installed runtime's `GmlSpec.xml`. The online manual remains the source for API semantics; its prose is not copied into this project.

## Release readiness

`npm run verify:release` is the portable release gate. `npm run verify` additionally generates declarations from the installed GameMaker runtime, compiles the integration project with Igor, and runs it in the GameMaker VM. The current verified runtime fixture must print `TS2GML_SCOPE_CONTEXT_OK`.

The project is licensed under the [MIT License](LICENSE). GameMaker and its runtime API are products of YoYo Games.
