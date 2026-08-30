# Getting started

## Requirements

- GameMaker capable of importing a local asset package.
- Node.js 20 or newer available as `node` on `PATH`.
- A source-controlled or backed-up GameMaker project.
- An editor with TypeScript language support; Visual Studio Code works without an extension.

The compiler runs beside the game rather than as a global install. This keeps each game pinned to its own compiler and declaration version.

## Install the YYMPS package

1. Save and commit the GameMaker project.
2. Download the `.yymps` file attached to the chosen repository release.
3. Drag it onto the GameMaker IDE, or select **Tools > Import Local Package**.
4. Select every included file and import them. They should appear on disk below `datafiles/ts2gml`.
5. Do not move individual files out of that directory; the batch launcher uses its location to find the project root.

The package contains only the compiler, compiler authoring declarations, TypeScript standard-library declarations, documentation, licenses, and launcher. It does not contain a GameMaker runtime declaration snapshot or source assets that could overwrite a game's rooms, objects, or scripts. The first project command generates the GameMaker API declaration from the active compatible installed runtime; no repository checkout is needed.

GameMaker documents the IDE import/export flow in its [Local Asset Packages manual page](https://manual.gamemaker.io/monthly/en/IDE_Tools/Local_Asset_Packages.htm).

## Initialize and run

From a terminal in the game directory:

```bat
datafiles\ts2gml\ts2gml.bat init
datafiles\ts2gml\ts2gml.bat check
datafiles\ts2gml\ts2gml.bat build --project-saved
```

Save the project in GameMaker before the first build. `--project-saved` explicitly tells the compiler that IDE changes are on disk; it cannot verify unsaved GameMaker state itself.

Runtime discovery uses the `.yyp` `IDEVersion` as a compatibility-family hint and reads each GameMaker installation's active runtime selection. If Beta, Stable, or LTS installations are equally compatible, run `datafiles\ts2gml\ts2gml.bat runtime` and choose the installation used for this project. The machine-local choice is saved below `.ts2gml` and follows that installation's active runtime when it updates. `GAMEMAKER_GML_SPEC` remains available as an exact-file override. The first project command requires an installed compatible runtime or that override. After generation, the local declaration remains usable if GameMaker is temporarily unavailable; CI must generate or provision its own runtime-matched copy.

For normal development, open the GameMaker project folder in Visual Studio Code, select **Terminal > New Terminal**, and start the watcher from the project root:

```powershell
.\datafiles\ts2gml\ts2gml.bat watch
```

Keep the terminal visible. Body-only changes compile automatically, and any structural change prints a request to save GameMaker and waits for Enter in this terminal. This is the recommended workflow because prompts and compiler diagnostics are immediately visible beside the TypeScript editor.

Double-clicking `ts2gml.bat`, or invoking it with no command, remains supported and starts the same watcher in a separate terminal window. Stop watch mode with `Ctrl+C` or by closing its terminal.

Initialization creates this layout:

```text
MyGame/
|-- MyGame.yyp
|-- datafiles/
|   `-- ts2gml/
|       |-- cli.cjs
|       |-- ts2gml.bat
|       |-- types/
|       `-- typescript/
|-- typescript/
|   |-- tsconfig.json
|   `-- player.ts
|-- .ts2gml/
|   `-- manifest.json
|-- objects/
`-- scripts/
```

Keep `typescript/` as the source of truth. The compiler owns only paths recorded in `.ts2gml/manifest.json`.

## Write the first script

Create `typescript/math_helpers.ts`:

```ts
function clampHealth(value: number, maximum: number): number {
  return clamp(value, 0, maximum);
}
```

Run `build`. The file becomes a GameMaker Script resource named `math_helpers`, containing the global GML function `clampHealth`.

## Write the first object

Create `typescript/objects/obj_player.ts`:

```ts
class obj_player extends GMObject {
  health = 100;

  onCreate() {
    this.x = room_width * 0.5;
  }

  onStep() {
    this.x += keyboard_check(vk_right) - keyboard_check(vk_left);
  }

  takeDamage(amount: number) {
    this.health = max(0, this.health - amount);
  }
}
```

The object, direct event `.gml` files, and Asset Browser folder are generated. Sprite, mask, visibility, persistence, physics, and similar resource settings remain editable in the IDE. Later method-body edits hot-reload through `watch` without touching the Object `.yy`. When an event or field is added or removed, save GameMaker and press Enter at the watcher prompt before the structural update is applied.

## Recommended team workflow

1. Commit TypeScript sources, generated GameMaker assets, the `.yyp`, and `.ts2gml/manifest.json` together.
2. Do not commit the copied `datafiles/ts2gml` folder if the repository's ignore policy intentionally installs it in another step; otherwise pin and commit the whole tool folder.
3. Run `datafiles\ts2gml\ts2gml.bat check` in CI.
4. Review generated GML changes like other generated code.
5. Test every shipping GameMaker target; the tool's current integration suite cannot substitute for target-specific game testing.

Continue with the [authoring guide](Authoring-Guide.md) and [known issues](Known-Issues.md).

## Upgrade the tool

1. Stop the watcher, close GameMaker, and commit the game.
2. Import the newer `.yymps` and replace the existing packaged files under `datafiles/ts2gml`.
3. Confirm `ts2gml.bat --version` prints the intended version.
4. Run `init`, `check`, and `build`, then review the generated diff.

The package does not include either generated declaration file or the `typescript/` game source, so a normal upgrade does not replace them. Runtime declarations are checked against the locally selected GameMaker runtime on the next project command. Do not delete `.ts2gml/manifest.json` during an upgrade; it carries the ownership history used to protect generated files.
