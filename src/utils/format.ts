import chalk from "chalk";

/** Format text as a bold heading. */
export function heading(text: string): string {
  return chalk.bold(text);
}

/** Format text as dimmed/muted. */
export function dim(text: string): string {
  return chalk.dim(text);
}

/** Format text as green (success). */
export function success(text: string): string {
  return chalk.green(text);
}

/** Format text as yellow (warning). */
export function warning(text: string): string {
  return chalk.yellow(text);
}

/** Format text as red (error). */
export function error(text: string): string {
  return chalk.red(text);
}

/** Format text as cyan (command/keyword). */
export function command(text: string): string {
  return chalk.cyan(text);
}
