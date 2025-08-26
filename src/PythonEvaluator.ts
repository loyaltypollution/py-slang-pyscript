import { BasicEvaluator, IRunnerPlugin } from "@sourceacademy/conductor";
import { PyodideAPI } from "pyodide";
import { loadPyodideGeneric } from "./loadPyodide";

export default class PythonEvaluator extends BasicEvaluator {
  pyodide: Promise<PyodideAPI>;

    constructor(conductor: IRunnerPlugin) {
      super(conductor);
      this.pyodide = loadPyodideGeneric();
    }

    async evaluateChunk(chunk: string): Promise<void> {
      const pyodide = await this.pyodide;
      const output = await pyodide.runPythonAsync(chunk);
      this.conductor.sendOutput(`[pyodide echo back] ${output}`);
    }
}