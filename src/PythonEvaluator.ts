import { BasicEvaluator, IRunnerPlugin } from "@sourceacademy/conductor";
import { PyodideAPI, version, loadPyodide } from "pyodide";

export default class PythonEvaluator extends BasicEvaluator {
    constructor(conductor: IRunnerPlugin) {
      super(conductor);
    }

    async evaluateChunk(chunk: string): Promise<void> {
        console.log("[PythonEvaluator] Evaluating chunk:", chunk.substring(0, 100) + (chunk.length > 100 ? "..." : ""));
        const pyodide = await loadPyodide({
          fullStdLib: true,
          stdout: (msg) => console.log(`Pyodide: ${msg}`),
        });
        console.log("Loaded Pyodide");

        this.conductor.sendOutput(`[pyodide echo back] ${chunk}`);
    }
}