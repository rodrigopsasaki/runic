import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync, rmSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

function makeFixtureDir(): string {
  const dir = join(tmpdir(), `runic-shebang-${randomBytes(4).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("shebang dispatch edges", () => {
  /**
   * Regression: #!/usr/bin/env -S python3 -u was misparsed as runner "-S".
   * Now env flags are skipped before reading the actual command.
   */
  it("dispatches scripts with #!/usr/bin/env -S <interpreter>", () => {
    const dir = makeFixtureDir();
    const scriptPath = join(dir, "with-env-s");
    writeFileSync(scriptPath, "#!/usr/bin/env -S python3 -u\nprint('env-S-works')\n");
    chmodSync(scriptPath, 0o755);

    try {
      const fn = generateZshFunction({ name: "t", dirs: [dir] });
      const { stdout, exitCode } = runZsh(fn, "t with-env-s");

      expect(exitCode).toBe(0);
      expect(stdout).toContain("env-S-works");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * Regression: extensionless files without shebangs were silently
   * dispatched as bash by the shell function, even though the Node-side
   * scanner correctly skipped them. Now both behave the same way.
   */
  it("does NOT dispatch extensionless files without a shebang", () => {
    const dir = makeFixtureDir();
    const scriptPath = join(dir, "stray-file");
    // No shebang, no extension — should be invisible to runic
    writeFileSync(scriptPath, "echo 'this should never run'\n");
    chmodSync(scriptPath, 0o755);

    try {
      const fn = generateZshFunction({ name: "t", dirs: [dir] });
      const { stdout, stderr, exitCode } = runZsh(fn, "t stray-file");

      expect(exitCode).toBe(127);
      expect(stderr).toContain("command not found");
      expect(stdout).not.toContain("this should never run");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * Sanity: extensionless file WITH a shebang still dispatches correctly.
   * (We don't want the fix above to break the legitimate case.)
   */
  it("does dispatch extensionless files with a shebang", () => {
    const dir = makeFixtureDir();
    const scriptPath = join(dir, "legit-extensionless");
    writeFileSync(scriptPath, "#!/bin/bash\necho 'extensionless-with-shebang'\n");
    chmodSync(scriptPath, 0o755);

    try {
      const fn = generateZshFunction({ name: "t", dirs: [dir] });
      const { stdout, exitCode } = runZsh(fn, "t legit-extensionless");

      expect(exitCode).toBe(0);
      expect(stdout).toContain("extensionless-with-shebang");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
