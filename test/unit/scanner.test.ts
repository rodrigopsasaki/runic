import { describe, it, expect } from "vitest";
import { join } from "path";
import { scan, extractDescription } from "../../src/core/scanner.js";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

describe("scan", () => {
  it("should discover flat scripts", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "flat")] });

    const commands = scripts.map((s) => s.segments.join(" "));
    expect(commands).toContain("hello");
    expect(commands).toContain("greet");
    expect(commands).toContain("uuid");
  });

  it("should discover nested scripts", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "nested")] });

    const commands = scripts.map((s) => s.segments.join(" "));
    expect(commands).toContain("db backup");
    expect(commands).toContain("db migrate");
    expect(commands).toContain("gen uuid");
    expect(commands).toContain("gen hash");
    expect(commands).toContain("gen token");
  });

  it("should discover deeply nested scripts", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "nested")] });

    const commands = scripts.map((s) => s.segments.join(" "));
    expect(commands).toContain("cloud aws s3 sync");
  });

  it("should discover scripts in multiple runtimes", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "multi-runtime")] });

    const exts = scripts.map((s) => s.ext);
    expect(exts).toContain("sh");
    expect(exts).toContain("py");
    expect(exts).toContain("js");
  });

  it("should ignore dotfiles", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "edge-cases")] });

    const names = scripts.map((s) => s.segments.join(" "));
    expect(names).not.toContain(".hidden");
    expect(names.some((n) => n.includes("hidden"))).toBe(false);
  });

  it("should include extensionless files with shebangs", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "edge-cases")] });

    const commands = scripts.map((s) => s.segments.join(" "));
    expect(commands).toContain("no-extension");
  });

  it("should skip binary files", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "edge-cases")] });

    const paths = scripts.map((s) => s.path);
    expect(paths.some((p) => p.endsWith(".bin"))).toBe(false);
  });

  it("should return empty scripts for empty directory", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "empty")] });

    expect(scripts).toEqual([]);
  });

  it("should return empty scripts for nonexistent directory", () => {
    const { scripts } = scan({ dirs: ["/nonexistent/dir"] });

    expect(scripts).toEqual([]);
  });

  it("should detect conflicts across multiple directories", () => {
    const { scripts, conflicts } = scan({
      dirs: [join(FIXTURES, "priority", "dir-a"), join(FIXTURES, "priority", "dir-b")],
    });

    // First dir wins
    const deployScript = scripts.find((s) => s.segments.join(" ") === "deploy");
    expect(deployScript?.path).toContain("dir-a");

    // Conflict is reported
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]?.segments).toEqual(["deploy"]);
    expect(conflicts[0]?.paths.length).toBe(2);
  });

  it("should discover deep leaf scripts", () => {
    const { scripts } = scan({ dirs: [join(FIXTURES, "edge-cases")] });

    const commands = scripts.map((s) => s.segments.join(" "));
    expect(commands).toContain("deeply nested single leaf");
  });
});

describe("extractDescription", () => {
  it("should extract # comment from shell script", () => {
    const actual = extractDescription(join(FIXTURES, "descriptions", "with-desc.sh"));

    expect(actual).toBe("This is a helpful description");
  });

  it("should extract # comment from python script", () => {
    const actual = extractDescription(join(FIXTURES, "descriptions", "with-desc.py"));

    expect(actual).toBe("Python script with a description");
  });

  it("should extract // comment from javascript", () => {
    const actual = extractDescription(join(FIXTURES, "descriptions", "with-desc.js"));

    expect(actual).toBe("JavaScript with a description");
  });

  it("should return undefined for scripts without description", () => {
    const actual = extractDescription(join(FIXTURES, "descriptions", "no-desc.sh"));

    expect(actual).toBeUndefined();
  });

  it("should only return the first line of multi-line comments", () => {
    const actual = extractDescription(join(FIXTURES, "descriptions", "multiline-desc.sh"));

    expect(actual).toBe("First line of description");
  });

  it("should return undefined for nonexistent files", () => {
    const actual = extractDescription("/nonexistent/file");

    expect(actual).toBeUndefined();
  });
});
