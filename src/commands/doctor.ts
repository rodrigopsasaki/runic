import { existsSync, statSync, readFileSync, readdirSync } from "fs";
import { execFileSync } from "child_process";
import { scan } from "../core/scanner.js";
import { resolveRuntime } from "../core/runner.js";
import type { DoctorIssue } from "../types.js";
import * as fmt from "../utils/format.js";

interface DoctorOptions {
  readonly dirs: readonly string[];
}

/**
 * Diagnose issues with script directories: permissions, missing shebangs,
 * unavailable runners, conflicts, and empty directories.
 * Prints a formatted report and exits with code 1 if errors are found.
 */
export function doctor(options: DoctorOptions): void {
  const { dirs } = options;

  if (dirs.length === 0) {
    console.error("rc doctor: at least one --dir is required");
    process.exit(1);
  }

  const issues: DoctorIssue[] = [];

  checkDirectories(dirs, issues);

  const { scripts, conflicts } = scan({ dirs });

  checkScripts(scripts, issues);
  reportConflicts(conflicts, issues);
  printReport(scripts.length, issues);
}

function checkDirectories(dirs: readonly string[], issues: DoctorIssue[]): void {
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      issues.push({ level: "error", path: dir, message: "Directory does not exist" });
      continue;
    }

    try {
      const items = readdirSync(dir);
      if (items.length === 0) {
        issues.push({ level: "info", path: dir, message: "Directory is empty" });
      }
    } catch {
      issues.push({ level: "error", path: dir, message: "Cannot read directory" });
    }
  }
}

function checkScripts(
  scripts: readonly { readonly path: string; readonly ext: string }[],
  issues: DoctorIssue[],
): void {
  for (const script of scripts) {
    checkExecutablePermission(script.path, issues);
    checkShebang(script.path, script.ext, issues);
    checkRunnerAvailability(script.ext, script.path, issues);
  }
}

function checkExecutablePermission(scriptPath: string, issues: DoctorIssue[]): void {
  try {
    const stat = statSync(scriptPath);
    if (!(stat.mode & 0o111)) {
      issues.push({
        level: "warning",
        path: scriptPath,
        message: `Not executable. Fix: chmod +x "${scriptPath}"`,
      });
    }
  } catch {
    issues.push({ level: "error", path: scriptPath, message: "Cannot stat file" });
  }
}

function checkShebang(scriptPath: string, ext: string, issues: DoctorIssue[]): void {
  try {
    const head = readFileSync(scriptPath, "utf8").slice(0, 256);
    const firstLine = head.split("\n")[0] ?? "";
    if (!firstLine.startsWith("#!") && ext !== "") {
      issues.push({
        level: "info",
        path: scriptPath,
        message: "No shebang line (runner inferred from extension)",
      });
    }
  } catch {
    // Skip unreadable files — they'll be caught by other checks
  }
}

function checkRunnerAvailability(ext: string, scriptPath: string, issues: DoctorIssue[]): void {
  const runtime = resolveRuntime(ext, scriptPath);
  if (!isCommandAvailable(runtime.command)) {
    issues.push({
      level: "error",
      path: scriptPath,
      message: `Runner "${runtime.command}" not found on PATH`,
    });
  }
}

function reportConflicts(
  conflicts: readonly { readonly segments: readonly string[]; readonly paths: readonly string[] }[],
  issues: DoctorIssue[],
): void {
  for (const conflict of conflicts) {
    const cmd = conflict.segments.join(" ");
    issues.push({
      level: "info",
      path: conflict.paths.join(", "),
      message: `"${cmd}" exists in multiple directories (first wins)`,
    });
  }
}

function printReport(scriptCount: number, issues: readonly DoctorIssue[]): void {
  if (issues.length === 0) {
    console.log(`\n  ${fmt.success("✓")} All ${scriptCount} scripts look good.\n`);
    return;
  }

  console.log("");
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  for (const issue of errors) {
    console.log(`  ${fmt.error("✗")} ${issue.path}`);
    console.log(`    ${issue.message}`);
  }
  for (const issue of warnings) {
    console.log(`  ${fmt.warning("!")} ${issue.path}`);
    console.log(`    ${issue.message}`);
  }
  for (const issue of infos) {
    console.log(`  ${fmt.dim("·")} ${issue.path}`);
    console.log(`    ${issue.message}`);
  }

  console.log(`\n  ${scriptCount} scripts, ${errors.length} errors, ${warnings.length} warnings\n`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

/** Check if a command is available on PATH using `which`. Uses execFileSync to avoid shell injection. */
function isCommandAvailable(command: string): boolean {
  try {
    execFileSync("which", [command], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
