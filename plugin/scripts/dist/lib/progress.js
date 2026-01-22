// Progress indicators - output to stderr to not break JSON on stdout
/**
 * Output a progress message to stderr
 */
export function progress(msg) {
    process.stderr.write(`${msg}\n`);
}
/**
 * Output a step progress message to stderr
 */
export function progressStep(current, total, msg) {
    process.stderr.write(`[${current}/${total}] ${msg}\n`);
}
