import { scan } from "../core/scanner.js";
import type { Script } from "../types.js";
import * as fmt from "../utils/format.js";

interface HelpOptions {
  readonly name: string;
  readonly dirs: readonly string[];
}

const NO_DESCRIPTION_PLACEHOLDER = "—";

/**
 * Print a formatted list of all available commands discovered from the script directories.
 * Groups commands by their top-level directory and shows descriptions extracted from
 * each script's first comment line.
 */
export function help(options: HelpOptions): void {
  const { name, dirs } = options;

  if (dirs.length === 0) {
    console.error("rc help: at least one --dir is required");
    process.exit(1);
  }

  const { scripts } = scan({ dirs });

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

function formatLine(cmd: string, description: string | undefined, width: number): string {
  const desc = description ?? fmt.dim(NO_DESCRIPTION_PLACEHOLDER);
  return `${fmt.command(cmd.padEnd(width + 2))} ${desc}`;
}

function printTopLevel(scripts: readonly Script[], maxWidth: number): void {
  for (const script of scripts) {
    const cmd = script.segments.join(" ");
    console.log(`  ${formatLine(cmd, script.description, maxWidth)}`);
  }
}

function printGroups(groups: Map<string, Script[]>, maxWidth: number): void {
  for (const [group, groupScripts] of groups) {
    console.log(`  ${fmt.heading(group)}`);
    for (const script of groupScripts) {
      const cmd = script.segments.join(" ");
      console.log(`    ${formatLine(cmd, script.description, maxWidth)}`);
    }
    console.log("");
  }
}
