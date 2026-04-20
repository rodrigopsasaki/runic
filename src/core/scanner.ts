import { readdirSync, readFileSync, statSync, existsSync, openSync, readSync, closeSync } from "fs";
import { join, extname, basename } from "path";
import type { Script, ScanResult, Conflict } from "../types.js";
import { KNOWN_EXTENSIONS } from "./runner.js";

interface ScanOptions {
  readonly dirs: readonly string[];
  readonly ignoreDotfiles?: boolean;
  /**
   * When true, extensionless executable files without shebangs are included as
   * binary commands. Default false — binaries are opt-in because they're
   * opaque (no source to inspect before they run).
   */
  readonly allowBinaries?: boolean;
}

/**
 * Scan one or more directories for scripts and return a deduplicated list.
 * First directory in the list has highest priority (wins on conflict).
 */
export function scan(options: ScanOptions): ScanResult {
  const { dirs, ignoreDotfiles = true, allowBinaries = false } = options;
  const scriptMap = new Map<string, Script>();
  const conflictMap = new Map<string, string[]>();

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;

    const scripts = discoverScripts(dir, [], ignoreDotfiles, allowBinaries);

    for (const script of scripts) {
      const key = script.segments.join(" ");
      const existing = scriptMap.get(key);

      if (existing) {
        const paths = conflictMap.get(key) ?? [existing.path];
        paths.push(script.path);
        conflictMap.set(key, paths);
      } else {
        scriptMap.set(key, script);
      }
    }
  }

  const conflicts: Conflict[] = [];
  for (const [key, paths] of conflictMap) {
    const segments = key.split(" ");
    conflicts.push({ segments, paths });
  }

  return {
    scripts: Array.from(scriptMap.values()),
    conflicts,
  };
}

/**
 * Extract the description from a script file.
 * Reads the first comment line after the shebang (or the first comment if no shebang).
 */
export function extractDescription(filePath: string): string | undefined {
  try {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    let startIndex = 0;
    if (lines[0]?.startsWith("#!")) {
      startIndex = 1;
    }

    for (let i = startIndex; i < Math.min(lines.length, 10); i++) {
      const line = lines[i]?.trim();
      if (line === undefined || line === "") continue;

      // Shell/Python/Ruby style: # comment
      if (line.startsWith("# ")) {
        return line.slice(2).trim();
      }
      if (line.startsWith("#") && line.length > 1 && line[1] !== "!") {
        return line.slice(1).trim();
      }

      // JS/TS style: // comment
      if (line.startsWith("// ")) {
        return line.slice(3).trim();
      }
      if (line.startsWith("//") && line.length > 2) {
        return line.slice(2).trim();
      }

      // If first non-empty line after shebang isn't a comment, no description
      break;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function discoverScripts(
  dir: string,
  parentSegments: readonly string[],
  ignoreDotfiles: boolean,
  allowBinaries: boolean,
): Script[] {
  const scripts: Script[] = [];

  let items: string[];
  try {
    items = readdirSync(dir);
  } catch {
    return scripts;
  }

  for (const item of items) {
    if (ignoreDotfiles && item.startsWith(".")) continue;

    const fullPath = join(dir, item);

    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const childScripts = discoverScripts(fullPath, [...parentSegments, item], ignoreDotfiles, allowBinaries);
      scripts.push(...childScripts);
      continue;
    }

    if (!stat.isFile()) continue;

    const ext = extname(item).slice(1); // remove the dot
    const hasKnownExt = KNOWN_EXTENSIONS.includes(ext);
    const hasNoExt = ext === "";

    // Skip files with unknown extensions (like .bin, .yaml, .json, .md)
    if (!hasKnownExt && !hasNoExt) continue;

    let kind: "script" | "binary" = "script";

    // Extensionless files need either a shebang (interpreted) or, with binaries
    // opted in, the executable bit (native binary).
    if (hasNoExt) {
      if (hasShebang(fullPath)) {
        kind = "script";
      } else if (allowBinaries && (stat.mode & 0o111) !== 0) {
        kind = "binary";
      } else {
        continue;
      }
    }

    const commandName = hasKnownExt ? basename(item, `.${ext}`) : item;
    const segments = [...parentSegments, commandName];

    scripts.push({
      segments,
      path: fullPath,
      ext: hasKnownExt ? ext : "",
      description: kind === "binary" ? undefined : extractDescription(fullPath),
      kind,
    });
  }

  return scripts;
}

function hasShebang(filePath: string): boolean {
  let fd: number | undefined;
  try {
    fd = openSync(filePath, "r");
    const buffer = Buffer.alloc(2);
    readSync(fd, buffer, 0, 2, 0);
    return buffer.toString("utf8") === "#!";
  } catch {
    return false;
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
