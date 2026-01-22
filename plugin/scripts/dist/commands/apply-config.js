// Apply Bedrock configuration to Claude settings
import { success, failure } from '../lib/output.js';
import { applyBedrockConfig, removeBedrockConfig, getSettingsPath } from '../lib/config.js';
import { getCallerIdentity, listInferenceProfiles } from '../lib/aws.js';
import { parseArgs, hasFlag, getValue } from '../lib/args.js';
// Alternate regions to suggest on failure
const ALTERNATE_REGIONS = ['us-west-2', 'us-east-1', 'eu-west-1'];
export function applyConfig() {
    const args = parseArgs();
    // Handle remove
    if (hasFlag(args, 'remove')) {
        removeBedrockConfig();
        success({
            removed: true,
            settingsPath: getSettingsPath()
        });
        return;
    }
    // Get values
    const profile = getValue(args, 'profile');
    const region = getValue(args, 'region');
    const model = getValue(args, 'model');
    // Validate required args
    if (!profile) {
        failure('Missing required argument: --profile=<profile-name>');
    }
    if (!region) {
        failure('Missing required argument: --region=<aws-region>');
    }
    if (!model) {
        failure('Missing required argument: --model=<model-id>');
    }
    // Validate profile exists and has valid credentials
    const identity = getCallerIdentity(profile);
    if (!identity) {
        failure(`Profile '${profile}' does not exist or has expired credentials. Run 'aws sso login --profile ${profile}' first.`);
    }
    // Validate Bedrock access
    const inferenceProfiles = listInferenceProfiles(profile, region);
    if (inferenceProfiles.length === 0) {
        // Check alternate regions and suggest them
        const alternates = ALTERNATE_REGIONS.filter(r => r !== region);
        const working = [];
        for (const alt of alternates) {
            if (listInferenceProfiles(profile, alt).length > 0) {
                working.push(alt);
                if (working.length >= 2)
                    break;
            }
        }
        let msg = `Profile '${profile}' does not have Bedrock access in region '${region}'.`;
        if (working.length > 0) {
            msg += ` Try: ${working.join(' or ')}`;
        }
        else {
            msg += ' Check IAM permissions.';
        }
        failure(msg);
    }
    // Validate model exists
    const modelExists = inferenceProfiles.some(p => p.profileId === model ||
        p.profileId.includes(model) ||
        p.profileName.toLowerCase().includes(model.toLowerCase()));
    if (!modelExists) {
        const available = inferenceProfiles.map(p => p.profileId).join(', ');
        failure(`Model '${model}' not found. Available: ${available}`);
    }
    // Apply configuration
    applyBedrockConfig({ profile: profile, region: region, model: model });
    success({
        applied: true,
        config: { profile: profile, region: region, model: model },
        settingsPath: getSettingsPath(),
        requiresRestart: true
    });
}
