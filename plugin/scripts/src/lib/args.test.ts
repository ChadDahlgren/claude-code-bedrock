import { describe, it, expect } from 'vitest';
import { parseArgs, hasFlag, getValue } from './args.js';

describe('args', () => {
  describe('parseArgs', () => {
    it('parses flags without values', () => {
      const args = parseArgs(['--verbose', '--debug']);
      expect(args.flags.has('verbose')).toBe(true);
      expect(args.flags.has('debug')).toBe(true);
      expect(args.values.size).toBe(0);
    });

    it('parses key-value pairs', () => {
      const args = parseArgs(['--profile=dev', '--region=us-west-2']);
      expect(args.values.get('profile')).toBe('dev');
      expect(args.values.get('region')).toBe('us-west-2');
      expect(args.flags.size).toBe(0);
    });

    it('handles mixed flags and values', () => {
      const args = parseArgs(['--verbose', '--profile=dev', '--debug', '--region=us-west-2']);
      expect(args.flags.has('verbose')).toBe(true);
      expect(args.flags.has('debug')).toBe(true);
      expect(args.values.get('profile')).toBe('dev');
      expect(args.values.get('region')).toBe('us-west-2');
    });

    it('handles values with equals signs', () => {
      const args = parseArgs(['--model=global.anthropic.claude=test']);
      expect(args.values.get('model')).toBe('global.anthropic.claude=test');
    });

    it('ignores non-flag arguments', () => {
      const args = parseArgs(['positional', '--flag', 'another', '--key=value']);
      expect(args.flags.has('flag')).toBe(true);
      expect(args.values.get('key')).toBe('value');
      expect(args.flags.has('positional')).toBe(false);
    });

    it('handles empty input', () => {
      const args = parseArgs([]);
      expect(args.flags.size).toBe(0);
      expect(args.values.size).toBe(0);
    });
  });

  describe('hasFlag', () => {
    it('returns true for present flags', () => {
      const args = parseArgs(['--verbose']);
      expect(hasFlag(args, 'verbose')).toBe(true);
    });

    it('returns false for absent flags', () => {
      const args = parseArgs(['--verbose']);
      expect(hasFlag(args, 'debug')).toBe(false);
    });
  });

  describe('getValue', () => {
    it('returns value for present keys', () => {
      const args = parseArgs(['--profile=dev']);
      expect(getValue(args, 'profile')).toBe('dev');
    });

    it('returns undefined for absent keys', () => {
      const args = parseArgs(['--profile=dev']);
      expect(getValue(args, 'region')).toBeUndefined();
    });
  });
});
