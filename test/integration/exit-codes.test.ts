import { describe, it, expect } from "vitest";
import { join } from "path";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("exit code propagation", () => {
  it("should return 0 for successful commands", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { exitCode } = runZsh(fn, "t hello");

    expect(exitCode).toBe(0);
  });

  it("should propagate non-zero exit codes", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { exitCode, stderr } = runZsh(fn, "t exit-nonzero");

    expect(exitCode).toBe(42);
    expect(stderr).toContain("failing");
  });

  it("should return 127 for unknown commands", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { exitCode } = runZsh(fn, "t doesnotexist");

    expect(exitCode).toBe(127);
  });
});
