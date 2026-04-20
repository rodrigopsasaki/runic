import { parseArgv, getFlag, getFlagAll } from "../utils/argv.js";
import { init } from "../commands/init.js";
import { help } from "../commands/help.js";
import { doctor } from "../commands/doctor.js";
import { completions } from "../commands/completions.js";
import { create } from "../commands/create.js";
import { runtimes } from "../commands/runtimes.js";
import { CliError } from "../errors.js";

const USAGE = `
  runic — Turn any script folder into a CLI

  Usage:
    runic init <shell> --name <name> --dir <dir> [--dir <dir>...] [--allow-binaries]
    runic help --name <name> --dir <dir> [--allow-binaries]
    runic doctor --dir <dir> [--allow-binaries]
    runic runtimes
    runic completions <shell> --name <name> --dir <dir> [--allow-binaries]
    runic create <path>

  Setup:
    eval "$(runic init zsh --name myapp --dir ./scripts)"

  Add --allow-binaries to also dispatch native executables (Rust, Go, …) from
  your script dirs. Off by default — binaries are opaque, so opt-in.

  https://github.com/rodrigopsasaki/runic
`;

function main(): void {
  const parsed = parseArgv(process.argv);

  switch (parsed.command) {
    case "init": {
      const shell = parsed.positionals[0] ?? "";
      const name = getFlag(parsed.flags, "name") ?? "";
      const dirs = getFlagAll(parsed.flags, "dir");
      const allowBinaries = isFlagSet(parsed.flags, "allow-binaries");
      init({ shell, name, dirs, allowBinaries });
      break;
    }

    case "help": {
      const name = getFlag(parsed.flags, "name") ?? "runic";
      const dirs = getFlagAll(parsed.flags, "dir");
      const allowBinaries = isFlagSet(parsed.flags, "allow-binaries");
      help({ name, dirs, allowBinaries });
      break;
    }

    case "doctor": {
      const dirs = getFlagAll(parsed.flags, "dir");
      const allowBinaries = isFlagSet(parsed.flags, "allow-binaries");
      doctor({ dirs, allowBinaries });
      break;
    }

    case "completions": {
      const shell = parsed.positionals[0] ?? "";
      const name = getFlag(parsed.flags, "name") ?? "runic";
      const dirs = getFlagAll(parsed.flags, "dir");
      const allowBinaries = isFlagSet(parsed.flags, "allow-binaries");
      completions({ shell, name, dirs, allowBinaries });
      break;
    }

    case "create": {
      const path = parsed.positionals[0];
      if (!path) {
        throw new CliError("runic create", "path argument is required (usage: runic create <path>)");
      }
      create(path);
      break;
    }

    case "runtimes": {
      runtimes();
      break;
    }

    default:
      console.log(USAGE);
      break;
  }
}

/** True for boolean flags: present without a value, or `--flag=true`. */
function isFlagSet(flags: Readonly<Record<string, string | readonly string[]>>, key: string): boolean {
  const v = flags[key];
  if (v === undefined) return false;
  const value = typeof v === "string" ? v : v[0];
  return value === "true" || value === "1" || value === "";
}

try {
  main();
} catch (err) {
  if (err instanceof CliError) {
    console.error(`${err.prefix}: ${err.message}`);
    process.exit(err.exitCode);
  }
  throw err;
}
