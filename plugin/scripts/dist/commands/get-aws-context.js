// Get AWS context: profiles, validity, Bedrock access
import { success } from '../lib/output.js';
import { listProfiles, getCallerIdentity, exportCredentials, getConfigValue, listInferenceProfiles, getBedrockRegions } from '../lib/aws.js';
import { getBedrockConfig } from '../lib/config.js';
import { parseArgs, hasFlag, getValue } from '../lib/args.js';
import { progress, progressStep } from '../lib/progress.js';
// Bedrock regions are now fetched dynamically from aws.ts
/**
 * Filter inference profiles to only include Claude models
 */
function filterClaudeModels(profiles) {
    return profiles.filter(p => p.profileId.includes('anthropic') ||
        p.profileName.toLowerCase().includes('claude'));
}
export function getAwsContext() {
    const args = parseArgs();
    const checkBedrockFlag = hasFlag(args, 'check-bedrock');
    const specificRegion = getValue(args, 'region') || null;
    progress('Discovering AWS profiles...');
    const profiles = listProfiles();
    if (profiles.length === 0) {
        progress('No profiles found.');
        success({
            profiles: [],
            validProfiles: [],
            bedrockProfiles: [],
            recommended: null,
            currentConfig: getBedrockConfig(),
            needsSsoSetup: true
        });
        return;
    }
    progress(`Found ${profiles.length} profile(s).`);
    const profileInfos = [];
    for (let i = 0; i < profiles.length; i++) {
        const name = profiles[i];
        progressStep(i + 1, profiles.length, `Checking profile: ${name}`);
        const region = getConfigValue(name, 'region');
        const identityResult = getCallerIdentity(name);
        const identity = identityResult.identity;
        const creds = identity ? exportCredentials(name) : null;
        const info = {
            name,
            region,
            valid: identity !== null,
            identity,
            sessionExpires: creds?.expiration || null,
            bedrockAccess: false,
            inferenceProfiles: []
        };
        // Only check Bedrock if profile is valid and flag is set
        if (info.valid && checkBedrockFlag) {
            progress(`  Checking Bedrock access...`);
            // Use dynamic regions, prioritizing profile's default region
            const regionsToCheck = specificRegion ? [specificRegion] : getBedrockRegions(region);
            for (const r of regionsToCheck) {
                const allProfiles = listInferenceProfiles(name, r);
                const claudeProfiles = filterClaudeModels(allProfiles);
                if (claudeProfiles.length > 0) {
                    info.bedrockAccess = true;
                    info.inferenceProfiles = claudeProfiles;
                    if (!info.region) {
                        info.region = r; // Set region if we found Bedrock access
                    }
                    break;
                }
            }
        }
        profileInfos.push(info);
    }
    const validProfiles = profileInfos.filter(p => p.valid).map(p => p.name);
    const bedrockProfiles = profileInfos.filter(p => p.bedrockAccess).map(p => p.name);
    // Determine recommendation
    let recommended = null;
    if (bedrockProfiles.length > 0) {
        recommended = bedrockProfiles[0];
    }
    else if (validProfiles.length === 1) {
        recommended = validProfiles[0];
    }
    progress('Done.');
    success({
        profiles: profileInfos,
        validProfiles,
        bedrockProfiles,
        recommended,
        currentConfig: getBedrockConfig(),
        needsSsoSetup: validProfiles.length === 0
    });
}
