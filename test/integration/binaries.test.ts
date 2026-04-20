import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, chmodSync, copyFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { execFileSync } from "child_process";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

/**
 * We need a real native binary to exercise the binary-dispatch path.
 *
 * Copying /bin/echo or similar doesn't work on macOS: System Integrity Protection
 * pins certain binaries to their original filesystem location via code-signing
 * metadata, and the copy refuses to exec (silently hangs) from a non-canonical
 * path. Compiling a minimal C program at test setup time gives us a binary that
 * is our own and therefore not SIP-restricted.
 */
const TEST_BINARY_SRC = `
#include <stdio.h>
int main(int argc, char **argv) {
  for (int i = 1; i < argc; i++) {
    if (i > 1) printf(" ");
    printf("%s", argv[i]);
  }
  printf("\\n");
  return 0;
}
`;

let testBinarySrc: string;

beforeAll(() => {
  // Build one copy of the binary for the whole file; each test copies it.
  const buildDir = join(tmpdir(), `runic-bin-build-${randomBytes(4).toString("hex")}`);
  mkdirSync(buildDir, { recursive: true });
  const srcPath = join(buildDir, "echoish.c");
  writeFileSync(srcPath, TEST_BINARY_SRC);
  testBinarySrc = join(buildDir, "echoish");
  execFileSync("cc", [srcPath, "-o", testBinarySrc]);
  if (!existsSync(testBinarySrc)) {
    throw new Error("Failed to build test binary");
  }
});

let scriptDir: string;

beforeEach(() => {
  scriptDir = join(tmpdir(), `runic-bin-int-${randomBytes(4).toString("hex")}`);
  mkdirSync(scriptDir, { recursive: true });
});

afterEach(() => {
  rmSync(scriptDir, { recursive: true, force: true });
});

function installTestBinary(name: string): string {
  const dest = join(scriptDir, name);
  copyFileSync(testBinarySrc, dest);
  chmodSync(dest, 0o755);
  return dest;
}

function writeShebangScript(name: string, body: string): void {
  const path = join(scriptDir, name);
  writeFileSync(path, `#!/bin/bash\n${body}\n`);
  chmodSync(path, 0o755);
}

describe("binary dispatch via --allow-binaries", () => {
  it("dispatches a native binary when init was called with --allow-binaries", () => {
    installTestBinary("greet");

    const fn = generateZshFunction({ name: "t", dirs: [scriptDir], allowBinaries: true });
    const { stdout, exitCode } = runZsh(fn, "t greet hello world");

    expect(exitCode).toBe(0);
    expect(stdout).toBe("hello world");
  });

  it("does NOT dispatch a binary without --allow-binaries (returns 127)", () => {
    installTestBinary("greet");

    const fn = generateZshFunction({ name: "t", dirs: [scriptDir], allowBinaries: false });
    const { stderr, exitCode } = runZsh(fn, "t greet hello world");

    expect(exitCode).toBe(127);
    expect(stderr).toContain("command not found");
  });

  it("respects a per-call env var override (set __runic_allow_binaries=1 at call site)", () => {
    installTestBinary("greet");

    const fn = generateZshFunction({ name: "t", dirs: [scriptDir], allowBinaries: false });
    const { stdout, exitCode } = runZsh(fn, "__runic_allow_binaries=1 t greet overridden");

    expect(exitCode).toBe(0);
    expect(stdout).toBe("overridden");
  });

  it("dispatches a .sh script alongside a binary in the same dir", () => {
    installTestBinary("bin-greet");
    writeShebangScript("script-greet.sh", 'echo "script says $*"');

    const fn = generateZshFunction({ name: "t", dirs: [scriptDir], allowBinaries: true });

    const bin = runZsh(fn, "t bin-greet from-binary");
    expect(bin.stdout).toBe("from-binary");

    const scr = runZsh(fn, "t script-greet ok");
    expect(scr.stdout).toBe("script says ok");
  });

  it("non-executable extensionless files stay unreachable even with --allow-binaries", () => {
    const path = join(scriptDir, "not-exec");
    writeFileSync(path, Buffer.from([0xcf, 0xfa, 0xed, 0xfe]));
    chmodSync(path, 0o644);

    const fn = generateZshFunction({ name: "t", dirs: [scriptDir], allowBinaries: true });
    const { stderr, exitCode } = runZsh(fn, "t not-exec");

    expect(exitCode).toBe(127);
    expect(stderr).toContain("command not found");
  });

  it("generated zsh function embeds the init-time default", () => {
    const withFlag = generateZshFunction({ name: "t", dirs: ["/tmp"], allowBinaries: true });
    const withoutFlag = generateZshFunction({ name: "t", dirs: ["/tmp"], allowBinaries: false });

    expect(withFlag).toContain("__runic_allow_binaries:-1");
    expect(withoutFlag).toContain("__runic_allow_binaries:-0");
  });
});
