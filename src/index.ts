import { initialise } from "./conductor/runner/util";
import { PythonEvaluator } from "./python";

// Signal that the worker loaded
console.log("[py-pyscript] worker booted");

const { runnerPlugin, conduit } = initialise(PythonEvaluator);
