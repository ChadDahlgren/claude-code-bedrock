/**
 * Check if debug mode is enabled via environment variable
 */
export declare function isDebugMode(): boolean;
/**
 * Output a progress message to stderr
 */
export declare function progress(msg: string): void;
/**
 * Output a step progress message to stderr
 */
export declare function progressStep(current: number, total: number, msg: string): void;
/**
 * Output a debug message to stderr (only if debug mode is enabled)
 */
export declare function debug(msg: string): void;
/**
 * Output a debug message for a command being executed
 */
export declare function debugCommand(cmd: string, args: string[]): void;
/**
 * Output debug info for an error
 */
export declare function debugError(context: string, error: unknown): void;
