# Provider Playbook Specification

## Overview

A standardized markdown format for defining provider setup flows that Claude follows like a script.

## Core Principles

1. **AI-Native Design** - Written FOR Claude to execute, not for humans to read
2. **Declarative Over Procedural** - Describe WHAT should be true, not HOW
3. **Composability** - SKILL.md for knowledge, PLAYBOOK.md for execution
4. **Fail Fast, Recover Gracefully** - Check prerequisites, provide rollback

## File Structure

```
skills/
  {provider}-setup/
    PLAYBOOK.md        <- Executable setup flow (the script)
    SKILL.md           <- Reference knowledge (the background)
```

## Required Sections

### 1. META
Execution context for Claude.

```markdown
## META
execution_mode: interactive
user_confirmation_required: true
preserve_existing_config: true
estimated_duration: 3-5 minutes
skill_reference: ./SKILL.md
```

### 2. PREREQUISITES
What must be true before starting. Claude checks these FIRST.

```markdown
## PREREQUISITES

### Required
- [ ] Operating system is macOS or Linux
- [ ] Internet connectivity
- [ ] ~/.claude directory exists

### Check Commands
```check:aws-cli
which aws && aws --version
```

### On Prerequisite Failure
- Explain what's missing
- Offer to fix it (if possible)
- Allow user to abort
```

### 3. VARIABLES
Values collected during execution.

```markdown
## VARIABLES

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| profile_name | string | yes | - | AWS SSO profile |
| bedrock_region | enum | yes | us-west-2 | Bedrock region |
| model_id | string | no | auto | Model to use |
```

### 4. FLOW
High-level sequence with decision points.

```markdown
## FLOW

1. CLI_CHECK: Is required CLI installed?
2. PROFILE_CHECK: Do existing profiles exist?
3. AUTH_CHECK: Did authentication succeed?
4. USER_CONFIRM: Does user want to proceed?
```

### 5. STEPS
Detailed implementation. Each step has:
- Unique ID for reference
- Decision point it relates to
- Action to perform
- on_success / on_failure handlers

```markdown
## STEPS

### Step 1: Check CLI
```step:check-cli
id: cli_check
description: Verify CLI is installed

action:
  run: which aws && aws --version

on_success:
  - Continue to: profile_check

on_failure:
  - Use AskUserQuestion: "Install with Homebrew?"
  - If yes: Run "brew install awscli"
  - If no: Exit with instructions
```
```

### 6. ERROR_HANDLERS
How to handle specific failures.

```markdown
## ERROR_HANDLERS

### auth_failed
```error:auth_failed
trigger: SSO login fails
severity: recoverable

recovery:
  - Display troubleshooting steps
  - Offer retry
```
```

### 7. ROLLBACK
How to undo changes.

```markdown
## ROLLBACK

### Manual Instructions
Always show user:
```
To undo manually:
1. Open ~/.claude/settings.json
2. Set "CLAUDE_CODE_USE_BEDROCK": "0"
3. Changes take effect immediately
```
```

### 8. CONFIG_SCHEMA
What gets written to settings.json.

```markdown
## CONFIG_SCHEMA

### Target File
`~/.claude/settings.json`

### Merge Strategy
- Read existing (or start with {})
- Deep merge new values
- NEVER delete unrelated keys

### Schema
```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_PROFILE": "{profile_name}",
    "AWS_REGION": "{bedrock_region}"
  },
  "bedrockAuthRefresh": "aws sso login --profile {profile_name}"
}
```
```

### 9. SUCCESS_CRITERIA
How to verify setup worked.

```markdown
## SUCCESS_CRITERIA

### Verification
- Read settings.json
- Assert: CLAUDE_CODE_USE_BEDROCK == "1"
- Assert: AWS_PROFILE is set

### Success Message
```
✓ AWS Bedrock configured

Provider: AWS Bedrock
Profile:  {profile_name}
Region:   {bedrock_region}

Ready to use (no restart needed).

If something breaks, set CLAUDE_CODE_USE_BEDROCK to "0"
```
```

## Guidelines

### DO:
- Use explicit decision points
- Provide escape hatches (user can cancel anytime)
- Show work before doing
- Verify after acting
- Reference tools by name (AskUserQuestion, Bash, Read, Write)
- Include timing hints

### DON'T:
- Embed logic in prose
- Assume state without verifying
- Use wrapper scripts (direct CLI commands are better)
- Hardcode values (use variables)
- Forget rollback instructions

## Conditional Logic Patterns

### Pattern 1: Check-and-Branch
```markdown
```step:check-something
id: some_check

action:
  run: some-command

on_success:
  - Continue to: step_if_exists

on_failure:
  - Continue to: step_if_not_exists
```
```

### Pattern 2: User Choice
```markdown
```step:user-decision
action:
  - Use AskUserQuestion:
      question: "How to proceed?"
      options: ["Option A", "Option B", "Cancel"]

on_selection:
  - If "Option A": Continue to: path_a
  - If "Option B": Continue to: path_b
  - If "Cancel": Exit gracefully
```
```

## Provider Mutual Exclusivity

When enabling one provider, disable others:
```json
{
  "CLAUDE_CODE_USE_BEDROCK": "1",
  "CLAUDE_CODE_USE_VERTEX": "0"
}
```

## Migration from Current Implementation

1. **Keep**: `skills/*/SKILL.md` as reference material
2. **Create**: `skills/*/PLAYBOOK.md` following this spec
3. **Simplify**: `commands/setup.md` to just route to playbooks
4. **Delete**: Shell scripts in `/scripts/`
