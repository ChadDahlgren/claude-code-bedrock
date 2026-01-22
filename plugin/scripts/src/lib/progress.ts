// Progress indicators - output to stderr to not break JSON on stdout

/**
 * Output a progress message to stderr
 */
export function progress(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

/**
 * Output a step progress message to stderr
 */
export function progressStep(current: number, total: number, msg: string): void {
  process.stderr.write(`[${current}/${total}] ${msg}\n`);
}
