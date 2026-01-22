#!/usr/bin/env node
// Bedrock Plugin Scripts - Entry Point
// Usage: node dist/index.js <command> [options]
//
// Commands:
//   check-prerequisites           Check if AWS CLI and Node are installed
//   get-aws-context [options]     Get AWS profiles and their status
//     --check-bedrock             Also check Bedrock access (slower)
//     --region=<region>           Check specific region only
//   apply-config [options]        Apply Bedrock configuration
//     --profile=<name>            AWS profile name (required)
//     --region=<region>           AWS region (required)
//     --model=<model-id>          Model ID (required)
//     --remove                    Remove Bedrock configuration
//   test-bedrock                  Test current Bedrock configuration
//   inference-config [options]    Get or set inference settings
//     --preset=<name>             Preset: focused, balanced, thorough, or custom
//     --thinking=<tokens>         Custom thinking tokens (4096-16384)
//     --output=<tokens>           Custom output tokens (4096-16384)
import { checkPrerequisites } from './commands/check-prerequisites.js';
import { getAwsContext } from './commands/get-aws-context.js';
import { applyConfig } from './commands/apply-config.js';
import { testBedrock } from './commands/test-bedrock.js';
import { inferenceConfig } from './commands/inference-config.js';
import { failure } from './lib/output.js';
const commands = {
    'check-prerequisites': checkPrerequisites,
    'get-aws-context': getAwsContext,
    'apply-config': applyConfig,
    'test-bedrock': testBedrock,
    'inference-config': inferenceConfig,
};
function main() {
    const [command] = process.argv.slice(2);
    if (!command || command === '--help' || command === '-h') {
        console.log(`Bedrock Plugin Scripts

Usage: node dist/index.js <command> [options]

Commands:
  check-prerequisites           Check if AWS CLI and Node are installed
  get-aws-context [options]     Get AWS profiles and their status
    --check-bedrock             Also check Bedrock access (slower)
    --region=<region>           Check specific region only
  apply-config [options]        Apply Bedrock configuration
    --profile=<name>            AWS profile name (required)
    --region=<region>           AWS region (required)
    --model=<model-id>          Model ID (required)
    --remove                    Remove Bedrock configuration
  test-bedrock                  Test current Bedrock configuration
  inference-config [options]    Get or set inference settings
    --preset=<name>             Preset: focused, balanced, thorough, or custom
    --thinking=<tokens>         Custom thinking tokens (4096-16384)
    --output=<tokens>           Custom output tokens (4096-16384)
`);
        process.exit(0);
    }
    const handler = commands[command];
    if (!handler) {
        failure(`Unknown command: ${command}. Available commands: ${Object.keys(commands).join(', ')}`);
    }
    handler();
}
main();
