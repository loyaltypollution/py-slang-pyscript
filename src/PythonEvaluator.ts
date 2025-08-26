import { BasicEvaluator, IRunnerPlugin } from "@sourceacademy/conductor";
import { PyodideAPI, version, loadPyodide } from "pyodide";

export default class PythonEvaluator extends BasicEvaluator {
    private pyodide: PyodideAPI | null = null;

    constructor(conductor: IRunnerPlugin) {
      super(conductor);
    }

    async evaluateChunk(chunk: string): Promise<void> {
        console.log("[PythonEvaluator] Evaluating chunk:", chunk.substring(0, 100) + (chunk.length > 100 ? "..." : ""));
        
        try {
            // Initialize Pyodide if not already done
            if (!this.pyodide) {
                this.pyodide = await loadPyodide({
                    // Alternative CDN options:
                    // indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/",
                    // indexURL: "https://unpkg.com/pyodide@0.28.2/",
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/",
                    fullStdLib: true,
                    stdout: (msg) => console.log(`Pyodide: ${msg}`),
                    stderr: (msg) => console.error(`Pyodide Error: ${msg}`),
                });
                console.log("Loaded Pyodide successfully");
            }

            // Execute the Python code
            const result = await this.pyodide.runPythonAsync(chunk);
            this.conductor.sendOutput(`[Python Result] ${result}`);
        } catch (error) {
            console.error("Pyodide error:", error);
            this.conductor.sendOutput(`[Python Error] ${error}`);
        }
    }
}