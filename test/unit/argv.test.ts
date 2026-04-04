import { describe, it, expect } from "vitest";
import { parseArgv, getFlag, getFlagAll } from "../../src/utils/argv.js";

describe("parseArgv", () => {
  it("should parse a command with no flags", () => {
    const input = ["node", "rc.js", "help"];

    const actual = parseArgv(input);

    expect(actual.command).toBe("help");
    expect(actual.positionals).toEqual([]);
    expect(actual.flags).toEqual({});
  });

  it("should parse --flag value pairs", () => {
    const input = ["node", "rc.js", "init", "zsh", "--name", "acme", "--dir", "/opt/scripts"];

    const actual = parseArgv(input);

    expect(actual.command).toBe("init");
    expect(actual.positionals).toEqual(["zsh"]);
    expect(actual.flags).toEqual({ name: "acme", dir: "/opt/scripts" });
  });

  it("should parse --flag=value form", () => {
    const input = ["node", "rc.js", "init", "--name=acme"];

    const actual = parseArgv(input);

    expect(actual.flags).toEqual({ name: "acme" });
  });

  it("should accumulate repeated flags into an array", () => {
    const input = ["node", "rc.js", "init", "--dir", "/a", "--dir", "/b", "--dir", "/c"];

    const actual = parseArgv(input);

    expect(getFlagAll(actual.flags, "dir")).toEqual(["/a", "/b", "/c"]);
  });

  it("should treat standalone --flag (no value) as boolean true", () => {
    const input = ["node", "rc.js", "doctor", "--verbose"];

    const actual = parseArgv(input);

    expect(getFlag(actual.flags, "verbose")).toBe("true");
  });

  it("should return undefined command when no args provided", () => {
    const input = ["node", "rc.js"];

    const actual = parseArgv(input);

    expect(actual.command).toBeUndefined();
  });

  it("should handle multiple positionals", () => {
    const input = ["node", "rc.js", "create", "scripts/deploy.sh", "extra"];

    const actual = parseArgv(input);

    expect(actual.command).toBe("create");
    expect(actual.positionals).toEqual(["scripts/deploy.sh", "extra"]);
  });
});

describe("getFlag", () => {
  it("should return undefined for missing flag", () => {
    expect(getFlag({}, "name")).toBeUndefined();
  });

  it("should return the string value for a single flag", () => {
    expect(getFlag({ name: "acme" }, "name")).toBe("acme");
  });

  it("should return the first value for a repeated flag", () => {
    expect(getFlag({ dir: ["/a", "/b"] }, "dir")).toBe("/a");
  });
});

describe("getFlagAll", () => {
  it("should return empty array for missing flag", () => {
    expect(getFlagAll({}, "dir")).toEqual([]);
  });

  it("should wrap a single value in an array", () => {
    expect(getFlagAll({ dir: "/a" }, "dir")).toEqual(["/a"]);
  });

  it("should return the array as-is for repeated flags", () => {
    expect(getFlagAll({ dir: ["/a", "/b"] }, "dir")).toEqual(["/a", "/b"]);
  });
});
