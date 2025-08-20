/**
 * Utilities for parsing Python import statements from code chunks
 */

import { ImportStatement } from '../types/package';

/**
 * Extracts import statements from Python code using regex parsing
 * 
 * This function identifies both 'import' and 'from...import' statements
 * and extracts the relevant package information.
 * 
 * @param code The Python code to parse
 * @returns Array of ImportStatement objects
 */
export function extractImports(code: string): ImportStatement[] {
  const imports: ImportStatement[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (line.startsWith('#') || line.length === 0) {
      continue;
    }
    
    // Handle regular import statements: import module [as alias]
    const importMatch = line.match(/^import\s+([a-zA-Z0-9_][a-zA-Z0-9_.]*)(?:\s+as\s+([a-zA-Z0-9_]+))?/);
    if (importMatch) {
      imports.push({
        module: importMatch[1],
        alias: importMatch[2],
        isFromImport: false,
        line: i + 1
      });
      continue;
    }
    
    // Handle from imports: from module import item1, item2 [as alias]
    const fromImportMatch = line.match(/^from\s+([a-zA-Z0-9_][a-zA-Z0-9_.]*)\s+import\s+(.+)/);
    if (fromImportMatch) {
      const module = fromImportMatch[1];
      const importPart = fromImportMatch[2];
      
      // Parse the imported items (handle commas, aliases, etc.)
      const items = parseImportItems(importPart);
      
      imports.push({
        module,
        items: items.map(item => item.name),
        isFromImport: true,
        line: i + 1
      });
      continue;
    }
  }
  
  return imports;
}

/**
 * Parses the items part of a 'from...import' statement
 * Handles cases like: item1, item2 as alias, item3, *
 */
function parseImportItems(importPart: string): Array<{ name: string; alias?: string }> {
  const items: Array<{ name: string; alias?: string }> = [];
  
  // Split by comma and process each item
  const parts = importPart.split(',').map(part => part.trim());
  
  for (const part of parts) {
    // Handle 'item as alias'
    const aliasMatch = part.match(/^([a-zA-Z0-9_]+)\s+as\s+([a-zA-Z0-9_]+)$/);
    if (aliasMatch) {
      items.push({
        name: aliasMatch[1],
        alias: aliasMatch[2]
      });
      continue;
    }
    
    // Handle simple item name
    const simpleMatch = part.match(/^([a-zA-Z0-9_*]+)$/);
    if (simpleMatch) {
      items.push({
        name: simpleMatch[1]
      });
    }
  }
  
  return items;
}

/**
 * Extracts unique package names from a list of import statements
 * 
 * For submodule imports like 'numpy.random', this returns the top-level package 'numpy'
 * 
 * @param imports Array of ImportStatement objects
 * @returns Set of unique package names
 */
export function extractPackageNames(imports: ImportStatement[]): Set<string> {
  const packages = new Set<string>();
  
  for (const imp of imports) {
    // Extract the top-level package name
    const topLevelPackage = imp.module.split('.')[0];
    
    // Skip built-in Python modules
    if (!isBuiltinPythonModule(topLevelPackage)) {
      packages.add(topLevelPackage);
    }
  }
  
  return packages;
}

/**
 * Checks if a module is a built-in Python module that doesn't need installation
 */
function isBuiltinPythonModule(moduleName: string): boolean {
  const builtinModules = new Set([
    'os', 'sys', 'json', 'math', 'random', 'datetime', 'time', 'collections',
    'itertools', 'functools', 'operator', 'pathlib', 'glob', 'shutil', 'tempfile',
    'urllib', 'http', 'html', 'xml', 'csv', 'configparser', 'logging', 'unittest',
    'io', 're', 'string', 'textwrap', 'unicodedata', 'calendar', 'hashlib',
    'hmac', 'secrets', 'statistics', 'decimal', 'fractions', 'contextlib',
    'abc', 'numbers', 'types', 'copy', 'pprint', 'reprlib', 'enum', 'graphlib',
    'weakref', 'gc', 'inspect', 'site', 'importlib', 'pkgutil', 'modulefinder',
    'runpy', 'traceback', 'future', 'keyword', 'token', 'tokenize', 'ast',
    'symtable', 'symbol', 'dis', 'pickletools', 'formatter', 'errno', 'ctypes',
    'threading', 'multiprocessing', 'concurrent', 'subprocess', 'sched', 'queue',
    'socketserver', 'ssl', 'asyncio', 'socket', 'signal', 'mmap', 'select',
    'selectors', 'codecs', 'locale', 'gettext', 'argparse', 'optparse', 'getopt',
    'cmd', 'shlex', 'platform', 'warnings', 'dataclasses', 'contextlib',
    'typing', 'pydoc', 'doctest', 'difflib', 'rlcompleter', 'tabnanny', 'trace',
    'timeit', 'cProfile', 'profile', 'pstats', 'cgi', 'cgitb', 'wsgiref',
    'ftplib', 'poplib', 'imaplib', 'nntplib', 'smtplib', 'smtpd', 'telnetlib',
    'uuid', 'zlib', 'gzip', 'bz2', 'lzma', 'zipfile', 'tarfile'
  ]);
  
  return builtinModules.has(moduleName);
}

/**
 * Validates that an import statement is syntactically correct
 */
export function validateImportStatement(statement: ImportStatement): boolean {
  // Check if module name is valid
  if (!statement.module || !/^[a-zA-Z0-9_][a-zA-Z0-9_.]*$/.test(statement.module)) {
    return false;
  }
  
  // Check alias if present
  if (statement.alias && !/^[a-zA-Z0-9_]+$/.test(statement.alias)) {
    return false;
  }
  
  // Check items for 'from' imports
  if (statement.isFromImport && statement.items) {
    for (const item of statement.items) {
      if (!/^[a-zA-Z0-9_*]+$/.test(item)) {
        return false;
      }
    }
  }
  
  return true;
}
