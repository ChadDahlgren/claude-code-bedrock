export interface ParsedArgs {
    flags: Set<string>;
    values: Map<string, string>;
}
/**
 * Parse command line arguments into flags and key-value pairs
 *
 * @param argv - Arguments to parse (defaults to process.argv.slice(3))
 * @returns Parsed flags and values
 *
 * @example
 * // --verbose --profile=dev --region=us-west-2
 * // flags: Set(['verbose'])
 * // values: Map({ profile: 'dev', region: 'us-west-2' })
 */
export declare function parseArgs(argv?: string[]): ParsedArgs;
/**
 * Check if a flag is present
 */
export declare function hasFlag(args: ParsedArgs, flag: string): boolean;
/**
 * Get a value by key
 */
export declare function getValue(args: ParsedArgs, key: string): string | undefined;
