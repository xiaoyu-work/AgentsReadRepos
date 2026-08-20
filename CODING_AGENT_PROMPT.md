# Repository Agent-Readability Migration Prompt

Copy the complete block below into a coding agent running from the target
repository root. Replace `<CHECKER_PATH>` with the absolute path to
`check-agent-readability.mjs`.

```text
Migrate the current repository so future coding agents can identify relevant modules and files without scanning the entire codebase.

Use these information layers:
- Root AGENTS.md: global agent prompt, project commands, conventions, and update rules.
- Root ARCHITECTURE.md: project-wide architecture only.
- MODULE.md: local facts for meaningful module directories only.
- Source-file @agent-* header: file-specific purpose, public API, invariants, and side effects.
- .agent/repo-map.json: generated global index; never edit it manually.

Final goals:
1. Create or improve the single root AGENTS.md.
2. Create or improve the root ARCHITECTURE.md.
3. Create or improve MODULE.md only in detected module directories.
4. Add a valid @agent-* header to every non-exempt source file.
5. Safely handle oversized files.
6. Generate .agent/repo-map.json with the auditor.
7. Pass the Agent-Friendly Repository Standard v1.1 auditor.

Hard migration rules:
- Investigate code, symbols, manifests, existing documentation, and tests before writing descriptions.
- Preserve product behavior, public APIs, persistence formats, and network protocols.
- Preserve the existing directory structure. Do not move, rename, merge, or reorganize existing files or directories.
- New files extracted from a source file must remain in that source file's directory.
- Work on one directory at a time and one source file at a time.
- Complete one file's split, references, validation, header, and affected documentation before starting another file.
- Do not batch refactors across multiple files or directories.
- Preserve verified user documentation and unrelated working-tree changes.
- Do not use broad exclusions, false descriptions, empty sections, or meaningless exemptions to pass the auditor.
- Use English for agent-readable artifacts created by this migration.

1. Build a repository fact inventory
- Identify languages, build systems, package boundaries, runtime and public API entry points, components, dependency directions, primary data flows, external systems, and project commands.
- List source files and identify public or exported classes, functions, interfaces, and constants.
- Separate production code, tests, configuration, generated outputs, dependencies, and build artifacts.
- Verify existing documentation against source instead of trusting filenames or stale prose.

2. Create or improve root AGENTS.md
Use ROOT_AGENTS_TEMPLATE.md when available.

It must contain:
- Repository Documents
- Development
- Testing
- Conventions
- Agent Workflow
- Documentation Updates

AGENTS.md is the single global prompt. Do not create nested AGENTS.md files.
Link to ARCHITECTURE.md, .agent/repo-map.json, and applicable MODULE.md files.
Do not put component architecture, dependency diagrams, data flow, or detailed module descriptions in AGENTS.md.

3. Create or improve root ARCHITECTURE.md
It must contain:
- Purpose
- System Context
- Components
- Dependency Rules
- Data Flow
- Entry Points
- Cross-Cutting Constraints

Document verified project-wide architecture only. Do not include agent workflow, edit sequencing, or documentation-maintenance instructions.

4. Create or improve MODULE.md only for module directories
A non-root directory requires MODULE.md when any condition is true:
- it directly contains at least three source files;
- it is named src, app, lib, libs, packages, services, modules, or components and recursively contains at least five source files; or
- it contains a package or build manifest and has source files below it.

Each required MODULE.md must contain:
- Purpose
- Responsibilities
- Key Files
- Dependencies
- Tests

Keep facts local to that module. Child modules add detail instead of repeating their parents. Small leaf directories inherit their nearest parent module guide.

5. Add source-file headers one file at a time
Within the first 50 lines of every non-exempt source file, add a 5-15 line native comment block:

@agent-file
@agent-purpose: <specific responsibility with at least eight non-whitespace characters>
@agent-public-api: <all public or exported symbols, comma-separated; use none when empty>
@agent-invariants: <important constraints; use none when empty>
@agent-side-effects: <I/O, network, database, or global-state effects; use none when empty>

Keep fields in this exact order. Do not list ordinary private helpers. A shebang, encoding declaration, or legally required copyright header may appear first.

The header is the maintained source for file metadata. Do not manually duplicate its purpose or public symbols into repo-map.json.

6. Handle oversized source files
- 800 lines or fewer: no split required.
- 801-2,000 lines: inspect for a natural, testable responsibility boundary; splitting is optional.
- More than 2,000 lines: split safely or add a narrow exemptions.oversizedFiles entry with a concrete reason.

Required split sequence:
1. Select one directory; leave other directories unchanged.
2. Select one oversized source file; do not split another file yet.
3. Extract only independent responsibilities into new files in the original directory.
4. Repair related imports, exports, registrations, and test references.
5. Run the narrowest existing validation covering that file.
6. Update the changed files' headers and affected MODULE.md or ARCHITECTURE.md.
7. Finish the file before processing another file; finish the directory before entering another directory.

Never split code mechanically to satisfy a line count. Use a justified exemption when tests or natural boundaries are insufficient for a safe refactor.

7. Configure only necessary exemptions
Create .agent-readability.json only when needed:
{
  "version": 1,
  "exemptions": {
    "oversizedFiles": {"path/to/file": "specific reason"},
    "moduleGuides": {"path/to/directory": "specific reason"},
    "mapFiles": {"path/to/file": "specific reason"},
    "fileHeaders": {"path/to/generated-file": "generation source and why direct edits are overwritten"}
  }
}

Keep every exemption scoped to one path. Never exclude an entire business-code root.

8. Generate the repository map
After source headers and module guides are complete, run:

node "<CHECKER_PATH>" . --generate-map

This command generates .agent/repo-map.json from MODULE.md Purpose sections and source-file headers. Never edit the generated JSON manually. Regenerate it after any source, source header, or MODULE.md change.

9. Validate and iterate
1. Run:
   node "<CHECKER_PATH>" .
2. Fix every error and reach at least the default score of 85. Do not lower minScore merely to pass.
3. When source code changed, run the existing tests, type checks, or builds covering the changed behavior.
4. If a fix changed source or maintained metadata, run --generate-map again.
5. Run the auditor one final time.

Before completion:
- Compare at least three source headers with source behavior.
- Compare each MODULE.md with its directory boundary and dependencies.
- Trace at least one call chain from every documented architecture entry point.
- Confirm AGENTS.md contains global instructions, ARCHITECTURE.md contains project architecture, and MODULE.md contains local module facts.
- Confirm repo-map.json was generated rather than manually maintained.

The final response should state only:
- which maintained agent instructions, architecture, module guides, and headers changed;
- which exemptions remain and why;
- the final auditor score; and
- when source changed, which relevant validations ran.
```

