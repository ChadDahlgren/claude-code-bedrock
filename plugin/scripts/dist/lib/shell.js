// Safe shell execution - prevents command injection
import { execFileSync } from 'child_process';
import { parseAwsError } from './errors.js';
import { debugCommand, debugError, debug } from './progress.js';
/**
 * Execute a command safely using execFileSync (immune to shell injection)
 * Arguments are passed as an array, not interpolated into a string
 */
export function execSafe(cmd, args) {
    debugCommand(cmd, args);
    try {
        const stdout = execFileSync(cmd, args, { encoding: 'utf-8' });
        debug(`Command succeeded, output length: ${stdout.length}`);
        return { stdout: stdout.trim(), success: true };
    }
    catch (err) {
        // Extract error details for better debugging
        const error = err;
        const stderr = error.stderr
            ? (typeof error.stderr === 'string' ? error.stderr : error.stderr.toString())
            : (error.message || '');
        debugError(`${cmd} ${args.join(' ')}`, stderr);
        // Parse the error to determine type
        const awsError = parseAwsError(stderr, typeof error.code === 'number' ? error.code : undefined);
        debug(`Parsed error code: ${awsError.code}`);
        return { stdout: '', success: false, error: awsError };
    }
}
/**
 * Execute AWS CLI command safely
 */
export function awsCli(args) {
    return execSafe('aws', args);
}
/**
 * Execute AWS CLI with inherited stdio (for interactive commands like sso login)
 */
export function awsCliInteractive(args) {
    debugCommand('aws', args);
    debug('Running in interactive mode (stdio inherited)');
    try {
        execFileSync('aws', args, {
            encoding: 'utf-8',
            stdio: 'inherit'
        });
        debug('Interactive command completed successfully');
        return { success: true };
    }
    catch (err) {
        const error = err;
        debugError('aws interactive', error.message || 'Unknown error');
        const awsError = parseAwsError(error.message || '', typeof error.code === 'number' ? error.code : undefined);
        return { success: false, error: awsError };
    }
}
