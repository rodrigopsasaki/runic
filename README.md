# rc

Turn any script folder into a CLI.

```bash
eval "$(rc init zsh --name ops --dir ~/scripts)"
```

```
~/scripts/
├── deploy.sh
├── rollback.py
└── db/
    ├── backup.sh
    └── migrate.rb
```

```
$ ops deploy production
$ ops db backup --full
$ ops help
```

Scripts can be in any language. Directories become subcommands. File names become command names.

## How it works

`rc` generates a shell function with the name you choose. That function does all the dispatching — no Node.js startup on every invocation, no manifest to maintain, no config files. It probes the filesystem directly, finds your script, detects the runtime from the file extension, and runs it.

The generated function handles everything: command dispatch, help, doctor diagnostics, tab completions. You interact with your CLI, not with `rc`.

## Install

```bash
npm install -g rodrigos-cli
```

## Setup

Add one line to your shell config (`.zshrc`, `.bashrc`, or `config.fish`):

```bash
# zsh
eval "$(rc init zsh --name ops --dir ~/scripts)"

# bash
eval "$(rc init bash --name ops --dir ~/scripts)"

# fish
rc init fish --name ops --dir ~/scripts | source
```

That's it. You now have a CLI called `ops`.

## Supported runtimes

| Extension | Runner    |
|-----------|-----------|
| `.sh`     | bash      |
| `.bash`   | bash      |
| `.zsh`    | zsh       |
| `.py`     | python3   |
| `.rb`     | ruby      |
| `.js`     | node      |
| `.ts`     | npx tsx   |
| `.php`    | php       |
| `.pl`     | perl      |
| (none)    | shebang   |

Extensionless files with a shebang line are supported — the runtime is read from the shebang.

## Descriptions

The first comment after the shebang becomes the command's description in `help` output:

```bash
#!/bin/bash
# Deploy the application to the target environment
```

```python
#!/usr/bin/env python3
# Run database migrations
```

```javascript
#!/usr/bin/env node
// Rotate API keys for all services
```

No config files needed. Your scripts document themselves.

## Multiple directories

Point at multiple directories. First directory wins on conflict.

```bash
eval "$(rc init zsh --name ops --dir ~/my-scripts --dir /shared/team-scripts)"
```

This lets teams share a script repo while individuals add their own overrides.

## Whitelabeling

The `--name` flag is the CLI's identity. Create as many as you want:

```bash
eval "$(rc init zsh --name ops --dir ~/scripts/ops)"
eval "$(rc init zsh --name dev --dir ~/scripts/dev)"
eval "$(rc init zsh --name infra --dir /opt/infra/scripts)"
```

Three separate CLIs. Three names. Independent.

## Built-in commands

Every generated CLI has these built-in:

| Command | What it does |
|---------|-------------|
| `ops help` | List all commands with descriptions |
| `ops doctor` | Check permissions, shebangs, runners |
| `ops completions zsh` | Generate tab-completion script |

These delegate to the `rc` binary for the heavy lifting (directory walking, formatting). Dispatch — the thing that runs 100 times a day — stays in the shell function at zero cost.

## Tab completions

Generate and load completions for your shell:

```bash
# zsh — add to .zshrc after the eval line
source <(ops completions zsh)

# bash
eval "$(ops completions bash)"

# fish
ops completions fish | source
```

## Scaffolding new scripts

```bash
rc create scripts/deploy.sh      # creates with #!/bin/bash
rc create scripts/analyze.py     # creates with #!/usr/bin/env python3
rc create scripts/serve.js       # creates with #!/usr/bin/env node
```

Creates the file with the right shebang, a description placeholder, and executable permissions.

## Environment variables

Every script receives context through environment variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `RC_COMMAND` | `db backup` | The command path as typed |
| `RC_CLI_NAME` | `ops` | The CLI name |
| `RC_SCRIPT_PATH` | `/home/you/scripts/db/backup.sh` | Absolute path to the script |
| `RC_DIR` | `/home/you/scripts` | Which directory this script was found in |
| `RC_DIRS` | `/home/you/scripts:/shared/scripts` | All directories (colon-separated) |

Scripts can detect they're running inside a generated CLI by checking for `RC_COMMAND`.

## Command resolution

`rc` uses greedy longest-match. Given `ops deploy staging`:

1. Try `<dir>/deploy/staging.{sh,py,js,...}` — if found, run it
2. Try `<dir>/deploy.{sh,py,js,...}` with `staging` as an argument

This means a script and a directory can coexist with the same name:

```
scripts/
├── deploy.sh           # ops deploy
└── deploy/
    └── staging.sh      # ops deploy staging
```

Both work. The longer match wins when it exists.

## Extension probe order

When two scripts share a base name with different extensions (e.g., `deploy.sh` and `deploy.py`), the first match in probe order wins:

`sh, bash, zsh, py, rb, js, ts, php, pl`

`ops doctor` will flag this as a conflict.

## Example: team CLI

A platform team maintains shared scripts in a git repo:

```
platform-tools/
├── deploy/
│   ├── staging.sh
│   ├── production.sh
│   └── rollback.py
├── db/
│   ├── backup.sh
│   ├── restore.sh
│   └── migrate.rb
└── monitoring/
    ├── check-disk.sh
    └── restart-service.sh
```

Each team member adds to their `.zshrc`:

```bash
eval "$(rc init zsh --name plat --dir ~/repos/platform-tools --dir ~/my-scripts)"
```

The Perl dev, the Python dev, and the bash purist all contribute scripts in their language. Nobody has to agree on a runtime. The `~/my-scripts` directory lets individuals add overrides or personal utilities without touching the shared repo.

## Development

```bash
git clone https://github.com/rodrigopsasaki/rodrigos-cli.git
cd rodrigos-cli
pnpm install
pnpm test        # 71 tests
pnpm run build   # produces dist/rc.cjs
```

## License

MIT
