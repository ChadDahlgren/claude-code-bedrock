// Safe shell execution - prevents command injection

import { execFileSync } from 'child_process';

export interface ExecResult {
  stdout: string;
  success: boolean;
}

/**
 * Execute a command safely using execFileSync (immune to shell injection)
 * Arguments are passed as an array, not interpolated into a string
 */
export function execSafe(cmd: string, args: string[]): ExecResult {
  try {
    const stdout = execFileSync(cmd, args, { encoding: 'utf-8' });
    return { stdout: stdout.trim(), success: true };
  } catch {
    return { stdout: '', success: false };
  }
}

/**
 * Execute AWS CLI command safely
 */
export function awsCli(args: string[]): ExecResult {
  return execSafe('aws', args);
}

/**
 * Execute AWS CLI with inherited stdio (for interactive commands like sso login)
 */
export function awsCliInteractive(args: string[]): boolean {
  try {
    execFileSync('aws', args, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    return true;
  } catch {
    return false;
  }
}
