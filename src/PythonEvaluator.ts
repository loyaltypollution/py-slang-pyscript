import { BasicEvaluator, IRunnerPlugin } from "@sourceacademy/conductor";
import { PyodideAPI } from "pyodide";
import { loadPyodideGeneric } from "./loadPyodide";

export default class PythonEvaluator extends BasicEvaluator {
  pyodide: Promise<PyodideAPI>;

    constructor(conductor: IRunnerPlugin) {
      super(conductor);
      this.pyodide = loadPyodideGeneric().then(async pyodide => {
        await pyodide.loadPackage("micropip");
        await pyodide.setStdout({
          batched: (output: string) => {
            this.conductor.sendOutput(output);
          }
        });
        return pyodide;
      });
    }

    async evaluateChunk(chunk: string): Promise<void> {
      const pyodide = await this.pyodide;
      
      // import packages via micropip installation
      const importedPackageRoots = new Set<string>();
      const lines = chunk.split(/\r?\n/);

      for (let rawLine of lines) {
        const commentIndex = rawLine.indexOf("#");
        const line = commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine;

        const importLike = line.match(/^\s*(?:import\s+(.+)|from\s+([\w\.]+)\s+import\s+(.+))$/);
        if (importLike) {
          if (importLike[1]) {
            const modulesPart = importLike[1];
            for (const part of modulesPart.split(",")) {
              const token = part.trim();
              if (!token) continue;
              const noAlias = token.replace(/\s+as\s+\w+$/i, "");
              const root = noAlias.split(".")[0].trim();
              if (root && !root.startsWith(".")) {
                importedPackageRoots.add(root);
              }
            }
          } else {
            const pkg = importLike[2].trim();
            if (!pkg.startsWith(".")) {
              const root = pkg.split(".")[0];
              if (root) importedPackageRoots.add(root);
            }
          }
          continue;
        }
      }

      if (importedPackageRoots.size > 0) {
        const modulesArray = Array.from(importedPackageRoots);
        const installerCode = `\nimport importlib, micropip\nmods = ${JSON.stringify(modulesArray)}\nmissing = []\nfor m in mods:\n    try:\n        importlib.import_module(m)\n    except Exception:\n        missing.append(m)\nif missing:\n    await micropip.install(missing)\n`;
        await pyodide.runPythonAsync(installerCode);
      }

      const output = await pyodide.runPythonAsync(chunk);
      this.conductor.sendOutput(output);
    }
}