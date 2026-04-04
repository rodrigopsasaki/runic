import { parseArgv, getFlag, getFlagAll } from "../utils/argv.js";
import { init } from "../commands/init.js";
import { help } from "../commands/help.js";
import { doctor } from "../commands/doctor.js";
import { completions } from "../commands/completions.js";
import { create } from "../commands/create.js";

const USAGE = `
  rc — Turn any script folder into a CLI

  Usage:
    rc init <shell> --name <name> --dir <dir> [--dir <dir>...]
    rc help --name <name> --dir <dir>
    rc doctor --dir <dir>
    rc completions <shell> --name <name> --dir <dir>
    rc create <path>

  Setup:
    eval "$(rc init zsh --name myapp --dir ./scripts)"

  https://github.com/rodrigopsasaki/rodrigos-cli
`;

function main(): void {
  const parsed = parseArgv(process.argv);

  switch (parsed.command) {
    case "init": {
      const shell = parsed.positionals[0] ?? "";
      const name = getFlag(parsed.flags, "name") ?? "";
      const dirs = getFlagAll(parsed.flags, "dir");
      init({ shell, name, dirs });
      break;
    }

    case "help": {
      const name = getFlag(parsed.flags, "name") ?? "rc";
      const dirs = getFlagAll(parsed.flags, "dir");
      help({ name, dirs });
      break;
    }

    case "doctor": {
      const dirs = getFlagAll(parsed.flags, "dir");
      doctor({ dirs });
      break;
    }

    case "completions": {
      const shell = parsed.positionals[0] ?? "";
      const name = getFlag(parsed.flags, "name") ?? "rc";
      const dirs = getFlagAll(parsed.flags, "dir");
      completions({ shell, name, dirs });
      break;
    }

    case "create": {
      const path = parsed.positionals[0];
      if (!path) {
        console.error("rc create: path argument is required");
        console.error("Usage: rc create <path>");
        process.exit(1);
      }
      create(path);
      break;
    }

    default:
      console.log(USAGE);
      break;
  }
}

main();
