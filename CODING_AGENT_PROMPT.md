# Repository Agent-Readability Migration Prompt

Copy the complete fenced block below into a coding agent and run it from the
target repository root. If the auditor is not inside the target repository,
replace `<CHECKER_PATH>` with the absolute path to
`check-agent-readability.mjs` in this toolkit. The auditor requires Node.js 18
or later and has no third-party npm dependencies.

```text
Migrate the current repository so future coding agents can understand it accurately with less searching and less context consumption.

Final goals:
1. Create or improve the root AGENTS.md.
2. Create or improve AGENTS.md in every significant source directory.
3. Create a complete and accurate .agent/repo-map.json.
4. Add a fixed agent summary within the first 50 lines of every non-exempt source file.
5. Handle oversized source files by safely splitting responsibilities, or use the smallest justified exemption when tests are insufficient or the file is generated.
6. Pass the Agent-Friendly Repository Standard v1.0 auditor.

Operating rules:
- Investigate the repository fully before editing. Use available symbol search, language services, manifests, and tests. Do not infer behavior from filenames alone.
- Preserve useful content in existing AGENTS.md, README, and architecture documents. Merge verified information instead of overwriting user documentation without reason.
- Do not change product behavior, public APIs, persistence formats, or network protocols. A safe oversized-file split may adjust internal structure only when existing tests can demonstrate equivalent behavior.
- Preserve the repository's existing directory structure. Do not move, rename, merge, or reorganize existing files or directories.
- The only permitted structural additions are files extracted into the original source file's directory and agent-readable files required by this standard, including AGENTS.md and .agent/repo-map.json.
- Work directory by directory and process only one source file at a time. Complete that file's split, reference updates, relevant validation, header, and documentation before starting another file.
- Do not batch refactors across multiple files or directories.
- Every non-exempt source file must have a fixed agent summary in its first 50 lines so a future agent can decide whether the full file is relevant.
- List every public or exported symbol in both the source-file header and repository map. Do not duplicate inventories of ordinary private helpers.
- Write concrete descriptions supported by code. Do not use placeholders such as "handles related logic," "utility methods," or "business module."
- Do not pass the auditor through broad exclusions, false purposes, empty sections, or meaningless exemptions.
- Do not modify dependencies, generated outputs, or third-party code unless the task genuinely requires it.
- Follow the repository's existing formatting, naming, and documentation language. If no documentation language is established, use English.

Execution steps:

1. Build a fact inventory
- Identify languages, build systems, package or workspace boundaries, runtime entry points, public APIs, primary data flows, external systems, and test commands.
- List all source files and identify public or exported classes, functions, interfaces, and constants.
- Separate production code, tests, configuration, generated outputs, dependencies, and build artifacts.
- Find valid architecture information and repository-specific constraints in existing documentation.

2. Create or improve the root AGENTS.md
If ROOT_AGENTS_TEMPLATE.md from this toolkit is available, use it as the structural template. Replace every placeholder with facts verified from the current repository; never copy it unchanged.

The root guide must contain these non-empty sections:
- Purpose: the problem the repository solves and its scope.
- Architecture: module relationships, dependency direction, and primary data flow.
- Entry Points: runtime entry points, public API entry points, and recommended reading starts, all using relative paths.
- Development: installation, startup, and build commands.
- Testing: narrow validation and full test commands.
- Conventions: repository-specific rules, invariants, and prohibitions.

Keep the root guide concise and link to module AGENTS.md files instead of duplicating module details.

3. Create or improve significant-directory AGENTS.md files
A non-root directory is significant when any condition is true:
- it directly contains at least three source files;
- it is named src, app, lib, libs, packages, services, modules, or components and recursively contains at least five source files; or
- it contains package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml, *.csproj, or an equivalent build manifest and has source files below it.

Every significant-directory guide must contain:
- Purpose
- Responsibilities
- Key Files
- Dependencies
- Tests

Describe responsibility boundaries, key files and reading order, upstream and downstream relationships, important constraints, and test locations. Do not duplicate the same text across purely organizational directories. If a directory genuinely needs no local guide, add one narrowly scoped exemption with a concrete reason.

4. Create .agent/repo-map.json
Use this structure:
{
  "schemaVersion": 1,
  "generatedAt": "<timezone-aware ISO 8601 timestamp>",
  "sourceFingerprint": "<SHA-256 printed by the auditor>",
  "entryPoints": [
    {"path": "<relative path>", "purpose": "<specific purpose>"}
  ],
  "modules": [
    {"path": "<directory>", "purpose": "<specific responsibility>", "guide": "<directory>/AGENTS.md"}
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
- Use / in every path and make every path relative to the repository root.
- files covers every non-excluded source file discovered by the auditor.
- modules covers every non-exempt significant directory.
- entryPoints contains at least one runtime, reading, or public API entry. A library should use its public export file.
- purpose contains at least eight non-whitespace characters and distinguishes adjacent files.
- publicSymbols contains only public or exported symbols; use [] when none exist.
- Prefer language ASTs, symbol tools, and existing documentation. Do not guess complex-language semantics with unreliable regular expressions.

5. Add source-file agent headers one file at a time
Process directories in sequence and handle only one source file at a time. Add this metadata within the file's first 50 lines using the language's native comment syntax:

@agent-file
@agent-purpose: <at least eight non-whitespace characters describing this file's unique responsibility>
@agent-public-api: <every public or exported symbol; use none when empty>
@agent-invariants: <important constraints; use none when empty>
@agent-side-effects: <I/O, network, database, or global-state effects; use none when empty>

Requirements:
- Keep the five fields in this exact order within a comment block spanning no more than 15 lines.
- A shebang, encoding declaration, or legally required copyright header may appear before it, but the complete summary must remain within the first 50 lines.
- Do not write placeholders or omit fields. Use none explicitly when a field does not apply.
- Update the summary whenever the file's responsibility, public symbols, constraints, or side effects change.
- Keep @agent-public-api consistent with the file's publicSymbols in repo-map.json.
- Complete one file's header, repository-map entry, and reference review before processing the next file.
- Only generated files that cannot be edited directly may use exemptions.fileHeaders.

6. Control source-file size
- 800 lines or fewer is the recommended target.
- 801-2,000 lines produces a warning and requires checking for a natural, testable split boundary.
- More than 2,000 lines must be split safely or receive a per-file exemptions.oversizedFiles entry with a concrete reason.
- Do not mechanically divide tightly coupled code merely to reduce line count. Run the narrowest relevant existing validation after any code refactor.

Required split sequence:
1. Select one directory. Do not modify other directories yet.
2. Select one oversized source file in that directory. Do not split other source files yet.
3. Extract only independent responsibilities into new files in the original file's directory. Do not move or rename existing files or directories.
4. Repair imports, exports, registrations, and test references directly related to that file.
5. Run the narrowest existing validation covering that file, then update its header, the local AGENTS.md, and repo-map.json.
6. Finish that file before processing the next file in the directory. Finish the directory before entering another directory.

Never accumulate splits from multiple files or directories into one broad refactor.

7. Configure only necessary exemptions
Create .agent-readability.json only when configuration or exemptions are needed:
{
  "version": 1,
  "exemptions": {
    "oversizedFiles": {"path/to/file": "specific reason"},
    "directoryGuides": {"path/to/directory": "specific reason"},
    "mapFiles": {"path/to/file": "specific reason"},
    "fileHeaders": {"path/to/generated-file": "generation source and why direct edits are impossible"}
  }
}

Keep every exemption scoped to one specific path. Never exclude an entire src, app, packages, or equivalent business-code root.

8. Validate and iterate
1. Run the repository's narrow relevant tests to establish a baseline. Documentation-only and JSON-only changes do not require unrelated full-suite validation.
2. Run:
   node "<CHECKER_PATH>" . --fingerprint
3. Write the output into repo-map.json as sourceFingerprint and update generatedAt last.
4. Run:
   node "<CHECKER_PATH>" .
5. Fix every error and reach at least the default score of 85. Do not lower minScore merely to pass.
6. If source code changed, run the existing tests, type checks, or build commands that cover the changed behavior.
7. Run the auditor again and confirm that the repository-map fingerprint is current.

Before completion, perform a semantic sample:
- Compare at least three repo-map file entries with source code and verify purpose and publicSymbols.
- Compare at least three source-file headers with code and verify purpose, public API, invariants, and side effects.
- Trace at least one call chain from every entry point and verify the documented architecture and dependency direction.
- Confirm that every documented command runs from the repository root or clearly states another working directory.

The final response should state only:
- which navigation artifacts were created or updated;
- whether oversized-file, directory-guide, repository-map, or file-header exemptions remain and why;
- the auditor's final score; and
- when source code changed, which relevant validations ran.
```

