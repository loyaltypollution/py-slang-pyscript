/**
 * Package Manager Service for Pyodide
 * 
 * This service handles dynamic loading of Python packages using a hybrid approach:
 * 1. Use pyodide.loadPackage() for built-in Pyodide packages (fast)
 * 2. Use micropip.install() for PyPI packages (comprehensive)
 * 
 * Features:
 * - Intelligent package detection and classification
 * - Caching to avoid redundant downloads
 * - Comprehensive error handling and logging
 * - Performance monitoring
 */

import { 
  isPyodideBuiltinPackage, 
  getPyodidePackageName, 
  ESSENTIAL_PACKAGES 
} from '../config/pyodide-packages';
import { 
  PackageLoadResult, 
  PackageCache, 
  PackageManagerConfig,
  ImportStatement 
} from '../types/package';
import { extractImports, extractPackageNames } from '../utils/import-parser';

export class PackageManager {
  private pyodide: any;
  private cache: PackageCache;
  private config: PackageManagerConfig;
  private micropipReady: boolean = false;

  constructor(pyodide: any, config: Partial<PackageManagerConfig> = {}) {
    this.pyodide = pyodide;
    this.cache = {
      loaded: new Set(),
      failed: new Map(),
      loadTimestamps: new Map()
    };
    this.config = {
      enableCaching: true,
      loadTimeout: 30000, // 30 seconds
      preloadEssentials: true,
      verbose: false,
      ...config
    };
  }

  /**
   * Initialize the package manager with essential packages
   */
  async initialize(): Promise<void> {
    if (this.config.verbose) {
      console.log('[PackageManager] Initializing...');
    }

    if (this.config.preloadEssentials) {
      await this.loadEssentialPackages();
    }
  }

  /**
   * Load essential packages that are always needed
   */
  private async loadEssentialPackages(): Promise<void> {
    const startTime = Date.now();
    
    for (const packageName of ESSENTIAL_PACKAGES) {
      try {
        await this.loadSinglePackage(packageName);
        
        // Set up micropip after loading
        if (packageName === 'micropip') {
          this.micropipReady = true;
          if (this.config.verbose) {
            console.log('[PackageManager] micropip is ready');
          }
        }
      } catch (error) {
        console.warn(`[PackageManager] Failed to load essential package ${packageName}:`, error);
      }
    }
    
    if (this.config.verbose) {
      console.log(`[PackageManager] Essential packages loaded in ${Date.now() - startTime}ms`);
    }
  }

  /**
   * Analyze code and load all required packages
   */
  async loadPackagesFromCode(code: string): Promise<PackageLoadResult[]> {
    const startTime = Date.now();
    
    if (this.config.verbose) {
      console.log('[PackageManager] Analyzing code for imports...');
    }

    // Extract imports from code
    const imports = extractImports(code);
    const packageNames = extractPackageNames(imports);

    if (this.config.verbose) {
      console.log(`[PackageManager] Found ${packageNames.size} packages:`, Array.from(packageNames));
    }

    // Load packages
    const results = await this.loadPackages(Array.from(packageNames));
    
    if (this.config.verbose) {
      const totalTime = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      console.log(`[PackageManager] Loaded ${successful}/${results.length} packages in ${totalTime}ms`);
    }

    return results;
  }

  /**
   * Load multiple packages using optimal strategy for each
   */
  async loadPackages(packageNames: string[]): Promise<PackageLoadResult[]> {
    const results: PackageLoadResult[] = [];
    
    // Process packages in parallel for better performance
    const loadPromises = packageNames.map(async (packageName) => {
      return await this.loadPackageWithStrategy(packageName);
    });

    const loadResults = await Promise.allSettled(loadPromises);
    
    for (let i = 0; i < loadResults.length; i++) {
      const result = loadResults[i];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          packageName: packageNames[i],
          success: false,
          method: 'pyodide',
          error: result.reason?.message || 'Unknown error',
          loadTime: 0
        });
      }
    }

    return results;
  }

  /**
   * Load a single package using the optimal strategy
   */
  private async loadPackageWithStrategy(packageName: string): Promise<PackageLoadResult> {
    const startTime = Date.now();

    // Check cache first
    if (this.config.enableCaching && this.cache.loaded.has(packageName)) {
      return {
        packageName,
        success: true,
        method: 'pyodide', // This doesn't matter for cached packages
        loadTime: 0
      };
    }

    // Check if package previously failed
    if (this.config.enableCaching && this.cache.failed.has(packageName)) {
      return {
        packageName,
        success: false,
        method: 'pyodide',
        error: this.cache.failed.get(packageName),
        loadTime: 0
      };
    }

    try {
      let result: PackageLoadResult;

      if (isPyodideBuiltinPackage(packageName)) {
        // Use Pyodide's built-in package loader
        result = await this.loadWithPyodide(packageName);
      } else {
        // Fall back to micropip for PyPI packages
        result = await this.loadWithMicropip(packageName);
      }

      // Update cache
      if (this.config.enableCaching) {
        if (result.success) {
          this.cache.loaded.add(packageName);
          this.cache.loadTimestamps.set(packageName, Date.now());
        } else {
          this.cache.failed.set(packageName, result.error || 'Unknown error');
        }
      }

      result.loadTime = Date.now() - startTime;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.config.enableCaching) {
        this.cache.failed.set(packageName, errorMessage);
      }

      return {
        packageName,
        success: false,
        method: 'pyodide',
        error: errorMessage,
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * Load package using Pyodide's built-in loader
   */
  private async loadWithPyodide(packageName: string): Promise<PackageLoadResult> {
    const actualPackageName = getPyodidePackageName(packageName);
    
    if (this.config.verbose) {
      console.log(`[PackageManager] Loading ${packageName} (${actualPackageName}) via Pyodide...`);
    }

    try {
      await this.pyodide.loadPackage(actualPackageName);
      
      return {
        packageName,
        success: true,
        method: 'pyodide',
        loadTime: 0 // Will be set by caller
      };
    } catch (error) {
      throw new Error(`Pyodide failed to load ${actualPackageName}: ${error}`);
    }
  }

  /**
   * Load package using micropip from PyPI
   */
  private async loadWithMicropip(packageName: string): Promise<PackageLoadResult> {
    if (!this.micropipReady) {
      throw new Error('micropip is not ready. Ensure essential packages are loaded first.');
    }

    if (this.config.verbose) {
      console.log(`[PackageManager] Loading ${packageName} via micropip...`);
    }

    try {
      // Use micropip to install the package
      await this.pyodide.runPythonAsync(`
        import micropip
        await micropip.install("${packageName}")
      `);

      return {
        packageName,
        success: true,
        method: 'micropip',
        loadTime: 0 // Will be set by caller
      };
    } catch (error) {
      throw new Error(`micropip failed to install ${packageName}: ${error}`);
    }
  }

  /**
   * Load a single package directly (for manual package loading)
   */
  async loadSinglePackage(packageName: string): Promise<PackageLoadResult> {
    return await this.loadPackageWithStrategy(packageName);
  }

  /**
   * Get package loading statistics
   */
  getStats(): { loaded: number; failed: number; loadTimes: Record<string, number> } {
    const loadTimes: Record<string, number> = {};
    for (const [pkg, timestamp] of this.cache.loadTimestamps) {
      loadTimes[pkg] = timestamp;
    }

    return {
      loaded: this.cache.loaded.size,
      failed: this.cache.failed.size,
      loadTimes
    };
  }

  /**
   * Clear the package cache
   */
  clearCache(): void {
    this.cache.loaded.clear();
    this.cache.failed.clear();
    this.cache.loadTimestamps.clear();
  }

  /**
   * Check if a package is already loaded
   */
  isPackageLoaded(packageName: string): boolean {
    return this.cache.loaded.has(packageName);
  }

  /**
   * Get list of failed packages with their error messages
   */
  getFailedPackages(): Map<string, string> {
    return new Map(this.cache.failed);
  }
}
