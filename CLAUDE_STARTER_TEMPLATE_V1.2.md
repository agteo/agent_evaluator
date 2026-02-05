# Claude Code Project Starter Template (2025 Edition)

**Version 1.2** - Critical workflow enforcement improvements to prevent premature implementation

## 🔄 What's New in V1.2

**Critical Improvements:**
- 🛑 Added prominent "STOP" section at top of CLAUDE.md to prevent rushing to implementation
- 📊 Added decision tree for when to research vs. implement
- ⚠️ Added anti-patterns section showing what NOT to do
- ✅ Added getting started checklist to reinforce workflow
- 🎯 Made agent usage more prominent with invocation examples
- 🚨 Added "red flags" list to catch workflow violations

**Why V1.2?** Testing revealed that even with workflow principles documented, AI assistants would jump to implementation without research. V1.2 makes the workflow impossible to miss and provides clear decision points.

---

## 📋 What's Included

This comprehensive template provides everything you need for Claude Code:

**Core (Everyone):**
- ✅ CLAUDE.md with **enforced workflow controls** (NEW in V1.2)
- ✅ 4-agent workflow (researcher, architect, implementer, reviewer)
- ✅ 4 essential commands (feature-design, implement-with-tests, code-review, daily-dev-startup)
- ✅ .claudeignore template
- ✅ # key integration for capturing learnings
- ✅ Database setup guidance (optional - Supabase MCP integration included)

**Optional Enhancements:**
- 🎯 **Solo Founder**: CLAUDE.local.md for personal preferences
- 👥 **Team Features**: .mcp.json, team workflows, shared conventions
- 🚀 **Advanced**: Plugin structure, skills directory, hooks system

## 🎯 Who This Is For

- ✅ **Solo Founders**: Start with Core Setup + Solo Optimizations
- ✅ **Small Teams (2-5)**: Add Team Features section
- ✅ **Growing Teams (5+)**: Include Advanced Features
- ✅ **Open Source**: Use Plugin Structure for distribution

## 🚀 Quick Start (5 Minutes)

1. Copy the sections you need from this template
2. Replace all `[REPLACE: ...]` placeholders with your project details
3. **CRITICAL**: Include the "STOP" section at the top of CLAUDE.md
4. Run `claude` then `/init` in your project directory
5. Start using `/feature-design` for your first feature (includes built-in research)

**⚠️ IMPORTANT**: The workflow is designed to PREVENT rushing into code. If you find Claude implementing without research → your CLAUDE.md is missing the "STOP" section from this V1.2 template.

---

# 🎯 CORE SETUP (Everyone Uses This)

## STEP 1: Create CLAUDE.md in your project root

```markdown
# CLAUDE.md

⚠️ **CRITICAL: READ THIS FIRST BEFORE ANY WORK** ⚠️

## 🛑 STOP: Before You Start ANY Implementation

**Ask yourself these questions:**

1. ❓ **Have I researched?** Did I read relevant files and understand existing patterns?
2. ❓ **Have I planned?** Did I create an explicit implementation plan with trade-offs?
3. ❓ **Does the user approve?** Did they explicitly approve my approach?

**If ANY answer is NO → Use the appropriate agent FIRST:**

- 🔍 **Unknown codebase/patterns?** → Use Task tool with `subagent_type="researcher"`
- 🏗️ **Need architecture plan?** → Use Task tool with `subagent_type="architect"`
- ⚡ **Simple, well-defined task?** → Proceed directly (rare - only for trivial changes!)

**Decision Tree:**

\`\`\`
New feature/task request?
    ↓
Is it trivial? (< 5 lines, no architectural impact, no new files)
    ├─ YES → Proceed with implementation
    └─ NO → ↓
         ↓
Have I explored the codebase for this area?
    ├─ NO → 🔍 USE RESEARCHER AGENT FIRST
    └─ YES → ↓
         ↓
Do I have an explicit plan with trade-offs?
    ├─ NO → 🏗️ USE ARCHITECT AGENT FIRST
    └─ YES → ↓
         ↓
Has the user approved the plan?
    ├─ NO → 📋 PRESENT PLAN, GET APPROVAL
    └─ YES → ⚡ USE IMPLEMENTER AGENT (TDD)
         ↓
    🔍 USE REVIEWER AGENT before committing
\`\`\`

**Default Rule**: When in doubt, RESEARCH FIRST. Never guess. Never assume.

### ⚠️ Red Flags (You're Doing It Wrong)

If you find yourself saying/thinking:
- ❌ "Let me create some files..."
- ❌ "I'll set up a basic structure..."
- ❌ "Here's a simple implementation..."
- ❌ "Let me initialize..."
- ❌ "I'll start by creating..."

**STOP!** → You skipped research/planning. Go back to the decision tree.

**Correct phrases:**
- ✅ "Let me first research existing patterns..."
- ✅ "I need to understand how this codebase handles..."
- ✅ "Let me use the researcher agent to explore..."
- ✅ "Before implementing, let me plan the architecture..."

---

## Getting Started Checklist

**Before writing ANY code in this project:**

- [ ] I have read CLAUDE.md completely, including the STOP section
- [ ] I understand the tech stack and architecture patterns
- [ ] I know which agent to use for different tasks
- [ ] I have configured .claudeignore to exclude noise

**For each new task (MANDATORY):**

- [ ] **Research**: Used researcher agent to explore codebase and find similar patterns
- [ ] **Plan**: Used architect agent to create explicit plan with trade-offs
- [ ] **Approval**: Presented plan to user and received explicit approval
- [ ] **Implement**: Following TDD, wrote tests first
- [ ] **Review**: Used reviewer agent for security and quality checks

**If you can't check all boxes → You're skipping steps!**

---

## Project Overview

[REPLACE: Brief description of what this project does and its main purpose]

**Type**: [REPLACE: Web app, API, CLI tool, mobile app, library, etc.]
**Status**: [REPLACE: New project, active development, production, maintenance]

---

## Tech Stack

- **Primary Language**: [REPLACE: e.g., TypeScript, Python, Go, Rust, Java]
- **Framework**: [REPLACE: e.g., React, Next.js, Django, FastAPI, Express, Spring Boot]
- **Database**: [REPLACE: e.g., PostgreSQL, MongoDB, MySQL, Redis]
- **Testing**: [REPLACE: e.g., Jest, pytest, Go test, JUnit]
- **Key Dependencies**:
  - [REPLACE: List critical libraries and their purposes]

---

## Workflow Principles

⚠️ **CRITICAL**: Always follow Research → Plan → Implement → Review

**This is not optional. Skipping phases creates technical debt.**

### 1. 🔍 Research First → USE RESEARCHER AGENT

**MANDATORY for:**
- New features you haven't built before
- Touching unfamiliar parts of codebase
- Integration with external services
- Performance optimization
- Security-sensitive changes
- ANY task affecting > 1 file

**How to invoke:**
\`\`\`typescript
Task({
  subagent_type: "researcher",
  description: "Research auth patterns",
  prompt: "Explore how authentication is currently handled in this codebase. Find similar implementations, understand patterns, and document conventions."
})
\`\`\`

**What researcher provides:**
- Relevant files with line numbers
- Existing patterns to follow
- Dependencies and constraints
- What's missing or problematic

### 2. 🏗️ Plan Before Coding → USE ARCHITECT AGENT

**MANDATORY for:**
- Multi-file changes
- New architectural patterns
- Database schema changes
- API contract changes
- Anything with multiple valid approaches

**How to invoke:**
\`\`\`typescript
Task({
  subagent_type: "architect",
  description: "Plan auth implementation",
  prompt: "Based on researcher findings, create implementation plan for authentication. Provide 2-3 options with trade-offs, recommend best approach, and break down into steps."
})
\`\`\`

**What architect provides:**
- 2-3 implementation options with trade-offs
- Recommended approach with rationale
- Step-by-step implementation plan
- Files that need changes
- Security/performance considerations
- Testing strategy

### 3. ⚡ Test-Driven Development → USE IMPLEMENTER AGENT

**After research and planning approved:**
- Write tests first (TDD - red, green, refactor)
- Write minimal code to pass tests
- Ensure all tests pass before committing

**How to invoke:**
\`\`\`typescript
Task({
  subagent_type: "implementer",
  description: "Implement auth with TDD",
  prompt: "Following the approved architecture plan, implement authentication using TDD. Write tests first, then minimal code to pass."
})
\`\`\`

### 4. 🔍 Review Before Merging → USE REVIEWER AGENT

**MANDATORY before any commit:**
- Security audit (OWASP Top 10)
- Quality check (test coverage, edge cases)
- Production readiness verification

**How to invoke:**
\`\`\`typescript
Task({
  subagent_type: "reviewer",
  description: "Review auth implementation",
  prompt: "Review the authentication implementation for security vulnerabilities, code quality, test coverage, and production readiness."
})
\`\`\`

---

## Anti-Patterns to Avoid

### ❌ Bad - Jumping to Implementation

\`\`\`
User: "Add authentication"
Claude: "I'll create auth files with NextAuth..."
         ❌ NO RESEARCH! NO PLANNING!
\`\`\`

### ✅ Good - Research First

\`\`\`
User: "Add authentication"
Claude: "Let me first use the researcher agent to understand how
         authentication is currently handled in your codebase and
         find similar patterns we should follow..."
         ✅ CORRECT WORKFLOW!
\`\`\`

### When Claude Violates Workflow

If Claude starts implementing without research:

1. **Stop immediately**: "Did we do sufficient research first?"
2. **Trigger proper workflow**: Use `/feature-design authentication`
3. **Or manually**: "Use researcher agent to explore auth patterns first"

### Common Violations

❌ **Files created before understanding codebase**
❌ **Multiple service boundaries without architecture discussion**
❌ **Technology choices without comparing options**
❌ **Implementation started before user approved plan**
❌ **"Let me set up..." without "Let me research..."**

---

## Common Commands

### Development
- **Build**: `[REPLACE: e.g., npm run build, make build, go build]`
- **Test**: `[REPLACE: e.g., npm test, pytest, go test ./...]`
- **Lint**: `[REPLACE: e.g., npm run lint, pylint, golangci-lint]`
- **Dev Server**: `[REPLACE: e.g., npm run dev, python manage.py runserver]`
- **Format**: `[REPLACE: e.g., npm run format, black ., gofmt]`

### Claude Code Workflows
- `/feature-design [description]` - Research and plan new feature (4-phase workflow) **← START HERE**
- `/implement-with-tests` - Implement feature with TDD (after planning approved)
- `/code-review` - Review recent changes for security and quality
- `/daily-dev-startup` - Daily planning and task breakdown

---

## Database Setup (Optional - If Using Database)

**If your project uses a database, add this section:**

### Database Configuration
- **Provider**: [REPLACE: e.g., Supabase, PostgreSQL, MySQL, MongoDB, PlanetScale]
- **ORM/Client**: [REPLACE: e.g., Prisma, Drizzle, TypeORM, Mongoose, Supabase Client]
- **Connection**: [REPLACE: e.g., Connection pooling with Prisma, Direct Supabase client]

### Database Commands
- **Migrate**: `[REPLACE: e.g., npm run db:migrate, supabase db push, prisma migrate deploy]`
- **Rollback**: `[REPLACE: e.g., npm run db:rollback, supabase db reset]`
- **Seed**: `[REPLACE: e.g., npm run db:seed, supabase db seed]`
- **Studio/Admin**: `[REPLACE: e.g., supabase studio, prisma studio, npm run db:studio]`
- **Generate Types**: `[REPLACE: e.g., supabase gen types, prisma generate]`

### Migration Best Practices
- Always test migrations locally first (never test on production)
- Include rollback migrations for every change
- Review migrations in code review (use reviewer agent)
- Never make destructive changes without backups
- Document complex migrations with comments
- Use transactions for multi-step migrations

### MCP Integration (For Supabase Users)

If using Supabase, you can integrate via MCP for AI-assisted database management.

**Add to `.mcp.json`:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<development-token>"
      }
    }
  }
}
```

**Security - CRITICAL:**
- ⚠️ **Only connect to DEVELOPMENT Supabase project**
- ❌ **NEVER connect to production via MCP**
- ✅ Use read-only mode if you must access production data
- ✅ Separate access tokens for dev/staging/production
- ✅ Project-scoped mode to limit access

**What Supabase MCP enables:**
- Create and manage database tables
- Generate and run migrations
- Query data using natural language → SQL
- Generate TypeScript types from schema
- Manage authentication and storage

**Learn more:** [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)

---

## Architecture Patterns

[REPLACE: Document your key architectural decisions]

**Examples:**
- **State Management**: [e.g., Redux with slices, Context API, Zustand]
- **Business Logic**: [e.g., Service layer pattern, Domain-driven design]
- **API Design**: [e.g., RESTful, GraphQL, gRPC]
- **File Organization**: [e.g., Feature-based folders, Layer-based structure]
- **Error Handling**: [e.g., Custom error classes, Error boundaries]
- **Authentication**: [e.g., JWT tokens, OAuth 2.0, Session-based]

---

## Code Conventions

[REPLACE: Your specific code style - keep concise, avoid detailed rules]

**Examples:**
- **Naming**: camelCase for variables, PascalCase for components, UPPER_CASE for constants
- **File Structure**: One component per file, co-locate tests
- **Import Order**: External libraries → Internal modules → Types → Styles
- **Comments**: JSDoc for public APIs, inline for complex logic only

---

## Testing Strategy

- **Unit Tests**: All business logic, utilities, and pure functions
- **Integration Tests**: API endpoints, database interactions, external services
- **E2E Tests**: Critical user flows (login, checkout, core features)
- **Coverage Target**: [REPLACE: e.g., 80%+, 90%+ for critical paths]

**Test Naming**: [REPLACE: e.g., `describe('ComponentName')` and `it('should do something')`]

---

## Security Considerations

- Never commit secrets, API keys, or credentials to repository
- Always validate and sanitize user input
- Use parameterized queries (prevent SQL injection)
- Implement proper authentication and authorization
- Follow OWASP Top 10 guidelines
- Use HTTPS for all external communications
- [REPLACE: Add any project-specific security requirements]

---

## Thinking Budget Guidelines

Use these phrases to control Claude's reasoning depth:

- **Default**: Standard reasoning for routine tasks
- **"think"**: Straightforward implementations, simple features
- **"think hard"**: Complex features requiring deeper reasoning
- **"think harder"**: Architectural decisions, refactoring strategy
- **"ultrathink"**: Security-critical code, performance-critical paths

---

## Project-Specific Context

[REPLACE: Anything else Claude needs to know about this project]

**Examples:**
- **Special Quirks**: Legacy code in /old directory, avoid touching it
- **External Services**: Stripe for payments, SendGrid for emails
- **Known Technical Debt**: Authentication needs refactoring, old API v1 deprecated
- **Migration Plans**: Moving to microservices Q3, TypeScript migration in progress
- **Performance Constraints**: Must support 10k concurrent users
- **Deployment**: Auto-deploys to staging on merge to main, manual prod deploys

---

## File Structure

```
[REPLACE: Your project structure]

Example:
.
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript types
│   └── tests/          # Test files
├── public/             # Static assets
├── .claude/
│   ├── agents/         # Custom agents
│   └── commands/       # Workflow commands
├── CLAUDE.md           # This file
└── package.json
```

---

## Capturing Learnings with # Key

Press `#` during Claude Code sessions to add instructions that Claude will automatically incorporate into this CLAUDE.md.

**When to use #:**
- Discovered a new coding pattern
- Found a common mistake to avoid
- Learned a project-specific convention
- Want to document a command or workflow

Claude will suggest where to add it, and you can review before accepting.

---

## CLAUDE.md Best Practices

### Keep It Concise
- Claude has limited context space - your code needs most of it
- Include only what Claude can't easily infer from code
- Remove sections that aren't being followed

### What NOT to Include
- ❌ Detailed code style rules (use linters instead - LLMs are slow and expensive for this)
- ❌ Sensitive information, API keys, or credentials
- ❌ Extensive documentation (link to docs instead)
- ❌ Information already in package.json or config files

### What TO Include
- ✅ Non-obvious architectural decisions and why they were made
- ✅ Project-specific conventions that aren't standard
- ✅ Key commands and workflows
- ✅ Common pitfalls and how to avoid them
- ✅ Where to find things in the codebase (especially for monorepos)

### Start Simple, Iterate
- Begin with basic structure and key commands
- Add sections based on actual friction points you encounter
- Review and refine monthly based on usage
- This file should evolve with your project

---

## Imports (Optional - For Modularity)

You can import additional context files to keep this main file focused:

```markdown
<!-- Uncomment and create files as needed -->
<!-- @.claude/context/architecture.md -->
<!-- @.claude/context/security-requirements.md -->
<!-- @.claude/context/api-design-patterns.md -->
```

**Benefits of imports:**
- Keeps main CLAUDE.md focused and readable
- Separate team-wide from project-specific context
- Easier to maintain modular documentation

**To use imports:**
1. Create `.claude/context/` directory
2. Add markdown files with specific context
3. Reference them with `@path/to/file.md` syntax

---

## Getting Started for New Contributors

1. [REPLACE: Installation steps]
2. [REPLACE: Environment setup]
3. [REPLACE: Initial configuration]
4. [REPLACE: Run development server]
5. **Read this CLAUDE.md file completely, especially the STOP section**
6. Use `/feature-design` before implementing features (enforces proper workflow)
```

Save this as **`CLAUDE.md`** in your project root.

---

## STEP 2-4: Agents, Commands, and .claudeignore

**For agents, commands, and .claudeignore files, use the same content as V1.1.**

The key improvements in V1.2 are in the CLAUDE.md structure itself:
1. Prominent STOP section at the top
2. Decision tree for when to research
3. Anti-patterns section
4. Getting started checklist
5. Red flags list
6. More prominent agent invocation examples

Refer to **CLAUDE_STARTER_TEMPLATE_V1.1.md** (STEP 2-4) for the complete agent and command definitions, which remain unchanged.

---

# 📊 V1.2 Improvements Summary

## What Was Wrong in V1.1

Even with "Research → Plan → Implement → Review" documented on line 65, Claude would still:
1. Jump to implementation when asked to "start building"
2. Create files/folders without researching existing patterns
3. Make technology choices without exploring alternatives
4. Skip the planning phase entirely

## How V1.2 Fixes This

1. **🛑 STOP Section**: Impossible to miss at the top
2. **📊 Decision Tree**: Clear logic for when to research
3. **⚠️ Red Flags**: Catches workflow violations in real-time
4. **✅ Checklist**: Forces acknowledgment of each step
5. **🎯 Prominent Examples**: Shows exact agent invocation syntax
6. **❌ Anti-Patterns**: Shows what NOT to do

## Testing V1.2

To verify this template works:

```
Test Case: "Review the claude.md file and start the building process"

Expected Behavior (V1.2):
1. Claude reads CLAUDE.md
2. Sees STOP section
3. Recognizes no research has been done
4. Uses researcher agent FIRST
5. Then architect agent for planning
6. Gets user approval
7. THEN implements

Actual Result: ✅ Claude stopped and asked "Did we do sufficient research first?"
```

---

# 🎯 When to Use V1.2 vs V1.1

**Use V1.2 if:**
- ✅ You're starting a new project
- ✅ Claude keeps jumping to implementation
- ✅ You want stricter workflow enforcement
- ✅ You need clear decision trees

**Use V1.1 if:**
- ⚠️ You have an existing CLAUDE.md and don't want major changes
- ⚠️ You prefer less prescriptive guidance
- ⚠️ Your team already follows the workflow reliably

**Migration Path**: V1.1 → V1.2
1. Copy the STOP section to the top of your existing CLAUDE.md
2. Add the decision tree
3. Add the anti-patterns section
4. Add the getting started checklist
5. Keep everything else the same

---

**This template is a living document.** Start simple, iterate based on what works, and add complexity only when needed.

🚀 **Ready to start building with properly enforced AI-assisted development!**
