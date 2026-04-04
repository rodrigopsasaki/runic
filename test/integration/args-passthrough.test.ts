import { describe, it, expect } from "vitest";
import { join } from "path";
import { generateZshFunction } from "../../src/shell/templates/zsh.js";
import { runZsh } from "./helpers.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("argument passthrough", () => {
  it("should pass single argument", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { stdout } = runZsh(fn, "t args-echo one");

    expect(stdout).toBe("arg:one");
  });

  it("should pass multiple arguments", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { stdout } = runZsh(fn, "t args-echo one two three");

    expect(stdout).toBe("arg:one\narg:two\narg:three");
  });

  it("should pass arguments with flags", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { stdout } = runZsh(fn, "t args-echo --verbose --env prod");

    expect(stdout).toBe("arg:--verbose\narg:--env\narg:prod");
  });

  it("should pass arguments with spaces when quoted", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { stdout } = runZsh(fn, 't args-echo "hello world"');

    expect(stdout).toBe("arg:hello world");
  });

  it("should pass no arguments when none given", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "edge-cases")] });

    const { stdout } = runZsh(fn, "t args-echo");

    expect(stdout).toBe("");
  });

  it("should pass remaining args after nested command resolution", () => {
    const fn = generateZshFunction({ name: "t", dirs: [join(FIXTURES, "nested")] });

    const { stdout } = runZsh(fn, "t cloud aws s3 sync file1 file2");

    expect(stdout).toBe("s3-sync:file1 file2");
  });
});
