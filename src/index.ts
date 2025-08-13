import { initialise } from "./conductor/runner/util";
import { BasicEvaluator } from "./conductor/runner";
import type { IRunnerPlugin } from "./conductor/runner/types";

class EchoEvaluator extends BasicEvaluator {
  private count = 0;
  constructor(conductor: IRunnerPlugin) {
    super(conductor);
  }
  async evaluateChunk(chunk: string): Promise<void> {
    this.count++;
    this.conductor.sendOutput(`[echo ${this.count}] ${chunk}`);
  }
}

// Signal that the worker loaded
console.log("[echo-slang] worker booted");

const { runnerPlugin, conduit } = initialise(EchoEvaluator);


