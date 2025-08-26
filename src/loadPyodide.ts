import { version, loadPyodide } from "pyodide";
import { IN_NODE } from "./environment";

async function ensureLocalPyodideAssets(baseUrl: string): Promise<string> {
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const os = await import("node:os");

    const dir = path.join(os.tmpdir(), `pyodide-${version}`);
    await fs.mkdir(dir, { recursive: true });

    const assets = [
      { name: "pyodide.asm.js", mode: "text" as const },
      { name: "pyodide.asm.wasm", mode: "binary" as const },
      { name: "python_stdlib.zip", mode: "binary" as const },
      { name: "pyodide-lock.json", mode: "text" as const },
    ];

    for (const asset of assets) {
      const url = baseUrl + asset.name;
      const dest = path.join(dir, asset.name);
      try {
        await fs.access(dest);
        continue;
      } catch {}
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      const data = asset.mode === "text" ? Buffer.from(await res.text(), "utf8") : Buffer.from(await res.arrayBuffer());
      await fs.writeFile(dest, data);
    }

    return dir + path.sep;
  }

export function loadPyodideGeneric() {
    const cdnBase = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
    
    return (async () => {
        const indexURL = IN_NODE ? await ensureLocalPyodideAssets(cdnBase) : cdnBase;
        const pyodide = await loadPyodide({
            indexURL,
            fullStdLib: true,
            stdout: (msg: string) => console.log(`Pyodide: ${msg}`),
        });
        return pyodide;
    })();
}