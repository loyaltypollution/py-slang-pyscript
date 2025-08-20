/**
 * Configuration for Pyodide package management
 * 
 * This file contains the list of packages that are available in the Pyodide distribution
 * and can be loaded efficiently using pyodide.loadPackage()
 */

/**
 * List of packages available in Pyodide v0.26.2 distribution
 * These packages are pre-compiled and optimized for WebAssembly
 * 
 * Source: https://pyodide.org/en/stable/usage/packages-in-pyodide.html
 */
export const PYODIDE_BUILTIN_PACKAGES = new Set([
  // Core scientific computing
  'numpy',
  'pandas',
  'scipy',
  'matplotlib',
  'plotly',
  'bokeh',
  'seaborn',
  
  // Machine learning
  'scikit-learn',
  'tensorflow',
  'keras',
  'pytorch',
  'xgboost',
  
  // Data processing
  'pillow',
  'opencv-python',
  'beautifulsoup4',
  'lxml',
  'requests',
  'urllib3',
  
  // Numerical computing
  'sympy',
  'statsmodels',
  'networkx',
  
  // Package management
  'micropip',
  'pip',
  
  // Development tools
  'pytest',
  'black',
  'mypy',
  
  // Other common packages
  'dateutil',
  'pytz',
  'six',
  'setuptools',
  'wheel',
  'packaging',
  'certifi',
  'charset-normalizer',
  'idna',
  'cycler',
  'kiwisolver',
  'pyparsing',
  'fonttools',
  
  // Jupyter ecosystem
  'ipython',
  'jupyter',
  'notebook',
  
  // Crypto/security
  'cryptography',
  'pycryptodome',
  
  // File formats
  'openpyxl',
  'xlrd',
  'h5py',
  'tables',
  
  // Visualization
  'altair',
  'plotnine',
  'pygments',
  
  // Statistics
  'patsy',
  'lifelines',
  
  // Misc utilities
  'joblib',
  'tqdm',
  'click',
  'jinja2',
  'markupsafe'
]);

/**
 * Essential packages that should always be available
 * These are loaded at initialization for optimal performance
 */
export const ESSENTIAL_PACKAGES = [
  'micropip'  // Required for fallback package installation
];

/**
 * Packages that require special handling or have known issues
 */
export const SPECIAL_HANDLING_PACKAGES = new Map([
  ['cv2', 'opencv-python'],           // cv2 imports as opencv-python
  ['PIL', 'pillow'],                  // PIL imports as pillow
  ['sklearn', 'scikit-learn'],        // sklearn imports as scikit-learn
  ['torch', 'pytorch'],               // torch imports as pytorch
  ['tf', 'tensorflow'],               // tf imports as tensorflow
]);

/**
 * Check if a package is available in Pyodide distribution
 */
export function isPyodideBuiltinPackage(packageName: string): boolean {
  // Check direct match
  if (PYODIDE_BUILTIN_PACKAGES.has(packageName)) {
    return true;
  }
  
  // Check special handling packages
  if (SPECIAL_HANDLING_PACKAGES.has(packageName)) {
    const actualPackage = SPECIAL_HANDLING_PACKAGES.get(packageName)!;
    return PYODIDE_BUILTIN_PACKAGES.has(actualPackage);
  }
  
  return false;
}

/**
 * Get the actual package name for Pyodide loading
 */
export function getPyodidePackageName(packageName: string): string {
  return SPECIAL_HANDLING_PACKAGES.get(packageName) ?? packageName;
}
