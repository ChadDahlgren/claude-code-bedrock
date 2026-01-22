export interface ExecResult {
    stdout: string;
    success: boolean;
}
/**
 * Execute a command safely using execFileSync (immune to shell injection)
 * Arguments are passed as an array, not interpolated into a string
 */
export declare function execSafe(cmd: string, args: string[]): ExecResult;
/**
 * Execute AWS CLI command safely
 */
export declare function awsCli(args: string[]): ExecResult;
/**
 * Execute AWS CLI with inherited stdio (for interactive commands like sso login)
 */
export declare function awsCliInteractive(args: string[]): boolean;
