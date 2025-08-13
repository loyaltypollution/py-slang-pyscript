import { initialise } from "./conductor/runner/util";
import { BasicEvaluator } from "./conductor/runner";
import type { IRunnerPlugin } from "./conductor/runner/types";

// Declarations for worker globals used at runtime
declare function importScripts(...urls: string[]): void;
declare const loadPyodide: (options: { indexURL: string }) => Promise<any>;

// Load Pyodide inside the worker and initialise once
let pyodideInstance: any | undefined;
let pyodideReady: Promise<void> | undefined;

function ensurePyodideLoaded(): Promise<void> {
  if (!pyodideReady) {
    console.log("[runner] ensurePyodideLoaded entered");
    try {
      // Load pyodide from CDN in the worker scope
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");
    } catch (e) {
      // If importScripts is unavailable for some reason, surface the error later
      console.error("Failed to import pyodide.js", e);
    }
    pyodideReady = (async () => {
      // @ts-ignore loadPyodide is provided by the imported script
      pyodideInstance = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    })();
  }
  return pyodideReady;
}

class PythonEvaluator extends BasicEvaluator {
  constructor(conductor: IRunnerPlugin) {
    super(conductor);
  }

  async evaluateChunk(chunk: string): Promise<void> {
    console.log("[runner] evaluateChunk entered with chunk: ", chunk);

    await ensurePyodideLoaded();

    console.log("[runner] ensurePyodideLoaded exited");
    const pyodide = pyodideInstance;

    // Wire stdout/stderr to conductor output
		pyodide.setStdout({
			batched: (text: string) => {
				if (text) this.conductor.sendOutput(text);
			}
		});
		pyodide.setStderr({
			batched: (text: string) => {
				if (text) this.conductor.sendOutput(text);
			}
		});

    // Provide a synchronous input() backed by tryRequestInput()
    // If no input is available, return empty string to avoid blocking
    const inputSync = (prompt?: unknown) => {
      if (typeof prompt === "string" && prompt.length > 0) {
        this.conductor.sendOutput(prompt);
      }
      const line = this.conductor.tryRequestInput();
      return line ?? "";
    };

    // Expose the JS function to Python and override builtins.input
    pyodide.globals.set("__sa_input_sync__", inputSync);
    pyodide.runPython(
      "import builtins\n" +
      "builtins.input = __sa_input_sync__\n"
    );

    try {
      await pyodide.runPythonAsync(chunk);
    } catch (err: any) {
      const message = (err && err.message) ? err.message : String(err);
      this.conductor.sendOutput(`[python error] ${message}`);
    }
  }
}

// Signal that the worker loaded
console.log("[py-pyscript] worker booted");

const { runnerPlugin, conduit } = initialise(PythonEvaluator);
