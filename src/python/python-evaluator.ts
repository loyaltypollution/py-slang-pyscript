/**
 * Enhanced Python Evaluator with Dynamic Package Loading
 * 
 * This evaluator implements a hybrid approach for package management:
 * - Analyzes code for import statements before execution
 * - Loads required packages dynamically using optimal strategies
 * - Provides comprehensive error handling and logging
 * - Maintains backward compatibility with existing conductor framework
 */

import { BasicEvaluator, IRunnerPlugin } from "@sourceacademy/conductor";
import { PackageManager } from "./services/package-manager";
import { PackageManagerConfig } from "./types/package";

// Declarations for worker globals used at runtime
declare function importScripts(...urls: string[]): void;
declare const loadPyodide: (options: { indexURL: string }) => Promise<any>;

// Pyodide instance management
let pyodideInstance: any | undefined;
let pyodideReady: Promise<void> | undefined;
let packageManager: PackageManager | undefined;

/**
 * Initialize Pyodide and the package manager
 */
async function ensurePyodideLoaded(): Promise<void> {
  if (!pyodideReady) {
    console.log("[PythonEvaluator] Initializing Pyodide...");
    
    try {
      // Load pyodide from CDN in the worker scope
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");
    } catch (e) {
      console.error("[PythonEvaluator] Failed to import pyodide.js", e);
      throw new Error("Failed to load Pyodide script");
    }

    pyodideReady = (async () => {
      try {
        // Initialize Pyodide
        pyodideInstance = await loadPyodide({ 
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" 
        });
        
        // Initialize package manager with configuration
        const config: Partial<PackageManagerConfig> = {
          enableCaching: true,
          loadTimeout: 30000,
          preloadEssentials: true,
          verbose: true // Enable for development, can be configured later
        };
        
        packageManager = new PackageManager(pyodideInstance, config);
        await packageManager.initialize();
        
        console.log("[PythonEvaluator] Pyodide and PackageManager initialized successfully");
      } catch (error) {
        console.error("[PythonEvaluator] Failed to initialize Pyodide:", error);
        throw error;
      }
    })();
  }
  
  return pyodideReady;
}

export default class PythonEvaluator extends BasicEvaluator {
  constructor(conductor: IRunnerPlugin) {
    super(conductor);
  }

  async evaluateChunk(chunk: string): Promise<void> {
    console.log("[PythonEvaluator] Evaluating chunk:", chunk.substring(0, 100) + (chunk.length > 100 ? "..." : ""));

    try {
      // Ensure Pyodide is ready
      await ensurePyodideLoaded();
      
      if (!pyodideInstance || !packageManager) {
        throw new Error("Pyodide or PackageManager not properly initialized");
      }

      const pyodide = pyodideInstance;

      // Set up I/O handling
      this.setupIOHandling(pyodide);

      // Load required packages before execution
      await this.loadRequiredPackages(chunk);

      // Execute the Python code
      await this.executePythonCode(chunk);

    } catch (err: any) {
      const message = this.formatError(err);
      this.conductor.sendOutput(`[python error] ${message}`);
      console.error("[PythonEvaluator] Execution error:", err);
    }
  }

  /**
   * Set up stdout/stderr handling and input function
   */
  private setupIOHandling(pyodide: any): void {
    // Wire stdout to conductor output
    pyodide.setStdout({
      batched: (text: string) => {
        if (text) this.conductor.sendOutput(text);
      }
    });

    // Provide synchronous input() backed by tryRequestInput()
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
  }

  /**
   * Analyze code and load required packages
   */
  private async loadRequiredPackages(code: string): Promise<void> {
    if (!packageManager) {
      console.warn("[PythonEvaluator] PackageManager not available, skipping package loading");
      return;
    }

    try {
      const loadResults = await packageManager.loadPackagesFromCode(code);
      
      // Report loading results
      const successful = loadResults.filter(r => r.success);
      const failed = loadResults.filter(r => !r.success);
      
      if (successful.length > 0) {
        const successNames = successful.map(r => r.packageName).join(", ");
        console.log(`[PythonEvaluator] Successfully loaded packages: ${successNames}`);
      }
      
      if (failed.length > 0) {
        const failureDetails = failed.map(r => `${r.packageName} (${r.error})`).join(", ");
        console.warn(`[PythonEvaluator] Failed to load packages: ${failureDetails}`);
        
        // Send warning to user about failed packages
        this.conductor.sendOutput(
          `[warning] Some packages failed to load: ${failed.map(r => r.packageName).join(", ")}\n`
        );
      }

      // Log performance stats if any packages were loaded
      if (loadResults.length > 0) {
        const totalTime = loadResults.reduce((sum, r) => sum + r.loadTime, 0);
        console.log(`[PythonEvaluator] Package loading completed in ${totalTime}ms`);
      }

    } catch (error) {
      console.error("[PythonEvaluator] Error during package loading:", error);
      this.conductor.sendOutput(`[warning] Package loading encountered issues: ${error}\n`);
    }
  }

  /**
   * Execute Python code with proper error handling
   */
  private async executePythonCode(code: string): Promise<void> {
    if (!pyodideInstance) {
      throw new Error("Pyodide instance not available");
    }

    try {
      await pyodideInstance.runPythonAsync(code);
    } catch (error) {
      // Re-throw with additional context
      throw new Error(`Python execution failed: ${error}`);
    }
  }

  /**
   * Format error messages for user-friendly display
   */
  private formatError(err: any): string {
    if (!err) {
      return "Unknown error occurred";
    }

    // Extract meaningful error message
    let message = "";
    
    if (typeof err === "string") {
      message = err;
    } else if (err.message) {
      message = err.message;
    } else {
      message = String(err);
    }

    // Clean up common error patterns for better readability
    message = message
      .replace(/^Error: /, "")
      .replace(/^Python execution failed: /, "")
      .replace(/PythonError: /, "");

    return message;
  }

  /**
   * Get package manager statistics (useful for debugging)
   */
  getPackageStats(): any {
    if (!packageManager) {
      return { error: "PackageManager not initialized" };
    }
    return packageManager.getStats();
  }

  /**
   * Manually load a package (useful for testing or special cases)
   */
  async loadPackage(packageName: string): Promise<boolean> {
    if (!packageManager) {
      console.warn("[PythonEvaluator] PackageManager not available");
      return false;
    }

    try {
      const result = await packageManager.loadSinglePackage(packageName);
      return result.success;
    } catch (error) {
      console.error(`[PythonEvaluator] Failed to load package ${packageName}:`, error);
      return false;
    }
  }
}
