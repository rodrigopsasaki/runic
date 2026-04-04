import type { ParsedArgs } from "../types.js";

/**
 * Parse process.argv-style arguments into structured data.
 *
 * Handles: `--flag value`, `--flag=value`, repeated `--flag` (becomes array),
 * and positional arguments. The first non-flag argument is the command.
 */
export function parseArgv(argv: readonly string[]): ParsedArgs {
  const args = argv.slice(2); // skip node and script path
  const flags: Record<string, string | string[]> = {};
  const positionals: string[] = [];
  let command: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;

    if (arg.startsWith("--")) {
      const equalsIndex = arg.indexOf("=");

      let key: string;
      let value: string;

      if (equalsIndex !== -1) {
        key = arg.slice(2, equalsIndex);
        value = arg.slice(equalsIndex + 1);
      } else {
        key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg !== undefined && !nextArg.startsWith("--")) {
          value = nextArg;
          i++;
        } else {
          value = "true";
        }
      }

      const existing = flags[key];
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          flags[key] = [existing, value];
        }
      } else {
        flags[key] = value;
      }
    } else if (command === undefined) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  return { command, positionals, flags };
}

/** Get a flag as a single string, or undefined. */
export function getFlag(flags: ParsedArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return value[0];
}

/** Get a flag as an array of strings (handles both single and repeated). */
export function getFlagAll(flags: ParsedArgs["flags"], key: string): readonly string[] {
  const value = flags[key];
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  return value;
}
