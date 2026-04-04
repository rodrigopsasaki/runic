import { generateZshFunction } from "../shell/templates/zsh.js";
import { generateBashFunction } from "../shell/templates/bash.js";
import { generateFishFunction } from "../shell/templates/fish.js";

const SUPPORTED_SHELLS = ["zsh", "bash", "fish"] as const;
type Shell = (typeof SUPPORTED_SHELLS)[number];

interface InitOptions {
  readonly shell: string;
  readonly name: string;
  readonly dirs: readonly string[];
}

const GENERATORS: Readonly<Record<Shell, (opts: { name: string; dirs: readonly string[] }) => string>> = {
  zsh: generateZshFunction,
  bash: generateBashFunction,
  fish: generateFishFunction,
};

/**
 * Generate a shell function that turns script directories into a CLI.
 * Outputs the function to stdout for use with `eval "$(rc init ...)"`.
 */
export function init(options: InitOptions): void {
  const { shell, name, dirs } = options;

  if (!shell) {
    console.error("rc init: shell argument is required (zsh, bash, or fish)");
    process.exit(1);
  }

  if (!name) {
    console.error("rc init: --name is required");
    process.exit(1);
  }

  if (dirs.length === 0) {
    console.error("rc init: at least one --dir is required");
    process.exit(1);
  }

  if (!isSupportedShell(shell)) {
    console.error(`rc init: unsupported shell "${shell}". Use ${SUPPORTED_SHELLS.join(", ")}.`);
    process.exit(1);
  }

  process.stdout.write(GENERATORS[shell]({ name, dirs }));
}

function isSupportedShell(shell: string): shell is Shell {
  return SUPPORTED_SHELLS.includes(shell as Shell);
}
