import { scan } from "../core/scanner.js";
import type { Script } from "../types.js";
import { CliError } from "../errors.js";

interface CompletionsOptions {
  readonly shell: string;
  readonly name: string;
  readonly dirs: readonly string[];
  readonly allowBinaries: boolean;
}

/**
 * Generate a shell completion script for the CLI.
 * The completions are generated from the current state of the script directories.
 */
export function completions(options: CompletionsOptions): void {
  const { shell, name, dirs, allowBinaries } = options;

  if (!shell) {
    throw new CliError("runic completions", "shell argument is required (zsh, bash, or fish)");
  }

  if (dirs.length === 0) {
    throw new CliError("runic completions", "at least one --dir is required");
  }

  const { scripts } = scan({ dirs, allowBinaries });

  switch (shell) {
    case "zsh":
      process.stdout.write(generateZshCompletions(name, scripts));
      break;
    case "bash":
      process.stdout.write(generateBashCompletions(name, scripts));
      break;
    case "fish":
      process.stdout.write(generateFishCompletions(name, scripts));
      break;
    default:
      throw new CliError("runic completions", `unsupported shell "${shell}". Use zsh, bash, or fish.`);
  }
}

function generateZshCompletions(name: string, scripts: readonly Script[]): string {
  const lines = [`#compdef ${name}`, "", `_${name}() {`, "  local -a commands", ""];

  // Group by depth for contextual completion
  const topLevel = scripts.filter((s) => s.segments.length === 1);
  const nested = scripts.filter((s) => s.segments.length > 1);

  // Build top-level completions
  lines.push("  local -a top_commands=(");
  for (const script of topLevel) {
    const cmd = script.segments[0] ?? "";
    const desc = (script.description ?? "").replace(/'/g, "'\\''");
    lines.push(`    '${cmd}:${desc}'`);
  }

  // Add directory groups as completable too
  const groups = new Set<string>();
  for (const script of nested) {
    const group = script.segments[0];
    if (group) groups.add(group);
  }
  for (const group of groups) {
    if (!topLevel.some((s) => s.segments[0] === group)) {
      lines.push(`    '${group}:${group} commands'`);
    }
  }
  lines.push("  )");
  lines.push("");

  // Handle subcommand completion
  lines.push("  if (( CURRENT == 2 )); then");
  lines.push("    _describe 'command' top_commands");
  lines.push("    return");
  lines.push("  fi");
  lines.push("");

  // Generate sub-completions for each group
  for (const group of groups) {
    const groupScripts = nested.filter((s) => s.segments[0] === group);
    lines.push(`  case "\$words[2]" in`);
    lines.push(`    ${group})`);
    lines.push(`      local -a sub_commands=(`);
    for (const script of groupScripts) {
      const sub = script.segments.slice(1).join(" ");
      const desc = (script.description ?? "").replace(/'/g, "'\\''");
      lines.push(`        '${sub}:${desc}'`);
    }
    lines.push(`      )`);
    lines.push(`      _describe 'subcommand' sub_commands`);
    lines.push(`      ;;`);
  }
  if (groups.size > 0) {
    lines.push("  esac");
  }

  lines.push("}");
  lines.push("");
  lines.push(`compdef _${name} ${name}`);
  lines.push("");

  return lines.join("\n");
}

function generateBashCompletions(name: string, scripts: readonly Script[]): string {
  const topLevel = new Set<string>();
  for (const script of scripts) {
    const first = script.segments[0];
    if (first) topLevel.add(first);
  }

  return `# bash completion for ${name}
_${name}_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"

  if [[ \$COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${Array.from(topLevel).join(" ")} help doctor completions" -- "\$cur") )
    return
  fi

  # Subcommand completions
  local parent="\${COMP_WORDS[1]}"
  local subcmds=""
  case "\$parent" in
${Array.from(new Set(scripts.filter((s) => s.segments.length > 1).map((s) => s.segments[0])))
  .map((group) => {
    const subs = scripts
      .filter((s) => s.segments[0] === group && s.segments.length > 1)
      .map((s) => s.segments[1])
      .join(" ");
    return `    ${group}) subcmds="${subs}" ;;`;
  })
  .join("\n")}
  esac

  if [[ -n "\$subcmds" ]]; then
    COMPREPLY=( $(compgen -W "\$subcmds" -- "\$cur") )
  fi
}
complete -F _${name}_completions ${name}
`;
}

function generateFishCompletions(name: string, scripts: readonly Script[]): string {
  const lines = [`# fish completion for ${name}`, ""];

  // Disable file completions
  lines.push(`complete -c ${name} -f`);
  lines.push("");

  // Top-level commands
  const topLevel = scripts.filter((s) => s.segments.length === 1);
  for (const script of topLevel) {
    const cmd = script.segments[0] ?? "";
    const desc = script.description ?? "";
    lines.push(`complete -c ${name} -n '__fish_use_subcommand' -a '${cmd}' -d '${desc.replace(/'/g, "\\'")}'`);
  }

  // Built-in commands
  lines.push(`complete -c ${name} -n '__fish_use_subcommand' -a 'help' -d 'Show available commands'`);
  lines.push(`complete -c ${name} -n '__fish_use_subcommand' -a 'doctor' -d 'Diagnose issues'`);

  // Group subcommands
  const groups = new Set<string>();
  for (const script of scripts) {
    if (script.segments.length > 1 && script.segments[0]) {
      groups.add(script.segments[0]);
    }
  }

  for (const group of groups) {
    if (!topLevel.some((s) => s.segments[0] === group)) {
      lines.push(`complete -c ${name} -n '__fish_use_subcommand' -a '${group}' -d '${group} commands'`);
    }

    const groupScripts = scripts.filter((s) => s.segments[0] === group && s.segments.length > 1);
    for (const script of groupScripts) {
      const sub = script.segments[1] ?? "";
      const desc = script.description ?? "";
      lines.push(
        `complete -c ${name} -n '__fish_seen_subcommand_from ${group}' -a '${sub}' -d '${desc.replace(/'/g, "\\'")}'`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}
