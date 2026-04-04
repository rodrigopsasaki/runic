import { describe, it, expect } from "vitest";
import { join } from "path";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("RC environment variables", () => {
  it("should set RC_COMMAND to the matched command path", () => {
    const dir = join(FIXTURES, "edge-cases");
    const fn = generateZshFunction({ name: "t", dirs: [dir] });

    const { stdout } = runZsh(fn, "t env-echo");

    expect(stdout).toContain("RC_COMMAND=env-echo");
  });

  it("should set RC_CLI_NAME to the function name", () => {
    const dir = join(FIXTURES, "edge-cases");
    const fn = generateZshFunction({ name: "myapp", dirs: [dir] });

    const { stdout } = runZsh(fn, "myapp env-echo");

    expect(stdout).toContain("RC_CLI_NAME=myapp");
  });

  it("should set RC_SCRIPT_PATH to the absolute script path", () => {
    const dir = join(FIXTURES, "edge-cases");
    const fn = generateZshFunction({ name: "t", dirs: [dir] });

    const { stdout } = runZsh(fn, "t env-echo");

    expect(stdout).toContain(`RC_SCRIPT_PATH=${join(dir, "env-echo.sh")}`);
  });

  it("should set RC_DIR to the matching directory", () => {
    const dir = join(FIXTURES, "edge-cases");
    const fn = generateZshFunction({ name: "t", dirs: [dir] });

    const { stdout } = runZsh(fn, "t env-echo");

    expect(stdout).toContain(`RC_DIR=${dir}`);
  });

  it("should set RC_DIRS to all directories colon-separated", () => {
    const dir1 = join(FIXTURES, "edge-cases");
    const dir2 = join(FIXTURES, "flat");
    const fn = generateZshFunction({ name: "t", dirs: [dir1, dir2] });

    const { stdout } = runZsh(fn, "t env-echo");

    expect(stdout).toContain(`RC_DIRS=${dir1}:${dir2}`);
  });

  it("should set RC_COMMAND for nested commands", () => {
    const dir = join(FIXTURES, "nested");
    const fn = generateZshFunction({ name: "t", dirs: [dir] });

    const { stdout } = runZsh(fn, "t db backup");

    expect(stdout).toContain("backup:db backup:");
  });
});
