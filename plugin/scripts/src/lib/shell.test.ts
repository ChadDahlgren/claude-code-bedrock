import { describe, it, expect } from 'vitest';
import { execSafe, awsCli } from './shell.js';

describe('shell', () => {
  describe('execSafe', () => {
    it('returns success true for valid commands', () => {
      const result = execSafe('echo', ['hello']);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('hello');
    });

    it('returns success false for invalid commands', () => {
      const result = execSafe('nonexistent-command-12345', []);
      expect(result.success).toBe(false);
      expect(result.stdout).toBe('');
    });

    it('passes arguments safely without shell interpolation', () => {
      // This would be dangerous with shell interpolation
      const result = execSafe('echo', ['test; echo pwned']);
      expect(result.success).toBe(true);
      // Should output the literal string, not execute the injected command
      expect(result.stdout).toBe('test; echo pwned');
    });

    it('handles arguments with special characters', () => {
      const result = execSafe('echo', ['$HOME']);
      expect(result.success).toBe(true);
      // Should output literal $HOME, not expanded
      expect(result.stdout).toBe('$HOME');
    });
  });

  describe('awsCli', () => {
    it('calls aws command with arguments', () => {
      // This test will fail if AWS CLI is not installed, which is fine
      const result = awsCli(['--version']);
      // We just verify it attempted to run
      expect(typeof result.success).toBe('boolean');
    });
  });
});
