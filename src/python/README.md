# Python Module

This module provides dynamic Python package loading for the Pyodide-based Python evaluator.

## Features

- **Hybrid Package Loading**: Combines Pyodide's built-in packages with micropip for PyPI packages
- **Import Detection**: Automatically analyzes code to detect required packages
- **Intelligent Caching**: Avoids redundant package downloads
- **Comprehensive Error Handling**: Graceful fallback and detailed error reporting
- **Performance Monitoring**: Tracks loading times and success rates

## Architecture

### Folder Structure

```
src/python/
├── config/
│   └── pyodide-packages.ts     # Configuration for built-in packages
├── services/
│   └── package-manager.ts      # Core package management logic
├── types/
│   └── package.ts              # TypeScript type definitions
├── utils/
│   └── import-parser.ts        # Import statement parsing utilities
├── python-evaluator.ts         # Main evaluator class
├── index.ts                    # Module exports
└── README.md                   # This file
```

### Key Components

1. **PythonEvaluator**: Main evaluator that orchestrates package loading and code execution
2. **PackageManager**: Service responsible for intelligent package loading strategy
3. **Import Parser**: Utilities for extracting import statements from Python code
4. **Configuration**: Hardcoded lists of Pyodide built-in packages and special handling rules

## Usage

### Basic Usage

```typescript
import { PythonEvaluator } from './python';

// The evaluator automatically handles package loading
const evaluator = new PythonEvaluator(conductor);
await evaluator.evaluateChunk(`
import pandas as pd
import numpy as np
import some_pip_package

df = pd.DataFrame({'a': [1, 2, 3]})
print(df)
`);
```

### Manual Package Loading

```typescript
const evaluator = new PythonEvaluator(conductor);

// Load a specific package manually
const success = await evaluator.loadPackage('pandas');
if (success) {
    console.log('Package loaded successfully');
}
```

### Package Statistics

```typescript
const stats = evaluator.getPackageStats();
console.log(`Loaded: ${stats.loaded}, Failed: ${stats.failed}`);
```

## Package Loading Strategy

### 1. Built-in Packages (Fast Path)
- Uses `pyodide.loadPackage()` for packages in the Pyodide distribution
- ~100 pre-compiled packages including pandas, numpy, matplotlib, etc.
- Optimized for WebAssembly with fast loading times

### 2. PyPI Packages (Fallback)
- Uses `micropip.install()` for packages not in Pyodide
- Downloads and installs from PyPI
- Supports pure Python packages

### 3. Special Handling
- Handles import aliases (e.g., `cv2` → `opencv-python`)
- Maps common import names to their package names
- Configurable in `config/pyodide-packages.ts`

## Configuration

### Built-in Packages List

The list of Pyodide built-in packages is maintained in `config/pyodide-packages.ts`. This includes:

- Core scientific computing: numpy, pandas, scipy, matplotlib
- Machine learning: scikit-learn, tensorflow, pytorch
- Data processing: requests, beautifulsoup4, pillow
- Development tools: pytest, black, mypy

### Package Manager Options

```typescript
const config: PackageManagerConfig = {
    enableCaching: true,      // Cache loaded packages
    loadTimeout: 30000,       // 30 second timeout
    preloadEssentials: true,  // Load micropip at startup
    verbose: true            // Enable detailed logging
};
```

## Error Handling

The system provides graceful error handling:

1. **Package Loading Failures**: Continue execution with warnings
2. **Import Detection Errors**: Fall back to basic execution
3. **Network Issues**: Retry with exponential backoff (future enhancement)
4. **Invalid Code**: Clear error messages to the user

## Performance Considerations

- **Startup Time**: Only essential packages (micropip) loaded at initialization
- **Lazy Loading**: Packages loaded only when needed
- **Caching**: Successful loads cached to avoid redundant operations
- **Parallel Loading**: Multiple packages loaded simultaneously when possible

## Future Enhancements

1. **Advanced Import Analysis**: Use Python AST parsing for more accurate detection
2. **Package Version Management**: Support for specific package versions
3. **Offline Support**: Cache popular packages for offline use
4. **Custom Package Repositories**: Support for private PyPI repositories
5. **Progressive Enhancement**: Load packages in background based on usage patterns

## Debugging

Enable verbose logging to see detailed package loading information:

```typescript
// In PackageManager config
verbose: true
```

This will log:
- Import detection results
- Package loading strategy decisions
- Loading times and success/failure rates
- Cache hit/miss statistics
