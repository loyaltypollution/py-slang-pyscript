/**
 * Type definitions for Python package management
 */

export interface ImportStatement {
  /** The module being imported (e.g., 'pandas', 'numpy.random') */
  module: string;
  /** The specific items being imported (for 'from' imports) */
  items?: string[];
  /** The alias used (e.g., 'pd' in 'import pandas as pd') */
  alias?: string;
  /** Whether this is a 'from' import */
  isFromImport: boolean;
  /** Line number where the import appears */
  line: number;
}

export interface PackageLoadResult {
  /** The package name that was loaded */
  packageName: string;
  /** Whether the package was loaded successfully */
  success: boolean;
  /** Method used to load the package */
  method: 'pyodide' | 'micropip';
  /** Error message if loading failed */
  error?: string;
  /** Time taken to load the package in milliseconds */
  loadTime: number;
}

export interface PackageCache {
  /** Set of packages that have been successfully loaded */
  loaded: Set<string>;
  /** Map of failed packages to their error messages */
  failed: Map<string, string>;
  /** Timestamp of when each package was loaded */
  loadTimestamps: Map<string, number>;
}

export interface PackageManagerConfig {
  /** Whether to enable caching of loaded packages */
  enableCaching: boolean;
  /** Maximum time to wait for package loading (ms) */
  loadTimeout: number;
  /** Whether to load essential packages at initialization */
  preloadEssentials: boolean;
  /** Whether to show detailed logging */
  verbose: boolean;
}
