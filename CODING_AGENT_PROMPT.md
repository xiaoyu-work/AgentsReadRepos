# Repository Agent-Readability Migration Prompt

Copy the complete fenced block below into a coding agent and run it from the
target repository root. Replace `<CHECKER_PATH>` with the absolute path to
`check-agent-readability.mjs`. The auditor requires Node.js 18 or later and no
third-party npm packages.

```text
Migrate the current repository so future coding agents can understand it accurately with less searching and less context consumption.

Keep document responsibilities strictly separated:
- Root AGENTS.md contains agent workflow, commands, conventions, and documentation update rules only.
- Root ARCHITECTURE.md contains system architecture only.
- Significant-directory MODULE.md files contain local module facts only.
- .agent/repo-map.json contains the machine-readable index.
- Source-file @agent-* headers contain file-specific facts.

Do not place architecture, component descriptions, dependency diagrams, data flow, or entry-point explanations in AGENTS.md. AGENTS.md links to ARCHITECTURE.md instead.

Final goals:
1. Create or improve the root AGENTS.md as an instruction-only document.
2. Create or improve the root ARCHITECTURE.md as the architecture source of truth.
3. Create or improve MODULE.md in every significant source directory.
4. Create a complete and accurate .agent/repo-map.json.
5. Add a fixed agent summary within the first 50 lines of every non-exempt source file.
6. Handle oversized source files safely or use the smallest justified exemption.
7. Pass the Agent-Friendly Repository Standard v1.0 auditor.

Operating rules:
- Investigate the repository fully before editing. Use symbol search, language services, manifests, existing documentation, and tests. Do not infer behavior from filenames alone.
- Preserve verified content from existing documentation. Move architecture facts found in AGENTS.md into ARCHITECTURE.md instead of discarding or duplicating them.
- Do not change product behavior, public APIs, persistence formats, or network protocols.
- Preserve the existing directory structure. Do not move, rename, merge, or reorganize existing files or directories.
- The only permitted structural additions are files extracted into the original source file's directory and the required AGENTS.md, ARCHITECTURE.md, MODULE.md, .agent/repo-map.json, and optional .agent-readability.json files.
- Work directory by directory and process only one source file at a time. Complete that file's split, references, relevant validation, header, module documentation, and map entry before starting another file.
- Do not batch refactors across multiple files or directories.
- Write concrete descriptions supported by code. Never use placeholders such as "utility code," "business logic," or "handles related operations."
- Do not pass the auditor through broad exclusions, false descriptions, empty sections, or meaningless exemptions.
- Do not modify dependencies, generated outputs, or third-party code unless the task genuinely requires it.
- Follow the repository's existing formatting and naming. Use English for the agent-readable files created by this migration.

1. Build a fact inventory
- Identify languages, build systems, package boundaries, runtime and public API entry points, primary data flows, external systems, and project commands.
- List source files and identify public or exported classes, functions, interfaces, and constants.
- Separate production code, tests, configuration, generated outputs, dependencies, and build artifacts.
- Verify existing architecture statements against code.

2. Create or improve root AGENTS.md
Use ROOT_AGENTS_TEMPLATE.md when available. AGENTS.md must contain these non-empty sections:
- Repository Documents
- Development
- Testing
- Conventions
- Agent Workflow
- Documentation Updates

Repository Documents links to ARCHITECTURE.md, .agent/repo-map.json, and relevant MODULE.md files.

AGENTS.md must not explain system purpose, component design, dependency direction, data flow, or entry points. Put those facts in ARCHITECTURE.md.

3. Create or improve root ARCHITECTURE.md
Use ARCHITECTURE_TEMPLATE.md when available. It must contain:
- Purpose
- System Context
- Components
- Dependency Rules
- Data Flow
- Entry Points
- Cross-Cutting Constraints

Describe verified system facts and link components to their MODULE.md files. Do not include agent workflow, edit sequencing, test-selection instructions, or documentation maintenance rules.

4. Create or improve significant-directory MODULE.md files
A non-root directory is significant when any condition is true:
- it directly contains at least three source files;
- it is named src, app, lib, libs, packages, services, modules, or components and recursively contains at least five source files; or
- it contains package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml, *.csproj, or an equivalent build manifest and has source files below it.

Each MODULE.md must contain:
- Purpose
- Responsibilities
- Key Files
- Dependencies
- Tests

Keep content local to that directory. Repository-wide component relationships belong in ARCHITECTURE.md. If a directory genuinely needs no MODULE.md, add one narrow exemptions.moduleGuides entry with a concrete reason.

5. Create .agent/repo-map.json
Use this structure:
{
  "schemaVersion": 1,
  "generatedAt": "<timezone-aware ISO 8601 timestamp>",
  "sourceFingerprint": "<SHA-256 printed by the auditor>",
  "entryPoints": [
    {"path": "<relative path>", "purpose": "<specific purpose>"}
  ],
  "modules": [
    {"path": "<directory>", "purpose": "<specific responsibility>", "guide": "<directory>/MODULE.md"}
  ],
  "files": [
    {
      "path": "<source-file relative path>",
      "kind": "source|test|generated|config",
      "purpose": "<the file's unique responsibility>",
      "publicSymbols": ["<public or exported symbol>"]
    }
  ]
}

Requirements:
- Use / and repository-relative paths.
- files covers every non-excluded source file.
- modules covers every non-exempt significant directory and points to its MODULE.md.
- entryPoints contains at least one runtime, reading, or public API entry.
- purpose contains at least eight non-whitespace characters and distinguishes adjacent files.
- publicSymbols contains all public or exported symbols; use [] when none exist.
- Prefer ASTs, symbol tools, and verified documentation over unreliable regular-expression guesses.

6. Add source-file agent headers one file at a time
Add this metadata within each source file's first 50 lines using native comment syntax:

@agent-file
@agent-purpose: <specific file responsibility>
@agent-public-api: <all public or exported symbols; use none when empty>
@agent-invariants: <important constraints; use none when empty>
@agent-side-effects: <I/O, network, database, or global-state effects; use none when empty>

Keep the fields in this exact order within no more than 15 lines. A shebang, encoding declaration, or required copyright header may appear first. Keep @agent-public-api consistent with the repository map. Only generated files that cannot be edited directly may use exemptions.fileHeaders.

Process one file completely before starting the next file.

7. Control source-file size
- 800 lines or fewer is recommended.
- 801-2,000 lines produces a warning and requires checking for a natural split boundary.
- More than 2,000 lines must be split safely or receive a specific exemptions.oversizedFiles entry.

Required split sequence:
1. Select one directory and do not modify other directories yet.
2. Select one oversized file and do not split other files yet.
3. Extract independent responsibilities into new files in the original file's directory.
4. Repair related imports, exports, registrations, and test references.
5. Run the narrowest existing validation covering that file.
6. Update the file header, local MODULE.md, repository map, and fingerprint.
7. Finish that file before processing the next file; finish the directory before entering another directory.

Never accumulate multiple file or directory splits into one broad refactor.

8. Configure only necessary exemptions
Create .agent-readability.json only when needed:
{
  "version": 1,
  "exemptions": {
    "oversizedFiles": {"path/to/file": "specific reason"},
    "moduleGuides": {"path/to/directory": "specific reason"},
    "mapFiles": {"path/to/file": "specific reason"},
    "fileHeaders": {"path/to/generated-file": "generation source and why direct edits are impossible"}
  }
}

Keep every exemption scoped to one path. Never exclude an entire business-code root.

9. Validate and iterate
1. Run narrow relevant project validation to establish a baseline.
2. Run:
   node "<CHECKER_PATH>" . --fingerprint
3. Put the output in repo-map.json as sourceFingerprint and update generatedAt.
4. Run:
   node "<CHECKER_PATH>" .
5. Fix every error and reach at least the default score of 85. Do not lower minScore merely to pass.
6. If source changed, run the existing tests, type checks, or builds covering that behavior.
7. Run the auditor again and confirm that the fingerprint is current.

Before completion:
- Compare at least three map entries and file headers with source.
- Trace at least one call chain from every entry point and verify ARCHITECTURE.md.
- Confirm documented commands and MODULE.md paths.
- Confirm AGENTS.md contains instructions only and ARCHITECTURE.md contains architecture only.

The final response should state only:
- which agent instructions, architecture, module guides, map entries, and headers were created or updated;
- which exemptions remain and why;
- the auditor's final score; and
- when source changed, which relevant validations ran.
```

