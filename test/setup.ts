import { chmodSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, extname } from "path";

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const EXECUTABLE_EXTENSIONS = new Set([".sh", ".bash", ".zsh", ".py", ".rb", ".js", ".ts", ".php", ".pl"]);

function chmodRecursive(dir: string): void {
  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      chmodRecursive(fullPath);
    } else if (EXECUTABLE_EXTENSIONS.has(extname(fullPath)) || fullPath.endsWith("no-extension")) {
      chmodSync(fullPath, 0o755);
    }
  }
}

export function setup(): void {
  // Make all script fixtures executable
  chmodRecursive(FIXTURES_DIR);

  // Explicitly remove execute permission from not-executable.sh
  chmodSync(join(FIXTURES_DIR, "edge-cases", "not-executable.sh"), 0o644);

  // Create a binary file that should be ignored by the scanner
  writeFileSync(join(FIXTURES_DIR, "edge-cases", "binary.bin"), Buffer.from([0x00, 0x1f, 0x8b, 0xff]));
}
