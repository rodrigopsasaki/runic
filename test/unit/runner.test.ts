import { describe, it, expect } from "vitest";
import { join } from "path";
import { resolveRuntime, parseShebang } from "../../src/core/runner.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("resolveRuntime", () => {
  it.each([
    { ext: "sh", expected: "bash" },
    { ext: "bash", expected: "bash" },
    { ext: "zsh", expected: "zsh" },
    { ext: "py", expected: "python3" },
    { ext: "rb", expected: "ruby" },
    { ext: "js", expected: "node" },
    { ext: "ts", expected: "npx" },
    { ext: "php", expected: "php" },
    { ext: "pl", expected: "perl" },
  ])("should map .$ext to $expected", ({ ext, expected }) => {
    const actual = resolveRuntime(ext, "/dummy/path");

    expect(actual.command).toBe(expected);
  });

  it("should include tsx as arg for .ts files", () => {
    const actual = resolveRuntime("ts", "/dummy/path");

    expect(actual.command).toBe("npx");
    expect(actual.args).toEqual(["tsx"]);
  });

  it("should fall back to shebang for unknown extension", () => {
    const scriptPath = join(FIXTURES, "edge-cases", "no-extension");

    const actual = resolveRuntime("", scriptPath);

    expect(actual.command).toBe("bash");
  });

  it("should default to bash when no extension and no shebang", () => {
    const actual = resolveRuntime("", "/nonexistent/file");

    expect(actual.command).toBe("bash");
  });
});

describe("parseShebang", () => {
  it("should parse #!/usr/bin/env python3", () => {
    const scriptPath = join(FIXTURES, "flat", "greet.py");

    const actual = parseShebang(scriptPath);

    expect(actual?.command).toBe("python3");
  });

  it("should parse #!/bin/bash", () => {
    const scriptPath = join(FIXTURES, "flat", "hello.sh");

    const actual = parseShebang(scriptPath);

    expect(actual?.command).toBe("bash");
  });

  it("should parse #!/usr/bin/env node", () => {
    const scriptPath = join(FIXTURES, "flat", "uuid.js");

    const actual = parseShebang(scriptPath);

    expect(actual?.command).toBe("node");
  });

  it("should return undefined for files without shebang", () => {
    const scriptPath = join(FIXTURES, "edge-cases", "no-shebang.sh");

    const actual = parseShebang(scriptPath);

    expect(actual).toBeUndefined();
  });

  it("should return undefined for nonexistent files", () => {
    const actual = parseShebang("/nonexistent/file");

    expect(actual).toBeUndefined();
  });
});
