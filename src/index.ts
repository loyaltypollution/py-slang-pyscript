import { initialise } from "@sourceacademy/conductor";
import PythonEvaluator from "./PythonEvaluator";

const {runnerPlugin, conduit} = initialise(PythonEvaluator);