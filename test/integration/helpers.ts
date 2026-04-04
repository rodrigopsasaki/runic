import { execSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const TEMP_DIR = join(tmpdir(), "rc-test");

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a zsh command with a generated shell function loaded.
 * Writes the function to a temp file and sources it to avoid quoting issues.
 */
export function runZsh(functionCode: string, command: string): RunResult {
  mkdirSync(TEMP_DIR, { recursive: true });
  const tempFile = join(TEMP_DIR, `rc-test-${randomBytes(4).toString("hex")}.zsh`);

  try {
    writeFileSync(tempFile, `${functionCode}\n${command}\n`);

    const stdout = execSync(`/bin/zsh "${tempFile}"`, {
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        HOME: process.env["HOME"],
        PATH: process.env["PATH"],
      },
    }).trim();

    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (execError.stdout ?? "").trim(),
      stderr: (execError.stderr ?? "").trim(),
      exitCode: execError.status ?? 1,
    };
  } finally {
    try {
      rmSync(tempFile);
    } catch {
      /* ignore */
    }
  }
}
