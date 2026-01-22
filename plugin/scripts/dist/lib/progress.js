// Progress indicators - output to stderr to not break JSON on stdout
/**
 * Check if debug mode is enabled via environment variable
 */
export function isDebugMode() {
    return process.env.CLAUDE_CODE_DEBUG === '1' ||
        process.env.BEDROCK_DEBUG === '1' ||
        process.argv.includes('--verbose') ||
        process.argv.includes('--debug');
}
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
/**
 * Output a debug message to stderr (only if debug mode is enabled)
 */
export function debug(msg) {
    if (isDebugMode()) {
        process.stderr.write(`[DEBUG] ${msg}\n`);
    }
}
/**
 * Output a debug message for a command being executed
 */
export function debugCommand(cmd, args) {
    if (isDebugMode()) {
        const fullCmd = `${cmd} ${args.join(' ')}`;
        process.stderr.write(`[DEBUG] Executing: ${fullCmd}\n`);
    }
}
/**
 * Output debug info for an error
 */
export function debugError(context, error) {
    if (isDebugMode()) {
        process.stderr.write(`[DEBUG] Error in ${context}: ${error}\n`);
    }
}
