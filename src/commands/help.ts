import { scan } from "../core/scanner.js";
import type { Script } from "../types.js";
import * as fmt from "../utils/format.js";
import { CliError } from "../errors.js";

interface HelpOptions {
  readonly name: string;
  readonly dirs: readonly string[];
  readonly allowBinaries: boolean;
}

const NO_DESCRIPTION_PLACEHOLDER = "—";
const BINARY_PLACEHOLDER = "binary";

/**
 * Print a formatted list of all available commands discovered from the script directories.
 * Groups commands by their top-level directory and shows descriptions extracted from
 * each script's first comment line.
 */
export function help(options: HelpOptions): void {
  const { name, dirs, allowBinaries } = options;

  if (dirs.length === 0) {
    throw new CliError("runic help", "at least one --dir is required");
  }

  const { scripts } = scan({ dirs, allowBinaries });

  if (scripts.length === 0) {
    console.log(`\n  ${name}: no commands found.\n`);
    console.log("  Add scripts to:");
    for (const dir of dirs) {
      console.log(`    ${dir}`);
    }
    console.log("");
    return;
  }

  const { topLevel, groups } = groupByTopLevelSegment(scripts);
  const maxWidth = computeMaxCommandWidth(scripts);

  console.log(`\n  ${fmt.heading(name)}\n`);

  printTopLevel(topLevel, maxWidth);

  if (topLevel.length > 0 && groups.size > 0) {
    console.log("");
  }

  printGroups(groups, maxWidth);
}

function groupByTopLevelSegment(scripts: readonly Script[]): {
  topLevel: Script[];
  groups: Map<string, Script[]>;
} {
  const groups = new Map<string, Script[]>();
  const topLevel: Script[] = [];

  for (const script of scripts) {
    if (script.segments.length === 1) {
      topLevel.push(script);
    } else {
      const group = script.segments[0];
      if (group) {
        const existing = groups.get(group) ?? [];
        existing.push(script);
        groups.set(group, existing);
      }
    }
  }

  return { topLevel, groups };
}

function computeMaxCommandWidth(scripts: readonly Script[]): number {
  return scripts.reduce((max, s) => Math.max(max, s.segments.join(" ").length), 0);
}

function formatLine(script: Script, width: number): string {
  const cmd = script.segments.join(" ");
  const desc =
    script.description ?? fmt.dim(script.kind === "binary" ? BINARY_PLACEHOLDER : NO_DESCRIPTION_PLACEHOLDER);
  return `${fmt.command(cmd.padEnd(width + 2))} ${desc}`;
}

function printTopLevel(scripts: readonly Script[], maxWidth: number): void {
  for (const script of scripts) {
    console.log(`  ${formatLine(script, maxWidth)}`);
  }
}

function printGroups(groups: Map<string, Script[]>, maxWidth: number): void {
  for (const [group, groupScripts] of groups) {
    console.log(`  ${fmt.heading(group)}`);
    for (const script of groupScripts) {
      console.log(`    ${formatLine(script, maxWidth)}`);
    }
    console.log("");
  }
}
