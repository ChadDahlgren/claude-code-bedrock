import { describe, it, expect } from 'vitest';
import { getBedrockRegions } from './aws.js';
describe('aws', () => {
    describe('getBedrockRegions', () => {
        it('returns known regions when no profile region specified', () => {
            const regions = getBedrockRegions();
            expect(regions.length).toBeGreaterThan(0);
            expect(regions).toContain('us-east-1');
            expect(regions).toContain('us-west-2');
            expect(regions).toContain('eu-west-1');
        });
        it('prioritizes profile region when specified', () => {
            const regions = getBedrockRegions('eu-central-1');
            expect(regions[0]).toBe('eu-central-1');
            // Should still contain other regions after
            expect(regions).toContain('us-east-1');
        });
        it('adds unknown profile region to beginning', () => {
            // Test that a new region (not in known list) gets added first
            const regions = getBedrockRegions('ap-newregion-1');
            expect(regions[0]).toBe('ap-newregion-1');
            // Original regions should still be present
            expect(regions).toContain('us-east-1');
        });
        it('does not duplicate profile region', () => {
            const regions = getBedrockRegions('us-east-1');
            // us-east-1 should only appear once, at the beginning
            const count = regions.filter(r => r === 'us-east-1').length;
            expect(count).toBe(1);
            expect(regions[0]).toBe('us-east-1');
        });
        it('handles null profile region', () => {
            const regions = getBedrockRegions(null);
            expect(regions.length).toBeGreaterThan(0);
            expect(regions).toContain('us-west-2');
        });
        it('handles undefined profile region', () => {
            const regions = getBedrockRegions(undefined);
            expect(regions.length).toBeGreaterThan(0);
        });
        it('includes all major AWS regions', () => {
            const regions = getBedrockRegions();
            // Check for presence of major regions
            expect(regions).toContain('us-east-1'); // N. Virginia
            expect(regions).toContain('us-west-2'); // Oregon
            expect(regions).toContain('eu-west-1'); // Ireland
            expect(regions).toContain('ap-northeast-1'); // Tokyo
            expect(regions).toContain('ap-southeast-1'); // Singapore
        });
    });
    // Note: Testing functions that call AWS CLI would require mocking
    // The following tests document expected behavior but need mocks to run
    //
    // describe('listProfiles', () => {
    //   it('returns array of profile names');
    //   it('returns empty array on error');
    // });
    //
    // describe('getCallerIdentity', () => {
    //   it('returns identity for valid profile');
    //   it('returns null identity with error for invalid profile');
    // });
    //
    // describe('exportCredentials', () => {
    //   it('parses credential output correctly');
    //   it('handles credentials with equals in value');
    //   it('returns null for expired credentials');
    // });
    //
    // describe('listInferenceProfiles', () => {
    //   it('returns array of inference profiles');
    //   it('extracts model ID from ARN');
    //   it('returns empty array on error');
    // });
});
