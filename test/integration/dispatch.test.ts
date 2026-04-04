import { describe, it, expect } from "vitest";
import { join } from "path";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("zsh dispatch", () => {
  it("should dispatch a flat command", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { stdout, exitCode } = runZsh(fn, "t hello");

    expect(exitCode).toBe(0);
    expect(stdout).toBe("Hello, world!");
  });

  it("should pass arguments to the script", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { stdout } = runZsh(fn, "t hello Alice");

    expect(stdout).toBe("Hello, Alice!");
  });

  it("should dispatch a nested command", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "nested")] });

    const { stdout, exitCode } = runZsh(fn, "t db backup");

    expect(exitCode).toBe(0);
    expect(stdout).toContain("backup:");
  });

  it("should dispatch a deeply nested command", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "nested")] });

    const { stdout, exitCode } = runZsh(fn, "t cloud aws s3 sync myfile");

    expect(exitCode).toBe(0);
    expect(stdout).toBe("s3-sync:myfile");
  });

  it("should dispatch python scripts", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { stdout, exitCode } = runZsh(fn, "t greet Bob");

    expect(exitCode).toBe(0);
    expect(stdout).toBe("Greetings, Bob!");
  });

  it("should dispatch node scripts", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { stdout, exitCode } = runZsh(fn, "t uuid");

    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should prefer longer matches (greedy)", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "ambiguous")] });

    const { stdout: rootOut } = runZsh(fn, "t deploy");
    expect(rootOut).toBe("deploy-root");

    const { stdout: stagingOut } = runZsh(fn, "t deploy staging");
    expect(stagingOut).toBe("deploy-staging");
  });

  it("should return 127 for unknown commands", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "flat")] });

    const { exitCode, stderr } = runZsh(fn, "t nonexistent");

    expect(exitCode).toBe(127);
    expect(stderr).toContain("command not found");
  });

  it("should use first dir on conflict", () => {
    const fn = generateZshFunction({
      name: "t",
      dirs: [join(FIXTURES, "priority", "dir-a"), join(FIXTURES, "priority", "dir-b")],
    });

    const { stdout } = runZsh(fn, "t deploy");

    expect(stdout).toBe("dir-a");
  });
});
