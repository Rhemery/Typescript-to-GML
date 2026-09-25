TypeScript to GML beta

This is a beta, project-local TypeScript-to-GML compiler. Node.js 22 or newer and TypeScript 5.9.x are required.

Install TypeScript with npm install --global typescript@5.9, or run npm install --save-dev typescript@5.9 in the game directory. The CLI reads its standard-library declarations from that installation; they are not included in this package. A project installation takes precedence over global tsc on PATH. VS Code's built-in language support alone does not install the command-line tools. For a custom installation, set TS2GML_TYPESCRIPT_LIB to its absolute lib directory. Restart watch mode after changing the installation.

From the GameMaker project directory, run:

  datafiles\ts2gml\ts2gml.bat init
  datafiles\ts2gml\ts2gml.bat check
  datafiles\ts2gml\ts2gml.bat build

Save GameMaker and run build --project-saved once after installation.
The package contains no GameMaker runtime declaration snapshot. The first project command generates the local API declarations from the active compatible GameMaker runtime's GmlSpec.xml, or from the exact path in GAMEMAKER_GML_SPEC.
If Beta, Stable, or LTS installations are equally compatible, run ts2gml.bat runtime and select the installation this project uses.

For normal development, open the game folder in Visual Studio Code, open Terminal > New Terminal, and run:

  .\datafiles\ts2gml\ts2gml.bat watch

Keep the terminal visible so save prompts and diagnostics are noticed immediately. Double-clicking ts2gml.bat is also supported and starts the same watcher. When a structural update is pending, save GameMaker and press Enter in the watcher terminal to apply it.

Keep authored code in the project's typescript directory. Keep the project under version control. Do not edit compiler-owned generated GML directly; move changes into TypeScript. Read the repository's docs/Known-Issues.md before using the beta in a serious project.

Runtime guard levels are configured in ts2gml.config.json beside the .yyp. Generated pre_project_step, pre_run_step, and pre_build_step files apply separate testing and package-build profiles directly to generated GML. Both profiles default to standard guards when no configuration is present.

If GameMaker and TypeScript claim the same Script or Object, the compiler lists both paths and stops. Delete the conflicting asset in GameMaker and save the project if you want ts2gml to manage it, or rename the TypeScript asset and retry.

If the batch file cannot find Node.js, install Node.js 22+ and reopen the terminal.
