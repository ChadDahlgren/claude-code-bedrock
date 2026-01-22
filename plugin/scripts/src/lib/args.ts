// Centralized argument parsing

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
export function parseArgs(argv = process.argv.slice(3)): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const content = arg.slice(2);
      const eqIdx = content.indexOf('=');
      if (eqIdx === -1) {
        flags.add(content);
      } else {
        values.set(content.slice(0, eqIdx), content.slice(eqIdx + 1));
      }
    }
  }

  return { flags, values };
}

/**
 * Check if a flag is present
 */
export function hasFlag(args: ParsedArgs, flag: string): boolean {
  return args.flags.has(flag);
}

/**
 * Get a value by key
 */
export function getValue(args: ParsedArgs, key: string): string | undefined {
  return args.values.get(key);
}
