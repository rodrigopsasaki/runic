import { openSync, readSync, closeSync } from "fs";
import type { RuntimeInfo } from "../types.js";

const EXTENSION_MAP: Readonly<Record<string, RuntimeInfo>> = {
  sh: { command: "bash", args: [] },
  bash: { command: "bash", args: [] },
  zsh: { command: "zsh", args: [] },
  py: { command: "python3", args: [] },
  rb: { command: "ruby", args: [] },
  js: { command: "node", args: [] },
  ts: { command: "npx", args: ["tsx"] },
  php: { command: "php", args: [] },
  pl: { command: "perl", args: [] },
};

const DEFAULT_RUNTIME: RuntimeInfo = { command: "bash", args: [] };

/** All file extensions the scanner should recognize as scripts. */
export const KNOWN_EXTENSIONS = Object.keys(EXTENSION_MAP);

/** Extension probe order for the shell function dispatcher. */
export const EXTENSION_PROBE_ORDER = ["sh", "bash", "zsh", "py", "rb", "js", "ts", "php", "pl"] as const;

/**
 * Resolve the runtime for a script based on its file extension.
 * Falls back to shebang parsing for unknown or missing extensions,
 * then defaults to bash.
 */
export function resolveRuntime(ext: string, filePath: string): RuntimeInfo {
  const mapped = ext ? EXTENSION_MAP[ext] : undefined;
  if (mapped) return mapped;

  return parseShebang(filePath) ?? DEFAULT_RUNTIME;
}

/**
 * Parse the shebang line of a file and return the runtime info.
 * Handles both `#!/usr/bin/env python3` and `#!/usr/bin/python3` forms.
 */
export function parseShebang(filePath: string): RuntimeInfo | undefined {
  let fd: number | undefined;
  try {
    fd = openSync(filePath, "r");
    const buffer = Buffer.alloc(256);
    readSync(fd, buffer, 0, 256, 0);

    const firstLine = buffer.toString("utf8").split("\n")[0]?.trim();
    if (!firstLine?.startsWith("#!")) return undefined;

    const shebang = firstLine.slice(2).trim();
    const parts = shebang.split(/\s+/);

    // #!/usr/bin/env [-S|-i|-vS] python3 -u → skip env flags, command: "python3"
    if (parts[0] === "/usr/bin/env") {
      let i = 1;
      while (parts[i]?.startsWith("-")) i++;
      const command = parts[i];
      if (command) {
        return { command, args: parts.slice(i + 1) };
      }
    }

    // #!/usr/bin/python3 → command: "python3", args: []
    if (parts[0]) {
      const command = parts[0].split("/").pop();
      if (command) {
        return { command, args: parts.slice(1) };
      }
    }

    return undefined;
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* fd may already be closed */
      }
    }
  }
}
