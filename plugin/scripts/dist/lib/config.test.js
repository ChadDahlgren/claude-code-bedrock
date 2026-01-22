import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
// Create temp directory for tests
let testDir;
let mockPaths;
beforeAll(() => {
    testDir = mkdtempSync(join(tmpdir(), 'claude-config-test-'));
    mockPaths = {
        SETTINGS_FILE: join(testDir, 'settings.json'),
        SETTINGS_BACKUP: join(testDir, 'settings.json.backup'),
        SETTINGS_TEMP: join(testDir, 'settings.json.tmp'),
    };
});
afterAll(() => {
    try {
        rmSync(testDir, { recursive: true });
    }
    catch { /* ignore */ }
});
// Mock constants before importing config
vi.mock('./constants.js', async (importOriginal) => {
    const original = await importOriginal();
    // We need to recreate the temp dir path here since vi.mock is hoisted
    const tempTestDir = mkdtempSync(join(tmpdir(), 'claude-config-mock-'));
    return {
        ...original,
        PATHS: {
            SETTINGS_FILE: join(tempTestDir, 'settings.json'),
            SETTINGS_BACKUP: join(tempTestDir, 'settings.json.backup'),
            SETTINGS_TEMP: join(tempTestDir, 'settings.json.tmp'),
        },
        // Store the dir for cleanup
        __testDir: tempTestDir,
    };
});
// Import after mocking - need to get the paths from the mock
import * as constants from './constants.js';
import { readSettings, readSettingsWithContext, writeSettings, getBedrockConfig, isBedrockConfigured, hasBackup, restoreFromBackup, cleanupTempFiles, } from './config.js';
// Get actual paths from mock
const SETTINGS_PATH = constants.PATHS.SETTINGS_FILE;
const BACKUP_PATH = constants.PATHS.SETTINGS_BACKUP;
const TEMP_PATH = constants.PATHS.SETTINGS_TEMP;
const MOCK_DIR = constants.__testDir;
describe('config', () => {
    beforeEach(() => {
        // Clean up any existing files
        try {
            rmSync(SETTINGS_PATH);
        }
        catch { /* ignore */ }
        try {
            rmSync(BACKUP_PATH);
        }
        catch { /* ignore */ }
        try {
            rmSync(TEMP_PATH);
        }
        catch { /* ignore */ }
    });
    afterAll(() => {
        // Clean up mock dir
        try {
            rmSync(MOCK_DIR, { recursive: true });
        }
        catch { /* ignore */ }
    });
    describe('readSettings', () => {
        it('returns empty object when file does not exist', () => {
            const settings = readSettings();
            expect(settings).toEqual({});
        });
        it('returns empty object for empty file', () => {
            writeFileSync(SETTINGS_PATH, '');
            const settings = readSettings();
            expect(settings).toEqual({});
        });
        it('parses valid JSON settings', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ env: { TEST: 'value' } }));
            const settings = readSettings();
            expect(settings.env?.TEST).toBe('value');
        });
        it('returns empty object for corrupted JSON', () => {
            writeFileSync(SETTINGS_PATH, '{ invalid json }');
            const settings = readSettings();
            expect(settings).toEqual({});
        });
    });
    describe('readSettingsWithContext', () => {
        it('flags corrupted JSON', () => {
            writeFileSync(SETTINGS_PATH, '{ not valid json');
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe('CONFIG_CORRUPTED');
        });
        it('does not flag valid JSON', () => {
            writeFileSync(SETTINGS_PATH, '{}');
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBeUndefined();
            expect(result.error).toBeUndefined();
        });
        it('validates schema - rejects non-object env', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ env: 'not an object' }));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
            expect(result.error?.details).toContain('env must be an object');
        });
        it('validates schema - rejects non-string env values', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ env: { TEST: 123 } }));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
            expect(result.error?.details).toContain('must be a string');
        });
        it('validates schema - rejects array env', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ env: ['not', 'valid'] }));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
        });
        it('validates schema - rejects non-string awsAuthRefresh', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ awsAuthRefresh: 123 }));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
            expect(result.error?.details).toContain('awsAuthRefresh must be a string');
        });
        it('validates schema - rejects non-string model', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ model: { nested: 'object' } }));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBe(true);
            expect(result.error?.details).toContain('model must be a string');
        });
        it('accepts valid complete settings', () => {
            const validSettings = {
                env: {
                    CLAUDE_CODE_USE_BEDROCK: '1',
                    AWS_PROFILE: 'myprofile',
                    AWS_REGION: 'us-west-2',
                },
                awsAuthRefresh: 'aws sso login --profile myprofile',
                model: 'claude-3-opus',
                otherKey: 'allowed',
            };
            writeFileSync(SETTINGS_PATH, JSON.stringify(validSettings));
            const result = readSettingsWithContext();
            expect(result.wasCorrupted).toBeUndefined();
            expect(result.settings.env?.AWS_PROFILE).toBe('myprofile');
        });
    });
    describe('writeSettings', () => {
        it('creates settings file if it does not exist', () => {
            writeSettings({ env: { TEST: 'value' } });
            const content = readFileSync(SETTINGS_PATH, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed.env.TEST).toBe('value');
        });
        it('merges with existing settings', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ existing: 'value', env: { A: '1' } }));
            writeSettings({ env: { B: '2' } });
            const content = readFileSync(SETTINGS_PATH, 'utf-8');
            const parsed = JSON.parse(content);
            expect(parsed.existing).toBe('value');
            expect(parsed.env.B).toBe('2');
        });
        it('creates backup before writing', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({ original: 'data' }));
            writeSettings({ new: 'data' });
            expect(hasBackup()).toBe(true);
            const backup = readFileSync(BACKUP_PATH, 'utf-8');
            expect(JSON.parse(backup).original).toBe('data');
        });
    });
    describe('getBedrockConfig', () => {
        it('returns null when not configured', () => {
            writeFileSync(SETTINGS_PATH, '{}');
            expect(getBedrockConfig()).toBeNull();
        });
        it('returns null when CLAUDE_CODE_USE_BEDROCK is not 1', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({
                env: { CLAUDE_CODE_USE_BEDROCK: '0' }
            }));
            expect(getBedrockConfig()).toBeNull();
        });
        it('returns config when properly configured', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({
                env: {
                    CLAUDE_CODE_USE_BEDROCK: '1',
                    AWS_PROFILE: 'myprofile',
                    AWS_REGION: 'us-west-2',
                    ANTHROPIC_MODEL: 'claude-model',
                }
            }));
            const config = getBedrockConfig();
            expect(config).not.toBeNull();
            expect(config?.profile).toBe('myprofile');
            expect(config?.region).toBe('us-west-2');
            expect(config?.model).toBe('claude-model');
        });
    });
    describe('isBedrockConfigured', () => {
        it('returns false when not configured', () => {
            writeFileSync(SETTINGS_PATH, '{}');
            expect(isBedrockConfigured()).toBe(false);
        });
        it('returns true when configured', () => {
            writeFileSync(SETTINGS_PATH, JSON.stringify({
                env: { CLAUDE_CODE_USE_BEDROCK: '1' }
            }));
            expect(isBedrockConfigured()).toBe(true);
        });
    });
    describe('hasBackup', () => {
        it('returns false when no backup exists', () => {
            expect(hasBackup()).toBe(false);
        });
        it('returns true when backup exists', () => {
            writeFileSync(BACKUP_PATH, '{}');
            expect(hasBackup()).toBe(true);
        });
    });
    describe('restoreFromBackup', () => {
        it('returns false when no backup exists', () => {
            expect(restoreFromBackup()).toBe(false);
        });
        it('restores from valid backup', () => {
            writeFileSync(BACKUP_PATH, JSON.stringify({ restored: 'data' }));
            expect(restoreFromBackup()).toBe(true);
            const content = readFileSync(SETTINGS_PATH, 'utf-8');
            expect(JSON.parse(content).restored).toBe('data');
        });
        it('returns false for invalid backup JSON', () => {
            writeFileSync(BACKUP_PATH, 'not valid json');
            expect(restoreFromBackup()).toBe(false);
        });
    });
    describe('cleanupTempFiles', () => {
        it('removes temp file if it exists', () => {
            writeFileSync(TEMP_PATH, 'temp content');
            cleanupTempFiles();
            expect(existsSync(TEMP_PATH)).toBe(false);
        });
        it('does not throw if temp file does not exist', () => {
            expect(() => cleanupTempFiles()).not.toThrow();
        });
    });
});
