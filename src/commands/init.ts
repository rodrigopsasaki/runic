import { generateZshFunction } from "../shell/templates/zsh.js";
import { generateBashFunction } from "../shell/templates/bash.js";
import { generateFishFunction } from "../shell/templates/fish.js";
import { CliError } from "../errors.js";

const SUPPORTED_SHELLS = ["zsh", "bash", "fish"] as const;
type Shell = (typeof SUPPORTED_SHELLS)[number];

interface InitOptions {
  readonly shell: string;
  readonly name: string;
  readonly dirs: readonly string[];
  readonly allowBinaries: boolean;
}

interface GeneratorOptions {
  readonly name: string;
  readonly dirs: readonly string[];
  readonly allowBinaries: boolean;
}

const GENERATORS: Readonly<Record<Shell, (opts: GeneratorOptions) => string>> = {
  zsh: generateZshFunction,
  bash: generateBashFunction,
  fish: generateFishFunction,
};

/**
 * Generate a shell function that turns script directories into a CLI.
 * Outputs the function to stdout for use with `eval "$(runic init ...)"`.
 */
export function init(options: InitOptions): void {
  const { shell, name, dirs, allowBinaries } = options;

  if (!shell) {
    throw new CliError("runic init", "shell argument is required (zsh, bash, or fish)");
  }

  if (!name) {
    throw new CliError("runic init", "--name is required");
  }

  if (dirs.length === 0) {
    throw new CliError("runic init", "at least one --dir is required");
  }

  if (!isSupportedShell(shell)) {
    throw new CliError("runic init", `unsupported shell "${shell}". Use ${SUPPORTED_SHELLS.join(", ")}.`);
  }

  process.stdout.write(GENERATORS[shell]({ name, dirs, allowBinaries }));
}

function isSupportedShell(shell: string): shell is Shell {
  return SUPPORTED_SHELLS.includes(shell as Shell);
}
