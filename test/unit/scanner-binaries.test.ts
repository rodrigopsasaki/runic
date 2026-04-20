import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { scan } from "../../src/core/scanner.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = join(tmpdir(), `runic-bin-scan-${randomBytes(4).toString("hex")}`);
  mkdirSync(tmpRoot, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

/**
 * Helper: writes a fake "binary" — really just a Mach-O / ELF magic byte stub,
 * because real binary content doesn't matter to the scanner. The scanner only
 * cares about (a) no shebang at offset 0 and (b) executable bit set.
 */
function writeBinary(name: string): string {
  const path = join(tmpRoot, name);
  // Bytes that aren't `#!` — scanner reads first 2 bytes only.
  writeFileSync(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x07, 0x00, 0x00, 0x01]));
  chmodSync(path, 0o755);
  return path;
}

function writeShebangScript(name: string, body = "echo hi"): string {
  const path = join(tmpRoot, name);
  writeFileSync(path, `#!/bin/bash\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

describe("scanner: --allow-binaries", () => {
  it("excludes extensionless binaries by default", () => {
    writeBinary("rusty");

    const result = scan({ dirs: [tmpRoot] });

    expect(result.scripts).toHaveLength(0);
  });

  it("includes extensionless binaries when allowBinaries is true", () => {
    writeBinary("rusty");

    const result = scan({ dirs: [tmpRoot], allowBinaries: true });

    expect(result.scripts).toHaveLength(1);
    expect(result.scripts[0]?.segments).toEqual(["rusty"]);
    expect(result.scripts[0]?.kind).toBe("binary");
  });

  it("marks shebang scripts as kind: 'script'", () => {
    writeShebangScript("scripted");

    const result = scan({ dirs: [tmpRoot], allowBinaries: true });

    expect(result.scripts[0]?.kind).toBe("script");
  });

  it("excludes extensionless executables that aren't binaries (no shebang) without flag", () => {
    // A plain text file with no shebang, but executable — still skipped without flag
    const path = join(tmpRoot, "stray");
    writeFileSync(path, "echo this is not a real script\n");
    chmodSync(path, 0o755);

    const result = scan({ dirs: [tmpRoot] });

    expect(result.scripts).toHaveLength(0);
  });

  it("excludes extensionless files without the executable bit even with the flag", () => {
    const path = join(tmpRoot, "not-exec");
    writeFileSync(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]));
    chmodSync(path, 0o644); // explicitly not executable

    const result = scan({ dirs: [tmpRoot], allowBinaries: true });

    expect(result.scripts).toHaveLength(0);
  });

  it("binaries get no description (nothing to extract from a Mach-O)", () => {
    writeBinary("opaque");

    const result = scan({ dirs: [tmpRoot], allowBinaries: true });

    expect(result.scripts[0]?.description).toBeUndefined();
  });

  it("scripts and binaries coexist in the same directory", () => {
    writeShebangScript("lint.sh");
    writeBinary("fastgrep");
    writeShebangScript("seed-extensionless");

    const result = scan({ dirs: [tmpRoot], allowBinaries: true });

    const byName = new Map(result.scripts.map((s) => [s.segments.join(" "), s]));
    expect(byName.get("lint")?.kind).toBe("script");
    expect(byName.get("fastgrep")?.kind).toBe("binary");
    expect(byName.get("seed-extensionless")?.kind).toBe("script");
  });
});
