/** A discovered script in a directory. */
export interface Script {
  /** Command path segments, e.g. ["db", "backup"]. */
  readonly segments: readonly string[];
  /** Absolute path to the script file. */
  readonly path: string;
  /** File extension without the dot (e.g. "sh", "py"). Empty string if none. */
  readonly ext: string;
  /** Description extracted from the first comment after the shebang, if any. */
  readonly description: string | undefined;
}

/** Result of scanning one or more directories. */
export interface ScanResult {
  /** All discovered scripts, deduplicated by command segments (first dir wins). */
  readonly scripts: readonly Script[];
  /** Commands that appeared in multiple directories. */
  readonly conflicts: readonly Conflict[];
}

/** A command that exists in multiple directories. */
export interface Conflict {
  /** The command segments, e.g. ["deploy"]. */
  readonly segments: readonly string[];
  /** Absolute paths to all scripts with this command (winner first). */
  readonly paths: readonly string[];
}

/** An issue found by the doctor command. */
export interface DoctorIssue {
  readonly level: "error" | "warning" | "info";
  readonly path: string;
  readonly message: string;
}

/** How to invoke a script's runtime. */
export interface RuntimeInfo {
  /** The command to run, e.g. "bash", "python3", "node". */
  readonly command: string;
  /** Extra arguments before the script path, e.g. ["tsx"] for npx. */
  readonly args: readonly string[];
}

/** Parsed CLI arguments for rc commands. */
export interface ParsedArgs {
  /** The subcommand, e.g. "init", "help". */
  readonly command: string | undefined;
  /** Positional arguments (non-flag values). */
  readonly positionals: readonly string[];
  /** Flag values. Repeated flags become arrays. */
  readonly flags: Readonly<Record<string, string | readonly string[]>>;
}
